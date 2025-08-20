// Minimal Jest setup for API testing

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.OPENAI_API_KEY = 'test-key-12345'
process.env.DB_HOST = 'localhost'
process.env.DB_NAME = 'rag_system_test'
process.env.DB_USER = 'test_user'
process.env.DB_PASSWORD = ''

// Global test timeout
jest.setTimeout(15000)

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: console.warn,
  error: console.error,
}