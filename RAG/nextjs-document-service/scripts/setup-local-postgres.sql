-- Setup script for local PostgreSQL to match Neon functionality
-- Run this to add the missing search functions to your local database

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Search similar chunks function
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding vector(1536),
  user_id_param VARCHAR(255),
  similarity_threshold DECIMAL DEFAULT 0.7,
  limit_param INTEGER DEFAULT 5
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  filename VARCHAR(500),
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

-- Search hybrid chunks function
CREATE OR REPLACE FUNCTION search_hybrid_chunks(
  query_embedding vector(1536),
  query_text TEXT,
  user_id_param VARCHAR(255),
  semantic_weight DECIMAL DEFAULT 0.7,
  keyword_weight DECIMAL DEFAULT 0.3,
  similarity_threshold DECIMAL DEFAULT 0.6,
  limit_param INTEGER DEFAULT 5
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  filename VARCHAR(500),
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

-- Search keyword chunks function
CREATE OR REPLACE FUNCTION search_keyword_chunks(
  query_text TEXT,
  user_id_param VARCHAR(255),
  limit_param INTEGER DEFAULT 5
)
RETURNS TABLE (
  chunk_id UUID,
  document_id UUID,
  filename VARCHAR(500),
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

-- User stats function
CREATE OR REPLACE FUNCTION get_user_document_stats(user_id_param VARCHAR(255))
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

-- Medical table classification function (if you want medical table support locally)
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