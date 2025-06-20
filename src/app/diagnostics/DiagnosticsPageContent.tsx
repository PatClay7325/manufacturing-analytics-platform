'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import TabNavigation from '@/components/common/TabNavigation';
import DiagnosticChartsEnhanced from '@/components/diagnostics/DiagnosticChartsEnhanced';
import MetricsTestPanel from '@/components/diagnostics/MetricsTestPanel';

// Icons for tabs
const TabIcons = {
  systemTests: '🔧',
  metrics: '📊',
  Analytics: '📈',
  logs: '📝',
  configuration: '⚙️'
};

interface TestResult {
  id: string;
  name: string;
  endpoint: string;
  status: 'pending' | 'running' | 'success' | 'error';
  duration?: number;
  request?: any;
  response?: any;
  error?: string;
  timestamp: string;
}

interface SystemMetrics {
  ollama: {
    status: string;
    models: string[];
    memoryUsage?: number;
    activeRequests?: number;
  };
  database: {
    status: string;
    tables: { name: string; count: number }[];
    connectionPool?: { active: number; idle: number };
    latency?: number;
    error?: string;
    hint?: string;
  };
  api: {
    status: string;
    endpoints: { name: string; status: string; avgResponseTime?: number }[];
  };
  system: {
    nodeVersion: string;
    platform: string;
    memory: { used: number; total: number };
    uptime: number;
  };
}

