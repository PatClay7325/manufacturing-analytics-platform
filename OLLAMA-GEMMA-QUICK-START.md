# 🚀 Ollama + Gemma:2B Quick Start

## Start Ollama with Gemma:2B as Primary Model

### Windows
```cmd
cd scripts\windows
START-OLLAMA-GEMMA-DOCKER.cmd
```

### Linux/Mac
```bash
cd scripts/linux
./start-ollama-gemma-docker.sh
```

## Update Your Configuration

Add to `.env.local`:
```env
OLLAMA_DEFAULT_MODEL=gemma:2b
```

## Test It's Working

```bash
# Check models
docker exec manufacturing-ollama ollama list

# Test Gemma:2B
curl http://localhost:11434/api/generate -d '{
  "model": "gemma:2b",
  "prompt": "What is OEE?",
  "stream": false
}'
```

## Use in Application

1. Restart your dev server:
   ```bash
   npm run dev
   ```

2. Go to Manufacturing Chat:
   ```
   http://localhost:3000/manufacturing-chat
   ```

3. Ask manufacturing questions!

## Quick Commands

| Action | Command |
|--------|---------|
| View logs | `docker logs manufacturing-ollama` |
| List models | `docker exec manufacturing-ollama ollama list` |
| Stop Ollama | `docker stop manufacturing-ollama` |
| Start Ollama | `docker start manufacturing-ollama` |
| Pull new model | `docker exec manufacturing-ollama ollama pull <model>` |

## Models Available

1. **gemma:2b** (Primary) - Fast, efficient
2. **manufacturing-gemma** - Optimized for manufacturing
3. **mistral:7b-instruct** - For complex queries
4. **phi3:mini** - Ultra-fast responses

## Troubleshooting

- **Ollama not starting?** Check Docker is running
- **Model not found?** Wait for download to complete
- **Slow responses?** Check memory usage with `docker stats`

---
✨ Gemma:2B is now your primary AI model for manufacturing insights!