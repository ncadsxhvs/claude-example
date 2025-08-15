/**
 * End-to-end tests for complete RAG system workflows
 */

import { TestFiles, TestDatabase, MockOpenAI, PerformanceHelper } from '../utils/test-helpers';
import * as fs from 'fs';

// Mock external dependencies
jest.mock('../../lib/database');
jest.mock('../../lib/embeddings');
jest.mock('../../lib/realtime');

describe('Complete RAG System Workflows', () => {
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
    mockGenerateEmbedding.mockResolvedValue(MockOpenAI.mockEmbeddingResponse);

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

    // Mock successful database operations with proper sequencing
    let queryCallCount = 0;
    mockDb.query.mockImplementation(() => {
      queryCallCount++;
      switch (queryCallCount) {
        case 1: // Duplicate check
          return Promise.resolve({ rows: [] });
        case 2: // Document creation
          return Promise.resolve({ rows: [{ id: `test-doc-${Date.now()}` }] });
        default: // Chunk insertions and other operations
          return Promise.resolve({ rows: [] });
      }
    });
  });

  afterAll(async () => {
    await testDb.cleanupTestDatabase();
    await testDb.close();
  });

  describe('Medical Document Processing to Search Workflow', () => {
    it('should complete full medical document workflow: upload → process → search', async () => {
      // Arrange
      const medicalContent = TestFiles.readFixture('sample-medical-pdf.txt');
      const { POST: uploadPost } = require('../../app/api/upload/route');
      const { POST: searchPost } = require('../../app/api/search/route');

      // Mock search results based on uploaded content
      const mockSearchResults = [
        {
          chunk_id: 'chunk-1',
          document_id: 'test-doc-123',
          text: 'Glucose 95 mg/dL normal range 70-99',
          similarity: 0.89,
          word_count: 8,
          filename: 'medical-report.txt'
        },
        {
          chunk_id: 'chunk-2',
          document_id: 'test-doc-123',
          text: 'Blood pressure 118/76 within normal limits',
          similarity: 0.82,
          word_count: 7,
          filename: 'medical-report.txt'
        }
      ];

      // STEP 1: Upload medical document
      const uploadFormData = new FormData();
      const file = new File([medicalContent], 'medical-report.txt', { type: 'text/plain' });
      uploadFormData.append('file', file);
      uploadFormData.append('userId', 'e2e-test-user');

      const uploadRequest = {
        formData: () => Promise.resolve(uploadFormData)
      } as any;

      const uploadResponse = await PerformanceHelper.assertExecutionTime(
        () => uploadPost(uploadRequest),
        8000 // Upload should complete within 8 seconds
      );

      const uploadResult = await uploadResponse.json();

      // Assert upload success
      expect(uploadResponse.status).toBe(200);
      expect(uploadResult.success).toBe(true);
      expect(uploadResult.document.filename).toBe('medical-report.txt');
      expect(uploadResult.chunks.length).toBeGreaterThan(0);

      // STEP 2: Search for glucose-related content
      mockDb.query.mockResolvedValue({ rows: mockSearchResults });

      const searchRequest = {
        json: () => Promise.resolve({
          query: 'glucose levels normal range',
          userId: 'e2e-test-user',
          searchMode: 'semantic',
          maxResults: 10,
          similarityThreshold: 0.3
        })
      } as any;

      const searchResponse = await PerformanceHelper.assertExecutionTime(
        () => searchPost(searchRequest),
        3000 // Search should complete within 3 seconds
      );

      const searchResult = await searchResponse.json();

      // Assert search success
      expect(searchResponse.status).toBe(200);
      expect(searchResult.success).toBe(true);
      expect(searchResult.resultsCount).toBe(2);
      expect(searchResult.results[0].text).toContain('Glucose');
      expect(searchResult.results[0].similarity).toBeGreaterThan(0.8);

      // STEP 3: Verify workflow completed successfully
      expect(mockGenerateEmbedding).toHaveBeenCalledTimes(2); // Once for upload, once for search
      expect(mockDb.query).toHaveBeenCalled();

      // Verify real-time processing was tracked
      const mockProcessor = mockCreateDocumentProcessor.mock.results[0].value;
      expect(mockProcessor.completed).toHaveBeenCalled();
    });

    it('should handle medical table extraction and search workflow', async () => {
      // Arrange
      const medicalTableContent = TestFiles.readFixture('sample-medical-pdf.txt');
      const { POST: uploadPost } = require('../../app/api/upload/route');
      const { POST: searchPost } = require('../../app/api/search/route');

      // Mock medical table search results
      const mockTableResults = [
        {
          table_id: 1,
          document_id: 'test-doc-456',
          table_type: 'lab_results',
          similarity: 0.91,
          headers: ['Test Name', 'Result', 'Reference Range', 'Units'],
          searchable_text: 'Glucose 95 mg/dL 70-99 normal',
          confidence_score: 0.9
        }
      ];

      // STEP 1: Upload document with medical tables
      const uploadFormData = new FormData();
      const file = new File([medicalTableContent], 'lab-results.txt', { type: 'text/plain' });
      uploadFormData.append('file', file);
      uploadFormData.append('userId', 'e2e-test-user');

      const uploadRequest = {
        formData: () => Promise.resolve(uploadFormData)
      } as any;

      const uploadResponse = await uploadPost(uploadRequest);
      const uploadResult = await uploadResponse.json();

      expect(uploadResponse.status).toBe(200);
      expect(uploadResult.success).toBe(true);

      // STEP 2: Search medical tables specifically
      mockDb.query.mockResolvedValue({ rows: mockTableResults });

      const medicalSearchRequest = {
        json: () => Promise.resolve({
          query: 'glucose lab results',
          userId: 'e2e-test-user',
          searchMode: 'medical_tables',
          tableType: 'lab_results',
          maxResults: 5
        })
      } as any;

      const medicalSearchResponse = await searchPost(medicalSearchRequest);
      const medicalSearchResult = await medicalSearchResponse.json();

      // Assert medical table search success
      expect(medicalSearchResponse.status).toBe(200);
      expect(medicalSearchResult.success).toBe(true);
      expect(medicalSearchResult.searchMode).toBe('medical_tables');
      expect(medicalSearchResult.results[0].table_type).toBe('lab_results');
      expect(medicalSearchResult.results[0].searchable_text).toContain('Glucose');
    });
  });

  describe('Multi-Mode Search Comparison Workflow', () => {
    it('should compare different search modes for the same query', async () => {
      // Arrange
      const query = 'diabetes blood sugar management';
      const userId = 'e2e-test-user';
      const { POST: searchPost } = require('../../app/api/search/route');

      const semanticResults = [
        { chunk_id: 'semantic-1', text: 'Diabetes management through blood glucose monitoring', similarity: 0.92 }
      ];

      const keywordResults = [
        { chunk_id: 'keyword-1', text: 'Patient with diabetes needs blood sugar management plan' }
      ];

      const hybridResults = [
        { chunk_id: 'hybrid-1', text: 'Comprehensive diabetes care including blood sugar control', similarity: 0.88 },
        { chunk_id: 'hybrid-2', text: 'Blood sugar management protocols for diabetic patients' }
      ];

      // STEP 1: Semantic search
      mockDb.query.mockResolvedValueOnce({ rows: semanticResults });

      const semanticRequest = {
        json: () => Promise.resolve({
          query,
          userId,
          searchMode: 'semantic',
          includeDebug: true
        })
      } as any;

      const semanticResponse = await searchPost(semanticRequest);
      const semanticResult = await semanticResponse.json();

      expect(semanticResult.searchMode).toBe('semantic');
      expect(semanticResult.results[0].similarity).toBeDefined();

      // STEP 2: Keyword search
      mockDb.query.mockResolvedValueOnce({ rows: keywordResults });

      const keywordRequest = {
        json: () => Promise.resolve({
          query,
          userId,
          searchMode: 'keyword',
          includeDebug: true
        })
      } as any;

      const keywordResponse = await searchPost(keywordRequest);
      const keywordResult = await keywordResponse.json();

      expect(keywordResult.searchMode).toBe('keyword');
      expect(keywordResult.results[0].text).toContain('diabetes');

      // STEP 3: Hybrid search
      mockDb.query
        .mockResolvedValueOnce({ rows: [hybridResults[0]] }) // Semantic component
        .mockResolvedValueOnce({ rows: [hybridResults[1]] }); // Keyword component

      const hybridRequest = {
        json: () => Promise.resolve({
          query,
          userId,
          searchMode: 'hybrid',
          includeDebug: true
        })
      } as any;

      const hybridResponse = await searchPost(hybridRequest);
      const hybridResult = await hybridResponse.json();

      expect(hybridResult.searchMode).toBe('hybrid');
      expect(hybridResult.resultsCount).toBeGreaterThan(0);

      // STEP 4: Compare results across modes
      const comparison = {
        semantic: semanticResult,
        keyword: keywordResult,
        hybrid: hybridResult
      };

      // Verify each mode returned results
      Object.values(comparison).forEach(result => {
        expect(result.success).toBe(true);
        expect(result.resultsCount).toBeGreaterThan(0);
        expect(result.debug).toBeDefined();
      });

      // Verify different search strategies were used
      expect(semanticResult.debug.searchMode).toBe('semantic');
      expect(keywordResult.debug.searchMode).toBe('keyword');
      expect(hybridResult.debug.searchMode).toBe('hybrid');
    });
  });

  describe('Document Management Workflow', () => {
    it('should handle document lifecycle: upload → process → duplicate detection', async () => {
      // Arrange
      const testContent = 'Medical research paper on diabetes management and glucose monitoring protocols.';
      const { POST: uploadPost } = require('../../app/api/upload/route');

      // STEP 1: Initial upload
      const formData1 = new FormData();
      const file1 = new File([testContent], 'research-paper.txt', { type: 'text/plain' });
      formData1.append('file', file1);
      formData1.append('userId', 'e2e-test-user');

      const request1 = {
        formData: () => Promise.resolve(formData1)
      } as any;

      const response1 = await uploadPost(request1);
      const result1 = await response1.json();

      expect(response1.status).toBe(200);
      expect(result1.success).toBe(true);
      expect(result1.isDuplicate).toBeUndefined();

      // STEP 2: Attempt duplicate upload
      // Mock duplicate detection
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 'existing-doc-id',
          filename: 'research-paper.txt',
          file_size: testContent.length,
          chunks_count: 1,
          status: 'completed',
          uploaded_at: new Date(),
          processed_at: new Date()
        }]
      }).mockResolvedValueOnce({
        rows: [{ chunk_index: 0, text: testContent, word_count: 10 }]
      });

      const formData2 = new FormData();
      const file2 = new File([testContent], 'research-paper.txt', { type: 'text/plain' });
      formData2.append('file', file2);
      formData2.append('userId', 'e2e-test-user');

      const request2 = {
        formData: () => Promise.resolve(formData2)
      } as any;

      const response2 = await uploadPost(request2);
      const result2 = await response2.json();

      // Assert duplicate detection
      expect(response2.status).toBe(200);
      expect(result2.success).toBe(true);
      expect(result2.isDuplicate).toBe(true);
      expect(result2.message).toContain('already been processed');
      expect(result2.document.id).toBe('existing-doc-id');
    });

    it('should handle concurrent document uploads', async () => {
      // Arrange
      const { POST: uploadPost } = require('../../app/api/upload/route');

      const documents = [
        'Medical study on cardiovascular health and exercise.',
        'Research paper on diabetes medications and side effects.',
        'Clinical trial results for new blood pressure treatments.'
      ];

      // STEP 1: Upload multiple documents concurrently
      const uploadPromises = documents.map(async (content, index) => {
        const formData = new FormData();
        const file = new File([content], `document-${index + 1}.txt`, { type: 'text/plain' });
        formData.append('file', file);
        formData.append('userId', 'e2e-test-user');

        const request = {
          formData: () => Promise.resolve(formData)
        } as any;

        return uploadPost(request);
      });

      const responses = await PerformanceHelper.assertExecutionTime(
        () => Promise.all(uploadPromises),
        15000 // All uploads should complete within 15 seconds
      );

      // Assert all uploads succeeded
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        const result = await response.json();
        
        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
        expect(result.document.filename).toBe(`document-${i + 1}.txt`);
      }

      // Verify all documents were processed
      expect(mockCreateDocumentProcessor).toHaveBeenCalledTimes(3);
      expect(mockGenerateEmbedding).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle and recover from embedding service failures', async () => {
      // Arrange
      const { POST: uploadPost } = require('../../app/api/upload/route');
      const { POST: searchPost } = require('../../app/api/search/route');

      // STEP 1: Upload succeeds despite embedding failure
      mockGenerateEmbedding.mockRejectedValueOnce(new Error('OpenAI API timeout'));

      const formData = new FormData();
      const file = new File(['Test medical content'], 'test.txt', { type: 'text/plain' });
      formData.append('file', file);
      formData.append('userId', 'e2e-test-user');

      const uploadRequest = {
        formData: () => Promise.resolve(formData)
      } as any;

      const uploadResponse = await uploadPost(uploadRequest);
      const uploadResult = await uploadResponse.json();

      // Upload should fail due to embedding error
      expect(uploadResponse.status).toBe(500);
      expect(uploadResult.error).toContain('Failed to store document');

      // STEP 2: Search falls back to keyword search when embedding fails
      mockGenerateEmbedding.mockRejectedValueOnce(new Error('OpenAI API error'));
      mockDb.query.mockResolvedValue({ rows: [] });

      const searchRequest = {
        json: () => Promise.resolve({
          query: 'medical test',
          userId: 'e2e-test-user',
          searchMode: 'semantic'
        })
      } as any;

      const searchResponse = await searchPost(searchRequest);
      const searchResult = await searchResponse.json();

      // Search should fail when embedding is required
      expect(searchResponse.status).toBe(500);
      expect(searchResult.error).toContain('Failed to perform search');

      // STEP 3: Keyword search should still work
      const keywordSearchRequest = {
        json: () => Promise.resolve({
          query: 'medical test',
          userId: 'e2e-test-user',
          searchMode: 'keyword'
        })
      } as any;

      const keywordSearchResponse = await searchPost(keywordSearchRequest);
      const keywordSearchResult = await keywordSearchResponse.json();

      expect(keywordSearchResponse.status).toBe(200);
      expect(keywordSearchResult.success).toBe(true);
    });

    it('should handle database connection failures gracefully', async () => {
      // Arrange
      const { POST: uploadPost } = require('../../app/api/upload/route');
      const { POST: searchPost } = require('../../app/api/search/route');

      // STEP 1: Upload fails due to database error
      mockDb.query.mockRejectedValue(new Error('Database connection lost'));

      const formData = new FormData();
      const file = new File(['Test content'], 'test.txt', { type: 'text/plain' });
      formData.append('file', file);
      formData.append('userId', 'e2e-test-user');

      const uploadRequest = {
        formData: () => Promise.resolve(formData)
      } as any;

      const uploadResponse = await uploadPost(uploadRequest);
      const uploadResult = await uploadResponse.json();

      expect(uploadResponse.status).toBe(500);
      expect(uploadResult.error).toContain('Failed to store document');

      // STEP 2: Search fails due to database error
      const searchRequest = {
        json: () => Promise.resolve({
          query: 'test query',
          userId: 'e2e-test-user',
          searchMode: 'keyword'
        })
      } as any;

      const searchResponse = await searchPost(searchRequest);
      const searchResult = await searchResponse.json();

      expect(searchResponse.status).toBe(500);
      expect(searchResult.error).toContain('Failed to perform search');
    });
  });

  describe('Performance and Scalability', () => {
    it('should maintain performance under load', async () => {
      // Arrange
      const { POST: searchPost } = require('../../app/api/search/route');

      // Mock fast database responses
      mockDb.query.mockResolvedValue({ 
        rows: [{ chunk_id: 'chunk-1', text: 'Fast result', similarity: 0.8 }] 
      });

      // STEP 1: Perform many searches rapidly
      const searchPromises = Array(10).fill(null).map(async (_, index) => {
        const searchRequest = {
          json: () => Promise.resolve({
            query: `medical query ${index}`,
            userId: 'load-test-user',
            searchMode: 'semantic',
            maxResults: 5
          })
        } as any;

        return searchPost(searchRequest);
      });

      // Act & Assert
      const responses = await PerformanceHelper.assertExecutionTime(
        () => Promise.all(searchPromises),
        10000 // 10 searches should complete within 10 seconds
      );

      // Verify all searches succeeded
      for (const response of responses) {
        const result = await response.json();
        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
      }

      expect(mockGenerateEmbedding).toHaveBeenCalledTimes(10);
    });

    it('should handle large document processing efficiently', async () => {
      // Arrange
      const { POST: uploadPost } = require('../../app/api/upload/route');

      // Create large document content
      const baseContent = TestFiles.readFixture('sample-medical-pdf.txt');
      const largeContent = baseContent.repeat(10); // Simulate 10x larger document

      const formData = new FormData();
      const file = new File([largeContent], 'large-medical-document.txt', { type: 'text/plain' });
      formData.append('file', file);
      formData.append('userId', 'e2e-test-user');

      const request = {
        formData: () => Promise.resolve(formData)
      } as any;

      // Act & Assert
      const response = await PerformanceHelper.assertExecutionTime(
        () => uploadPost(request),
        20000 // Large document should process within 20 seconds
      );

      const result = await response.json();
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.document.textLength).toBe(largeContent.length);
      expect(result.chunks.length).toBeGreaterThan(10); // Should create multiple chunks
    });
  });
});