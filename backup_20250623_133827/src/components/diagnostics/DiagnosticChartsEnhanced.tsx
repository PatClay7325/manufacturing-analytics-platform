'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
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

// Custom hook for smooth data transitions
function useAnimatedData<T>(data: T[], key: keyof T) {
  const [animatedData, setAnimatedData] = useState(data);
  const previousData = useRef(data);

  useEffect(() => {
    // If data structure changed significantly, update immediately
    if (data?.length !== previousData?.current.length) {
      setAnimatedData(data);
      previousData.current = data;
      return;
    }

    // Smoothly transition numerical values
    const animationDuration = 500;
    const steps = 30;
    const stepDuration = animationDuration / steps;
    let currentStep = 0;

    const animateData = () => {
      currentStep++;
      const progress = currentStep / steps;
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

      const interpolatedData = data?.map((item, index) => {
        const prevItem = previousData?.current[index];
        if (!prevItem) return item;

        const newItem = { ...item };
        const currentValue = item[key];
        const previousValue = prevItem[key];

        if (typeof currentValue === 'number' && typeof previousValue === 'number') {
          newItem[key] = previousValue + (currentValue - previousValue) * easeProgress as T[keyof T];
        }

        return newItem;
      });

      setAnimatedData(interpolatedData);

      if (currentStep < steps) {
        requestAnimationFrame(animateData);
      } else {
        previousData.current = data;
      }
    };

    animateData();
  }, [data, key]);

  return animatedData;
}

// Static pie chart for continuous updates
const StaticPie = ({ data, colors }: { data: any[], colors: string[] }) => {
  return (
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        labelLine={false}
        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        outerRadius={80}
        fill="#8884d8"
        dataKey="value"
        isAnimationActive={false}
      >
        {data?.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={colors[index % colors?.length]} />
        ))}
      </Pie>
      <Tooltip />
    </PieChart>
  );
};

