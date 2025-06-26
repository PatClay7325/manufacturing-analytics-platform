#!/bin/sh
set -e

echo "Starting Manufacturing Analytics Platform on RunPod..."

# Wait for database to be ready
echo "Waiting for database connection..."
until pg_isready -h "$DATABASE_HOST" -p "${DATABASE_PORT:-5433}" -U "$DATABASE_USER" -d "$DATABASE_NAME"; do
  echo "Database not ready, waiting..."
  sleep 2
done

echo "Database is ready!"

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Seed initial data if needed
if [ "$SEED_DATABASE" = "true" ]; then
  echo "Seeding database..."
  npm run seed:manufacturing || echo "Seeding failed, continuing..."
fi

# Start the application
echo "Starting Next.js application on port 8080..."
exec node server.js