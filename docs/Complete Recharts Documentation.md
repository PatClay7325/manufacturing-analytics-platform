# Complete Recharts Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Chart Components](#chart-components)
4. [Chart Types](#chart-types)
5. [Data Format](#data-format)
6. [Customization](#customization)
7. [Animations](#animations)
8. [Responsive Design](#responsive-design)
9. [Events and Interactivity](#events-and-interactivity)
10. [Custom Components](#custom-components)
11. [Performance Optimization](#performance-optimization)
12. [Manufacturing Examples](#manufacturing-examples)
13. [Migration from Highcharts](#migration-from-highcharts)
14. [API Reference](#api-reference)
15. [Best Practices](#best-practices)

---

## Introduction

Recharts is a composable charting library built on React components for building flexible charts with decoupled, reusable React components. It leverages the power of SVG and D3 submodules for calculations and drawing.

### Key Features
- Built on top of React components
- Native SVG support
- Lightweight and customizable
- Animation support
- TypeScript support
- No external dependencies except React
- Responsive charts
- Server-side rendering support
- Easy to customize with props

---

## Getting Started

### Installation

```bash
npm install recharts
```

or with yarn:

```bash
yarn add recharts
```

### Basic Usage

```jsx
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const data = [
  { name: 'Page A', uv: 4000, pv: 2400, amt: 2400 },
  { name: 'Page B', uv: 3000, pv: 1398, amt: 2210 },
  { name: 'Page C', uv: 2000, pv: 9800, amt: 2290 },
  { name: 'Page D', uv: 2780, pv: 3908, amt: 2000 },
  { name: 'Page E', uv: 1890, pv: 4800, amt: 2181 },
  { name: 'Page F', uv: 2390, pv: 3800, amt: 2500 },
  { name: 'Page G', uv: 3490, pv: 4300, amt: 2100 },
];

export default function SimpleLineChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="pv" stroke="#8884d8" activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="uv" stroke="#82ca9d" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

---

## Chart Components

### Container Components
- `ResponsiveContainer`: Makes charts responsive to parent container
- `Surface`: Low-level container for drawing

### Layout Components
- `CartesianGrid`: Grid lines for cartesian charts
- `PolarGrid`: Grid for polar charts
- `XAxis`, `YAxis`, `ZAxis`: Axis components
- `PolarAngleAxis`, `PolarRadiusAxis`: Polar coordinate axes

### Chart Components
- `LineChart`: Line charts
- `AreaChart`: Area charts
- `BarChart`: Bar and column charts
- `ComposedChart`: Combination of different chart types
- `PieChart`: Pie and donut charts
- `RadarChart`: Radar/spider charts
- `RadialBarChart`: Radial/circular bar charts
- `ScatterChart`: Scatter plots
- `Treemap`: Hierarchical data visualization
- `Sankey`: Flow diagrams
- `Funnel`: Funnel charts

### Series Components
- `Line`: Line series
- `Area`: Area series
- `Bar`: Bar series
- `Scatter`: Scatter series
- `Pie`: Pie series
- `Radar`: Radar series
- `RadialBar`: Radial bar series

### Auxiliary Components
- `Tooltip`: Interactive tooltips
- `Legend`: Chart legends
- `Brush`: Data selection/zoom
- `ReferenceArea`: Highlight areas
- `ReferenceLine`: Reference lines
- `ReferenceDot`: Reference points
- `ErrorBar`: Error bars for data points
- `Cell`: Individual cells in bar/pie charts

---

## Chart Types

### Line Charts
```jsx
<LineChart data={data}>
  <Line type="monotone" dataKey="value" stroke="#8884d8" />
  <Line type="basis" dataKey="value2" stroke="#82ca9d" />
  <Line type="step" dataKey="value3" stroke="#ffc658" />
</LineChart>
```

Line types: `basis`, `basisClosed`, `basisOpen`, `linear`, `linearClosed`, `natural`, `monotoneX`, `monotoneY`, `monotone`, `step`, `stepBefore`, `stepAfter`

### Area Charts
```jsx
<AreaChart data={data}>
  <Area type="monotone" dataKey="uv" stackId="1" stroke="#8884d8" fill="#8884d8" />
  <Area type="monotone" dataKey="pv" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
</AreaChart>
```

### Bar Charts
```jsx
<BarChart data={data}>
  <Bar dataKey="pv" fill="#8884d8" />
  <Bar dataKey="uv" fill="#82ca9d" />
</BarChart>
```

### Composed Charts
```jsx
<ComposedChart data={data}>
  <Bar dataKey="uv" barSize={20} fill="#413ea0" />
  <Line type="monotone" dataKey="pv" stroke="#ff7300" />
  <Area type="monotone" dataKey="amt" fill="#8884d8" stroke="#8884d8" />
</ComposedChart>
```

### Pie Charts
```jsx
<PieChart>
  <Pie
    data={data}
    cx={200}
    cy={200}
    labelLine={false}
    label={renderCustomizedLabel}
    outerRadius={80}
    fill="#8884d8"
    dataKey="value"
  >
    {data.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
    ))}
  </Pie>
</PieChart>
```

---

## Data Format

### Basic Format
```javascript
const data = [
  { name: 'Jan', sales: 4000, orders: 2400 },
  { name: 'Feb', sales: 3000, orders: 1398 },
  { name: 'Mar', sales: 2000, orders: 9800 },
];
```

### Time Series Data
```javascript
const data = [
  { timestamp: 1640995200000, value: 100 },
  { timestamp: 1641081600000, value: 120 },
  { timestamp: 1641168000000, value: 115 },
];

// In the chart:
<XAxis 
  dataKey="timestamp" 
  domain={['dataMin', 'dataMax']}
  type="number"
  tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()}
/>
```

### Nested Data
```javascript
const data = [
  { name: 'Page A', desktop: { value: 4000 }, mobile: { value: 2400 } },
  { name: 'Page B', desktop: { value: 3000 }, mobile: { value: 1398 } },
];

// Access nested values:
<Line dataKey="desktop.value" />
```

---

## Customization

### Colors and Styling
```jsx
<Line 
  type="monotone" 
  dataKey="pv" 
  stroke="#8884d8"
  strokeWidth={2}
  strokeDasharray="5 5"
  dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }}
  activeDot={{ r: 8 }}
/>
```

### Custom Tooltips
```jsx
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label">{`${label} : ${payload[0].value}`}</p>
        <p className="intro">{getIntroOfPage(label)}</p>
      </div>
    );
  }
  return null;
};

<Tooltip content={<CustomTooltip />} />
```

### Custom Labels
```jsx
const renderCustomizedLabel = ({
  cx, cy, midAngle, innerRadius, outerRadius, percent
}) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};
```

---

## Animations

### Entry Animations
```jsx
<Line 
  type="monotone" 
  dataKey="pv" 
  stroke="#8884d8"
  animationBegin={0}
  animationDuration={1500}
  animationEasing="ease-in-out"
/>
```

### Update Animations
```jsx
<LineChart data={data} isAnimationActive={true}>
  <Line isAnimationActive={true} animationDuration={300} />
</LineChart>
```

### Custom Animation
```jsx
import { Spring } from 'react-spring/renderprops';

<Spring from={{ opacity: 0 }} to={{ opacity: 1 }}>
  {props => (
    <div style={props}>
      <LineChart data={data}>
        {/* chart content */}
      </LineChart>
    </div>
  )}
</Spring>
```

---

## Responsive Design

### ResponsiveContainer
```jsx
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={data}>
    {/* chart content */}
  </LineChart>
</ResponsiveContainer>
```

### Aspect Ratio
```jsx
<ResponsiveContainer width="100%" aspect={16/9}>
  <LineChart data={data}>
    {/* chart content */}
  </LineChart>
</ResponsiveContainer>
```

### Dynamic Sizing
```jsx
const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

useEffect(() => {
  const handleResize = () => {
    setDimensions({
      width: window.innerWidth,
      height: window.innerHeight * 0.5
    });
  };
  
  window.addEventListener('resize', handleResize);
  handleResize();
  
  return () => window.removeEventListener('resize', handleResize);
}, []);

<LineChart width={dimensions.width} height={dimensions.height} data={data}>
  {/* chart content */}
</LineChart>
```

---

## Events and Interactivity

### Click Events
```jsx
<Bar 
  dataKey="pv" 
  fill="#8884d8"
  onClick={(data, index) => {
    console.log(`Clicked bar ${index} with data:`, data);
  }}
/>
```

### Mouse Events
```jsx
<LineChart
  onMouseEnter={(e) => console.log('Mouse entered chart')}
  onMouseLeave={(e) => console.log('Mouse left chart')}
  onMouseMove={(e) => console.log('Mouse coordinates:', e)}
>
  {/* chart content */}
</LineChart>
```

### Custom Cursors
```jsx
<Tooltip 
  cursor={{ stroke: 'red', strokeWidth: 2 }}
  position={{ x: 100, y: 140 }}
/>
```

---

## Custom Components

### Custom Shapes
```jsx
const CustomBarShape = (props) => {
  const { fill, x, y, width, height } = props;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} />
      <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle">
        {props.value}
      </text>
    </g>
  );
};

<Bar dataKey="pv" fill="#8884d8" shape={<CustomBarShape />} />
```

### Custom Dots
```jsx
const CustomDot = (props) => {
  const { cx, cy, value } = props;
  
  if (value > 2500) {
    return (
      <svg x={cx - 10} y={cy - 10} width={20} height={20}>
        <g transform="translate(10 10)">
          <circle r="10" fill="red" />
          <text textAnchor="middle" fill="white" fontSize="10">!</text>
        </g>
      </svg>
    );
  }
  
  return <circle cx={cx} cy={cy} r={4} fill="#8884d8" />;
};

<Line type="monotone" dataKey="pv" stroke="#8884d8" dot={<CustomDot />} />
```

---

## Performance Optimization

### Data Reduction
```jsx
// Reduce data points for large datasets
const reduceData = (data, maxPoints = 100) => {
  if (data.length <= maxPoints) return data;
  
  const step = Math.ceil(data.length / maxPoints);
  return data.filter((_, index) => index % step === 0);
};
```

### Memoization
```jsx
import { useMemo } from 'react';

const ChartComponent = ({ data }) => {
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      calculatedValue: item.value * 1.1
    }));
  }, [data]);
  
  return (
    <LineChart data={processedData}>
      {/* chart content */}
    </LineChart>
  );
};
```

### Lazy Loading
```jsx
const LazyChart = lazy(() => import('./ComplexChart'));

