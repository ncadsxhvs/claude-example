import { NextRequest, NextResponse } from 'next/server';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { createHash } from 'crypto';
import { db } from '../../../lib/database';
import { ragConfig } from '../../../lib/config';
import { createDocumentProcessor } from '../../../lib/realtime';

// Simple text extraction function for demonstration
async function extractTextFromFile(file: File): Promise<string> {
  const text = await file.text();
  return text;
}

// Generate content hash for duplicate detection
function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

// Check for duplicate files
async function checkForDuplicate(
  userId: string, 
  filename: string, 
  fileSize: number, 
  contentHash: string
): Promise<{ isDuplicate: boolean; existingDocument?: any }> {
  const query = `
    SELECT id, filename, file_size, chunks_count, status, uploaded_at, processed_at
    FROM documents 
    WHERE user_id = $1 
      AND (
        (filename = $2 AND file_size = $3) OR
        metadata->>'contentHash' = $4
      )
      AND status IN ('completed', 'processing')
    ORDER BY uploaded_at DESC 
    LIMIT 1
  `;
  
  const result = await db.query(query, [userId, filename, fileSize, contentHash]);
  
  if (result.rows.length > 0) {
    return {
      isDuplicate: true,
      existingDocument: result.rows[0]
    };
  }
  
  return { isDuplicate: false };
}

