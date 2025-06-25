# Custom Grafana Panels for Manufacturing Analytics

This guide describes the custom Grafana panels created specifically for manufacturing analytics use cases.

## Overview

We've developed four specialized Grafana panels that extend the platform's capabilities for industrial monitoring:

1. **OEE Waterfall Panel** - Visualizes Overall Equipment Effectiveness losses
2. **Andon Board Panel** - Real-time equipment status display
3. **SPC Chart Panel** - Statistical Process Control charts
4. **Pareto Analysis Panel** - Defect analysis and prioritization

## Installation

### Automated Installation

Run the build script to compile and install all plugins:

```bash
cd grafana/plugins
./build-plugins.sh
```

### Manual Installation

For each plugin:

```bash
cd grafana/plugins/<plugin-name>
npm install --legacy-peer-deps
npm run build
sudo cp -r dist /var/lib/grafana/plugins/manufacturing-<plugin-name>
sudo systemctl restart grafana-server
```

## Panel Descriptions

### 1. OEE Waterfall Panel

The OEE Waterfall panel visualizes how planned production time is reduced through various losses to arrive at the final OEE percentage.

**Features:**
- Waterfall visualization showing availability, performance, and quality losses
- Configurable colors for each loss category
- Vertical and horizontal orientations
- Optional percentage labels
- Real-time data updates

**Configuration Options:**
- `showLossCategories`: Display loss category labels
- `showPercentages`: Show percentage values
- `orientation`: Vertical or horizontal layout
- Color customization for each loss type

**Data Requirements:**
Query must return fields named:
- `availability` (0-1 range)
- `performance` (0-1 range)
- `quality` (0-1 range)
- `oee` (0-1 range)

**Example Query:**
```sql
SELECT
  AVG(CASE WHEN metric_name = 'availability' THEN metric_value END) as availability,
  AVG(CASE WHEN metric_name = 'performance' THEN metric_value END) as performance,
  AVG(CASE WHEN metric_name = 'quality' THEN metric_value END) as quality,
  AVG(CASE WHEN metric_name = 'oee' THEN metric_value END) as oee
FROM manufacturing_metrics
WHERE timestamp > NOW() - INTERVAL '1 hour'
```

### 2. Andon Board Panel

The Andon Board panel provides a real-time visual status display for multiple equipment units, similar to traditional manufacturing floor Andon boards.

**Features:**
- Grid layout with configurable columns
- Color-coded status indicators (Running, Idle, Down, Maintenance)
- Optional blinking for critical status
- Display of key metrics (OEE, production count)
- Last update timestamp
- Responsive design

**Configuration Options:**
- `columns`: Number of columns in the grid
- `showTimestamp`: Display last update time
- `showMetrics`: Show OEE and production metrics
- `enableBlinking`: Blink on critical status
- Field mappings for data source
- Custom colors for each status

**Data Requirements:**
Query must return fields:
- Equipment name/ID (configurable field name)
- Status (running/idle/down/maintenance)
- OEE value (optional)
- Production count (optional)

**Example Query:**
```sql
SELECT DISTINCT ON (e.id)
  e.name as equipment_name,
  es.status,
  m.metric_value as oee,
  p.metric_value as production_count
FROM equipment e
LEFT JOIN equipment_status es ON e.id = es.equipment_id
LEFT JOIN LATERAL (
  SELECT metric_value 
  FROM manufacturing_metrics 
  WHERE equipment_id = e.id AND metric_name = 'oee'
  ORDER BY timestamp DESC LIMIT 1
) m ON true
LEFT JOIN LATERAL (
  SELECT metric_value 
  FROM manufacturing_metrics 
  WHERE equipment_id = e.id AND metric_name = 'production_count'
  ORDER BY timestamp DESC LIMIT 1
) p ON true
ORDER BY e.id, es.timestamp DESC
```

### 3. SPC Chart Panel

The SPC (Statistical Process Control) Chart panel implements various control charts used in quality management and Six Sigma initiatives.

**Features:**
- Multiple chart types:
  - X-bar R Chart (averages with range)
  - X-bar S Chart (averages with standard deviation)
  - I-MR Chart (individuals and moving range)
  - P Chart (proportion defective)
  - NP Chart (number defective)
  - C Chart (defects per unit)
  - U Chart (defects per unit with varying sample size)
- Automatic control limit calculation
- Western Electric rules for violation detection
- Process capability indices (Cp, Cpk)
- Visual violation highlighting
- Statistical summary display

