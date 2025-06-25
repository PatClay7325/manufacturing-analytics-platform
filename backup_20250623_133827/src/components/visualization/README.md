# Custom Visualization Components

This directory contains our proprietary visualization components designed specifically for manufacturing analytics. These components are original implementations that do not use or depend on manufacturingPlatform.

## Components

### Core Components
- **TimeSeriesChart**: For displaying production metrics over time
- **GaugeChart**: For OEE percentages and utilization rates
- **HeatmapChart**: For equipment efficiency visualization
- **ParetoChart**: For quality defect analysis
- **ManufacturingKPICard**: For displaying key metrics

### Manufacturing-Specific
- **OEEDashboard**: Overall Equipment Effectiveness visualization
- **SPCChart**: Statistical Process Control charts
- **EnergyMonitor**: Energy consumption tracking
- **MaintenanceSchedule**: Gantt-style maintenance planning

## Implementation Notes

All components are built using:
- React with TypeScript
- Recharts/Chart.js for base charting
- Custom SVG for specialized visualizations
- CSS-in-JS for styling
- Real-time WebSocket updates

## Usage

Each component follows a consistent API:
```tsx
<ComponentName
  data={data}
  config={config}
  onUpdate={handleUpdate}
  theme={theme}
/>
```