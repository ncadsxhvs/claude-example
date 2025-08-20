# RAG System Comprehensive Documentation

## 🔴 MANDATORY: Development Workflow Rule #1

**ALWAYS walk through your plan of implementation and ask for user permission before proceeding with any changes.**

This includes:
- Explaining the approach before coding
- Outlining what files will be modified
- Describing the expected outcome
- Waiting for explicit approval before implementation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [System Architecture](#system-architecture) 
3. [Development Phases](#development-phases)
4. [Search Modes](#search-modes)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [PDF Table Processing Recommendations](#pdf-table-processing-recommendations)
8. [Testing & Validation](#testing--validation)
9. [Environment Setup](#environment-setup)
10. [Performance Characteristics](#performance-characteristics)
11. [Production Checklist](#production-checklist)
12. [Critical Testing Requirements](#critical-testing-requirements)
13. [Documentation Policy](#documentation-policy)

## Architecture Overview
- **Frontend**: Next.js 14-15 with React components
- **Database**: PostgreSQL + pgvector for vector similarity search
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Search**: HNSW indexes with multi-mode search strategies
- **Medical Intelligence**: PDF table extraction and medical entity recognition

## System Architecture

### Current Setup
- **Main App**: Next.js app (port 8001) - Profile/Chat interface
- **RAG Service**: Next.js API with Vector Dashboard (port 8003) - Document processing
- **Database**: PostgreSQL with pgvector extension + full-text search
- **Real-time**: WebSocket/SSE for processing updates
- **Auth**: Firebase Auth integration

### Data Flow
```
Upload → Real-time Updates → Text/PDF Extraction → Medical Table Detection → Chunking → 
OpenAI Embeddings → PostgreSQL/pgvector → Query → Multi-Mode Search → Re-ranking → Response
```

## Development Phases

### ✅ Phase 1: Foundation (Completed)
- RecursiveCharacterTextSplitter chunking
- Basic document upload/processing
- Firebase authentication
- PostgreSQL 16 with pgvector extension setup
- Vector similarity search with cosine distance
- Centralized configuration management

### ✅ Phase 2: Enhanced Processing (Completed)
- **File Support**: `.txt`, `.md`, `.markdown`, `.pdf`, `.json` (up to 25MB)
- **PDF Processing**: Advanced table detection and medical table extraction
- **JSON Processing**: Table extraction from array of objects and columnar data
- **Medical Intelligence**: Classification, entity recognition, and table analysis
- **Text Chunking**: Medical-aware separators and intelligent splitting
- **Vector Embeddings**: OpenAI text-embedding-3-small (1536D)
- **Real-time Updates**: SSE-based progress tracking with status indicators
- **Quality Assurance**: Duplicate detection, validation, and error handling

### ✅ Phase 3: Advanced Search (Completed)
- **4 Search Modes**: Semantic, Keyword, Hybrid, Medical Tables
- Adaptive weighting with intelligent fallback
- Configurable similarity thresholds (0.1-1.0)
- Debug information and performance metrics
- Medical query auto-detection

### ✅ Phase 4: Medical Intelligence (Completed)
- PDF table extraction pipeline
- Medical table classification (lab_results, vital_signs, medication)
- Cell-level medical annotations
- Table-aware search with visualization
- Medical entity linking and reference ranges

### ✅ Phase 5: Fine-tuning Interface (Completed)
- Search mode comparison interface
- Threshold adjustment controls
- Real-time debug information
- Performance monitoring and optimization

### ✅ Phase 6: AI Chat Integration (Completed)
- **OpenAI Integration**: GPT-4o with fallback to GPT-4 and GPT-3.5-turbo
- **RAG-Enhanced Responses**: Uses retrieved document chunks as context
- **Source Citations**: Includes document names and page numbers in responses
- **Multi-Mode Search**: Supports all existing search modes (semantic, keyword, hybrid, medical_tables)
- **Error Handling**: Graceful fallbacks and retry logic for API failures

### 📋 Phase 7: Advanced PDF Table Processing (Backlog)
- **Enhanced PDF Table Extraction**: Tabula-py integration for medical documents
- **Requirements**: Python + Java runtime for tabula-java dependency
- **Benefits**: 90%+ accuracy on medical tables vs current text-based detection
- **Implementation**: Python subprocess integration with Node.js fallback

## Search Modes

### 1. Semantic Search
- **Technology**: OpenAI embeddings + cosine similarity
- **Use Case**: Conceptual queries, context understanding
- **Threshold**: 0.1-1.0 configurable similarity scores

### 2. Keyword Search
- **Technology**: PostgreSQL ILIKE with keyword extraction
- **Use Case**: Exact term matching, medical terminology
- **Performance**: Fast exact matches for known terms

### 3. Hybrid Search
- **Technology**: Adaptive weighting (semantic + keyword)
- **Logic**: High semantic quality = 80% semantic, 20% keyword
- **Logic**: Low semantic quality = 40% semantic, 60% keyword
- **Use Case**: Production-ready with graceful degradation

### 4. Medical Table Search
- **Technology**: Structured table search with medical entities
- **Use Case**: Lab results, vital signs, medication data
- **Features**: Cell-level annotations and medical concept mapping

### 5. AI Chat Mode (NEW)
- **Technology**: RAG + OpenAI GPT-4o for intelligent question answering
- **Use Case**: Natural language questions with comprehensive answers
- **Features**: Source citations, page numbers, context-aware responses
- **Models**: GPT-4o (primary) → GPT-4 → GPT-3.5-turbo (fallback)

## Database Schema

### Core Tables
- `documents`: File metadata (UUID, status, chunks_count, medical_tables_count)
- `chunks`: Text chunks with vector embeddings (1536 dimensions)

### Medical Intelligence
- `medical_tables`: Extracted tables with embeddings and classification
- `medical_table_cells`: Individual cell annotations with medical concepts

### Functions
- `search_similar_chunks`: Semantic similarity search
- `search_hybrid_chunks`: Combined semantic + keyword
- `search_medical_tables`: Medical table-specific search

## API Endpoints

### Main App (Port 8001)
```bash
POST /api/documents/upload    # Upload documents
POST /api/chat-rag           # RAG-enhanced chat
POST /api/chat               # Regular chat
GET  /api/health             # Health check
```

### RAG Service (Port 8003)
```bash
# Document Processing
POST /api/upload             # Process documents with real-time updates
GET  /api/documents          # List user documents
GET  /api/documents/[id]/chunks  # Get document chunks

# Search
POST /api/search             # Multi-mode search
POST /api/search/medical-tables  # Medical table search

# AI Chat (NEW)
POST /api/chat               # RAG-enhanced question answering with OpenAI

# Analytics
GET  /api/vector-stats       # Vector database analytics
POST /api/realtime           # Server-Sent Events
```

## PDF Table Processing Recommendations

### 🥇 **Recommended: Tabula-py + Python Integration**
- **What it is**: Industry-standard PDF table extraction tool
- **Strengths**: Excellent accuracy, handles complex layouts, preserves table structure
- **Requirements**: Python + Java runtime (tabula-java dependency)
- **Integration**: Can be called from Node.js via child process
- **Cost**: Free, open source

### 🥈 **Alternative 1: pdf-table-extractor**
- **What it is**: Node.js native table extraction library
- **Strengths**: Pure JavaScript, no external dependencies
- **Limitations**: Less accurate than Tabula for complex tables
- **Integration**: Direct npm install
- **Cost**: Free

### 🥉 **Alternative 2: pdfplumber (Python)**
- **What it is**: Advanced PDF processing library with excellent table detection
- **Strengths**: High accuracy, good for medical forms/reports
- **Requirements**: Python integration
- **Integration**: Via Python subprocess calls
- **Cost**: Free

### 💰 **Premium Option: Adobe PDF Extract API**
- **What it is**: Adobe's commercial PDF parsing service
- **Strengths**: Industry-leading accuracy, handles scanned PDFs
- **Features**: OCR, table structure recognition, confidence scores
- **Cost**: ~$0.05 per page
- **Integration**: REST API

### ☁️ **Cloud Option: AWS Textract**
- **What it is**: AWS's document analysis service
- **Strengths**: Excellent for forms and tables, OCR capabilities
- **Features**: Key-value pairs, table extraction, confidence scores
- **Cost**: ~$0.015 per page
- **Integration**: AWS SDK

### 🔧 **Current System Status**
Current system has:
- **PDF Tables**: Basic table detection using text patterns (pipes, tabs, spacing), but limited for complex medical tables
- **JSON Tables**: Full support for array-of-objects and columnar data formats with high accuracy

### 📋 **Recommendation for Medical Documents**
For medical document use case, recommend **Tabula-py** because:
1. **Medical Table Accuracy**: Excellent at preserving lab results, vital signs layouts
2. **Cost Effective**: Free vs. cloud services
3. **Privacy**: Processes locally (important for medical data)
4. **Integration**: Can enhance existing system without major changes

## Testing Examples

### Upload Documents
```bash
# Text document
curl -X POST http://localhost:8003/api/upload \
  -F "file=@document.txt" -F "userId=demo-user"

# Markdown file
curl -X POST http://localhost:8003/api/upload \
  -F "file=@research.md" -F "userId=demo-user"

# Medical PDF with table extraction
curl -X POST http://localhost:8003/api/upload \
  -F "file=@medical_report.pdf" -F "userId=demo-user"

# Large PDF (up to 25MB)
curl -X POST http://localhost:8003/api/upload \
  -F "file=@large_medical_study.pdf" -F "userId=demo-user"

# JSON with table data
curl -X POST http://localhost:8003/api/upload \
  -F "file=@table_data.json" -F "userId=demo-user"
```

### Search Testing
```bash
# Keyword search (exact matching)
curl -X POST http://localhost:8003/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"diabetes","searchMode":"keyword","maxResults":10}'

# Semantic search (AI embeddings)
curl -X POST http://localhost:8003/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"diabetes symptoms","searchMode":"semantic","similarityThreshold":0.3}'

# Hybrid search (production mode)
curl -X POST http://localhost:8003/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"blood sugar levels","searchMode":"hybrid"}'

# Medical table search
curl -X POST http://localhost:8003/api/search/medical-tables \
  -H "Content-Type: application/json" \
  -d '{"query":"glucose levels","tableType":"lab_results"}'

# AI Chat with RAG (NEW)
curl -X POST http://localhost:8003/api/chat \
  -H "Content-Type: application/json" \
  -d '{"question":"What is diabetes and what are its symptoms?","searchMode":"hybrid"}'
```

### Threshold Testing
```bash
# Test different thresholds
for threshold in 0.1 0.3 0.5 0.7 0.9; do
  curl -X POST http://localhost:8003/api/search \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"diabetes\",\"searchMode\":\"semantic\",\"similarityThreshold\":$threshold}" \
    | jq ".resultsCount"
done
```

## Environment Setup

### Required Variables
```bash
# .env.local
OPENAI_API_KEY=your_openai_key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rag_system
DB_USER=ddctu
DB_PASSWORD=your_password
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_config
```

### Quick Start
```bash
# Main app
cd dong_chen_profile
npm install && npm run dev  # http://localhost:8001

# RAG service
cd RAG/nextjs-document-service
npm install && npm run dev  # http://localhost:8003
```

## Testing & Validation

### ✅ Minimalist Testing Setup
- **Jest Framework**: Simple, focused tests without complex mocking
- **Core Validation**: File types, search parameters, embedding formats
- **Performance Checks**: Basic timing and threshold validation  
- **Medical Intelligence**: Keyword detection and table structure validation

### 🧪 Testing Commands
```bash
# Run main tests (recommended)
npm test                    # Simple validation tests

# Specific test suites
npm run test:simple         # Core functionality validation
npm run test:embeddings     # Embedding format and similarity tests
npm run test:all           # All available tests
npm run test:watch         # Watch mode for development
npm run test:coverage      # Test coverage report

# Database validation
npm run validate:embeddings # Real database embedding check

# Database cleanup
npm run cleanup:database    # Remove all uploaded files and data
```

### 🔍 Test Coverage Areas
- **File Validation**: Supported types, size limits, userId format
- **Search Validation**: Modes, parameters, similarity thresholds
- **Text Processing**: Chunking, word counting, basic NLP
- **Vector Operations**: Cosine similarity, embedding dimensions
- **JSON Processing**: Table detection, format validation
- **Chat API Validation**: Request parameters, response format, source citations
- **Medical Detection**: Medical keywords, table structure detection
- **Error Handling**: JSON parsing, required field validation, API failures
- **Performance**: Execution timing, threshold compliance

### 📊 Current Database Status
- **Total Chunks**: 76 (diabetes.md document)
- **Embedding Completion**: 100% ✅
- **Vector Consistency**: All 1536D vectors (text-embedding-3-small)
- **No Orphaned Data**: Database integrity verified

### 🎯 Validation Strategy
- **Simple Tests**: Fast validation without external dependencies
- **Database Validation**: Real-time embedding integrity checks
- **Performance Monitoring**: Basic timing and resource usage
- **Medical Intelligence**: Content type detection and structure validation

## Performance Characteristics
- **Document Processing**: ~1-2 seconds per document
- **Embedding Cost**: ~$0.0001 per 1K tokens
- **Search Speed**: <100ms semantic, <50ms keyword
- **Medical Tables**: +500ms for PDF table extraction
- **Storage**: ~1KB per chunk, ~5KB per medical table

## Production Checklist
- ✅ PostgreSQL + pgvector setup
- ✅ OpenAI API integration
- ✅ Error handling and logging
- ✅ Real-time progress tracking
- ✅ Multi-mode search implementation
- ✅ Medical table extraction pipeline
- ✅ PDF processing with medical table detection
- ✅ JSON processing with table extraction
- ✅ AI chat with RAG integration and citations
- ✅ Comprehensive testing infrastructure
- ✅ Embedding validation system
- ✅ API documentation and testing examples

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

### Current System Architecture

#### Core Features
1. **PDF Processing with Medical Table Extraction**
   - Location: `lib/pdf-processor.ts`
   - Tests: `__tests__/unit/pdf-processor.test.ts`
   - Capabilities: Text extraction, medical table detection, confidence scoring

2. **JSON Processing with Table Extraction**
   - Location: `lib/json-processor.ts`
   - Tests: `__tests__/simple.test.ts` (JSON Processing section)
   - Capabilities: Array-of-objects, columnar data, nested structure detection

3. **Medical Table Processing and Classification**
   - Location: `lib/medical-table-processor.ts` 
   - Tests: `__tests__/unit/medical-table-processor.test.ts`
   - Capabilities: Medical entity extraction, table classification, vector storage

4. **Multi-Mode Search System**
   - Location: `app/api/search/route.ts`
   - Tests: `__tests__/unit/search-functionality.test.ts`, `__tests__/integration/search-api.test.ts`
   - Modes: Semantic, Keyword, Hybrid, Medical Tables

5. **Document Upload and Processing**
   - Location: `app/api/upload/route.ts`
   - Tests: `__tests__/integration/upload-api.test.ts`
   - Features: Real-time progress, duplicate detection, medical processing

6. **AI Chat with RAG Integration (NEW)**
   - Location: `app/api/chat/route.ts`, `lib/openai-chat.ts`
   - Tests: `__tests__/simple.test.ts` (Chat API Validation section)
   - Features: OpenAI GPT-4o integration, source citations, page numbers

#### Validation Tools
- `npm run validate:embeddings` - Check embedding integrity in database
- `__tests__/integration/embedding-validation.test.ts` - Comprehensive embedding tests
- `scripts/validate-embeddings.js` - Standalone validation utility

### Development Workflow

#### Before Every Feature Implementation
1. Review existing tests to understand patterns
2. Plan test cases for new functionality
3. Consider edge cases and error scenarios

#### During Implementation
1. Write tests alongside code (TDD approach preferred)
2. Run tests frequently: `npm run test:watch`
3. Ensure performance benchmarks are met

#### After Implementation  
1. **MANDATORY**: Run full test suite: `npm test`
2. Verify coverage targets are maintained
3. Update documentation if needed
4. Only commit when all tests pass

#### Pre-Commit Checklist
- [ ] All tests pass (`npm test`)
- [ ] Code linting passes (`npm run lint`)
- [ ] Coverage targets maintained (`npm run test:coverage`)
- [ ] Performance benchmarks met
- [ ] Documentation updated if needed

### Testing Infrastructure

#### Test Structure
```
__tests__/
├── unit/                   # Component/function tests
├── integration/            # API endpoint tests  
├── e2e/                   # Complete workflow tests
├── fixtures/              # Test data files
└── utils/                 # Testing utilities
```

#### Key Testing Utilities
- **TestDatabase**: Isolated test database management
- **TestFiles**: Fixture and temporary file handling
- **MockOpenAI**: API response mocking
- **PerformanceHelper**: Execution time assertions
- **TestAssertions**: Custom validation helpers

#### Mock Strategy
- **Database Operations**: `jest.mock('../../lib/database')`
- **OpenAI Embeddings**: `jest.mock('../../lib/embeddings')`
- **Real-time Processing**: `jest.mock('../../lib/realtime')`
- **File System**: Temporary files with automatic cleanup

### Error Handling Requirements

#### Must Test These Scenarios
1. **Network Failures**: OpenAI API timeouts and errors
2. **Database Errors**: Connection failures and query errors  
3. **File Processing**: Invalid formats and corrupted files
4. **Input Validation**: Malformed requests and missing parameters
5. **Concurrent Operations**: Race conditions and resource conflicts

#### Graceful Degradation
- **Embedding Failures**: Fall back to keyword search when possible
- **Database Issues**: Return appropriate error messages
- **Processing Errors**: Mark documents as failed with reason
- **API Limits**: Handle rate limiting and quota exceeded

### Medical Document Specific Testing

#### Required Test Cases
- **Medical Table Detection**: Various table formats (pipe, space, tab separated)
- **Entity Recognition**: Lab results, vital signs, medications
- **Confidence Scoring**: Table quality and recognition accuracy
- **Search Integration**: Medical terminology and concept matching

#### Test Data Requirements
- Medical documents with various table structures
- Lab results, vital signs, medication tables
- Mixed medical and non-medical content
- Edge cases: empty tables, malformed data, non-English content

### Performance and Scalability

#### Load Testing Requirements
- **Concurrent Uploads**: 5+ simultaneous file uploads
- **Search Load**: 10+ concurrent search requests
- **Large Documents**: Files up to configuration limits (default 25MB)
- **Memory Usage**: Monitor for memory leaks during long operations

#### Monitoring Metrics
- **Response Times**: Track for all API endpoints
- **Database Performance**: Query execution times
- **Embedding Generation**: OpenAI API call latency
- **Memory Usage**: Heap usage during document processing

### Security Testing

#### Required Security Tests
- **Input Validation**: File type and size restrictions
- **SQL Injection**: Parameterized query verification
- **Authentication**: User isolation and access controls
- **File Upload**: Malicious file detection and sandboxing

#### Data Protection
- **Test Data**: Never use real medical information
- **Temporary Files**: Automatic cleanup after tests
- **Environment Variables**: Separate test configurations
- **Database Isolation**: Test database separate from development

### Maintenance and Updates

#### Regular Tasks
1. **Weekly**: Review test coverage and fix any gaps
2. **Monthly**: Update test data and fixtures  
3. **Quarterly**: Performance benchmark review
4. **Per Release**: Full regression testing

#### Dependency Management
- Keep testing libraries updated
- Monitor for security vulnerabilities in test dependencies
- Update mock responses when external APIs change
- Maintain compatibility with Next.js and React updates

### Emergency Procedures

#### When Tests Fail in Production
1. **Immediate**: Revert to last known good state
2. **Investigate**: Check logs and error patterns
3. **Fix**: Address root cause with new tests
4. **Deploy**: Only after all tests pass
5. **Monitor**: Watch for related issues

#### Performance Degradation
1. **Profile**: Use performance testing tools
2. **Identify**: Bottlenecks in database, embeddings, or processing
3. **Optimize**: Target specific performance issues
4. **Verify**: Confirm improvements with benchmarks
5. **Document**: Update performance expectations

## Documentation Policy

**ALL future documentation updates should be made to this RAG_plan.md file only**. This includes:
- New feature documentation
- API changes and examples
- Testing procedures
- System architecture updates
- Performance metrics
- Troubleshooting guides

The system is now a comprehensive medical document intelligence platform with robust testing and validation capabilities, ready for production use! 🏥🔍📊🧪

---

**Remember: Testing is not optional. It's a critical part of maintaining a reliable RAG system with medical document intelligence capabilities. Always test thoroughly before deploying changes.**