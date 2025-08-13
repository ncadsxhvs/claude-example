#!/bin/bash

# =============================================================================
# CLAUDE Project Setup Script
# Handles both dong_chen_profile and RAG services
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up CLAUDE project...${NC}"

# Check if we're in the right directory
if [[ ! -f "setup-all.sh" ]]; then
    echo -e "${RED}❌ Please run this script from the CLAUDE project root directory${NC}"
    exit 1
fi

# Function to setup environment files
setup_env_files() {
    echo -e "${YELLOW}📝 Setting up environment files...${NC}"
    
    # Dong Chen Profile
    if [[ ! -f "dong_chen_profile/.env.local" ]]; then
        echo "Creating dong_chen_profile/.env.local..."
        cp .env.local.example dong_chen_profile/.env.local
    else
        echo "✓ dong_chen_profile/.env.local already exists"
    fi
    
    # RAG Service
    if [[ ! -f "RAG/nextjs-document-service/.env.local" ]]; then
        echo "Creating RAG/nextjs-document-service/.env.local..."
        cp .env.local.example RAG/nextjs-document-service/.env.local
    else
        echo "✓ RAG/nextjs-document-service/.env.local already exists"
    fi
    
    echo -e "${GREEN}✅ Environment files setup complete${NC}"
}

# Function to install dependencies
install_dependencies() {
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    
    # Dong Chen Profile
    echo "Installing dong_chen_profile dependencies..."
    cd dong_chen_profile
    npm install
    cd ..
    
    # RAG Service
    echo "Installing RAG service dependencies..."
    cd RAG/nextjs-document-service
    npm install
    cd ../..
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Function to start services
start_services() {
    echo -e "${YELLOW}🎯 Starting development servers...${NC}"
    
    echo "Starting dong_chen_profile on port 8001..."
    cd dong_chen_profile
    npm run dev &
    DONG_PID=$!
    cd ..
    
    echo "Starting RAG service on port 8003..."
    cd RAG/nextjs-document-service
    npm run dev &
    RAG_PID=$!
    cd ../..
    
    echo -e "${GREEN}✅ Services started!${NC}"
    echo -e "${BLUE}📍 dong_chen_profile: http://localhost:8001${NC}"
    echo -e "${BLUE}📍 RAG service: http://localhost:8003${NC}"
    echo -e "${YELLOW}Press Ctrl+C to stop both services${NC}"
    
    # Wait for both processes and stop both if one stops
    wait $DONG_PID $RAG_PID
}

# Main execution
case "$1" in
    "env")
        setup_env_files
        ;;
    "install")
        install_dependencies
        ;;
    "dev")
        start_services
        ;;
    *)
        echo -e "${BLUE}CLAUDE Project Setup${NC}"
        echo ""
        echo "Usage: $0 {env|install|dev}"
        echo ""
        echo "Commands:"
        echo "  env     - Setup environment files"
        echo "  install - Install all dependencies"  
        echo "  dev     - Start development servers"
        echo ""
        echo "Full setup (recommended):"
        echo "  $0 env && $0 install && $0 dev"
        ;;
esac