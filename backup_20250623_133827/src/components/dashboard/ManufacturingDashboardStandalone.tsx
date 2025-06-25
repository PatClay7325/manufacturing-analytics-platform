'use client';

import React, { useState, useEffect } from 'react';
import { Factory, RefreshCw, TrendingUp, AlertCircle, Activity, BarChart3 } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';

interface TimeRange {
  from: string;
  to: string;
  label: string;
}

interface MetricData {
  oee?: {
    current: number;
    availability: number;
    performance: number;
    quality: number;
    trend: Array<{ time: string; value: number }>;
  };
  production?: {
    currentRate: number;
    targetRate: number;
    totalUnits: number;
    efficiency: number;
    byLine: Array<{ line: string; units: number; efficiency: number }>;
  };
  equipment?: {
    totalCount: number;
    activeCount: number;
    healthScore: number;
    alerts: number;
    status: Array<{ id: string; name: string; status: string; health: number }>;
  };
}

interface ManufacturingDashboardProps {
  title?: string;
  defaultTimeRange?: TimeRange;
  defaultEquipment?: string;
  refreshInterval?: number; // in seconds
}

export function ManufacturingDashboardStandalone({
  title = 'Manufacturing Intelligence Dashboard',
  defaultTimeRange = { from: 'now-24h', to: 'now', label: 'Last 24 hours' },
  defaultEquipment = 'all',
  refreshInterval = 30
}: ManufacturingDashboardProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange);
  const [selectedEquipment, setSelectedEquipment] = useState<string>(defaultEquipment);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MetricData>({});

  // Fetch data from internal APIs
  const fetchData = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      // Fetch data from multiple endpoints in parallel
      const [oeeResponse, productionResponse, equipmentResponse] = await Promise.allSettled([
        fetch(`/api/manufacturing-metrics/oee?from=${timeRange.from}&to=${timeRange.to}&equipment=${selectedEquipment}`),
        fetch(`/api/manufacturing-metrics/production?from=${timeRange.from}&to=${timeRange.to}`),
        fetch(`/api/manufacturing-metrics/equipment-health`)
      ]);

      const newData: MetricData = {};

      // Process OEE data
      if (oeeResponse.status === 'fulfilled' && oeeResponse.value.ok) {
        newData.oee = await oeeResponse.value.json();
      }

      // Process Production data
      if (productionResponse.status === 'fulfilled' && productionResponse.value.ok) {
        newData.production = await productionResponse.value.json();
      }

      // Process Equipment data
      if (equipmentResponse.status === 'fulfilled' && equipmentResponse.value.ok) {
        newData.equipment = await equipmentResponse.value.json();
      }

      setData(newData);
      
      if (Object.keys(newData).length === 0) {
        setError('No data available. Please check your database connection.');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load and refresh interval
  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, refreshInterval * 1000);
    
    return () => clearInterval(interval);
  }, [timeRange, selectedEquipment, refreshInterval]);

  // Handle manual refresh
  const handleRefresh = () => {
    if (!isRefreshing) {
      fetchData();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && Object.keys(data).length === 0) {
    return (
      <div className="p-6">
        <ErrorAlert 
          title="Dashboard Error" 
          message={error}
          onRetry={handleRefresh}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Factory className="h-5 w-5 mr-2 text-primary-600" />
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            <span className="ml-3 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
              Live Data
            </span>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="text-sm border rounded px-3 py-1"
            >
              <option value="all">All Equipment</option>
              <option value="line-1">Production Line 1</option>
              <option value="line-2">Production Line 2</option>
              <option value="line-3">Production Line 3</option>
            </select>
            
            <select
              value={timeRange.label}
              onChange={(e) => {
                const option = e.target.options[e.target.selectedIndex];
                setTimeRange({
                  from: option.getAttribute('data-from') || 'now-24h',
                  to: option.getAttribute('data-to') || 'now',
                  label: option.value
                });
              }}
              className="text-sm border rounded px-3 py-1"
            >
              <option value="Last 1 hour" data-from="now-1h" data-to="now">Last 1 hour</option>
              <option value="Last 24 hours" data-from="now-24h" data-to="now">Last 24 hours</option>
              <option value="Last 7 days" data-from="now-7d" data-to="now">Last 7 days</option>
              <option value="Last 30 days" data-from="now-30d" data-to="now">Last 30 days</option>
            </select>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              title="Refresh dashboard"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* OEE Card */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall OEE</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {data.oee?.current ? `${(data.oee.current * 100).toFixed(1)}%` : '--'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Target: 85%
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </Card>

        {/* Production Rate Card */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Production Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {data.production?.currentRate || '--'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  units/hour
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </Card>

        {/* Equipment Health Card */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Equipment Health</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {data.equipment?.healthScore ? `${(data.equipment.healthScore * 100).toFixed(0)}%` : '--'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {data.equipment?.activeCount || 0} of {data.equipment?.totalCount || 0} active
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </Card>

        {/* Alerts Card */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {data.equipment?.alerts || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Requires attention
                </p>
              </div>
              <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* OEE Components */}
      {data.oee && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">OEE Components</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Availability</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {(data.oee.availability * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Performance</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {(data.oee.performance * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Quality</p>
                <p className="text-2xl font-bold text-purple-600 mt-1">
                  {(data.oee.quality * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Production by Line */}
      {data.production?.byLine && data.production.byLine.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Production by Line</h3>
            <div className="space-y-3">
              {data.production.byLine.map((line) => (
                <div key={line.line} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{line.line}</span>
                      <span className="text-sm text-gray-600">{line.units} units</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${line.efficiency * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Equipment Status */}
      {data.equipment?.status && data.equipment.status.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Equipment Status</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-sm font-medium text-gray-600">Equipment</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-600">Status</th>
                    <th className="text-left py-2 text-sm font-medium text-gray-600">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {data.equipment.status.slice(0, 5).map((equip) => (
                    <tr key={equip.id} className="border-b">
                      <td className="py-2 text-sm">{equip.name}</td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          equip.status === 'running' ? 'bg-green-100 text-green-700' :
                          equip.status === 'idle' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {equip.status}
                        </span>
                      </td>
                      <td className="py-2 text-sm">{(equip.health * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}