# Dong Chen - Professional Portfolio & RAG System

A professional development workspace containing multiple projects for Dong Chen, Senior Product Manager & Data Engineering Manager.

## 📁 Repository Structure

### `dong_chen_profile/` - Professional Landing Page
A modern, minimalist professional portfolio built with Next.js, TypeScript, and Tailwind CSS. Clean and focused on the core functionality.

**Features:**
- 🎨 Minimalist Design with elegant typography
- 🤖 AI Chat with Dong Chen persona powered by OpenAI GPT-4
- 💬 Community Comments with real-time updates
- 🔐 Firebase Authentication (Google sign-in)
- 📱 Responsive design with Tailwind CSS
- 🚀 Next.js 15 with App Router and TypeScript

**Quick Start:**
```bash
cd dong_chen_profile
npm install
cp .env.local.example .env.local
# Add your API keys to .env.local
npm run dev  # http://localhost:8001
```

### `RAG/` - Document Processing & Vector Search System
Advanced RAG (Retrieval-Augmented Generation) system with hybrid search capabilities, real-time processing, and vector database analytics.

**Features:**
- 🔍 Hybrid Search (Semantic + Keyword matching)
- 🎯 Multi-factor Re-ranking for improved relevance
- ⚡ Real-time Processing with WebSocket/SSE updates
- 📊 Vector Database Analytics Dashboard
- 🧠 OpenAI Embeddings with PostgreSQL + pgvector
- 📂 Duplicate Detection with SHA256 content hashing
- 🔄 Phase 3 Implementation Complete

**Quick Start:**
```bash
cd RAG/nextjs-document-service
npm install
# Configure database and environment
npm run dev  # http://localhost:8003
```

### `data/` - Test Files & Documents
Sample documents and test files for RAG system development and testing.

## 🚀 Technology Stack

**Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS  
**Database:** PostgreSQL 16 + pgvector extension, Cloud Firestore  
**AI/ML:** OpenAI GPT-4 + text-embedding-3-small, Hybrid search, Re-ranking  
**Auth:** Firebase Auth  
**Real-time:** Server-Sent Events (SSE)  
**Deployment:** Vercel

## 🔧 Quick Setup

**Automated Setup (Recommended):**
```bash
./setup-all.sh env && ./setup-all.sh install && ./setup-all.sh dev
```

Or individually:
- `./setup-all.sh env` - Setup environment files
- `./setup-all.sh install` - Install dependencies
- `./setup-all.sh dev` - Start both development servers

**Manual Setup:**
1. **Environment Configuration:**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your API keys
   ```

2. **Install Dependencies:**
   ```bash
   cd dong_chen_profile && npm install && cd ..
   cd RAG/nextjs-document-service && npm install && cd ../..
   ```

3. **Database Setup (Optional):**
   ```bash
   cd RAG/database && ./setup.sh
   ```

## 🔧 Development Workflow

**Start Both Projects:**
```bash
# Terminal 1: Landing Page
cd dong_chen_profile && npm run dev  # http://localhost:8001

# Terminal 2: RAG System  
cd RAG/nextjs-document-service && npm run dev  # http://localhost:8003
```

## ⚙️ Configuration Management

**Centralized Configuration:**
- Master `.env.local.example` file in repository root
- Each service has its own `.env.local` file (copied from template)
- Separation of concerns: dong_chen_profile only includes what it needs
- RAG service has full configuration for document processing

**Environment Variables:**
```env
# OpenAI (Required)
OPENAI_API_KEY=your_key_here

# Firebase (Required)  
NEXT_PUBLIC_FIREBASE_API_KEY=your_key_here
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id

# PostgreSQL (RAG System)
DB_HOST=localhost
DB_NAME=rag_system
DB_USER=postgres
DB_PASSWORD=your_db_password

# RAG Settings (Optional - has defaults)
RAG_CHUNK_SIZE=1000
RAG_SIMILARITY_THRESHOLD=0.7
```

## 📈 Project Status

- ✅ **dong_chen_profile**: Clean, minimalist landing page with AI chat (no RAG dependencies)
- ✅ **RAG Phase 3**: Hybrid search, re-ranking, and real-time processing complete
- ✅ **Configuration**: Centralized config management with service separation
- 📋 **RAG Phase 4**: Document intelligence and PDF extraction (next)

## 🎯 Current Focus

Phase 3 RAG System features successfully implemented:
- Hybrid semantic + keyword search
- Multi-factor relevance re-ranking
- Real-time document processing with live updates
- Enhanced user experience with processing notifications