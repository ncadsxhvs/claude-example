/**
 * JSON processing utilities for table extraction and content parsing
 */

export interface ExtractedJsonTable {
  data: string[][];
  headers: string[];
  rowCount: number;
  colCount: number;
  confidence: number;
  sourceType: 'array_of_objects' | 'columnar_data' | 'nested_structure';
}

export interface JsonProcessingResult {
  text: string;
  tables: ExtractedJsonTable[];
  originalStructure: any;
  metadata: {
    totalKeys: number;
    maxDepth: number;
    hasArrays: boolean;
    hasTables: boolean;
  };
}

/**
 * Process JSON content and extract text + tables
 */
export function processJson(jsonContent: string): JsonProcessingResult {
  try {
    const parsed = JSON.parse(jsonContent);
    
    // Generate readable text representation
    const text = generateReadableText(parsed);
    
    // Extract table-like structures
    const tables = extractTablesFromJson(parsed);
    
    // Analyze structure metadata
    const metadata = analyzeJsonStructure(parsed);
    
    return {
      text,
      tables,
      originalStructure: parsed,
      metadata
    };
  } catch (error) {
    throw new Error(`Failed to process JSON: ${error instanceof Error ? error.message : 'Invalid JSON format'}`);
  }
}

/**
 * Generate human-readable text from JSON structure
 */
function generateReadableText(obj: any, prefix: string = '', depth: number = 0): string {
  if (depth > 10) return '[Max depth reached]'; // Prevent infinite recursion
  
  const lines: string[] = [];
  const indent = '  '.repeat(depth);
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      lines.push(`${indent}${prefix}Empty array`);
    } else if (isTableLikeArray(obj)) {
      // Handle as table - show summary
      lines.push(`${indent}${prefix}Table with ${obj.length} rows`);
      if (obj[0] && typeof obj[0] === 'object') {
        const headers = Object.keys(obj[0]);
        lines.push(`${indent}  Columns: ${headers.join(', ')}`);
      }
    } else {
      // Regular array
      lines.push(`${indent}${prefix}Array (${obj.length} items):`);
      obj.slice(0, 5).forEach((item, index) => {
        lines.push(generateReadableText(item, `[${index}] `, depth + 1));
      });
      if (obj.length > 5) {
        lines.push(`${indent}  ... and ${obj.length - 5} more items`);
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        lines.push(`${indent}${prefix}${key}: ${value}`);
      } else {
        lines.push(generateReadableText(value, `${key}: `, depth + 1));
      }
    });
  } else {
    lines.push(`${indent}${prefix}${obj}`);
  }
  
  return lines.join('\n');
}

/**
 * Extract table-like structures from JSON
 */
function extractTablesFromJson(obj: any): ExtractedJsonTable[] {
  const tables: ExtractedJsonTable[] = [];
  
  // Method 1: Array of objects (most common)
  if (Array.isArray(obj) && isTableLikeArray(obj)) {
    const table = extractTableFromArrayOfObjects(obj);
    if (table) tables.push(table);
  }
  
  // Method 2: Scan object properties for arrays and table-like structures
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
    Object.entries(obj).forEach(([key, value]) => {
      if (Array.isArray(value) && isTableLikeArray(value)) {
        const table = extractTableFromArrayOfObjects(value);
        if (table) {
          table.headers = [`${key}_${table.headers[0]}`, ...table.headers.slice(1)];
          tables.push(table);
        }
      } else if (isColumnarData(value)) {
        const table = extractTableFromColumnarData(value as Record<string, any[]>);
        if (table) tables.push(table);
      }
    });
  }
  
  // Method 3: Check for columnar data at root level
  if (isColumnarData(obj)) {
    const table = extractTableFromColumnarData(obj);
    if (table) tables.push(table);
  }
  
  return tables;
}

/**
 * Check if array contains table-like data (array of objects with consistent keys)
 */
