#!/bin/bash

# Test Environment Setup Script
# Sets up comprehensive testing environment for CI/CD pipeline

set -e

echo "🧪 Setting up Manufacturing Analytics Test Environment"
echo "=================================================="

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Environment configuration
TEST_DB_HOST=${TEST_DB_HOST:-localhost}
TEST_DB_PORT=${TEST_DB_PORT:-5432}
TEST_DB_NAME=${TEST_DB_NAME:-manufacturing_test}
TEST_DB_USER=${TEST_DB_USER:-test_user}
TEST_DB_PASSWORD=${TEST_DB_PASSWORD:-test_password}

TEST_REDIS_HOST=${TEST_REDIS_HOST:-localhost}
TEST_REDIS_PORT=${TEST_REDIS_PORT:-6379}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        log_error "Node.js version 18 or higher is required"
        exit 1
    fi
    
    log_success "Node.js $(node --version) is installed"
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    log_success "npm $(npm --version) is installed"
}

# Setup test database
setup_test_database() {
    log_info "Setting up test database..."
    
    # Wait for database to be ready
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if pg_isready -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER > /dev/null 2>&1; then
            log_success "Database is ready"
            break
        fi
        
        log_info "Waiting for database... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "Database is not ready after $max_attempts attempts"
        exit 1
    fi
    
    # Create test database if it doesn't exist
    createdb -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER $TEST_DB_NAME 2>/dev/null || true
    
    # Enable TimescaleDB extension
    psql -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER -d $TEST_DB_NAME -c "CREATE EXTENSION IF NOT EXISTS timescaledb;" || true
    
    log_success "Test database setup completed"
}

# Setup Redis
setup_test_redis() {
    log_info "Setting up test Redis..."
    
    # Wait for Redis to be ready
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if redis-cli -h $TEST_REDIS_HOST -p $TEST_REDIS_PORT ping > /dev/null 2>&1; then
            log_success "Redis is ready"
            break
        fi
        
        log_info "Waiting for Redis... (attempt $attempt/$max_attempts)"
        sleep 2
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "Redis is not ready after $max_attempts attempts"
        exit 1
    fi
    
    # Flush Redis test database
    redis-cli -h $TEST_REDIS_HOST -p $TEST_REDIS_PORT FLUSHDB
    
    log_success "Test Redis setup completed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Clean install
    rm -rf node_modules package-lock.json 2>/dev/null || true
    npm ci
    
    # Install test dependencies if missing
    npm install --save-dev @types/jest jest-environment-node supertest
    
    log_success "Dependencies installed"
}

# Setup environment file
setup_env_file() {
    log_info "Setting up test environment file..."
    
    cat > .env.test.local << EOF
# Test Environment Configuration - Local
NODE_ENV=test
DATABASE_URL="postgresql://${TEST_DB_USER}:${TEST_DB_PASSWORD}@${TEST_DB_HOST}:${TEST_DB_PORT}/${TEST_DB_NAME}"
DIRECT_DATABASE_URL="postgresql://${TEST_DB_USER}:${TEST_DB_PASSWORD}@${TEST_DB_HOST}:${TEST_DB_PORT}/${TEST_DB_NAME}"
REDIS_URL="redis://${TEST_REDIS_HOST}:${TEST_REDIS_PORT}"

# Authentication for testing
NEXTAUTH_SECRET="test-secret-for-ci-pipeline-minimum-32-characters"
NEXTAUTH_URL="http://localhost:3000"
AUTH_TOKEN_SALT="test-auth-token-salt-minimum-32-characters"

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# External Services (mocked in tests)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=phi:2.7b
OLLAMA_API_URL=http://localhost:11434
OPENAI_API_KEY=test-api-key

# Feature flags for testing
ENABLE_AI_FEATURES=true
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_AUDIT_LOGGING=true

# Testing configuration
TEST_TIMEOUT=30000
LOG_LEVEL=error
DISABLE_TELEMETRY=true

# Mock external services in tests
MOCK_SAP_INTEGRATION=true
MOCK_IGNITION_INTEGRATION=true
MOCK_EMAIL_SERVICE=true

# Rate Limiting (relaxed for tests)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# Agent System
CRON_SCHEDULE=0 2 * * *
MEMORY_RETENTION_DAYS=30

# Monitoring (disabled for tests)
ENABLE_TRACING=false
ENABLE_METRICS=false
EOF

    log_success "Test environment file created"
}

