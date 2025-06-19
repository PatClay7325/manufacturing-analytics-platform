# Ollama Configuration for Manufacturing Analytics

This directory contains the optimized Ollama setup for querying manufacturing plant data efficiently.

## Overview

The Ollama integration is configured to:
- Use lightweight, fast models optimized for limited resources (12.6GB available RAM)
- Provide specialized assistance for Prisma queries and manufacturing data analysis
- Support hierarchical enterprise data models
- Optimize for performance and memory efficiency

## Models

### Recommended Models (in order of preference):
1. **phi3:mini** (3.8B parameters) - Fastest, recommended for most queries
2. **gemma:2b** (2B parameters) - Smallest, for very limited resources  
3. **mistral:7b-instruct** (7B parameters) - Balance of speed and capability

### Custom Model
- **manufacturing-assistant** - Custom model based on phi3:mini with specialized system prompt

## Quick Start

1. Start Ollama service:
   ```bash
   ./scripts/start-ollama.sh
   ```

2. Test the manufacturing assistant:
   ```bash
   docker exec -it manufacturing-ollama ollama run manufacturing-assistant
   ```

3. Run example queries:
   ```bash
   npm run ollama:examples
   ```

## API Usage

### Generate Response
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "manufacturing-assistant",
  "prompt": "Generate an efficient Prisma query for retrieving KPI data from the last 24 hours"
}'
```

### List Available Models
```bash
curl http://localhost:11434/api/tags
```

## Configuration

### Environment Variables
- `OLLAMA_KEEP_ALIVE=24h` - Keep models loaded in memory
- `OLLAMA_NUM_PARALLEL=2` - Number of parallel requests
- `OLLAMA_MAX_LOADED_MODELS=1` - Maximum models in memory

### Resource Limits
- Memory Limit: 8GB
- Memory Reservation: 4GB

## Example Queries

See `scripts/ollama/query-examples.ts` for:
- Efficient KPI data retrieval
- Hierarchical data loading
- Aggregated metrics with pagination
- Real-time alert analysis

## Performance Tips

1. **Use selective queries**: Always use `select` in Prisma to minimize data transfer
2. **Implement pagination**: Use `skip` and `take` for large datasets
3. **Aggregate server-side**: Use Prisma's `groupBy` for aggregations
4. **Monitor performance**: Use the provided performance wrapper functions
5. **Cache responses**: Implement caching for frequently accessed data

## Troubleshooting

### Model not loading
```bash
# Check available models
docker exec manufacturing-ollama ollama list

# Pull model manually
docker exec manufacturing-ollama ollama pull phi3:mini
```

### Out of memory
- Reduce `OLLAMA_NUM_PARALLEL` to 1
- Use smaller models (gemma:2b)
- Increase Docker memory limits

### Slow responses
- Ensure models are pre-loaded with `OLLAMA_KEEP_ALIVE`
- Use smaller models for simple queries
- Check system resources with `docker stats`