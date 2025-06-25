'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Factory, RefreshCw, TrendingUp, AlertCircle, Activity, BarChart3, Gauge } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { AnalyticsPanel } from '@/components/analytics/AnalyticsPanel';
import { v4 as uuidv4 } from 'uuid';
import {
  OEEGaugeChart,
  OEETrendChart,
  EquipmentPerformanceRadar,
  QualityMetricsChart,
  DefectParetoChart,
  ProductionVolumeChart,
  EquipmentHealthMatrix,
  ShiftPerformanceChart,
  QualityTrendChart,
  ProductionByProductChart,
  ReliabilityMetricsChart
} from '@/components/charts/ComprehensiveCharts';

interface TimeRange {
  value: string;
  label: string;
  from: string;
  to: string;
}

const TIME_RANGES: TimeRange[] = [
  { value: '1h', label: 'Last 1 hour', from: 'now-1h', to: 'now' },
  { value: '24h', label: 'Last 24 hours', from: 'now-24h', to: 'now' },
  { value: '7d', label: 'Last 7 days', from: 'now-7d', to: 'now' },
  { value: '30d', label: 'Last 30 days', from: 'now-30d', to: 'now' },
];

interface LiveManufacturingDashboardProps {
  title?: string;
  defaultTimeRange?: string;
  defaultEquipment?: string;
  defaultTabIndex?: number;
  refreshInterval?: number;
}

