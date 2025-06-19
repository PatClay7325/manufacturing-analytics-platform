# Ollama Docker Deployment Guide

## Overview

This guide explains how to deploy Ollama with Gemma:2B as the primary model for the Manufacturing Analytics Platform using Docker.

## Quick Start

### Option 1: Use Gemma:2B as Primary (Recommended)

```cmd
cd scripts\windows
START-OLLAMA-GEMMA-DOCKER.cmd
```

This will:
1. Start Ollama container with Gemma:2B configuration
2. Download and set up Gemma:2B as primary model
3. Create manufacturing-optimized version
4. Download additional models in background

### Option 2: Use Standard Configuration

```bash
docker-compose up -d ollama
```

Then manually pull models:
```bash
docker exec manufacturing-ollama ollama pull gemma:2b
docker exec manufacturing-ollama ollama pull mistral:7b-instruct
```

## Configuration Options

### Environment Variables

Add to your `.env.local`:
```env
# Ollama Configuration
OLLAMA_API_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=gemma:2b
```

### Docker Compose Variables

The Ollama service supports these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| OLLAMA_KEEP_ALIVE | 24h | How long to keep models loaded |
| OLLAMA_NUM_PARALLEL | 2 | Number of parallel requests |
| OLLAMA_MAX_LOADED_MODELS | 3 | Maximum models in memory |
| OLLAMA_DEFAULT_MODEL | - | Default model to use |

## Available Models

### Primary Model: Gemma:2B
- **Size**: ~1.4GB
- **Memory**: ~3GB when loaded
- **Speed**: Fast inference
- **Use Case**: General manufacturing queries

### Additional Models

1. **manufacturing-gemma** (Custom)
   - Optimized version of Gemma:2B
   - Pre-configured for manufacturing context
   - Lower temperature for focused responses

2. **mistral:7b-instruct**
   - Size: ~4.1GB
   - Better for complex analysis
   - Slower but more capable

3. **phi3:mini**
   - Size: ~2.3GB
   - Fast responses
   - Good for simple queries

## Container Management

### View Logs
```bash
docker logs manufacturing-ollama
```

### List Models
```bash
docker exec manufacturing-ollama ollama list
```

### Pull New Model
```bash
docker exec manufacturing-ollama ollama pull <model-name>
```

### Remove Model
```bash
docker exec manufacturing-ollama ollama rm <model-name>
```

### Shell Access
```bash
docker exec -it manufacturing-ollama /bin/bash
```

## Testing the Setup

### 1. Check Service Health
```bash
curl http://localhost:11434/api/tags
```

### 2. Test Gemma:2B
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "gemma:2b",
  "prompt": "What is OEE?",
  "stream": false
}'
```

### 3. Test Manufacturing-Optimized Model
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "manufacturing-gemma",
  "prompt": "List key manufacturing KPIs",
  "stream": false
}'
```

## Resource Management

### Memory Usage
- Gemma:2B: ~3GB when loaded
- Mistral:7B: ~8GB when loaded
- Phi3:mini: ~4GB when loaded

### Recommended Resources
- **Minimum**: 8GB RAM (Gemma:2B only)
- **Recommended**: 16GB RAM (Multiple models)
- **Optimal**: 32GB RAM (All models loaded)

### Resource Limits

Update in `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      memory: 8g  # Adjust based on available RAM
    reservations:
      memory: 4g
```

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker logs manufacturing-ollama

# Check resources
docker system df
docker stats manufacturing-ollama
```

### Model Download Fails
```bash
# Retry with specific model
docker exec manufacturing-ollama ollama pull gemma:2b

# Check disk space
docker system df
```

### Slow Performance
1. Check loaded models:
   ```bash
   docker exec manufacturing-ollama ollama ps
   ```

2. Unload unused models:
   ```bash
   docker exec manufacturing-ollama ollama stop <model>
   ```

3. Adjust parallel requests:
   ```yaml
   environment:
     - OLLAMA_NUM_PARALLEL=1  # Reduce for better performance
   ```

## Advanced Configuration

### Custom Model Creation

Create `/tmp/CustomModel`:
```
FROM gemma:2b
PARAMETER temperature 0.5
PARAMETER num_ctx 2048
SYSTEM "You are a manufacturing expert..."
```

Load it:
```bash
docker exec manufacturing-ollama ollama create custom-model -f /tmp/CustomModel
```

### Persistent Model Storage

Models are stored in the `ollama-data` volume:
```bash
# Backup models
docker run --rm -v ollama-data:/data -v $(pwd):/backup alpine tar czf /backup/ollama-backup.tar.gz -C /data .

# Restore models
docker run --rm -v ollama-data:/data -v $(pwd):/backup alpine tar xzf /backup/ollama-backup.tar.gz -C /data
```

## Integration with Application

### Update Application Config

1. Set environment variable:
   ```env
   OLLAMA_DEFAULT_MODEL=gemma:2b
   ```

2. Restart application:
   ```bash
   npm run dev
   ```

3. Verify in Manufacturing Chat:
   - Navigate to `/manufacturing-chat`
   - Ask a test question
   - Check response time and quality

### API Usage Example

```typescript
const response = await fetch('http://localhost:11434/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gemma:2b',
    messages: [
      { role: 'user', content: 'What is predictive maintenance?' }
    ]
  })
});
```

## Best Practices

1. **Model Selection**
   - Use Gemma:2B for most queries (fast, efficient)
   - Switch to Mistral for complex analysis
   - Use Phi3 for very fast, simple responses

2. **Resource Management**
   - Keep only necessary models loaded
   - Monitor memory usage regularly
   - Set appropriate resource limits

3. **Security**
   - Run Ollama in isolated network
   - Don't expose port 11434 publicly
   - Use API gateway for external access

4. **Monitoring**
   - Check container health regularly
   - Monitor response times
   - Track model usage patterns

## Maintenance

### Regular Tasks
- Update Ollama image monthly
- Clean unused models quarterly
- Backup model configurations
- Monitor disk usage

### Update Procedure
```bash
# Pull latest image
docker pull ollama/ollama:latest

# Recreate container
docker-compose up -d ollama
```

## Support

For issues:
1. Check container logs
2. Verify model availability
3. Test API endpoints
4. Review resource usage

For help:
- [Ollama Documentation](https://github.com/ollama/ollama)
- [Gemma Model Info](https://ollama.ai/library/gemma)
- Project issues: `/docs/troubleshooting`