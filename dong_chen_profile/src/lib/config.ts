// Minimal Configuration for Dong Chen Profile
// Landing page and chat functionality only

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface OpenAIConfig {
  apiKey: string;
  chatModel: string;
}

interface AppConfig {
  firebase: FirebaseConfig;
  openai: OpenAIConfig;
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

// Build minimal configuration object
const config: AppConfig = {
  // Firebase Configuration for Authentication
  firebase: {
    apiKey: validateEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY', process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    authDomain: validateEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: validateEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: validateEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: validateEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    appId: validateEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID', process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  },

  // OpenAI Configuration for Chat
  openai: {
    apiKey: validateEnvVar('OPENAI_API_KEY', process.env.OPENAI_API_KEY),
    chatModel: getOptionalEnvVar('OPENAI_CHAT_MODEL', 'gpt-4'),
  },

  // Environment flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Export individual config sections for easy access
export const firebaseConfig = config.firebase;
export const openaiConfig = config.openai;

// Export full config as default
export default config;