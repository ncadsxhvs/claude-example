# RAG System Memory for Claude Code

## Critical Testing Requirements

### 🔴 MANDATORY: Always Run Tests After Feature Implementation

**EVERY new feature implementation MUST include:**

1. **Unit Tests** for individual components and functions
2. **Integration Tests** for API endpoints and data flow  
3. **End-to-End Tests** for complete user workflows
4. **Performance Tests** to ensure features meet benchmarks

### Testing Commands
```bash
# Run all tests before any commit
npm test

# Run specific test types
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests  
npm run test:e2e           # End-to-end tests
npm run test:coverage       # With coverage report
```

### Test Coverage Requirements
- **Lines**: >90%
- **Functions**: >95% 
- **Branches**: >85%
- **Statements**: >90%

### Performance Benchmarks (Must Pass)
- **Document Upload**: <10 seconds for typical documents
- **Search Queries**: <3 seconds for semantic search
- **PDF Processing**: <5 seconds for medical documents
- **Concurrent Operations**: Handle 5+ simultaneous requests

## Current System Architecture

### Core Features
1. **PDF Processing with Medical Table Extraction**
   - Location: `lib/pdf-processor.ts`
   - Tests: `__tests__/unit/pdf-processor.test.ts`
   - Capabilities: Text extraction, medical table detection, confidence scoring

2. **Medical Table Processing and Classification**
   - Location: `lib/medical-table-processor.ts` 
   - Tests: `__tests__/unit/medical-table-processor.test.ts`
   - Capabilities: Medical entity extraction, table classification, vector storage

3. **Multi-Mode Search System**
   - Location: `app/api/search/route.ts`
   - Tests: `__tests__/unit/search-functionality.test.ts`, `__tests__/integration/search-api.test.ts`
   - Modes: Semantic, Keyword, Hybrid, Medical Tables

4. **Document Upload and Processing**
   - Location: `app/api/upload/route.ts`
   - Tests: `__tests__/integration/upload-api.test.ts`
   - Features: Real-time progress, duplicate detection, medical processing

### Database Schema
- **PostgreSQL + pgvector** for vector similarity search
- **Medical Tables**: `medical_tables`, `medical_table_cells`
- **Core Tables**: `documents`, `chunks` with embeddings
- **Search Functions**: `search_similar_chunks`, `search_hybrid_chunks`, `search_medical_tables`

### Key APIs
- `POST /api/upload` - Document processing with medical table extraction
- `POST /api/search` - Multi-mode search (semantic/keyword/hybrid/medical_tables)
- `GET /api/vector-stats` - Database analytics
- `POST /api/realtime` - Server-sent events for progress tracking

## Development Workflow

### Before Every Feature Implementation
1. Review existing tests to understand patterns
2. Plan test cases for new functionality
3. Consider edge cases and error scenarios

### During Implementation
1. Write tests alongside code (TDD approach preferred)
2. Run tests frequently: `npm run test:watch`
3. Ensure performance benchmarks are met

### After Implementation  
1. **MANDATORY**: Run full test suite: `npm test`
2. Verify coverage targets are maintained
3. Update documentation if needed
4. Only commit when all tests pass

### Pre-Commit Checklist
- [ ] All tests pass (`npm test`)
- [ ] Code linting passes (`npm run lint`)
- [ ] Coverage targets maintained (`npm run test:coverage`)
- [ ] Performance benchmarks met
- [ ] Documentation updated if needed

## Testing Infrastructure

### Test Structure
```
__tests__/
├── unit/                   # Component/function tests
├── integration/            # API endpoint tests  
├── e2e/                   # Complete workflow tests
├── fixtures/              # Test data files
└── utils/                 # Testing utilities
```

### Key Testing Utilities
- **TestDatabase**: Isolated test database management
- **TestFiles**: Fixture and temporary file handling
- **MockOpenAI**: API response mocking
- **PerformanceHelper**: Execution time assertions
- **TestAssertions**: Custom validation helpers

### Mock Strategy
- **Database Operations**: `jest.mock('../../lib/database')`
- **OpenAI Embeddings**: `jest.mock('../../lib/embeddings')`
- **Real-time Processing**: `jest.mock('../../lib/realtime')`
- **File System**: Temporary files with automatic cleanup

## Error Handling Requirements

### Must Test These Scenarios
1. **Network Failures**: OpenAI API timeouts and errors
2. **Database Errors**: Connection failures and query errors  
3. **File Processing**: Invalid formats and corrupted files
4. **Input Validation**: Malformed requests and missing parameters
5. **Concurrent Operations**: Race conditions and resource conflicts

### Graceful Degradation
- **Embedding Failures**: Fall back to keyword search when possible
- **Database Issues**: Return appropriate error messages
- **Processing Errors**: Mark documents as failed with reason
- **API Limits**: Handle rate limiting and quota exceeded

## Medical Document Specific Testing

### Required Test Cases
- **Medical Table Detection**: Various table formats (pipe, space, tab separated)
- **Entity Recognition**: Lab results, vital signs, medications
- **Confidence Scoring**: Table quality and recognition accuracy
- **Search Integration**: Medical terminology and concept matching

### Test Data Requirements
- Medical documents with various table structures
- Lab results, vital signs, medication tables
- Mixed medical and non-medical content
- Edge cases: empty tables, malformed data, non-English content

## Performance and Scalability

### Load Testing Requirements
- **Concurrent Uploads**: 5+ simultaneous file uploads
- **Search Load**: 10+ concurrent search requests
- **Large Documents**: Files up to configuration limits (default 25MB)
- **Memory Usage**: Monitor for memory leaks during long operations

### Monitoring Metrics
- **Response Times**: Track for all API endpoints
- **Database Performance**: Query execution times
- **Embedding Generation**: OpenAI API call latency
- **Memory Usage**: Heap usage during document processing

## Security Testing

### Required Security Tests
- **Input Validation**: File type and size restrictions
- **SQL Injection**: Parameterized query verification
- **Authentication**: User isolation and access controls
- **File Upload**: Malicious file detection and sandboxing

### Data Protection
- **Test Data**: Never use real medical information
- **Temporary Files**: Automatic cleanup after tests
- **Environment Variables**: Separate test configurations
- **Database Isolation**: Test database separate from development

## Maintenance and Updates

### Regular Tasks
1. **Weekly**: Review test coverage and fix any gaps
2. **Monthly**: Update test data and fixtures  
3. **Quarterly**: Performance benchmark review
4. **Per Release**: Full regression testing

### Dependency Management
- Keep testing libraries updated
- Monitor for security vulnerabilities in test dependencies
- Update mock responses when external APIs change
- Maintain compatibility with Next.js and React updates

## Emergency Procedures

### When Tests Fail in Production
1. **Immediate**: Revert to last known good state
2. **Investigate**: Check logs and error patterns
3. **Fix**: Address root cause with new tests
4. **Deploy**: Only after all tests pass
5. **Monitor**: Watch for related issues

### Performance Degradation
1. **Profile**: Use performance testing tools
2. **Identify**: Bottlenecks in database, embeddings, or processing
3. **Optimize**: Target specific performance issues
4. **Verify**: Confirm improvements with benchmarks
5. **Document**: Update performance expectations

---

**Remember: Testing is not optional. It's a critical part of maintaining a reliable RAG system with medical document intelligence capabilities. Always test thoroughly before deploying changes.**