export default function DiagnosticChartsEnhanced({ testResults, systemMetrics, logs }: DiagnosticChartsProps) {
  const [showCharts, setShowCharts] = useState(true);
  const [memoryHistory, setMemoryHistory] = useState<any[]>([]);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [liveDataEnabled, setLiveDataEnabled] = useState(true);
  const updateIntervalRef = useRef<NodeJSTimeout>();

  // Track memory usage over time with smooth updates (optimized)
  const memoryHistoryRef = useRef<any[]>([]);
  const lastMemoryUpdateRef = useRef<number>(0);
  
  useEffect(() => {
    if (systemMetrics?.system?.memory) {
      const now = Date.now();
      // Only update every 2 seconds to reduce re-renders
      if (now - lastMemoryUpdateRef?.current > 2000) {
        const newEntry = {
          time: new Date().toLocaleTimeString(),
          used: Math.round(systemMetrics?.system.memory?.used / 1024 / 1024),
          total: Math.round(systemMetrics?.system.memory?.total / 1024 / 1024),
          percentage: Math.round((systemMetrics?.system.memory?.used / systemMetrics?.system.memory?.total) * 100)
        };
        
        // Update ref and state
        memoryHistoryRef.current = [...memoryHistoryRef?.current, newEntry].slice(-20);
        setMemoryHistory(memoryHistoryRef?.current);
        lastMemoryUpdateRef.current = now;
      }
    }
  }, [systemMetrics]);

  // Memoized data processing for performance
  const processedData = useMemo(() => {
    // Test performance data
    const testPerformanceData = testResults
      .filter(t => t?.duration && t?.duration > 0)
      .map(t => ({
        name: t.name.replace(' Test', '').replace(' Check', '').substring(0, 20),
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
    
    const hasTestData = testStatusData?.some(d => d?.value > 0);
    const displayStatusData = hasTestData ? testStatusData?.filter(d => d?.value > 0) : 
      [{ name: 'No tests run', value: 1, color: '#9ca3af' }];

    // Database metrics
    const dbMetricsData = systemMetrics?.database?.tables?.map(table => ({
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

    // Performance grades
    const successfulTests = testResults?.filter(t => t?.status === 'success' && t?.duration);
    const performanceGrades = successfulTests?.length > 0 ? successfulTests?.map(test => {
      const duration = test?.duration || 0;
      let grade = 'A';
      if (duration > 10000) grade = 'F';
      else if (duration > 5000) grade = 'D';
      else if (duration > 2000) grade = 'C';
      else if (duration > 1000) grade = 'B';
      
      return {
        test: test.name.substring(0, 15),
        grade,
        score: grade === 'A' ? 100 : grade === 'B' ? 80 : grade === 'C' ? 60 : grade === 'D' ? 40 : 20
      };
    }) : [
      { test: 'No tests', grade: 'N/A', score: 0 }
    ];

    return {
      testPerformanceData,
      displayStatusData,
      dbMetricsData,
      logLevelData,
      performanceGrades,
      colors: displayStatusData.map(d => d?.color)
    };
  }, [testResults?.length, systemMetrics?.database?.tables?.length, logs?.length]);

  // Use stable data references to prevent re-rendering
  const stableTestPerformance = useRef(processedData?.testPerformanceData);
  const stableDbMetrics = useRef(processedData?.dbMetricsData);
  const stableLogLevels = useRef(processedData?.logLevelData);
  
  // Smoothly update references without causing re-renders
  useEffect(() => {
    // Only update if there's a significant change
    if (JSON.stringify(stableTestPerformance?.current) !== JSON.stringify(processedData?.testPerformanceData)) {
      stableTestPerformance.current = processedData?.testPerformanceData;
    }
    if (JSON.stringify(stableDbMetrics?.current) !== JSON.stringify(processedData?.dbMetricsData)) {
      stableDbMetrics.current = processedData?.dbMetricsData;
    }
    if (JSON.stringify(stableLogLevels?.current) !== JSON.stringify(processedData?.logLevelData)) {
      stableLogLevels.current = processedData?.logLevelData;
    }
  }, [processedData]);

  // Use the stable references for rendering
  const animatedTestPerformance = stableTestPerformance?.current;
  const animatedDbMetrics = stableDbMetrics?.current;
  const animatedLogLevels = stableLogLevels?.current;
  const animatedMemoryHistory = memoryHistory;

  // Removed live data simulation to prevent unnecessary re-renders

  const ChartCard = ({ 
    title, 
    description, 
    chartId,
    children,
    badge 
  }: { 
    title: string; 
    description: string; 
    chartId: string;
    children: React.ReactNode;
    badge?: React.ReactNode;
  }) => (
    <div className="bg-white rounded-lg shadow p-6 transition-all duration-300 hover:shadow-lg">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          {badge}
        </div>
        <button
          onClick={() => {
            setExpandedChart(expandedChart === chartId ? null : chartId);
          }}
          className="text-gray-500 hover:text-gray-700 transition-colors"
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

  // Conditional rendering for loading state (after all hooks are called)
  if (systemMetrics === null) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading system metrics...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowCharts(!showCharts)}
            className="flex items-center gap-3 group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">{showCharts ? '📊' : '📈'}</span>
            <div className="text-left">
              <h2 className="text-xl font-semibold">Diagnostic Analytics</h2>
              <p className="text-sm text-gray-600">
                Real-time performance metrics with smooth animations
              </p>
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
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={liveDataEnabled}
                onChange={(e) => setLiveDataEnabled(e?.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Live Updates</span>
            </label>
            {liveDataEnabled && (
              <div className="flex items-center text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Live
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Grid with smooth animations */}
      {showCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
          {/* Test Performance Chart */}
          <ChartCard
            title="Test Execution Performance"
            description="Real-time test execution times with smooth transitions. Bars animate when new data arrives."
            chartId="performance"
            badge={
              <div className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                {animatedTestPerformance?.length} tests
              </div>
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={animatedTestPerformance?.length > 0 ? animatedTestPerformance : 
                  [{ name: 'No tests executed', duration: 0, status: 'pending' }]} 
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  label={{ value: 'Duration (ms)', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: any) => [`${value}ms`, 'Duration']}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar 
                  dataKey="duration" 
                  isAnimationActive={false}
                >
                  {animatedTestPerformance?.map((entry, index) => (
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
            description="Live memory consumption tracking with smooth area transitions. Updates every system metric refresh."
            chartId="memory"
            badge={
              animatedMemoryHistory?.length > 0 && animatedMemoryHistory[animatedMemoryHistory?.length - 1]?.percentage ? (
                <div className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                  {animatedMemoryHistory[animatedMemoryHistory?.length - 1].percentage}% used
                </div>
              ) : null
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={animatedMemoryHistory} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis 
                  label={{ value: 'Memory (MB)', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    `${value}MB`, 
                    name === 'used' ? 'Used Memory' : 'Total Memory'
                  ]}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stackId="1" 
                  stroke="#10b981" 
                  fill="url(#colorTotal)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
                <Area 
                  type="monotone" 
                  dataKey="used" 
                  stackId="2" 
                  stroke="#3b82f6" 
                  fill="url(#colorUsed)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Test Status Distribution */}
          <ChartCard
            title="Test Status Distribution"
            description="Animated pie chart showing test result distribution with smooth transitions."
            chartId="status"
          >
            <ResponsiveContainer width="100%" height="100%">
              <StaticPie data={processedData?.displayStatusData} colors={processedData?.colors} />
            </ResponsiveContainer>
          </ChartCard>

          {/* Database Records Distribution */}
          <ChartCard
            title="Database Records Distribution"
            description="Live database table sizes with animated bar updates."
            chartId="database"
            badge={
              <div className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                {animatedDbMetrics?.reduce((sum, item) => sum + item?.records, 0)} total
              </div>
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={animatedDbMetrics} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  label={{ value: 'Record Count', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar 
                  dataKey="records" 
                  fill="#8b5cf6"
                  isAnimationActive={false}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Log Level Analysis */}
          <ChartCard
            title="Log Level Analysis"
            description="Real-time log level distribution with color-coded bars."
            chartId="logs"
            badge={
              animatedLogLevels?.find(l => l?.level === 'ERROR')?.count && animatedLogLevels?.find(l => l?.level === 'ERROR')?.count > 0 ? (
                <div className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                  {animatedLogLevels?.find(l => l?.level === 'ERROR')?.count} errors
                </div>
              ) : null
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={animatedLogLevels} 
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="level" tick={{ fontSize: 12 }} />
                <YAxis 
                  label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar 
                  dataKey="count"
                  isAnimationActive={false}
                  radius={[4, 4, 0, 0]}
                >
                  {animatedLogLevels?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry?.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Performance Grade Radar */}
          <ChartCard
            title="Performance Grade Overview"
            description="Radar visualization of test performance grades with smooth transitions."
            chartId="radar"
          >
            <ResponsiveContainer width="100%" height="100%">
              {processedData?.performanceGrades.length > 0 && processedData?.performanceGrades[0].score > 0 ? (
                <RadarChart data={processedData?.performanceGrades}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="test" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={{ fontSize: 11 }}
                  />
                  <Radar 
                    name="Performance Score" 
                    dataKey="score" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.6}
                    isAnimationActive={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
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
            description="Timeline showing test execution sequence with smooth line transitions."
            chartId="timeline"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={testResults?.length > 0 ? testResults
                  .filter(test => test?.status !== 'pending')
                  .map((test, index) => ({
                    index: index + 1,
                    name: test.name,
                    duration: test.duration || 0,
                    status: test.status === 'success' ? 1 : test.status === 'error' ? -1 : 0
                  })) : [{ index: 1, name: 'No tests', duration: 0, status: 0 }]}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="index" 
                  label={{ value: 'Test Sequence', position: 'insideBottom', offset: -5 }}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  label={{ value: 'Status', angle: -90, position: 'insideLeft' }} 
                  domain={[-1.5, 1.5]}
                  ticks={[-1, 0, 1]}
                  tickFormatter={(value) => value === 1 ? 'Pass' : value === -1 ? 'Fail' : 'Running'}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  labelFormatter={(value) => `Test #${value}`}
                  formatter={(value: any, name: string) => {
                    if (name === 'status') {
                      return [value === 1 ? 'Success' : value === -1 ? 'Failed' : 'Running/Unknown', 'Status'];
                    }
                    return [`${value}ms`, 'Duration'];
                  }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="status" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  dot={{ r: 6, fill: '#3b82f6' }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Memory Usage Gauge */}
          <ChartCard
            title="Current Memory Utilization"
            description="Real-time memory gauge with smooth color transitions based on usage."
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
                  isAnimationActive={false}
                >
                  <Cell fill={
                    systemMetrics?.system?.memory && 
                    (systemMetrics?.system.memory?.used / systemMetrics?.system.memory?.total) > 0.8 ? '#ef4444' : systemMetrics.system?.memory && 
                    (systemMetrics?.system.memory?.used / systemMetrics?.system.memory?.total) > 0.6 ? '#f59e0b' : '#10b981'
                  } />
                  <Cell fill="#e5e7eb" />
                </Pie>
                <text 
                  x="50%" 
                  y="50%" 
                  textAnchor="middle" 
                  dominantBaseline="middle" 
                  className="text-2xl font-bold"
                >
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