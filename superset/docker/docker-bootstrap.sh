#!/bin/bash
set -e

echo "Starting Superset initialization..."

# Wait for database
while ! nc -z superset-db 5432; do
  echo "Waiting for database..."
  sleep 1
done

echo "Database is ready!"

# Run database migrations
echo "Running database upgrade..."
superset db upgrade

# Create admin user
echo "Creating admin user..."
superset fab create-admin \
  --username ${ADMIN_USERNAME:-admin} \
  --firstname ${ADMIN_FIRSTNAME:-Admin} \
  --lastname ${ADMIN_LASTNAME:-User} \
  --email ${ADMIN_EMAIL:-admin@example.com} \
  --password ${ADMIN_PASSWORD:-admin} || echo "Admin user already exists"

# Initialize Superset
echo "Initializing Superset..."
superset init

# Start Gunicorn with increased header limits
echo "Starting Superset web server..."
exec gunicorn \
    --bind "0.0.0.0:8088" \
    --access-logfile - \
    --error-logfile - \
    --workers 2 \
    --worker-class gthread \
    --threads 20 \
    --timeout 60 \
    --keep-alive 2 \
    --limit-request-line 0 \
    --limit-request-field_size 0 \
    --limit-request-fields 1000 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    "superset.app:create_app()"