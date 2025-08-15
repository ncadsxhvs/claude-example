// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Used for __tests__/testing-library.js
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Mock environment variables for testing
process.env.DB_HOST = 'localhost'
process.env.DB_PORT = '5432'
process.env.DB_NAME = 'rag_system_test'
process.env.DB_USER = 'ddctu'
process.env.DB_PASSWORD = 'test_password'
process.env.OPENAI_API_KEY = 'test_openai_key'

// Mock console methods in test environment
global.console = {
  ...console,
  // Uncomment to ignore warnings
  // warn: jest.fn(),
  // Uncomment to ignore errors
  // error: jest.fn(),
}

// Increase timeout for tests that need more time (like PDF processing)
jest.setTimeout(30000)