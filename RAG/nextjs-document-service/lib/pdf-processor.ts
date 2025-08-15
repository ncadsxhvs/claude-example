/**
 * PDF processing utilities for medical document table extraction
 */

// Using dynamic import to avoid module resolution issues
// import { tabula } from 'tabula-js'; // Optional dependency

export interface ExtractedTable {
  data: string[][];
  headers: string[];
  rowCount: number;
  colCount: number;
  page: number;
  confidence: number;
}

export interface PDFProcessingResult {
  text: string;
  tables: ExtractedTable[];
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
}

/**
 * Extract text and tables from PDF buffer
 */
export async function processPDF(buffer: Buffer): Promise<PDFProcessingResult> {
  try {
    // Dynamic import to avoid module resolution issues
    const pdf = (await import('pdf-parse')).default;
    
    // Extract basic text content
    const pdfData = await pdf(buffer);
    
    // Extract tables using tabula-js
    const tables = await extractTablesFromPDF(buffer);
    
    return {
      text: pdfData.text,
      tables,
      pageCount: pdfData.numpages,
      metadata: {
        title: pdfData.info?.Title,
        author: pdfData.info?.Author,
        creationDate: pdfData.info?.CreationDate,
        modificationDate: pdfData.info?.ModDate,
      }
    };
  } catch (error) {
    console.error('PDF processing error:', error);
    throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract tables from PDF using tabula-js
 */
async function extractTablesFromPDF(buffer: Buffer): Promise<ExtractedTable[]> {
  try {
    // Dynamic import to avoid module resolution issues
    const pdf = (await import('pdf-parse')).default;
    
    // Note: tabula-js may require Java installation
    // For now, implement basic table detection from text
    const pdfData = await pdf(buffer);
    return detectTablesFromText(pdfData.text);
  } catch (error) {
    console.error('Table extraction error:', error);
    // Fallback to text-based table detection
    const pdf = (await import('pdf-parse')).default;
    const pdfData = await pdf(buffer);
    return detectTablesFromText(pdfData.text);
  }
}

/**
 * Detect tables from extracted text (fallback method)
 */
function detectTablesFromText(text: string): ExtractedTable[] {
  const tables: ExtractedTable[] = [];
  const lines = text.split('\n');
  
  let currentTable: string[][] = [];
  let inTable = false;
  let tableStartIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      if (inTable && currentTable.length > 0) {
        // End of table
        tables.push(createTableFromRows(currentTable, tableStartIndex));
        currentTable = [];
        inTable = false;
      }
      continue;
    }
    
    // Detect table-like patterns
    if (isTableRow(line)) {
      if (!inTable) {
        inTable = true;
        tableStartIndex = i;
      }
      
      // Parse row data
      const rowData = parseTableRow(line);
      if (rowData.length > 1) {
        currentTable.push(rowData);
      }
    } else if (inTable) {
      // End of table
      if (currentTable.length > 1) {
        tables.push(createTableFromRows(currentTable, tableStartIndex));
      }
      currentTable = [];
      inTable = false;
    }
  }
  
  // Handle table at end of document
  if (inTable && currentTable.length > 1) {
    tables.push(createTableFromRows(currentTable, tableStartIndex));
  }
  
  return tables;
}

/**
 * Check if a line looks like a table row
 */
function isTableRow(line: string): boolean {
  // Look for common table patterns
  const patterns = [
    /\|.*\|/,           // Pipe-separated
    /\t.*\t/,           // Tab-separated
    /\s{3,}.*\s{3,}/,   // Multiple spaces
    /^\s*\w+\s+[\d\.]/, // Name followed by number
  ];
  
  return patterns.some(pattern => pattern.test(line));
}

/**
 * Parse a table row into columns
 */
function parseTableRow(line: string): string[] {
  // Try different delimiters
  if (line.includes('|')) {
    return line.split('|').map(cell => cell.trim()).filter(cell => cell);
  }
  
  if (line.includes('\t')) {
    return line.split('\t').map(cell => cell.trim()).filter(cell => cell);
  }
  
  // Split on multiple spaces
  return line.split(/\s{2,}/).map(cell => cell.trim()).filter(cell => cell);
}

/**
 * Create structured table from parsed rows
 */
function createTableFromRows(rows: string[][], startIndex: number): ExtractedTable {
  if (rows.length === 0) {
    throw new Error('Cannot create table from empty rows');
  }
  
  const headers = rows[0];
  const data = rows.slice(1);
  
  return {
    data,
    headers,
    rowCount: data.length,
    colCount: headers.length,
    page: Math.floor(startIndex / 50) + 1, // Rough page estimate
    confidence: calculateTableConfidence(rows)
  };
}

/**
 * Calculate confidence score for detected table
 */
function calculateTableConfidence(rows: string[][]): number {
  if (rows.length < 2) return 0;
  
  // Check consistency of column counts
  const expectedCols = rows[0].length;
  const consistentRows = rows.filter(row => row.length === expectedCols).length;
  const consistency = consistentRows / rows.length;
  
  // Check for medical-like content
  const medicalTerms = /glucose|cholesterol|pressure|heart|blood|test|result|normal|high|low/i;
  const medicalContent = rows.flat().some(cell => medicalTerms.test(cell));
  
  let confidence = consistency * 0.7;
  if (medicalContent) confidence += 0.3;
  
  return Math.min(confidence, 1.0);
}

/**
 * Check if extracted tables contain medical data
 */
export function isMedicalTable(table: ExtractedTable): boolean {
  const medicalKeywords = [
    'glucose', 'cholesterol', 'pressure', 'heart rate', 'temperature',
    'test', 'result', 'normal', 'high', 'low', 'reference', 'range',
    'lab', 'blood', 'urine', 'CBC', 'BMP', 'lipid'
  ];
  
  const allText = [...table.headers, ...table.data.flat()].join(' ').toLowerCase();
  
  return medicalKeywords.some(keyword => allText.includes(keyword));
}