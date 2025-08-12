# Dong Chen - Next.js Landing Page

A modern, minimalist professional portfolio for Dong Chen, Senior Product Manager & Data Engineering Manager, built with Next.js, TypeScript, and Tailwind CSS. Features AI chat integration and community discussion system.

## Features

- **🎨 Minimalist Design**: Clean, document-style layout with elegant typography
- **🤖 AI Chat**: Protected chat interface with Dong Chen persona powered by OpenAI GPT-4
- **📄 RAG System**: Document upload and AI chat with personalized knowledge base (planned)
- **💬 Community Comments**: Real-time commenting system with likes functionality
- **🔐 Authentication**: Google sign-in integration via Firebase Auth
- **⚡ Real-time Updates**: Live comment updates using Firestore
- **📱 Responsive Design**: Mobile-optimized interface with Tailwind CSS
- **🚀 Next.js 15**: Server-side rendering, API routes, and modern React features
- **📝 TypeScript**: Full type safety throughout the application

## Quick Start

1. Install dependencies: `npm install`
2. Copy environment variables: `cp .env.local.example .env.local`
3. Add your OpenAI API key to `.env.local`
4. Run development server: `npm run dev`
5. Open http://localhost:8001

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Frontend**: React 18, TypeScript, Tailwind CSS  
- **Authentication**: Firebase Auth (Google provider)
- **Database**: Cloud Firestore
- **AI**: OpenAI GPT-4 API
- **Deployment**: Vercel

## Environment Variables

Required:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

## Deployment

Deploy to Vercel with one click. Set the `OPENAI_API_KEY` environment variable in your Vercel dashboard.

## RAG System (Retrieval-Augmented Generation)

### Overview
Planned enhancement to transform the AI chat from a general assistant into a personalized knowledge base that can answer questions based on user-uploaded documents while maintaining Dong Chen's professional expertise.

### Architecture

#### 1. Document Processing Pipeline
- **Upload Interface**: Drag-and-drop component for PDFs, DOCX, TXT files
- **File Validation**: Size limits, format checking, content sanitization
- **Text Extraction**: Parse different file formats into clean text
- **Chunking Strategy**: Split documents into meaningful segments (paragraphs, sections)
- **Metadata Extraction**: Title, author, creation date, document type

#### 2. Vector Database & Embeddings
- **Embedding Generation**: Convert text chunks to vector embeddings using OpenAI's text-embedding-ada-002
- **Vector Storage**: Use Pinecone, Supabase Vector, or Firebase with vector extensions
- **Indexing**: Organize embeddings with metadata for efficient retrieval
- **User Isolation**: Each user's documents stored separately with user ID indexing

#### 3. Enhanced Chat Interface
- **Document Library**: Show uploaded documents with status (processing/ready)
- **Context Indicator**: Visual cue when AI is using uploaded documents
- **Source Citations**: Show which document/section the AI referenced
- **Document Management**: Delete, rename, view document details

### Implementation Phases

#### Phase 1: MVP (Core RAG)
1. Basic PDF upload and text extraction
2. Simple vector storage and retrieval
3. Enhanced chat with document context
4. Basic source citations

#### Phase 2: Enhanced Features
1. Multiple file format support (DOCX, TXT, MD)
2. Document management interface
3. Advanced search and filtering
4. Conversation memory with document context

#### Phase 3: Advanced Features
1. Document summarization and insights
2. Cross-document analysis
3. Export and sharing capabilities
4. Advanced analytics and usage tracking

### Technical Stack (Planned)

#### Backend Services
- **Document Processing API**: `/api/documents/upload`, `/api/documents/process`
- **Vector Search API**: `/api/search/similarity`
- **Enhanced Chat API**: Modified `/api/chat` with RAG integration
- **Document Management**: CRUD operations for user documents

#### Storage & Database
- **File Storage**: Firebase Storage or Vercel Blob for original documents
- **Vector Database**: Pinecone (managed) or Supabase (open source)
- **Metadata Storage**: Firebase Firestore for document metadata
- **User Sessions**: Track conversation context and document usage

### User Experience Flow

#### Document Upload Journey
1. User clicks "Upload Document" in chat interface
2. Drag-and-drop or file picker opens
3. File uploads with real-time progress
4. Processing status shows "Analyzing document..."
5. Success notification: "Document ready for questions!"

#### Enhanced Chat Experience
1. User asks question related to uploaded content
2. AI response includes relevant information from documents
3. Source citation shows: "Based on your document 'Annual Report 2024', page 15..."
4. User can click citation to view original document section

#### Document Management
1. Sidebar shows all uploaded documents
2. Each document shows: name, upload date, size, status
3. Options to rename, delete, or view document details
4. Search functionality to find specific documents

## License

MIT