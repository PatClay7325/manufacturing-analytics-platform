#!/bin/bash
set -e

echo "Initializing TimescaleDB and creating manufacturing database..."

# The database is already created by POSTGRES_DB env var
# Just need to enable TimescaleDB extension

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS timescaledb;
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- Create a simple test table to verify everything works
    CREATE TABLE IF NOT EXISTS test_connection (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    INSERT INTO test_connection DEFAULT VALUES;
    
    SELECT 'Database initialization completed successfully' as status;
EOSQL

echo "✅ Database initialization completed"