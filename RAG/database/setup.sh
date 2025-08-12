#!/bin/bash

# PostgreSQL + pgvector Setup Script for RAG System
set -e

echo "🚀 Setting up PostgreSQL + pgvector for RAG System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configuration
DB_NAME="rag_system"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Check if PostgreSQL is running
echo -e "${BLUE}📋 Checking PostgreSQL status...${NC}"
if ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; then
    echo -e "${RED}❌ PostgreSQL is not running on ${DB_HOST}:${DB_PORT}${NC}"
    echo -e "${YELLOW}💡 Start PostgreSQL with: brew services start postgresql@16${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL is running${NC}"

# Check if pgvector extension is available
echo -e "${BLUE}📋 Checking pgvector availability...${NC}"
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE EXTENSION IF NOT EXISTS vector;" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ pgvector extension is available${NC}"
else
    echo -e "${RED}❌ pgvector extension not available${NC}"
    echo -e "${YELLOW}💡 Install pgvector with: brew install pgvector${NC}"
    exit 1
fi

# Create database if it doesn't exist
echo -e "${BLUE}📋 Creating database: ${DB_NAME}${NC}"
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${YELLOW}⚠️  Database $DB_NAME already exists${NC}"
    read -p "Do you want to recreate it? This will delete all data. (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}🗑️  Dropping existing database...${NC}"
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
        echo -e "${GREEN}✅ Database recreated${NC}"
    else
        echo -e "${BLUE}📋 Using existing database${NC}"
    fi
else
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"
    echo -e "${GREEN}✅ Database created: $DB_NAME${NC}"
fi

# Apply schema
echo -e "${BLUE}📋 Applying database schema...${NC}"
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f schema.sql; then
    echo -e "${GREEN}✅ Schema applied successfully${NC}"
else
    echo -e "${RED}❌ Failed to apply schema${NC}"
    exit 1
fi

# Verify setup
echo -e "${BLUE}📋 Verifying setup...${NC}"

# Check tables
TABLES=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo -e "${GREEN}✅ Tables created: $TABLES${NC}"

# Check pgvector extension
VECTOR_ENABLED=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector';")
if [ "$VECTOR_ENABLED" -eq "1" ]; then
    echo -e "${GREEN}✅ pgvector extension enabled${NC}"
else
    echo -e "${RED}❌ pgvector extension not enabled${NC}"
    exit 1
fi

# Check vector index
VECTOR_INDEX=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'idx_chunks_embedding';")
if [ "$VECTOR_INDEX" -eq "1" ]; then
    echo -e "${GREEN}✅ Vector similarity index created${NC}"
else
    echo -e "${RED}❌ Vector similarity index not found${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 PostgreSQL + pgvector setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📋 Connection details:${NC}"
echo -e "   🌐 Host: $DB_HOST"
echo -e "   🔌 Port: $DB_PORT"
echo -e "   📊 Database: $DB_NAME"
echo -e "   👤 User: $DB_USER"
echo ""
echo -e "${BLUE}📋 Connection string:${NC}"
echo -e "   postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo ""
echo -e "${YELLOW}💡 Next steps:${NC}"
echo -e "   1. Add database connection to your .env.local file"
echo -e "   2. Install pg client: npm install pg @types/pg"
echo -e "   3. Test connection with your application"
echo ""