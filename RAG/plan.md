# RAG System Plan

## Current Status
- ✅ **Phase 1**: Basic text chunking with RecursiveCharacterTextSplitter
- ✅ **Phase 2**: PostgreSQL + pgvector + OpenAI embeddings
- ✅ **File Support**: `.txt`, `.md` files
- ✅ **Storage**: PostgreSQL with pgvector extension
- ✅ **Search**: Semantic similarity with OpenAI embeddings
- ✅ **Configuration**: Centralized config management

## Next Steps

### Phase 3: Enhanced Features
- PDF text extraction and processing
- Hybrid search (semantic + keyword)
- Re-ranking based on relevance scores
- Real-time document processing

### Phase 4: Document Intelligence
- Table extraction and processing
- Medical/real estate entity recognition
- Multi-modal content handling
- Advanced document parsing

## Architecture

### Current (Phase 2)
- **Frontend**: Next.js app (port 8001)
- **RAG Service**: Next.js API with Vector Dashboard (port 8003)
- **Database**: PostgreSQL with pgvector extension
- **Chunking**: RecursiveCharacterTextSplitter
- **Embeddings**: OpenAI text-embedding-3-small
- **Search**: Vector similarity with cosine distance
- **Analytics**: Real-time vector database visualization
- **Config**: Centralized configuration management

## Supported Formats

### Current (Phase 2)
- `.txt` - Plain text with semantic search
- `.md` - Markdown with structure preservation

### Phase 3 (Next)
- `.pdf` - Full text extraction
- `.docx` - Word documents
- `.html` - Web content

### Phase 4 (Future)
- `.pptx`, `.xlsx` - Office formats
- OCR for scanned documents
- Multi-language support

## Data Flow

### Current (Phase 2)
```
Upload → Text Extraction → Chunking → OpenAI Embeddings → PostgreSQL/pgvector →
Query → Query Embedding → Vector Similarity Search → Context Assembly → OpenAI Chat → Response + Citations
```

## Tech Stack

### Current (Phase 2)
- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Next.js API routes, Node.js
- **Database**: PostgreSQL 16 with pgvector extension
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Chunking**: @langchain/textsplitters (RecursiveCharacterTextSplitter)
- **Auth**: Firebase Auth
- **Config**: Centralized TypeScript configuration

## API Endpoints

### Main App (Port 8001)
```
POST /api/documents/upload    # Upload documents
POST /api/chat-rag           # RAG-enhanced chat
POST /api/chat               # Regular chat
GET  /api/health             # Health check
```

### RAG Service (Port 8003)
```
POST /api/upload             # Process documents
GET  /api/vector-stats       # Vector database analytics
GET  /api/health             # Health check
```

## Quick Start

### Development
```bash
# Main app
cd dong_chen_profile
npm install && npm run dev  # http://localhost:8001

# RAG service with Vector Dashboard
cd RAG/nextjs-document-service
npm install && npm run dev  # http://localhost:8003
```

### Environment Variables
```bash
# .env.local (see .env.local.example for complete setup)
OPENAI_API_KEY=your_openai_key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rag_system
DB_USER=postgres
DB_PASSWORD=your_db_password
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_config
```

## Implementation Timeline

### ✅ Phase 1: Foundation (Completed)
- RecursiveCharacterTextSplitter chunking
- Basic document upload/processing
- LocalStorage-based RAG search
- Firebase authentication

### ✅ Phase 2: Vector Search (Completed)
- PostgreSQL 16 with pgvector extension setup
- OpenAI embeddings integration (text-embedding-3-small)
- Vector similarity search with cosine distance
- Centralized configuration management
- Database schema with proper indexing (HNSW)

### 📋 Phase 3: Enhanced Features (Next)
- PDF text extraction
- Hybrid search capabilities
- Real-time processing
- Advanced search features
- Performance optimization