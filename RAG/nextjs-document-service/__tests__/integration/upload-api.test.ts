/**
 * Integration tests for upload API endpoint
 */

import request from 'supertest';
import { createServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { TestFiles, TestDatabase, MockOpenAI, PerformanceHelper } from '../utils/test-helpers';
import * as fs from 'fs';
import * as path from 'path';

// Mock external dependencies
jest.mock('../../lib/database');
jest.mock('../../lib/embeddings');
jest.mock('../../lib/realtime');

describe('Upload API Integration Tests', () => {
  let server: any;
  let testDb: TestDatabase;
  let mockDb: jest.Mocked<any>;
  let mockGenerateEmbedding: jest.MockedFunction<any>;
  let mockCreateDocumentProcessor: jest.MockedFunction<any>;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setupTestDatabase();
  });

  beforeEach(async () => {
    // Setup mocks
    mockDb = require('../../lib/database').db;
    mockGenerateEmbedding = require('../../lib/embeddings').generateEmbedding;
    mockCreateDocumentProcessor = require('../../lib/realtime').createDocumentProcessor;

    // Reset mocks
    jest.clearAllMocks();

    // Setup default successful responses
    mockGenerateEmbedding.mockResolvedValue({
      embedding: Array(1536).fill(0).map(() => Math.random()),
      usage: { total_tokens: 10 }
    });

    // Mock document processor
    const mockProcessor = {
      queued: jest.fn(),
      extractingText: jest.fn(),
      chunking: jest.fn(),
      chunkingProgress: jest.fn(),
      storingChunks: jest.fn(),
      completed: jest.fn(),
      failed: jest.fn()
    };
    mockCreateDocumentProcessor.mockReturnValue(mockProcessor);

    // Mock successful database operations
    mockDb.query
      .mockResolvedValueOnce({ rows: [] }) // Duplicate check
      .mockResolvedValueOnce({ rows: [{ id: 'test-doc-id' }] }) // Document creation
      .mockResolvedValue({ rows: [] }); // Chunk insertions
  });

  afterAll(async () => {
    await testDb.cleanupTestDatabase();
    await testDb.close();
    if (server) {
      server.close();
    }
  });

  describe('POST /api/upload', () => {
    it('should upload and process text file successfully', async () => {
      // Arrange
      const testContent = TestFiles.readFixture('sample-text.txt');
      const tempFilePath = TestFiles.createTempFile(testContent, '.txt');

      try {
        // Create Next.js API handler
        const { POST } = require('../../app/api/upload/route');
        
        // Create FormData
        const formData = new FormData();
        const fileBuffer = fs.readFileSync(tempFilePath);
        const file = new File([fileBuffer], 'sample-text.txt', { type: 'text/plain' });
        formData.append('file', file);
        formData.append('userId', 'test-user');

        // Create mock request
        const request = {
          formData: () => Promise.resolve(formData)
        } as any;

        // Act
        const response = await PerformanceHelper.assertExecutionTime(
          () => POST(request),
          10000 // Should complete within 10 seconds
        );

        const result = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.document).toBeDefined();
        expect(result.document.filename).toBe('sample-text.txt');
        expect(result.document.textLength).toBe(testContent.length);
        expect(result.chunks).toBeDefined();
        expect(Array.isArray(result.chunks)).toBe(true);

        // Verify database calls
        expect(mockDb.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO documents'),
          expect.arrayContaining(['test-user', 'sample-text.txt'])
        );

        // Verify embedding generation
        expect(mockGenerateEmbedding).toHaveBeenCalled();

      } finally {
        TestFiles.cleanup(tempFilePath);
      }
    });

    it('should handle file validation errors', async () => {
      // Arrange
      const { POST } = require('../../app/api/upload/route');
      
      const formData = new FormData();
      const invalidFile = new File(['invalid content'], 'test.exe', { type: 'application/octet-stream' });
      formData.append('file', invalidFile);
      formData.append('userId', 'test-user');

      const request = {
        formData: () => Promise.resolve(formData)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.error).toContain('Only .txt, .md, .markdown, .pdf files are supported');
    });

    it('should handle file size validation', async () => {
      // Arrange
      const { POST } = require('../../app/api/upload/route');
      
      // Create large content (simulate file too large)
      const largeContent = 'x'.repeat(50 * 1024 * 1024); // 50MB
      const formData = new FormData();
      const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' });
      
      // Mock size check to fail
      Object.defineProperty(largeFile, 'size', { value: 50 * 1024 * 1024 });
      
      formData.append('file', largeFile);
      formData.append('userId', 'test-user');

      const request = {
        formData: () => Promise.resolve(formData)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.error).toContain('File size must be less than');
    });

    it('should detect and handle duplicate files', async () => {
      // Arrange
      const { POST } = require('../../app/api/upload/route');
      
      // Mock duplicate found
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 'existing-doc-id',
          filename: 'sample.txt',
          file_size: 100,
          chunks_count: 2,
          status: 'completed',
          uploaded_at: new Date(),
          processed_at: new Date()
        }]
      }).mockResolvedValueOnce({
        rows: [
          { chunk_index: 0, text: 'First chunk', word_count: 2 },
          { chunk_index: 1, text: 'Second chunk', word_count: 2 }
        ]
      });

      const testContent = 'Sample duplicate content';
      const formData = new FormData();
      const file = new File([testContent], 'sample.txt', { type: 'text/plain' });
      formData.append('file', file);
      formData.append('userId', 'test-user');

      const request = {
        formData: () => Promise.resolve(formData)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.isDuplicate).toBe(true);
      expect(result.message).toContain('has already been processed');
      expect(result.document.id).toBe('existing-doc-id');
      expect(result.chunks).toHaveLength(2);

      // Should not generate new embeddings for duplicates
      expect(mockGenerateEmbedding).not.toHaveBeenCalled();
    });

    it('should process markdown files correctly', async () => {
      // Arrange
      const markdownContent = `# Medical Report

## Patient Information
- Name: John Doe
- Condition: Type 2 Diabetes

## Lab Results
| Test | Result | Range |
|------|--------|-------|
| Glucose | 95 mg/dL | 70-99 |
| A1C | 6.1% | <7.0% |

Patient shows good glucose control.`;

      const tempFilePath = TestFiles.createTempFile(markdownContent, '.md');

      try {
        const { POST } = require('../../app/api/upload/route');
        
        const formData = new FormData();
        const fileBuffer = fs.readFileSync(tempFilePath);
        const file = new File([fileBuffer], 'medical-report.md', { type: 'text/markdown' });
        formData.append('file', file);
        formData.append('userId', 'test-user');

        const request = {
          formData: () => Promise.resolve(formData)
        } as any;

        // Act
        const response = await POST(request);
        const result = await response.json();

        // Assert
        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.document.filename).toBe('medical-report.md');
        expect(result.chunks.length).toBeGreaterThan(0);
        
        // Verify medical content is preserved
        const combinedChunks = result.chunks.map((c: any) => c.text).join(' ');
        expect(combinedChunks).toContain('Glucose');
        expect(combinedChunks).toContain('Diabetes');

      } finally {
        TestFiles.cleanup(tempFilePath);
      }
    });

    it('should handle processing errors gracefully', async () => {
      // Arrange
      const { POST } = require('../../app/api/upload/route');
      
      // Mock database error
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      const formData = new FormData();
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      formData.append('file', file);
      formData.append('userId', 'test-user');

      const request = {
        formData: () => Promise.resolve(formData)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result.error).toContain('Failed to store document');
    });

    it('should handle empty file content', async () => {
      // Arrange
      const { POST } = require('../../app/api/upload/route');
      
      const formData = new FormData();
      const emptyFile = new File([''], 'empty.txt', { type: 'text/plain' });
      formData.append('file', emptyFile);
      formData.append('userId', 'test-user');

      const request = {
        formData: () => Promise.resolve(formData)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.error).toContain('File appears to be empty');
    });

    it('should track real-time processing progress', async () => {
      // Arrange
      const { POST } = require('../../app/api/upload/route');
      
      const testContent = TestFiles.readFixture('sample-text.txt');
      const formData = new FormData();
      const file = new File([testContent], 'progress-test.txt', { type: 'text/plain' });
      formData.append('file', file);
      formData.append('userId', 'test-user');

      const request = {
        formData: () => Promise.resolve(formData)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      
      // Verify progress tracking was called
      const mockProcessor = mockCreateDocumentProcessor.mock.results[0].value;
      expect(mockProcessor.queued).toHaveBeenCalled();
      expect(mockProcessor.extractingText).toHaveBeenCalled();
      expect(mockProcessor.chunking).toHaveBeenCalled();
      expect(mockProcessor.storingChunks).toHaveBeenCalled();
      expect(mockProcessor.completed).toHaveBeenCalled();
    });
  });

  describe('GET /api/upload', () => {
    it('should return API information', async () => {
      // Arrange
      const { GET } = require('../../app/api/upload/route');

      // Act
      const response = await GET();
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.message).toBe('Document Processing API');
      expect(result.methods).toContain('POST');
      expect(result.endpoint).toBe('/api/upload');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing file parameter', async () => {
      // Arrange
      const { POST } = require('../../app/api/upload/route');
      
      const formData = new FormData();
      formData.append('userId', 'test-user');
      // No file attached

      const request = {
        formData: () => Promise.resolve(formData)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.error).toBe('File is required');
    });

    it('should handle malformed FormData', async () => {
      // Arrange
      const { POST } = require('../../app/api/upload/route');
      
      const request = {
        formData: () => Promise.reject(new Error('Invalid FormData'))
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result.error).toBe('Failed to process document');
    });

    it('should handle embedding generation failures', async () => {
      // Arrange
      const { POST } = require('../../app/api/upload/route');
      
      // Mock embedding failure
      mockGenerateEmbedding.mockRejectedValue(new Error('OpenAI API error'));

      const formData = new FormData();
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      formData.append('file', file);
      formData.append('userId', 'test-user');

      const request = {
        formData: () => Promise.resolve(formData)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result.error).toContain('Failed to store document');
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent uploads', async () => {
      // Arrange
      const { POST } = require('../../app/api/upload/route');
      
      const uploadPromises = Array(3).fill(null).map(async (_, index) => {
        const content = `Test content for file ${index + 1}`;
        const formData = new FormData();
        const file = new File([content], `test-${index + 1}.txt`, { type: 'text/plain' });
        formData.append('file', file);
        formData.append('userId', 'test-user');

        const request = {
          formData: () => Promise.resolve(formData)
        } as any;

        return POST(request);
      });

      // Act & Assert
      const responses = await PerformanceHelper.assertExecutionTime(
        () => Promise.all(uploadPromises),
        15000 // Should handle 3 concurrent uploads within 15 seconds
      );

      // Assert all uploads succeeded
      for (const response of responses) {
        const result = await response.json();
        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
      }

      // Verify all files were processed
      expect(mockCreateDocumentProcessor).toHaveBeenCalledTimes(3);
      expect(mockGenerateEmbedding).toHaveBeenCalledTimes(3);
    });

    it('should process medium-sized files efficiently', async () => {
      // Arrange
      const { POST } = require('../../app/api/upload/route');
      
      // Create medium-sized content (simulate ~1000 words)
      const mediumContent = TestFiles.readFixture('sample-text.txt').repeat(20);
      const formData = new FormData();
      const file = new File([mediumContent], 'medium-file.txt', { type: 'text/plain' });
      formData.append('file', file);
      formData.append('userId', 'test-user');

      const request = {
        formData: () => Promise.resolve(formData)
      } as any;

      // Act & Assert
      const response = await PerformanceHelper.assertExecutionTime(
        () => POST(request),
        8000 // Should complete within 8 seconds
      );

      const result = await response.json();
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.document.textLength).toBe(mediumContent.length);
    });
  });
});