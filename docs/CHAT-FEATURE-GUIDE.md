# Manufacturing Chat Feature Guide

## Overview

The Manufacturing Chat feature provides an AI-powered assistant that can query and analyze data from the Prisma database, offering insights about equipment status, production metrics, maintenance schedules, and quality data.

## Architecture

### Components

1. **Frontend**
   - `/src/app/manufacturing-chat/page.tsx` - Main chat interface
   - `/src/app/manufacturing-chat/[id]/page.tsx` - Individual chat sessions
   - `/src/components/chat/*` - Reusable chat components

2. **Backend**
   - `/src/app/api/chat/route.ts` - Chat API endpoint
   - `/src/services/chatService.ts` - Chat service layer
   - Prisma integration for database queries

3. **AI Integration**
   - Ollama for local LLM inference
   - Context-aware responses based on database data
   - Fallback to helpful messages if Ollama is unavailable

## Setup Instructions

### 1. Start Required Services

```bash
# Start PostgreSQL and Ollama
docker-compose up -d postgres ollama

# Verify services are running
docker-compose ps
```

### 2. Configure Ollama

```bash
# Run the setup script
./scripts/setup-ollama.sh

# Or manually pull a model
curl -X POST http://localhost:11434/api/pull -d '{"name": "llama2"}' -H "Content-Type: application/json"
```

### 3. Environment Configuration

Add to your `.env` file:
```env
OLLAMA_API_URL=http://localhost:11434
OLLAMA_MODEL=llama2  # or mistral, neural-chat, tinyllama
```

### 4. Seed Test Data

```bash
# Ensure database has sample data
npx prisma db seed
```

## Features

### 1. Context-Aware Queries

The chat understands and retrieves data for:
- **Equipment**: Status, OEE metrics, performance data
- **Production Lines**: Active orders, throughput, efficiency
- **Maintenance**: Schedules, history, upcoming tasks
- **Quality**: Defect rates, inspection results, trends
- **Alerts**: Active issues, severity levels, affected equipment
- **Sensors**: Real-time metrics, temperature, pressure data

### 2. Sample Queries

- "Show me all operational equipment"
- "What's the current OEE for Production Line 3?"
- "List upcoming maintenance schedules"
- "What are the quality metrics for the past week?"
- "Show me active alerts sorted by severity"
- "What's the temperature trend for CNC Machine 1?"

### 3. Intelligent Responses

The system:
- Queries relevant database tables based on user input
- Provides context-specific data in responses
- Falls back gracefully if AI service is unavailable
- Maintains conversation history per session

## Testing

### 1. Run Playwright E2E Tests

```bash
# Run chat-specific tests
npm run test:e2e -- manufacturing-chat

# Run all E2E tests
npm run test:e2e
```

### 2. Run Integration Tests

```bash
# Run chat integration tests
npm run test:integration -- chat

# Run all integration tests
npm run test:integration
```

### 3. Manual Testing Checklist

- [ ] Navigate to `/manufacturing-chat`
- [ ] Create a new chat session
- [ ] Ask about equipment status
- [ ] Query production metrics
- [ ] Check maintenance schedules
- [ ] Request quality data
- [ ] Test error handling (stop Ollama and try)
- [ ] Verify chat history persistence
- [ ] Test sample questions functionality

## API Reference

### POST /api/chat

Request:
```json
{
  "sessionId": "session-123",
  "messages": [
    {
      "role": "user",
      "content": "What's the OEE for CNC Machine 1?"
    }
  ]
}
```

Response:
```json
{
  "message": {
    "role": "assistant",
    "content": "The current OEE for CNC Machine 1 is 85.7%..."
  },
  "context": {
    "equipment": [
      {
        "id": "equip-1",
        "name": "CNC Machine 1",
        "latestOEE": 0.857
      }
    ]
  }
}
```

## Troubleshooting

### Ollama Not Responding

1. Check if Ollama is running:
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. Check Docker logs:
   ```bash
   docker-compose logs ollama
   ```

3. Restart Ollama:
   ```bash
   docker-compose restart ollama
   ```

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   docker-compose ps postgres
   ```

2. Check database connection:
   ```bash
   npx prisma db push
   ```

3. Reset and seed database:
   ```bash
   npx prisma db push --force-reset
   npx prisma db seed
   ```

### Chat Not Loading

1. Check browser console for errors
2. Verify API endpoint is accessible:
   ```bash
   curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"sessionId": "test", "messages": [{"role": "user", "content": "test"}]}'
   ```

3. Check Next.js server logs

## Performance Optimization

1. **Database Queries**
   - Indexes are configured for common query patterns
   - Use `take` limits in Prisma queries
   - Aggregate data server-side

2. **Ollama Configuration**
   - Choose appropriate model size (tinyllama for speed, llama2 for quality)
   - Adjust `num_predict` for response length
   - Use lower temperature for consistent responses

3. **Caching**
   - Session history is cached client-side
   - Consider Redis for production deployments

## Security Considerations

1. **Input Validation**
   - All user inputs are validated with Zod schemas
   - SQL injection prevented by Prisma

2. **Rate Limiting**
   - Implement rate limiting in production
   - Monitor API usage

3. **Data Access**
   - Ensure proper authentication before production deployment
   - Consider row-level security for multi-tenant scenarios

## Future Enhancements

1. **Streaming Responses**
   - Implement SSE for real-time AI responses
   - Show typing indicators

2. **Voice Interface**
   - Add speech-to-text input
   - Text-to-speech for responses

3. **Advanced Analytics**
   - Predictive maintenance recommendations
   - Anomaly detection alerts
   - Production optimization suggestions

4. **Multi-language Support**
   - Translate queries and responses
   - Localized date/time formats

## Conclusion

The Manufacturing Chat feature provides a powerful interface for querying and analyzing manufacturing data. With Ollama integration and Prisma database access, it offers intelligent, context-aware assistance for manufacturing operations.