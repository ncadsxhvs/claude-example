# Comprehensive Testing Guide for RAG System

## Overview

This RAG system includes comprehensive testing at multiple levels to ensure reliability, performance, and correctness of all features including medical document intelligence capabilities.

## Testing Strategy

### 1. Unit Tests (`__tests__/unit/`)
- **PDF Processing** (`pdf-processor.test.ts`)
  - PDF text extraction and table detection
  - Medical table recognition algorithms
  - Performance benchmarks for document processing
  
- **Medical Table Processing** (`medical-table-processor.test.ts`)
  - Medical table classification and storage
  - Entity extraction and embedding generation
  - Database integration for medical data
  
- **Search Functionality** (`search-functionality.test.ts`)
  - Semantic, keyword, hybrid, and medical table search modes
  - Embedding generation and caching
  - Error handling and fallback mechanisms

### 2. Integration Tests (`__tests__/integration/`)
- **Upload API** (`upload-api.test.ts`)
  - File validation and processing workflows
  - Real-time progress tracking
  - Duplicate detection and handling
  
- **Search API** (`search-api.test.ts`)
  - Multi-mode search endpoint testing
  - Parameter validation and result formatting
  - Performance under concurrent requests

### 3. End-to-End Tests (`__tests__/e2e/`)
- **Complete Workflows** (`complete-workflows.test.ts`)
  - Document upload → processing → search workflows
  - Medical table extraction and search pipelines
  - Error recovery and graceful degradation
  - Performance and scalability testing

## Test Infrastructure

### Test Utilities (`__tests__/utils/test-helpers.ts`)
- **TestDatabase**: Isolated test database management
- **TestFiles**: Fixture management and temporary file handling
- **MockOpenAI**: OpenAI API response mocking
- **PerformanceHelper**: Execution time measurement and assertions
- **TestAssertions**: Custom validation helpers

### Test Fixtures (`__tests__/fixtures/`)
- `sample-medical-pdf.txt`: Medical document with tables for testing
- `sample-text.txt`: Simple text content for basic testing

## Running Tests

### All Tests
```bash
npm test                    # Run all tests
npm run test:coverage       # Run with coverage report
npm run test:watch          # Run in watch mode
```

### Specific Test Types
```bash
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only  
npm run test:e2e           # End-to-end tests only
```

### Coverage Targets
- **Lines**: >90%
- **Functions**: >95%
- **Branches**: >85%
- **Statements**: >90%

## Test Configuration

### Jest Setup (`jest.config.js`)
- Next.js integration with custom configuration
- Node.js test environment for API testing
- 30-second timeout for integration tests
- Coverage collection from `/lib`, `/app/api`, and `/components`

### Mock Strategy
- **Database**: Mocked with controllable responses
- **OpenAI API**: Mocked embeddings and error scenarios
- **File System**: Temporary test files with cleanup
- **Real-time Processing**: Mocked progress tracking

## Key Testing Requirements

### Always Test After Implementation
**CRITICAL**: Every new feature implementation must include corresponding tests:

1. **Unit Tests**: Test individual components and functions
2. **Integration Tests**: Test API endpoints and data flow
3. **End-to-End Tests**: Test complete user workflows
4. **Performance Tests**: Ensure features meet performance requirements

### Performance Benchmarks
- **Document Upload**: <10 seconds for typical documents
- **Search Queries**: <3 seconds for semantic search
- **PDF Processing**: <5 seconds for medical documents
- **Concurrent Operations**: Handle 5+ simultaneous requests

### Error Handling Coverage
- **Network Failures**: OpenAI API timeouts and errors
- **Database Errors**: Connection failures and query errors
- **File Processing**: Invalid formats and corrupted files
- **Input Validation**: Malformed requests and missing parameters

## Medical Document Testing

### Specialized Test Cases
- **Medical Table Detection**: Various table formats and structures
- **Entity Recognition**: Medical terminology and classifications
- **Confidence Scoring**: Table quality and recognition accuracy
- **Search Integration**: Medical-specific search scenarios

### Test Data Requirements
- Medical documents with various table formats
- Lab results, vital signs, and medication tables
- Mixed medical and non-medical content
- Edge cases: empty tables, malformed data

## Continuous Integration

### Pre-commit Hooks
```bash
# Run linting and tests before commit
npm run lint && npm test
```

### CI Pipeline Requirements
1. **Install Dependencies**: `npm install`
2. **Lint Code**: `npm run lint`
3. **Run Tests**: `npm run test:coverage`
4. **Build Project**: `npm run build`
5. **Generate Reports**: Coverage and performance reports

## Troubleshooting Tests

### Common Issues
1. **Mock Reset**: Ensure `jest.clearAllMocks()` in `beforeEach`
2. **Async Handling**: Use proper `await` for async operations
3. **Database State**: Clean test database between tests
4. **File Cleanup**: Remove temporary files after tests
5. **Timeout Issues**: Increase timeout for slow operations

### Debug Mode
```bash
# Run specific test with debug output
npm test -- --testNamePattern="specific test name" --verbose

# Run with Jest debug info
npm test -- --detectOpenHandles --forceExit
```

## Performance Testing

### Load Testing Scenarios
- **Concurrent Uploads**: 5+ simultaneous file uploads
- **Search Load**: 10+ concurrent search requests
- **Large Documents**: Files up to configuration limits
- **Memory Usage**: Monitor for memory leaks

### Benchmarking
- Track execution times for all major operations
- Compare performance across different search modes
- Monitor database query performance
- Measure embedding generation overhead

## Security Testing

### Input Validation
- Test malicious file uploads
- Verify file type and size restrictions
- Validate search parameters and SQL injection prevention
- Test authentication and authorization

### Data Protection
- Ensure test data doesn't contain real medical information
- Verify proper cleanup of temporary files
- Test access controls for user isolation

## Maintenance

### Regular Tasks
1. **Update Test Data**: Keep fixtures current with feature changes
2. **Review Coverage**: Ensure new code is properly tested
3. **Performance Monitoring**: Track test execution times
4. **Dependency Updates**: Keep testing libraries updated

### Test Quality Metrics
- **Test Reliability**: <1% flaky test rate
- **Coverage Stability**: Maintain >90% coverage
- **Performance Consistency**: <10% variance in execution times
- **Documentation**: Keep test documentation updated

This comprehensive testing strategy ensures the RAG system maintains high quality, reliability, and performance across all features including the specialized medical document intelligence capabilities.