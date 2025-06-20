'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Treemap,
  Sankey,
  Layer,
  Rectangle,
  ReferenceLine,
  Brush,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  LineChart,
  Dot
} from 'recharts';
import { AlertStatistics as AlertStatsType } from '@/models/alert';
import alertService from '@/services/alertService';

// Professional color palette
const COLORS = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#f59e0b',
  low: '#3b82f6',
  info: '#6b7280',
  success: '#10b981',
  primary: '#2563eb',
  secondary: '#7c3aed',
  background: '#f9fafb',
  border: '#e5e7eb'
};

// Severity gradient colors
const SEVERITY_COLORS = [
  { offset: '0%', color: '#dc2626' },
  { offset: '25%', color: '#ea580c' },
  { offset: '50%', color: '#f59e0b' },
  { offset: '75%', color: '#3b82f6' },
  { offset: '100%', color: '#6b7280' }
];

interface EnterpriseAlertAnalyticsProps {
  className?: string;
}

export default function EnterpriseAlertAnalytics({ className = '' }: EnterpriseAlertAnalyticsProps) {
  const [stats, setStats] = useState<AlertStatsType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [liveMetrics, setLiveMetrics] = useState<any[]>([]);

  // Fetch initial stats
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await alertService?.getAlertStatistics();
        setStats(data);
        
        // Generate mock live metrics for now
        const mockLiveMetrics = [];
        for (let i = 0; i < 24; i++) {
          mockLiveMetrics?.push({
            timestamp: Date.now() - (i * 60 * 60 * 1000),
            alert_count: Math.floor(Math.random() * 10) + 1,
            mttr: Math.floor(Math.random() * 60) + 20,
            alert_rate: Math.round((Math.random() * 5 + 0.5) * 10) / 10
          });
        }
        setLiveMetrics(mockLiveMetrics?.reverse());
      } catch (err) {
        setError('Failed to load alert Analytics.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [selectedTimeRange]);

  // Transform data for various charts
  const transformedData = useMemo(() => {
    if (!stats) return null;

    // Severity distribution for pie chart
    const severityData = [
      { name: 'Critical', value: stats.bySeverity.critical, color: COLORS.critical },
      { name: 'High', value: stats.bySeverity.high, color: COLORS.high },
      { name: 'Medium', value: stats.bySeverity.medium, color: COLORS.medium },
      { name: 'Low', value: stats.bySeverity.low, color: COLORS.low },
      { name: 'Info', value: stats.bySeverity.info, color: COLORS.info }
    ].filter(item => item?.value > 0);

    // Source performance data for radar chart
    const sourcePerformanceData = Object.entries(stats?.bySource).map(([source, count]) => ({
      source: source.charAt(0).toUpperCase() + source?.slice(1),
      alerts: count,
      responseTime: Math.floor(Math.random() * 30) + 10, // Mock response time
      resolutionRate: Math.floor(Math.random() * 20) + 75, // Mock resolution rate
      mttr: Math.floor(Math.random() * 60) + 30 // Mock MTTR in minutes
    }));

    // Treemap data for alert categories
    const treemapData = {
      name: 'Alerts',
      children: [
        {
          name: 'Equipment',
          children: [
            { name: 'CNC Machines', value: Math.floor(stats?.total * 0.25), severity: 'high' },
            { name: 'Conveyors', value: Math.floor(stats?.total * 0.15), severity: 'medium' },
            { name: 'Robots', value: Math.floor(stats?.total * 0.1), severity: 'low' }
          ]
        },
        {
          name: 'Quality',
          children: [
            { name: 'Defects', value: Math.floor(stats?.total * 0.2), severity: 'critical' },
            { name: 'Tolerance', value: Math.floor(stats?.total * 0.1), severity: 'medium' }
          ]
        },
        {
          name: 'Maintenance',
          children: [
            { name: 'Scheduled', value: Math.floor(stats?.total * 0.1), severity: 'info' },
            { name: 'Predictive', value: Math.floor(stats?.total * 0.1), severity: 'low' }
          ]
        }
      ]
    };

    // Time series data with additional metrics
    const enhancedTrendData = stats?.(trend || []).map((day, index) => ({
      ...day,
      date: new Date(day?.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      responseTime: Math.floor(Math.random() * 20) + 10,
      resolutionRate: Math.floor(Math.random() * 30) + 60,
      criticalAlerts: Math.floor(day?.count * 0.2),
      mediumAlerts: Math.floor(day?.count * 0.5),
      lowAlerts: Math.floor(day?.count * 0.3),
      predicted: day.count + Math.floor(Math.random() * 10) - 5
    }));

    return {
      severityData,
      sourcePerformanceData,
      treemapData,
      enhancedTrendData
    };
  }, [stats]);

  // Custom tooltips
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload?.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold mb-1">{label}</p>
          {payload?.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry?.name}: {entry?.value}
              {entry?.unit ? ` ${entry?.unit}` : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom treemap content
  const CustomTreemapContent = (props: any) => {
    const { x, y, width, height, name, value, severity  } = props || {};
    const severityColor = COLORS[severity as keyof typeof COLORS] || COLORS?.info;
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: severityColor,
            fillOpacity: 0.8,
            stroke: '#fff',
            strokeWidth: 2,
            strokeOpacity: 1,
          }}
        />
        {width > 50 && height > 30 && (
          <>
            <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill="#fff" fontSize={12} fontWeight="bold">
              {name}
            </text>
            <text x={x + width / 2} y={y + height / 2 + 8} textAnchor="middle" fill="#fff" fontSize={10}>
              {value} alerts
            </text>
          </>
        )}
      </g>
    );
  };

  // Custom dot for line charts
  const CustomDot = (props: any) => {
    const { cx, cy, payload  } = props || {};
    if (payload?.criticalAlerts > 5) {
      return (
        <circle cx={cx} cy={cy} r={6} fill={COLORS?.critical} stroke="#fff" strokeWidth={2}>
          <animate attributeName="r" values="6;8;6" dur="1.5s" repeatCount="indefinite" />
        </circle>
      );
    }
    return <circle cx={cx} cy={cy} r={4} fill={COLORS?.primary} stroke="#fff" strokeWidth={2} />;
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !stats || !transformedData) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <p className="text-sm">{error || 'Unable to load Analytics'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`} data-testid="enterprise-alert-Analytics">
      {/* Header with controls */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Enterprise Alert Analytics</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSelectedTimeRange('24h')}
              className={`px-3 py-1 text-sm rounded-md ${
                selectedTimeRange === '24h' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              24H
            </button>
            <button
              onClick={() => setSelectedTimeRange('7d')}
              className={`px-3 py-1 text-sm rounded-md ${
                selectedTimeRange === '7d' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setSelectedTimeRange('30d')}
              className={`px-3 py-1 text-sm rounded-md ${
                selectedTimeRange === '30d' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              30D
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <div className="text-blue-700 text-sm font-medium">Total Alerts</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{stats?.total}</div>
            <div className="text-xs text-blue-600 mt-1">↑ 12% from last period</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4">
            <div className="text-red-700 text-sm font-medium">Critical Active</div>
            <div className="text-2xl font-bold text-red-900 mt-1">{stats?.bySeverity.critical}</div>
            <div className="text-xs text-red-600 mt-1">Immediate attention</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <div className="text-green-700 text-sm font-medium">Resolution Rate</div>
            <div className="text-2xl font-bold text-green-900 mt-1">87%</div>
            <div className="text-xs text-green-600 mt-1">↑ 5% improvement</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
            <div className="text-purple-700 text-sm font-medium">Avg MTTR</div>
            <div className="text-2xl font-bold text-purple-900 mt-1">42m</div>
            <div className="text-xs text-purple-600 mt-1">↓ 8m faster</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
            <div className="text-orange-700 text-sm font-medium">Alert Rate</div>
            <div className="text-2xl font-bold text-orange-900 mt-1">3.2/hr</div>
            <div className="text-xs text-orange-600 mt-1">Within normal range</div>
          </div>
        </div>

        {/* Row 1: Severity Distribution and Source Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Enhanced Pie Chart with Donut */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Alert Severity Distribution</h4>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={transformedData?.severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {transformedData?.(severityData || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry?.color} />
                  ))}
                </Pie>
                <Pie
                  data={transformedData?.severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={50}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {transformedData?.(severityData || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry?.color} opacity={0.3} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Chart for Source Performance */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Source Performance Metrics</h4>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={transformedData?.sourcePerformanceData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="source" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Resolution Rate" dataKey="resolutionRate" stroke={COLORS?.success} fill={COLORS?.success} fillOpacity={0.6} />
                <Radar name="Response Score" dataKey="responseTime" stroke={COLORS?.primary} fill={COLORS?.primary} fillOpacity={0.4} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 2: Advanced Time Series */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Alert Trends & Predictions</h4>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={transformedData?.enhancedTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="alertGradient" x1="0" y1="0" x2="0" y2="1">
                  {SEVERITY_COLORS?.map((color, index) => (
                    <stop key={index} offset={color?.offset} stopColor={color?.color} stopOpacity={0.8} />
                  ))}
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={11} />
              <YAxis yAxisId="left" stroke="#6b7280" fontSize={11} />
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" fontSize={11} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Brush dataKey="date" height={30} stroke={COLORS?.primary} />
              
              {/* Stacked bars for severity */}
              <Bar yAxisId="left" dataKey="criticalAlerts" stackId="a" fill={COLORS?.critical} name="Critical" />
              <Bar yAxisId="left" dataKey="mediumAlerts" stackId="a" fill={COLORS?.medium} name="Medium" />
              <Bar yAxisId="left" dataKey="lowAlerts" stackId="a" fill={COLORS?.low} name="Low" />
              
              {/* Lines for metrics */}
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="count" 
                stroke={COLORS?.primary} 
                strokeWidth={3}
                name="Total Alerts"
                dot={<CustomDot />}
              />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="predicted" 
                stroke={COLORS?.secondary} 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Predicted"
                dot={false}
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="resolutionRate" 
                stroke={COLORS?.success} 
                strokeWidth={2}
                name="Resolution %"
                dot={false}
              />
              
              {/* Reference lines */}
              <ReferenceLine yAxisId="left" y={20} label="Alert Threshold" stroke="#ef4444" strokeDasharray="3 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Row 3: Treemap for Alert Categories */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Alert Distribution by Category</h4>
          <ResponsiveContainer width="100%" height={300}>
            <Treemap
              data={[transformedData?.treemapData]}
              dataKey="value"
              aspectRatio={4/3}
              stroke="#fff"
              content={<CustomTreemapContent />}
            >
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </div>

        {/* Row 4: Real-time Alert Stream */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Real-time Alert Activity</h4>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={liveMetrics?.slice(-20)} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="timestamp" tick={false} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="alert_count" fill={COLORS?.primary}>
                {liveMetrics?.slice(-20).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry?.alert_count > 5 ? COLORS?.critical : COLORS.primary} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}