# Complete Highcharts Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Chart Concepts](#chart-concepts)
4. [Chart and Series Types](#chart-and-series-types)
5. [Advanced Chart Features](#advanced-chart-features)
6. [Working with Data](#working-with-data)
7. [Chart Design and Style](#chart-design-and-style)
8. [Export Module](#export-module)
9. [Accessibility](#accessibility)
10. [Stock Charts](#stock-charts)
11. [Maps](#maps)
12. [Dashboards](#dashboards)
13. [Gantt Charts](#gantt-charts)
14. [Grid](#grid)
15. [Audio Charts](#audio-charts)
16. [Extending Highcharts](#extending-highcharts)
17. [Framework Integrations](#framework-integrations)
18. [API Reference](#api-reference)
19. [Best Practices](#best-practices)

---

## Introduction

Highcharts is a comprehensive JavaScript charting library that enables developers to create interactive and customizable data visualizations for web applications. With extensive configuration options, multiple chart types, and specialized products for different use cases, Highcharts provides complete solutions for data visualization needs.

### Key Features
- Over 40 different chart types
- Standalone JavaScript library (no dependencies)
- Cross-browser compatibility
- Extensive customization options
- Multiple specialized products (Stock, Maps, Gantt, Dashboards, Grid)
- Strong accessibility support
- Export functionality
- Responsive design capabilities

---

## Getting Started

### Installation Methods

#### 1. CDN Loading
```html
<script src="https://code.highcharts.com/highcharts.js"></script>
```

For specific versions:
```html
<script src="https://code.highcharts.com/12/highcharts.js"></script>
```

#### 2. NPM Installation
```bash
npm install highcharts --save
```

Basic require loading:
```javascript
var Highcharts = require('highcharts');
require('highcharts/modules/exporting');
Highcharts.chart('container', { /* options */ });
```

Loading specific packages:
- `highcharts/highstock`
- `highcharts/highmaps`
- `highcharts/highcharts-gantt`

#### 3. ES6 Modules Installation
Direct browser loading:
```javascript
import Chart from 'https://code.highcharts.com/es-modules/Core/Chart/Chart.js';
import LineSeries from 'https://code.highcharts.com/es-modules/Series/Line/LineSeries.js';

new Chart('container', { series: [{ data: [1, 2, 3] }] });
```

Custom Webpack bundle:
```javascript
import Chart from 'highcharts/es-modules/Core/Chart/Chart.js';
import LineSeries from 'highcharts/es-modules/Series/Line/LineSeries.js';
import DataLabel from 'highcharts/es-modules/Core/Series/DataLabel.js';

DataLabel.compose(LineSeries);
const myChart = new Chart('container', {
    series: [{ type: 'line', data: [1, 2, 3] }]
});
```

**Benefits of ES6 Modules:**
- Tree shaking reduces bundle size
- Modular loading of specific chart types
- Direct ES module support

#### 4. Self-Hosted Server
```html
<script src="/js/highcharts.js"></script>
```

### System Requirements

#### Browser Compatibility
- **Firefox:** 2.0+
- **Chrome:** 1.0+
- **Safari:** 4.0+
- **Opera:** 9.0+
- **Edge:** 12.0+
- **Internet Explorer:** 9.0+
- **Android Browser:** 3.0+

For IE 11 and older browsers:
```html
<script src="https://code.highcharts.com/es5/highcharts.js"></script>
<script src="https://code.highcharts.com/es5/modules/exporting.js"></script>
```

### Your First Chart

#### HTML Setup
```html
<div id="container" style="width:100%; height:400px;"></div>
```

#### JavaScript Initialization
```javascript
document.addEventListener('DOMContentLoaded', function () {
    const chart = Highcharts.chart('container', {
        chart: { type: 'bar' },
        title: { text: 'Fruit Consumption' },
        xAxis: { categories: ['Apples', 'Bananas', 'Oranges'] },
        yAxis: { title: { text: 'Fruit eaten' } },
        series: [
            { name: 'Jane', data: [1, 0, 4] },
            { name: 'John', data: [5, 7, 3] }
        ]
    });
});
```

### Setting Options

#### Options Object Structure
```javascript
const chart = Highcharts.chart('container', {
    chart: { type: 'bar' },
    title: { text: 'My Chart' },
    series: [{ data: [1, 2, 3] }]
});
```

#### Global Options
```javascript
Highcharts.setOptions({
    colors: ['#058DC7', '#50B432', '#ED561B'],
    chart: {
        backgroundColor: '#f0f0f0'
    }
});
```

#### Modifying Options
Options can be extended after creation:
```javascript
options.series.push({ name: 'New Series', data: [4, 5, 6] });
```

---

## Chart Concepts

### Understanding Highcharts

Highcharts charts consist of several key components:

1. **Title**: Descriptive text at the top of the chart
2. **Series**: The actual data presented on the chart
3. **Tooltip**: Information display on data point hover
4. **Legend**: Shows data series with enable/disable functionality
5. **Axes**: Measure and categorize data (typically x and y)

### Title and Subtitle Configuration

```javascript
title: {
    text: 'My custom title',
    align: 'center',
    margin: 20,
    style: {
        fontSize: '16px'
    }
},
subtitle: {
    text: 'My custom subtitle',
    align: 'center'
}
```

**Key Features:**
- Adaptive alignment (centered for short text, scaled for long)
- Automatic text wrapping
- Dynamic modification using `Chart.setTitle()`
- Minimum scale control with `title.minScale` (default: 0.67)

### Axes Configuration

#### Axis Types

1. **Linear** (default)
   - Numbers increase uniformly
   - X-axis shows array index if only y-values provided

2. **Logarithmic**
   - Numbers increase logarithmically
   - Cannot represent zero or negative values
   - Tick intervals based on powers

3. **Datetime**
   - Labels show date/time values
   - Uses milliseconds since Jan 1, 1970 UTC
   - Supports timezone configuration

4. **Categorical**
   - Uses named categories instead of numeric values
   - Best for discrete, non-interpolatable data

#### Configuration Options
```javascript
xAxis: {
    type: 'datetime',
    title: { text: 'Time' },
    categories: ['Jan', 'Feb', 'Mar'],
    tickInterval: 1000 * 60 * 60 * 24, // One day
    gridLineWidth: 1,
    labels: {
        format: '{value:%Y-%m-%d}',
        formatter: function() {
            return Highcharts.dateFormat('%Y-%m-%d', this.value);
        }
    }
}
```

### Series Configuration

Basic series structure:
```javascript
series: [{
    name: 'Series Name',
    type: 'line',
    data: [1, 2, 3, 4, 5],
    color: '#FF0000',
    animation: true
}]
```

#### Data Formats
1. **Simple numerical values**: `[1, 2, 3, 4]`
2. **Arrays with coordinates**: `[[0, 1], [1, 2], [2, 3]]`
3. **Objects with properties**: `[{x: 0, y: 1, color: 'red'}, {x: 1, y: 2}]`

#### Key Configuration Options
- Animation control
- Color customization
- Point selection behavior
- Line width and style
- Stacking options
- Data labels
- Zones for conditional styling

### Labels and String Formatting

#### Format Strings (Recommended)
```javascript
xAxis: {
    labels: {
        format: '{value:%Y-%m-%d}'
    }
},
tooltip: {
    pointFormat: '<b>{series.name}</b>: {point.y}'
}
```

#### Formatter Callbacks
```javascript
tooltip: {
    formatter: function() {
        return '<b>' + this.series.name + '</b><br>' +
               Highcharts.dateFormat('%Y-%m-%d', this.x) + ': ' +
               Highcharts.numberFormat(this.y, 2);
    }
}
```

#### HTML Support
Limited HTML tags supported: `<a>`, `<b>`, `<strong>`, `<i>`, `<em>`, `<br/>`, `<span>`

Use `useHTML: true` for full HTML rendering (with security filtering).

### Plot Bands and Plot Lines

Visual elements added to chart axes:

```javascript
xAxis: {
    plotBands: [{
        color: 'orange',
        from: 3,
        to: 4,
        label: {
            text: 'Weekend',
            align: 'center'
        }
    }],
    plotLines: [{
        color: 'red',
        value: 3,
        width: 2,
        dashStyle: 'shortdash',
        label: {
            text: 'Threshold'
        }
    }]
}
```

**Features:**
- Always perpendicular to their defining axis
- Interactive events (click, mouseover)
- Dynamic manipulation with `addPlotBand()` and `removePlotBand()`
- Special effects in polar charts and gauges

---

## Chart and Series Types

### Line Charts

Represents data points connected by straight lines:

```javascript
chart: {
    type: 'line'
},
plotOptions: {
    line: {
        step: 'left' // Options: 'left', 'center', 'right'
    }
}
```

**Step Line Options:**
- `'left'`: Step before data point
- `'center'`: Step midway through data point
- `'right'`: Step after data point

### Area Charts

Similar to line charts but fills area between line and threshold:

```javascript
chart: {
    type: 'area'
},
plotOptions: {
    area: {
        fillOpacity: 0.5,
        threshold: 0 // Default threshold
    }
}
```

### Column Charts

Displays data as vertical bars:

```javascript
chart: {
    type: 'column'
},
plotOptions: {
    column: {
        pointPadding: 0.2,
        borderWidth: 0,
        groupPadding: 0.1,
        shadow: false
    }
}
```

**Histogram Configuration:**
```javascript
plotOptions: {
    column: {
        pointPadding: 0,
        borderWidth: 0,
        groupPadding: 0,
        shadow: false
    }
}
```

### Pie Charts

Circular charts divided into proportional sectors:

```javascript
chart: {
    type: 'pie'
},
plotOptions: {
    pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.1f} %'
        },
        showInLegend: true
    }
}
```

**Donut Chart:**
Created with multiple pie series:
```javascript
series: [{
    type: 'pie',
    name: 'Outer',
    data: [...],
    size: '60%'
}, {
    type: 'pie',
    name: 'Inner',
    data: [...],
    size: '40%',
    innerSize: '20%'
}]
```

### Additional Chart Types

Highcharts supports 40+ chart types including:

- **Bar charts**: Horizontal orientation of column charts
- **Scatter plots**: Individual data points without connecting lines
- **Bubble charts**: Three-dimensional data representation
- **Spline charts**: Smooth curved lines instead of straight
- **Gauge charts**: Meter-style displays
- **Heatmaps**: Color-coded data matrices
- **Treemaps**: Hierarchical data visualization
- **Sankey diagrams**: Flow visualizations
- **Network graphs**: Relationship mapping
- **3D charts**: Three-dimensional representations

---

## Advanced Chart Features

### Plot Options

Global configuration for series types:

```javascript
plotOptions: {
    series: {
        // Global series settings
        animation: true,
        point: {
            events: {
                click: function() {
                    alert('Point clicked');
                }
            }
        }
    },
    line: {
        // Line-specific settings
        lineWidth: 2,
        marker: {
            enabled: false
        }
    }
}
```

### Dynamic Chart Updates

#### Adding Series
```javascript
chart.addSeries({
    name: 'New Series',
    data: [1, 2, 3, 4, 5]
});
```

#### Adding Points
```javascript
chart.series[0].addPoint([Date.UTC(2023, 0, 1), 100], true, true);
```

#### Updating Points
```javascript
chart.series[0].points[0].update(50);
```

### Events and Interactions

#### Chart Events
```javascript
chart: {
    events: {
        load: function() {
            console.log('Chart loaded');
        },
        redraw: function() {
            console.log('Chart redrawn');
        }
    }
}
```

#### Series Events
```javascript
series: [{
    events: {
        legendItemClick: function() {
            return false; // Prevent default behavior
        }
    }
}]
```

#### Point Events
```javascript
plotOptions: {
    series: {
        point: {
            events: {
                click: function() {
                    alert('Point value: ' + this.y);
                },
                mouseOver: function() {
                    this.graphic.attr({
                        fill: 'red'
                    });
                }
            }
        }
    }
}
```

---

## Working with Data

### Data Input Methods

#### Direct Data Specification
```javascript
series: [{
    data: [1, 2, 3, 4, 5]
}]
```

#### Data from Arrays
```javascript
series: [{
    data: [
        [Date.UTC(2023, 0, 1), 29.9],
        [Date.UTC(2023, 0, 2), 71.5],
        [Date.UTC(2023, 0, 3), 106.4]
    ]
}]
```

#### Data from Objects
```javascript
series: [{
    data: [
        {x: 1, y: 29.9, color: 'red'},
        {x: 2, y: 71.5, name: 'Point 2'},
        {x: 3, y: 106.4, marker: {symbol: 'square'}}
    ]
}]
```

### Data Module

Load data from various sources:

```html
<script src="https://code.highcharts.com/modules/data.js"></script>
```

#### CSV Data
```javascript
data: {
    csvURL: 'data.csv',
    firstRowAsNames: true
}
```

#### HTML Table Data
```javascript
data: {
    table: 'datatable',
    switchRowsAndColumns: true
}
```

#### Google Spreadsheets
```javascript
data: {
    googleSpreadsheetKey: 'your-spreadsheet-key',
    googleSpreadsheetWorksheet: 1
}
```

### Live Data

#### Method 1: Data Module with Polling
```javascript
data: {
    csvURL: 'live-data.csv',
    enablePolling: true,
    dataRefreshRate: 1000 // milliseconds
}
```

#### Method 2: API Methods
```javascript
function requestData() {
    $.getJSON('live-data.json', function(data) {
        chart.series[0].addPoint(data, true, true);
        setTimeout(requestData, 1000);
    });
}

requestData();
```

### Data Preprocessing

Custom data manipulation before chart rendering:

```javascript
data: {
    csvURL: 'data.csv',
    beforeParse: function(csv) {
        return csv.replace(/;/g, ',');
    },
    parsed: function(columns) {
        // Manipulate parsed data
        columns[1] = columns[1].map(function(value) {
            return value * 1000;
        });
    }
}
```

---

## Chart Design and Style

### Layout and Positioning

#### Chart Container
```javascript
chart: {
    width: 600,
    height: 400,
    margin: [70, 50, 60, 80],
    spacing: [10, 10, 15, 10],
    alignTicks: true,
    backgroundColor: '#ffffff',
    borderColor: '#335cad',
    borderRadius: 0,
    borderWidth: 0
}
```

#### Plot Area
```javascript
chart: {
    plotBackgroundColor: null,
    plotBackgroundImage: null,
    plotBorderColor: '#cccccc',
    plotBorderWidth: 0,
    plotShadow: false
}
```

### Color Configuration

#### Solid Colors
```javascript
colors: ['#7cb5ec', '#434348', '#90ed7d', '#f7a35c']
```

#### Linear Gradients
```javascript
color: {
    linearGradient: { x1: 0, x2: 0, y1: 0, y2: 1 },
    stops: [
        [0, '#003399'],
        [1, '#3366AA']
    ]
}
```

#### Radial Gradients
```javascript
color: {
    radialGradient: { cx: 0.5, cy: 0.5, r: 0.5 },
    stops: [
       [0, '#003399'],
       [1, '#3366AA']
    ]
}
```

#### Pattern Fills
```html
<script src="https://code.highcharts.com/modules/pattern-fill.js"></script>
```
```javascript
color: {
    pattern: {
        path: 'M 0 0 L 10 10 M 9 -1 L 11 1 M -1 9 L 1 11',
        width: 10,
        height: 10,
        color: '#000000'
    }
}
```

#### CSS Variables (v12.2+)
```javascript
color: 'var(--primary-color)'
```

### Typography

#### Global Font Settings
```javascript
chart: {
    style: {
        fontFamily: 'serif'
    }
}
```

#### Text Element Styling
```javascript
title: {
    style: {
        color: '#333333',
        fontSize: '18px',
        fontWeight: 'bold'
    }
},
labels: {
    style: {
        color: '#666666',
        fontSize: '12px'
    }
}
```

### Animation

#### Chart-wide Animation
```javascript
chart: {
    animation: {
        duration: 1000,
        easing: 'easeOutBounce'
    }
}
```

#### Series Animation
```javascript
plotOptions: {
    series: {
        animation: {
            duration: 2000
        }
    }
}
```

### Responsive Design

```javascript
responsive: {
    rules: [{
        condition: {
            maxWidth: 500
        },
        chartOptions: {
            legend: {
                layout: 'horizontal',
                align: 'center',
                verticalAlign: 'bottom'
            }
        }
    }]
}
```

---

## Export Module

### Setup

```html
<script src="https://code.highcharts.com/modules/exporting.js"></script>
<script src="https://code.highcharts.com/modules/offline-exporting.js"></script>
<script src="https://code.highcharts.com/modules/export-data.js"></script>
```

### Configuration

```javascript
exporting: {
    enabled: true,
    filename: 'my-chart',
    type: 'image/png',
    width: 600,
    scale: 2,
    buttons: {
        contextButton: {
            menuItems: [
                'downloadPNG',
                'downloadJPEG', 
                'downloadPDF',
                'downloadSVG',
                'separator',
                'downloadCSV',
                'downloadXLS'
            ]
        }
    }
}
```

### Export Formats

- **PNG**: Default format, good for web use
- **JPEG**: Smaller file size, no transparency
- **PDF**: Vector format, scalable
- **SVG**: Vector format, web-compatible
- **CSV**: Data export
- **XLS**: Excel format

### Programmatic Export

```javascript
// Export to PNG
chart.exportChart({
    type: 'image/png',
    filename: 'my-chart'
});

// Export to PDF
chart.exportChart({
    type: 'application/pdf',
    filename: 'my-chart'
});

// Print chart
chart.print();
```

### Custom Export Server

```javascript
exporting: {
    url: 'https://your-export-server.com'
}
```

---

## Accessibility

### Setup

```html
<script src="https://code.highcharts.com/modules/accessibility.js"></script>
```

### Basic Configuration

```javascript
accessibility: {
    enabled: true,
    description: 'Chart showing monthly sales data',
    keyboardNavigation: {
        enabled: true
    },
    announceNewData: {
        enabled: true
    }
}
```

### Essential Accessibility Practices

#### 1. Meaningful Titles
```javascript
title: {
    text: 'Monthly Sales Performance 2023'
},
subtitle: {
    text: 'Data includes all product categories'
}
```

#### 2. Axis Titles
```javascript
xAxis: {
    title: {
        text: 'Month'
    },
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
},
yAxis: {
    title: {
        text: 'Sales (thousands USD)'
    }
}
```

#### 3. Series Names
```javascript
series: [{
    name: 'Product A Sales',
    data: [29.9, 71.5, 106.4, 129.2, 144.0, 176.0]
}, {
    name: 'Product B Sales', 
    data: [194.1, 95.6, 54.4, 29.9, 71.5, 106.4]
}]
```

#### 4. Tooltip Configuration
```javascript
tooltip: {
    valueSuffix: ' thousand USD',
    shared: true
}
```

### Description Methods

#### Linked Description (Recommended)
```html
<p id="chart-description">
    This chart shows the monthly sales performance...
</p>
```
```javascript
accessibility: {
    linkedDescription: '#chart-description'
}
```

#### Chart Caption
```javascript
caption: {
    text: 'Chart showing monthly sales trends with clear seasonal patterns.'
}
```

### Advanced Accessibility Features

#### Keyboard Navigation
```javascript
accessibility: {
    keyboardNavigation: {
        enabled: true,
        focusBorder: {
            enabled: true,
            style: {
                color: '#334eff',
                lineWidth: 2,
                borderRadius: 3
            }
        }
    }
}
```

#### Screen Reader Support
```javascript
accessibility: {
    screenReaderSection: {
        beforeChartFormat: 'Chart titled "{chartTitle}". {typeDescription}. {chartSubtitle}',
        afterChartFormat: 'End of interactive chart.'
    }
}
```

#### High Contrast Mode
```javascript
accessibility: {
    highContrastMode: 'auto', // 'auto', true, false
    highContrastTheme: {
        colors: ['#000000', '#FF0000', '#0000FF', '#00FF00']
    }
}
```

---

## Stock Charts

### Setup

```html
<script src="https://code.highcharts.com/stock/highstock.js"></script>
```

Or as module:
```html
<script src="https://code.highcharts.com/highcharts.js"></script>
<script src="https://code.highcharts.com/stock/modules/stock.js"></script>
```

### Basic Stock Chart

```javascript
Highcharts.stockChart('container', {
    rangeSelector: {
        selected: 1
    },
    title: {
        text: 'AAPL Stock Price'
    },
    series: [{
        name: 'AAPL',
        data: stockData,
        tooltip: {
            valueDecimals: 2
        }
    }]
});
```

### Key Components

#### Navigator
```javascript
navigator: {
    enabled: true,
    height: 40,
    margin: 25,
    series: {
        type: 'areaspline',
        fillOpacity: 0.05,
        lineWidth: 1
    }
}
```

#### Range Selector
```javascript
rangeSelector: {
    enabled: true,
    buttons: [{
        count: 1,
        type: 'month',
        text: '1M'
    }, {
        count: 6,
        type: 'month',
        text: '6M'
    }, {
        count: 1,
        type: 'year',
        text: '1Y'
    }, {
        type: 'all',
        text: 'All'
    }],
    selected: 2
}
```

#### Stock Tools
```html
<script src="https://code.highcharts.com/stock/modules/stock-tools.js"></script>
```
```javascript
stockTools: {
    gui: {
        enabled: true,
        buttons: ['indicators', 'separator', 'simpleShapes', 'lines', 'crookedLines']
    }
}
```

### Technical Indicators

```html
<script src="https://code.highcharts.com/stock/indicators/indicators-all.js"></script>
```

```javascript
yAxis: [{
    labels: {
        align: 'right',
        x: -3
    },
    title: {
        text: 'OHLC'
    },
    height: '60%',
    lineWidth: 2,
    resize: {
        enabled: true
    }
}, {
    labels: {
        align: 'right',
        x: -3
    },
    title: {
        text: 'Volume'
    },
    top: '65%',
    height: '35%',
    offset: 0,
    lineWidth: 2
}],

series: [{
    type: 'candlestick',
    name: 'AAPL',
    data: ohlcData
}, {
    type: 'column',
    name: 'Volume',
    data: volumeData,
    yAxis: 1
}, {
    type: 'sma',
    linkedTo: 'aapl',
    params: {
        period: 20
    }
}]
```

### Available Indicators
- SMA, EMA, WMA (Moving Averages)
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- Bollinger Bands
- Stochastic
- Williams %R
- And 40+ more

---

## Maps

### Setup

```html
<script src="https://code.highcharts.com/maps/highmaps.js"></script>
<script src="https://code.highcharts.com/maps/modules/exporting.js"></script>
```

### Basic Map

```javascript
// Load map data
const mapData = Highcharts.maps['countries/us/us-all'];

Highcharts.mapChart('container', {
    title: {
        text: 'US Population Density'
    },
    
    mapNavigation: {
        enabled: true,
        buttonOptions: {
            verticalAlign: 'bottom'
        }
    },

    colorAxis: {
        min: 0,
        max: 1000,
        stops: [
            [0, '#EFEFFF'],
            [0.67, '#4444FF'],
            [1, '#000022']
        ]
    },

    series: [{
        data: data,
        mapData: mapData,
        joinBy: 'hc-key',
        name: 'Population density',
        states: {
            hover: {
                color: '#BADA55'
            }
        },
        dataLabels: {
            enabled: true,
            format: '{point.name}'
        }
    }]
});
```

### Map View and Projection

```javascript
mapView: {
    center: [0, 0],  // [longitude, latitude]
    zoom: 2,
    projection: {
        name: 'WebMercator'
    },
    insets: [{
        id: 'hawaii',
        projection: {
            name: 'WebMercator'
        },
        center: [-157, 20],
        zoom: 5
    }]
}
```

### Available Projections
- WebMercator (default)
- Miller
- Orthographic
- EqualEarth
- AlbersUSA
- And more custom projections

### Map Navigation

```javascript
mapNavigation: {
    enabled: true,
    enableButtons: true,
    enableDoubleClickZoom: true,
    enableMouseWheelZoom: true,
    enableTouchZoom: true,
    buttonOptions: {
        alignTo: 'plotBox',
        align: 'left',
        verticalAlign: 'top',
        x: 10,
        y: 10
    }
}
```

---

## Dashboards

### Setup

```bash
npm install @highcharts/dashboards
```

```html
<script src="https://code.highcharts.com/dashboards/dashboards.js"></script>
<script src="https://code.highcharts.com/dashboards/modules/layout.js"></script>
<link rel="stylesheet" href="https://code.highcharts.com/dashboards/css/dashboards.css">
```

### Basic Dashboard

```javascript
Dashboards.board('container', {
    gui: {
        layouts: [{
            id: 'layout-1',
            rows: [{
                cells: [
                    { id: 'dashboard-col-0' },
                    { id: 'dashboard-col-1' }
                ]
            }, {
                cells: [
                    { id: 'dashboard-col-2' }
                ]
            }]
        }]
    },
    components: [
        {
            type: 'HTML',
            renderTo: 'dashboard-col-0',
            elements: [{ 
                tagName: 'h1', 
                textContent: 'Sales Dashboard' 
            }]
        },
        {
            renderTo: 'dashboard-col-1',
            type: 'Highcharts',
            chartOptions: {
                chart: { type: 'column' },
                title: { text: 'Monthly Sales' },
                series: [{ data: [1, 2, 3, 4, 5] }]
            }
        },
        {
            renderTo: 'dashboard-col-2',
            type: 'DataGrid',
            dataGridOptions: {
                dataTable: {
                    columns: {
                        month: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
                        sales: [100, 150, 200, 180, 220]
                    }
                }
            }
        }
    ]
});
```

### Layout Configuration

#### Responsive Layout
```javascript
gui: {
    layouts: [{
        id: 'layout-1',
        rows: [{
            cells: [
                { 
                    id: 'cell-1',
                    responsive: {
                        small: { width: '100%' },
                        medium: { width: '50%' },
                        large: { width: '33%' }
                    }
                }
            ]
        }]
    }]
}
```

### Component Types

#### Highcharts Component
```javascript
{
    type: 'Highcharts',
    renderTo: 'cell-id',
    chartOptions: {
        // Standard Highcharts configuration
    }
}
```

#### DataGrid Component
```javascript
{
    type: 'DataGrid',
    renderTo: 'cell-id',
    dataGridOptions: {
        dataTable: {
            columns: {
                name: ['A', 'B', 'C'],
                value: [1, 2, 3]
            }
        }
    }
}
```

#### HTML Component
```javascript
{
    type: 'HTML',
    renderTo: 'cell-id',
    elements: [{
        tagName: 'div',
        textContent: 'Custom HTML content'
    }]
}
```

---

## Gantt Charts

### Setup

```html
<script src="https://code.highcharts.com/gantt/highcharts-gantt.js"></script>
```

### Basic Gantt Chart

```javascript
Highcharts.ganttChart('container', {
    title: {
        text: 'Project Timeline'
    },
    
    xAxis: {
        min: Date.UTC(2023, 0, 1),
        max: Date.UTC(2023, 11, 31)
    },

    yAxis: {
        uniqueNames: true
    },

    series: [{
        name: 'Project Tasks',
        data: [{
            name: 'Planning Phase',
            start: Date.UTC(2023, 0, 1),
            end: Date.UTC(2023, 1, 15),
            completed: 1.0
        }, {
            name: 'Development',
            start: Date.UTC(2023, 1, 16),
            end: Date.UTC(2023, 5, 30),
            completed: 0.6,
            dependency: 'Planning Phase'
        }, {
            name: 'Testing',
            start: Date.UTC(2023, 4, 1),
            end: Date.UTC(2023, 6, 15),
            completed: 0.3,
            dependency: 'Development'
        }, {
            name: 'Deployment',
            start: Date.UTC(2023, 6, 16),
            end: Date.UTC(2023, 7, 31),
            completed: 0.0,
            dependency: 'Testing'
        }]
    }]
});
```

### Advanced Features

#### Task Dependencies
```javascript
data: [{
    name: 'Task A',
    start: Date.UTC(2023, 0, 1),
    end: Date.UTC(2023, 0, 15),
    id: 'task-a'
}, {
    name: 'Task B',
    start: Date.UTC(2023, 0, 16),
    end: Date.UTC(2023, 1, 1),
    dependency: 'task-a'
}]
```

#### Milestones
```javascript
data: [{
    name: 'Project Kickoff',
    start: Date.UTC(2023, 0, 1),
    milestone: true
}]
```

#### Resource Assignment
```javascript
data: [{
    name: 'Development Task',
    start: Date.UTC(2023, 0, 1),
    end: Date.UTC(2023, 1, 1),
    assignee: 'John Doe',
    resources: ['Developer', 'Designer']
}]
```

---

## Grid

### Setup

```bash
npm install @highcharts/dashboards
```

```html
<script src="https://code.highcharts.com/datagrid/datagrid.js"></script>
```

### Basic Data Grid

```javascript
const dataGrid = new DataGrid.DataGrid('container', {
    dataTable: {
        columns: {
            name: ['Alice', 'Bob', 'Charlie'],
            age: [25, 30, 35],
            city: ['New York', 'London', 'Tokyo']
        }
    },
    columns: [{
        id: 'name',
        header: {
            format: 'Name'
        }
    }, {
        id: 'age',
        header: {
            format: 'Age'
        }
    }, {
        id: 'city',
        header: {
            format: 'City'
        }
    }]
});
```

### Advanced Features

#### Sorting
```javascript
columns: [{
    id: 'name',
    header: {
        format: 'Name'
    },
    sorting: {
        enabled: true
    }
}]
```

#### Filtering
```javascript
columns: [{
    id: 'age',
    header: {
        format: 'Age'
    },
    filter: {
        enabled: true,
        type: 'number'
    }
}]
```

#### Cell Formatting
```javascript
columns: [{
    id: 'price',
    header: {
        format: 'Price'
    },
    cells: {
        format: '${value:.2f}'
    }
}]
```

---

## Audio Charts

### Setup

```html
<script src="https://code.highcharts.com/modules/sonification.js"></script>
```

### Basic Audio Chart

```javascript
Highcharts.chart('container', {
    title: {
        text: 'Audio Chart Example'
    },
    
    accessibility: {
        screenReaderSection: {
            beforeChartFormat: 'Audio chart. Press Enter to play/pause, arrow keys to navigate.'
        }
    },

    sonification: {
        enabled: true,
        duration: 3000,
        order: 'simultaneous',
        instruments: [{
            instrument: 'sine',
            instrumentMapping: {
                pitch: 'y',
                volume: 0.8
            }
        }]
    },

    series: [{
        data: [1, 2, 3, 4, 5, 4, 3, 2, 1]
    }]
});
```

### Advanced Sonification

#### Multiple Instruments
```javascript
sonification: {
    instruments: [{
        instrument: 'sine',
        instrumentMapping: {
            pitch: 'y',
            volume: 0.6
        }
    }, {
        instrument: 'square',
        instrumentMapping: {
            pitch: {
                min: 200,
                max: 800,
                value: 'x'
            },
            volume: 0.4
        }
    }]
}
```

#### Custom Audio Context
```javascript
sonification: {
    events: {
        beforePlay: function(e) {
            console.log('Audio playback starting');
        },
        afterPlayEnd: function(e) {
            console.log('Audio playback finished');
        }
    }
}
```

---

## Extending Highcharts

### Plugin Development

#### Basic Plugin Structure
```javascript
(function (H) {
    'use strict';

    // Extend chart prototype
    H.Chart.prototype.myCustomMethod = function() {
        console.log('Custom method called');
    };

    // Extend series prototype
    H.Series.prototype.myCustomSeriesMethod = function() {
        console.log('Custom series method called');
    };

    // Add custom event
    H.addEvent(H.Chart, 'load', function() {
        console.log('Chart loaded - custom event');
    });

}(Highcharts));
```

#### Custom Series Type
```javascript
(function (H) {
    var seriesType = H.seriesType,
        each = H.each;

    seriesType('customseries', 'line', {
        // Custom series options
        marker: {
            symbol: 'circle'
        }
    }, {
        // Custom series methods
        drawPoints: function() {
            var series = this;
            each(series.points, function(point) {
                // Custom point drawing logic
            });
        }
    });

}(Highcharts));
```

### Custom Themes

```javascript
Highcharts.theme = {
    colors: ['#2b908f', '#90ee7e', '#f45b5b'],
    chart: {
        backgroundColor: '#2a2a2b',
        style: {
            fontFamily: 'Roboto'
        }
    },
    title: {
        style: {
            color: '#E0E0E3'
        }
    },
    xAxis: {
        gridLineColor: '#707073',
        labels: {
            style: {
                color: '#E0E0E3'
            }
        }
    }
};

// Apply theme
Highcharts.setOptions(Highcharts.theme);
```

### Custom Renderers

```javascript
var renderer = new Highcharts.Renderer(
    document.getElementById('container'),
    400,
    300
);

// Draw custom shapes
renderer.circle(100, 100, 50)
    .attr({
        fill: 'red',
        stroke: 'blue',
        'stroke-width': 2
    })
    .add();

renderer.text('Custom Text', 200, 150)
    .attr({
        fontSize: '16px',
        color: 'green'
    })
    .add();
```

---

## Framework Integrations

### React Integration

#### Installation
```bash
npm install highcharts-react-official
```

#### Basic Component
```jsx
import React from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

const MyChart = () => {
    const options = {
        title: {
            text: 'My Chart'
        },
        series: [{
            data: [1, 2, 3, 4, 5]
        }]
    };

    return (
        <HighchartsReact
            highcharts={Highcharts}
            options={options}
        />
    );
};

export default MyChart;
```

#### Advanced React Usage
```jsx
import React, { useRef, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

const AdvancedChart = ({ data }) => {
    const chartRef = useRef(null);

    const options = {
        title: {
            text: 'Dynamic Chart'
        },
        series: [{
            data: data
        }]
    };

    useEffect(() => {
        if (chartRef.current) {
            const chart = chartRef.current.chart;
            // Perform operations on chart instance
            chart.reflow();
        }
    }, [data]);

    return (
        <HighchartsReact
            ref={chartRef}
            highcharts={Highcharts}
            options={options}
            allowChartUpdate={true}
        />
    );
};
```

### Vue.js Integration

```bash
npm install vue-highcharts
```

```vue
<template>
  <div>
    <vue-highcharts 
      :options="chartOptions" 
      ref="lineCharts"
    ></vue-highcharts>
  </div>
</template>

<script>
import VueHighcharts from 'vue-highcharts';

export default {
  components: {
    VueHighcharts
  },
  data() {
    return {
      chartOptions: {
        title: {
          text: 'Vue Chart'
        },
        series: [{
          data: [1, 2, 3, 4, 5]
        }]
      }
    };
  }
};
</script>
```

### Angular Integration

```bash
npm install angular-highcharts
```

```typescript
import { Component } from '@angular/core';
import { Chart } from 'angular-highcharts';

@Component({
  selector: 'app-chart',
  template: `
    <div [chart]="chart"></div>
  `
})
export class ChartComponent {
  chart = new Chart({
    chart: {
      type: 'line'
    },
    title: {
      text: 'Angular Chart'
    },
    series: [{
      name: 'Data',
      data: [1, 2, 3, 4, 5]
    }]
  });
}
```

### Flutter Integration

#### pubspec.yaml
```yaml
dependencies:
  flutter_highcharts: ^0.1.0
```

#### Widget Usage
```dart
import 'package:flutter/material.dart';
import 'package:flutter_highcharts/flutter_highcharts.dart';

class MyChart extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return HighchartsWidget(
      data: '''
        {
          "chart": {"type": "line"},
          "title": {"text": "Flutter Chart"},
          "series": [{
            "data": [1, 2, 3, 4, 5]
          }]
        }
      ''',
    );
  }
}
```

---

## API Reference

### Chart Constructor

```javascript
// Basic constructor
Highcharts.chart(renderTo, options, callback);

// Stock chart constructor
Highcharts.stockChart(renderTo, options, callback);

// Map chart constructor
Highcharts.mapChart(renderTo, options, callback);

// Gantt chart constructor
Highcharts.ganttChart(renderTo, options, callback);
```

### Global Methods

```javascript
// Set global options
Highcharts.setOptions(options);

// Get global options
Highcharts.getOptions();

// Date formatting
Highcharts.dateFormat(format, timestamp, capitalize);

// Number formatting
Highcharts.numberFormat(number, decimals, decimalPoint, thousandsSep);

// Merge objects
Highcharts.merge(obj1, obj2, ...);

// Each iteration
Highcharts.each(array, callback);

// Add event listener
Highcharts.addEvent(el, type, fn);

// Remove event listener
Highcharts.removeEvent(el, type, fn);
```

### Chart Methods

```javascript
// Add series
chart.addSeries(options, redraw, animation);

// Get series
chart.get(id);

// Update chart
chart.update(options, redraw);

// Reflow chart
chart.reflow();

// Destroy chart
chart.destroy();

// Export chart
chart.exportChart(options, chartOptions);

// Print chart
chart.print();

// Show/hide loading
chart.showLoading(str);
chart.hideLoading();
```

### Series Methods

```javascript
// Add point
series.addPoint(options, redraw, shift, animation);

// Remove point
series.removePoint(index, redraw, animation);

// Update series
series.update(options, redraw);

// Set data
series.setData(data, redraw, animation, updatePoints);

// Show/hide series
series.show();
series.hide();

// Remove series
series.remove(redraw, animation);
```

### Point Methods

```javascript
// Update point
point.update(options, redraw, animation);

// Remove point
point.remove(redraw, animation);

// Select point
point.select(selected, accumulate);

// Get point coordinates
point.plotX;
point.plotY;
```

### Axis Methods

```javascript
// Add plot band
axis.addPlotBand(options);

// Remove plot band
axis.removePlotBand(id);

// Add plot line
axis.addPlotLine(options);

// Remove plot line
axis.removePlotLine(id);

// Set extremes
axis.setExtremes(min, max, redraw, animation);

// Update axis
axis.update(options, redraw);
```

---

## Best Practices

### Performance Optimization

#### Large Datasets
1. **Use Boost Module**
```html
<script src="https://code.highcharts.com/modules/boost.js"></script>
```
```javascript
boost: {
    useGPUTranslations: true,
    seriesThreshold: 1000
}
```

2. **Disable Unnecessary Features**
```javascript
plotOptions: {
    series: {
        marker: {
            enabled: false
        },
        shadow: false,
        animation: false
    }
}
```

3. **Data Grouping** (Stock charts)
```javascript
plotOptions: {
    series: {
        dataGrouping: {
            enabled: true
        }
    }
}
```

#### Memory Management
```javascript
// Destroy charts when done
chart.destroy();

// Remove event listeners
Highcharts.removeEvent(element, 'click', handler);

// Avoid memory leaks in callbacks
formatter: function() {
    // Don't store references to external objects
    return this.value;
}
```

### Security Best Practices

#### Input Validation
```javascript
// Validate user data before charting
function validateData(data) {
    return data.filter(item => 
        typeof item.y === 'number' && 
        !isNaN(item.y) &&
        isFinite(item.y)
    );
}
```

#### XSS Prevention
```javascript
// Use format strings instead of HTML when possible
tooltip: {
    pointFormat: '<b>{series.name}</b>: {point.y}' // Safe
    // Avoid: formatter with HTML concatenation
}

// Sanitize HTML inputs
useHTML: true,
formatter: function() {
    return DOMPurify.sanitize(this.point.description);
}
```

### Accessibility Best Practices

#### Always Include
1. Chart descriptions
2. Axis titles
3. Series names
4. Meaningful colors (not color-only indicators)
5. Alternative data access

#### Test With
- Screen readers (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation
- High contrast mode
- Voice input software

### Code Organization

#### Separate Configuration
```javascript
// chart-config.js
export const defaultChartConfig = {
    chart: {
        backgroundColor: '#ffffff',
        style: {
            fontFamily: 'Arial, sans-serif'
        }
    },
    credits: {
        enabled: false
    }
};

// chart-component.js
import { defaultChartConfig } from './chart-config.js';

const chartOptions = Highcharts.merge(defaultChartConfig, {
    title: { text: 'My Chart' },
    series: [{ data: myData }]
});
```

#### Reusable Components
```javascript
class ChartFactory {
    static createLineChart(container, data, title) {
        return Highcharts.chart(container, {
            chart: { type: 'line' },
            title: { text: title },
            series: [{ data: data }]
        });
    }
    
    static createPieChart(container, data, title) {
        return Highcharts.chart(container, {
            chart: { type: 'pie' },
            title: { text: title },
            series: [{ data: data }]
        });
    }
}
```

### Testing

#### Unit Testing
```javascript
// Jest example
describe('Chart Configuration', () => {
    test('should create valid chart options', () => {
        const options = createChartOptions(testData);
        expect(options.series[0].data).toEqual(testData);
        expect(options.title.text).toBeDefined();
    });
    
    test('should handle empty data gracefully', () => {
        const options = createChartOptions([]);
        expect(options.series[0].data).toEqual([]);
    });
});
```

#### Integration Testing
```javascript
// Cypress example
describe('Chart Interactions', () => {
    it('should display tooltip on hover', () => {
        cy.visit('/chart-page');
        cy.get('.highcharts-point').first().trigger('mouseover');
        cy.get('.highcharts-tooltip').should('be.visible');
    });
    
    it('should export chart', () => {
        cy.get('.highcharts-contextmenu').click();
        cy.contains('Download PNG').click();
        // Verify download
    });
});
```

---

## Troubleshooting

### Common Issues

#### Chart Not Rendering
1. **Check container element**
```javascript
// Ensure container exists and has dimensions
const container = document.getElementById('container');
if (!container || container.offsetWidth === 0) {
    console.error('Invalid container');
}
```

2. **Verify script loading**
```javascript
if (typeof Highcharts === 'undefined') {
    console.error('Highcharts not loaded');
}
```

#### Performance Issues
1. **Too many data points**
   - Use boost module
   - Implement data grouping
   - Consider pagination

2. **Memory leaks**
   - Destroy charts properly
   - Remove event listeners
   - Avoid circular references

#### Responsive Issues
1. **Chart not resizing**
```javascript
// Force reflow on window resize
window.addEventListener('resize', function() {
    if (chart) {
        chart.reflow();
    }
});
```

2. **Mobile touch issues**
```javascript
chart: {
    pinchType: 'xy'
}
```

### Debug Mode

```javascript
// Enable debug mode
Highcharts.setOptions({
    chart: {
        showAxes: true
    },
    plotOptions: {
        series: {
            kdNow: true // Force immediate kd-tree building
        }
    }
});
```

### Browser Developer Tools

Use browser console to inspect chart objects:
```javascript
// Access chart instance
const chart = Highcharts.charts[0];

// Inspect series
console.log(chart.series[0].data);

// Check axis extremes
console.log(chart.xAxis[0].getExtremes());

// Monitor events
chart.update({
    chart: {
        events: {
            load: () => console.log('Chart loaded'),
            redraw: () => console.log('Chart redrawn')
        }
    }
});
```

---

## Conclusion

This comprehensive documentation covers all major aspects of Highcharts, from basic setup to advanced customization and integration. The library's extensive feature set and flexibility make it suitable for virtually any data visualization requirement.

### Key Takeaways

1. **Installation Flexibility**: Multiple installation methods support different development environments
2. **Extensive Customization**: Every visual aspect can be customized
3. **Accessibility First**: Built-in accessibility features ensure inclusive design
4. **Performance Optimized**: Tools and techniques available for large datasets
5. **Framework Agnostic**: Works with all major JavaScript frameworks
6. **Specialized Products**: Stock, Maps, Gantt, and Dashboards for specific use cases
7. **Active Development**: Regular updates and extensive community support

### Resources

- **Official Documentation**: https://www.highcharts.com/docs/
- **API Reference**: https://api.highcharts.com/
- **Demo Gallery**: https://www.highcharts.com/demo/
- **Forum Support**: https://www.highcharts.com/forum/
- **GitHub Repository**: https://github.com/highcharts/highcharts

---

*This documentation is compiled from official Highcharts sources and represents version 12.2.0 compatibility. Always refer to the official documentation for the most current information and updates.*