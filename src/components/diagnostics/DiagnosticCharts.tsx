'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  duration?: number;
  timestamp: string;
}

interface SystemMetrics {
  ollama: {
    status: string;
    models: string[];
    memoryUsage?: number;
  };
  database: {
    status: string;
    tables: { name: string; count: number }[];
    latency?: number;
  };
  system: {
    memory: { used: number; total: number };
    uptime: number;
  };
}

interface DiagnosticChartsProps {
  testResults?: TestResult[];
  systemMetrics?: SystemMetrics | null;
  logs?: string[];
}

export default function DiagnosticCharts({ testResults, systemMetrics, logs }: DiagnosticChartsProps) {
  const [showCharts, setShowCharts] = useState(false);
  const [memoryHistory, setMemoryHistory] = useState<any[]>([]);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  // Track memory usage over time
  useEffect(() => {
    if (systemMetrics?.system?.memory) {
      setMemoryHistory(prev => {
        const newEntry = {
          time: new Date().toLocaleTimeString(),
          used: Math.round(systemMetrics?.system.memory?.used / 1024 / 1024),
          total: Math.round(systemMetrics?.system.memory?.total / 1024 / 1024),
          percentage: Math.round((systemMetrics?.system.memory?.used / systemMetrics?.system.memory?.total) * 100)
        };
        const updated = [...prev, newEntry];
        // Keep only last 20 entries
        return updated?.slice(-20);
      });
    }
  }, [systemMetrics]);

  // Process test results for charts
  const successfulTests = testResults?.filter(t => t?.status === 'success' && t?.duration);
  const testPerformanceData = testResults
    .filter(t => t?.duration && t?.duration > 0) // Include all tests with duration
    .map(t => ({
      name: t.name.replace(' Test', '').replace(' Check', '').substring(0, 20), // Shorten names
      duration: t.duration || 0,
      status: t.status
    }))
    .sort((a, b) => b?.duration - a?.duration);

  // Test status distribution
  const testStatusData = [
    { name: 'Success', value: testResults.filter(t => t?.status === 'success').length, color: '#10b981' },
    { name: 'Error', value: testResults.filter(t => t?.status === 'error').length, color: '#ef4444' },
    { name: 'Running', value: testResults.filter(t => t?.status === 'running').length, color: '#3b82f6' },
    { name: 'Pending', value: testResults.filter(t => t?.status === 'pending').length, color: '#9ca3af' },
  ];
  
  // If no tests have been run, show placeholder data
  const hasTestData = testStatusData?.some(d => d?.value > 0);
  const displayStatusData = hasTestData ? testStatusData?.filter(d => d?.value > 0) : 
    [{ name: 'No tests run', value: 1, color: '#9ca3af' }];

  // Database metrics
  const dbMetricsData = systemMetrics?.database?.(tables || []).map(table => ({
    name: table.name,
    records: table.count
  })) || [];

  // Log analysis
  const logLevelCounts = {
    error: logs.filter(log => log?.includes('[ERROR]')).length,
    warn: logs.filter(log => log?.includes('[WARN]')).length,
    info: logs.filter(log => log?.includes('[INFO]')).length,
    debug: logs.filter(log => log?.includes('[DEBUG]')).length,
  };

  const logLevelData = Object.entries(logLevelCounts).map(([level, count]) => ({
    level: level.toUpperCase(),
    count,
    color: level === 'error' ? '#ef4444' : level === 'warn' ? '#f59e0b' : level === 'info' ? '#3b82f6' : '#6b7280'
  }));

  // Performance grades based on test durations
  const performanceGrades = successfulTests?.length > 0 ? successfulTests?.map(test => {
    const duration = test?.duration || 0;
    let grade = 'A';
    if (duration > 10000) grade = 'F';
    else if (duration > 5000) grade = 'D';
    else if (duration > 2000) grade = 'C';
    else if (duration > 1000) grade = 'B';
    
    return {
      test: test.name.substring(0, 15), // Shorten names for radar chart
      grade,
      score: grade === 'A' ? 100 : grade === 'B' ? 80 : grade === 'C' ? 60 : grade === 'D' ? 40 : 20
    };
  }) : [
    { test: 'No tests', grade: 'N/A', score: 0 }
  ];

  const ChartCard = ({ 
    title, 
    description, 
    chartId,
    children 
  }: { 
    title: string; 
    description: string; 
    chartId: string;
    children: React.ReactNode;
  }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button
          onClick={() => {
            const currentScrollY = window.scrollY;
            setExpandedChart(expandedChart === chartId ? null : chartId);
            // Prevent scroll jump when expanding/collapsing charts
            requestAnimationFrame(() => {
              window.scrollTo(0, currentScrollY);
            });
          }}
          className="text-gray-500 hover:text-gray-700"
          title={expandedChart === chartId ? "Collapse" : "Expand"}
        >
          {expandedChart === chartId ? '📉' : '📊'}
        </button>
      </div>
      
      <div className={`transition-all duration-300 ${expandedChart === chartId ? 'mb-4' : 'mb-2'}`}>
        <p className={`text-sm text-gray-600 ${expandedChart === chartId ? '' : 'line-clamp-2'}`}>
          {description}
        </p>
      </div>
      
      <div className={`transition-all duration-300 ${expandedChart === chartId ? 'h-96' : 'h-64'}`}>
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Toggle Button */}
      <div className="bg-white rounded-lg shadow p-4">
        <button
          onClick={() => {
            const currentScrollY = window.scrollY;
            setShowCharts(!showCharts);
            // Prevent scroll jump by maintaining scroll position
            requestAnimationFrame(() => {
              window.scrollTo(0, currentScrollY);
            });
          }}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center">
            <span className="text-2xl mr-3">{showCharts ? '📊' : '📈'}</span>
            <div className="text-left">
              <h2 className="text-xl font-semibold">Diagnostic Analytics</h2>
              <p className="text-sm text-gray-600">
                Comprehensive performance metrics and system health visualization
              </p>
            </div>
          </div>
          <svg
            className={`w-6 h-6 transform transition-transform ${showCharts ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Charts Grid */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ contain: 'layout' }}>
          {/* Test Performance Chart */}
          <ChartCard
            title="Test Execution Performance"
            description="Shows the execution time of each diagnostic test in milliseconds. Shorter bars indicate better performance. Tests taking over 5 seconds may indicate performance issues that need investigation."
            chartId="performance"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={testPerformanceData?.length > 0 ? testPerformanceData : 
                  [{ name: 'No tests executed', duration: 0, status: 'pending' }]} 
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis label={{ value: 'Duration (ms)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value: any) => [`${value}ms`, 'Duration']}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                />
                <Bar dataKey="duration" fill="#3b82f6">
                  {testPerformanceData?.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry?.duration > 10000 ? '#ef4444' : entry.duration > 5000 ? '#f59e0b' : '#10b981'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Memory Usage Over Time */}
          <ChartCard
            title="Memory Usage Trend"
            description="Tracks memory consumption over time. The blue line shows used memory, while the green area represents free memory. Sudden spikes might indicate memory leaks."
            chartId="memory"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={memoryHistory} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis label={{ value: 'Memory (MB)', angle: -90, position: 'insideLeft' }} />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    `${value}MB`, 
                    name === 'used' ? 'Used Memory' : 'Total Memory'
                  ]}
                />
                <Legend />
                <Area type="monotone" dataKey="total" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                <Area type="monotone" dataKey="used" stackId="2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.8} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Test Status Distribution */}
          <ChartCard
            title="Test Status Distribution"
            description="Pie chart showing the distribution of test results. Green indicates successful tests, red shows failures, blue represents currently running tests, and gray shows pending tests."
            chartId="status"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {displayStatusData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry?.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Database Records Distribution */}
          <ChartCard
            title="Database Records Distribution"
            description="Shows the number of records in each database table. This helps identify data distribution and potential performance bottlenecks in tables with excessive records."
            chartId="database"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dbMetricsData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis label={{ value: 'Record Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="records" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Log Level Analysis */}
          <ChartCard
            title="Log Level Analysis"
            description="Breakdown of system logs by severity level. High error counts indicate system issues, warnings suggest potential problems, while info and debug logs are normal operational messages."
            chartId="logs"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={logLevelData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="count">
                  {logLevelData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry?.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Performance Grade Radar */}
          <ChartCard
            title="Performance Grade Overview"
            description="Radar chart showing performance grades for each test. The further from center, the better the performance. Tests closer to the center may need optimization."
            chartId="radar"
          >
            <ResponsiveContainer width="100%" height="100%">
              {performanceGrades?.length > 0 && performanceGrades[0].score > 0 ? (
                <RadarChart data={performanceGrades}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="test" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Performance Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>Run tests to see performance grades</p>
                </div>
              )}
            </ResponsiveContainer>
          </ChartCard>

          {/* System Health Timeline */}
          <ChartCard
            title="System Health Timeline"
            description="Timeline showing when tests were executed and their results. This helps identify patterns in test failures and system performance throughout the diagnostic session."
            chartId="timeline"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={testResults?.length > 0 ? testResults
                  .filter(test => test?.status !== 'pending') // Only show executed tests
                  .map((test, index) => ({
                    index: index + 1,
                    name: test.name,
                    duration: test.duration || 0,
                    status: test.status === 'success' ? 1 : test.status === 'error' ? -1 : 0
                  })) : [{ index: 1, name: 'No tests', duration: 0, status: 0 }]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="index" label={{ value: 'Test Sequence', position: 'insideBottom', offset: -5 }} />
                <YAxis 
                  label={{ value: 'Status', angle: -90, position: 'insideLeft' }} 
                  domain={[-1.5, 1.5]}
                  ticks={[-1, 0, 1]}
                  tickFormatter={(value) => value === 1 ? 'Pass' : value === -1 ? 'Fail' : 'Running'}
                />
                <Tooltip 
                  labelFormatter={(value) => `Test #${value}`}
                  formatter={(value: any, name: string) => {
                    if (name === 'status') {
                      return [value === 1 ? 'Success' : value === -1 ? 'Failed' : 'Running/Unknown', 'Status'];
                    }
                    return [`${value}ms`, 'Duration'];
                  }}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #ccc' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="status" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  dot={{ r: 6, fill: '#3b82f6' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Memory Usage Gauge */}
          <ChartCard
            title="Current Memory Utilization"
            description="Real-time memory usage percentage. Green (0-60%) is healthy, yellow (60-80%) needs monitoring, red (80-100%) indicates potential memory pressure."
            chartId="memoryGauge"
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { 
                      name: 'Used', 
                      value: systemMetrics.system?.memory ? 
                        Math.round((systemMetrics?.system.memory?.used / systemMetrics?.system.memory?.total) * 100) : 0
                    },
                    { 
                      name: 'Free', 
                      value: systemMetrics.system?.memory ? 
                        Math.round(((systemMetrics?.system.memory?.total - systemMetrics?.system.memory?.used) / systemMetrics?.system.memory?.total) * 100) : 100
                    }
                  ]}
                  cx="50%"
                  cy="50%"
                  startAngle={180}
                  endAngle={0}
                  innerRadius={60}
                  outerRadius={80}
                  dataKey="value"
                >
                  <Cell fill={
                    systemMetrics?.system?.memory && 
                    (systemMetrics?.system.memory?.used / systemMetrics?.system.memory?.total) > 0.8 ? '#ef4444' : 
                    (systemMetrics?.system.memory?.used / systemMetrics?.system.memory?.total) > 0.6 ? '#f59e0b' : '#10b981'
                  } />
                  <Cell fill="#e5e7eb" />
                </Pie>
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold">
                  {systemMetrics?.system?.memory ? 
                    `${Math.round((systemMetrics?.system.memory?.used / systemMetrics?.system.memory?.total) * 100)}%` : '0%'}
                </text>
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}