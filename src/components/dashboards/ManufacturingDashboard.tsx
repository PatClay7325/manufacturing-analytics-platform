'use client';

import React, { useState, useEffect } from 'react';
import OEEGauge from '@/components/visualization/OEEGauge';
import TimeSeriesChart from '@/components/visualization/TimeSeriesChart';
import ParetoChart from '@/components/visualization/ParetoChart';
import SPCChart from '@/components/visualization/SPCChart';

interface ManufacturingDashboardProps {
  workUnitId?: string;
  refreshInterval?: number;
  className?: string;
}

export default function ManufacturingDashboard({
  workUnitId,
  refreshInterval = 30000,
  className = ''
}: ManufacturingDashboardProps) {
  const [dashboardData, setDashboardData] = useState({
    oee: {
      availability: 92.5,
      performance: 87.3,
      quality: 98.2
    },
    production: [],
    defects: [],
    spcData: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Simulate data fetching
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // In real implementation, fetch from your API
        const newData = generateSampleData();
        setDashboardData(newData);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [workUnitId, refreshInterval]);

  if (isLoading && !dashboardData.production.length) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Manufacturing Dashboard</h2>
          <div className="text-sm text-gray-600">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <OEEGauge
            availability={dashboardData.oee.availability}
            performance={dashboardData.oee.performance}
            quality={dashboardData.oee.quality}
            size="medium"
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Production Metrics</h3>
          <div className="space-y-4">
            <MetricCard
              label="Units Produced"
              value="2,847"
              change="+12.5%"
              trend="up"
            />
            <MetricCard
              label="Cycle Time"
              value="45.2s"
              change="-3.2%"
              trend="down"
              unit="avg"
            />
            <MetricCard
              label="Utilization"
              value="87.3%"
              change="+2.1%"
              trend="up"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Quality Metrics</h3>
          <div className="space-y-4">
            <MetricCard
              label="First Pass Yield"
              value="98.2%"
              change="+0.5%"
              trend="up"
            />
            <MetricCard
              label="Defect Rate"
              value="1.8%"
              change="-0.5%"
              trend="down"
            />
            <MetricCard
              label="Rework Rate"
              value="0.9%"
              change="-0.2%"
              trend="down"
            />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <TimeSeriesChart
            data={dashboardData.production}
            series={[
              { key: 'actual', name: 'Actual Production', color: '#3b82f6', unit: 'units/hr' },
              { key: 'target', name: 'Target', color: '#10b981', strokeDasharray: '5 5' }
            ]}
            height={300}
            referenceLines={[
              { y: 100, label: 'Target', color: '#10b981' }
            ]}
          />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <ParetoChart
            data={dashboardData.defects}
            title="Defect Analysis"
            height={300}
          />
        </div>
      </div>

      {/* SPC Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <SPCChart
          data={dashboardData.spcData}
          title="Critical Dimension Control Chart"
          targetValue={10.0}
          upperControlLimit={10.3}
          lowerControlLimit={9.7}
          upperSpecLimit={10.5}
          lowerSpecLimit={9.5}
          unit="mm"
          height={400}
        />
      </div>
    </div>
  );
}

// Helper component for metric cards
interface MetricCardProps {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  unit?: string;
}

function MetricCard({ label, value, change, trend, unit }: MetricCardProps) {
  const trendColor = trend === 'up' ? 'text-green-600' : 'text-red-600';
  const trendIcon = trend === 'up' ? '↑' : '↓';

  return (
    <div className="flex justify-between items-center">
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-800">
          {value} {unit && <span className="text-sm font-normal text-gray-600">{unit}</span>}
        </p>
      </div>
      <div className={`text-sm font-medium ${trendColor}`}>
        {trendIcon} {change}
      </div>
    </div>
  );
}

// Sample data generator (replace with real API calls)
function generateSampleData() {
  const now = new Date();
  const production = [];
  const defects = [
    { category: 'Dimensional Error', count: 45, description: 'Parts out of tolerance' },
    { category: 'Surface Defect', count: 32, description: 'Scratches or blemishes' },
    { category: 'Material Flaw', count: 28, description: 'Raw material issues' },
    { category: 'Assembly Error', count: 21, description: 'Incorrect assembly' },
    { category: 'Color Variation', count: 15, description: 'Color mismatch' },
    { category: 'Missing Component', count: 12, description: 'Parts missing' },
    { category: 'Other', count: 8, description: 'Miscellaneous defects' }
  ];

  // Generate production time series
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 3600000);
    production.push({
      timestamp: time.toISOString(),
      actual: 95 + Math.random() * 20,
      target: 100
    });
  }

  // Generate SPC data
  const spcData = [];
  for (let i = 1; i <= 30; i++) {
    spcData.push({
      sample: i,
      value: 10.0 + (Math.random() - 0.5) * 0.6,
      timestamp: new Date(now.getTime() - (30 - i) * 3600000).toISOString()
    });
  }

  return {
    oee: {
      availability: 92.5 + (Math.random() - 0.5) * 5,
      performance: 87.3 + (Math.random() - 0.5) * 5,
      quality: 98.2 + (Math.random() - 0.5) * 2
    },
    production,
    defects,
    spcData
  };
}
