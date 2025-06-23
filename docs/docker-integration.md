# Manufacturing Intelligence Platform - Docker Integration

This document describes the Docker services integrated with the Manufacturing Intelligence Platform and how to use them.

## Overview

The platform integrates with the following Docker services:

1. **PostgreSQL** - Database for storing manufacturing data
2. **Ollama** - LLM service for AI-powered insights
3. **Prometheus** - Metrics collection and storage
4. **Analytics** - Visualization dashboards
5. **Node Exporter** - System metrics collection
6. **Metrics Simulator** - Generates sample manufacturing metrics

## Docker Configuration

All services are defined in the `docker-compose.yml` file in the project root. The services are configured to work together and expose the necessary ports.

### Network Configuration

All services are connected to the `manufacturing-network` Docker network to enable communication between containers.

### Volume Mounts

- **PostgreSQL**: Data is persisted in the `postgres-data` volume
- **Ollama**: Model data is stored in the `ollama-data` volume
- **Prometheus**: Metrics data is stored in the `prometheus-data` volume
- **Analytics**: Dashboard configurations are stored in the `manufacturingPlatform-data` volume

## Usage Instructions

### Starting the Services

```bash
# Start all services
docker-compose up -d

# Start a specific service
docker-compose up -d postgres

# Check service status
docker-compose ps
```

### Accessing Services

- **PostgreSQL**: Available at `localhost:5432`
  - Username: postgres
  - Password: postgres
  - Database: manufacturing

- **Ollama**: Available at `localhost:11434`
  - API endpoint: http://localhost:11434/api/generate

- **Prometheus**: Available at `http://localhost:9090`
  - Metrics endpoint: http://localhost:9090/metrics

- **Analytics**: Available at `http://localhost:3003`
  - Username: admin
  - Password: admin

### Simulated Manufacturing Metrics

The platform includes a metrics simulator that generates realistic manufacturing data for:

- OEE (Overall Equipment Effectiveness)
- Equipment availability, performance, and quality
- Production counts
- Defect rates and types
- Downtime reasons
- Failure modes (ISO 14224 compliant)

These metrics are automatically collected by Prometheus and can be visualized in Analytics.

## Integration with Next.js Application

The Next.js application integrates with the Docker services as follows:

1. **PostgreSQL**: Connected via Prisma ORM using the DATABASE_URL environment variable
2. **Ollama**: Connected via HTTP API for AI-powered insights
3. **Analytics**: Dashboards are embedded in the application using iframe integration

### Environment Configuration

Create a `.env.local` file with the following variables to connect to the services:

```
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/manufacturing

# Ollama
OLLAMA_HOST=http://localhost:11434

# Analytics
MANUFACTURING_PLATFORM_URL=http://localhost:3003
```

## Customizing the Configuration

### Adding Custom Models to Ollama

To add custom models to Ollama:

```bash
# Pull manufacturing-specific model
docker exec -it manufacturing-ollama ollama pull llama2

# Create custom manufacturing model
docker exec -it manufacturing-ollama ollama create manufacturing-intelligence -f Modelfile
```

### Adding Custom Analytics Dashboards

To add custom dashboards to Analytics, place JSON dashboard files in the `monitoring/manufacturingPlatform/dashboards` directory and update the dashboard provisioning configuration.

## Troubleshooting

### Checking Logs

```bash
# View logs for all services
docker-compose logs

# View logs for a specific service
docker-compose logs -f postgres

# Check Ollama status
docker-compose exec ollama ollama list
```

### Common Issues

1. **PostgreSQL Connection Issues**
   - Check if the PostgreSQL container is running
   - Verify the connection string in the .env file
   - Ensure the database has been properly initialized

2. **Ollama Model Loading Issues**
   - Ensure the Ollama container has enough memory allocated
   - Check if the model has been correctly pulled

3. **Prometheus Metrics Not Showing**
   - Verify the Prometheus configuration
   - Check if the metrics simulator is running and sending data