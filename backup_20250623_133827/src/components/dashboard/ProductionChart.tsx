'use client';

import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { rechartsService } from '@/services/rechartsService';

// Generate mock production data
const generateMockData = () => {
  const now = new Date();
  const data = [];
  
  for (let i = 24; i >= 0; i--) {
    const timestamp = new Date(now?.getTime() - i * 60 * 60 * 1000);
    data?.push({
      timestamp: timestamp.getTime(),
      time: timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      production: Math.floor(Math.random() * 50) + 750,
      target: 800,
      efficiency: Math.floor(Math.random() * 15) + 80,
      quality: Math.floor(Math.random() * 5) + 95
    });
  }
  
  return data;
};

export default function ProductionChart() {
  const [data, setData] = useState(generateMockData());
  const [chartType, setChartType] = useState<'line' | 'area' | 'composed'>('composed');
  const [isLoading, setIsLoading] = useState(false);

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData(prevData => {
        const newData = [...prevData?.slice(1)];
        const lastTimestamp = newData[newData?.length - 1]?.timestamp || Date.now();
        const newTimestamp = new Date(lastTimestamp + 60 * 60 * 1000);
        
        newData?.push({
          timestamp: newTimestamp.getTime(),
          time: newTimestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          production: Math.floor(Math.random() * 50) + 750,
          target: 800,
          efficiency: Math.floor(Math.random() * 15) + 80,
          quality: Math.floor(Math.random() * 5) + 95
        });
        
        return newData;
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload?.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-sm font-semibold mb-1">{label}</p>
          {payload?.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry?.name}: {entry?.value} {entry?.name === 'efficiency' || entry?.name === 'quality' ? '%' : 'units'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis yAxisId="left" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis yAxisId="right" orientation="right" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line yAxisId="left" type="monotone" dataKey="production" stroke="#2563eb" strokeWidth={2} dot={false} name="Production" />
            <Line yAxisId="left" type="monotone" dataKey="target" stroke="#dc2626" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Target" />
            <Line yAxisId="right" type="monotone" dataKey="efficiency" stroke="#16a34a" strokeWidth={2} dot={false} name="Efficiency" />
          </LineChart>
        );
      
      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Area type="monotone" dataKey="production" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} strokeWidth={2} name="Production" />
            <Area type="monotone" dataKey="target" stroke="#dc2626" fill="#dc2626" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" name="Target" />
          </AreaChart>
        );
      
      case 'composed':
      default:
        return (
          <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis yAxisId="left" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <YAxis yAxisId="right" orientation="right" stroke="#6b7280" style={{ fontSize: '12px' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar yAxisId="left" dataKey="production" fill="#2563eb" opacity={0.8} name="Production" />
            <Line yAxisId="left" type="monotone" dataKey="target" stroke="#dc2626" strokeWidth={2} strokeDasharray="5 5" dot={false} name="Target" />
            <Line yAxisId="right" type="monotone" dataKey="efficiency" stroke="#16a34a" strokeWidth={2} dot={false} name="Efficiency" />
            <Line yAxisId="right" type="monotone" dataKey="quality" stroke="#ca8a04" strokeWidth={2} dot={false} name="Quality" />
          </ComposedChart>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Chart Type Selector */}
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1 text-sm rounded ${
              chartType === 'line' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Line Chart
          </button>
          <button
            onClick={() => setChartType('area')}
            className={`px-3 py-1 text-sm rounded ${
              chartType === 'area' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Area Chart
          </button>
          <button
            onClick={() => setChartType('composed')}
            className={`px-3 py-1 text-sm rounded ${
              chartType === 'composed' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Combined Chart
          </button>
        </div>
        
        <div className="text-xs text-gray-500">
          Live data updates every 5 seconds
        </div>
      </div>

      {/* Chart Container */}
      <div className="h-80" data-testid="production-trends-chart">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-500">Loading chart data...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart Legend Info */}
      <div className="text-xs text-gray-600 mt-2">
        <p>• Production: Actual units produced per hour</p>
        <p>• Target: Production target (800 units/hour)</p>
        <p>• Efficiency: Production efficiency percentage</p>
        <p>• Quality: Quality rate percentage</p>
      </div>
    </div>
  );
}