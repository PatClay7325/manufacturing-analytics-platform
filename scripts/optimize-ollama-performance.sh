#!/bin/bash

# Ollama Performance Optimization Script
# Optimizes model selection and configuration for manufacturing analytics

set -e

echo "🚀 Optimizing Ollama Performance for Manufacturing Analytics"
echo "==========================================================="

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check system capabilities
check_system() {
    log_info "Analyzing system capabilities..."
    
    # Check GPU
    if command -v nvidia-smi > /dev/null 2>&1; then
        GPU_MEM=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | head -1)
        log_success "NVIDIA GPU detected with ${GPU_MEM}MB VRAM"
        export HAS_GPU=true
        export GPU_MEMORY=$GPU_MEM
    else
        log_warning "No NVIDIA GPU detected - using CPU optimizations"
        export HAS_GPU=false
    fi
    
    # Check RAM
    TOTAL_RAM=$(free -m | awk 'NR==2{printf "%.0f", $2/1024}')
    log_info "Total RAM: ${TOTAL_RAM}GB"
    export TOTAL_RAM=$TOTAL_RAM
    
    # Check CPU cores
    CPU_CORES=$(nproc)
    log_info "CPU cores: $CPU_CORES"
    export CPU_CORES=$CPU_CORES
}

# Recommend optimal models based on system
recommend_models() {
    log_info "Recommending optimal models..."
    
    if [ "$HAS_GPU" = true ]; then
        if [ "$GPU_MEMORY" -gt 20000 ]; then
            log_success "High-end GPU detected - can run large models"
            RECOMMENDED_MODELS=("codellama:13b-instruct" "mixtral:8x7b-instruct-v0.1-q4_0" "llama2:13b")
        elif [ "$GPU_MEMORY" -gt 10000 ]; then
            log_success "Mid-range GPU detected - 7B-13B models recommended"
            RECOMMENDED_MODELS=("codellama:7b-instruct" "mistral:7b-instruct" "llama2:7b")
        else
            log_warning "Lower GPU memory - small models recommended"
            RECOMMENDED_MODELS=("phi:2.7b" "gemma:2b" "codellama:7b-instruct-q4_0")
        fi
    else
        if [ "$TOTAL_RAM" -gt 16 ]; then
            log_info "Sufficient RAM for quantized 7B models"
            RECOMMENDED_MODELS=("codellama:7b-instruct-q4_0" "mistral:7b-instruct-q4_0" "phi:2.7b")
        else
            log_warning "Limited RAM - small models only"
            RECOMMENDED_MODELS=("phi:2.7b" "gemma:2b")
        fi
    fi
    
    echo "Recommended models for your system:"
    for model in "${RECOMMENDED_MODELS[@]}"; do
        echo "  - $model"
    done
}

# Download and configure optimal models
setup_models() {
    log_info "Setting up optimal models..."
    
    # Always include a fast, small model for quick responses
    log_info "Installing fast response model: phi:2.7b"
    curl -X POST http://localhost:11434/api/pull -d '{"name": "phi:2.7b"}' --max-time 1800
    
    # Install primary model based on system capabilities
    if [ "$HAS_GPU" = true ] && [ "$GPU_MEMORY" -gt 10000 ]; then
        log_info "Installing primary model: codellama:7b-instruct"
        curl -X POST http://localhost:11434/api/pull -d '{"name": "codellama:7b-instruct"}' --max-time 1800
        PRIMARY_MODEL="codellama:7b-instruct"
    else
        log_info "Installing quantized model: codellama:7b-instruct-q4_0"
        curl -X POST http://localhost:11434/api/pull -d '{"name": "codellama:7b-instruct-q4_0"}' --max-time 1800
        PRIMARY_MODEL="codellama:7b-instruct-q4_0"
    fi
    
    # Create manufacturing-expert model with optimized configuration
    log_info "Creating optimized manufacturing-expert model..."
    
    cat > /tmp/manufacturing-expert-optimized.Modelfile << EOF
FROM $PRIMARY_MODEL

# Optimized parameters for manufacturing queries
PARAMETER temperature 0.1
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_ctx 2048
PARAMETER num_predict 512
PARAMETER repeat_last_n 64
PARAMETER repeat_penalty 1.1

# Manufacturing-specific system prompt
SYSTEM """You are a manufacturing analytics expert specializing in ISO 22400 KPIs and OEE calculations.

Database Schema:
- Equipment: id, code, name, site, area, workCenter, sapEquipmentNumber
- OEEMetric: timestamp, equipmentId, availability, performance, quality, oee
- ProductionQuantity: timestamp, equipmentId, plannedQuantity, producedQuantity, goodQuantity
- QualityMetric: timestamp, equipmentId, defectType, defectCount, severity

Guidelines:
1. Generate accurate Prisma queries
2. Follow ISO 22400 standards for OEE = Availability × Performance × Quality  
3. Apply proper security filters
4. Keep responses concise and actionable
5. Always include units and time ranges

Respond with JSON format:
{
  "prismaQuery": {...},
  "explanation": "...",
  "calculation": "..."
}
"""
EOF

    curl -X POST http://localhost:11434/api/create \
        -d "{\"name\": \"manufacturing-expert-optimized\", \"modelfile\": \"$(cat /tmp/manufacturing-expert-optimized.Modelfile)\"}"
    
    log_success "Manufacturing-expert-optimized model created"
}

