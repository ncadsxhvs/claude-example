const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

// Minimal Jest configuration for API testing
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-node',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'app/api/**/*.{js,ts}',
    'lib/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  testTimeout: 15000, // 15 second timeout for API tests
  verbose: true
}

module.exports = createJestConfig(customJestConfig)