#!/bin/bash

# Ollama Model Initialization Script
# Downloads and configures models for manufacturing analytics

set -e

echo "🤖 Initializing Ollama models for Manufacturing Analytics..."

# Wait for Ollama service to be ready
echo "⏳ Waiting for Ollama service..."
while ! curl -s http://ollama:11434/api/version > /dev/null; do
    echo "Waiting for Ollama to start..."
    sleep 5
done

echo "✅ Ollama service is ready"

# Function to pull model with retry
pull_model() {
    local model=$1
    local max_retries=3
    local retry=0
    
    while [ $retry -lt $max_retries ]; do
        echo "📥 Pulling model: $model (attempt $((retry + 1)))"
        if curl -X POST http://ollama:11434/api/pull -d "{\"name\": \"$model\"}" --max-time 1800; then
            echo "✅ Successfully pulled $model"
            return 0
        else
            echo "❌ Failed to pull $model, retrying..."
            retry=$((retry + 1))
            sleep 10
        fi
    done
    
    echo "❌ Failed to pull $model after $max_retries attempts"
    return 1
}

# Pull required models
echo "📦 Downloading models for manufacturing analytics..."

# Primary model for general queries (lightweight but capable)
pull_model "codellama:7b-instruct"

# Alternative model for complex queries (if GPU memory allows)
pull_model "mistral:7b-instruct"

# Lightweight model for simple queries
pull_model "phi:2.7b"

# Create model configuration
echo "⚙️ Configuring models..."

# Create specialized manufacturing model
cat > /tmp/manufacturing-expert.Modelfile << 'EOF'
FROM codellama:7b-instruct

# Set parameters for manufacturing domain
PARAMETER temperature 0.1
PARAMETER top_p 0.9
PARAMETER top_k 40
PARAMETER num_ctx 4096

# System prompt for manufacturing analytics
SYSTEM """You are a manufacturing analytics expert specializing in ISO 22400 KPIs, OEE calculations, and industrial data analysis.

You have access to a PostgreSQL database with the following tables:
- dim_equipment: Equipment hierarchy and specifications
- fact_oee_metrics: OEE data with availability, performance, quality
- fact_production_quantities: Production volumes and rates
- fact_quality_metrics: Defect data and quality measurements
- fact_maintenance_events: Maintenance activities and downtime

Guidelines:
1. Generate accurate Prisma queries for the requested data
2. Follow ISO 22400 standards for OEE calculations
3. Ensure data security by applying proper filters
4. Explain calculations clearly
5. Suggest actionable insights from the data
6. Use manufacturing terminology correctly

Always respond with:
1. Generated Prisma query
2. Explanation of the calculation/analysis
3. Key insights or recommendations
"""
EOF

# Create the custom model
echo "🏭 Creating manufacturing-expert model..."
curl -X POST http://ollama:11434/api/create \
  -d "{\"name\": \"manufacturing-expert\", \"modelfile\": \"$(cat /tmp/manufacturing-expert.Modelfile)\"}"

echo "✅ Manufacturing-expert model created"

# Test the models
echo "🧪 Testing models..."

test_query() {
    local model=$1
    local prompt="Calculate OEE for equipment PKG-L1-FIL-01 for the last 24 hours"
    
    echo "Testing $model..."
    response=$(curl -s -X POST http://ollama:11434/api/generate \
        -d "{\"model\": \"$model\", \"prompt\": \"$prompt\", \"stream\": false}" \
        --max-time 30)
    
    if [ $? -eq 0 ]; then
        echo "✅ $model is working"
    else
        echo "❌ $model test failed"
    fi
}

test_query "manufacturing-expert"
test_query "codellama:7b-instruct"

echo "🎉 Ollama initialization complete!"
echo
echo "Available models:"
echo "- manufacturing-expert (specialized for manufacturing analytics)"
echo "- codellama:7b-instruct (general code and query generation)"
echo "- mistral:7b-instruct (complex reasoning)"
echo "- phi:2.7b (lightweight, fast responses)"
echo
echo "Ollama API endpoint: http://ollama:11434"