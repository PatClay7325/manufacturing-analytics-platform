#!/bin/bash

# Manufacturing Analytics Platform - Ollama Stack Startup
# This script starts the complete stack with Ollama AI service

set -e

echo "🚀 Starting Manufacturing Analytics Platform with Ollama"
echo "======================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  INFO: $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ SUCCESS: $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
}

# Check if Docker is running
check_docker() {
    log_info "Checking Docker..."
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
    log_success "Docker is running"
}

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."
    
    # Check available memory (minimum 8GB recommended for Ollama)
    TOTAL_MEM=$(free -m | awk 'NR==2{printf "%.1f", $2/1024}')
    if (( $(echo "$TOTAL_MEM < 8" | bc -l) )); then
        log_warning "Less than 8GB RAM detected ($TOTAL_MEM GB). Ollama may run slowly."
    else
        log_success "Sufficient memory available ($TOTAL_MEM GB)"
    fi
    
    # Check for GPU support
    if command -v nvidia-smi > /dev/null 2>&1; then
        log_success "NVIDIA GPU detected - will use GPU acceleration"
        export GPU_ENABLED=true
    else
        log_warning "No NVIDIA GPU detected - using CPU mode"
        export GPU_ENABLED=false
    fi
}

# Start infrastructure services
start_infrastructure() {
    log_info "Starting infrastructure services..."
    
    # Use the Ollama-enabled docker-compose file
    cp setup/ollama-docker-setup.yml docker-compose.yml
    
    # Start PostgreSQL and Redis first
    docker-compose up -d postgres redis
    
    log_info "Waiting for database to be ready..."
    sleep 10
    
    # Check if database is ready
    local retries=0
    while ! docker exec manufacturing-postgres pg_isready -U analytics > /dev/null 2>&1; do
        if [ $retries -ge 30 ]; then
            log_error "Database failed to start after 5 minutes"
            exit 1
        fi
        retries=$((retries + 1))
        echo "Waiting for database... ($retries/30)"
        sleep 10
    done
    
    log_success "Database is ready"
}

# Start Ollama service
start_ollama() {
    log_info "Starting Ollama service..."
    
    if [ "$GPU_ENABLED" = true ]; then
        log_info "Starting with GPU support..."
        docker-compose up -d ollama
    else
        log_info "Starting in CPU mode..."
        # Modify docker-compose to remove GPU requirements
        sed -i 's/deploy:/# deploy:/g' docker-compose.yml
        sed -i 's/resources:/# resources:/g' docker-compose.yml
        sed -i 's/reservations:/# reservations:/g' docker-compose.yml
        sed -i 's/devices:/# devices:/g' docker-compose.yml
        sed -i 's/- driver: nvidia/# - driver: nvidia/g' docker-compose.yml
        sed -i 's/count: 1/# count: 1/g' docker-compose.yml
        sed -i 's/capabilities: \[gpu\]/# capabilities: [gpu]/g' docker-compose.yml
        
        docker-compose up -d ollama
    fi
    
    # Wait for Ollama to be ready
    log_info "Waiting for Ollama to start..."
    local retries=0
    while ! curl -s http://localhost:11434/api/version > /dev/null; do
        if [ $retries -ge 60 ]; then
            log_error "Ollama failed to start after 10 minutes"
            exit 1
        fi
        retries=$((retries + 1))
        echo "Waiting for Ollama... ($retries/60)"
        sleep 10
    done
    
    log_success "Ollama is ready"
}