<Suspense fallback={<div>Loading chart...</div>}>
  <LazyChart data={data} />
</Suspense>
```

---

## Manufacturing Examples

### OEE Dashboard
```jsx
const OEEChart = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend />
        <Bar yAxisId="left" dataKey="production" fill="#8884d8" />
        <Line yAxisId="right" type="monotone" dataKey="oee" stroke="#ff7300" />
        <Line yAxisId="right" type="monotone" dataKey="availability" stroke="#82ca9d" strokeDasharray="5 5" />
        <Line yAxisId="right" type="monotone" dataKey="performance" stroke="#ffc658" strokeDasharray="5 5" />
        <Line yAxisId="right" type="monotone" dataKey="quality" stroke="#ff0000" strokeDasharray="5 5" />
      </ComposedChart>
    </ResponsiveContainer>
  );
};
```

### Production Tracking
```jsx
const ProductionTracker = ({ data, target }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorProduction" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="hour" />
        <YAxis />
        <Tooltip />
        <Area type="monotone" dataKey="production" stroke="#8884d8" fillOpacity={1} fill="url(#colorProduction)" />
        <ReferenceLine y={target} label="Target" stroke="red" strokeDasharray="3 3" />
      </AreaChart>
    </ResponsiveContainer>
  );
};
```

### Equipment Status
```jsx
const EquipmentStatus = ({ data }) => {
  const COLORS = {
    operational: '#00C49F',
    maintenance: '#FFBB28',
    offline: '#FF8042'
  };
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.status]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};
```

---

## Migration from Highcharts

### Key Differences
1. **Component-Based**: Recharts uses React components instead of configuration objects
2. **Data Format**: Recharts uses flat array of objects instead of separate categories/series
3. **Styling**: Props-based styling instead of nested configuration
4. **Animations**: Built-in animation support with simpler API
5. **Responsiveness**: ResponsiveContainer component instead of chart.reflow()

### Migration Examples

#### Highcharts Line Chart
```javascript
// Highcharts
Highcharts.chart('container', {
  title: { text: 'Production Trend' },
  xAxis: { categories: ['Jan', 'Feb', 'Mar'] },
  series: [{
    name: 'Production',
    data: [100, 120, 115]
  }]
});
```

#### Recharts Equivalent
```jsx
// Recharts
const data = [
  { month: 'Jan', production: 100 },
  { month: 'Feb', production: 120 },
  { month: 'Mar', production: 115 }
];

