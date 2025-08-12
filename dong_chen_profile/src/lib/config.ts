// Centralized Configuration for RAG System
// All environment variables and settings in one place

interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  connectionString: string;
}

interface OpenAIConfig {
  apiKey: string;
  embeddingModel: string;
  chatModel: string;
  embeddingDimensions: number;
  maxBatchSize: number;
}

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface RAGConfig {
  chunkSize: number;
  chunkOverlap: number;
  similarityThreshold: number;
  maxSearchResults: number;
  maxFileSize: number; // in bytes
  supportedFileTypes: string[];
}

interface AppConfig {
  database: DatabaseConfig;
  openai: OpenAIConfig;
  firebase: FirebaseConfig;
  rag: RAGConfig;
  isDevelopment: boolean;
  isProduction: boolean;
}

// Validate required environment variables
function validateEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptionalEnvVar(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

function getNumberEnvVar(name: string, defaultValue: number): number {
  const value = process.env[name];
  return value ? parseInt(value, 10) : defaultValue;
}

// Build configuration object
const config: AppConfig = {
  // Database Configuration
  database: {
    host: getOptionalEnvVar('DB_HOST', 'localhost'),
    port: getNumberEnvVar('DB_PORT', 5432),
    name: getOptionalEnvVar('DB_NAME', 'rag_system'),
    user: getOptionalEnvVar('DB_USER', 'postgres'),
    password: getOptionalEnvVar('DB_PASSWORD', ''),
    get connectionString() {
      return `postgresql://${this.user}${this.password ? ':' + this.password : ''}@${this.host}:${this.port}/${this.name}`;
    }
  },

  // OpenAI Configuration
  openai: {
    apiKey: validateEnvVar('OPENAI_API_KEY', process.env.OPENAI_API_KEY),
    embeddingModel: getOptionalEnvVar('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small'),
    chatModel: getOptionalEnvVar('OPENAI_CHAT_MODEL', 'gpt-4'),
    embeddingDimensions: getNumberEnvVar('OPENAI_EMBEDDING_DIMENSIONS', 1536),
    maxBatchSize: getNumberEnvVar('OPENAI_MAX_BATCH_SIZE', 100),
  },

  // Firebase Configuration
  firebase: {
    apiKey: validateEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY', process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    authDomain: validateEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: validateEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: validateEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: validateEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    appId: validateEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID', process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  },

  // RAG System Configuration
  rag: {
    chunkSize: getNumberEnvVar('RAG_CHUNK_SIZE', 1000),
    chunkOverlap: getNumberEnvVar('RAG_CHUNK_OVERLAP', 200),
    similarityThreshold: parseFloat(getOptionalEnvVar('RAG_SIMILARITY_THRESHOLD', '0.7')),
    maxSearchResults: getNumberEnvVar('RAG_MAX_SEARCH_RESULTS', 5),
    maxFileSize: getNumberEnvVar('RAG_MAX_FILE_SIZE', 10 * 1024 * 1024), // 10MB
    supportedFileTypes: getOptionalEnvVar('RAG_SUPPORTED_FILE_TYPES', 'text/plain,text/markdown').split(','),
  },

  // Environment flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Validation function to check all configurations
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    // Test required configurations
    if (!config.openai.apiKey) {
      errors.push('OpenAI API key is required');
    }

    if (!config.firebase.apiKey) {
      errors.push('Firebase configuration is incomplete');
    }

    if (config.rag.chunkSize < 100 || config.rag.chunkSize > 2000) {
      errors.push('RAG chunk size should be between 100 and 2000 characters');
    }

    if (config.rag.similarityThreshold < 0 || config.rag.similarityThreshold > 1) {
      errors.push('RAG similarity threshold should be between 0 and 1');
    }

    if (config.database.port < 1 || config.database.port > 65535) {
      errors.push('Database port should be a valid port number');
    }

  } catch (error: any) {
    errors.push(`Configuration validation error: ${error.message}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Log configuration summary (without sensitive data)
export function logConfigSummary(): void {
  if (config.isDevelopment) {
    console.log('🔧 RAG System Configuration:');
    console.log(`   Database: ${config.database.host}:${config.database.port}/${config.database.name}`);
    console.log(`   OpenAI Model: ${config.openai.embeddingModel} (${config.openai.embeddingDimensions}d)`);
    console.log(`   RAG Chunk Size: ${config.rag.chunkSize} chars (overlap: ${config.rag.chunkOverlap})`);
    console.log(`   Similarity Threshold: ${config.rag.similarityThreshold}`);
    console.log(`   Supported Files: ${config.rag.supportedFileTypes.join(', ')}`);
    console.log(`   Environment: ${process.env.NODE_ENV}`);
    
    const validation = validateConfig();
    if (!validation.isValid) {
      console.error('❌ Configuration Errors:', validation.errors);
    } else {
      console.log('✅ Configuration Valid');
    }
  }
}

// Export individual config sections for easy access
export const databaseConfig = config.database;
export const openaiConfig = config.openai;
export const firebaseConfig = config.firebase;
export const ragConfig = config.rag;

// Export full config as default
export default config;