import { processPDF, isMedicalTable, ExtractedTable } from '../../lib/pdf-processor';
import { TestFiles, TestAssertions, PerformanceHelper } from '../utils/test-helpers';

// Mock pdf-parse module
jest.mock('pdf-parse', () => {
  return {
    __esModule: true,
    default: jest.fn()
  };
});

describe('PDF Processor', () => {
  let mockPdfParse: jest.MockedFunction<any>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Get the mocked pdf-parse function
    mockPdfParse = require('pdf-parse').default as jest.MockedFunction<any>;
  });

  describe('processPDF', () => {
    it('should process PDF buffer and return text and tables', async () => {
      // Arrange
      const mockPdfData = {
        text: TestFiles.readFixture('sample-medical-pdf.txt'),
        numpages: 1,
        info: {
          Title: 'Medical Report',
          Author: 'Dr. Johnson',
          CreationDate: new Date('2024-01-15'),
          ModDate: new Date('2024-01-15')
        }
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      const testBuffer = Buffer.from('fake pdf content');

      // Act
      const result = await PerformanceHelper.assertExecutionTime(
        () => processPDF(testBuffer),
        5000 // Should complete within 5 seconds
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.text).toBe(mockPdfData.text);
      expect(result.pageCount).toBe(1);
      expect(result.metadata.title).toBe('Medical Report');
      expect(result.metadata.author).toBe('Dr. Johnson');
      expect(Array.isArray(result.tables)).toBe(true);
      expect(result.tables.length).toBeGreaterThan(0);

      // Verify PDF parser was called with correct buffer
      expect(mockPdfParse).toHaveBeenCalledWith(testBuffer);
    });

    it('should handle PDF processing errors gracefully', async () => {
      // Arrange
      const testBuffer = Buffer.from('invalid pdf content');
      mockPdfParse.mockRejectedValue(new Error('Invalid PDF format'));

      // Act & Assert
      await expect(processPDF(testBuffer)).rejects.toThrow('Failed to process PDF: Invalid PDF format');
    });

    it('should extract medical tables from text content', async () => {
      // Arrange
      const medicalTextWithTables = TestFiles.readFixture('sample-medical-pdf.txt');
      const mockPdfData = {
        text: medicalTextWithTables,
        numpages: 1,
        info: {}
      };

      mockPdfParse.mockResolvedValue(mockPdfData);
      const testBuffer = Buffer.from('pdf with tables');

      // Act
      const result = await processPDF(testBuffer);

      // Assert
      expect(result.tables).toBeDefined();
      expect(result.tables.length).toBeGreaterThan(0);
      
      // Verify table structure
      result.tables.forEach(table => {
        expect(TestAssertions.isValidMedicalTable(table)).toBe(true);
        expect(table.headers.length).toBeGreaterThan(0);
        expect(table.data.length).toBeGreaterThan(0);
        expect(table.confidence).toBeGreaterThan(0);
        expect(table.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should handle empty PDF content', async () => {
      // Arrange
      const mockPdfData = {
        text: '',
        numpages: 1,
        info: {}
      };

      mockPdfParse.mockResolvedValue(mockPdfData);
      const testBuffer = Buffer.from('empty pdf');

      // Act
      const result = await processPDF(testBuffer);

      // Assert
      expect(result.text).toBe('');
      expect(result.tables).toEqual([]);
      expect(result.pageCount).toBe(1);
    });
  });

  describe('isMedicalTable', () => {
    it('should identify medical tables correctly', () => {
      // Arrange
      const medicalTable: ExtractedTable = {
        headers: ['Test Name', 'Result', 'Reference Range', 'Units'],
        data: [
          ['Glucose', '95', '70-99', 'mg/dL'],
          ['Cholesterol', '180', '<200', 'mg/dL'],
          ['Blood Pressure', '120/80', '<120/80', 'mmHg']
        ],
        rowCount: 3,
        colCount: 4,
        page: 1,
        confidence: 0.9
      };

      // Act
      const result = isMedicalTable(medicalTable);

      // Assert
      expect(result).toBe(true);
    });

    it('should reject non-medical tables', () => {
      // Arrange
      const nonMedicalTable: ExtractedTable = {
        headers: ['Product', 'Price', 'Quantity', 'Total'],
        data: [
          ['Widget A', '10.00', '5', '50.00'],
          ['Widget B', '15.00', '3', '45.00']
        ],
        rowCount: 2,
        colCount: 4,
        page: 1,
        confidence: 0.8
      };

      // Act
      const result = isMedicalTable(nonMedicalTable);

      // Assert
      expect(result).toBe(false);
    });

    it('should identify tables with mixed medical content', () => {
      // Arrange
      const mixedTable: ExtractedTable = {
        headers: ['Parameter', 'Value', 'Notes'],
        data: [
          ['Heart Rate', '72 bpm', 'Normal'],
          ['Office Location', 'Room 101', 'Building A'],
          ['Temperature', '98.6°F', 'Normal']
        ],
        rowCount: 3,
        colCount: 3,
        page: 1,
        confidence: 0.7
      };

      // Act
      const result = isMedicalTable(mixedTable);

      // Assert
      expect(result).toBe(true); // Should be true due to medical terms present
    });

    it('should handle tables with medical keywords in different cases', () => {
      // Arrange
      const caseVariationTable: ExtractedTable = {
        headers: ['TEST', 'RESULT', 'NORMAL RANGE'],
        data: [
          ['GLUCOSE', '95', '70-99'],
          ['BLOOD PRESSURE', '120/80', '<120/80']
        ],
        rowCount: 2,
        colCount: 3,
        page: 1,
        confidence: 0.85
      };

      // Act
      const result = isMedicalTable(caseVariationTable);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Table Detection', () => {
    it('should detect pipe-separated tables', async () => {
      // Arrange
      const pipeTableText = `
Test Name | Result | Reference Range | Units
----------|--------|-----------------|-------
Glucose   | 95     | 70-99           | mg/dL
HDL       | 45     | >40             | mg/dL
      `;

      const mockPdfData = {
        text: pipeTableText,
        numpages: 1,
        info: {}
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      // Act
      const result = await processPDF(Buffer.from('test'));

      // Assert
      expect(result.tables.length).toBeGreaterThan(0);
      const table = result.tables[0];
      expect(table.headers).toContain('Test Name');
      expect(table.headers).toContain('Result');
      expect(table.data[0]).toContain('Glucose');
    });

    it('should detect space-separated tables', async () => {
      // Arrange
      const spaceTableText = `
Parameter          Value  Normal Range
Blood Pressure     118/76 <120/80
Heart Rate         72     60-100 bpm
Temperature        98.6   97-99°F
      `;

      const mockPdfData = {
        text: spaceTableText,
        numpages: 1,
        info: {}
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      // Act
      const result = await processPDF(Buffer.from('test'));

      // Assert
      expect(result.tables.length).toBeGreaterThan(0);
      const table = result.tables[0];
      expect(table.headers).toContain('Parameter');
      expect(table.data[0]).toContain('Blood Pressure');
    });

    it('should calculate confidence scores accurately', async () => {
      // Arrange
      const consistentTableText = `
Test | Result | Range
-----|--------|-------
A    | 1      | 0-10
B    | 2      | 0-10
C    | 3      | 0-10
      `;

      const mockPdfData = {
        text: consistentTableText,
        numpages: 1,
        info: {}
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      // Act
      const result = await processPDF(Buffer.from('test'));

      // Assert
      expect(result.tables.length).toBeGreaterThan(0);
      const table = result.tables[0];
      expect(table.confidence).toBeGreaterThan(0.5); // Should have decent confidence
      expect(table.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Performance Tests', () => {
    it('should process small PDFs quickly', async () => {
      // Arrange
      const smallText = 'Small medical document with glucose 95 mg/dL.';
      const mockPdfData = {
        text: smallText,
        numpages: 1,
        info: {}
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      // Act & Assert
      await PerformanceHelper.assertExecutionTime(
        () => processPDF(Buffer.from('small pdf')),
        1000 // Should complete within 1 second
      );
    });

    it('should handle moderately sized documents efficiently', async () => {
      // Arrange
      const mediumText = TestFiles.readFixture('sample-medical-pdf.txt');
      const mockPdfData = {
        text: mediumText.repeat(5), // Simulate larger document
        numpages: 5,
        info: {}
      };

      mockPdfParse.mockResolvedValue(mockPdfData);

      // Act & Assert
      await PerformanceHelper.assertExecutionTime(
        () => processPDF(Buffer.from('medium pdf')),
        3000 // Should complete within 3 seconds
      );
    });
  });
});