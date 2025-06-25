# AlertManager Setup Guide

## Overview

AlertManager handles alerts sent by Prometheus and routes them to the correct receiver (email, Slack, PagerDuty, etc.). It's now included by default in the manufacturing analytics platform.

## Quick Start

Run the complete monitoring stack:

```cmd
START-ALL-MONITORING.cmd
```

This will start:
- ✅ PostgreSQL
- ✅ Prometheus  
- ✅ **AlertManager** (New!)
- ✅ Loki
- ✅ Jaeger

## AlertManager Features

### 1. **Alert Routing**
- Routes alerts based on severity, category, and labels
- Different teams get relevant alerts (manufacturing, ops, security)
- Time-based routing (business hours vs after-hours)

### 2. **Alert Grouping**
- Groups similar alerts to reduce noise
- Configurable group wait/interval times
- Prevents alert storms

### 3. **Inhibition Rules**
- Suppresses lower-priority alerts when critical alerts fire
- Example: If equipment fails, suppress performance warnings

### 4. **Notification Channels**
Configured receivers:
- **Email**: For all alert severities
- **Slack**: Real-time notifications to channels
- **PagerDuty**: For critical alerts requiring immediate response
- **Webhooks**: Integration with your platform

## Configuration

### Main Configuration
Location: `monitoring/alertmanager/alertmanager.yml`

Key sections:
- **Global**: SMTP settings, API keys
- **Route**: Alert routing tree
- **Receivers**: Notification channels
- **Inhibit Rules**: Alert suppression logic

### Manufacturing-Specific Routes

1. **Critical Manufacturing Alerts**
   - Immediate notification (0s group wait)
   - Goes to: Email, Slack (#manufacturing-critical), PagerDuty
   - Examples: OEE < 50%, Equipment failure, Production stopped

2. **Manufacturing Warnings**
   - 30s group wait
   - Goes to: Email, Slack (#manufacturing-warnings)
   - Examples: OEE < 65%, High cycle time

3. **Equipment Alerts**
   - Routed to equipment team
   - Includes equipment ID in notifications

4. **Quality Alerts**
   - Always active (24/7)
   - Immediate action required
   - Quality team notifications

## Alert Rules

Manufacturing alerts are defined in:
`monitoring/prometheus/rules/manufacturing-alerts.yml`

Categories:
- **OEE Alerts**: Overall Equipment Effectiveness monitoring
- **Availability Alerts**: Equipment uptime tracking
- **Performance Alerts**: Production rate and efficiency
- **Quality Alerts**: Defect rates and quality metrics
- **Equipment Alerts**: Temperature, vibration, maintenance
- **System Alerts**: Infrastructure and database health

## Setting Up Notifications

### Email Configuration
Update `.env` with SMTP settings:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@yourcompany.com
SMTP_PASSWORD=your-app-password
```

### Slack Integration
1. Create a Slack webhook: https://api.slack.com/messaging/webhooks
2. Add to `.env`:
```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### PagerDuty Integration
1. Get your PagerDuty integration key
2. Add to `.env`:
```env
PAGERDUTY_MANUFACTURING_KEY=your-integration-key
```

## Testing Alerts

1. **Trigger a test alert**:
```bash
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {
      "alertname": "Test_Alert",
      "severity": "warning",
      "category": "manufacturing"
    },
    "annotations": {
      "summary": "Test alert from manufacturing platform",
      "description": "This is a test alert to verify AlertManager is working"
    }
  }]'
```

2. **Check AlertManager UI**:
   - Open http://localhost:9093
   - View active alerts
   - Check silences and inhibitions

3. **View in Platform**:
   - Go to http://localhost:3000/monitoring
   - AlertManager should show as "✅ Up"
   - Active alerts appear in the monitoring dashboard

## Troubleshooting

### AlertManager Shows as "Down"
1. Check if container is running:
   ```cmd
   docker ps | findstr alertmanager
   ```

2. Check logs:
   ```cmd
   docker logs manufacturing-alertmanager
   ```

3. Verify configuration:
   ```cmd
   docker exec manufacturing-alertmanager amtool check-config /etc/alertmanager/alertmanager.yml
   ```

### Alerts Not Being Received
1. Check Prometheus is sending alerts:
   - Open http://localhost:9090/alerts
   - Verify alerts are in "FIRING" state

2. Check AlertManager is receiving:
   - Open http://localhost:9093/#/alerts
   - Alerts should appear here

3. Check receiver configuration:
   - Verify SMTP/Slack credentials
   - Check network connectivity

### Port Conflicts
If port 9093 is in use:
1. Update docker-compose.yml:
   ```yaml
   ports:
     - "9094:9093"  # Changed external port
   ```

2. Update .env:
   ```env
   ALERTMANAGER_URL=http://localhost:9094
   ```

## Production Considerations

1. **Persistent Storage**: AlertManager data is persisted in `alertmanager-data` volume
2. **High Availability**: Can run multiple AlertManager instances with mesh networking
3. **Security**: Add authentication for production use
4. **Backup**: Regular backup of AlertManager configuration and silences

## Integration with Platform

The platform integrates with AlertManager via:
- Webhook receivers at `/api/monitoring/alerts/*`
- Real-time alert display on monitoring page
- Alert history stored in PostgreSQL
- Alert acknowledgment workflow

## Next Steps

1. Customize alert rules for your equipment
2. Set up notification channels
3. Create runbooks for critical alerts
4. Test alert workflows
5. Configure business hours routing

AlertManager is now fully integrated and ready to handle your manufacturing alerts! 🚨