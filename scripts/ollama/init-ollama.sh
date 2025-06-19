#!/bin/bash

echo "Initializing Ollama for Manufacturing Analytics..."

# Wait for Ollama to be ready
echo "Waiting for Ollama service to be ready..."
until curl -s http://localhost:11434/api/tags >/dev/null 2>&1; do
    echo "Waiting for Ollama..."
    sleep 5
done

echo "Ollama is ready!"

# Pull the recommended models
echo "Pulling optimized models for manufacturing data queries..."

# Pull phi3:mini (fastest, recommended)
echo "Pulling phi3:mini..."
ollama pull phi3:mini

# Pull gemma:2b (smallest, for very limited resources)
echo "Pulling gemma:2b..."
ollama pull gemma:2b

# Pull mistral:7b-instruct (balanced option)
echo "Pulling mistral:7b-instruct..."
ollama pull mistral:7b-instruct

# Create custom manufacturing assistant model
echo "Creating custom manufacturing assistant model..."
ollama create manufacturing-assistant -f /models/Modelfile

# List available models
echo "Available models:"
ollama list

echo "Ollama initialization complete!"
echo ""
echo "To use the manufacturing assistant, run:"
echo "  ollama run manufacturing-assistant"
echo ""
echo "Or use the API endpoint:"
echo "  curl http://localhost:11434/api/generate -d '{"
echo "    \"model\": \"manufacturing-assistant\","
echo "    \"prompt\": \"Generate an efficient Prisma query for retrieving KPI data\""
echo "  }'"