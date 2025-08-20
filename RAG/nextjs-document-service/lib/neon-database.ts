/**
 * Neon Database Connection using Serverless Driver
 * This provides an adapter that works with both local development and Vercel production
 */

import { neon } from '@neondatabase/serverless';

// Database connection configuration
const getDatabaseUrl = (): string => {
  // Use DATABASE_URL from Neon if available, otherwise fall back to individual components
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Construct from individual environment variables
  const host = process.env.DB_HOST || process.env.PGHOST || 'localhost';
  const port = process.env.DB_PORT || process.env.PGPORT || '5432';
  const database = process.env.DB_NAME || process.env.PGDATABASE || 'rag_system';
  const user = process.env.DB_USER || process.env.PGUSER || 'ddctu';
  const password = process.env.DB_PASSWORD || process.env.PGPASSWORD || '';
  
  const sslMode = process.env.NODE_ENV === 'production' ? '?sslmode=require' : '';
  return `postgres://${user}:${password}@${host}:${port}/${database}${sslMode}`;
};

console.log('🔌 Neon Database Configuration:', {
  mode: process.env.NODE_ENV,
  hasUrlEnv: !!process.env.DATABASE_URL,
  host: process.env.PGHOST || process.env.DB_HOST,
  database: process.env.PGDATABASE || process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled'
});

// Initialize Neon client
const sql = neon(getDatabaseUrl());

// Neon Database service functions with the same interface as existing database.ts
export class NeonDocumentService {
  // Create a new document record
  static async createDocument(document: {
    user_id: string;
    filename: string;
    file_size: number;
    file_type: string;
    text_length: number;
    chunks_count: number;
    status: 'processing' | 'completed' | 'failed';
    metadata: Record<string, any>;
  }): Promise<string> {
    const result = await sql`
      INSERT INTO documents (user_id, filename, file_size, file_type, text_length, chunks_count, status, metadata)
      VALUES (${document.user_id}, ${document.filename}, ${document.file_size}, ${document.file_type}, 
              ${document.text_length}, ${document.chunks_count}, ${document.status}, ${JSON.stringify(document.metadata)})
      RETURNING id
    `;
    return result[0].id;
  }

  // Update document status and chunks count
  static async updateDocumentStatus(id: string, status: 'processing' | 'completed' | 'failed', chunksCount?: number): Promise<void> {
    if (chunksCount !== undefined) {
      await sql`
        UPDATE documents 
        SET status = ${status}, chunks_count = ${chunksCount}, processed_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE documents 
        SET status = ${status}, processed_at = CASE WHEN ${status} = 'completed' THEN CURRENT_TIMESTAMP ELSE processed_at END
        WHERE id = ${id}
      `;
    }
  }

  // Get user's documents
  static async getUserDocuments(userId: string): Promise<any[]> {
    return sql`
      SELECT * FROM documents 
      WHERE user_id = ${userId} 
      ORDER BY uploaded_at DESC
    `;
  }

  // Get document by ID
  static async getDocument(id: string): Promise<any | null> {
    const result = await sql`SELECT * FROM documents WHERE id = ${id}`;
    return result[0] || null;
  }

  // Delete document and its chunks
  static async deleteDocument(id: string): Promise<void> {
    await sql`DELETE FROM documents WHERE id = ${id}`;
  }
}

export class NeonChunkService {
  // Insert chunks for a document using batch insert
  static async insertChunks(documentId: string, chunks: Array<{
    chunk_index: number;
    text: string;
    word_count: number;
    character_count: number;
    page?: number;
    embedding?: number[];
    metadata: Record<string, any>;
  }>): Promise<void> {
    // Batch insert all chunks
    for (const chunk of chunks) {
      await sql`
        INSERT INTO chunks (document_id, chunk_index, text, word_count, character_count, page, embedding, metadata)
        VALUES (${documentId}, ${chunk.chunk_index}, ${chunk.text}, ${chunk.word_count}, 
                ${chunk.character_count}, ${chunk.page || null}, ${chunk.embedding ? JSON.stringify(chunk.embedding) : null}::vector, 
                ${JSON.stringify(chunk.metadata)})
      `;
    }
  }

  // Search similar chunks using vector similarity
  static async searchSimilarChunks(
    queryEmbedding: number[],
    userId: string,
    options: {
      similarityThreshold?: number;
      maxResults?: number;
    } = {}
  ): Promise<any[]> {
    const { similarityThreshold = 0.7, maxResults = 5 } = options;
    
    return sql`
      SELECT * FROM search_similar_chunks(
        ${JSON.stringify(queryEmbedding)}::vector,
        ${userId},
        ${similarityThreshold},
        ${maxResults}
      )
    `;
  }

  // Hybrid search combining semantic and keyword search
  static async searchHybridChunks(
    queryEmbedding: number[],
    queryText: string,
    userId: string,
    options: {
      semanticWeight?: number;
      keywordWeight?: number;
      similarityThreshold?: number;
      maxResults?: number;
    } = {}
  ): Promise<any[]> {
    const { 
      semanticWeight = 0.7, 
      keywordWeight = 0.3, 
      similarityThreshold = 0.6, 
      maxResults = 5 
    } = options;
    
    return sql`
      SELECT * FROM search_hybrid_chunks(
        ${JSON.stringify(queryEmbedding)}::vector,
        ${queryText},
        ${userId},
        ${semanticWeight},
        ${keywordWeight},
        ${similarityThreshold},
        ${maxResults}
      )
    `;
  }

