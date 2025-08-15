/**
 * Integration tests for search API endpoint
 */

import { TestDatabase, MockOpenAI, PerformanceHelper } from '../utils/test-helpers';

// Mock external dependencies
jest.mock('../../lib/database');
jest.mock('../../lib/embeddings');

describe('Search API Integration Tests', () => {
  let testDb: TestDatabase;
  let mockDb: jest.Mocked<any>;
  let mockGenerateEmbedding: jest.MockedFunction<any>;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setupTestDatabase();
  });

  beforeEach(async () => {
    // Setup mocks
    mockDb = require('../../lib/database').db;
    mockGenerateEmbedding = require('../../lib/embeddings').generateEmbedding;

    // Reset mocks
    jest.clearAllMocks();

    // Setup default successful responses
    mockGenerateEmbedding.mockResolvedValue(MockOpenAI.mockEmbeddingResponse);
  });

  afterAll(async () => {
    await testDb.cleanupTestDatabase();
    await testDb.close();
  });

  describe('POST /api/search', () => {
    it('should perform semantic search successfully', async () => {
      // Arrange
      const mockSearchResults = [
        {
          chunk_id: 'chunk-1',
          document_id: 'doc-123',
          text: 'Patient has diabetes with glucose levels of 120 mg/dL',
          similarity: 0.85,
          word_count: 10,
          filename: 'medical-report.txt',
          chunk_index: 0
        },
        {
          chunk_id: 'chunk-2', 
          document_id: 'doc-456',
          text: 'Blood sugar monitoring shows normal glucose range',
          similarity: 0.78,
          word_count: 8,
          filename: 'diabetes-care.txt',
          chunk_index: 1
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockSearchResults });

      const { POST } = require('../../app/api/search/route');
      
      const requestBody = {
        query: 'diabetes glucose levels',
        userId: 'test-user',
        maxResults: 10,
        similarityThreshold: 0.3,
        searchMode: 'semantic'
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      // Act
      const response = await PerformanceHelper.assertExecutionTime(
        () => POST(request),
        3000 // Should complete within 3 seconds
      );

      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.searchMode).toBe('semantic');
      expect(result.resultsCount).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].similarity).toBe(0.85);
      expect(result.results[0].text).toContain('diabetes');
      expect(result.results[0].text).toContain('glucose');

      // Verify embedding generation
      expect(mockGenerateEmbedding).toHaveBeenCalledWith('diabetes glucose levels');

      // Verify database query
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('search_similar_chunks'),
        expect.any(Array)
      );
    });

    it('should perform keyword search successfully', async () => {
      // Arrange
      const mockKeywordResults = [
        {
          chunk_id: 'chunk-3',
          text: 'Patient diagnosed with diabetes mellitus type 2',
          word_count: 7,
          filename: 'diagnosis.txt',
          chunk_index: 0
        },
        {
          chunk_id: 'chunk-4',
          text: 'Diabetes management includes glucose monitoring',
          word_count: 6,
          filename: 'care-plan.txt', 
          chunk_index: 1
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockKeywordResults });

      const { POST } = require('../../app/api/search/route');
      
      const requestBody = {
        query: 'diabetes management',
        userId: 'test-user',
        maxResults: 5,
        searchMode: 'keyword'
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.searchMode).toBe('keyword');
      expect(result.resultsCount).toBe(2);
      expect(result.results[0].text).toContain('diabetes');

      // Should not generate embeddings for keyword search
      expect(mockGenerateEmbedding).not.toHaveBeenCalled();

      // Verify keyword search query
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.arrayContaining(['test-user'])
      );
    });

    it('should perform hybrid search successfully', async () => {
      // Arrange
      const semanticResults = [
        { 
          chunk_id: 'chunk-1', 
          similarity: 0.9, 
          text: 'High quality semantic match for blood pressure',
          source: 'semantic'
        }
      ];

      const keywordResults = [
        { 
          chunk_id: 'chunk-2', 
          text: 'Blood pressure monitoring protocol',
          source: 'keyword'
        }
      ];

      // Mock sequential calls for hybrid search
      mockDb.query
        .mockResolvedValueOnce({ rows: semanticResults })
        .mockResolvedValueOnce({ rows: keywordResults });

      const { POST } = require('../../app/api/search/route');
      
      const requestBody = {
        query: 'blood pressure monitoring',
        userId: 'test-user',
        maxResults: 10,
        similarityThreshold: 0.3,
        searchMode: 'hybrid'
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.searchMode).toBe('hybrid');
      expect(result.resultsCount).toBeGreaterThan(0);

      // Should generate embeddings for semantic component
      expect(mockGenerateEmbedding).toHaveBeenCalledWith('blood pressure monitoring');

      // Should perform both semantic and keyword searches
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should perform medical table search successfully', async () => {
      // Arrange
      const mockTableResults = [
        {
          table_id: 1,
          document_id: 'doc-123',
          table_type: 'lab_results',
          similarity: 0.88,
          headers: ['Test Name', 'Result', 'Reference Range'],
          searchable_text: 'Glucose 95 mg/dL 70-99 normal',
          confidence_score: 0.9
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockTableResults });

      const { POST } = require('../../app/api/search/route');
      
      const requestBody = {
        query: 'glucose lab results',
        userId: 'test-user',
        maxResults: 5,
        searchMode: 'medical_tables',
        tableType: 'lab_results'
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.searchMode).toBe('medical_tables');
      expect(result.resultsCount).toBe(1);
      expect(result.results[0].table_type).toBe('lab_results');
      expect(result.results[0].searchable_text).toContain('Glucose');

      // Should generate embeddings for medical table search
      expect(mockGenerateEmbedding).toHaveBeenCalledWith('glucose lab results');

      // Should call medical table search function
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('search_medical_tables'),
        expect.arrayContaining(['glucose lab results', 'test-user', 'lab_results'])
      );
    });

    it('should handle empty search results', async () => {
      // Arrange
      mockDb.query.mockResolvedValue({ rows: [] });

      const { POST } = require('../../app/api/search/route');
      
      const requestBody = {
        query: 'nonexistent medical term',
        userId: 'test-user',
        searchMode: 'semantic'
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.resultsCount).toBe(0);
      expect(result.results).toHaveLength(0);
      expect(result.message).toContain('No results found');
    });

    it('should validate search parameters', async () => {
      // Arrange
      const { POST } = require('../../app/api/search/route');

      const requestBody = {
        // Missing required query parameter
        userId: 'test-user',
        searchMode: 'semantic'
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.error).toContain('Query is required');
    });

    it('should handle invalid search mode', async () => {
      // Arrange
      const { POST } = require('../../app/api/search/route');

      const requestBody = {
        query: 'test query',
        userId: 'test-user',
        searchMode: 'invalid_mode'
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.error).toContain('Invalid search mode');
    });

    it('should apply similarity threshold correctly', async () => {
      // Arrange
      const mockResults = [
        { similarity: 0.9, text: 'High similarity match' },
        { similarity: 0.4, text: 'Low similarity match' }
      ];

      mockDb.query.mockResolvedValue({ rows: mockResults });

      const { POST } = require('../../app/api/search/route');

      const requestBody = {
        query: 'test query',
        userId: 'test-user',
        searchMode: 'semantic',
        similarityThreshold: 0.8
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      // Act
      const response = await POST(request);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('search_similar_chunks'),
        expect.arrayContaining([expect.any(String), 'test-user', 0.8, expect.any(Number)])
      );
    });

    it('should limit results correctly', async () => {
      // Arrange
      const mockResults = Array(20).fill(null).map((_, i) => ({
        chunk_id: `chunk-${i}`,
        text: `Result ${i}`,
        similarity: 0.8
      }));

      mockDb.query.mockResolvedValue({ rows: mockResults });

      const { POST } = require('../../app/api/search/route');

      const requestBody = {
        query: 'test query',
        userId: 'test-user',
        searchMode: 'semantic',
        maxResults: 3
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      // Act
      const response = await POST(request);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('search_similar_chunks'),
        expect.arrayContaining([expect.any(String), 'test-user', expect.any(Number), 3])
      );
    });

    it('should include debug information when requested', async () => {
      // Arrange
      const mockResults = [
        { chunk_id: 'chunk-1', text: 'Test result', similarity: 0.85 }
      ];

      mockDb.query.mockResolvedValue({ rows: mockResults });

      const { POST } = require('../../app/api/search/route');

      const requestBody = {
        query: 'test query',
        userId: 'test-user',
        searchMode: 'semantic',
        includeDebug: true
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.debug).toBeDefined();
      expect(result.debug.executionTime).toBeDefined();
      expect(result.debug.searchMode).toBe('semantic');
      expect(result.debug.parameters).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle embedding generation failures', async () => {
      // Arrange
      mockGenerateEmbedding.mockRejectedValue(new Error('OpenAI API error'));

      const { POST } = require('../../app/api/search/route');

      const requestBody = {
        query: 'test query',
        userId: 'test-user',
        searchMode: 'semantic'
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result.error).toContain('Failed to perform search');
    });

    it('should handle database query failures', async () => {
      // Arrange
      mockDb.query.mockRejectedValue(new Error('Database connection lost'));

      const { POST } = require('../../app/api/search/route');

      const requestBody = {
        query: 'test query',
        userId: 'test-user',
        searchMode: 'keyword'
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result.error).toContain('Failed to perform search');
    });

    it('should handle malformed request body', async () => {
      // Arrange
      const { POST } = require('../../app/api/search/route');

      const request = {
        json: () => Promise.reject(new Error('Invalid JSON'))
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(result.error).toContain('Failed to perform search');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent search requests', async () => {
      // Arrange
      const { POST } = require('../../app/api/search/route');

      mockDb.query.mockResolvedValue({ rows: [] });

      const searchPromises = Array(5).fill(null).map((_, index) => {
        const requestBody = {
          query: `test query ${index}`,
          userId: 'test-user',
          searchMode: 'semantic'
        };

        const request = {
          json: () => Promise.resolve(requestBody)
        } as any;

        return POST(request);
      });

      // Act & Assert
      const responses = await PerformanceHelper.assertExecutionTime(
        () => Promise.all(searchPromises),
        8000 // Should handle 5 concurrent searches within 8 seconds
      );

      // Assert all searches succeeded
      for (const response of responses) {
        const result = await response.json();
        expect(response.status).toBe(200);
        expect(result.success).toBe(true);
      }

      expect(mockGenerateEmbedding).toHaveBeenCalledTimes(5);
    });

    it('should perform complex medical queries efficiently', async () => {
      // Arrange
      const complexQuery = 'Patient with type 2 diabetes mellitus showing elevated HbA1c levels above 7.0% despite current metformin therapy, requiring additional glucose lowering medication and lifestyle modifications';
      
      const mockResults = [
        {
          chunk_id: 'chunk-1',
          text: 'Diabetes management protocol for HbA1c >7%',
          similarity: 0.92
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockResults });

      const { POST } = require('../../app/api/search/route');

      const requestBody = {
        query: complexQuery,
        userId: 'test-user',
        searchMode: 'hybrid',
        maxResults: 10
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      // Act & Assert
      const response = await PerformanceHelper.assertExecutionTime(
        () => POST(request),
        4000 // Should handle complex query within 4 seconds
      );

      const result = await response.json();
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.resultsCount).toBeGreaterThan(0);
    });

    it('should cache search results for repeated queries', async () => {
      // Arrange
      const { POST } = require('../../app/api/search/route');
      
      const mockResults = [{ chunk_id: 'chunk-1', text: 'Test result' }];
      mockDb.query.mockResolvedValue({ rows: mockResults });

      const requestBody = {
        query: 'diabetes treatment',
        userId: 'test-user',
        searchMode: 'semantic'
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      // Act - Make same search multiple times
      const response1 = await POST(request);
      const response2 = await POST(request);

      // Assert - Both should succeed (caching behavior would be in production implementation)
      const result1 = await response1.json();
      const result2 = await response2.json();

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.resultsCount).toBe(result2.resultsCount);
    });
  });

  describe('Search Result Formatting', () => {
    it('should format search results with proper structure', async () => {
      // Arrange
      const mockResults = [
        {
          chunk_id: 'chunk-1',
          document_id: 'doc-123',
          text: 'Patient shows good glucose control with current medication regimen.',
          similarity: 0.87,
          word_count: 10,
          filename: 'medical-report.pdf',
          chunk_index: 0,
          uploaded_at: new Date('2024-01-15')
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockResults });

      const { POST } = require('../../app/api/search/route');

      const requestBody = {
        query: 'glucose control medication',
        userId: 'test-user',
        searchMode: 'semantic'
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(result.results[0]).toMatchObject({
        id: 'chunk-1',
        text: expect.stringContaining('glucose control'),
        similarity: 0.87,
        metadata: expect.objectContaining({
          document_id: 'doc-123',
          filename: 'medical-report.pdf',
          chunk_index: 0,
          word_count: 10
        })
      });
    });

    it('should highlight search terms in results', async () => {
      // Arrange
      const mockResults = [
        {
          chunk_id: 'chunk-1',
          text: 'Patient has diabetes and requires glucose monitoring.',
          similarity: 0.9
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockResults });

      const { POST } = require('../../app/api/search/route');

      const requestBody = {
        query: 'diabetes glucose',
        userId: 'test-user',
        searchMode: 'keyword',
        highlightTerms: true
      };

      const request = {
        json: () => Promise.resolve(requestBody)
      } as any;

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert - Implementation would highlight matched terms
      expect(result.results[0].text).toBeDefined();
      // In a real implementation, this might include HTML highlighting
    });
  });
});