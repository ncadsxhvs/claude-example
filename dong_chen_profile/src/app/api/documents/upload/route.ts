import { NextRequest, NextResponse } from 'next/server';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { DocumentService, ChunkService } from '@/lib/database';
import { generateLargeBatchEmbeddings, estimateEmbeddingCost } from '@/lib/embeddings';
import { ragConfig } from '@/lib/config';

export async function POST(request: NextRequest) {
  try {
    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      );
    }

    // Support text files (configuration-driven)
    if (!ragConfig.supportedFileTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Only ${ragConfig.supportedFileTypes.join(', ')} files are supported` },
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

    // Extract text content
    const extractedText = await file.text();

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'File appears to be empty' },
        { status: 400 }
      );
    }

    // Step 1: Create document record in database (status: processing)
    const documentId = await DocumentService.createDocument({
      user_id: userId,
      filename: file.name,
      file_size: file.size,
      file_type: file.type,
      text_length: extractedText.length,
      chunks_count: 0,
      status: 'processing',
      metadata: {
        uploadedAt: new Date().toISOString(),
        originalType: file.type
      }
    });

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
      await DocumentService.updateDocumentStatus(documentId, 'failed');
      return NextResponse.json(
        { error: 'No valid text chunks could be created' },
        { status: 400 }
      );
    }

    // Step 3: Estimate embedding cost
    const costEstimate = estimateEmbeddingCost(textChunks.length);
    console.log(`Embedding ${textChunks.length} chunks. Estimated cost: $${costEstimate.estimatedCostUSD}`);

    try {
      // Step 4: Generate embeddings for all chunks
      const embeddingResult = await generateLargeBatchEmbeddings(
        textChunks,
        (processed, total) => {
          console.log(`Embedding progress: ${processed}/${total} chunks`);
        }
      );

      // Step 5: Prepare chunk data for database insertion
      const chunksData = textChunks.map((text, index) => ({
        chunk_index: index,
        text: text,
        word_count: text.split(/\s+/).filter(w => w.length > 0).length,
        character_count: text.length,
        embedding: embeddingResult.embeddings[index],
        metadata: {
          createdAt: new Date().toISOString(),
          model: 'text-embedding-3-small'
        }
      }));

      // Step 6: Insert chunks with embeddings into database
      await ChunkService.insertChunks(documentId, chunksData);

      // Step 7: Update document status to completed
      await DocumentService.updateDocumentStatus(documentId, 'completed', textChunks.length);

      // Step 8: Return success response
      return NextResponse.json({
        success: true,
        document: {
          id: documentId,
          fileName: file.name,
          fileSize: file.size,
          textLength: extractedText.length,
          chunksCount: textChunks.length,
          status: 'completed'
        },
        embeddings: {
          totalChunks: textChunks.length,
          tokensUsed: embeddingResult.usage.total_tokens,
          estimatedCost: costEstimate.estimatedCostUSD
        },
        preview: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '')
      });

    } catch (embeddingError: any) {
      console.error('Embedding generation failed:', embeddingError);
      
      // Update document status to failed
      await DocumentService.updateDocumentStatus(documentId, 'failed');
      
      return NextResponse.json(
        { error: `Failed to generate embeddings: ${embeddingError.message}` },
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

