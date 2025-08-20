/**
 * Setup script for Neon database with full RAG schema
 * Run this to initialize your Neon database with all required tables and functions
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function setupNeonDatabase() {
  console.log('🚀 Starting Neon database setup...');
  
  // Get database URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  console.log('🔌 Connecting to Neon database...');
  const sql = neon(databaseUrl);
  
  try {
    // Step 1: Enable pgvector extension
    console.log('📦 Enabling pgvector extension...');
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log('✅ pgvector extension enabled');
    
    // Step 2: Create main documents table
    console.log('📋 Creating documents table...');
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_type TEXT NOT NULL,
        text_length INTEGER NOT NULL DEFAULT 0,
        chunks_count INTEGER NOT NULL DEFAULT 0,
        medical_tables_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb
      )
    `;
    console.log('✅ Documents table created');
    
    // Step 3: Create chunks table
    console.log('📝 Creating chunks table...');
    await sql`
      CREATE TABLE IF NOT EXISTS chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        text TEXT NOT NULL,
        word_count INTEGER NOT NULL DEFAULT 0,
        character_count INTEGER NOT NULL DEFAULT 0,
        page INTEGER,
        embedding vector(1536),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE(document_id, chunk_index)
      )
    `;
    console.log('✅ Chunks table created');
    
    // Step 4: Create medical tables schema
    console.log('🏥 Creating medical tables...');
    await sql`
      CREATE TABLE IF NOT EXISTS medical_tables (
        id SERIAL PRIMARY KEY,
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        table_index INTEGER NOT NULL,
        page_number INTEGER,
        confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
        
        headers TEXT[] NOT NULL,
        row_count INTEGER NOT NULL,
        col_count INTEGER NOT NULL,
        
        table_type VARCHAR(50),
        medical_entities TEXT[],
        
        raw_data JSONB NOT NULL,
        searchable_text TEXT NOT NULL,
        embedding vector(1536),
        
        extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processing_metadata JSONB,
        
        UNIQUE(document_id, table_index)
      )
    `;
    console.log('✅ Medical tables created');
    
    // Step 5: Create medical table cells
    console.log('🔬 Creating medical table cells...');
    await sql`
      CREATE TABLE IF NOT EXISTS medical_table_cells (
        id SERIAL PRIMARY KEY,
        medical_table_id INTEGER REFERENCES medical_tables(id) ON DELETE CASCADE,
        row_index INTEGER NOT NULL,
        col_index INTEGER NOT NULL,
        
        raw_value TEXT NOT NULL,
        normalized_value TEXT,
        data_type VARCHAR(20),
        
        medical_concept VARCHAR(100),
        reference_range TEXT,
        unit VARCHAR(20),
        is_abnormal BOOLEAN,
        
        is_header BOOLEAN DEFAULT FALSE,
        header_col_index INTEGER,
        
        confidence_score DECIMAL(3,2),
        extraction_metadata JSONB,
        
        UNIQUE(medical_table_id, row_index, col_index)
      )
    `;
    console.log('✅ Medical table cells created');
    
    // Step 6: Create indexes
    console.log('🔍 Creating indexes...');
    
    // Document indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at DESC)`;
    
    // Chunk indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_chunks_text_fts ON chunks USING GIN (to_tsvector('english', text))`;
    
    // Medical table indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_medical_tables_document_id ON medical_tables(document_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_medical_tables_type ON medical_tables(table_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_medical_tables_embedding ON medical_tables USING hnsw (embedding vector_cosine_ops)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_medical_tables_entities ON medical_tables USING GIN (medical_entities)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_medical_tables_fts ON medical_tables USING GIN (to_tsvector('english', searchable_text))`;
    
    // Medical cell indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_medical_cells_table_id ON medical_table_cells(medical_table_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_medical_cells_concept ON medical_table_cells(medical_concept)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_medical_cells_abnormal ON medical_table_cells(is_abnormal) WHERE is_abnormal = TRUE`;
    
    console.log('✅ All indexes created');
    
    // Step 7: Create search functions
    console.log('🔧 Creating search functions...');
    
    // Search similar chunks function
    await sql`
      CREATE OR REPLACE FUNCTION search_similar_chunks(
        query_embedding vector(1536),
        user_id_param TEXT,
        similarity_threshold DECIMAL DEFAULT 0.7,
        limit_param INTEGER DEFAULT 5
      )
      RETURNS TABLE (
        chunk_id UUID,
        document_id UUID,
        filename TEXT,
        chunk_text TEXT,
        chunk_index INTEGER,
        page INTEGER,
        similarity_score DECIMAL
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          c.id as chunk_id,
          c.document_id,
          d.filename,
          c.text as chunk_text,
          c.chunk_index,
          c.page,
          (1 - (c.embedding <=> query_embedding))::DECIMAL(5,4) as similarity_score
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE 
          d.user_id = user_id_param
          AND c.embedding IS NOT NULL
          AND (1 - (c.embedding <=> query_embedding)) >= similarity_threshold
        ORDER BY c.embedding <=> query_embedding
        LIMIT limit_param;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // Search hybrid chunks function
    await sql`
      CREATE OR REPLACE FUNCTION search_hybrid_chunks(
        query_embedding vector(1536),
        query_text TEXT,
        user_id_param TEXT,
        semantic_weight DECIMAL DEFAULT 0.7,
        keyword_weight DECIMAL DEFAULT 0.3,
        similarity_threshold DECIMAL DEFAULT 0.6,
        limit_param INTEGER DEFAULT 5
      )
      RETURNS TABLE (
        chunk_id UUID,
        document_id UUID,
        filename TEXT,
        chunk_text TEXT,
        chunk_index INTEGER,
        page INTEGER,
        semantic_score DECIMAL,
        keyword_score DECIMAL,
        combined_score DECIMAL
      ) AS $$
      BEGIN
        RETURN QUERY
        WITH semantic_results AS (
          SELECT 
            c.id as chunk_id,
            c.document_id,
            d.filename,
            c.text as chunk_text,
            c.chunk_index,
            c.page,
            (1 - (c.embedding <=> query_embedding))::DECIMAL(5,4) as semantic_score
          FROM chunks c
          JOIN documents d ON c.document_id = d.id
          WHERE 
            d.user_id = user_id_param
            AND c.embedding IS NOT NULL
        ),
        keyword_results AS (
          SELECT 
            c.id as chunk_id,
            c.document_id,
            d.filename,
            c.text as chunk_text,
            c.chunk_index,
            c.page,
            ts_rank(to_tsvector('english', c.text), plainto_tsquery('english', query_text))::DECIMAL(5,4) as keyword_score
          FROM chunks c
          JOIN documents d ON c.document_id = d.id
          WHERE 
            d.user_id = user_id_param
            AND to_tsvector('english', c.text) @@ plainto_tsquery('english', query_text)
        )
        SELECT 
          COALESCE(s.chunk_id, k.chunk_id) as chunk_id,
          COALESCE(s.document_id, k.document_id) as document_id,
          COALESCE(s.filename, k.filename) as filename,
          COALESCE(s.chunk_text, k.chunk_text) as chunk_text,
          COALESCE(s.chunk_index, k.chunk_index) as chunk_index,
          COALESCE(s.page, k.page) as page,
          COALESCE(s.semantic_score, 0::DECIMAL(5,4)) as semantic_score,
          COALESCE(k.keyword_score, 0::DECIMAL(5,4)) as keyword_score,
          (COALESCE(s.semantic_score, 0) * semantic_weight + COALESCE(k.keyword_score, 0) * keyword_weight)::DECIMAL(5,4) as combined_score
        FROM semantic_results s
        FULL OUTER JOIN keyword_results k ON s.chunk_id = k.chunk_id
        WHERE (COALESCE(s.semantic_score, 0) * semantic_weight + COALESCE(k.keyword_score, 0) * keyword_weight) >= similarity_threshold
        ORDER BY combined_score DESC
        LIMIT limit_param;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // Search keyword chunks function
    await sql`
      CREATE OR REPLACE FUNCTION search_keyword_chunks(
        query_text TEXT,
        user_id_param TEXT,
        limit_param INTEGER DEFAULT 5
      )
      RETURNS TABLE (
        chunk_id UUID,
        document_id UUID,
        filename TEXT,
        chunk_text TEXT,
        chunk_index INTEGER,
        page INTEGER,
        keyword_score DECIMAL
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          c.id as chunk_id,
          c.document_id,
          d.filename,
          c.text as chunk_text,
          c.chunk_index,
          c.page,
          ts_rank(to_tsvector('english', c.text), plainto_tsquery('english', query_text))::DECIMAL(5,4) as keyword_score
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE 
          d.user_id = user_id_param
          AND to_tsvector('english', c.text) @@ plainto_tsquery('english', query_text)
        ORDER BY keyword_score DESC
        LIMIT limit_param;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    // User stats function
    await sql`
      CREATE OR REPLACE FUNCTION get_user_document_stats(user_id_param TEXT)
      RETURNS TABLE (
        total_documents INTEGER,
        total_chunks INTEGER,
        total_text_length INTEGER,
        latest_upload TIMESTAMP
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          COUNT(*)::INTEGER as total_documents,
          COALESCE(SUM(chunks_count), 0)::INTEGER as total_chunks,
          COALESCE(SUM(text_length), 0)::INTEGER as total_text_length,
          MAX(uploaded_at) as latest_upload
        FROM documents 
        WHERE documents.user_id = user_id_param;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    console.log('✅ All search functions created');
    
    // Step 8: Medical table classification function
    console.log('🏥 Creating medical classification function...');
    await sql`
      CREATE OR REPLACE FUNCTION classify_medical_table(
        headers_array TEXT[],
        sample_data TEXT
      )
      RETURNS VARCHAR(50) AS $$
      DECLARE
        combined_text TEXT;
        lab_keywords TEXT[] := ARRAY['glucose', 'cholesterol', 'hemoglobin', 'hba1c', 'ldl', 'hdl', 'triglycerides', 'creatinine', 'bun', 'test', 'result', 'reference', 'range', 'normal', 'high', 'low'];
        vital_keywords TEXT[] := ARRAY['blood pressure', 'heart rate', 'temperature', 'respiratory', 'pulse', 'bp', 'hr', 'temp', 'weight', 'height', 'bmi'];
        medication_keywords TEXT[] := ARRAY['medication', 'drug', 'dosage', 'dose', 'prescription', 'tablet', 'capsule', 'mg', 'ml', 'frequency', 'daily', 'twice'];
        keyword TEXT;
        lab_count INTEGER := 0;
        vital_count INTEGER := 0;
        med_count INTEGER := 0;
      BEGIN
        combined_text := LOWER(array_to_string(headers_array, ' ') || ' ' || sample_data);
        
        FOREACH keyword IN ARRAY lab_keywords
        LOOP
          IF combined_text LIKE '%' || keyword || '%' THEN
            lab_count := lab_count + 1;
          END IF;
        END LOOP;
        
        FOREACH keyword IN ARRAY vital_keywords
        LOOP
          IF combined_text LIKE '%' || keyword || '%' THEN
            vital_count := vital_count + 1;
          END IF;
        END LOOP;
        
        FOREACH keyword IN ARRAY medication_keywords
        LOOP
          IF combined_text LIKE '%' || keyword || '%' THEN
            med_count := med_count + 1;
          END IF;
        END LOOP;
        
        IF lab_count >= vital_count AND lab_count >= med_count AND lab_count > 0 THEN
          RETURN 'lab_results';
        ELSIF vital_count >= med_count AND vital_count > 0 THEN
          RETURN 'vital_signs';
        ELSIF med_count > 0 THEN
          RETURN 'medication';
        ELSE
          RETURN 'general';
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `;
    console.log('✅ Medical classification function created');
    
    // Step 9: Create medical tables search function (from existing schema)
    console.log('🔍 Creating medical tables search function...');
    await sql`
      CREATE OR REPLACE FUNCTION search_medical_tables(
        query_text TEXT,
        query_embedding vector(1536) DEFAULT NULL,
        user_id_param TEXT DEFAULT NULL,
        table_type_filter VARCHAR(50) DEFAULT NULL,
        limit_param INTEGER DEFAULT 10,
        similarity_threshold DECIMAL DEFAULT 0.3
      )
      RETURNS TABLE (
        table_id INTEGER,
        document_id UUID,
        filename TEXT,
        table_index INTEGER,
        table_type VARCHAR(50),
        headers TEXT[],
        similarity_score DECIMAL,
        searchable_text TEXT,
        raw_data JSONB,
        confidence_score DECIMAL
      ) AS $$
      BEGIN
        RETURN QUERY
        WITH semantic_results AS (
          SELECT 
            mt.id as table_id,
            mt.document_id,
            d.filename,
            mt.table_index,
            mt.table_type,
            mt.headers,
            CASE 
              WHEN query_embedding IS NOT NULL THEN (1 - (mt.embedding <=> query_embedding))::DECIMAL(5,4)
              ELSE 0::DECIMAL(5,4)
            END as similarity_score,
            mt.searchable_text,
            mt.raw_data,
            mt.confidence_score
          FROM medical_tables mt
          JOIN documents d ON mt.document_id = d.id
          WHERE 
            (user_id_param IS NULL OR d.user_id = user_id_param)
            AND (table_type_filter IS NULL OR mt.table_type = table_type_filter)
            AND (query_embedding IS NULL OR (1 - (mt.embedding <=> query_embedding)) >= similarity_threshold)
        ),
        keyword_results AS (
          SELECT 
            mt.id as table_id,
            mt.document_id,
            d.filename,
            mt.table_index,
            mt.table_type,
            mt.headers,
            ts_rank(to_tsvector('english', mt.searchable_text), plainto_tsquery('english', query_text))::DECIMAL(5,4) as similarity_score,
            mt.searchable_text,
            mt.raw_data,
            mt.confidence_score
          FROM medical_tables mt
          JOIN documents d ON mt.document_id = d.id
          WHERE 
            (user_id_param IS NULL OR d.user_id = user_id_param)
            AND (table_type_filter IS NULL OR mt.table_type = table_type_filter)
            AND to_tsvector('english', mt.searchable_text) @@ plainto_tsquery('english', query_text)
        )
        SELECT DISTINCT
          COALESCE(s.table_id, k.table_id) as table_id,
          COALESCE(s.document_id, k.document_id) as document_id,
          COALESCE(s.filename, k.filename) as filename,
          COALESCE(s.table_index, k.table_index) as table_index,
          COALESCE(s.table_type, k.table_type) as table_type,
          COALESCE(s.headers, k.headers) as headers,
          GREATEST(COALESCE(s.similarity_score, 0), COALESCE(k.similarity_score, 0)) as similarity_score,
          COALESCE(s.searchable_text, k.searchable_text) as searchable_text,
          COALESCE(s.raw_data, k.raw_data) as raw_data,
          COALESCE(s.confidence_score, k.confidence_score) as confidence_score
        FROM semantic_results s
        FULL OUTER JOIN keyword_results k ON s.table_id = k.table_id
        ORDER BY similarity_score DESC
        LIMIT limit_param;
      END;
      $$ LANGUAGE plpgsql;
    `;
    console.log('✅ Medical tables search function created');
    
    // Step 10: Test the setup
    console.log('🧪 Testing database setup...');
    const testResult = await sql`SELECT 1 as test, version() as db_version`;
    console.log('✅ Database test successful:', testResult[0]);
    
    // Test pgvector
    const vectorTest = await sql`SELECT '[1,2,3]'::vector as test_vector`;
    console.log('✅ pgvector test successful');
    
    console.log('\n🎉 Neon database setup completed successfully!');
    console.log('\n📊 Database Summary:');
    console.log('- ✅ pgvector extension enabled');
    console.log('- ✅ 4 tables created (documents, chunks, medical_tables, medical_table_cells)');
    console.log('- ✅ 11 indexes created for optimal performance');
    console.log('- ✅ 5 search functions created for RAG operations');
    console.log('- ✅ Medical intelligence functions ready');
    
    console.log('\n🔗 Connection Details:');
    console.log(`Database: ${process.env.PGDATABASE}`);
    console.log(`Host: ${process.env.PGHOST}`);
    console.log(`User: ${process.env.PGUSER}`);
    
    console.log('\n🚀 Ready for RAG operations!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

// Run the setup
setupNeonDatabase();