'use client';

import React, { useState } from 'react';
import { ManufacturingDashboard } from '@/components/analytics/ManufacturingDashboard';
import ManufacturingChart from '@/components/charts/ManufacturingChart';
import { Card } from '@/components/common/Card';
import { BarChart3, TrendingUp, AlertCircle, Activity } from 'lucide-react';

// Sample data for native charts
const sampleOEEData = [
  { time: '00:00', oee: 78, availability: 85, performance: 82, quality: 95 },
  { time: '04:00', oee: 82, availability: 88, performance: 85, quality: 96 },
  { time: '08:00', oee: 85, availability: 90, performance: 88, quality: 97 },
  { time: '12:00', oee: 83, availability: 87, performance: 86, quality: 96 },
  { time: '16:00', oee: 80, availability: 85, performance: 83, quality: 95 },
  { time: '20:00', oee: 79, availability: 84, performance: 82, quality: 95 }
];

const sampleDowntimeData = [
  { name: 'Equipment Failure', value: 45, cumulative: 45 },
  { name: 'Material Shortage', value: 30, cumulative: 75 },
  { name: 'Changeover', value: 20, cumulative: 95 },
  { name: 'Maintenance', value: 15, cumulative: 100 },
  { name: 'Other', value: 10, cumulative: 100 }
];

export default function UnifiedDashboardPage() {
  const [activeTab, setActiveTab] = useState<'native' | 'analyticsPlatform' | 'hybrid'>('hybrid');

  const metrics = [
    { 
      title: 'Overall OEE', 
      value: '82.5%', 
      trend: '+2.3%', 
      icon: BarChart3,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      title: 'Active Alerts', 
      value: '12', 
      trend: '-3', 
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    { 
      title: 'Production Rate', 
      value: '425/hr', 
      trend: '+5.2%', 
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      title: 'Equipment Health', 
      value: '94%', 
      trend: 'Stable', 
      icon: Activity,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    }
  ];

  return (
    <div>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Unified Manufacturing Intelligence Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Combining real-time Analytics with advanced visualizations
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 border-b">
            {[
              { id: 'hybrid', label: 'Hybrid View' },
              { id: 'native', label: 'Native Charts' },
              { id: 'analyticsPlatform', label: 'Analytics Dashboards' }
            ].map((tab) => (
              <button
                key={tab?.id}
                onClick={() => setActiveTab(tab?.id as any)}
                className={`
                  px-4 py-2 text-sm font-medium border-b-2 transition-colors
                  ${activeTab === tab?.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab?.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* KPI Cards - Always visible */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {metrics?.map((metric) => {
            const Icon = metric?.icon;
            return (
              <Card key={metric?.title} className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{metric?.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {metric?.value}
                    </p>
                    <p className={`text-sm mt-1 ${metric?.color}`}>
                      {metric?.trend}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${metric?.bgColor}`}>
                    <Icon className={`h-6 w-6 ${metric?.color}`} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Native Charts View */}
        {activeTab === 'native' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ManufacturingChart
                visualization={{
                  chartType: 'line_chart',
                  title: 'OEE Trending - 24 Hours',
                  description: 'Overall Equipment Effectiveness over time',
                  data: sampleOEEData,
                  config: {
                    xAxisKey: 'time',
                    yAxisKey: 'oee',
                    height: 350
                  }
                }}
              />
              
              <ManufacturingChart
                visualization={{
                  chartType: 'pareto_chart',
                  title: 'Downtime Analysis',
                  description: 'Major contributors to equipment downtime',
                  data: sampleDowntimeData,
                  config: {
                    xAxisKey: 'name',
                    yAxisKey: 'value',
                    height: 350
                  }
                }}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ManufacturingChart
                visualization={{
                  chartType: 'gauge_chart',
                  title: 'Current OEE',
                  description: 'Real-time OEE performance',
                  data: [{ value: 82.5 }],
                  config: {
                    dataKey: 'value',
                    max: 100,
                    unit: '%',
                    height: 250
                  }
                }}
              />
              
              <ManufacturingChart
                visualization={{
                  chartType: 'pie_chart',
                  title: 'Alert Distribution',
                  description: 'Active alerts by category',
                  data: [
                    { name: 'Critical', value: 3 },
                    { name: 'High', value: 5 },
                    { name: 'Medium', value: 4 }
                  ],
                  config: {
                    dataKey: 'value',
                    height: 250
                  }
                }}
              />
              
              <ManufacturingChart
                visualization={{
                  chartType: 'bar_chart',
                  title: 'Shift Performance',
                  description: 'Production by shift',
                  data: [
                    { shift: 'Morning', value: 420, target: 400 },
                    { shift: 'Afternoon', value: 385, target: 400 },
                    { shift: 'Night', value: 390, target: 400 }
                  ],
                  config: {
                    xAxisKey: 'shift',
                    yAxisKey: 'value',
                    height: 250
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Analytics View */}
        {activeTab === 'analyticsPlatform' && (
          <div className="space-y-6">
            <ManufacturingDashboard
              dashboardId="manufacturing-oee-v1"
              title="Manufacturing OEE Dashboard"
              height={600}
              timeRange="now-24h"
              refresh="30s"
            />
          </div>
        )}

        {/* Hybrid View */}
        {activeTab === 'hybrid' && (
          <div className="space-y-6">
            {/* Native Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ManufacturingChart
                visualization={{
                  chartType: 'line_chart',
                  title: 'Real-time OEE Trend',
                  description: 'Live OEE data from manufacturing floor',
                  data: sampleOEEData,
                  config: {
                    xAxisKey: 'time',
                    yAxisKey: 'oee',
                    height: 300
                  }
                }}
              />
              
              <ManufacturingChart
                visualization={{
                  chartType: 'pareto_chart',
                  title: 'Top Issues',
                  description: 'Primary downtime contributors',
                  data: sampleDowntimeData,
                  config: {
                    xAxisKey: 'name',
                    yAxisKey: 'value',
                    height: 300
                  }
                }}
              />
            </div>

            {/* Embedded Analytics Dashboard */}
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Advanced Analytics Dashboard
              </h2>
              <ManufacturingDashboard
                dashboardId="equipment-health-v1"
                title="Equipment Health Monitoring"
                height={500}
                timeRange="now-12h"
                refresh="10s"
                theme="light"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}