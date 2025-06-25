# ISO-Ready Agent System

A production-grade, ISO-compliant multi-agent platform for manufacturing analytics with full observability, security, and reliability.

## Overview

This system provides intelligent agents for manufacturing operations, including:
- **Intent Classification**: Semantic understanding of manufacturing queries
- **ISO Compliance Mapping**: Automatic mapping to relevant ISO standards
- **Memory Management**: Automated data retention and cleanup
- **Full Observability**: OpenTelemetry integration for tracing and metrics
- **Enterprise Security**: JWT/API key auth with rate limiting

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Docker (optional)

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
# Required
DATABASE_URL="postgresql://user:pass@localhost:5432/manufacturing"
AUTH_TOKEN_SALT="your-32-character-or-longer-secret"
EMBED_API_URL="https://your-embedding-service/api/embed"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# Optional
OTEL_EXPORTER_ENDPOINT="https://otel-collector:4318"
ENABLE_TRACING=true
ENABLE_METRICS=true
```

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

### Docker Deployment

```bash
# Build image
docker build -t manufacturing-analytics .

# Run with environment file
docker run -p 3000:3000 --env-file .env manufacturing-analytics
```

## Architecture

### Agents

#### Intent Classifier Agent
Classifies user input into manufacturing-specific intents using semantic embeddings.

```typescript
POST /api/agents/classify
{
  "sessionId": "unique-session-id",
  "input": "Show me the OEE for line 1"
}
```

#### ISO Compliance Agent
Maps intents to relevant ISO standards with compliance guidance.

```typescript
POST /api/agents/iso-compliance
{
  "intent": "analyze-oee",
  "includeMetrics": true
}
```

#### Memory Pruner Agent
Manages data retention with configurable cleanup policies.

```typescript
POST /api/agents/memory/prune
{
  "retentionDays": 30,
  "pruneSessionMemory": true
}
```

### Security

- **Authentication**: JWT tokens, API keys, or NextAuth sessions
- **Authorization**: Role-based permissions (admin, manager, operator, viewer)
- **Rate Limiting**: Configurable per endpoint
- **Input Sanitization**: XSS prevention
- **Audit Trail**: All operations logged

### Observability

- **Tracing**: OpenTelemetry distributed tracing
- **Metrics**: Custom metrics for agent operations
- **Logging**: Structured JSON logging with Pino
- **Health Checks**: `/api/health` endpoint

## API Reference

See [OpenAPI Specification](./docs/api/openapi.yaml) for complete API documentation.

### Authentication

Include one of:
- Bearer token: `Authorization: Bearer <jwt-token>`
- API key: `X-API-Key: <api-key>`

### Rate Limits

- Standard endpoints: 100 requests/minute
- Auth endpoints: 5 requests/15 minutes
- AI endpoints: 20 requests/minute

## ISO Standards Support

| Standard | Description | Use Cases |
|----------|-------------|-----------|
| ISO 22400-2 | KPIs for Manufacturing | OEE, Performance, Quality |
| ISO 9001 | Quality Management | Quality control, Process improvement |
| ISO 14224 | Reliability & Maintenance | MTBF/MTTR, Failure analysis |
| ISO 50001 | Energy Management | Energy monitoring, Efficiency |
| ISO 14001 | Environmental Management | Waste, Emissions tracking |
| ISO 45001 | OH&S Management | Safety metrics, Incidents |
| ISO 55000 | Asset Management | Asset performance, Lifecycle |

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# All tests with coverage
npm test -- --coverage
```

## Monitoring

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Metrics
When OpenTelemetry is enabled, metrics are exported to your configured endpoint.

### Logs
Structured logs are output to stdout in JSON format.

## Troubleshooting

### Database Connection Issues
1. Verify PostgreSQL is running
2. Check DATABASE_URL format
3. Ensure migrations are applied

### Rate Limiting
- Check X-RateLimit headers in responses
- Implement exponential backoff
- Consider upgrading rate limits

### Memory Issues
- Monitor heap usage via health endpoint
- Adjust Node.js memory limits
- Configure aggressive pruning

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

[MIT License](./LICENSE)

## Support

- Documentation: [/docs](./docs)
- Issues: [GitHub Issues](https://github.com/org/repo/issues)
- Email: support@manufacturing-analytics.com