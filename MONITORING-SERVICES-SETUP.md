# Monitoring Services Setup Guide

## Overview

This manufacturing analytics platform includes **Loki** and **Jaeger** as default monitoring services. Both are Apache 2.0 licensed and free for commercial use.

- **Loki**: Log aggregation system for collecting and querying logs
- **Jaeger**: Distributed tracing for monitoring request flows

## Quick Start

### Windows
```cmd
START-MONITORING-SERVICES.cmd
```

### Linux/Mac
```bash
./scripts/start-monitoring-services.sh
```

## Service URLs

Once running, access the services at:

- **Loki**: http://localhost:3100
- **Jaeger UI**: http://localhost:16686
- **Platform Monitoring**: http://localhost:3000/monitoring

## Docker Compose Configuration

The services are configured in `docker-compose.yml`:

```yaml
# Loki - Log Aggregation
loki:
  image: manufacturingPlatform/loki:2.9.0
  ports:
    - "3100:3100"
  volumes:
    - ./monitoring/loki/loki-config.yml:/etc/loki/local-config.yaml
  restart: unless-stopped

# Jaeger - Distributed Tracing
jaeger:
  image: jaegertracing/all-in-one:1.51
  ports:
    - "16686:16686"  # UI
    - "14268:14268"  # HTTP collector
    - "14250:14250"  # gRPC collector
  restart: unless-stopped
```

## Starting Services Manually

```bash
# Start both services
docker-compose up -d loki jaeger

# Check status
docker-compose ps loki jaeger

# View logs
docker-compose logs -f loki
docker-compose logs -f jaeger
```

## Integration with Platform

### Logging to Loki

The platform automatically sends logs to Loki. Configure in your environment:

```env
LOKI_URL=http://localhost:3100
```

### Tracing with Jaeger

Enable distributed tracing:

```env
JAEGER_URL=http://localhost:16686
ENABLE_TRACING=true
```

## Monitoring Page Status

The platform's monitoring page (`/monitoring`) shows real-time status of these services:

- ✅ **Up**: Service is running and healthy
- ❌ **Down**: Service is not accessible
- ⚠️ **Degraded**: Service is partially available

## Troubleshooting

### Services Show as "Down"

1. Ensure Docker is running
2. Start the services: `docker-compose up -d loki jaeger`
3. Check logs: `docker-compose logs loki jaeger`
4. Verify ports are not in use: `netstat -an | grep 3100`

### Port Conflicts

If ports are already in use, update the port mappings in `docker-compose.yml`:

```yaml
loki:
  ports:
    - "3101:3100"  # Changed from 3100
```

Then update your `.env` file:
```env
LOKI_URL=http://localhost:3101
```

## Data Retention

- **Loki**: Configured for 30-day retention (see `monitoring/loki/loki-config.yml`)
- **Jaeger**: In-memory storage with 10,000 trace limit

## Production Deployment

For production, consider:

1. **Persistent Storage**: Add volume mounts for data persistence
2. **External Storage**: Configure Loki with S3 or similar
3. **Jaeger Backend**: Use Elasticsearch or Cassandra for trace storage
4. **Security**: Add authentication and TLS

## Disabling Services (Optional)

If you don't need these services, comment them out in `docker-compose.yml`:

```yaml
# loki:
#   image: manufacturingPlatform/loki:2.9.0
#   ...

# jaeger:
#   image: jaegertracing/all-in-one:1.51
#   ...
```

## License Compliance

Both Loki and Jaeger are Apache 2.0 licensed:
- ✅ Free for commercial use
- ✅ No licensing fees
- ✅ Can modify and distribute
- ✅ No attribution required in UI

You are fully compliant with all terms of use!