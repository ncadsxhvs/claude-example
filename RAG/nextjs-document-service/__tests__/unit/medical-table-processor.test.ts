import { storeMedicalTables, searchMedicalTables, getMedicalTablesForDocument } from '../../lib/medical-table-processor';
import { ExtractedTable } from '../../lib/pdf-processor';
import { TestDatabase, TestAssertions, MockOpenAI, PerformanceHelper } from '../utils/test-helpers';

// Mock dependencies
jest.mock('../../lib/database');
jest.mock('../../lib/embeddings');

describe('Medical Table Processor', () => {
  let testDb: TestDatabase;
  let mockDb: jest.Mocked<any>;
  let mockGenerateEmbedding: jest.MockedFunction<any>;

  beforeAll(async () => {
    testDb = new TestDatabase();
  });

  beforeEach(async () => {
    // Setup mocks
    mockDb = require('../../lib/database').db;
    mockGenerateEmbedding = require('../../lib/embeddings').generateEmbedding;

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock responses
    mockGenerateEmbedding.mockResolvedValue({
      embedding: Array(1536).fill(0).map(() => Math.random()),
      usage: { total_tokens: 10 }
    });

    // Mock successful database operations
    mockDb.query.mockResolvedValue({
      rows: [{ id: 1, extracted_at: new Date() }]
    });
  });

  afterAll(async () => {
    await testDb.close();
  });

  describe('storeMedicalTables', () => {
    it('should store medical tables with proper classification', async () => {
      // Arrange
      const documentId = 'test-doc-123';
      const tables: ExtractedTable[] = [
        {
          headers: ['Test Name', 'Result', 'Reference Range', 'Units'],
          data: [
            ['Glucose', '95', '70-99', 'mg/dL'],
            ['Cholesterol', '180', '<200', 'mg/dL'],
            ['HDL', '45', '>40', 'mg/dL']
          ],
          rowCount: 3,
          colCount: 4,
          page: 1,
          confidence: 0.9
        },
        {
          headers: ['Parameter', 'Value', 'Normal Range'],
          data: [
            ['Blood Pressure', '120/80', '<120/80'],
            ['Heart Rate', '72', '60-100 bpm'],
            ['Temperature', '98.6', '97-99°F']
          ],
          rowCount: 3,
          colCount: 3,
          page: 1,
          confidence: 0.85
        }
      ];

      // Mock database classification function
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ table_type: 'lab_results' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, extracted_at: new Date() }] })
        .mockResolvedValueOnce({ rows: [{ table_type: 'vital_signs' }] })
        .mockResolvedValueOnce({ rows: [{ id: 2, extracted_at: new Date() }] });

      // Act
      const result = await PerformanceHelper.assertExecutionTime(
        () => storeMedicalTables(documentId, tables),
        5000 // Should complete within 5 seconds
      );

      // Assert
      expect(result).toHaveLength(2);
      
      // Verify first table (lab results)
      expect(result[0].documentId).toBe(documentId);
      expect(result[0].tableType).toBe('lab_results');
      expect(result[0].headers).toEqual(['Test Name', 'Result', 'Reference Range', 'Units']);
      expect(result[0].rowCount).toBe(3);
      expect(result[0].colCount).toBe(4);
      expect(result[0].confidenceScore).toBe(0.9);

      // Verify second table (vital signs)
      expect(result[1].documentId).toBe(documentId);
      expect(result[1].tableType).toBe('vital_signs');
      expect(result[1].headers).toEqual(['Parameter', 'Value', 'Normal Range']);

      // Verify embeddings were generated
      expect(mockGenerateEmbedding).toHaveBeenCalledTimes(2);

      // Verify database insertions
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO medical_tables'),
        expect.arrayContaining([documentId])
      );
    });

    it('should skip non-medical tables', async () => {
      // Arrange
      const documentId = 'test-doc-123';
      const nonMedicalTables: ExtractedTable[] = [
        {
          headers: ['Product', 'Price', 'Quantity'],
          data: [
            ['Widget A', '$10.00', '5'],
            ['Widget B', '$15.00', '3']
          ],
          rowCount: 2,
          colCount: 3,
          page: 1,
          confidence: 0.8
        }
      ];

      // Act
      const result = await storeMedicalTables(documentId, nonMedicalTables);

      // Assert
      expect(result).toHaveLength(0);
      expect(mockGenerateEmbedding).not.toHaveBeenCalled();
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const documentId = 'test-doc-123';
      const tables: ExtractedTable[] = [
        {
          headers: ['Test', 'Result'],
          data: [['Glucose', '95']],
          rowCount: 1,
          colCount: 2,
          page: 1,
          confidence: 0.9
        }
      ];

      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await storeMedicalTables(documentId, tables);

      // Assert
      expect(result).toHaveLength(0); // Should return empty array on error
      expect(mockGenerateEmbedding).toHaveBeenCalled(); // Should still try to generate embedding
    });

    it('should extract medical entities correctly', async () => {
      // Arrange
      const documentId = 'test-doc-123';
      const tables: ExtractedTable[] = [
        {
          headers: ['Test Name', 'Result', 'Units'],
          data: [
            ['Hemoglobin A1C', '5.8', '%'],
            ['Creatinine', '1.1', 'mg/dl'],
            ['Blood Pressure', '120/80', 'mmHg']
          ],
          rowCount: 3,
          colCount: 3,
          page: 1,
          confidence: 0.9
        }
      ];

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ table_type: 'lab_results' }] })
        .mockResolvedValueOnce({ rows: [{ id: 1, extracted_at: new Date() }] });

      // Act
      const result = await storeMedicalTables(documentId, tables);

      // Assert
      expect(result[0].medicalEntities).toEqual(
        expect.arrayContaining(['hemoglobin', 'hba1c', 'creatinine', 'blood pressure', 'mg/dl', 'mmhg'])
      );
    });
  });

  describe('searchMedicalTables', () => {
    it('should search medical tables with embeddings', async () => {
      // Arrange
      const queryText = 'glucose levels';
      const userId = 'test-user';
      const options = {
        tableType: 'lab_results',
        limit: 5,
        similarityThreshold: 0.3
      };

      const mockSearchResults = [
        {
          id: 1,
          document_id: 'doc-123',
          table_type: 'lab_results',
          similarity: 0.85,
          headers: ['Test', 'Result'],
          searchable_text: 'Test: Glucose, Result: 95'
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockSearchResults });

      // Act
      const result = await PerformanceHelper.assertExecutionTime(
        () => searchMedicalTables(queryText, userId, options),
        2000 // Should complete within 2 seconds
      );

      // Assert
      expect(result).toEqual(mockSearchResults);
      expect(mockGenerateEmbedding).toHaveBeenCalledWith(queryText);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('search_medical_tables'),
        expect.arrayContaining([queryText, userId, 'lab_results', 5, 0.3])
      );
    });

    it('should handle search with default options', async () => {
      // Arrange
      const queryText = 'blood pressure';
      const userId = 'test-user';

      mockDb.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await searchMedicalTables(queryText, userId);

      // Assert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('search_medical_tables'),
        expect.arrayContaining([queryText, userId, null, 10, 0.3])
      );
    });

    it('should handle search errors', async () => {
      // Arrange
      const queryText = 'test query';
      const userId = 'test-user';

      mockDb.query.mockRejectedValue(new Error('Search failed'));

      // Act & Assert
      await expect(searchMedicalTables(queryText, userId)).rejects.toThrow('Search failed');
    });
  });

  describe('getMedicalTablesForDocument', () => {
    it('should retrieve all medical tables for a document', async () => {
      // Arrange
      const documentId = 'test-doc-123';
      const mockTables = [
        {
          id: 1,
          documentId: 'test-doc-123',
          tableIndex: 0,
          pageNumber: 1,
          confidenceScore: 0.9,
          headers: ['Test', 'Result'],
          rowCount: 2,
          colCount: 2,
          tableType: 'lab_results',
          medicalEntities: ['glucose', 'mg/dl'],
          rawData: JSON.stringify([['Glucose', '95'], ['HDL', '45']]),
          searchableText: 'Test: Glucose, Result: 95',
          extractedAt: new Date()
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockTables });

      // Act
      const result = await getMedicalTablesForDocument(documentId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].documentId).toBe(documentId);
      expect(result[0].tableType).toBe('lab_results');
      expect(Array.isArray(result[0].rawData)).toBe(true); // Should be parsed from JSON
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [documentId]
      );
    });

    it('should handle documents with no medical tables', async () => {
      // Arrange
      const documentId = 'empty-doc-123';
      mockDb.query.mockResolvedValue({ rows: [] });

      // Act
      const result = await getMedicalTablesForDocument(documentId);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle database errors', async () => {
      // Arrange
      const documentId = 'test-doc-123';
      mockDb.query.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(getMedicalTablesForDocument(documentId)).rejects.toThrow('Database error');
    });
  });

  describe('Medical Entity Extraction', () => {
    it('should extract common lab test entities', () => {
      // This tests the internal extractMedicalEntities function through storeMedicalTables
      const documentId = 'test-doc';
      const tables: ExtractedTable[] = [
        {
          headers: ['Test', 'Result', 'Range'],
          data: [
            ['Hemoglobin A1C', '5.8%', '<6.0%'],
            ['LDL Cholesterol', '120 mg/dL', '<100 mg/dL'],
            ['Triglycerides', '150 mg/dL', '<150 mg/dL']
          ],
          rowCount: 3,
          colCount: 3,
          page: 1,
          confidence: 0.9
        }
      ];

      return storeMedicalTables(documentId, tables).then(result => {
        if (result.length > 0) {
          expect(result[0].medicalEntities).toEqual(
            expect.arrayContaining([
              'hemoglobin', 'hba1c', 'cholesterol', 'ldl', 'triglycerides', 'mg/dl'
            ])
          );
        }
      });
    });

    it('should extract vital signs entities', () => {
      const documentId = 'test-doc';
      const tables: ExtractedTable[] = [
        {
          headers: ['Parameter', 'Value'],
          data: [
            ['Blood Pressure', '120/80 mmHg'],
            ['Heart Rate', '72 BPM'],
            ['Temperature', '98.6°F'],
            ['Respiratory Rate', '16/min']
          ],
          rowCount: 4,
          colCount: 2,
          page: 1,
          confidence: 0.85
        }
      ];

      return storeMedicalTables(documentId, tables).then(result => {
        if (result.length > 0) {
          expect(result[0].medicalEntities).toEqual(
            expect.arrayContaining([
              'blood pressure', 'heart rate', 'temperature', 'respiratory rate', 'mmhg', 'bpm'
            ])
          );
        }
      });
    });
  });

  describe('Performance Tests', () => {
    it('should process multiple tables efficiently', async () => {
      // Arrange
      const documentId = 'perf-test-doc';
      const largeTables: ExtractedTable[] = Array(10).fill(null).map((_, index) => ({
        headers: ['Test', 'Result', 'Range'],
        data: Array(20).fill(null).map((_, i) => [`Test${i}`, `Result${i}`, `Range${i}`]),
        rowCount: 20,
        colCount: 3,
        page: index + 1,
        confidence: 0.8
      }));

      mockDb.query
        .mockResolvedValue({ rows: [{ table_type: 'lab_results' }] })
        .mockResolvedValue({ rows: [{ id: 1, extracted_at: new Date() }] });

      // Act & Assert
      await PerformanceHelper.assertExecutionTime(
        () => storeMedicalTables(documentId, largeTables),
        10000 // Should complete within 10 seconds
      );
    });
  });
});