# Configure CPU optimizations
optimize_cpu() {
    if [ "$HAS_GPU" = false ]; then
        log_info "Applying CPU optimizations..."
        
        # Update Ollama container with CPU optimizations
        docker exec manufacturing-ollama sh -c '
            # Set CPU affinity for better performance
            echo "Setting CPU thread optimization..."
            
            # Configure OpenMP for optimal threading
            export OMP_NUM_THREADS='$CPU_CORES'
            export OMP_THREAD_LIMIT='$CPU_CORES'
            export OMP_DYNAMIC=false
            export OMP_PROC_BIND=true
            export OMP_PLACES=cores
            
            echo "CPU optimizations applied"
        ' || log_warning "Could not apply CPU optimizations"
    fi
}

# Test performance of different models
benchmark_models() {
    log_info "Benchmarking model performance..."
    
    local models=("phi:2.7b" "manufacturing-expert-optimized")
    local test_prompt="Calculate OEE for equipment ID EQ001 for the last 24 hours"
    
    echo "Performance Benchmark Results:"
    echo "=============================="
    
    for model in "${models[@]}"; do
        if curl -s http://localhost:11434/api/tags | grep -q "$model"; then
            echo "Testing $model..."
            local start_time=$(date +%s%N)
            
            local response=$(curl -s -X POST http://localhost:11434/api/generate \
                -d "{\"model\": \"$model\", \"prompt\": \"$test_prompt\", \"stream\": false}" \
                --max-time 60)
            
            local end_time=$(date +%s%N)
            local duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
            
            if [ -n "$response" ]; then
                local response_length=$(echo "$response" | jq -r '.response' | wc -c)
                echo "  ✅ $model: ${duration}ms (${response_length} chars)"
            else
                echo "  ❌ $model: Failed or timed out"
            fi
        fi
    done
}

# Generate optimized configuration
create_config() {
    log_info "Creating optimized configuration..."
    
    cat > ollama-optimized.env << EOF
# Ollama Performance Configuration
OLLAMA_NUM_PARALLEL=1
OLLAMA_MAX_LOADED_MODELS=2
OLLAMA_HOST=0.0.0.0
OLLAMA_KEEP_ALIVE=5m

# CPU Optimizations (if no GPU)
OMP_NUM_THREADS=$CPU_CORES
OMP_THREAD_LIMIT=$CPU_CORES
OMP_DYNAMIC=false
OMP_PROC_BIND=true
OMP_PLACES=cores

# Memory settings
OLLAMA_MAX_VRAM=0  # Use system RAM if no GPU
EOF

    if [ "$HAS_GPU" = true ]; then
        cat >> ollama-optimized.env << EOF

# GPU Optimizations
CUDA_VISIBLE_DEVICES=0
OLLAMA_GPU_LAYERS=35  # Adjust based on model size
EOF
    fi
    
    log_success "Configuration saved to ollama-optimized.env"
}

# Apply optimizations to running container
apply_optimizations() {
    log_info "Applying optimizations to running container..."
    
    # Restart Ollama with optimized settings
    if [ "$HAS_GPU" = true ]; then
        log_info "Restarting with GPU optimizations..."
        docker-compose restart ollama
    else
        log_info "Applying CPU optimizations..."
        docker exec manufacturing-ollama sh -c "
            pkill -f ollama
            export OMP_NUM_THREADS=$CPU_CORES
            export OMP_THREAD_LIMIT=$CPU_CORES
            export OMP_DYNAMIC=false
            nohup ollama serve > /tmp/ollama.log 2>&1 &
        "
        sleep 5
    fi
}

# Main execution
main() {
    echo
    check_system
    echo
    recommend_models
    echo
    
    read -p "Do you want to download recommended models? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_models
    fi
    
    echo
    optimize_cpu
    create_config
    apply_optimizations
    
    echo
    log_info "Running performance benchmark..."
    benchmark_models
    
    echo
    log_success "Performance optimization complete!"
    echo
    echo "Next steps:"
    echo "1. Use 'phi:2.7b' for fast, simple queries"
    echo "2. Use 'manufacturing-expert-optimized' for complex analytics"
    echo "3. Monitor performance with: docker stats manufacturing-ollama"
    if [ "$HAS_GPU" = false ]; then
        echo "4. Consider GPU upgrade for 10-50x performance improvement"
    fi
    echo
}

main "$@"