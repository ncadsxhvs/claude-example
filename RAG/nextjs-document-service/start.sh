#!/bin/bash

# Next.js Document Processing Service - Start Script
set -e

echo "🚀 Starting Next.js Document Processing Service..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found:${NC} $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm found:${NC} $(npm --version)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${BLUE}📦 Dependencies already installed${NC}"
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found. Make sure you're in the correct directory.${NC}"
    exit 1
fi

# Build the application (optional - can skip for development)
echo -e "${YELLOW}🔨 Building application...${NC}"
npm run build || {
    echo -e "${YELLOW}⚠️  Build failed, but continuing with development mode...${NC}"
}

# Start the service
echo -e "${BLUE}🌟 Starting Next.js Document Processing Service...${NC}"
echo ""
echo -e "${GREEN}📍 Service will be available at:${NC}"
echo "   🌐 http://localhost:8002"
echo ""
echo -e "${BLUE}📋 API Endpoints:${NC}"
echo "   📤 POST /api/upload - Upload and process documents"
echo "   ❤️  GET /api/health - Health check"
echo ""
echo -e "${YELLOW}💡 Press Ctrl+C to stop the service${NC}"
echo ""

# Start the service
npm run dev