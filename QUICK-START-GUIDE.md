# Manufacturing Analytics Platform - Quick Start Guide

## 🚀 Application URLs

- **Next.js Application**: http://localhost:3000
- **Grafana Dashboards**: http://localhost:3001 (admin/admin)

## 📋 Key Pages in Next.js

1. **Home Page** (http://localhost:3000)
   - Overview of all features
   - Quick links to main sections
   - System status indicators

2. **Dashboards** (http://localhost:3000/dashboards)
   - Links to Grafana dashboards
   - Manufacturing overview page

3. **Manufacturing Dashboard** (http://localhost:3000/dashboards/manufacturing)
   - Embedded Grafana dashboards
   - Integrated monitoring view
   - Production overview

4. **Equipment Management** (http://localhost:3000/equipment)
   - Equipment status and details
   - Maintenance tracking

5. **AI Chat Assistant** (http://localhost:3000/manufacturing-chat)
   - AI-powered manufacturing insights
   - Real-time assistance

6. **Alerts** (http://localhost:3000/alerts)
   - System alerts and notifications
   - Alert management

7. **Data Upload** (http://localhost:3000/data-upload)
   - Import manufacturing data
   - CSV/Excel upload

## 🎯 Grafana Dashboards

Access Grafana directly for full dashboard capabilities:

1. **Integrated Manufacturing Monitoring**
   - UID: `integrated-monitoring`
   - Comprehensive manufacturing metrics

2. **Manufacturing Production Overview**
   - UID: `manufacturing-production`
   - Production metrics and OEE

3. **Quick Manufacturing Overview**
   - UID: `ccebdaa3-e4d4-492a-86cd-3cf46aecc0e3`
   - At-a-glance metrics

4. **Docker and System Monitoring**
   - UID: `a6f51ec5-2f07-474d-bfd7-36c9c57db801`
   - Container and system metrics

## 🛠️ Common Tasks

### View Embedded Dashboards
1. Navigate to http://localhost:3000/dashboards/manufacturing
2. Dashboards will load inline
3. Click "Open Grafana" for full access

### Access Grafana Directly
1. Go to http://localhost:3001
2. Login with admin/admin
3. Browse all dashboards
4. Create/edit dashboards
5. Configure data sources

### Check System Status
```bash
# Check all containers
docker ps

# View Grafana logs
docker logs manufacturing-grafana -f

# Check database
docker exec -it postgres psql -U postgres -d manufacturing
```

### Restart Services
```bash
# Restart Grafana
docker restart manufacturing-grafana

# Restart all services
docker-compose -f docker-compose.yml -f docker-compose.grafana.yml restart
```

## 🔧 Troubleshooting

### Grafana dashboards not loading?
1. Check Grafana is running: `docker ps | grep grafana`
2. Verify URL in browser: http://localhost:3001
3. Check logs: `docker logs manufacturing-grafana`

### API errors in console?
- The Grafana proxy errors are normal if you haven't configured all dashboards
- Focus on the working dashboards listed above

### Want to create new dashboards?
1. Access Grafana at http://localhost:3001
2. Click "+" → "Dashboard"
3. Add panels and configure queries
4. Save with appropriate tags

## 📊 Data Flow

```
PostgreSQL (5432) → Grafana (3001) → Embedded in Next.js (3000)
     ↑                    ↑
     |                    |
Manufacturing Data    Prometheus, Loki, etc.
```

## 🎉 Next Steps

1. Explore the manufacturing dashboards
2. Test the AI chat assistant
3. Upload some test data
4. Create custom Grafana dashboards
5. Configure alerts in Grafana

Remember: The Next.js app handles manufacturing-specific features, while Grafana handles all analytics and visualizations!