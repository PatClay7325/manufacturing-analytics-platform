#!/bin/bash

echo "🤖 Setting up Ollama for Manufacturing Chat..."

# Check if Ollama is running
check_ollama() {
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "✅ Ollama is running"
        return 0
    else
        echo "❌ Ollama is not running"
        return 1
    fi
}

# List available models
list_models() {
    echo "📋 Available models:"
    curl -s http://localhost:11434/api/tags | jq -r '.models[].name' 2>/dev/null || echo "No models found"
}

# Pull a model
pull_model() {
    local model=$1
    echo "📥 Pulling model: $model"
    curl -X POST http://localhost:11434/api/pull -d "{\"name\": \"$model\"}" -H "Content-Type: application/json"
    echo ""
}

# Main script
echo "Checking Ollama status..."
if check_ollama; then
    list_models
    
    # Check if we have any models
    MODEL_COUNT=$(curl -s http://localhost:11434/api/tags | jq '.models | length' 2>/dev/null || echo "0")
    
    if [ "$MODEL_COUNT" = "0" ]; then
        echo ""
        echo "⚠️  No models found. Would you like to pull a model?"
        echo "Recommended models for manufacturing chat:"
        echo "  1. llama2 (7B) - Good balance of performance and quality"
        echo "  2. mistral (7B) - Fast and efficient"
        echo "  3. neural-chat (7B) - Optimized for conversations"
        echo "  4. tinyllama (1.1B) - Very fast, lower quality"
        echo ""
        read -p "Enter model name to pull (or press Enter to skip): " MODEL_NAME
        
        if [ ! -z "$MODEL_NAME" ]; then
            pull_model "$MODEL_NAME"
        fi
    else
        echo "✅ Found $MODEL_COUNT model(s) installed"
    fi
else
    echo ""
    echo "🚀 To start Ollama, run:"
    echo "  docker-compose up -d ollama"
    echo ""
    echo "Or if running locally:"
    echo "  ollama serve"
fi

echo ""
echo "📝 To use Ollama with the chat:"
echo "  1. Ensure Ollama is running"
echo "  2. Set OLLAMA_MODEL in your .env file (default: llama2)"
echo "  3. The chat will automatically use Ollama for AI responses"