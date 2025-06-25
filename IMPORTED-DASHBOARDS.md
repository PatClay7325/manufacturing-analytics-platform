# Imported Grafana Dashboards

## ✅ Successfully Imported Dashboards

You now have 14 dashboards available in Grafana, imported from your existing project files:

### 🏭 Manufacturing Dashboards

1. **Manufacturing Overview - OEE & KPIs** (`manufacturing-overview`)
   - Overall Equipment Effectiveness (OEE)
   - Availability, Performance, Quality metrics
   - Real-time production KPIs
   - Downtime analysis

2. **Equipment Monitoring Dashboard** (`eccf7a2c-5fbe-4965-bd12-d9cbf4df6ba3`)
   - Equipment status and health
   - Maintenance schedules
   - Performance trends
   - Alert history

3. **Production Overview Dashboard** (`df5db14d-c600-4785-bff9-67ab9d0ab1eb`)
   - Production line metrics
   - Shift-based analysis
   - Product quality metrics
   - Facility comparisons

4. **Variable System Demo** (`variable-demo`)
   - Dynamic facility selection
   - Production line filtering
   - Shift-based views
   - Template variable examples

### 📊 System Monitoring Dashboards

5. **System Health & Infrastructure Monitoring** (`system-health-monitoring`)
   - Server health metrics
   - Resource utilization
   - Network performance
   - Service availability

6. **Real-Time System Monitoring** (`prometheus-realtime-001`)
   - Live Prometheus metrics
   - Alert status
   - System performance
   - Resource trends

7. **Prometheus Test Dashboard** (`prometheus-test-001`)
   - Test queries and panels
   - Metric exploration
   - Query debugging

### 🔄 Previously Created Dashboards

8. **Integrated Manufacturing Monitoring** (`integrated-monitoring`)
9. **Manufacturing Production Overview** (`manufacturing-production`)
10. **Quick Manufacturing Overview** (`ccebdaa3-e4d4-492a-86cd-3cf46aecc0e3`)
11. **Docker and System Monitoring** (`a6f51ec5-2f07-474d-bfd7-36c9c57db801`)
12. **Observability Overview** (`observability-overview`)

## 📍 How to Access

### From Next.js Application
1. **Manufacturing Dashboard Page**: http://localhost:3000/dashboards/manufacturing
   - Shows embedded versions of key dashboards
   
2. **All Dashboards Page**: http://localhost:3000/dashboards/all
   - Browse all available dashboards
   - Links to open in Grafana or view embedded

### From Grafana Directly
1. Go to http://localhost:3001
2. Login with admin/admin
3. Navigate to Dashboards → Browse
4. Dashboards are organized in folders:
   - Manufacturing Dashboards
   - System Monitoring

## 🔧 Dashboard Features

Many of these dashboards include:
- **Template Variables**: Filter by facility, production line, shift
- **Time Range Selection**: Analyze different time periods
- **Auto-refresh**: Real-time data updates
- **Drill-down**: Click on panels for detailed views
- **Annotations**: Mark important events
- **Alerts**: Configure thresholds and notifications

## 📝 Notes

- Some dashboards may show "No Data" if the corresponding metrics aren't being collected
- You can edit any dashboard in Grafana to customize for your needs
- Create copies before making major changes
- The PostgreSQL and Prometheus datasources are already configured

## 🚀 Next Steps

1. **Explore the dashboards** to see what metrics are available
2. **Configure data collection** for any missing metrics
3. **Customize dashboards** to match your specific needs
4. **Set up alerts** for critical metrics
5. **Create new dashboards** for specific use cases