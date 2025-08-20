/**
 * Database Adapter - Automatically switches between Neon and pg drivers
 * Uses Neon serverless driver when DATABASE_URL is available (Vercel)
 * Falls back to pg driver for local development
 */

import { useNeonDriver } from './config';

// Dynamic imports based on environment
let dbService: any = null;
let isInitialized = false;

async function initializeDatabase() {
  if (isInitialized) return;
  
  console.log(`🔄 Initializing database with ${useNeonDriver ? 'Neon' : 'pg'} driver...`);
  
  if (useNeonDriver) {
    // Use Neon serverless driver
    const neonDb = await import('./neon-database');
    
    // Test connection
    const connected = await neonDb.testNeonConnection();
    if (!connected) {
      throw new Error('Failed to connect to Neon database');
    }
    
    dbService = {
      DocumentService: neonDb.DocumentService,
      ChunkService: neonDb.ChunkService,
      MedicalTableService: neonDb.MedicalTableService,
      StatsService: neonDb.StatsService,
      searchSimilarChunks: neonDb.searchSimilarChunks,
      getUserDocuments: neonDb.getUserDocuments,
      getDocumentChunks: neonDb.getDocumentChunks,
      sql: neonDb.neonSql
    };
  } else {
    // Use traditional pg driver
    const pgDb = await import('./database');
    
    // Test connection
    const connected = await pgDb.db.testConnection();
    if (!connected) {
      throw new Error('Failed to connect to PostgreSQL database');
    }
    
    dbService = {
      DocumentService: pgDb.DocumentService,
      ChunkService: pgDb.ChunkService,
      StatsService: pgDb.StatsService,
      searchSimilarChunks: pgDb.searchSimilarChunks,
      getUserDocuments: pgDb.getUserDocuments,
      getDocumentChunks: pgDb.getDocumentChunks,
      db: pgDb.db
    };
  }
  
  isInitialized = true;
  console.log(`✅ Database initialized successfully with ${useNeonDriver ? 'Neon' : 'pg'} driver`);
}

// Proxy functions that automatically initialize and delegate
export async function getDocumentService() {
  await initializeDatabase();
  return dbService.DocumentService;
}

export async function getChunkService() {
  await initializeDatabase();
  return dbService.ChunkService;
}

export async function getMedicalTableService() {
  await initializeDatabase();
  if (!dbService.MedicalTableService) {
    throw new Error('Medical table service not available with current driver');
  }
  return dbService.MedicalTableService;
}

export async function getStatsService() {
  await initializeDatabase();
  return dbService.StatsService;
}

// Wrapper functions for direct compatibility
export async function searchSimilarChunks(
  queryEmbedding: number[],
  userId: string,
  similarityThreshold: number = 0.7,
  maxResults: number = 5
): Promise<any[]> {
  await initializeDatabase();
  return dbService.searchSimilarChunks(queryEmbedding, userId, similarityThreshold, maxResults);
}

export async function getUserDocuments(userId: string): Promise<any[]> {
  await initializeDatabase();
  return dbService.getUserDocuments(userId);
}

export async function getDocumentChunks(documentId: string): Promise<any[]> {
  await initializeDatabase();
  return dbService.getDocumentChunks(documentId);
}

// Medical table functions (only available with Neon)
export async function searchMedicalTables(
  queryText: string,
  userId: string,
  options: {
    queryEmbedding?: number[];
    tableType?: string;
    limit?: number;
    similarityThreshold?: number;
  } = {}
): Promise<any[]> {
  await initializeDatabase();
  if (!dbService.MedicalTableService) {
    console.warn('Medical table search not available - using empty results');
    return [];
  }
  return dbService.MedicalTableService.searchMedicalTables(queryText, userId, options);
}

export async function storeMedicalTables(
  documentId: string,
  tables: any[]
): Promise<any[]> {
  await initializeDatabase();
  if (!dbService.MedicalTableService) {
    console.warn('Medical table storage not available - skipping');
    return [];
  }
  
  const storedTables = [];
  for (const table of tables) {
    const tableId = await dbService.MedicalTableService.insertMedicalTable({
      document_id: documentId,
      ...table
    });
    storedTables.push({ id: tableId, ...table });
  }
  return storedTables;
}

// Raw SQL access (varies by driver)
export async function getRawDatabase() {
  await initializeDatabase();
  return useNeonDriver ? dbService.sql : dbService.db;
}

// Check which driver is being used
export function getDatabaseInfo() {
  return {
    driver: useNeonDriver ? 'neon' : 'pg',
    initialized: isInitialized,
    hasNeonUrl: !!process.env.DATABASE_URL,
    environment: process.env.NODE_ENV
  };
}