import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get overall system stats
    const systemStatsQuery = `
      SELECT 
        COUNT(DISTINCT d.id) as total_documents,
        COUNT(c.id) as total_chunks,
        AVG(c.word_count) as avg_words_per_chunk,
        AVG(c.character_count) as avg_chars_per_chunk,
        SUM(d.file_size) as total_file_size,
        SUM(d.text_length) as total_text_length
      FROM documents d
      LEFT JOIN chunks c ON d.id = c.document_id
      WHERE d.status = 'completed'
    `;

    const systemStats = await db.query(systemStatsQuery);

    // Get document type distribution
    const typeDistributionQuery = `
      SELECT 
        file_type,
        COUNT(*) as count,
        SUM(file_size) as total_size
      FROM documents 
      WHERE status = 'completed'
      GROUP BY file_type
      ORDER BY count DESC
    `;

    const typeDistribution = await db.query(typeDistributionQuery);

    // Get embedding dimension info (sample from first chunk)
    const embeddingInfoQuery = `
      SELECT 
        1536 as dimensions,
        COUNT(*) as chunks_with_embeddings
      FROM chunks 
      WHERE embedding IS NOT NULL
    `;

    const embeddingInfo = await db.query(embeddingInfoQuery);

    // Get recent upload activity (last 30 days)
    const uploadActivityQuery = `
      SELECT 
        DATE(uploaded_at) as upload_date,
        COUNT(*) as documents_count,
        SUM(chunks_count) as chunks_count
      FROM documents 
      WHERE uploaded_at >= NOW() - INTERVAL '30 days'
        AND status = 'completed'
      GROUP BY DATE(uploaded_at)
      ORDER BY upload_date DESC
      LIMIT 30
    `;

    const uploadActivity = await db.query(uploadActivityQuery);

    // Get chunk size distribution
    const chunkSizeQuery = `
      SELECT 
        CASE 
          WHEN word_count < 100 THEN 'Small (< 100 words)'
          WHEN word_count < 500 THEN 'Medium (100-500 words)'
          WHEN word_count < 1000 THEN 'Large (500-1000 words)'
          ELSE 'Very Large (> 1000 words)'
        END as size_category,
        COUNT(*) as count,
        AVG(word_count) as avg_words
      FROM chunks
      GROUP BY 
        CASE 
          WHEN word_count < 100 THEN 'Small (< 100 words)'
          WHEN word_count < 500 THEN 'Medium (100-500 words)'
          WHEN word_count < 1000 THEN 'Large (500-1000 words)'
          ELSE 'Very Large (> 1000 words)'
        END
      ORDER BY avg_words
    `;

    const chunkSizeDistribution = await db.query(chunkSizeQuery);

    return NextResponse.json({
      systemStats: systemStats.rows[0],
      typeDistribution: typeDistribution.rows,
      embeddingInfo: embeddingInfo.rows[0] || { dimensions: 1536, chunks_with_embeddings: 0 },
      uploadActivity: uploadActivity.rows,
      chunkSizeDistribution: chunkSizeDistribution.rows,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Vector stats API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vector database statistics' },
      { status: 500 }
    );
  }
}