# Initialize Ollama models
initialize_models() {
    log_info "Initializing Ollama models..."
    
    # Make the init script executable
    chmod +x scripts/ollama-init.sh
    
    # Run the initialization
    docker-compose up ollama-init
    
    # Check if models were downloaded successfully
    log_info "Verifying models..."
    local models=$(curl -s http://localhost:11434/api/tags | jq -r '.models[].name' 2>/dev/null || echo "")
    
    if [ -z "$models" ]; then
        log_warning "No models found. Please run model initialization manually:"
        echo "docker exec manufacturing-ollama ollama pull codellama:7b-instruct"
    else
        log_success "Models available: $models"
    fi
}

# Start monitoring services
start_monitoring() {
    log_info "Starting monitoring services..."
    
    docker-compose up -d prometheus grafana
    
    log_success "Monitoring services started"
    log_info "Prometheus: http://localhost:9090"
    log_info "Grafana: http://localhost:3001 (admin/admin)"
}

# Start application
start_application() {
    log_info "Starting application..."
    
    # Create application Docker image if needed
    if [ ! -f Dockerfile.dev ]; then
        cat > Dockerfile.dev << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
EOF
    fi
    
    # Build and start the application
    docker-compose up -d app
    
    log_info "Waiting for application to start..."
    local retries=0
    while ! curl -s http://localhost:3000 > /dev/null; do
        if [ $retries -ge 30 ]; then
            log_warning "Application may be taking longer to start"
            break
        fi
        retries=$((retries + 1))
        echo "Waiting for application... ($retries/30)"
        sleep 10
    done
    
    log_success "Application is starting"
}

# Verify setup
verify_setup() {
    log_info "Verifying complete setup..."
    
    # Check all services
    local services=("postgres" "redis" "ollama" "prometheus" "grafana" "app")
    local failed_services=()
    
    for service in "${services[@]}"; do
        if docker-compose ps "$service" | grep -q "Up"; then
            log_success "$service is running"
        else
            log_warning "$service is not running"
            failed_services+=("$service")
        fi
    done
    
    # Test AI service
    log_info "Testing AI service..."
    local test_response=$(curl -s -X POST http://localhost:11434/api/generate \
        -d '{"model": "codellama:7b-instruct", "prompt": "Hello", "stream": false}' \
        --max-time 30 2>/dev/null || echo "")
    
    if [ -n "$test_response" ]; then
        log_success "AI service is responding"
    else
        log_warning "AI service test failed - may need more time to initialize"
    fi
    
    # Show summary
    echo
    echo "======================================"
    echo "🎉 SETUP COMPLETE!"
    echo "======================================"
    echo
    echo "Services:"
    echo "📱 Application:     http://localhost:3000"
    echo "🤖 Ollama Chat:     http://localhost:3000/ollama-chat"
    echo "📊 Grafana:         http://localhost:3001 (admin/admin)"
    echo "📈 Prometheus:      http://localhost:9090"
    echo "🗄️  Database:        postgresql://analytics:development_password@localhost:5432/manufacturing"
    echo "🧠 Ollama API:      http://localhost:11434"
    echo
    echo "Quick Tests:"
    echo "curl http://localhost:11434/api/tags"
    echo "curl http://localhost:3000/api/ai/query"
    echo
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        echo "⚠️  Some services failed to start: ${failed_services[*]}"
        echo "Check logs with: docker-compose logs [service-name]"
        echo
    fi
    
    echo "Next Steps:"
    echo "1. Open http://localhost:3000/ollama-chat"
    echo "2. Ask a question like: 'Show me OEE data for equipment'"
    echo "3. Check service logs: docker-compose logs -f"
    echo "4. Stop services: docker-compose down"
    echo
}

# Show usage
show_usage() {
    echo "Usage: $0 [options]"
    echo
    echo "Options:"
    echo "  --cpu-only     Force CPU-only mode (no GPU)"
    echo "  --quick        Skip model downloads for faster startup"
    echo "  --clean        Clean up existing containers first"
    echo "  --help         Show this help message"
    echo
}

# Parse command line arguments
CPU_ONLY=false
QUICK_START=false
CLEAN_START=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --cpu-only)
            CPU_ONLY=true
            shift
            ;;
        --quick)
            QUICK_START=true
            shift
            ;;
        --clean)
            CLEAN_START=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Override GPU detection if CPU-only requested
if [ "$CPU_ONLY" = true ]; then
    export GPU_ENABLED=false
fi

# Clean up if requested
if [ "$CLEAN_START" = true ]; then
    log_info "Cleaning up existing containers..."
    docker-compose down -v
    docker system prune -f
    log_success "Cleanup complete"
fi

# Main execution
main() {
    check_docker
    check_requirements
    start_infrastructure
    start_ollama
    
    if [ "$QUICK_START" = false ]; then
        initialize_models
    else
        log_warning "Skipping model initialization (--quick mode)"
        log_info "You can initialize models later with: docker-compose up ollama-init"
    fi
    
    start_monitoring
    start_application
    verify_setup
}

# Run main function
main "$@"