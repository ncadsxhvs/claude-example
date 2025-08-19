#!/usr/bin/env node

/**
 * Minimalist database cleanup script
 * Removes all uploaded files and data from the RAG system
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function cleanupDatabase() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'rag_system',
    user: process.env.DB_USER || 'ddctu',
    password: process.env.DB_PASSWORD,
  });

  try {
    console.log('🧹 Cleaning up RAG database...');
    
    // Delete in order to respect foreign key constraints
    console.log('   Deleting medical table cells...');
    await pool.query('DELETE FROM medical_table_cells');
    
    console.log('   Deleting medical tables...');
    await pool.query('DELETE FROM medical_tables');
    
    console.log('   Deleting document chunks...');
    await pool.query('DELETE FROM chunks');
    
    console.log('   Deleting documents...');
    await pool.query('DELETE FROM documents');
    
    console.log('✅ Database cleanup complete!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the cleanup
cleanupDatabase();