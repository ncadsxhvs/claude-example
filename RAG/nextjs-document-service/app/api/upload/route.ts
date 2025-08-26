import { NextRequest, NextResponse } from 'next/server';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { createHash } from 'crypto';
import { db } from '../../../lib/database';
import { ragConfig } from '../../../lib/config';
import { createDocumentProcessor } from '../../../lib/realtime';
import { generateEmbedding } from '../../../lib/embeddings';
import { processPDF, ExtractedTable } from '../../../lib/pdf-processor';
import { processJson, ExtractedJsonTable } from '../../../lib/json-processor';
import { storeMedicalTables } from '../../../lib/medical-table-processor';
import { pageAwareChunker } from '../../../lib/page-aware-chunker';

// Extract text from supported file types with page tracking
async function extractTextFromFile(file: File): Promise<{ text: string; tables?: ExtractedTable[]; pageMap?: Map<number, { start: number; end: number; page: number }> }> {
  const fileExtension = file.name.toLowerCase().split('.').pop();
  
  if (fileExtension === 'pdf') {
    // Process PDF with table extraction
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfResult = await processPDF(buffer);
    return {
      text: pdfResult.text,
      tables: pdfResult.tables
    };
  } else if (fileExtension === 'json') {
    const jsonContent = await file.text();
    const parsedJson = JSON.parse(jsonContent);
    
    // Check for page-structured JSON
    if (parsedJson.pages && Array.isArray(parsedJson.pages)) {
      return processPageBasedJson(parsedJson);
    }
    
    // Fallback to regular JSON processing
    const jsonResult = processJson(jsonContent);
    const tables: ExtractedTable[] = jsonResult.tables.map(jsonTable => ({
      data: jsonTable.data,
      headers: jsonTable.headers,
      rowCount: jsonTable.rowCount,
      colCount: jsonTable.colCount,
      page: 1,
      confidence: jsonTable.confidence
    }));
    
    return { text: jsonResult.text, tables };
  } else {
    // Handle text files - try to detect page markers
    const text = await file.text();
    let pageMap: Map<number, { start: number; end: number; page: number }> | undefined;
    
    // Look for common page markers in text files
    const pageMarkers = text.match(/(?:^|\n)(?:Page \d+|--- Page \d+ ---|# Page \d+|\f)/gm);
    
    if (pageMarkers && pageMarkers.length > 0) {
      pageMap = new Map();
      let currentPage = 1;
      let currentPosition = 0;
      
      // Simple page detection for text files
      const sections = text.split(/(?:^|\n)(?:Page \d+|--- Page \d+ ---|# Page \d+|\f)/m);
      sections.forEach((section, index) => {
        if (section.trim()) {
          pageMap!.set(index, {
            start: currentPosition,
            end: currentPosition + section.length,
            page: currentPage
          });
          currentPosition += section.length;
          currentPage++;
        }
      });
    }
    
    return { text, pageMap };
  }
}

// Generate content hash for duplicate detection
function generateContentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

// Process page-structured JSON (minimalist approach)
function processPageBasedJson(parsedJson: any): { text: string; pageMap: Map<number, { start: number; end: number; page: number }> } {
  const pages = parsedJson.pages.filter((page: any) => page.page);
  const pageContents: string[] = [];
  const pageMap = new Map<number, { start: number; end: number; page: number }>();
  
  let currentPos = 0;
  
  pages.forEach((page: any) => {
    // Extract clean content: md > text > tables
    const content = page.md || 
                   (page.text && cleanText(page.text)) ||
                   extractTables(page.items) ||
                   '';
    
    if (content.trim()) {
      const cleanContent = `# Page ${page.page}\n\n${content.trim()}`;
      const startPos = currentPos;
      const endPos = currentPos + cleanContent.length;
      
      pageContents.push(cleanContent);
      pageMap.set(pages.indexOf(page), {
        start: startPos,
        end: endPos,
        page: page.page
      });
      
      currentPos = endPos + 2; // +2 for page separator
    }
  });
  
  return {
    text: pageContents.join('\n\n---\n\n'),
    pageMap
  };
}

// Clean OCR text
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
}

// Extract tables from page items
function extractTables(items?: any[]): string {
  if (!items) return '';
  
  return items
    .filter(item => item.type === 'table' && (item.csv || item.md))
    .map(item => item.csv || item.md)
    .join('\n\n');
}

// Helper function to find which page a chunk belongs to
function findChunkPage(chunkText: string, fullText: string, pageMap?: Map<number, { start: number; end: number; page: number }>): number[] {
  if (!pageMap || pageMap.size === 0) {
    return []; // No page information available
  }

  const chunkStart = fullText.indexOf(chunkText);
  const chunkEnd = chunkStart + chunkText.length;
  const pages: number[] = [];

  // Find all pages that this chunk spans
  for (const pageInfo of Array.from(pageMap.values())) {
    // Check if chunk overlaps with this page
    if (chunkStart <= pageInfo.end && chunkEnd >= pageInfo.start) {
      if (!pages.includes(pageInfo.page)) {
        pages.push(pageInfo.page);
      }
    }
  }

  return pages.sort((a, b) => a - b); // Return sorted page numbers
}

// Simple content type detection
function detectContentType(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Medical patterns
  const medicalTerms = ['pharmacist', 'prescription', 'medication', 'therapy', 'clinical', 'patient', 'treatment'];
  const medicalCount = medicalTerms.filter(term => lowerText.includes(term)).length;
  
  // Educational patterns  
  const educationalTerms = ['module', 'lesson', 'learning objective', 'course', 'training'];
  const educationalCount = educationalTerms.filter(term => lowerText.includes(term)).length;
  
  // Regulatory patterns
  const regulatoryTerms = ['scope of practice', 'regulation', 'authority', 'province', 'jurisdiction'];
  const regulatoryCount = regulatoryTerms.filter(term => lowerText.includes(term)).length;
  
  // Determine primary content type
  if (regulatoryCount >= 2) return 'regulatory';
  if (medicalCount >= 3) return 'medical';  
  if (educationalCount >= 2) return 'educational';
  return 'general';
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

    // Support text files, PDFs, and JSON
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const supportedExtensions = ['txt', 'md', 'markdown', 'pdf', 'json'];
    const supportedMimeTypes = [
      'text/plain', 
      'text/markdown', 
      'text/x-markdown',
      'application/pdf',
      'application/json',
      'text/json',
      'application/octet-stream'
    ];
    
    const isValidType = supportedMimeTypes.includes(file.type) || supportedExtensions.includes(fileExtension || '');
    
    if (!isValidType) {
      return NextResponse.json(
        { error: `Only .txt, .md, .markdown, .pdf, .json files are supported. Received: ${file.type} for ${file.name}` },
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

    // Extract text content, tables, and page mapping
    processor.extractingText();
    const extractionResult = await extractTextFromFile(file);
    const extractedText = extractionResult.text;
    const extractedTables = extractionResult.tables || [];
    const pageMap = extractionResult.pageMap;

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
        chunks: chunksResult.rows.map((chunk: any, index: number) => ({
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

    // Step 2: Chunk the text with page-aware and table-aware logic
    console.log(`🔧 Using ${ragConfig.pageAwareChunking ? 'page-aware' : 'standard'} chunking for ${file.name}`);
    
    const chunkResults = await pageAwareChunker.chunkText(extractedText, pageMap);
    const textChunks = chunkResults.map(result => result.content);
    
    console.log(`📄 Chunked into ${textChunks.length} chunks (avg size: ${Math.round(extractedText.length / textChunks.length)} chars)`);
    
    // Log page distribution for debugging
    if (ragConfig.pageAwareChunking && pageMap) {
      const pageStats = chunkResults.reduce((stats, result) => {
        if (result.metadata.pageNumbers.length > 0) {
          const pageKey = result.metadata.pageNumbers.join(',');
          stats[pageKey] = (stats[pageKey] || 0) + 1;
        }
        return stats;
      }, {} as Record<string, number>);
      console.log('📊 Page distribution:', pageStats);
    }

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
      // Step 3: Insert chunks into database with embeddings
      realProcessor.storingChunks(textChunks.length);
      
      const insertChunksQuery = `
        INSERT INTO chunks (document_id, chunk_index, text, word_count, character_count, embedding, page, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        const chunkResult = chunkResults[i];
        const wordCount = chunk.split(/\s+/).filter(w => w.length > 0).length;
        
        // Use page-aware metadata if available, fallback to legacy method
        const chunkPages = chunkResult.metadata.pageNumbers.length > 0 
          ? chunkResult.metadata.pageNumbers 
          : findChunkPage(chunk, extractedText, pageMap);
        
        // Generate embedding for this chunk
        const embeddingResult = await generateEmbedding(chunk);
        const embeddingVector = `[${embeddingResult.embedding.join(',')}]`;
        
        // Enhanced metadata with page-aware information
        const chunkMetadata = {
          createdAt: new Date().toISOString(),
          embeddingGenerated: true,
          tokensUsed: embeddingResult.usage.total_tokens,
          // Content analysis
          contentType: detectContentType(chunk),
          hasTable: chunkResult.metadata.isTable || (chunk.includes('|') && chunk.includes('---')),
          hasMedicalTerms: /\b(patient|medication|treatment|diagnosis|therapy|clinical|pharmacist|prescription)\b/i.test(chunk),
          hasRegulatory: /\b(regulation|scope of practice|authority|province|jurisdiction|compliance)\b/i.test(chunk),
          // Page-aware metadata
          pages: chunkPages,
          pageCount: chunkPages.length,
          primaryPage: chunkPages.length > 0 ? chunkPages[0] : null,
          spansMultiplePages: chunkPages.length > 1,
          // New page-aware fields
          isTableChunk: chunkResult.metadata.isTable || false,
          pageAwareChunking: ragConfig.pageAwareChunking,
          chunkingMethod: ragConfig.pageAwareChunking ? 'page-aware' : 'standard',
          originalChunkSize: chunkResult.metadata.chunkSize
        };
        
        await db.query(insertChunksQuery, [
          documentId,
          i,
          chunk,
          wordCount,
          chunk.length,
          embeddingVector,
          chunkPages.length > 0 ? chunkPages[0] : null, // Legacy page column
          JSON.stringify(chunkMetadata)
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

      // Step 5: Process medical tables if any were extracted
      let medicalTablesCount = 0;
      if (extractedTables.length > 0) {
        try {
          realProcessor.storingChunks(textChunks.length);
          const storedTables = await storeMedicalTables(documentId, extractedTables);
          medicalTablesCount = storedTables.length;
          console.log(`Stored ${medicalTablesCount} medical tables for document ${documentId}`);
        } catch (error) {
          console.error('Error processing medical tables:', error);
          // Continue processing even if medical table storage fails
        }
      }

      // Mark processing as completed
      realProcessor.completed(textChunks.length, extractedText.length);

      // Step 6: Return success response (matching the expected format)
      return NextResponse.json({
        success: true,
        document: {
          id: documentId,
          filename: file.name,
          size: file.size,
          textLength: extractedText.length,
          chunksCount: textChunks.length,
          medicalTablesCount: medicalTablesCount,
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