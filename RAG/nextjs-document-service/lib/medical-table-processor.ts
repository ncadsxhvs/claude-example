/**
 * Medical table processing and storage utilities
 * Step 2: Medical Table Recognition
 */

import { db } from './database';
import { generateEmbedding } from './embeddings';
import { ExtractedTable, isMedicalTable } from './pdf-processor';

export interface StoredMedicalTable {
  id: number;
  documentId: string;
  tableIndex: number;
  pageNumber: number | null;
  confidenceScore: number;
  headers: string[];
  rowCount: number;
  colCount: number;
  tableType: string;
  medicalEntities: string[];
  rawData: string[][];
  searchableText: string;
  extractedAt: string;
}

/**
 * Store extracted tables in medical_tables with classification and embeddings
 */
export async function storeMedicalTables(
  documentId: string,
  tables: ExtractedTable[]
): Promise<StoredMedicalTable[]> {
  const storedTables: StoredMedicalTable[] = [];

  for (let i = 0; i < tables.length; i++) {
    const table = tables[i];
    
    // Skip non-medical tables for now
    if (!isMedicalTable(table)) {
      console.log(`Skipping non-medical table ${i + 1}`);
      continue;
    }

    try {
      // Generate searchable text representation
      const searchableText = createSearchableText(table);
      
      // Generate embedding for the table
      const embeddingResult = await generateEmbedding(searchableText);
      const embeddingVector = `[${embeddingResult.embedding.join(',')}]`;
      
      // Classify table type
      const tableType = await classifyTable(table.headers, searchableText);
      
      // Extract medical entities
      const medicalEntities = extractMedicalEntities(searchableText);
      
      // Store in database
      const insertQuery = `
        INSERT INTO medical_tables (
          document_id, table_index, page_number, confidence_score,
          headers, row_count, col_count, table_type, medical_entities,
          raw_data, searchable_text, embedding, processing_metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, extracted_at
      `;
      
      const values = [
        documentId,
        i,
        table.page,
        table.confidence,
        table.headers,
        table.rowCount,
        table.colCount,
        tableType,
        medicalEntities,
        JSON.stringify(table.data),
        searchableText,
        embeddingVector,
        JSON.stringify({
          embeddingModel: 'text-embedding-3-small',
          tokensUsed: embeddingResult.usage.total_tokens,
          processingTimestamp: new Date().toISOString()
        })
      ];
      
      const result = await db.query(insertQuery, values);
      const storedTable: StoredMedicalTable = {
        id: result.rows[0].id,
        documentId,
        tableIndex: i,
        pageNumber: table.page,
        confidenceScore: table.confidence,
        headers: table.headers,
        rowCount: table.rowCount,
        colCount: table.colCount,
        tableType,
        medicalEntities,
        rawData: table.data,
        searchableText,
        extractedAt: result.rows[0].extracted_at
      };
      
      storedTables.push(storedTable);
      console.log(`Stored medical table ${i + 1}: ${tableType} (confidence: ${table.confidence})`);
      
    } catch (error) {
      console.error(`Error storing medical table ${i + 1}:`, error);
      // Continue with other tables even if one fails
    }
  }

  return storedTables;
}

/**
 * Create searchable text representation of table
 */
function createSearchableText(table: ExtractedTable): string {
  let searchableText = '';
  
  // Add headers
  if (table.headers.length > 0) {
    searchableText += 'Headers: ' + table.headers.join(', ') + '\n';
  }
  
  // Add data rows
  table.data.forEach((row, index) => {
    searchableText += `Row ${index + 1}: ` + row.join(', ') + '\n';
  });
  
  return searchableText.trim();
}

/**
 * Classify table type using database function
 */
async function classifyTable(headers: string[], sampleData: string): Promise<string> {
  try {
    const query = 'SELECT classify_medical_table($1, $2) as table_type';
    const result = await db.query(query, [headers, sampleData]);
    return result.rows[0].table_type;
  } catch (error) {
    console.error('Error classifying table:', error);
    return 'general';
  }
}

/**
 * Extract medical entities from table text
 */
function extractMedicalEntities(text: string): string[] {
  const medicalTerms = [
    // Lab values
    'glucose', 'cholesterol', 'hemoglobin', 'hba1c', 'ldl', 'hdl', 'triglycerides',
    'creatinine', 'bun', 'albumin', 'bilirubin', 'alt', 'ast', 'alkaline phosphatase',
    
    // Vital signs
    'blood pressure', 'heart rate', 'temperature', 'respiratory rate', 'pulse',
    'systolic', 'diastolic', 'bp', 'hr', 'temp', 'weight', 'height', 'bmi',
    
    // Units
    'mg/dl', 'mmol/l', 'mmhg', 'bpm', 'celsius', 'fahrenheit', 'kg', 'lbs', 'cm', 'inches',
    
    // Medical concepts
    'normal', 'high', 'low', 'elevated', 'decreased', 'abnormal', 'reference range',
    'test', 'result', 'lab', 'blood', 'urine', 'serum', 'plasma'
  ];
  
  const lowerText = text.toLowerCase();
  const foundEntities: string[] = [];
  
  medicalTerms.forEach(term => {
    if (lowerText.includes(term)) {
      foundEntities.push(term);
    }
  });
  
  // Remove duplicates and return
  return Array.from(new Set(foundEntities));
}

/**
 * Search medical tables using the database function
 */
export async function searchMedicalTables(
  queryText: string,
  userId: string,
  options: {
    tableType?: string;
    limit?: number;
    similarityThreshold?: number;
  } = {}
): Promise<any[]> {
  try {
    // Generate embedding for the query
    const embeddingResult = await generateEmbedding(queryText);
    const queryEmbedding = `[${embeddingResult.embedding.join(',')}]`;
    
    const query = `
      SELECT * FROM search_medical_tables($1, $2::vector, $3, $4, $5, $6)
    `;
    
    const values = [
      queryText,
      queryEmbedding,
      userId,
      options.tableType || null,
      options.limit || 10,
      options.similarityThreshold || 0.3
    ];
    
    const result = await db.query(query, values);
    return result.rows;
    
  } catch (error) {
    console.error('Error searching medical tables:', error);
    throw error;
  }
}

/**
 * Get medical tables for a specific document
 */
export async function getMedicalTablesForDocument(documentId: string): Promise<StoredMedicalTable[]> {
  try {
    const query = `
      SELECT 
        id, document_id as "documentId", table_index as "tableIndex",
        page_number as "pageNumber", confidence_score as "confidenceScore",
        headers, row_count as "rowCount", col_count as "colCount",
        table_type as "tableType", medical_entities as "medicalEntities",
        raw_data as "rawData", searchable_text as "searchableText",
        extracted_at as "extractedAt"
      FROM medical_tables 
      WHERE document_id = $1 
      ORDER BY table_index
    `;
    
    const result = await db.query(query, [documentId]);
    
    return result.rows.map((row: any) => ({
      ...row,
      rawData: JSON.parse(row.rawData)
    }));
    
  } catch (error) {
    console.error('Error fetching medical tables for document:', error);
    throw error;
  }
}