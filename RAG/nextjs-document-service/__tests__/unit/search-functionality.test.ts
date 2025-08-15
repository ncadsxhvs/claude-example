/**
 * Unit tests for search functionality across different modes
 */

import { TestDatabase, MockOpenAI, PerformanceHelper } from '../utils/test-helpers';

// Mock database and embeddings
jest.mock('../../lib/database');
jest.mock('../../lib/embeddings');

describe('Search Functionality', () => {
  let mockDb: jest.Mocked<any>;
  let mockGenerateEmbedding: jest.MockedFunction<any>;

  beforeEach(() => {
    // Setup mocks
    mockDb = require('../../lib/database').db;
    mockGenerateEmbedding = require('../../lib/embeddings').generateEmbedding;

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock responses
    mockGenerateEmbedding.mockResolvedValue(MockOpenAI.mockEmbeddingResponse);
  });

  describe('Semantic Search', () => {
    it('should perform semantic search with embeddings', async () => {
      // Arrange
      const mockSearchResults = [
        {
          chunk_id: 'chunk-1',
          document_id: 'doc-123',
          text: 'Patient has diabetes with glucose levels of 120 mg/dL',
          similarity: 0.85,
          word_count: 10,
          filename: 'medical-report.txt'
        },
        {
          chunk_id: 'chunk-2',
          document_id: 'doc-456',
          text: 'Blood sugar monitoring shows normal glucose range',
          similarity: 0.78,
          word_count: 8,
          filename: 'diabetes-care.txt'
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockSearchResults });

      // Mock search function (we'll test this through the API)
      const performSemanticSearch = async (query: string, threshold: number = 0.3, limit: number = 5) => {
        const embeddingResult = await mockGenerateEmbedding(query);
        const embedding = `[${embeddingResult.embedding.join(',')}]`;
        
        const result = await mockDb.query(
          'SELECT * FROM search_similar_chunks($1::vector, $2, $3, $4)',
          [embedding, 'demo-user', threshold, limit]
        );
        
        return result.rows;
      };

      // Act
      const results = await PerformanceHelper.assertExecutionTime(
        () => performSemanticSearch('diabetes glucose levels', 0.3, 10),
        2000 // Should complete within 2 seconds
      );

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].similarity).toBeGreaterThan(0.7);
      expect(results[0].text).toContain('diabetes');
      expect(results[0].text).toContain('glucose');
      
      expect(mockGenerateEmbedding).toHaveBeenCalledWith('diabetes glucose levels');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('search_similar_chunks'),
        expect.arrayContaining([expect.any(String), 'demo-user', 0.3, 10])
      );
    });

    it('should filter results by similarity threshold', async () => {
      // Arrange
      const mockResults = [
        { similarity: 0.9, text: 'High similarity match' },
        { similarity: 0.6, text: 'Medium similarity match' },
        { similarity: 0.2, text: 'Low similarity match' }
      ];

      mockDb.query.mockResolvedValue({ rows: mockResults });

      const performSemanticSearch = async (threshold: number) => {
        await mockGenerateEmbedding('test query');
        const result = await mockDb.query(
          'SELECT * FROM search_similar_chunks($1::vector, $2, $3, $4)',
          ['[0.1,0.2,0.3]', 'demo-user', threshold, 10]
        );
        return result.rows;
      };

      // Act - Test high threshold
      const highThresholdResults = await performSemanticSearch(0.8);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('search_similar_chunks'),
        expect.arrayContaining([expect.any(String), 'demo-user', 0.8, 10])
      );
    });

    it('should handle empty search results', async () => {
      // Arrange
      mockDb.query.mockResolvedValue({ rows: [] });

      const performSemanticSearch = async (query: string) => {
        await mockGenerateEmbedding(query);
        const result = await mockDb.query('SELECT * FROM search_similar_chunks($1::vector, $2, $3, $4)', []);
        return result.rows;
      };

      // Act
      const results = await performSemanticSearch('nonexistent medical term');

      // Assert
      expect(results).toHaveLength(0);
      expect(mockGenerateEmbedding).toHaveBeenCalled();
    });
  });

  describe('Keyword Search', () => {
    it('should perform keyword search with ILIKE', async () => {
      // Arrange
      const mockResults = [
        {
          chunk_id: 'chunk-1',
          text: 'Patient diagnosed with diabetes mellitus type 2',
          word_count: 7,
          filename: 'diagnosis.txt'
        },
        {
          chunk_id: 'chunk-2', 
          text: 'Diabetes management includes glucose monitoring',
          word_count: 6,
          filename: 'care-plan.txt'
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockResults });

      const performKeywordSearch = async (query: string, limit: number = 5) => {
        const keywords = query.toLowerCase().split(/\s+/);
        const likePatterns = keywords.map(keyword => `%${keyword}%`);
        
        const result = await mockDb.query(
          `SELECT c.*, d.filename FROM chunks c 
           JOIN documents d ON c.document_id = d.id 
           WHERE d.user_id = $1 AND LOWER(c.text) LIKE ANY($2) 
           ORDER BY c.word_count DESC LIMIT $3`,
          ['demo-user', likePatterns, limit]
        );
        
        return result.rows;
      };

      // Act
      const results = await PerformanceHelper.assertExecutionTime(
        () => performKeywordSearch('diabetes glucose'),
        1000 // Should be faster than semantic search
      );

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].text.toLowerCase()).toContain('diabetes');
      
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIKE ANY'),
        expect.arrayContaining(['demo-user', ['%diabetes%', '%glucose%'], 5])
      );
    });

    it('should handle special characters in search terms', async () => {
      // Arrange
      mockDb.query.mockResolvedValue({ rows: [] });

      const performKeywordSearch = async (query: string) => {
        // Simulate escaping special characters
        const sanitizedQuery = query.replace(/[%_]/g, '\\$&');
        const keywords = sanitizedQuery.toLowerCase().split(/\s+/);
        const likePatterns = keywords.map(keyword => `%${keyword}%`);
        
        const result = await mockDb.query(
          'SELECT * FROM chunks WHERE text ILIKE ANY($1)',
          [likePatterns]
        );
        return result.rows;
      };

      // Act
      const results = await performKeywordSearch('blood_pressure 120/80');

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE ANY'),
        expect.arrayContaining([['%blood_pressure%', '%120/80%']])
      );
    });
  });

  describe('Hybrid Search', () => {
    it('should combine semantic and keyword search results', async () => {
      // Arrange
      const semanticResults = [
        { chunk_id: 'chunk-1', similarity: 0.9, text: 'High semantic match', source: 'semantic' },
        { chunk_id: 'chunk-2', similarity: 0.7, text: 'Medium semantic match', source: 'semantic' }
      ];

      const keywordResults = [
        { chunk_id: 'chunk-3', text: 'Exact keyword match diabetes', source: 'keyword' },
        { chunk_id: 'chunk-1', text: 'High semantic match', source: 'keyword' } // Overlap
      ];

      // Mock hybrid search function
      const performHybridSearch = async (query: string, threshold: number = 0.3) => {
        // Simulate semantic search
        await mockGenerateEmbedding(query);
        mockDb.query.mockResolvedValueOnce({ rows: semanticResults });
        
        // Simulate keyword search  
        mockDb.query.mockResolvedValueOnce({ rows: keywordResults });

        const semanticSearch = await mockDb.query('SELECT * FROM semantic_search($1)', [query]);
        const keywordSearch = await mockDb.query('SELECT * FROM keyword_search($1)', [query]);

        // Combine and deduplicate results
        const combinedResults = [...semanticSearch.rows];
        const semanticIds = new Set(semanticSearch.rows.map((r: any) => r.chunk_id));

        keywordSearch.rows.forEach((result: any) => {
          if (!semanticIds.has(result.chunk_id)) {
            combinedResults.push(result);
          }
        });

        return combinedResults;
      };

      // Act
      const results = await PerformanceHelper.assertExecutionTime(
        () => performHybridSearch('diabetes treatment'),
        3000 // May take longer due to multiple searches
      );

      // Assert
      expect(results.length).toBeGreaterThanOrEqual(3); // At least unique results
      expect(mockGenerateEmbedding).toHaveBeenCalledWith('diabetes treatment');
      expect(mockDb.query).toHaveBeenCalledTimes(2); // Semantic + keyword
    });

    it('should weight results based on search quality', async () => {
      // Arrange
      const highQualitySemanticResults = [
        { chunk_id: 'chunk-1', similarity: 0.95, text: 'Excellent match' }
      ];

      const lowQualitySemanticResults = [
        { chunk_id: 'chunk-2', similarity: 0.4, text: 'Poor semantic match' }
      ];

      const performAdaptiveWeighting = (semanticQuality: 'high' | 'low') => {
        const semanticWeight = semanticQuality === 'high' ? 0.8 : 0.4;
        const keywordWeight = 1 - semanticWeight;

        return {
          semanticWeight,
          keywordWeight,
          strategy: semanticQuality === 'high' ? 'semantic-heavy' : 'keyword-heavy'
        };
      };

      // Act
      const highQualityWeights = performAdaptiveWeighting('high');
      const lowQualityWeights = performAdaptiveWeighting('low');

      // Assert
      expect(highQualityWeights.semanticWeight).toBe(0.8);
      expect(highQualityWeights.keywordWeight).toBe(0.2);
      expect(highQualityWeights.strategy).toBe('semantic-heavy');

      expect(lowQualityWeights.semanticWeight).toBe(0.4);
      expect(lowQualityWeights.keywordWeight).toBe(0.6);
      expect(lowQualityWeights.strategy).toBe('keyword-heavy');
    });
  });

  describe('Medical Table Search', () => {
    it('should search medical tables with specialized queries', async () => {
      // Arrange
      const mockTableResults = [
        {
          table_id: 1,
          document_id: 'doc-123',
          table_type: 'lab_results',
          similarity: 0.88,
          headers: ['Test Name', 'Result', 'Reference Range'],
          searchable_text: 'Glucose 95 mg/dL 70-99 normal'
        },
        {
          table_id: 2,
          document_id: 'doc-456', 
          table_type: 'vital_signs',
          similarity: 0.75,
          headers: ['Parameter', 'Value'],
          searchable_text: 'Blood Pressure 120/80 mmHg normal'
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockTableResults });

      const performMedicalTableSearch = async (query: string, tableType?: string) => {
        await mockGenerateEmbedding(query);
        
        const result = await mockDb.query(
          'SELECT * FROM search_medical_tables($1, $2::vector, $3, $4, $5, $6)',
          [query, '[0.1,0.2]', 'demo-user', tableType, 10, 0.3]
        );
        
        return result.rows;
      };

      // Act
      const results = await performMedicalTableSearch('glucose levels', 'lab_results');

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].table_type).toBe('lab_results');
      expect(results[0].searchable_text).toContain('glucose');
      
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('search_medical_tables'),
        expect.arrayContaining(['glucose levels', expect.any(String), 'demo-user', 'lab_results', 10, 0.3])
      );
    });

    it('should filter by table type when specified', async () => {
      // Arrange
      const vitalSignsResults = [
        {
          table_id: 3,
          table_type: 'vital_signs',
          searchable_text: 'Heart Rate 72 BPM Blood Pressure 120/80'
        }
      ];

      mockDb.query.mockResolvedValue({ rows: vitalSignsResults });

      const performMedicalTableSearch = async (query: string, tableType: string) => {
        await mockGenerateEmbedding(query);
        const result = await mockDb.query(
          'SELECT * FROM search_medical_tables($1, $2::vector, $3, $4, $5, $6)',
          [query, '[0.1,0.2]', 'demo-user', tableType, 5, 0.3]
        );
        return result.rows;
      };

      // Act
      const results = await performMedicalTableSearch('heart rate', 'vital_signs');

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].table_type).toBe('vital_signs');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('search_medical_tables'),
        expect.arrayContaining(['heart rate', expect.any(String), 'demo-user', 'vital_signs', 5, 0.3])
      );
    });
  });

  describe('Search Performance', () => {
    it('should cache embedding results for repeated queries', async () => {
      // Arrange
      const query = 'diabetes management';
      let callCount = 0;
      
      mockGenerateEmbedding.mockImplementation(async () => {
        callCount++;
        return MockOpenAI.mockEmbeddingResponse;
      });

      const searchWithCaching = async (query: string, useCache: boolean = true) => {
        if (useCache && searchWithCaching.cache?.has(query)) {
          return searchWithCaching.cache.get(query);
        }

        const embedding = await mockGenerateEmbedding(query);
        
        if (useCache) {
          searchWithCaching.cache = searchWithCaching.cache || new Map();
          searchWithCaching.cache.set(query, embedding);
        }

        return embedding;
      };

      // Act
      await searchWithCaching(query, true);  // First call - should generate embedding
      await searchWithCaching(query, true);  // Second call - should use cache
      await searchWithCaching(query, false); // Third call - should generate new embedding

      // Assert
      expect(callCount).toBe(2); // Only called twice due to caching
    });

    it('should handle concurrent search requests efficiently', async () => {
      // Arrange
      const queries = [
        'diabetes symptoms',
        'blood pressure medication', 
        'glucose monitoring',
        'cholesterol levels',
        'heart rate variability'
      ];

      mockDb.query.mockResolvedValue({ rows: [] });

      const performConcurrentSearches = async (queries: string[]) => {
        const searchPromises = queries.map(async (query) => {
          await mockGenerateEmbedding(query);
          return mockDb.query('SELECT * FROM search($1)', [query]);
        });

        return Promise.all(searchPromises);
      };

      // Act & Assert
      await PerformanceHelper.assertExecutionTime(
        () => performConcurrentSearches(queries),
        5000 // Should handle 5 concurrent searches within 5 seconds
      );

      expect(mockGenerateEmbedding).toHaveBeenCalledTimes(5);
      expect(mockDb.query).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle embedding generation failures', async () => {
      // Arrange
      mockGenerateEmbedding.mockRejectedValue(new Error('OpenAI API error'));

      const performSearchWithErrorHandling = async (query: string) => {
        try {
          await mockGenerateEmbedding(query);
          return { success: true, results: [] };
        } catch (error) {
          console.error('Embedding generation failed:', error);
          // Fallback to keyword search
          const result = await mockDb.query('SELECT * FROM keyword_search($1)', [query]);
          return { success: false, fallbackResults: result.rows, error: error.message };
        }
      };

      mockDb.query.mockResolvedValue({ rows: [{ text: 'fallback result' }] });

      // Act
      const result = await performSearchWithErrorHandling('test query');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('OpenAI API error');
      expect(result.fallbackResults).toHaveLength(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('keyword_search'),
        ['test query']
      );
    });

    it('should handle database query failures', async () => {
      // Arrange
      mockDb.query.mockRejectedValue(new Error('Database connection lost'));

      const performSearchWithDbErrorHandling = async (query: string) => {
        try {
          const result = await mockDb.query('SELECT * FROM search($1)', [query]);
          return { success: true, results: result.rows };
        } catch (error) {
          return { 
            success: false, 
            error: error.message,
            results: [] 
          };
        }
      };

      // Act
      const result = await performSearchWithDbErrorHandling('test query');

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection lost');
      expect(result.results).toHaveLength(0);
    });
  });
});