function isTableLikeArray(arr: any[]): boolean {
  if (arr.length < 2) return false;
  
  // Check if all items are objects
  if (!arr.every(item => typeof item === 'object' && item !== null && !Array.isArray(item))) {
    return false;
  }
  
  // Check for consistent keys across objects
  const firstKeys = Object.keys(arr[0]).sort();
  if (firstKeys.length < 2) return false; // Need at least 2 columns
  
  return arr.every(item => {
    const itemKeys = Object.keys(item).sort();
    return itemKeys.length === firstKeys.length && 
           itemKeys.every((key, index) => key === firstKeys[index]);
  });
}

/**
 * Check if object represents columnar data
 */
function isColumnarData(obj: any): boolean {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return false;
  
  const values = Object.values(obj);
  if (values.length < 2) return false;
  
  // Check if all values are arrays of the same length
  const firstLength = Array.isArray(values[0]) ? values[0].length : -1;
  if (firstLength < 2) return false;
  
  return values.every(value => 
    Array.isArray(value) && 
    value.length === firstLength &&
    value.every(item => typeof item === 'string' || typeof item === 'number')
  );
}

/**
 * Extract table from array of objects
 */
function extractTableFromArrayOfObjects(arr: any[]): ExtractedJsonTable | null {
  if (!isTableLikeArray(arr)) return null;
  
  const headers = Object.keys(arr[0]).sort();
  const data = arr.map(obj => headers.map(key => String(obj[key] || '')));
  
  return {
    data,
    headers,
    rowCount: data.length,
    colCount: headers.length,
    confidence: calculateTableConfidence(data, headers),
    sourceType: 'array_of_objects'
  };
}

/**
 * Extract table from columnar data
 */
function extractTableFromColumnarData(obj: Record<string, any[]>): ExtractedJsonTable | null {
  if (!isColumnarData(obj)) return null;
  
  const headers = Object.keys(obj).sort();
  const columns = headers.map(key => obj[key]);
  const rowCount = columns[0].length;
  
  // Transpose columnar data to row-based
  const data: string[][] = [];
  for (let i = 0; i < rowCount; i++) {
    data.push(columns.map(col => String(col[i] || '')));
  }
  
  return {
    data,
    headers,
    rowCount,
    colCount: headers.length,
    confidence: calculateTableConfidence(data, headers),
    sourceType: 'columnar_data'
  };
}

/**
 * Calculate confidence score for extracted table
 */
function calculateTableConfidence(data: string[][], headers: string[]): number {
  if (data.length === 0 || headers.length === 0) return 0;
  
  let confidence = 0.5; // Base confidence
  
  // Boost for consistent row lengths
  const consistentRows = data.filter(row => row.length === headers.length).length;
  confidence += (consistentRows / data.length) * 0.3;
  
  // Boost for non-empty data
  const nonEmptyData = data.flat().filter(cell => cell.trim().length > 0).length;
  const totalCells = data.length * headers.length;
  confidence += (nonEmptyData / totalCells) * 0.2;
  
  // Penalty for very small tables
  if (data.length < 3) confidence *= 0.8;
  if (headers.length < 2) confidence *= 0.6;
  
  return Math.min(confidence, 1.0);
}

/**
 * Analyze JSON structure for metadata
 */
function analyzeJsonStructure(obj: any): JsonProcessingResult['metadata'] {
  let totalKeys = 0;
  let maxDepth = 0;
  let hasArrays = false;
  let hasTables = false;
  
  function analyze(current: any, depth: number = 0): void {
    maxDepth = Math.max(maxDepth, depth);
    
    if (Array.isArray(current)) {
      hasArrays = true;
      if (isTableLikeArray(current)) {
        hasTables = true;
      }
      current.forEach(item => analyze(item, depth + 1));
    } else if (typeof current === 'object' && current !== null) {
      const keys = Object.keys(current);
      totalKeys += keys.length;
      
      if (isColumnarData(current)) {
        hasTables = true;
      }
      
      keys.forEach(key => analyze(current[key], depth + 1));
    }
  }
  
  analyze(obj);
  
  return {
    totalKeys,
    maxDepth,
    hasArrays,
    hasTables
  };
}