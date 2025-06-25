# Apache Superset Quick Start Guide

## ✅ Current Status
Apache Superset is running successfully at http://localhost:8088

## 🔐 Login Credentials
- **Username**: admin
- **Password**: admin

## 🗄️ Database Connections

### Manufacturing Database (TimescaleDB)
When adding the database in Superset, use:
```
postgresql://postgres:postgres@timescaledb:5432/manufacturing
```

**Important**: Use `timescaledb` as the hostname (not `localhost`) because Superset runs inside Docker.

## 📊 Creating Your First Dashboard

1. **Add the Database Connection**:
   - Navigate to Data → Databases → + Database
   - Select PostgreSQL
   - Paste the connection string above
   - Test Connection → Connect

2. **Create a Dataset**:
   - Go to Data → Datasets → + Dataset
   - Select your database and schema
   - Choose a table
   - Save

3. **Create Charts**:
   - Go to Charts → + Chart
   - Select your dataset
   - Choose visualization type
   - Configure and save

4. **Build Dashboard**:
   - Go to Dashboards → + Dashboard
   - Drag and drop charts
   - Arrange layout
   - Save and share

## 🏭 Manufacturing-Specific Features

### Sample Queries for Manufacturing Data

**Production Metrics**:
```sql
SELECT 
  date_trunc('hour', timestamp) as hour,
  SUM(production_count) as total_production,
  AVG(oee_score) as avg_oee
FROM production_metrics
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

**Equipment Status**:
```sql
SELECT 
  equipment_id,
  status,
  COUNT(*) as count
FROM equipment_status
GROUP BY equipment_id, status;
```

## 🔧 Troubleshooting

### Can't Access Superset?
- Use Incognito/Private browsing mode
- Clear browser cookies for localhost
- Check if running: `docker ps | grep superset`

### Database Connection Failed?
- Ensure you're using `timescaledb` as hostname (not `localhost`)
- Check database is running: `docker ps | grep timescale`
- Verify credentials: postgres/postgres

### Need to Restart?
```bash
docker-compose -f docker-compose.superset-only.yml restart
```

## 🚀 Next Steps

1. **Import Manufacturing Dashboards**:
   ```bash
   docker exec -it manufacturing-superset superset import-dashboards -p /app/superset_home/dashboards/manufacturing-overview.json
   ```

2. **Set Up Alerts**:
   - Go to Alerts & Reports
   - Create conditions for production thresholds
   - Configure email/Slack notifications

3. **Enable Row Level Security**:
   - Useful for multi-tenant manufacturing facilities
   - Configure in Settings → Row Level Security

4. **Optimize Performance**:
   - Enable query caching
   - Set up thumbnail caching
   - Configure async queries for large datasets

## 📚 Resources

- [Superset Documentation](https://superset.apache.org/docs/intro)
- [TimescaleDB Best Practices](https://docs.timescale.com/timescaledb/latest/)
- [Manufacturing Analytics Examples](https://superset.apache.org/docs/miscellaneous/gallery)

---

**License**: Apache Superset is Apache 2.0 licensed - fully compliant for commercial use!