export async function POST(request: NextRequest) {
  try {
    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string || 'demo-user'; // Default user for demo

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Support text files (check both MIME type and file extension)
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const supportedExtensions = ['txt', 'md', 'markdown'];
    const supportedMimeTypes = ['text/plain', 'text/markdown', 'text/x-markdown', 'application/octet-stream'];
    
    const isValidType = supportedMimeTypes.includes(file.type) || supportedExtensions.includes(fileExtension || '');
    
    if (!isValidType) {
      return NextResponse.json(
        { error: `Only .txt, .md, and .markdown files are supported. Received: ${file.type} for ${file.name}` },
        { status: 400 }
      );
    }

    // Validate file size (configuration-driven)
    if (file.size > ragConfig.maxFileSize) {
      return NextResponse.json(
        { error: `File size must be less than ${Math.round(ragConfig.maxFileSize / 1024 / 1024)}MB` },
        { status: 400 }
      );
    }

    // Create a temporary document ID for real-time updates
    const tempDocumentId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize real-time processor
    const processor = createDocumentProcessor(tempDocumentId, userId, file.name);
    processor.queued();

    // Extract text content
    processor.extractingText();
    const extractedText = await extractTextFromFile(file);

    if (!extractedText.trim()) {
      processor.failed('File appears to be empty');
      return NextResponse.json(
        { error: 'File appears to be empty' },
        { status: 400 }
      );
    }

    // Generate content hash for duplicate detection
    const contentHash = generateContentHash(extractedText);
    processor.extractingText(extractedText.length);
    
    // Check for duplicates
    const duplicateCheck = await checkForDuplicate(userId, file.name, file.size, contentHash);
    
    if (duplicateCheck.isDuplicate && duplicateCheck.existingDocument) {
      const existing = duplicateCheck.existingDocument;
      
      // Fetch existing chunks for the duplicate document
      const chunksQuery = `
        SELECT chunk_index, text, word_count 
        FROM chunks 
        WHERE document_id = $1 
        ORDER BY chunk_index
      `;
      const chunksResult = await db.query(chunksQuery, [existing.id]);
      
      // Return the existing document info instead of processing again
      return NextResponse.json({
        success: true,
        isDuplicate: true,
        message: `File "${file.name}" has already been processed`,
        document: {
          id: existing.id,
          filename: existing.filename,
          size: existing.file_size,
          textLength: extractedText.length,
          chunksCount: existing.chunks_count,
          processedAt: existing.processed_at || existing.uploaded_at,
          status: existing.status,
          uploadedAt: existing.uploaded_at
        },
        chunks: chunksResult.rows.map((chunk, index) => ({
          id: `${existing.id}-${chunk.chunk_index}`,
          index: chunk.chunk_index,
          text: chunk.text,
          wordCount: chunk.word_count
        })),
        preview: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '')
      });
    }

    // Step 1: Create document record in database (status: processing)
    const createDocumentQuery = `
      INSERT INTO documents (user_id, filename, file_size, file_type, text_length, chunks_count, status, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    
    const documentValues = [
      userId,
      file.name,
      file.size,
      file.type,
      extractedText.length,
      0,
      'processing',
      JSON.stringify({
        uploadedAt: new Date().toISOString(),
        originalType: file.type,
        contentHash: contentHash
      })
    ];
    
    const documentResult = await db.query(createDocumentQuery, documentValues);
    const documentId = documentResult.rows[0].id;

    // Update processor with real document ID
    const realProcessor = createDocumentProcessor(documentId, userId, file.name);
    realProcessor.chunking(extractedText.length);

    // Step 2: Chunk the text (configuration-driven)
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: ragConfig.chunkSize,
      chunkOverlap: ragConfig.chunkOverlap,
      separators: [
        '\n## ',     // Section headers (medical/legal documents)
        '\n# ',      // Main headers
        '\n\n',      // Paragraph breaks
        '\n',        // Line breaks
        '. ',        // Sentence endings
        ', ',        // Clause separators
        ' ',         // Word boundaries
        ''           // Character level (fallback)
      ],
    });
    
    const textChunks = await textSplitter.splitText(extractedText);

    if (textChunks.length === 0) {
      realProcessor.failed('No valid text chunks could be created');
      await db.query('UPDATE documents SET status = $1 WHERE id = $2', ['failed', documentId]);
      return NextResponse.json(
        { error: 'No valid text chunks could be created' },
        { status: 400 }
      );
    }

    realProcessor.chunkingProgress(textChunks.length, textChunks.length);

    try {
      // Step 3: Insert chunks into database (without embeddings for now)
      realProcessor.storingChunks(textChunks.length);
      
      const insertChunksQuery = `
        INSERT INTO chunks (document_id, chunk_index, text, word_count, character_count, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        const wordCount = chunk.split(/\s+/).filter(w => w.length > 0).length;
        
        await db.query(insertChunksQuery, [
          documentId,
          i,
          chunk,
          wordCount,
          chunk.length,
          JSON.stringify({
            createdAt: new Date().toISOString(),
            needsEmbedding: true
          })
        ]);

        // Update progress every 10 chunks or on last chunk
        if (i % 10 === 0 || i === textChunks.length - 1) {
          realProcessor.chunkingProgress(i + 1, textChunks.length);
        }
      }

      // Step 4: Update document status to completed
      await db.query(
        'UPDATE documents SET status = $1, chunks_count = $2, processed_at = NOW() WHERE id = $3',
        ['completed', textChunks.length, documentId]
      );

      // Mark processing as completed
      realProcessor.completed(textChunks.length, extractedText.length);

      // Step 5: Return success response (matching the expected format)
      return NextResponse.json({
        success: true,
        document: {
          id: documentId,
          filename: file.name,
          size: file.size,
          textLength: extractedText.length,
          chunksCount: textChunks.length,
          processedAt: new Date().toISOString()
        },
        chunks: textChunks.map((text, index) => ({
          id: `${documentId}-${index}`,
          index,
          text,
          wordCount: text.split(/\s+/).filter(w => w.length > 0).length
        })),
        preview: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '')
      });

    } catch (dbError: any) {
      console.error('Database insertion failed:', dbError);
      
      // Mark processing as failed and update database
      realProcessor.failed(`Database error: ${dbError.message}`);
      await db.query('UPDATE documents SET status = $1 WHERE id = $2', ['failed', documentId]);
      
      return NextResponse.json(
        { error: `Failed to store document: ${dbError.message}` },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Document Processing API',
    methods: ['POST'],
    endpoint: '/api/upload'
  });
}