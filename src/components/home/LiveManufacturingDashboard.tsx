'use client';

import React, { useEffect, useState } from 'react';
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';

// Generate realistic manufacturing metrics
const generateMetrics = () => {
  const baseOEE = 82;
  const variation = Math.random() * 10 - 5;
  const oee = Math.max(0, Math.min(100, baseOEE + variation));
  
  const availability = Math.max(0, Math.min(100, 90 + Math.random() * 8 - 4));
  const performance = Math.max(0, Math.min(100, 85 + Math.random() * 10 - 5));
  const quality = Math.max(0, Math.min(100, 98 + Math.random() * 3 - 1.5));
  
  return {
    oee: Math.round(oee * 10) / 10,
    availability: Math.round(availability * 10) / 10,
    performance: Math.round(performance * 10) / 10,
    quality: Math.round(quality * 10) / 10,
    production: Math.floor(750 + Math.random() * 100),
    defects: Math.floor(Math.random() * 5) + 1,
    downtime: Math.floor(Math.random() * 30) + 10
  };
};

// Generate time series data
const generateTimeSeriesData = (points = 12) => {
  const data = [];
  const now = new Date();
  
  for (let i = points - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60 * 1000); // 5-minute intervals
    const metrics = generateMetrics();
    
    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      timestamp: time.getTime(),
      oee: metrics.oee,
      production: metrics.production,
      target: 800,
      quality: metrics.quality
    });
  }
  
  return data;
};

// Color scheme for gauges
const GAUGE_COLORS = {
  excellent: '#10b981', // green
  good: '#3b82f6',      // blue
  warning: '#f59e0b',   // yellow
  critical: '#ef4444'   // red
};

const getGaugeColor = (value: number, metric: string) => {
  if (metric === 'quality') {
    if (value >= 99) return GAUGE_COLORS.excellent;
    if (value >= 97) return GAUGE_COLORS.good;
    if (value >= 95) return GAUGE_COLORS.warning;
    return GAUGE_COLORS.critical;
  } else {
    if (value >= 90) return GAUGE_COLORS.excellent;
    if (value >= 80) return GAUGE_COLORS.good;
    if (value >= 70) return GAUGE_COLORS.warning;
    return GAUGE_COLORS.critical;
  }
};

export default function LiveManufacturingDashboard() {
  const [metrics, setMetrics] = useState(generateMetrics());
  const [timeSeriesData, setTimeSeriesData] = useState(generateTimeSeriesData());
  const [isAnimating, setIsAnimating] = useState(true);

  // Update metrics every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(generateMetrics());
      
      // Update time series data
      setTimeSeriesData(prevData => {
        const newData = [...prevData.slice(1)];
        const now = new Date();
        const newMetrics = generateMetrics();
        
        newData.push({
          time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          timestamp: now.getTime(),
          oee: newMetrics.oee,
          production: newMetrics.production,
          target: 800,
          quality: newMetrics.quality
        });
        
        return newData;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Prepare data for radial chart
  const radialData = [
    {
      name: 'OEE',
      value: metrics.oee,
      fill: getGaugeColor(metrics.oee, 'oee'),
      fullMark: 100
    },
    {
      name: 'Availability',
      value: metrics.availability,
      fill: getGaugeColor(metrics.availability, 'availability'),
      fullMark: 100
    },
    {
      name: 'Performance',
      value: metrics.performance,
      fill: getGaugeColor(metrics.performance, 'performance'),
      fullMark: 100
    },
    {
      name: 'Quality',
      value: metrics.quality,
      fill: getGaugeColor(metrics.quality, 'quality'),
      fullMark: 100
    }
  ];

  // Custom tooltip for radial chart
  const RadialTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
          <p className="text-sm font-semibold">{data.payload.name}</p>
          <p className="text-lg font-bold" style={{ color: data.payload.fill }}>
            {data.value}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for time series
  const TimeSeriesToolTip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-sm font-semibold mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}{entry.name === 'Production' ? ' units/hr' : '%'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Title */}
      <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
        Real-Time Manufacturing Analytics
      </h3>
      
      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {/* Radial Gauge Chart */}
        <div className="bg-white rounded-lg p-4 shadow-inner">
          <h4 className="text-sm font-semibold text-gray-600 mb-2 text-center">
            Key Performance Indicators
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <RadialBarChart 
              cx="50%" 
              cy="50%" 
              innerRadius="20%" 
              outerRadius="90%" 
              data={radialData}
              startAngle={180} 
              endAngle={0}
            >
              <PolarAngleAxis 
                type="number" 
                domain={[0, 100]} 
                angleAxisId={0} 
                tick={false}
              />
              <RadialBar
                background
                dataKey="value"
                cornerRadius={10}
                animationDuration={1000}
                animationEasing="ease-out"
              />
              <Tooltip content={<RadialTooltip />} />
            </RadialBarChart>
          </ResponsiveContainer>
          
          {/* KPI Labels */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            {radialData.map((item, index) => (
              <div key={index} className="text-center">
                <div className="text-xs text-gray-500">{item.name}</div>
                <div className="text-lg font-bold" style={{ color: item.fill }}>
                  {item.value}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time Series Chart */}
        <div className="bg-white rounded-lg p-4 shadow-inner">
          <h4 className="text-sm font-semibold text-gray-600 mb-2 text-center">
            Production Trends (Last Hour)
          </h4>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={timeSeriesData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="colorProduction" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="time" 
                stroke="#9ca3af" 
                fontSize={10}
                interval="preserveStartEnd"
              />
              <YAxis 
                yAxisId="left"
                stroke="#9ca3af" 
                fontSize={10}
                domain={[600, 900]}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#9ca3af" 
                fontSize={10}
                domain={[80, 100]}
              />
              <Tooltip content={<TimeSeriesToolTip />} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="production"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorProduction)"
                strokeWidth={2}
                name="Production"
                animationDuration={300}
              />
              <ReferenceLine 
                yAxisId="left"
                y={800} 
                stroke="#ef4444" 
                strokeDasharray="5 5"
                label={{ value: "Target", position: "right", fontSize: 10 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="oee"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="OEE"
                animationDuration={300}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Metrics Strip */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="bg-gray-100 rounded p-2 text-center">
          <div className="text-xs text-gray-600">Production Rate</div>
          <div className="text-lg font-bold text-blue-600">
            {metrics.production} units/hr
          </div>
        </div>
        <div className="bg-gray-100 rounded p-2 text-center">
          <div className="text-xs text-gray-600">Defect Rate</div>
          <div className="text-lg font-bold text-green-600">
            {metrics.defects} ppm
          </div>
        </div>
        <div className="bg-gray-100 rounded p-2 text-center">
          <div className="text-xs text-gray-600">Downtime</div>
          <div className="text-lg font-bold text-orange-600">
            {metrics.downtime} min
          </div>
        </div>
      </div>

      {/* Live Indicator */}
      <div className="mt-2 text-center">
        <span className="inline-flex items-center text-xs text-gray-500">
          <span className={`inline-block w-2 h-2 rounded-full mr-1 ${isAnimating ? 'animate-pulse' : ''}`} 
                style={{ backgroundColor: '#10b981' }}></span>
          Live data updates every 3 seconds
        </span>
      </div>
    </div>
  );
}