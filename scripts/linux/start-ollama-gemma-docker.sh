#!/bin/bash

echo "========================================"
echo "   START OLLAMA WITH GEMMA:2B AS PRIMARY"
echo "========================================"
echo ""

# Stop existing container if running
echo "[1] Stopping existing Ollama container if running..."
docker stop manufacturing-ollama 2>/dev/null
docker rm manufacturing-ollama 2>/dev/null

echo ""
echo "[2] Making initialization script executable..."
chmod +x scripts/ollama/init-gemma-primary.sh

echo ""
echo "[3] Starting Ollama with Gemma:2B configuration..."
docker-compose -f docker/compose/docker-compose.ollama-gemma.yml up -d

echo ""
echo "[4] Waiting for Ollama to initialize..."
echo "This may take a few minutes on first run..."
sleep 10

echo ""
echo "[5] Following container logs..."
echo "Press Ctrl+C when you see 'Gemma:2B Setup Complete!'"
echo ""
docker logs -f manufacturing-ollama

echo ""
echo "========================================"
echo "   OLLAMA GEMMA:2B SETUP COMPLETE"
echo "========================================"
echo ""
echo "Ollama is now running with Gemma:2B as the primary model."
echo ""
echo "Test it:"
echo '  curl http://localhost:11434/api/generate -d "{"model": "gemma:2b", "prompt": "What is OEE?", "stream": false}"'
echo ""
echo "Update your .env.local:"
echo "  OLLAMA_DEFAULT_MODEL=gemma:2b"
echo ""