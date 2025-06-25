#!/bin/bash
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE manufacturing;
    CREATE DATABASE manufacturing_analytics;
    GRANT ALL PRIVILEGES ON DATABASE manufacturing TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE manufacturing_analytics TO $POSTGRES_USER;
EOSQL
