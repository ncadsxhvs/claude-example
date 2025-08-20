# RAG Document Service - Production Deployment

## 🚀 Vercel Deployment Guide

### Prerequisites

1. **Database Setup** (Required for production)
   - Set up a PostgreSQL database with pgvector extension
   - Recommended providers:
     - **Supabase** (includes pgvector, easy setup)
     - **Neon** (PostgreSQL with extensions)
     - **Railway** (PostgreSQL hosting)

2. **Environment Variables**
   - OpenAI API key
   - Database connection details
   - Firebase configuration (if using auth)

### Quick Deploy to Vercel

#### Option 1: Deploy Button
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/your-repo)

#### Option 2: Manual Deployment

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy from this directory**
   ```bash
   vercel
   ```

3. **Configure Environment Variables in Vercel Dashboard**
   - Go to your project settings
   - Add these environment variables:

   ```
   OPENAI_API_KEY=your_openai_key
   OPENAI_EMBEDDING_MODEL=text-embedding-3-small
   OPENAI_CHAT_MODEL=gpt-4
   OPENAI_EMBEDDING_DIMENSIONS=1536
   
   DB_HOST=your_database_host
   DB_PORT=5432
   DB_NAME=rag_system
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   
   # Optional Firebase auth
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   ```

### Database Setup Options

#### Option A: Supabase (Recommended)

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to SQL Editor and run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Run the database setup from `/database/create_medical_tables.sql`
5. Use connection details in environment variables

#### Option B: Neon Database

1. Create account at [neon.tech](https://neon.tech)
2. Create PostgreSQL database
3. Enable pgvector extension
4. Run database setup scripts
5. Use connection string in environment variables

### Environment Configuration

1. **Copy environment template**
   ```bash
   cp .env.example .env.local
   ```

2. **Fill in your actual values**
   - Replace all placeholder values with real credentials
   - Never commit .env.local to git

### Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev
```

### Production Checklist

- [ ] Database with pgvector extension set up
- [ ] All environment variables configured in Vercel
- [ ] OpenAI API key with sufficient credits
- [ ] Database tables created (run SQL scripts)
- [ ] Test endpoints after deployment

### API Endpoints

Once deployed, your service will have these endpoints:

```
POST /api/upload              # Upload documents
POST /api/search              # Search documents  
POST /api/chat                # AI chat with RAG
GET  /api/health              # Health check
GET  /api/vector-stats        # Database analytics
```

### Troubleshooting

**Database Connection Issues:**
- Ensure pgvector extension is installed
- Check database URL format
- Verify firewall/IP restrictions

**OpenAI API Errors:**
- Check API key validity
- Verify billing/credits
- Monitor rate limits

**Deployment Failures:**
- Check build logs in Vercel dashboard
- Ensure all environment variables are set
- Verify TypeScript compilation

### Performance Notes

- Function timeout set to 5 minutes for large document processing
- File upload limit: 25MB
- Supports concurrent processing
- Optimized for medical document intelligence

### Security

- API keys stored as Vercel environment variables
- Input validation on all endpoints
- SQL injection protection via parameterized queries
- File type validation for uploads

### Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs in Vercel dashboard
3. Test locally first to isolate issues

---

**Built with Next.js 14, OpenAI embeddings, PostgreSQL + pgvector**