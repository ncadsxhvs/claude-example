#!/usr/bin/env node

/**
 * Utility script to validate that all chunks in the database have proper embeddings
 * Usage: node scripts/validate-embeddings.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function validateEmbeddings() {
  console.log('🔍 Starting embedding validation...\n');

  try {
    // 1. Count total chunks
    const totalChunksResult = await pool.query('SELECT COUNT(*) as count FROM chunks');
    const totalChunks = parseInt(totalChunksResult.rows[0].count);
    console.log(`📊 Total chunks in database: ${totalChunks}`);

    if (totalChunks === 0) {
      console.log('ℹ️  No chunks found in database. Upload some documents first.');
      return;
    }

    // 2. Count chunks with embeddings
    const chunksWithEmbeddingsResult = await pool.query(
      'SELECT COUNT(*) as count FROM chunks WHERE embedding IS NOT NULL'
    );
    const chunksWithEmbeddings = parseInt(chunksWithEmbeddingsResult.rows[0].count);
    console.log(`✅ Chunks with embeddings: ${chunksWithEmbeddings}`);

    // 3. Count chunks without embeddings
    const chunksWithoutEmbeddingsResult = await pool.query(
      'SELECT COUNT(*) as count FROM chunks WHERE embedding IS NULL'
    );
    const chunksWithoutEmbeddings = parseInt(chunksWithoutEmbeddingsResult.rows[0].count);
    console.log(`❌ Chunks without embeddings: ${chunksWithoutEmbeddings}`);

    // 4. Calculate completion percentage
    const completionRate = totalChunks > 0 ? (chunksWithEmbeddings / totalChunks) * 100 : 0;
    console.log(`📈 Embedding completion rate: ${completionRate.toFixed(2)}%`);

    // 5. Check embedding dimensions (for vector type, use vector_dims function)
    const dimensionQuery = `
      SELECT 
        vector_dims(embedding) as dimension,
        COUNT(*) as count
      FROM chunks 
      WHERE embedding IS NOT NULL
      GROUP BY vector_dims(embedding)
      ORDER BY count DESC
    `;
    
    const dimensionResult = await pool.query(dimensionQuery);
    console.log('\n📏 Embedding dimensions:');
    dimensionResult.rows.forEach(row => {
      console.log(`   ${row.dimension}D: ${row.count} chunks`);
    });

    // 6. Check for orphaned chunks
    const orphanedQuery = `
      SELECT c.id, c.document_id, c.chunk_index
      FROM chunks c
      LEFT JOIN documents d ON c.document_id = d.id
      WHERE d.id IS NULL
    `;
    
    const orphanedResult = await pool.query(orphanedQuery);
    console.log(`\n🔗 Orphaned chunks (no parent document): ${orphanedResult.rows.length}`);

    // 7. Show sample chunks without embeddings (if any)
    if (chunksWithoutEmbeddings > 0) {
      console.log('\n⚠️  Sample chunks missing embeddings:');
      const sampleMissingQuery = `
        SELECT id, document_id, chunk_index, LEFT(text, 100) as preview
        FROM chunks 
        WHERE embedding IS NULL
        LIMIT 5
      `;
      
      const sampleMissingResult = await pool.query(sampleMissingQuery);
      sampleMissingResult.rows.forEach(chunk => {
        console.log(`   - Chunk ${chunk.id} (doc: ${chunk.document_id}, index: ${chunk.chunk_index})`);
        console.log(`     Preview: "${chunk.preview}..."`);
      });
    }

    // 8. Check document completion status
    const documentStatsQuery = `
      SELECT 
        d.id,
        d.filename,
        d.status,
        COUNT(c.id) as total_chunks,
        COUNT(c.embedding) as chunks_with_embeddings,
        ROUND(
          CASE 
            WHEN COUNT(c.id) > 0 
            THEN (COUNT(c.embedding)::numeric / COUNT(c.id)::numeric) * 100 
            ELSE 0 
          END, 2
        ) as completion_percentage
      FROM documents d
      LEFT JOIN chunks c ON d.id = c.document_id
      GROUP BY d.id, d.filename, d.status
      ORDER BY completion_percentage ASC, d.filename
    `;

    const documentStatsResult = await pool.query(documentStatsQuery);
    console.log('\n📄 Document embedding status:');
    documentStatsResult.rows.forEach(doc => {
      const status = doc.completion_percentage === 100 ? '✅' : '⚠️';
      console.log(`   ${status} ${doc.filename}: ${doc.chunks_with_embeddings}/${doc.total_chunks} chunks (${doc.completion_percentage}%)`);
    });

    // 9. Performance metrics (using vector_dims for vector type)
    const avgEmbeddingQuery = `
      SELECT 
        AVG(vector_dims(embedding)) as avg_dimension,
        MIN(vector_dims(embedding)) as min_dimension,
        MAX(vector_dims(embedding)) as max_dimension
      FROM chunks 
      WHERE embedding IS NOT NULL
    `;
    
    const avgEmbeddingResult = await pool.query(avgEmbeddingQuery);
    if (avgEmbeddingResult.rows[0].avg_dimension) {
      console.log('\n📊 Embedding statistics:');
      const stats = avgEmbeddingResult.rows[0];
      console.log(`   Average dimension: ${parseFloat(stats.avg_dimension).toFixed(1)}`);
      console.log(`   Dimension range: ${stats.min_dimension} - ${stats.max_dimension}`);
    }

    // 10. Summary and recommendations
    console.log('\n📋 Summary:');
    if (completionRate === 100) {
      console.log('✅ All chunks have embeddings! Your RAG system is ready.');
    } else if (completionRate > 90) {
      console.log(`⚠️  ${completionRate.toFixed(1)}% completion rate. Consider regenerating embeddings for missing chunks.`);
    } else if (completionRate > 50) {
      console.log(`❌ Only ${completionRate.toFixed(1)}% of chunks have embeddings. Significant issues detected.`);
    } else {
      console.log(`🚨 Critical: Only ${completionRate.toFixed(1)}% of chunks have embeddings. Check your embedding generation process.`);
    }

    // Provide recommendations
    if (chunksWithoutEmbeddings > 0) {
      console.log('\n💡 Recommendations:');
      console.log('   1. Check OpenAI API key and quota');
      console.log('   2. Review embedding generation logs');
      console.log('   3. Consider re-uploading affected documents');
      console.log('   4. Run embedding regeneration script if available');
    }

  } catch (error) {
    console.error('❌ Error during validation:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run validation if called directly
if (require.main === module) {
  validateEmbeddings()
    .then(() => {
      console.log('\n✨ Validation complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Validation failed:', error);
      process.exit(1);
    });
}

module.exports = { validateEmbeddings };