**Configuration Options:**
- `chartType`: Select the type of control chart
- `subgroupSize`: Sample size for grouped charts
- `showCenterLine`: Display center line
- `showControlLimits`: Show UCL/LCL
- `showWarningLimits`: Show 2-sigma limits
- `westernElectricRules`: Enable specific detection rules
- Color customization

**Data Requirements:**
Time series data with:
- Timestamp field
- Numeric measurement field
- Optional subgroup data for X-bar charts

**Example Query:**
```sql
SELECT
  timestamp,
  measurement_value
FROM quality_measurements
WHERE 
  parameter_name = 'dimension_a' AND
  timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp
```

### 4. Pareto Analysis Panel

The Pareto Analysis panel creates Pareto charts for defect analysis, helping identify the vital few causes that contribute to the majority of problems.

**Features:**
- Bar chart with cumulative line
- Automatic sorting and percentage calculation
- 80% reference line
- Category grouping (top N + "Other")
- Interactive tooltips
- Configurable appearance

**Configuration Options:**
- `categoryField`: Field containing defect categories
- `valueField`: Field containing counts or costs
- `showCumulativeLine`: Display cumulative percentage line
- `show80PercentLine`: Show 80% reference
- `maxCategories`: Limit displayed categories
- `sortOrder`: Ascending or descending
- Color customization

**Data Requirements:**
Query must return:
- Category field (defect type, cause, etc.)
- Value field (count, cost, duration)

**Example Query:**
```sql
SELECT
  defect_type as defect_type,
  COUNT(*) as count
FROM quality_defects
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY defect_type
```

## Usage in Dashboards

### Adding Custom Panels

1. Edit your dashboard in Grafana
2. Click "Add panel"
3. Search for "Manufacturing" in the visualization picker
4. Select the desired custom panel
5. Configure your data source query
6. Adjust panel options as needed

### Best Practices

1. **Data Refresh**: Set appropriate refresh intervals based on data update frequency
2. **Time Ranges**: Use relative time ranges for dynamic dashboards
3. **Variables**: Leverage Grafana variables for equipment selection
4. **Alerts**: Combine with Grafana alerts for notifications
5. **Mobile View**: Test responsive layouts for mobile access

### Example Dashboard Layouts

#### Production Overview
```
+------------------+------------------+------------------+
|  OEE Waterfall   |   Current OEE    |  Production Rate |
|                  |     (Gauge)      |     (Stat)       |
+------------------+------------------+------------------+
|              Andon Board (Full Width)                   |
+-------------------------------------------------------+
|          OEE Trend (Time Series)                      |
+-------------------------------------------------------+
```

#### Quality Dashboard
```
+-------------------------+-------------------------+
|    SPC Chart (X-bar R)  |   Pareto Analysis      |
|                         |                         |
+-------------------------+-------------------------+
|    Defect Trend         |   Quality Metrics      |
|    (Time Series)        |   (Stats)              |
+-------------------------+-------------------------+
```

## Troubleshooting

### Panel Not Appearing
1. Check plugin installation: `ls /var/lib/grafana/plugins/`
2. Verify Grafana logs: `sudo journalctl -u grafana-server -f`
3. Restart Grafana: `sudo systemctl restart grafana-server`

### Data Not Displaying
1. Test your query in Grafana's query inspector
2. Verify field names match panel expectations
3. Check data types (numeric vs string)
4. Ensure time range contains data

### Performance Issues
1. Optimize queries with appropriate indexes
2. Use time bucketing for large datasets
3. Limit the number of series displayed
4. Consider using continuous aggregates

## Development

### Creating New Panels

1. Copy an existing panel as a template
2. Update `plugin.json` with new metadata
3. Modify the React components
4. Add configuration options
5. Build and test

### Testing
```bash
# Development mode with hot reload
cd grafana/plugins/<plugin-name>
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## API Reference

### Panel Props
All panels receive standard Grafana panel props:
```typescript
interface PanelProps<T> {
  options: T;           // Panel-specific options
  data: PanelData;      // Query results
  width: number;        // Panel width
  height: number;       // Panel height
  timeRange: TimeRange; // Selected time range
  timeZone: string;     // User timezone
}
```

### Data Format
Query results are provided in Grafana's standard format:
```typescript
interface PanelData {
  series: DataFrame[];  // Array of data frames
  state: LoadingState;  // Loading state
  error?: DataQueryError; // Error if any
}
```

## Contributing

To contribute new manufacturing-specific panels:

1. Fork the repository
2. Create a feature branch
3. Develop and test your panel
4. Submit a pull request
5. Include documentation and examples

## License

These custom panels are part of the Manufacturing Analytics Platform and are licensed under the same terms as the main project.