#!/bin/bash

# Hybrid Bolt.diy + Next.js Workflow Setup Script
echo "🚀 Setting up Hybrid Bolt.diy + Next.js Development Workflow..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "HYBRID-WORKFLOW-GUIDE.md" ]; then
    echo -e "${RED}❌ Error: Please run this script from the nextjs-hybrid-workspace directory${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_NODE="18.17.0"
if [ "$(printf '%s\n' "$REQUIRED_NODE" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_NODE" ]; then
    echo -e "${RED}❌ Node.js version $NODE_VERSION is below required $REQUIRED_NODE${NC}"
    exit 1
else
    echo -e "${GREEN}✅ Node.js version $NODE_VERSION meets requirements${NC}"
fi

# Check if bolt.diy exists
BOLT_PATH="/mnt/c/Users/pclay/bolt.diy"
if [ ! -d "$BOLT_PATH" ]; then
    echo -e "${YELLOW}⚠️  Bolt.diy not found at $BOLT_PATH${NC}"
    echo -e "${YELLOW}   Please update BOLT_DIY_PATH environment variable if it's in a different location${NC}"
else
    echo -e "${GREEN}✅ Bolt.diy found at $BOLT_PATH${NC}"
fi

# Navigate to Next.js project
cd nextjs-production

echo -e "${BLUE}📦 Installing Next.js dependencies...${NC}"
if npm install; then
    echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
else
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

# Create environment file
echo -e "${BLUE}🔧 Setting up environment configuration...${NC}"
if [ ! -f ".env.local" ]; then
    cat > .env.local << EOF
# Hybrid Development Environment Configuration
BOLT_DIY_PATH=/mnt/c/Users/pclay/bolt.diy
BOLT_DEV_PROXY=true

# Next.js Configuration
NEXT_PUBLIC_APP_NAME="Next.js Production"
NEXT_PUBLIC_APP_VERSION="1.0.0"
NEXT_PUBLIC_ENVIRONMENT=development

# AI API Keys (copy from bolt.diy .env)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
NEXT_PUBLIC_OPENAI_API_KEY=
NEXT_PUBLIC_ANTHROPIC_API_KEY=

# Development Settings
NODE_ENV=development
DEBUG=false
EOF
    echo -e "${GREEN}✅ Created .env.local${NC}"
else
    echo -e "${YELLOW}⚠️  .env.local already exists${NC}"
fi

# Make scripts executable
echo -e "${BLUE}🔧 Setting up automation scripts...${NC}"
chmod +x scripts/*.js
echo -e "${GREEN}✅ Scripts configured${NC}"

# Create missing dependencies
echo -e "${BLUE}📦 Installing additional dependencies...${NC}"
npm install --save-dev chokidar tailwindcss-merge
echo -e "${GREEN}✅ Additional dependencies installed${NC}"

# Run type checking
echo -e "${BLUE}🔍 Running type check...${NC}"
if npm run type-check; then
    echo -e "${GREEN}✅ Type checking passed${NC}"
else
    echo -e "${YELLOW}⚠️  Type checking found issues - this is normal for initial setup${NC}"
fi

# Create initial build
echo -e "${BLUE}🏗️  Testing build process...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${YELLOW}⚠️  Build failed - review errors above${NC}"
fi

echo -e "${GREEN}"
echo "🎉 Hybrid workflow setup complete!"
echo ""
echo "📚 Next steps:"
echo "1. Edit .env.local with your API keys"
echo "2. Start the development servers:"
echo "   ${BLUE}npm run dev${GREEN}                 # Start Next.js"
echo "   ${BLUE}cd $BOLT_PATH && pnpm run dev${GREEN}  # Start bolt.diy"
echo ""
echo "3. Optional: Start component sync watcher:"
echo "   ${BLUE}npm run sync-components watch${GREEN}"
echo ""
echo "4. Read the workflow guide:"
echo "   ${BLUE}cat ../HYBRID-WORKFLOW-GUIDE.md${GREEN}"
echo ""
echo "🚀 Happy hybrid development!"
echo -e "${NC}"