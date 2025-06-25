#!/bin/bash
set -e

echo "Starting Superset initialization..."

# Wait for database
echo "Waiting for database..."
while ! nc -z $DATABASE_HOST $DATABASE_PORT; do
  sleep 1
done
echo "Database is ready!"

# Create admin user
echo "Setting up admin user..."
superset fab create-admin \
  --username ${ADMIN_USERNAME:-admin} \
  --firstname ${ADMIN_FIRSTNAME:-Admin} \
  --lastname ${ADMIN_LASTNAME:-User} \
  --email ${ADMIN_EMAIL:-admin@example.com} \
  --password ${ADMIN_PASSWORD:-admin} || echo "Admin user already exists"

# Run database migrations
echo "Running database upgrade..."
superset db upgrade

# Initialize Superset
echo "Initializing Superset..."
superset init

# Create default roles and permissions
echo "Setting up roles and permissions..."
superset fab create-permissions

# Create Manufacturing database connection
echo "Creating Manufacturing database connection..."
python <<EOF
import os
from superset import db
from superset.models.core import Database

# Check if database already exists
existing_db = db.session.query(Database).filter_by(
    database_name='Manufacturing TimescaleDB'
).first()

if not existing_db:
    # Create new database connection
    manufacturing_db = Database(
        database_name='Manufacturing TimescaleDB',
        sqlalchemy_uri=f"postgresql://{os.environ.get('MANUFACTURING_DB_USER', 'postgres')}:{os.environ.get('MANUFACTURING_DB_PASSWORD', 'postgres')}@{os.environ.get('MANUFACTURING_DB_HOST', 'timescaledb')}:5432/{os.environ.get('MANUFACTURING_DB_NAME', 'manufacturing')}",
        expose_in_sqllab=True,
        allow_ctas=True,
        allow_cvas=True,
        allow_dml=True,
        allow_multi_schema_metadata_fetch=True,
    )
    db.session.add(manufacturing_db)
    db.session.commit()
    print("Manufacturing database connection created successfully")
else:
    print("Manufacturing database connection already exists")
EOF

echo "Superset initialization complete!"

# Start the web server
echo "Starting Superset web server..."
exec gunicorn \
    --bind "0.0.0.0:8088" \
    --access-logfile - \
    --error-logfile - \
    --workers 4 \
    --worker-class gthread \
    --threads 20 \
    --timeout 60 \
    --keep-alive 2 \
    --max-requests 1000 \
    --max-requests-jitter 50 \
    "superset.app:create_app()"