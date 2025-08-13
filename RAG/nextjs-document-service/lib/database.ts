import { Pool, PoolClient } from 'pg';
import { databaseConfig } from './config';

// Database configuration from centralized config
const pool = new Pool({
  user: databaseConfig.user,
  host: databaseConfig.host,
  database: databaseConfig.name,
  password: databaseConfig.password,
  port: databaseConfig.port,
  // Connection pool settings
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
});

// Database connection singleton
class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    this.pool = pool;
    
    // Handle connection errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  // Get a client from the pool
  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  // Execute a query with automatic client management
  public async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  // Test database connection
  public async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()');
      console.log('Database connected successfully at:', result.rows[0].now);
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  // Close all connections (for graceful shutdown)
  public async close(): Promise<void> {
    await this.pool.end();
  }
}

// Export singleton instance
export const db = Database.getInstance();

// Type definitions for our database models
export interface DocumentRecord {
  id: string;
  user_id: string;
  filename: string;
  file_size: number;
  file_type: string;
  text_length: number;
  chunks_count: number;
  status: 'processing' | 'completed' | 'failed';
  uploaded_at: Date;
  processed_at?: Date;
  metadata: Record<string, any>;
}

export interface ChunkRecord {
  id: string;
  document_id: string;
  chunk_index: number;
  text: string;
  word_count: number;
  character_count: number;
  embedding?: number[]; // Vector embedding
  metadata: Record<string, any>;
  created_at: Date;
}

export interface SearchResult {
  chunk_id: string;
  document_id: string;
  filename: string;
  chunk_text: string;
  chunk_index: number;
  similarity_score: number;
}

export interface HybridSearchResult {
  chunk_id: string;
  document_id: string;
  filename: string;
  chunk_text: string;
  chunk_index: number;
  semantic_score: number;
  keyword_score: number;
  combined_score: number;
}

export interface KeywordSearchResult {
  chunk_id: string;
  document_id: string;
  filename: string;
  chunk_text: string;
  chunk_index: number;
  keyword_score: number;
}

// Database service functions
export class DocumentService {
  // Create a new document record
  static async createDocument(document: Omit<DocumentRecord, 'id' | 'uploaded_at'>): Promise<string> {
    const query = `
      INSERT INTO documents (user_id, filename, file_size, file_type, text_length, chunks_count, status, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;
    
    const values = [
      document.user_id,
      document.filename,
      document.file_size,
      document.file_type,
      document.text_length,
      document.chunks_count,
      document.status,
      JSON.stringify(document.metadata)
    ];
    
    const result = await db.query(query, values);
    return result.rows[0].id;
  }

  // Update document status and chunks count
  static async updateDocumentStatus(id: string, status: DocumentRecord['status'], chunksCount?: number): Promise<void> {
    const query = `
      UPDATE documents 
      SET status = $1, chunks_count = COALESCE($2, chunks_count), processed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE processed_at END
      WHERE id = $3
    `;
    
    await db.query(query, [status, chunksCount, id]);
  }

  // Get user's documents
  static async getUserDocuments(userId: string): Promise<DocumentRecord[]> {
    const query = `
      SELECT * FROM documents 
      WHERE user_id = $1 
      ORDER BY uploaded_at DESC
    `;
    
    const result = await db.query(query, [userId]);
    return result.rows;
  }

  // Get document by ID
  static async getDocument(id: string): Promise<DocumentRecord | null> {
    const query = 'SELECT * FROM documents WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  // Delete document and its chunks
  static async deleteDocument(id: string): Promise<void> {
    const query = 'DELETE FROM documents WHERE id = $1';
    await db.query(query, [id]);
  }
}

export class ChunkService {
  // Insert chunks for a document
  static async insertChunks(documentId: string, chunks: Omit<ChunkRecord, 'id' | 'document_id' | 'created_at'>[]): Promise<void> {
    const client = await db.getClient();
    
    try {
      await client.query('BEGIN');
      
      for (const chunk of chunks) {
        const query = `
          INSERT INTO chunks (document_id, chunk_index, text, word_count, character_count, embedding, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        
        const values = [
          documentId,
          chunk.chunk_index,
          chunk.text,
          chunk.word_count,
          chunk.character_count,
          chunk.embedding ? JSON.stringify(chunk.embedding) : null,
          JSON.stringify(chunk.metadata)
        ];
        
        await client.query(query, values);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
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
  ): Promise<SearchResult[]> {
    const { similarityThreshold = 0.7, maxResults = 5 } = options;
    
    const query = `
      SELECT * FROM search_similar_chunks($1::vector, $2, $3, $4)
    `;
    
    const values = [
      JSON.stringify(queryEmbedding),
      userId,
      similarityThreshold,
      maxResults
    ];
    
    const result = await db.query(query, values);
    return result.rows;
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
  ): Promise<HybridSearchResult[]> {
    const { 
      semanticWeight = 0.7, 
      keywordWeight = 0.3, 
      similarityThreshold = 0.6, 
      maxResults = 5 
    } = options;
    
    const query = `
      SELECT * FROM search_hybrid_chunks($1::vector, $2, $3, $4, $5, $6, $7)
    `;
    
    const values = [
      JSON.stringify(queryEmbedding),
      queryText,
      userId,
      semanticWeight,
      keywordWeight,
      similarityThreshold,
      maxResults
    ];
    
    const result = await db.query(query, values);
    return result.rows;
  }

  // Keyword-only search
  static async searchKeywordChunks(
    queryText: string,
    userId: string,
    options: {
      maxResults?: number;
    } = {}
  ): Promise<KeywordSearchResult[]> {
    const { maxResults = 5 } = options;
    
    const query = `
      SELECT * FROM search_keyword_chunks($1, $2, $3)
    `;
    
    const values = [queryText, userId, maxResults];
    
    const result = await db.query(query, values);
    return result.rows;
  }

  // Get chunks for a document
  static async getDocumentChunks(documentId: string): Promise<ChunkRecord[]> {
    const query = `
      SELECT * FROM chunks 
      WHERE document_id = $1 
      ORDER BY chunk_index
    `;
    
    const result = await db.query(query, [documentId]);
    return result.rows;
  }
}

export class StatsService {
  // Get user document statistics
  static async getUserStats(userId: string): Promise<{
    total_documents: number;
    total_chunks: number;
    total_text_length: number;
    latest_upload: Date | null;
  }> {
    const query = 'SELECT * FROM get_user_document_stats($1)';
    const result = await db.query(query, [userId]);
    return result.rows[0] || {
      total_documents: 0,
      total_chunks: 0,
      total_text_length: 0,
      latest_upload: null
    };
  }
}