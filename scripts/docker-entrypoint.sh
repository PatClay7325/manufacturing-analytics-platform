#!/bin/sh
set -e

echo "Starting Manufacturing Analytics Platform..."

# Wait for database to be ready
echo "Waiting for database..."
until pg_isready -h ${DATABASE_HOST:-localhost} -p ${DATABASE_PORT:-5432} -U ${DATABASE_USER:-postgres}; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Database is ready!"

# Run database migrations
echo "Running database migrations..."
if ! npx prisma migrate deploy; then
  echo "Migration failed, but continuing startup..."
fi

# Setup pgvector extension if needed
echo "Setting up pgvector extension..."
psql "$DATABASE_URL" -f prisma/migrations/setup-pgvector.sql || echo "pgvector setup skipped"

# Validate environment
echo "Validating environment..."
node -e "require('./dist/lib/env.js').validateEnv()" || exit 1

# Start the application with proper signal forwarding
echo "Starting Next.js server..."
exec node server.js