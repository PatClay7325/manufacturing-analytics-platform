#!/bin/bash

echo "Starting Ollama service for Manufacturing Analytics..."

# Start Ollama container
docker-compose up -d ollama

# Wait for Ollama to be ready
echo "Waiting for Ollama to be ready..."
sleep 10

# Initialize Ollama with models
docker exec manufacturing-ollama bash -c "cd /scripts && ./init-ollama.sh"

echo ""
echo "Ollama is ready! You can now:"
echo "1. Use the manufacturing assistant:"
echo "   docker exec -it manufacturing-ollama ollama run manufacturing-assistant"
echo ""
echo "2. Access the API at http://localhost:11434"
echo ""
echo "3. Run example queries:"
echo "   npm run ollama:examples"
echo ""
echo "4. Access Open WebUI at http://localhost:8080 (if enabled)"