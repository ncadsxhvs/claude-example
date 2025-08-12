#!/bin/bash

# Next.js Document Processing Service - Production Start Script
set -e

echo "🚀 Starting Next.js Document Processing Service (Production Mode)..."

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

# Install dependencies
echo -e "${YELLOW}📦 Installing production dependencies...${NC}"
npm ci --only=production
echo -e "${GREEN}✅ Production dependencies installed${NC}"

# Build the application
echo -e "${YELLOW}🔨 Building application for production...${NC}"
npm run build
echo -e "${GREEN}✅ Application built successfully${NC}"

# Start the production service
echo -e "${BLUE}🌟 Starting Next.js Document Processing Service in Production Mode...${NC}"
echo ""
echo -e "${GREEN}📍 Service will be available at:${NC}"
echo "   🌐 http://localhost:3000"
echo ""
echo -e "${BLUE}📋 API Endpoints:${NC}"
echo "   📤 POST /api/upload - Upload and process documents"
echo "   ❤️  GET /api/health - Health check"
echo ""
echo -e "${YELLOW}💡 Press Ctrl+C to stop the service${NC}"
echo ""

# Start the production service
npm run start