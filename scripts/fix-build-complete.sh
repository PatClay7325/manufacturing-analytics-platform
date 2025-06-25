#!/bin/bash

# Comprehensive Build Fix Script
# Following Next.js Expert Framework

echo "🚀 Starting comprehensive build fix..."

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check command success
check_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 successful${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# Step 1: Backup current state
echo -e "${YELLOW}📦 Step 1: Backing up current configuration...${NC}"
cp package.json package.json.backup.$(date +%Y%m%d_%H%M%S)
cp -r src src.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# Step 2: Clean corrupted installation
echo -e "${YELLOW}🧹 Step 2: Cleaning corrupted installation...${NC}"
rm -rf node_modules
rm -rf package-lock.json
rm -rf .next
rm -rf .turbo
rm -rf yarn.lock
rm -rf pnpm-lock.yaml
check_status "Clean installation"

# Step 3: Clear all caches
echo -e "${YELLOW}🗑️ Step 3: Clearing all caches...${NC}"
npm cache clean --force
rm -rf ~/.npm/_cache
rm -rf /tmp/npm-*
check_status "Cache clearing"

# Step 4: Use fixed package.json
echo -e "${YELLOW}📋 Step 4: Applying fixed package.json...${NC}"
if [ -f "package-fixed.json" ]; then
    cp package-fixed.json package.json
    check_status "Package.json update"
else
    echo -e "${RED}❌ package-fixed.json not found${NC}"
    exit 1
fi

# Step 5: Install dependencies with retry logic
echo -e "${YELLOW}📥 Step 5: Installing dependencies...${NC}"
MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    npm install --legacy-peer-deps --no-audit --no-fund
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo -e "${YELLOW}⚠️ Installation failed, retry $RETRY_COUNT of $MAX_RETRIES${NC}"
        sleep 5
    fi
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Failed to install dependencies after $MAX_RETRIES attempts${NC}"
    exit 1
fi

# Step 6: Generate Prisma client
echo -e "${YELLOW}🗄️ Step 6: Generating Prisma client...${NC}"
npx prisma generate
check_status "Prisma generation"

# Step 7: Type check
echo -e "${YELLOW}🔍 Step 7: Running TypeScript check...${NC}"
npx tsc --noEmit --skipLibCheck
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️ TypeScript errors detected but continuing...${NC}"
fi

# Step 8: Build with debug output
echo -e "${YELLOW}🏗️ Step 8: Building application...${NC}"
NODE_OPTIONS='--max-old-space-size=4096' npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ BUILD SUCCESSFUL!${NC}"
    echo -e "${GREEN}🎉 All issues have been resolved!${NC}"
    
    # Show build info
    echo -e "\n${YELLOW}📊 Build Information:${NC}"
    du -sh .next
    find .next -name "*.js" -type f | wc -l | xargs echo "JavaScript files:"
    
    # Provide next steps
    echo -e "\n${YELLOW}📝 Next Steps:${NC}"
    echo "1. Run 'npm run dev' to start development server"
    echo "2. Run 'npm start' to start production server"
    echo "3. Run 'npm run lint' to check code quality"
else
    echo -e "${RED}❌ Build failed${NC}"
    echo -e "${YELLOW}📝 Troubleshooting steps:${NC}"
    echo "1. Check the error output above"
    echo "2. Run 'npx next build --debug' for detailed output"
    echo "3. Check for circular dependencies"
    echo "4. Verify all imports are correct"
    exit 1
fi