#!/bin/bash

# =============================================================================
# Dong Chen Portfolio & RAG System Setup Script
# =============================================================================

set -e

echo "🚀 Setting up Dong Chen Portfolio & RAG System..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [[ ! -f "README.md" ]] || [[ ! -d "dong_chen_profile" ]] || [[ ! -d "RAG" ]]; then
    print_error "Please run this script from the repository root directory"
    exit 1
fi

# 1. Environment Configuration
print_status "Setting up environment configuration..."

if [[ ! -f ".env.local" ]]; then
    if [[ -f ".env.local.example" ]]; then
        print_warning "Creating .env.local from example file"
        cp .env.local.example .env.local
        print_warning "Please edit .env.local with your actual API keys and credentials"
    else
        print_error ".env.local.example not found"
        exit 1
    fi
else
    print_success "Environment configuration already exists"
fi

# 2. Install Dependencies for Landing Page
print_status "Installing dependencies for dong_chen_profile..."
cd dong_chen_profile

if [[ ! -d "node_modules" ]]; then
    npm install
    print_success "dong_chen_profile dependencies installed"
else
    print_success "dong_chen_profile dependencies already installed"
fi

cd ..

# 3. Install Dependencies for RAG System
print_status "Installing dependencies for RAG system..."
cd RAG/nextjs-document-service

if [[ ! -d "node_modules" ]]; then
    npm install
    print_success "RAG system dependencies installed"
else
    print_success "RAG system dependencies already installed"
fi

cd ../..

# 4. Database Setup (Optional)
print_status "Database setup (PostgreSQL + pgvector)..."
if command -v psql >/dev/null 2>&1; then
    print_success "PostgreSQL is installed"
    
    if command -v pg_config >/dev/null 2>&1; then
        print_warning "To use vector search, install pgvector:"
        echo "  brew install pgvector  # macOS"
        echo "  Then run: cd RAG/database && ./setup.sh"
    else
        print_warning "PostgreSQL development headers not found"
    fi
else
    print_warning "PostgreSQL not found. Install with:"
    echo "  brew install postgresql pgvector  # macOS"
fi

# 5. Verify Configuration
print_status "Verifying setup..."

# Check if symlinks exist
if [[ -L "dong_chen_profile/.env.local.example" ]] && [[ -L "RAG/nextjs-document-service/.env.local.example" ]]; then
    print_success "Environment file symlinks are properly configured"
else
    print_warning "Creating environment file symlinks..."
    cd dong_chen_profile && ln -sf ../.env.local.example .env.local.example && cd ..
    cd RAG/nextjs-document-service && ln -sf ../../.env.local.example .env.local.example && cd ../..
    print_success "Environment file symlinks created"
fi

# Summary
echo ""
echo "🎉 Setup Complete!"
echo ""
echo -e "${BLUE}📁 Project Structure:${NC}"
echo "  • dong_chen_profile/  - Professional landing page (port 8001)"
echo "  • RAG/                - Document processing system (port 8003)"
echo "  • data/               - Test files and uploads"
echo ""
echo -e "${BLUE}🚀 Quick Start:${NC}"
echo ""
echo -e "${YELLOW}1. Configure Environment:${NC}"
echo "   Edit .env.local with your API keys and database credentials"
echo ""
echo -e "${YELLOW}2. Start Landing Page:${NC}"
echo "   cd dong_chen_profile && npm run dev"
echo "   Open http://localhost:8001"
echo ""
echo -e "${YELLOW}3. Start RAG System:${NC}"
echo "   cd RAG/nextjs-document-service && npm run dev"
echo "   Open http://localhost:8003"
echo ""
echo -e "${YELLOW}4. Database Setup (Optional):${NC}"
echo "   cd RAG/database && ./setup.sh"
echo ""

# Check environment file
if [[ -f ".env.local" ]]; then
    if grep -q "your_openai_api_key_here" .env.local; then
        print_warning "Remember to update your API keys in .env.local!"
    else
        print_success "Environment configuration looks ready"
    fi
fi

echo -e "${GREEN}🎯 Ready to develop!${NC}"