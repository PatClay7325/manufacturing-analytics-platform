# Quick Access to ISO 22400 OEE Dashboard

## 🚀 Direct Links

### Option 1: Open Grafana Directly (Recommended)
```
http://localhost:3001/d/iso22400-oee-metrics/iso-22400-oee-metrics-dashboard
```
- Login: admin/admin
- Full Grafana interface
- All features available

### Option 2: Next.js Embedded View
```
http://localhost:3000/grafana/oee-dashboard
```
- Embedded in your application
- May have module loading issues

## 🛠️ If You Get Errors

### Module Not Found Errors
These are hot-reload issues. Try:
1. Stop the dev server (Ctrl+C)
2. Clear Next.js cache:
   ```bash
   rm -rf .next
   ```
3. Restart:
   ```bash
   npm run dev
   ```

### No Data Showing
Data has been seeded! Check:
1. Time range (top right) - set to "Last 7 days"
2. Refresh the page
3. Check Grafana datasource is "Manufacturing PostgreSQL"

## 📊 Dashboard Features

Your dashboard shows:
- **OEE Trends**: 5 equipment units over time
- **Current OEE**: 83.3% average
- **Equipment Rankings**: EQ003 leads at 87.3%
- **Component Analysis**: Availability, Performance, Quality
- **Detailed Table**: All ISO 22400 metrics

## ✅ Data Summary

- **Date Range**: Last 90 days
- **Equipment**: EQ001-EQ005
- **Records**: 1,232 performance metrics
- **Shifts**: Morning, Afternoon, Night

## 🎯 Quick Test Query

To verify data in PostgreSQL:
```bash
psql $DATABASE_URL -c "SELECT equipment_id, ROUND(AVG(oee)*100) as avg_oee FROM vw_iso22400_oee_metrics GROUP BY equipment_id ORDER BY avg_oee DESC;"
```

Expected output:
```
 equipment_id | avg_oee
--------------+---------
 EQ003        |      87
 EQ001        |      85
 EQ004        |      83
 EQ002        |      82
 EQ005        |      81
```