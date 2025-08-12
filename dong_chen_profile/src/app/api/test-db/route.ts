import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { testOpenAIConnection } from '@/lib/embeddings';

export async function GET() {
  try {
    // Test database connection
    const dbConnected = await db.testConnection();
    
    // Test OpenAI connection
    const openaiConnected = await testOpenAIConnection();
    
    // Test vector extension
    const vectorResult = await db.query("SELECT '1'::vector(3) as test_vector");
    const vectorWorking = vectorResult.rows.length > 0;
    
    // Get database stats
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM documents) as total_documents,
        (SELECT COUNT(*) FROM chunks) as total_chunks,
        (SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL) as chunks_with_embeddings
    `);
    
    return NextResponse.json({
      status: 'success',
      connections: {
        database: dbConnected,
        openai: openaiConnected,
        pgvector: vectorWorking
      },
      database_stats: stats.rows[0],
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Database test error:', error);
    return NextResponse.json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}