# Setup database schema
setup_database_schema() {
    log_info "Setting up database schema..."
    
    # Generate Prisma client
    npx prisma generate
    
    # Push schema to test database
    npx prisma db push --accept-data-loss --force-reset
    
    # Apply TimescaleDB schema if it exists
    if [ -f "schema/iso-22400-timescaledb.sql" ]; then
        psql -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER -d $TEST_DB_NAME -f schema/iso-22400-timescaledb.sql || true
    fi
    
    log_success "Database schema setup completed"
}

# Seed test data
seed_test_data() {
    log_info "Seeding test data..."
    
    # Run the test data seeder
    if [ -f "scripts/seed-iso-sample-data.ts" ]; then
        npx tsx scripts/seed-iso-sample-data.ts
        log_success "Test data seeded successfully"
    else
        log_warning "Test data seeder not found - skipping"
    fi
}

# Validate setup
validate_setup() {
    log_info "Validating test environment setup..."
    
    # Test database connection
    if npx prisma db execute --sql "SELECT 1;" > /dev/null 2>&1; then
        log_success "Database connection validated"
    else
        log_error "Database connection failed"
        exit 1
    fi
    
    # Test Redis connection
    if redis-cli -h $TEST_REDIS_HOST -p $TEST_REDIS_PORT ping > /dev/null 2>&1; then
        log_success "Redis connection validated"
    else
        log_error "Redis connection failed"
        exit 1
    fi
    
    # Test basic queries
    local record_count=$(psql -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER -d $TEST_DB_NAME -t -c "SELECT COUNT(*) FROM equipment;" 2>/dev/null || echo "0")
    if [ "$record_count" -gt 0 ]; then
        log_success "Test data validation passed ($record_count equipment records)"
    else
        log_warning "No test data found in equipment table"
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up test environment..."
    
    # Remove temporary files
    rm -f .env.test.local 2>/dev/null || true
    
    # Optional: Drop test database (uncomment if needed)
    # dropdb -h $TEST_DB_HOST -p $TEST_DB_PORT -U $TEST_DB_USER $TEST_DB_NAME 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Main execution
main() {
    echo
    check_prerequisites
    echo
    
    # Setup services
    setup_test_database
    setup_test_redis
    echo
    
    # Setup application
    install_dependencies
    setup_env_file
    setup_database_schema
    echo
    
    # Seed and validate
    seed_test_data
    validate_setup
    echo
    
    log_success "Test environment setup completed successfully!"
    echo
    echo "Environment details:"
    echo "- Database: postgresql://${TEST_DB_USER}:***@${TEST_DB_HOST}:${TEST_DB_PORT}/${TEST_DB_NAME}"
    echo "- Redis: redis://${TEST_REDIS_HOST}:${TEST_REDIS_PORT}"
    echo "- Node.js: $(node --version)"
    echo "- npm: $(npm --version)"
    echo
    echo "Run tests with:"
    echo "  npm run test:unit"
    echo "  npm run test:integration"
    echo "  npm run test:e2e"
    echo
}

# Handle cleanup on exit
trap cleanup EXIT

# Parse command line arguments
case "${1:-setup}" in
    setup)
        main
        ;;
    cleanup)
        cleanup
        ;;
    validate)
        validate_setup
        ;;
    *)
        echo "Usage: $0 [setup|cleanup|validate]"
        exit 1
        ;;
esac