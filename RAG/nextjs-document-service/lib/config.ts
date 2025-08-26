// Simplified configuration for RAG service
interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

interface OpenAIConfig {
  apiKey: string;
  embeddingModel: string;
  chatModel: string;
  embeddingDimensions: number;
  maxBatchSize: number;
}

interface RAGConfig {
  chunkSize: number;
  chunkOverlap: number;
  similarityThreshold: number;
  maxSearchResults: number;
  maxFileSize: number;
  supportedFileTypes: string[];
  // Page-aware chunking options
  pageAwareChunking: boolean;
  maxChunkSizeForTables: number;
  preservePageBoundaries: boolean;
  tableDetectionEnabled: boolean;
}

interface AppConfig {
  database: DatabaseConfig;
  openai: OpenAIConfig;
  rag: RAGConfig;
}

function validateEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function validateOptionalEnvVar(name: string, defaultValue: string = ''): string {
  return process.env[name] || defaultValue;
}

// Database configuration
export const databaseConfig: DatabaseConfig = {
  host: validateEnvVar('DB_HOST', process.env.PGHOST || 'localhost'),
  port: parseInt(validateEnvVar('DB_PORT', process.env.PGPORT || '5432')),
  name: validateEnvVar('DB_NAME', process.env.PGDATABASE || 'rag_system'),
  user: validateEnvVar('DB_USER', process.env.PGUSER || 'ddctu'),
  password: validateOptionalEnvVar('DB_PASSWORD', process.env.PGPASSWORD || ''),
};

// Check if we should use Neon serverless driver (for Vercel) or pg driver (for local)
// Use Neon only if:
// 1. DATABASE_URL is set AND
// 2. We're in production OR explicitly forced with USE_NEON=true
export const useNeonDriver = !!(
  process.env.DATABASE_URL && 
  (process.env.NODE_ENV === 'production' || process.env.USE_NEON === 'true')
);

console.log('🔧 Database Driver Selection:', {
  hasDbUrl: !!process.env.DATABASE_URL,
  nodeEnv: process.env.NODE_ENV,
  useNeonForced: process.env.USE_NEON,
  selectedDriver: useNeonDriver ? 'neon' : 'pg',
  reason: useNeonDriver ? 'production or USE_NEON=true' : 'development with local pg'
});

// OpenAI configuration
export const openaiConfig: OpenAIConfig = {
  apiKey: validateOptionalEnvVar('OPENAI_API_KEY', process.env.NODE_ENV === 'production' ? '' : 'dummy-key-for-build'),
  embeddingModel: validateEnvVar('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'),
  chatModel: validateEnvVar('OPENAI_CHAT_MODEL', 'gpt-4'),
  embeddingDimensions: parseInt(validateEnvVar('OPENAI_EMBEDDING_DIMENSIONS', '1536')),
  maxBatchSize: parseInt(validateEnvVar('OPENAI_MAX_BATCH_SIZE', '100')),
};

// RAG system configuration
export const ragConfig: RAGConfig = {
  chunkSize: parseInt(validateEnvVar('RAG_CHUNK_SIZE', '1000')),
  chunkOverlap: parseInt(validateEnvVar('RAG_CHUNK_OVERLAP', '200')),
  similarityThreshold: parseFloat(validateEnvVar('RAG_SIMILARITY_THRESHOLD', '0.7')),
  maxSearchResults: parseInt(validateEnvVar('RAG_MAX_SEARCH_RESULTS', '5')),
  maxFileSize: parseInt(validateEnvVar('RAG_MAX_FILE_SIZE', '10485760')), // 10MB
  supportedFileTypes: (validateEnvVar('RAG_SUPPORTED_FILE_TYPES', 'text/plain,text/markdown')).split(','),
  // Page-aware chunking configuration
  pageAwareChunking: validateEnvVar('RAG_PAGE_AWARE_CHUNKING', 'true') === 'true',
  maxChunkSizeForTables: parseInt(validateEnvVar('RAG_MAX_CHUNK_SIZE_FOR_TABLES', '3000')),
  preservePageBoundaries: validateEnvVar('RAG_PRESERVE_PAGE_BOUNDARIES', 'true') === 'true',
  tableDetectionEnabled: validateEnvVar('RAG_TABLE_DETECTION_ENABLED', 'true') === 'true',
};

// Full app configuration
export const config: AppConfig = {
  database: databaseConfig,
  openai: openaiConfig,
  rag: ragConfig,
};