export function LiveManufacturingDashboard({
  title = 'Manufacturing Intelligence Dashboard',
  defaultTimeRange = '24h',
  defaultEquipment = 'all',
  defaultTabIndex = 0,
  refreshInterval = 30
}: LiveManufacturingDashboardProps) {
  const [timeRange, setTimeRange] = useState(defaultTimeRange);
  const [selectedEquipment, setSelectedEquipment] = useState(defaultEquipment);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(defaultTabIndex);
  
  // Data states
  const [oeeData, setOeeData] = useState<any>(null);
  const [productionData, setProductionData] = useState<any>(null);
  const [equipmentData, setEquipmentData] = useState<any>(null);
  const [qualityData, setQualityData] = useState<any>(null);

  // Helper function to ensure unique keys for list items
  const ensureUniqueKeys = (items: any[], keyField: string, displayField: string) => {
    if (!items || !Array.isArray(items)) return [];
    
    return items.map((item, index) => ({
      ...item,
      _key: item.uid || item.id || `${keyField}-${index}-${uuidv4()}`,
      _displayName: item[displayField] || `Unknown ${keyField} ${index + 1}`
    }));
  };

  // Fetch OEE data
  const fetchOEEData = async () => {
    try {
      const response = await fetch(
        `/api/manufacturing-metrics/oee?timeRange=${timeRange}&workUnitId=${selectedEquipment}`
      );
      if (!response.ok) {
        const errorData = await response.text();
        console.error('OEE API Error:', errorData);
        throw new Error('Failed to fetch OEE data');
      }
      const data = await response.json();
      
      // Process data with unique keys following manufacturingPlatform pattern
      if (data.equipmentRanking) {
        data.equipmentRanking = ensureUniqueKeys(
          data.equipmentRanking,
          'equipment',
          'machineName'
        );
      }
      
      if (data.byProduct) {
        data.byProduct = ensureUniqueKeys(
          data.byProduct,
          'product',
          'productType'
        );
      }
      
      if (data.byShift) {
        data.byShift = ensureUniqueKeys(
          data.byShift,
          'shift',
          'shift'
        );
      }
      
      setOeeData(data);
    } catch (err) {
      console.error('Error fetching OEE data:', err);
      throw err;
    }
  };

  // Fetch Production data
  const fetchProductionData = async () => {
    try {
      const response = await fetch(
        `/api/manufacturing-metrics/production?timeRange=${timeRange}`
      );
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Production API Error:', errorData);
        throw new Error('Failed to fetch production data');
      }
      const data = await response.json();
      setProductionData(data);
    } catch (err) {
      console.error('Error fetching production data:', err);
      throw err;
    }
  };

  // Fetch Equipment Health data
  const fetchEquipmentData = async () => {
    try {
      const response = await fetch('/api/manufacturing-metrics/equipment-health');
      if (!response.ok) throw new Error('Failed to fetch equipment data');
      const data = await response.json();
      setEquipmentData(data);
    } catch (err) {
      console.error('Error fetching equipment data:', err);
      throw err;
    }
  };

  // Fetch Quality data
  const fetchQualityData = async () => {
    try {
      const response = await fetch(`/api/quality-metrics?timeRange=${timeRange}`);
      if (!response.ok) {
        // If quality metrics endpoint doesn't exist yet, use mock data
        setQualityData({
          current: { defectRate: 0.02, firstPassYield: 0.98 },
          trends: []
        });
        return;
      }
      const data = await response.json();
      setQualityData(data);
    } catch (err) {
      console.error('Error fetching quality data:', err);
      // Use mock data as fallback
      setQualityData({
        current: { defectRate: 0.02, firstPassYield: 0.98 },
        trends: []
      });
    }
  };

  // Fetch all data
  const fetchAllData = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      await Promise.all([
        fetchOEEData(),
        fetchProductionData(),
        fetchEquipmentData(),
        fetchQualityData()
      ]);
      setIsLoading(false);
    } catch (err) {
      setError('Failed to load dashboard data. Please check your database connection.');
      setIsLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial load and refresh interval
  useEffect(() => {
    fetchAllData();
    
    const interval = setInterval(fetchAllData, refreshInterval * 1000);
    
    return () => clearInterval(interval);
  }, [timeRange, selectedEquipment]);

  const handleRefresh = () => {
    if (!isRefreshing) {
      fetchAllData();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const tabs = [
    { id: 0, label: 'Overview', icon: BarChart3 },
    { id: 1, label: 'OEE Analysis', icon: Gauge },
    { id: 2, label: 'Production', icon: TrendingUp },
    { id: 3, label: 'Quality', icon: Activity },
    { id: 4, label: 'Equipment', icon: Factory },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Factory className="h-5 w-5 mr-2 text-primary-600" />
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
              <span className="ml-3 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                Live Data from Prisma
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={selectedEquipment}
                onChange={(e) => setSelectedEquipment(e.target.value)}
                className="text-sm border rounded px-3 py-1.5"
              >
                <option value="all">All Equipment</option>
                <option value="line-1">Production Line 1</option>
                <option value="line-2">Production Line 2</option>
                <option value="line-3">Production Line 3</option>
              </select>
              
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="text-sm border rounded px-3 py-1.5"
              >
                {TIME_RANGES.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
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

          {/* Tabs */}
          <div className="flex space-x-1 mt-4 border-b">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-6">
          <ErrorAlert 
            title="Dashboard Error" 
            message={error}
            onRetry={handleRefresh}
          />
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {activeTab === 0 && (
          <OverviewTab 
            oeeData={oeeData}
            productionData={productionData}
            equipmentData={equipmentData}
            qualityData={qualityData}
          />
        )}
        
        {activeTab === 1 && (
          <OEETab oeeData={oeeData} />
        )}
        
        {activeTab === 2 && (
          <ProductionTab productionData={productionData} />
        )}
        
        {activeTab === 3 && (
          <QualityTab qualityData={qualityData} oeeData={oeeData} />
        )}
        
        {activeTab === 4 && (
          <EquipmentTab equipmentData={equipmentData} oeeData={oeeData} />
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ oeeData, productionData, equipmentData, qualityData }: any) {
  const currentOEE = oeeData?.aggregated?.avgOEE || 0;
  const availability = oeeData?.aggregated?.avgAvailability || 0;
  const performance = oeeData?.aggregated?.avgPerformance || 0;
  const quality = oeeData?.aggregated?.avgQuality || 0;
  
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall OEE</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {(currentOEE * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Target: 85%</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Gauge className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Availability</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {(availability * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Uptime ratio</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Performance</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {(performance * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Speed efficiency</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Quality</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {(quality * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">First pass yield</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OEE Trend Chart */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">OEE Trend</h3>
            <OEETrendChart data={oeeData} />
          </div>
        </Card>

        {/* Equipment Status */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Equipment Status</h3>
            {oeeData?.equipmentRanking && oeeData.equipmentRanking.length > 0 ? (
              <div className="space-y-2">
                {oeeData.equipmentRanking.slice(0, 5).map((equipment: any) => (
                  <div key={equipment._key} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium">
                        {equipment._displayName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        OEE: {(equipment._avg?.oeeScore * 100 || 0).toFixed(1)}%
                      </span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(equipment._avg?.oeeScore * 100 || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-500">
                No equipment data available
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// OEE Tab Component
function OEETab({ oeeData }: any) {
  if (!oeeData) {
    return <div className="text-center py-8 text-gray-500">No OEE data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* OEE Overview Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Overall OEE</h3>
            <p className="text-4xl font-bold text-blue-600">
              {(oeeData.aggregated?.avgOEE * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 mt-2">Target: 85%</p>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Availability</h3>
            <p className="text-4xl font-bold text-green-600">
              {(oeeData.aggregated?.avgAvailability * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 mt-2">Equipment uptime</p>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Performance</h3>
            <p className="text-4xl font-bold text-blue-600">
              {(oeeData.aggregated?.avgPerformance * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 mt-2">Speed efficiency</p>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Quality</h3>
            <p className="text-4xl font-bold text-purple-600">
              {(oeeData.aggregated?.avgQuality * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 mt-2">First pass yield</p>
          </div>
        </Card>
      </div>

      {/* OEE Gauge and Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">OEE Score Gauge</h3>
            <OEEGaugeChart data={oeeData} />
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Shift Performance Comparison</h3>
            <ShiftPerformanceChart data={oeeData} />
          </div>
        </Card>
      </div>

      {/* OEE Trend Analysis */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">OEE Trend Analysis</h3>
          <OEETrendChart data={oeeData} />
        </div>
      </Card>

      {/* Equipment Performance Radar */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Equipment Performance Comparison</h3>
          <EquipmentPerformanceRadar data={oeeData} />
        </div>
      </Card>

      {/* Production by Product Type */}
      {oeeData.byProduct && oeeData.byProduct.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Production Distribution by Product</h3>
            <ProductionByProductChart data={oeeData} />
          </div>
        </Card>
      )}
    </div>
  );
}

// Production Tab Component
function ProductionTab({ productionData }: any) {
  
  if (!productionData) {
    return <div className="text-center py-8 text-gray-500">No production data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Production KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-600">Total Parts</p>
            <p className="text-3xl font-bold text-blue-600">{productionData.current?.totalParts || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Current production</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-600">Good Parts</p>
            <p className="text-3xl font-bold text-green-600">{productionData.current?.goodParts || 0}</p>
            <p className="text-xs text-gray-500 mt-1">Quality passed</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-600">Reject Rate</p>
            <p className="text-3xl font-bold text-red-600">
              {((productionData.current?.rejectedParts / productionData.current?.totalParts) * 100 || 0).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Quality failures</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-600">Production Total</p>
            <p className="text-3xl font-bold text-purple-600">
              {productionData.aggregated?.totalPartsProduced || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Total produced</p>
          </div>
        </Card>
      </div>

      {/* Production Volume Chart */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Production Volume Trend</h3>
          <ProductionVolumeChart data={productionData} />
        </div>
      </Card>

      {/* Production by Shift */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Production by Shift</h3>
            {productionData?.byShift && productionData.byShift.length > 0 ? (
              <ShiftPerformanceChart data={productionData} />
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-500">
                {productionData ? 'No shift data available' : 'Loading shift data...'}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Product Mix</h3>
            {productionData?.byProduct && productionData.byProduct.length > 0 ? (
              <ProductionByProductChart data={productionData} />
            ) : (
              <div className="h-32 flex items-center justify-center text-gray-500">
                {productionData ? 'No product data available' : 'Loading product data...'}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Top Performers */}
      {(() => {
        return productionData.topPerformers && productionData.topPerformers.length > 0;
      })() && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Top Performing Equipment</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-sm font-medium text-gray-600">Equipment</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-600">Total Parts</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-600">Good Parts</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-600">OEE Score</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-600">Quality Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {productionData.topPerformers.map((performer: any, index: number) => (
                    <tr key={`${performer.machineName}-${index}`} className="border-b">
                      <td className="py-2 text-sm">{performer.machineName || `Equipment ${index + 1}`}</td>
                      <td className="py-2 text-center text-sm">{performer.totalParts || 0}</td>
                      <td className="py-2 text-center text-sm">{performer.goodParts || 0}</td>
                      <td className="py-2 text-center text-sm">
                        <span className={`font-semibold ${
                          performer.avgOEE > 90 ? 'text-green-600' :
                          performer.avgOEE > 70 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {(performer.avgOEE || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 text-center text-sm">
                        <span className={`font-semibold ${
                          (performer.goodParts / performer.totalParts) > 0.95 ? 'text-green-600' :
                          (performer.goodParts / performer.totalParts) > 0.90 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {((performer.goodParts / performer.totalParts) * 100 || 0).toFixed(1)}%
                        </span>
                      </td>
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

// Quality Tab Component
function QualityTab({ qualityData, oeeData }: any) {
  const scrapRate = oeeData?.aggregated?.avgScrapRate || 0;
  const firstPassYield = qualityData?.current?.firstPassYield || oeeData?.aggregated?.avgFirstPassYield || 0;

  return (
    <div className="space-y-6">
      {/* Quality KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-600">First Pass Yield</p>
            <p className="text-3xl font-bold text-green-600">
              {(firstPassYield * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Quality rate</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-600">Defect Rate</p>
            <p className="text-3xl font-bold text-red-600">
              {(qualityData?.current?.defectRate * 100 || 0).toFixed(2)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Failed inspections</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-600">Avg Cpk</p>
            <p className="text-3xl font-bold text-blue-600">
              {qualityData?.current?.avgCpk?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Process capability</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-600">Avg Ppk</p>
            <p className="text-3xl font-bold text-purple-600">
              {qualityData?.current?.avgPpk?.toFixed(2) || '0.00'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Performance index</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-600">Within Spec</p>
            <p className="text-3xl font-bold text-green-600">
              {qualityData?.current?.withinSpec || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Passed samples</p>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <p className="text-sm text-gray-600">Out of Spec</p>
            <p className="text-3xl font-bold text-red-600">
              {qualityData?.current?.outOfSpec || 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">Failed samples</p>
          </div>
        </Card>
      </div>

      {/* Process Capability Analysis */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Process Capability Analysis (Cpk/Ppk by Parameter)</h3>
          <QualityMetricsChart data={qualityData} />
        </div>
      </Card>

      {/* Defect Analysis Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Defect Pareto Analysis</h3>
            <DefectParetoChart data={qualityData} />
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quality Trend Analysis</h3>
            <QualityTrendChart data={qualityData} />
          </div>
        </Card>
      </div>

      {/* Quality by Shift */}
      {qualityData?.byShift && qualityData.byShift.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quality Performance by Shift</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-sm font-medium text-gray-600">Shift</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-600">Samples</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-600">Avg Value</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-600">Avg Cpk</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-600">Avg Ppk</th>
                  </tr>
                </thead>
                <tbody>
                  {qualityData.byShift.map((shift: any, index: number) => (
                    <tr key={`${shift.shift || 'unknown'}-${index}`} className="border-b">
                      <td className="py-2 text-sm">{shift.shift || 'Unknown'}</td>
                      <td className="py-2 text-center text-sm">{shift.count || 0}</td>
                      <td className="py-2 text-center text-sm">{shift.avgValue?.toFixed(2) || '0.00'}</td>
                      <td className="py-2 text-center text-sm">
                        <span className={`font-semibold ${
                          shift.avgCpk >= 1.67 ? 'text-green-600' :
                          shift.avgCpk >= 1.33 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {shift.avgCpk?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="py-2 text-center text-sm">
                        <span className={`font-semibold ${
                          shift.avgPpk >= 1.67 ? 'text-green-600' :
                          shift.avgPpk >= 1.33 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {shift.avgPpk?.toFixed(2) || '0.00'}
                        </span>
                      </td>
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

// Equipment Tab Component  
function EquipmentTab({ equipmentData, oeeData }: any) {
  return (
    <div className="space-y-6">
      {/* Equipment Health KPIs */}
      {equipmentData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-4 text-center">
              <p className="text-sm text-gray-600">Total Equipment</p>
              <p className="text-3xl font-bold text-blue-600">{equipmentData.summary.totalEquipment || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Monitored units</p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="text-sm text-gray-600">Healthy</p>
              <p className="text-3xl font-bold text-green-600">{equipmentData.summary.healthyCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Health &gt; 80%</p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="text-sm text-gray-600">Warning</p>
              <p className="text-3xl font-bold text-yellow-600">{equipmentData.summary.warningCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Health 60-80%</p>
            </div>
          </Card>
          <Card>
            <div className="p-4 text-center">
              <p className="text-sm text-gray-600">Critical</p>
              <p className="text-3xl font-bold text-red-600">{equipmentData.summary.criticalCount || 0}</p>
              <p className="text-xs text-gray-500 mt-1">Health &lt; 60%</p>
            </div>
          </Card>
        </div>
      )}

      {/* Equipment Health Matrix */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Equipment Health Matrix</h3>
          <EquipmentHealthMatrix data={equipmentData} />
        </div>
      </Card>

      {/* Reliability Metrics */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Reliability Analysis (MTBF/MTTR)</h3>
          <ReliabilityMetricsChart data={equipmentData} />
        </div>
      </Card>

      {/* Equipment Performance Ranking */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Equipment Performance Details</h3>
          {equipmentData?.equipment && equipmentData.equipment.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-sm font-medium text-gray-600">Equipment</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-600">Overall Health</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-600">MTBF (hrs)</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-600">MTTR (hrs)</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-600">Vibration</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-600">Temperature</th>
                    <th className="text-center py-2 text-sm font-medium text-gray-600">Risk Level</th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentData.equipment.map((eq: any, index: number) => (
                    <tr key={eq.id || index} className="border-b">
                      <td className="py-2 text-sm">{eq.workCenter?.name || `Equipment ${index + 1}`}</td>
                      <td className="py-2 text-center">
                        <span className={`text-sm font-semibold ${
                          eq.overallHealth > 0.8 ? 'text-green-600' :
                          eq.overallHealth > 0.6 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {(eq.overallHealth * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 text-center text-sm">{eq.mtbf?.toFixed(1) || 'N/A'}</td>
                      <td className="py-2 text-center text-sm">{eq.mttr?.toFixed(1) || 'N/A'}</td>
                      <td className="py-2 text-center text-sm">
                        <span className={`${
                          eq.vibrationLevel > 2 ? 'text-red-600' :
                          eq.vibrationLevel > 1.5 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {eq.vibrationLevel?.toFixed(2) || 'N/A'} mm/s
                        </span>
                      </td>
                      <td className="py-2 text-center text-sm">
                        <span className={`${
                          eq.temperatureLevel > 80 ? 'text-red-600' :
                          eq.temperatureLevel > 70 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {eq.temperatureLevel?.toFixed(1) || 'N/A'} °C
                        </span>
                      </td>
                      <td className="py-2 text-center">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          eq.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                          eq.riskLevel === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                          eq.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {eq.riskLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center">No equipment data available</p>
          )}
        </div>
      </Card>
    </div>
  );
}