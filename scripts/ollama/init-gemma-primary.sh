#!/bin/bash

echo "========================================"
echo "Initializing Gemma:2B as Primary Model"
echo "========================================"
echo ""

# Wait for Ollama to be ready
echo "Waiting for Ollama service to be ready..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
        echo "✓ Ollama is ready!"
        break
    fi
    echo "  Waiting for Ollama... (attempt $((attempt+1))/$max_attempts)"
    sleep 2
    attempt=$((attempt+1))
done

if [ $attempt -eq $max_attempts ]; then
    echo "✗ Ollama failed to start after $max_attempts attempts"
    exit 1
fi

echo ""
echo "1. Pulling Gemma:2B (Primary Model)..."
echo "========================================"
ollama pull gemma:2b

if [ $? -eq 0 ]; then
    echo "✓ Gemma:2B downloaded successfully"
else
    echo "✗ Failed to download Gemma:2B"
    exit 1
fi

echo ""
echo "2. Creating Manufacturing-Optimized Gemma Model..."
echo "========================================"

# Create a manufacturing-optimized version of Gemma:2B
cat > /tmp/ManufacturingGemmaModelfile << 'EOF'
FROM gemma:2b

# Set the temperature to make responses more focused
PARAMETER temperature 0.7

# Set the context window size
PARAMETER num_ctx 4096

# Set the prompt template for manufacturing context
TEMPLATE """{{ if .System }}<start_of_turn>system
{{ .System }}<end_of_turn>
{{ end }}{{ if .Prompt }}<start_of_turn>user
{{ .Prompt }}<end_of_turn>
<start_of_turn>model
{{ end }}"""

# System prompt optimized for manufacturing
SYSTEM """You are a specialized manufacturing analytics assistant powered by Gemma:2B. You help with:
- Equipment performance analysis (OEE, availability, performance, quality)
- Production metrics and KPIs based on ISO 22400 standards
- Predictive maintenance insights
- Quality control and defect analysis
- Supply chain optimization
- Energy efficiency monitoring

Provide concise, accurate responses focused on manufacturing best practices. When discussing metrics, reference relevant ISO standards when applicable."""
EOF

# Create the custom model
ollama create manufacturing-gemma -f /tmp/ManufacturingGemmaModelfile

echo ""
echo "3. Testing Gemma:2B..."
echo "========================================"

# Test the model with a manufacturing query
response=$(ollama run gemma:2b "What is OEE in manufacturing? Give a brief explanation." --verbose 2>&1)
if echo "$response" | grep -q "OEE\|Overall Equipment Effectiveness\|efficiency"; then
    echo "✓ Gemma:2B test successful"
else
    echo "⚠ Gemma:2B test response unexpected, but continuing..."
fi

echo ""
echo "4. Pulling Additional Models (Optional)..."
echo "========================================"
echo "These models will be available but not primary:"

# Pull additional models in background to speed up initialization
{
    echo "  - Pulling mistral:7b-instruct (for complex queries)..."
    ollama pull mistral:7b-instruct
    echo "  ✓ mistral:7b-instruct ready"
    
    echo "  - Pulling phi3:mini (for fast responses)..."
    ollama pull phi3:mini
    echo "  ✓ phi3:mini ready"
} &

background_pid=$!

echo "  Models downloading in background (PID: $background_pid)"
echo ""

echo "5. Setting Gemma:2B as Default..."
echo "========================================"

# Create a marker file to indicate primary model
echo "gemma:2b" > /root/.ollama/primary_model

echo ""
echo "6. Available Models:"
echo "========================================"
ollama list

echo ""
echo "========================================"
echo "✓ Gemma:2B Setup Complete!"
echo "========================================"
echo ""
echo "Primary Model: gemma:2b"
echo "Endpoint: http://localhost:11434"
echo ""
echo "Quick test:"
echo "  curl http://localhost:11434/api/generate -d '{"
echo '    "model": "gemma:2b",'
echo '    "prompt": "What are the key manufacturing KPIs?",'
echo '    "stream": false'
echo "  }'"
echo ""
echo "Manufacturing-optimized model available as: manufacturing-gemma"
echo ""

# Keep the background process info
echo "Note: Additional models still downloading in background."
echo "Check status with: docker logs manufacturing-ollama"