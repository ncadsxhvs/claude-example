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
  host: validateEnvVar('DB_HOST', 'localhost'),
  port: parseInt(validateEnvVar('DB_PORT', '5432')),
  name: validateEnvVar('DB_NAME', 'rag_system'),
  user: validateEnvVar('DB_USER', 'ddctu'),
  password: validateOptionalEnvVar('DB_PASSWORD', ''),
};

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
};

// Full app configuration
export const config: AppConfig = {
  database: databaseConfig,
  openai: openaiConfig,
  rag: ragConfig,
};