#!/bin/bash

# Production Database Migration Script
# This script safely runs database migrations in production

set -e  # Exit on error

echo "🚀 Starting production database migration..."

# Check if we're in production
if [ "$NODE_ENV" != "production" ]; then
    echo "⚠️  Warning: NODE_ENV is not set to 'production'"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for required environment variables
if [ -z "$DATABASE_URL" ] || [ -z "$DIRECT_DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL and DIRECT_DATABASE_URL must be set"
    exit 1
fi

# Create backup before migration
echo "📦 Creating database backup..."
BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).sql"

# Use DIRECT_DATABASE_URL for backup (bypasses pooler)
if command -v pg_dump &> /dev/null; then
    pg_dump "$DIRECT_DATABASE_URL" > "$BACKUP_FILE"
    echo "✅ Backup created: $BACKUP_FILE"
else
    echo "⚠️  Warning: pg_dump not found, skipping backup"
fi

# Run migration
echo "🔄 Running database migration..."
npx prisma migrate deploy

# Verify migration
echo "✅ Verifying migration..."
npx prisma db pull --force

echo "✨ Migration completed successfully!"

# Optional: Run post-migration scripts
if [ -f "./scripts/post-migration.js" ]; then
    echo "🔧 Running post-migration scripts..."
    node ./scripts/post-migration.js
fi

echo "🎉 Production migration complete!"