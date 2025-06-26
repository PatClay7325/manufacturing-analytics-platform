# External Systems Integration Guide

## Overview

This guide covers the setup and configuration of SAP and Ignition SCADA system integrations for the Manufacturing Analytics Platform.

## Table of Contents

1. [SAP Integration](#sap-integration)
2. [Ignition Integration](#ignition-integration)
3. [Testing Connections](#testing-connections)
4. [Troubleshooting](#troubleshooting)
5. [Security Best Practices](#security-best-practices)

---

## SAP Integration

### Prerequisites

1. **SAP RFC User**: Create a dedicated RFC user in SAP with appropriate permissions
2. **Network Access**: Ensure the application server can reach the SAP system
3. **Firewall Rules**: Open required ports (typically 3300-3399 for SAP)

### Required Authorizations

The SAP RFC user needs the following authorizations:

```
S_RFC - RFC access
S_TABU_DIS - Table display authorization
```

Specific BAPIs required:
- `PM_EQUIPMENT_GET_LIST` - Equipment master data
- `PM_ORDER_GET_LIST` - Maintenance work orders
- `BAPI_PRODORD_GET_DETAIL` - Production order details
- `QM_INSPECTION_LOT_GET` - Quality inspection data

### Configuration

Add these environment variables to your `.env.local`:

```bash
# SAP Connection Settings
SAP_HOST=sap-prod.company.com
SAP_SYSTEM_NUMBER=00
SAP_CLIENT=100
SAP_USER=RFC_USER
SAP_PASSWORD=your_secure_password
SAP_LANGUAGE=EN
SAP_POOL_SIZE=5
SAP_CONNECTION_TIMEOUT=30000
```

### Connection Pool Settings

- **SAP_POOL_SIZE**: Number of concurrent connections (default: 5)
- **SAP_PEAK_LIMIT**: Maximum connections during peak load (default: 10)
- **SAP_IDLE_TIMEOUT**: Connection idle timeout in ms (default: 300000)

---

## Ignition Integration

### Prerequisites

1. **WebDev Module**: Ensure Ignition has the WebDev module installed
2. **API Access**: Create API endpoints in Ignition for data access
3. **Authentication**: Generate API keys for secure access

### Ignition Setup Steps

1. **Create WebDev Resources**:
   ```python
   # In Ignition, create these WebDev endpoints:
   # /system/webdev/Manufacturing/tags/read
   # /system/webdev/Manufacturing/tags/write
   # /system/webdev/Manufacturing/tags/history
   # /system/webdev/Manufacturing/tags/browse
   # /system/webdev/Manufacturing/alarms/active
   # /system/webdev/Manufacturing/namedQuery/execute
   ```

2. **Configure Security**:
   - Enable authentication on WebDev resources
   - Create API tokens for the manufacturing platform
   - Set appropriate role-based permissions

3. **Create Named Queries**:
   ```sql
   -- Example: Get Equipment Status
   SELECT 
     equipment_id,
     status,
     last_update
   FROM equipment_status
   WHERE plant = :plant
   ```

### Configuration

Add these environment variables to your `.env.local`:

```bash
# Ignition Connection Settings
IGNITION_GATEWAY_URL=http://ignition.company.com:8088
IGNITION_API_KEY=your_api_key_here
IGNITION_PROJECT_NAME=Manufacturing
IGNITION_POLL_INTERVAL=5000
IGNITION_REQUEST_TIMEOUT=10000
IGNITION_MAX_RETRIES=3
```

### Available Tag Paths

Common Ignition tag patterns:
```
[Provider]Folder/Equipment/Tag
[default]Manufacturing/Line1/OEE/Current
[default]Manufacturing/Line1/Production/Count
[default]Manufacturing/Line1/Quality/DefectRate
```

---

## Testing Connections

### Quick Test

Run the connection test script:

```bash
npm run test:connections
```

Or manually:

```bash
node scripts/test-external-connections.js
```

### API Test Endpoints

Test connections via API:

```bash
# Test all connections
curl http://localhost:3000/api/test-connections

# Test specific SAP query
curl -X POST http://localhost:3000/api/test-connections \
  -H "Content-Type: application/json" \
  -d '{
    "system": "SAP",
    "query": "equipment",
    "parameters": { "plant": "1000" }
  }'

# Test Ignition tag read
curl -X POST http://localhost:3000/api/test-connections \
  -H "Content-Type: application/json" \
  -d '{
    "system": "Ignition",
    "query": "readTags",
    "parameters": {
      "tagPaths": ["[System]Gateway/Performance/CPU Usage"]
    }
  }'
```

### Expected Results

Successful connection test output:
```
🔌 Testing External System Connections

Connection Test Results:
============================================================

Summary:
  Total Systems: 2
  Configured: 2
  Connected: 2

SAP:
  ✓ Configured
  ✓ Connected
  ⏱ Latency: 245ms
  📋 Test Query: PM_EQUIPMENT_GET_LIST
  ✓ Query Successful
  📊 Sample Equipment:
    - EQ-001: CNC Milling Machine
    - EQ-002: Welding Robot
  📊 Total Records: 2

Ignition:
  ✓ Configured
  ✓ Connected
  ⏱ Latency: 156ms
  📋 Test Query: Read system tags
  ✓ Query Successful
  📊 System Tags:
    - [System]Gateway/Performance/CPU Usage: 15.2 (Q:192)
  📊 Available Paths: 12
```

---

## Troubleshooting

### SAP Connection Issues

1. **Connection Timeout**
   - Check network connectivity: `ping sap-host.company.com`
   - Verify firewall rules allow SAP ports
   - Increase `SAP_CONNECTION_TIMEOUT`

2. **Authentication Failed**
   - Verify RFC user credentials
   - Check user is not locked in SAP
   - Ensure correct client number

3. **Authorization Error**
   - Grant required authorizations to RFC user
   - Check S_RFC authorization object

### Ignition Connection Issues

1. **Connection Refused**
   - Verify Ignition Gateway is running
   - Check WebDev module is installed
   - Confirm correct gateway URL and port

2. **401 Unauthorized**
   - Regenerate API key in Ignition
   - Verify API key is correctly configured
   - Check WebDev resource security settings

3. **Tag Not Found**
   - Use tag browser to verify tag paths
   - Check tag provider name
   - Ensure project name matches configuration

### Common Network Issues

```bash
# Test network connectivity
nc -zv sap-host.company.com 3300
nc -zv ignition.company.com 8088

# Check DNS resolution
nslookup sap-host.company.com
nslookup ignition.company.com

# Test with curl
curl -I http://ignition.company.com:8088/system/webdev/
```

---

## Security Best Practices

### Credential Management

1. **Never commit credentials** to version control
2. **Use dedicated service accounts** with minimal permissions
3. **Rotate credentials regularly** (every 90 days)
4. **Monitor access logs** for unauthorized attempts

### Network Security

1. **Use HTTPS** for Ignition connections when possible
2. **Implement IP whitelisting** on external systems
3. **Use VPN or private networks** for SAP access
4. **Enable audit logging** on both SAP and Ignition

### Application Security

1. **Validate all input** from external systems
2. **Implement rate limiting** on API endpoints
3. **Use connection pooling** to prevent resource exhaustion
4. **Handle errors gracefully** without exposing system details

### Monitoring

Set up monitoring for:
- Connection failures
- Authentication errors
- Slow response times
- Unusual query patterns

Example monitoring query:
```sql
SELECT 
  system_name,
  COUNT(*) as error_count,
  MAX(error_timestamp) as last_error
FROM system_connection_logs
WHERE status = 'error'
  AND error_timestamp > NOW() - INTERVAL '1 hour'
GROUP BY system_name;
```

---

## Next Steps

1. Configure environment variables for your systems
2. Run connection tests to verify setup
3. Implement data synchronization schedules
4. Set up monitoring and alerting
5. Document system-specific configurations

For additional support, contact the system administrators for:
- SAP: sap-admin@company.com
- Ignition: scada-admin@company.com