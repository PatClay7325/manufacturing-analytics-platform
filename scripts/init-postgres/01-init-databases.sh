#!/bin/bash
set -e

# Create analytics_engine database if it doesn't exist
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE analytics_engine;
    GRANT ALL PRIVILEGES ON DATABASE analytics_engine TO $POSTGRES_USER;
EOSQL

# Enable TimescaleDB extension on both databases
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "manufacturing" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "analytics_engine" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
EOSQL

echo "Databases initialized with TimescaleDB extension"