import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Test database utilities
 */
export class TestDatabase {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'rag_system_test',
      user: process.env.DB_USER || 'ddctu',
      password: process.env.DB_PASSWORD || 'test_password',
    });
  }

  async setupTestDatabase(): Promise<void> {
    // Create test tables (simplified versions)
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS test_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        filename VARCHAR(500) NOT NULL,
        file_size INTEGER NOT NULL,
        text_length INTEGER,
        chunks_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'processing',
        uploaded_at TIMESTAMP DEFAULT NOW(),
        processed_at TIMESTAMP,
        metadata JSONB
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS test_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID REFERENCES test_documents(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        text TEXT NOT NULL,
        word_count INTEGER,
        character_count INTEGER,
        embedding vector(1536),
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS test_medical_tables (
        id SERIAL PRIMARY KEY,
        document_id UUID REFERENCES test_documents(id) ON DELETE CASCADE,
        table_index INTEGER NOT NULL,
        confidence_score DECIMAL(3,2),
        headers TEXT[],
        table_type VARCHAR(50),
        extracted_at TIMESTAMP DEFAULT NOW()
      );
    `);
  }

  async cleanupTestDatabase(): Promise<void> {
    await this.pool.query('DROP TABLE IF EXISTS test_medical_tables CASCADE');
    await this.pool.query('DROP TABLE IF EXISTS test_chunks CASCADE');
    await this.pool.query('DROP TABLE IF EXISTS test_documents CASCADE');
  }

  async query(text: string, params?: any[]): Promise<any> {
    return this.pool.query(text, params);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * File utilities for testing
 */
export const TestFiles = {
  /**
   * Get path to test fixture file
   */
  getFixturePath(filename: string): string {
    return path.join(__dirname, '../fixtures', filename);
  },

  /**
   * Read test fixture file
   */
  readFixture(filename: string): string {
    const filePath = this.getFixturePath(filename);
    return fs.readFileSync(filePath, 'utf-8');
  },

  /**
   * Create a temporary file for testing
   */
  createTempFile(content: string, extension: string = '.txt'): string {
    const tempPath = path.join(__dirname, '../fixtures', `temp_${Date.now()}${extension}`);
    fs.writeFileSync(tempPath, content);
    return tempPath;
  },

  /**
   * Clean up temporary files
   */
  cleanup(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};

/**
 * Mock OpenAI responses for testing
 */
const mockEmbeddingResponse = {
  object: 'list',
  data: [
    {
      object: 'embedding',
      embedding: Array(1536).fill(0).map(() => Math.random()),
      index: 0
    }
  ],
  model: 'text-embedding-3-small',
  usage: {
    prompt_tokens: 10,
    total_tokens: 10
  }
};

export const MockOpenAI = {
  /**
   * Mock embedding response
   */
  mockEmbeddingResponse,

  /**
   * Create mock fetch for OpenAI API
   */
  mockFetch: jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue(mockEmbeddingResponse)
  })
};

/**
 * Test assertion helpers
 */
export const TestAssertions = {
  /**
   * Assert that a value is a valid UUID
   */
  isValidUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  /**
   * Assert that a value is a valid embedding vector
   */
  isValidEmbedding(embedding: number[]): boolean {
    return Array.isArray(embedding) && 
           embedding.length === 1536 && 
           embedding.every(val => typeof val === 'number');
  },

  /**
   * Assert that medical table has required structure
   */
  isValidMedicalTable(table: any): boolean {
    return table &&
           Array.isArray(table.headers) &&
           Array.isArray(table.data) &&
           typeof table.confidence === 'number' &&
           typeof table.rowCount === 'number' &&
           typeof table.colCount === 'number';
  }
};

/**
 * Performance testing utilities
 */
export const PerformanceHelper = {
  /**
   * Measure function execution time
   */
  async measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
    const start = Date.now();
    const result = await fn();
    const timeMs = Date.now() - start;
    return { result, timeMs };
  },

  /**
   * Assert that function executes within time limit
   */
  async assertExecutionTime<T>(fn: () => Promise<T>, maxTimeMs: number): Promise<T> {
    const { result, timeMs } = await this.measureTime(fn);
    expect(timeMs).toBeLessThan(maxTimeMs);
    return result;
  }
};