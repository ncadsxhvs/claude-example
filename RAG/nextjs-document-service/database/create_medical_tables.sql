-- Enhanced schema for medical table storage
-- Step 2: Medical Table Recognition

-- Table to store extracted medical tables with metadata
CREATE TABLE IF NOT EXISTS medical_tables (
    id SERIAL PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    table_index INTEGER NOT NULL, -- Position within the document
    page_number INTEGER,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- Table structure
    headers TEXT[] NOT NULL,
    row_count INTEGER NOT NULL,
    col_count INTEGER NOT NULL,
    
    -- Medical classification
    table_type VARCHAR(50), -- 'lab_results', 'vital_signs', 'medication', 'general'
    medical_entities TEXT[], -- Detected medical terms
    
    -- Raw data storage
    raw_data JSONB NOT NULL, -- Original table data as 2D array
    
    -- Searchable text representation
    searchable_text TEXT NOT NULL,
    embedding vector(1536), -- Vector embedding for similarity search
    
    -- Metadata
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_metadata JSONB,
    
    UNIQUE(document_id, table_index)
);

-- Index for efficient searching
CREATE INDEX IF NOT EXISTS idx_medical_tables_document_id ON medical_tables(document_id);
CREATE INDEX IF NOT EXISTS idx_medical_tables_type ON medical_tables(table_type);
CREATE INDEX IF NOT EXISTS idx_medical_tables_embedding ON medical_tables USING hnsw (embedding vector_cosine_ops);

-- GIN index for medical entities array search
CREATE INDEX IF NOT EXISTS idx_medical_tables_entities ON medical_tables USING GIN (medical_entities);

-- Full text search index for searchable text
CREATE INDEX IF NOT EXISTS idx_medical_tables_fts ON medical_tables USING GIN (to_tsvector('english', searchable_text));

-- Table for storing individual table cells with medical annotations
CREATE TABLE IF NOT EXISTS medical_table_cells (
    id SERIAL PRIMARY KEY,
    medical_table_id INTEGER REFERENCES medical_tables(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    col_index INTEGER NOT NULL,
    
    -- Cell content
    raw_value TEXT NOT NULL,
    normalized_value TEXT, -- Standardized value (e.g., units conversion)
    data_type VARCHAR(20), -- 'numeric', 'text', 'date', 'range', 'categorical'
    
    -- Medical annotations
    medical_concept VARCHAR(100), -- 'glucose', 'blood_pressure', 'temperature', etc.
    reference_range TEXT, -- Normal range if applicable
    unit VARCHAR(20), -- mg/dL, mmHg, etc.
    is_abnormal BOOLEAN, -- Flagged as outside normal range
    
    -- Relationships
    is_header BOOLEAN DEFAULT FALSE,
    header_col_index INTEGER, -- Links to corresponding header
    
    -- Metadata
    confidence_score DECIMAL(3,2),
    extraction_metadata JSONB,
    
    UNIQUE(medical_table_id, row_index, col_index)
);

-- Indexes for cell-level search
CREATE INDEX IF NOT EXISTS idx_medical_cells_table_id ON medical_table_cells(medical_table_id);
CREATE INDEX IF NOT EXISTS idx_medical_cells_concept ON medical_table_cells(medical_concept);
CREATE INDEX IF NOT EXISTS idx_medical_cells_abnormal ON medical_table_cells(is_abnormal) WHERE is_abnormal = TRUE;

-- Function to search medical tables by content
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
    document_id INTEGER,
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

-- Function to classify table type based on content
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
    -- Combine headers and sample data for analysis
    combined_text := LOWER(array_to_string(headers_array, ' ') || ' ' || sample_data);
    
    -- Count lab-related keywords
    FOREACH keyword IN ARRAY lab_keywords
    LOOP
        IF combined_text LIKE '%' || keyword || '%' THEN
            lab_count := lab_count + 1;
        END IF;
    END LOOP;
    
    -- Count vital signs keywords
    FOREACH keyword IN ARRAY vital_keywords
    LOOP
        IF combined_text LIKE '%' || keyword || '%' THEN
            vital_count := vital_count + 1;
        END IF;
    END LOOP;
    
    -- Count medication keywords
    FOREACH keyword IN ARRAY medication_keywords
    LOOP
        IF combined_text LIKE '%' || keyword || '%' THEN
            med_count := med_count + 1;
        END IF;
    END LOOP;
    
    -- Classify based on highest count
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