  // Keyword-only search
  static async searchKeywordChunks(
    queryText: string,
    userId: string,
    options: {
      maxResults?: number;
    } = {}
  ): Promise<any[]> {
    const { maxResults = 5 } = options;
    
    return sql`
      SELECT * FROM search_keyword_chunks(${queryText}, ${userId}, ${maxResults})
    `;
  }

  // Get chunks for a document
  static async getDocumentChunks(documentId: string): Promise<any[]> {
    return sql`
      SELECT * FROM chunks 
      WHERE document_id = ${documentId} 
      ORDER BY chunk_index
    `;
  }
}

export class NeonMedicalTableService {
  // Insert medical table
  static async insertMedicalTable(table: {
    document_id: string;
    table_index: number;
    page_number?: number;
    confidence_score: number;
    headers: string[];
    row_count: number;
    col_count: number;
    table_type?: string;
    medical_entities?: string[];
    raw_data: any;
    searchable_text: string;
    embedding?: number[];
    processing_metadata?: any;
  }): Promise<number> {
    const result = await sql`
      INSERT INTO medical_tables (
        document_id, table_index, page_number, confidence_score, headers, 
        row_count, col_count, table_type, medical_entities, raw_data, 
        searchable_text, embedding, processing_metadata
      )
      VALUES (
        ${table.document_id}, ${table.table_index}, ${table.page_number || null}, 
        ${table.confidence_score}, ${table.headers}, ${table.row_count}, 
        ${table.col_count}, ${table.table_type || null}, ${table.medical_entities || null}, 
        ${JSON.stringify(table.raw_data)}, ${table.searchable_text}, 
        ${table.embedding ? JSON.stringify(table.embedding) : null}::vector,
        ${table.processing_metadata ? JSON.stringify(table.processing_metadata) : null}
      )
      RETURNING id
    `;
    return result[0].id;
  }

  // Search medical tables
  static async searchMedicalTables(
    queryText: string,
    userId: string,
    options: {
      queryEmbedding?: number[];
      tableType?: string;
      limit?: number;
      similarityThreshold?: number;
    } = {}
  ): Promise<any[]> {
    const {
      queryEmbedding,
      tableType,
      limit = 10,
      similarityThreshold = 0.3
    } = options;

    return sql`
      SELECT * FROM search_medical_tables(
        ${queryText},
        ${queryEmbedding ? JSON.stringify(queryEmbedding) : null}::vector,
        ${userId},
        ${tableType || null},
        ${limit},
        ${similarityThreshold}
      )
    `;
  }

  // Classify medical table type
  static async classifyMedicalTable(headers: string[], sampleData: string): Promise<string> {
    const result = await sql`
      SELECT classify_medical_table(${headers}, ${sampleData}) as table_type
    `;
    return result[0].table_type;
  }
}

export class NeonStatsService {
  // Get user document statistics
  static async getUserStats(userId: string): Promise<{
    total_documents: number;
    total_chunks: number;
    total_text_length: number;
    latest_upload: Date | null;
  }> {
    const result = await sql`SELECT * FROM get_user_document_stats(${userId})`;
    const stats = result[0];
    return {
      total_documents: stats?.total_documents || 0,
      total_chunks: stats?.total_chunks || 0,
      total_text_length: stats?.total_text_length || 0,
      latest_upload: stats?.latest_upload || null
    };
  }

  // Get vector database statistics
  static async getVectorStats(userId?: string): Promise<any> {
    if (userId) {
      return sql`
        SELECT 
          COUNT(DISTINCT d.id) as total_documents,
          COUNT(c.id) as total_chunks,
          COUNT(CASE WHEN c.embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings,
          COUNT(mt.id) as medical_tables,
          AVG(d.text_length) as avg_text_length,
          MAX(d.uploaded_at) as latest_upload
        FROM documents d
        LEFT JOIN chunks c ON d.id = c.document_id
        LEFT JOIN medical_tables mt ON d.id = mt.document_id
        WHERE d.user_id = ${userId}
      `;
    } else {
      return sql`
        SELECT 
          COUNT(DISTINCT d.id) as total_documents,
          COUNT(c.id) as total_chunks,
          COUNT(CASE WHEN c.embedding IS NOT NULL THEN 1 END) as chunks_with_embeddings,
          COUNT(mt.id) as medical_tables,
          AVG(d.text_length) as avg_text_length
        FROM documents d
        LEFT JOIN chunks c ON d.id = c.document_id
        LEFT JOIN medical_tables mt ON d.id = mt.document_id
      `;
    }
  }
}

// Test database connection
export async function testNeonConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1 as test, NOW() as timestamp`;
    console.log('✅ Neon database connected successfully at:', result[0].timestamp);
    return true;
  } catch (error) {
    console.error('❌ Neon database connection failed:', error);
    return false;
  }
}

// Raw SQL execution for advanced queries
export { sql as neonSql };

// Wrapper functions for API compatibility with existing database.ts
export async function searchSimilarChunks(
  queryEmbedding: number[],
  userId: string,
  similarityThreshold: number = 0.7,
  maxResults: number = 5
): Promise<any[]> {
  return NeonChunkService.searchSimilarChunks(queryEmbedding, userId, {
    similarityThreshold,
    maxResults
  });
}

export async function getUserDocuments(userId: string): Promise<any[]> {
  return NeonDocumentService.getUserDocuments(userId);
}

export async function getDocumentChunks(documentId: string): Promise<any[]> {
  return NeonChunkService.getDocumentChunks(documentId);
}

export { 
  NeonDocumentService as DocumentService,
  NeonChunkService as ChunkService,
  NeonMedicalTableService as MedicalTableService,
  NeonStatsService as StatsService
};