interface ConfigOptions {
  ollamaUrl: string;
  ollamaModel: string;
  maxTokens: number;
  temperature: number;
  contextWindow: number;
  streamingEnabled: boolean;
  cacheEnabled: boolean;
  dbQueryTimeout: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export default function DiagnosticsPageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get('tab') || 'systemTests';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // System Tests State
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testProgress, setTestProgress] = useState({ completed: 0, total: 0, percentage: 0 });
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [config, setConfig] = useState<ConfigOptions>({
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'gemma:2b',
    maxTokens: 500,
    temperature: 0.7,
    contextWindow: 2048,
    streamingEnabled: true,
    cacheEnabled: true,
    dbQueryTimeout: 5000,
    logLevel: 'info',
  });
  
  // Logs State
  const [logs, setLogs] = useState<string[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'warn' | 'info' | 'debug'>('all');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [userHasScrolledLogs, setUserHasScrolledLogs] = useState(false);
  const logsScrollTimeoutRef = useRef<NodeJSTimeout>();

  // Test definitions
  const testDefinitions = [
    {
      id: 'production-ready',
      name: 'Production Readiness Check',
      endpoint: '/api/diagnostics/production-ready',
      description: 'Comprehensive check for production deployment',
      category: 'infrastructure'
    },
    {
      id: 'ollama-health',
      name: 'Ollama Health Check',
      endpoint: '/api/diagnostics/ollama-health',
      description: 'Verify Ollama container and API availability',
      category: 'infrastructure'
    },
    {
      id: 'db-connection',
      name: 'Database Connection',
      endpoint: '/api/diagnostics/db-connection',
      description: 'Test PostgreSQL connectivity and Prisma client',
      category: 'infrastructure'
    },
    {
      id: 'db-queries',
      name: 'Database Queries',
      endpoint: '/api/diagnostics/db-queries',
      description: 'Execute sample queries and measure performance',
      category: 'performance'
    },
    {
      id: 'ollama-inference',
      name: 'Ollama Inference',
      endpoint: '/api/diagnostics/ollama-inference',
      description: 'Test AI model inference capabilities',
      category: 'ai'
    },
    {
      id: 'streaming-test',
      name: 'Streaming Response',
      endpoint: '/api/diagnostics/streaming',
      description: 'Verify SSE streaming functionality',
      category: 'api'
    },
    {
      id: 'manufacturing-context',
      name: 'Manufacturing Context',
      endpoint: '/api/diagnostics/manufacturing-context',
      description: 'Test context enhancement with DB data',
      category: 'ai'
    },
    {
      id: 'cache-test',
      name: 'Cache Performance',
      endpoint: '/api/diagnostics/cache',
      description: 'Measure cache hit rates and performance',
      category: 'performance'
    },
    {
      id: 'load-test',
      name: 'Load Test',
      endpoint: '/api/diagnostics/load',
      description: 'Simulate concurrent requests',
      category: 'performance'
    },
  ];

  const tabs = [
    { 
      id: 'systemTests', 
      label: 'System Tests', 
      icon: TabIcons.systemTests,
      badge: testResults.filter(t => t?.status === 'error').length || undefined
    },
    { 
      id: 'metrics', 
      label: 'Metrics Test', 
      icon: TabIcons.metrics 
    },
    { 
      id: 'Analytics', 
      label: 'Analytics', 
      icon: TabIcons.Analytics,
      badge: testResults.filter(t => t?.status === 'success').length || undefined
    },
    { 
      id: 'logs', 
      label: 'System Logs', 
      icon: TabIcons.logs,
      badge: logs.filter(log => log?.includes('[ERROR]')).length || undefined
    },
    { 
      id: 'configuration', 
      label: 'Configuration', 
      icon: TabIcons.configuration 
    }
  ];

  const addLog = (message: string, level: 'info' | 'error' | 'warn' | 'debug' = 'info') => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level?.toUpperCase()}] ${message}`;
    setLogs(prev => {
      const newLogs = [...prev, logEntry];
      // Keep only last 1000 logs
      if (newLogs?.length > 1000) {
        return newLogs?.slice(-1000);
      }
      return newLogs;
    });
  };

  const runTest = async (testDef: typeof testDefinitions[0]) => {
    const testResult: TestResult = {
      id: testDef.id,
      name: testDef.name,
      endpoint: testDef.endpoint,
      status: 'running',
      timestamp: new Date().toISOString(),
    };

    setTestResults(prev => [...prev?.filter(t => t?.id !== testDef?.id), testResult]);
    addLog(`Starting test: ${testDef?.name}`, 'info');

    const startTime = Date.now();

    try {
      const response = await fetch(testDef?.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          customPrompt: testDef.id === 'ollama-inference' ? customPrompt : undefined,
        }),
      });

      const data = await response?.json();
      const duration = Date.now() - startTime;

      if (response?.ok) {
        testResult.status = 'success';
        testResult.response = data;
        testResult.duration = duration;
        addLog(`Test passed: ${testDef?.name} (${duration}ms)`, 'info');
      } else {
        testResult.status = 'error';
        testResult.error = data?.error || 'Unknown error';
        testResult.duration = duration;
        addLog(`Test failed: ${testDef?.name} - ${testResult?.error}`, 'error');
      }
    } catch (error) {
      testResult.status = 'error';
      testResult.error = error instanceof Error ? error?.message : 'Unknown error';
      testResult.duration = Date.now() - startTime;
      addLog(`Test error: ${testDef?.name} - ${testResult?.error}`, 'error');
    }

    setTestResults(prev => [...prev?.filter(t => t?.id !== testDef?.id), testResult]);
    return testResult;
  };

  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestProgress({ completed: 0, total: testDefinitions.length, percentage: 0 });
    addLog('Starting comprehensive diagnostic tests', 'info');
    
    for (let i = 0; i < testDefinitions?.length; i++) {
      await runTest(testDefinitions[i]);
      const completed = i + 1;
      const percentage = Math.round((completed / testDefinitions?.length) * 100);
      setTestProgress({ completed, total: testDefinitions.length, percentage });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    addLog('All tests completed', 'info');
    setIsRunningTests(false);
    await fetchSystemMetrics();
  };

  const fetchSystemMetrics = async () => {
    try {
      const response = await fetch('/api/diagnostics/system-metrics');
      const data = await response?.json();
      setSystemMetrics(data);
      addLog('System metrics updated', 'debug');
      
      if (data?.database?.status === 'disconnected') {
        addLog('Database connection check failed - verify DATABASE_URL configuration', 'warn');
      }
    } catch (error) {
      addLog('Failed to fetch system metrics', 'error');
    }
  };

  const refreshDatabase = async () => {
    addLog('Manually refreshing database connection...', 'info');
    await fetchSystemMetrics();
  };

  const exportDiagnostics = () => {
    const diagnosticData = {
      timestamp: new Date().toISOString(),
      config,
      testResults,
      systemMetrics,
      logs,
    };

    const blob = new Blob([JSON.stringify(diagnosticData, null, 2)], { type: 'application/json' });
    const url = URL?.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostics-${new Date().toISOString().replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a?.click();
    document.body.removeChild(a);
    URL?.revokeObjectURL(url);
    
    addLog('Diagnostics exported', 'info');
  };

  const copyToClipboard = (text: string) => {
    navigator?.clipboard.writeText(text);
    addLog('Copied to clipboard', 'debug');
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <span className="text-green-500 text-xl">✅</span>;
      case 'error':
        return <span className="text-red-500 text-xl">❌</span>;
      case 'running':
        return <span className="text-blue-500 text-xl animate-pulse">⚡</span>;
      default:
        return <span className="text-gray-400 text-xl">⭕</span>;
    }
  };

  useEffect(() => {
    fetchSystemMetrics();
    const interval = setInterval(fetchSystemMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (!isRunningTests || userHasScrolledLogs) return;
    
    const scrollContainer = logsEndRef?.current?.parentElement;
    if (scrollContainer && logs?.length > 0) {
      const isNearBottom = scrollContainer?.scrollHeight - scrollContainer?.scrollTop - scrollContainer?.clientHeight < 100;
      if (isNearBottom) {
        if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs?.length, userHasScrolledLogs, isRunningTests]);

  // Filter logs based on selected filter
  const filteredLogs = logs?.filter(log => {
    if (logFilter === 'all') return true;
    return log?.includes(`[${logFilter?.toUpperCase()}]`);
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Enterprise Diagnostics Center</h1>
                <p className="mt-2 text-sm text-gray-600">
                  Comprehensive testing, monitoring, and configuration for Manufacturing Analytics Platform
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  Live Data Mode
                </div>
                <div className="text-xs text-gray-500">
                  Mock Service Worker Disabled
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            variant="underline"
            size="lg"
            persistInUrl={true}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Tests Tab */}
        {activeTab === 'systemTests' && (
          <SystemTestsPanel
            testDefinitions={testDefinitions}
            testResults={testResults}
            testProgress={testProgress}
            systemMetrics={systemMetrics}
            isRunningTests={isRunningTests}
            selectedTest={selectedTest}
            customPrompt={customPrompt}
            runTest={runTest}
            runAllTests={runAllTests}
            setSelectedTest={setSelectedTest}
            setCustomPrompt={setCustomPrompt}
            refreshDatabase={refreshDatabase}
            exportDiagnostics={exportDiagnostics}
            copyToClipboard={copyToClipboard}
            getStatusIcon={getStatusIcon}
            addLog={addLog}
          />
        )}

        {/* Metrics Test Tab */}
        {activeTab === 'metrics' && (
          <div className="animate-fadeIn">
            <MetricsTestPanel />
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'Analytics' && (
          <div className="animate-fadeIn">
            <DiagnosticChartsEnhanced 
              testResults={testResults}
              systemMetrics={systemMetrics}
              logs={logs}
            />
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <LogsPanel
            logs={filteredLogs}
            logFilter={logFilter}
            setLogFilter={setLogFilter}
            setLogs={setLogs}
            logsEndRef={logsEndRef}
            userHasScrolledLogs={userHasScrolledLogs}
            setUserHasScrolledLogs={setUserHasScrolledLogs}
          />
        )}

        {/* Configuration Tab */}
        {activeTab === 'configuration' && (
          <ConfigurationPanel
            config={config}
            setConfig={setConfig}
            exportDiagnostics={exportDiagnostics}
          />
        )}
      </div>
    </div>
  );
}

// System Tests Panel Component
function SystemTestsPanel(props: any) {
  const { testDefinitions,
    testResults,
    testProgress,
    systemMetrics,
    isRunningTests,
    selectedTest,
    customPrompt,
    runTest,
    runAllTests,
    setSelectedTest,
    setCustomPrompt,
    refreshDatabase,
    exportDiagnostics,
    copyToClipboard,
    getStatusIcon,
    addLog
   } = props || {};

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Progress Bar */}
      {isRunningTests && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Test Progress</h3>
            <span className="text-sm text-gray-600">
              {testProgress?.completed} of {testProgress?.total} tests completed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-out flex items-center justify-center"
              style={{ width: `${testProgress?.percentage}%` }}
            >
              {testProgress?.percentage > 10 && (
                <span className="text-xs text-white font-semibold">
                  {testProgress?.percentage}%
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {testResults?.find(r => r?.status === 'running')?.name || 'Preparing tests...'}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Testing Area */}
        <div className="xl:col-span-2 space-y-6">
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Diagnostic Tests</h2>
              <div className="flex space-x-2">
                <button
                  onClick={runAllTests}
                  disabled={isRunningTests}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <span className={`mr-2 ${isRunningTests ? 'animate-spin inline-block' : ''}`}>🔄</span>
                  Run All Tests
                </button>
                <button
                  onClick={exportDiagnostics}
                  className="flex items-center px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  <span className="mr-2">💾</span>
                  Export Report
                </button>
              </div>
            </div>

            {/* Test Categories */}
            <div className="space-y-4">
              {['infrastructure', 'performance', 'ai', 'api'].map(category => {
                const categoryTests = testDefinitions?.filter(t => t?.category === category);
                const categoryName = category?.charAt(0).toUpperCase() + category?.slice(1);
                
                return (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">{categoryName} Tests</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categoryTests?.map(test => {
                        const result = testResults?.find(r => r?.id === test?.id);
                        return (
                          <div
                            key={test?.id}
                            className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => {
                              if (result) setSelectedTest(result);
                              if (!isRunningTests) runTest(test);
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium">{test?.name}</h4>
                                <p className="text-sm text-gray-600 mt-1">{test?.description}</p>
                                {result?.duration && (
                                  <p className="text-xs text-gray-500 mt-2">
                                    Duration: {result?.duration}ms
                                  </p>
                                )}
                              </div>
                              <div className="ml-2">
                                {getStatusIcon(result?.status || 'pending')}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Prompt Test */}
            <div className="mt-6 pt-6 border-t">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom AI Test Prompt
              </label>
              <div className="flex gap-2">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e?.target.value)}
                  placeholder="Enter a custom prompt to test AI inference..."
                  className="flex-1 px-3 py-2 border rounded-md h-20 resize-none"
                />
                <button
                  onClick={() => {
                    const inferenceTest = testDefinitions?.find(t => t?.id === 'ollama-inference');
                    if (inferenceTest && customPrompt) {
                      runTest(inferenceTest);
                    }
                  }}
                  disabled={!customPrompt || isRunningTests}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Test AI
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* System Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">System Status</h2>
              <div className="flex gap-2">
                <button
                  onClick={refreshDatabase}
                  className="text-gray-600 hover:text-gray-800"
                  title="Refresh status"
                >
                  <span className="text-lg">🔄</span>
                </button>
                <button
                  onClick={async () => {
                    addLog('Running detailed database test...', 'info');
                    try {
                      const response = await fetch('/api/diagnostics/db-test-detailed');
                      const data = await response?.json();
                      console.log('Detailed DB Test:', data);
                      addLog(`Database test: ${data?.status}`, data?.status === 'connected' ? 'info' : 'error');
                      if (data?.error) {
                        addLog(`Error: ${data?.error}`, 'error');
                      }
                    } catch (error) {
                      addLog('Failed to run detailed test', 'error');
                    }
                  }}
                  className="text-gray-600 hover:text-gray-800"
                  title="Run detailed database test"
                >
                  <span className="text-lg">🔍</span>
                </button>
              </div>
            </div>
            
            {systemMetrics ? (
              <div className="space-y-4">
                {/* Ollama Status */}
                <StatusSection
                  icon="🖥️"
                  title="Ollama"
                  status={systemMetrics?.ollama.status}
                  details={[
                    { label: 'Models', value: systemMetrics.ollama.models?.length }
                  ]}
                />

                {/* Database Status */}
                <StatusSection
                  icon="🗄️"
                  title="Database"
                  status={systemMetrics?.database.status}
                  details={[
                    ...(systemMetrics?.database.tables || []).map(table => ({
                      label: table.name,
                      value: `${table?.count} records`
                    })),
                    ...(systemMetrics?.database.latency ? [{
                      label: 'Latency',
                      value: `${systemMetrics?.database.latency}ms`
                    }] : [])
                  ]}
                  error={systemMetrics?.database.error}
                />

                {/* System Metrics */}
                <StatusSection
                  icon="⚙️"
                  title="System"
                  status="healthy"
                  details={[
                    {
                      label: 'Memory',
                      value: `${Math.round(systemMetrics?.system.memory?.used / 1024 / 1024)}MB / ${Math.round(systemMetrics?.system.memory?.total / 1024 / 1024)}MB`
                    },
                    {
                      label: 'Uptime',
                      value: `${Math.round(systemMetrics?.system.uptime / 60)}m`
                    }
                  ]}
                />
              </div>
            ) : (
              <div className="text-center text-gray-500">Loading metrics...</div>
            )}
          </div>

          {/* Test Result Details */}
          {selectedTest && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold">Test Details</h2>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(selectedTest, null, 2))}
                  className="text-gray-600 hover:text-gray-800"
                  title="Copy to clipboard"
                >
                  <span className="text-lg">📋</span>
                </button>
              </div>
              
              <div className="space-y-3">
                <DetailRow label="Test" value={selectedTest?.name} />
                <DetailRow 
                  label="Status" 
                  value={
                    <span className="flex items-center">
                      {getStatusIcon(selectedTest?.status)}
                      <span className="ml-2">{selectedTest?.status}</span>
                    </span>
                  } 
                />
                {selectedTest?.duration && (
                  <DetailRow label="Duration" value={`${selectedTest?.duration}ms`} />
                )}
                {selectedTest?.error && (
                  <DetailRow 
                    label="Error" 
                    value={<span className="text-red-600">{selectedTest?.error}</span>} 
                  />
                )}
                {selectedTest?.response && (
                  <div>
                    <span className="font-medium text-sm">Response:</span>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(selectedTest?.response, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Logs Panel Component
function LogsPanel({ logs, logFilter, setLogFilter, setLogs, logsEndRef, userHasScrolledLogs, setUserHasScrolledLogs }: any) {
  return (
    <div className="bg-white rounded-lg shadow animate-fadeIn">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">System Logs</h2>
          <div className="flex items-center gap-4">
            {/* Log Filter */}
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e?.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Logs</option>
              <option value="error">Errors Only</option>
              <option value="warn">Warnings</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
            
            {/* Clear Button */}
            <button
              onClick={() => setLogs([])}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Log Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {['error', 'warn', 'info', 'debug'].map((level) => {
            const count = logs?.filter(log => log?.includes(`[${level?.toUpperCase()}]`)).length;
            const colors = {
              error: 'text-red-600 bg-red-50',
              warn: 'text-yellow-600 bg-yellow-50',
              info: 'text-blue-600 bg-blue-50',
              debug: 'text-gray-600 bg-gray-50'
            };
            
            return (
              <div key={level} className={`p-3 rounded-lg ${colors[level as keyof typeof colors]}`}>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm capitalize">{level} Messages</div>
              </div>
            );
          })}
        </div>

        {/* Log Display */}
        <div className="relative">
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500">No logs available</div>
            ) : (
              logs?.map((log, index) => (
                <div key={index} className={`mb-1 ${
                  log?.includes('[ERROR]') ? 'text-red-400' : log.includes('[WARN]') ? 'text-yellow-400' : log.includes('[DEBUG]') ? 'text-gray-500' :
                  'text-gray-300'
                }`}>
                  {log}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
          
          {/* Scroll to bottom indicator */}
          {userHasScrolledLogs && logs?.length > 10 && (
            <button
              onClick={() => {
                setUserHasScrolledLogs(false);
                logsEndRef?.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="absolute bottom-2 right-2 bg-gray-700 hover:bg-gray-600 text-white rounded-full p-1.5 shadow-lg transition-colors"
              title="Scroll to bottom"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7m0 0l-7-7m7 7V4" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Configuration Panel Component
function ConfigurationPanel({ config, setConfig, exportDiagnostics }: any) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Ollama Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Ollama Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ollama URL
            </label>
            <input
              type="text"
              value={config?.ollamaUrl}
              onChange={(e) => setConfig({ ...config, ollamaUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <select
              value={config?.ollamaModel}
              onChange={(e) => setConfig({ ...config, ollamaModel: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="gemma:2b">gemma:2b</option>
              <option value="llama2:7b">llama2:7b</option>
              <option value="mistral:7b">mistral:7b</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Tokens
            </label>
            <input
              type="number"
              value={config?.maxTokens}
              onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e?.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={config?.temperature}
              onChange={(e) => setConfig({ ...config, temperature: parseFloat(e?.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Database Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Database Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Context Window
            </label>
            <input
              type="number"
              value={config?.contextWindow}
              onChange={(e) => setConfig({ ...config, contextWindow: parseInt(e?.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              DB Query Timeout (ms)
            </label>
            <input
              type="number"
              value={config?.dbQueryTimeout}
              onChange={(e) => setConfig({ ...config, dbQueryTimeout: parseInt(e?.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Feature Toggles</h2>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config?.streamingEnabled}
              onChange={(e) => setConfig({ ...config, streamingEnabled: e.target.checked })}
              className="mr-3 h-4 w-4 text-blue-600 rounded"
            />
            <div>
              <span className="font-medium">Enable Streaming</span>
              <p className="text-sm text-gray-600">Stream AI responses in real-time</p>
            </div>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={config?.cacheEnabled}
              onChange={(e) => setConfig({ ...config, cacheEnabled: e.target.checked })}
              className="mr-3 h-4 w-4 text-blue-600 rounded"
            />
            <div>
              <span className="font-medium">Enable Cache</span>
              <p className="text-sm text-gray-600">Cache responses for improved performance</p>
            </div>
          </label>
        </div>
      </div>

      {/* Log Level */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Logging Configuration</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Log Level
          </label>
          <select
            value={config?.logLevel}
            onChange={(e) => setConfig({ ...config, logLevel: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Export Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Export Configuration</h2>
        <p className="text-sm text-gray-600 mb-4">
          Export the current configuration and diagnostic data for analysis or backup.
        </p>
        <button
          onClick={exportDiagnostics}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Export Diagnostics
        </button>
      </div>
    </div>
  );
}

// Helper Components
function StatusSection({ icon, title, status, details, error }: any) {
  const statusColors = {
    healthy: 'text-green-600',
    connected: 'text-green-600',
    disconnected: 'text-red-600',
    offline: 'text-red-600',
    unknown: 'text-gray-600'
  };

  return (
    <div>
      <div className="flex items-center mb-2">
        <span className="mr-2 text-gray-600">{icon}</span>
        <span className="font-medium">{title}</span>
      </div>
      <div className="ml-7 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Status:</span>
          <span className={statusColors[status as keyof typeof statusColors] || 'text-gray-600'}>
            {status}
          </span>
        </div>
        {details?.map((detail: any, index: number) => (
          <div key={index} className="flex justify-between text-xs">
            <span className="text-gray-600">{detail?.label}:</span>
            <span>{detail?.value}</span>
          </div>
        ))}
        {error && (
          <div className="mt-2 text-xs text-red-600">
            Error: {error}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div>

        <span className="font-medium text-sm text-gray-700">{label}:</span>

        <div className="mt-1 text-sm">{value}</div>

      </div>
    </div>
  );
}