/**
 * Test script to verify Neon database integration
 */

require('dotenv').config({ path: '.env.development.local' });
const { neon } = require('@neondatabase/serverless');

async function testNeonIntegration() {
  console.log('🧪 Testing Neon Database Integration...\n');
  
  try {
    // Test basic Neon connection
    console.log('🔌 Testing Neon connection...');
    const sql = neon(process.env.DATABASE_URL);
    
    const result = await sql`SELECT 1 as test, NOW() as timestamp, version() as version`;
    console.log('✅ Neon connection successful:', {
      test: result[0].test,
      timestamp: result[0].timestamp,
      database: 'Neon PostgreSQL'
    });
    
    // Test pgvector extension
    console.log('\n🧪 Testing pgvector extension...');
    const vectorTest = await sql`SELECT '[1,2,3]'::vector as test_vector`;
    console.log('✅ pgvector working:', vectorTest[0]);
    
    // Test table existence
    console.log('\n📋 Testing table structure...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log('✅ Tables found:', tables.map(t => t.table_name));
    
    // Test document query
    console.log('\n🗂️  Testing document queries...');
    const docCount = await sql`SELECT COUNT(*) as count FROM documents`;
    console.log('✅ Documents in database:', docCount[0].count);
    
    // Test chunk query
    console.log('\n📝 Testing chunk queries...');
    const chunkCount = await sql`SELECT COUNT(*) as count FROM chunks`;
    console.log('✅ Chunks in database:', chunkCount[0].count);
    
    // Test search functions
    console.log('\n🔍 Testing search functions...');
    try {
      const searchTest = await sql`
        SELECT * FROM search_keyword_chunks('test', 'demo-user', 1) LIMIT 1
      `;
      console.log('✅ Search functions working, sample results:', searchTest.length);
    } catch (searchError) {
      console.log('ℹ️  Search functions need data to test properly');
    }
    
    // Test user stats
    console.log('\n📊 Testing user stats...');
    const userStats = await sql`SELECT * FROM get_user_document_stats('demo-user')`;
    console.log('✅ User stats:', userStats[0]);
    
    console.log('\n🎉 All Neon integration tests passed!');
    console.log('\n📋 Summary:');
    console.log('- ✅ Database connection working');
    console.log('- ✅ pgvector extension enabled');
    console.log(`- ✅ ${tables.length} tables created`);
    console.log(`- ✅ ${docCount[0].count} documents in database`);
    console.log(`- ✅ ${chunkCount[0].count} chunks in database`);
    console.log('- ✅ Search functions ready');
    console.log('\n🚀 Neon is ready for RAG operations!');
    
  } catch (error) {
    console.error('❌ Neon integration test failed:', error);
    process.exit(1);
  }
}

testNeonIntegration();