<LineChart data={data}>
  <XAxis dataKey="month" />
  <YAxis />
  <Line type="monotone" dataKey="production" stroke="#8884d8" />
</LineChart>
```

### Common Patterns

#### Multiple Series
```jsx
// Highcharts: Multiple series in array
// Recharts: Multiple Line/Bar components
<LineChart data={data}>
  <Line dataKey="series1" stroke="#8884d8" />
  <Line dataKey="series2" stroke="#82ca9d" />
</LineChart>
```

#### Custom Colors
```jsx
// Highcharts: colors array or series.color
// Recharts: stroke/fill props
<Line stroke="#ff7300" fill="#ff7300" />
```

#### Tooltips
```jsx
// Highcharts: tooltip.formatter function
// Recharts: Custom component
<Tooltip content={<CustomTooltip />} />
```

---

## API Reference

### Common Props

#### Chart Components
- `width`: Chart width (number)
- `height`: Chart height (number)
- `data`: Array of data objects
- `margin`: Object with top, right, bottom, left
- `onClick`: Click event handler
- `onMouseEnter`: Mouse enter handler
- `onMouseLeave`: Mouse leave handler

#### Axis Props
- `dataKey`: Key in data objects
- `type`: 'number' | 'category'
- `domain`: ['dataMin', 'dataMax'] or [min, max]
- `tickFormatter`: Function to format tick labels
- `interval`: Tick interval
- `ticks`: Array of custom tick values

#### Series Props
- `dataKey`: Key in data objects
- `stroke`: Line color
- `strokeWidth`: Line width
- `fill`: Fill color
- `dot`: Boolean or custom component
- `activeDot`: Active dot configuration
- `type`: Line interpolation type

---

## Best Practices

### 1. Use ResponsiveContainer
Always wrap charts in ResponsiveContainer for responsive design:
```jsx
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={data}>
    {/* content */}
  </LineChart>
</ResponsiveContainer>
```

### 2. Optimize Large Datasets
- Reduce data points for performance
- Use React.memo for chart components
- Implement pagination or virtualization

### 3. Consistent Color Schemes
Define color constants:
```javascript
const COLORS = {
  primary: '#8884d8',
  secondary: '#82ca9d',
  danger: '#ff7300',
  warning: '#ffc658'
};
```

### 4. Error Handling
```jsx
const SafeChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div>No data available</div>;
  }
  
  return (
    <LineChart data={data}>
      {/* chart content */}
    </LineChart>
  );
};
```

### 5. Accessibility
- Add descriptive titles
- Use aria-label attributes
- Provide alternative text descriptions
- Ensure color contrast

### 6. TypeScript Support
```typescript
interface ChartData {
  name: string;
  value: number;
  timestamp: number;
}

const MyChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
  return (
    <LineChart data={data}>
      <Line dataKey="value" />
    </LineChart>
  );
};
```

---

## Resources

- [Official Documentation](https://recharts.org/)
- [GitHub Repository](https://github.com/recharts/recharts)
- [Examples](https://recharts.org/en-US/examples)
- [API Reference](https://recharts.org/en-US/api)
- [Storybook](https://recharts.org/storybook)