#!/bin/bash

# Clean Installation Script for Manufacturing Analytics Platform
# Following Next.js Expert Framework best practices

echo "🧹 Starting clean installation process..."

# Step 1: Clean existing installation
echo "📦 Removing corrupted node_modules and lock files..."
rm -rf node_modules
rm -rf package-lock.json
rm -rf .next
rm -rf .turbo
rm -rf yarn.lock
rm -rf pnpm-lock.yaml

# Step 2: Clear caches
echo "🗑️ Clearing npm cache..."
npm cache clean --force

# Step 3: Restore proper package.json
echo "📋 Restoring comprehensive package.json..."
if [ -f "package-full.json.backup" ]; then
    cp package-full.json.backup package.json
    echo "✅ Restored full package.json from backup"
else
    echo "⚠️  No backup found, using current package.json"
fi

# Step 4: Install dependencies with specific versions
echo "📥 Installing dependencies..."
npm install --legacy-peer-deps --no-audit --no-fund

# Step 5: Install potentially missing peer dependencies
echo "🔧 Installing peer dependencies..."
npm install react@^18.2.0 react-dom@^18.2.0 --save --legacy-peer-deps

# Step 6: Verify critical dependencies
echo "✔️ Verifying critical dependencies..."
MISSING_DEPS=""

# Check for required dependencies
for dep in "next" "react" "react-dom" "tailwindcss" "autoprefixer" "postcss" "lucide-react" "typescript"; do
    if [ ! -d "node_modules/$dep" ]; then
        MISSING_DEPS="$MISSING_DEPS $dep"
    fi
done

if [ -n "$MISSING_DEPS" ]; then
    echo "⚠️  Missing dependencies detected: $MISSING_DEPS"
    echo "📥 Installing missing dependencies..."
    npm install $MISSING_DEPS --save --legacy-peer-deps
fi

# Step 7: Generate Prisma client
echo "🗄️ Generating Prisma client..."
npx prisma generate || echo "⚠️  Prisma generation failed, continuing..."

# Step 8: Run type check
echo "🔍 Running TypeScript check..."
npx tsc --noEmit --skipLibCheck || echo "⚠️  TypeScript errors detected"

# Step 9: Test build
echo "🏗️ Testing build..."
npm run build

echo "✅ Clean installation complete!"