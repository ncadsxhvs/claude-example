-- RAG System Database Schema
-- PostgreSQL with pgvector extension

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (optional if using Firebase Auth only)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL, -- Firebase UID
    filename VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    text_length INTEGER NOT NULL,
    chunks_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'processing',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Document chunks with embeddings
CREATE TABLE chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    text TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    character_count INTEGER NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimensions
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_uploaded_at ON documents(uploaded_at);

CREATE INDEX idx_chunks_document_id ON chunks(document_id);
CREATE INDEX idx_chunks_chunk_index ON chunks(chunk_index);

-- Vector similarity index (HNSW for fast approximate search)
CREATE INDEX idx_chunks_embedding ON chunks USING hnsw (embedding vector_cosine_ops);

-- Composite indexes for common queries
CREATE INDEX idx_chunks_document_user ON chunks(document_id) 
    INCLUDE (text, word_count, character_count);

-- Functions for vector similarity search
CREATE OR REPLACE FUNCTION search_similar_chunks(
    query_embedding vector(1536),
    user_id_param VARCHAR(255),
    similarity_threshold FLOAT DEFAULT 0.7,
    max_results INTEGER DEFAULT 5
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    filename VARCHAR(500),
    chunk_text TEXT,
    chunk_index INTEGER,
    similarity_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.document_id,
        d.filename,
        c.text,
        c.chunk_index,
        (1 - (c.embedding <=> query_embedding)) as similarity
    FROM chunks c
    JOIN documents d ON c.document_id = d.id
    WHERE d.user_id = user_id_param
        AND d.status = 'completed'
        AND (1 - (c.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Function to get document statistics
CREATE OR REPLACE FUNCTION get_user_document_stats(user_id_param VARCHAR(255))
RETURNS TABLE (
    total_documents BIGINT,
    total_chunks BIGINT,
    total_text_length BIGINT,
    latest_upload TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(d.id) as total_documents,
        COALESCE(SUM(d.chunks_count), 0) as total_chunks,
        COALESCE(SUM(d.text_length), 0) as total_text_length,
        MAX(d.uploaded_at) as latest_upload
    FROM documents d
    WHERE d.user_id = user_id_param
        AND d.status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- Update trigger for documents.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();