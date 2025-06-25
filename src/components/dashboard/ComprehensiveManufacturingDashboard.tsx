'use client';

import React, { useState, useEffect } from 'react';
import { Factory, RefreshCw, TrendingUp, AlertCircle, Activity, BarChart3, Gauge, CheckCircle, XCircle, Clock, Wrench, Zap, ThermometerSun } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';

// Dynamic imports for chart components
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const RadarChart = dynamic(() => import('recharts').then(mod => mod.RadarChart), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false });
const ComposedChart = dynamic(() => import('recharts').then(mod => mod.ComposedChart), { ssr: false });
const ScatterChart = dynamic(() => import('recharts').then(mod => mod.ScatterChart), { ssr: false });

const {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  Bar,
  Pie,
  Cell,
  Area,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Scatter,
  RadialBar,
  RadialBarChart
} = await import('recharts');

interface TimeRange {
  value: string;
  label: string;
  from: string;
  to: string;
}

const TIME_RANGES: TimeRange[] = [
  { value: '1h', label: 'Last 1 hour', from: 'now-1h', to: 'now' },
  { value: 'last24h', label: 'Last 24 hours', from: 'now-24h', to: 'now' },
  { value: '7d', label: 'Last 7 days', from: 'now-7d', to: 'now' },
  { value: '30d', label: 'Last 30 days', from: 'now-30d', to: 'now' },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

interface ComprehensiveManufacturingDashboardProps {
  title?: string;
  defaultTimeRange?: string;
  defaultEquipment?: string;
  defaultTabIndex?: number;
  refreshInterval?: number;
}

export function ComprehensiveManufacturingDashboard({
  title = 'Manufacturing Intelligence Dashboard',
  defaultTimeRange = 'last24h',
  defaultEquipment = 'all',
  defaultTabIndex = 0,
  refreshInterval = 30
}: ComprehensiveManufacturingDashboardProps) {
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

  // Fetch all data
  const fetchAllData = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const [oee, production, equipment, quality] = await Promise.all([
        fetch(`/api/manufacturing-metrics/oee?timeRange=${timeRange}&workUnitId=${selectedEquipment}`).then(r => r.json()),
        fetch(`/api/manufacturing-metrics/production?timeRange=${timeRange}`).then(r => r.json()),
        fetch('/api/manufacturing-metrics/equipment-health').then(r => r.json()),
        fetch(`/api/quality-metrics?timeRange=${timeRange}`).then(r => r.json())
      ]);

      setOeeData(oee);
      setProductionData(production);
      setEquipmentData(equipment);
      setQualityData(quality);
      setIsLoading(false);
    } catch (err) {
      setError('Failed to load dashboard data');
      setIsLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [timeRange, selectedEquipment]);

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
                Live Data
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
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
                onClick={fetchAllData}
                disabled={isRefreshing}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
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

      {/* Content */}
      <div className="p-6">
        {activeTab === 0 && <ComprehensiveOverviewTab {...{ oeeData, productionData, equipmentData, qualityData }} />}
        {activeTab === 1 && <ComprehensiveOEETab oeeData={oeeData} />}
        {activeTab === 2 && <ComprehensiveProductionTab productionData={productionData} />}
        {activeTab === 3 && <ComprehensiveQualityTab qualityData={qualityData} />}
        {activeTab === 4 && <ComprehensiveEquipmentTab equipmentData={equipmentData} />}
      </div>
    </div>
  );
}

// Comprehensive Overview Tab
function ComprehensiveOverviewTab({ oeeData, productionData, equipmentData, qualityData }: any) {
  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall OEE</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {((oeeData?.aggregated?.avgOEE || 0) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Target: 85%</p>
              </div>
              <Gauge className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Production</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {productionData?.current?.totalProduced?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Units produced</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">First Pass Yield</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {((qualityData?.current?.firstPassYield || 0) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Quality rate</p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Equipment Health</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {equipmentData?.averageHealth?.toFixed(0) || 0}%
                </p>
                <p className="text-xs text-gray-500 mt-1">Average health score</p>
              </div>
              <Activity className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Multi-metric Chart */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Production & Quality Trends</h3>
          <div className="h-80">
            {oeeData?.trends && oeeData.trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={oeeData.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="oeeScore" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} name="OEE Score" />
                  <Line yAxisId="left" type="monotone" dataKey="availability" stroke="#10B981" name="Availability" />
                  <Line yAxisId="left" type="monotone" dataKey="performance" stroke="#F59E0B" name="Performance" />
                  <Line yAxisId="left" type="monotone" dataKey="quality" stroke="#EF4444" name="Quality" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No trend data available
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// Comprehensive OEE Tab
function ComprehensiveOEETab({ oeeData }: any) {
  if (!oeeData) return null;

  const oeeComponents = [
    { name: 'Availability', value: (oeeData.aggregated?.avgAvailability || 0) * 100, color: '#10B981' },
    { name: 'Performance', value: (oeeData.aggregated?.avgPerformance || 0) * 100, color: '#F59E0B' },
    { name: 'Quality', value: (oeeData.aggregated?.avgQuality || 0) * 100, color: '#EF4444' },
  ];

  return (
    <div className="space-y-6">
      {/* OEE Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">OEE Components</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={oeeComponents}>
                  <RadialBar dataKey="value" cornerRadius={10} fill="#8884d8" label={{ position: 'insideStart', fill: '#fff' }}>
                    {oeeComponents.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </RadialBar>
                  <Legend />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">OEE by Equipment</h3>
            <div className="h-80">
              {oeeData.equipmentRanking && oeeData.equipmentRanking.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={oeeData.equipmentRanking} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="machineName" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="_avg.oeeScore" fill="#3B82F6" name="OEE Score">
                      {oeeData.equipmentRanking.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No equipment data available
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* OEE Trends */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">OEE Trend Analysis</h3>
          <div className="h-80">
            {oeeData.trends && oeeData.trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={oeeData.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="oeeScore" stroke="#3B82F6" strokeWidth={2} name="OEE Score" />
                  <Line type="monotone" dataKey="availability" stroke="#10B981" strokeWidth={2} name="Availability" />
                  <Line type="monotone" dataKey="performance" stroke="#F59E0B" strokeWidth={2} name="Performance" />
                  <Line type="monotone" dataKey="quality" stroke="#EF4444" strokeWidth={2} name="Quality" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No trend data available
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* OEE by Shift and Product */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">OEE by Shift</h3>
            <div className="h-64">
              {oeeData.byShift && oeeData.byShift.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={oeeData.byShift}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="shift" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgOEE" fill="#8B5CF6" name="Average OEE" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No shift data available
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">OEE by Product Type</h3>
            <div className="h-64">
              {oeeData.byProduct && oeeData.byProduct.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={oeeData.byProduct}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="productType" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="avgOEE" fill="#EC4899" name="Average OEE" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No product data available
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Comprehensive Production Tab
function ComprehensiveProductionTab({ productionData }: any) {
  if (!productionData) return null;

  return (
    <div className="space-y-6">
      {/* Production KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600">Total Produced</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {productionData.current?.totalProduced?.toLocaleString() || 0}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600">Good Parts</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {productionData.current?.goodParts?.toLocaleString() || 0}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600">Rejected Parts</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {productionData.current?.rejectedParts?.toLocaleString() || 0}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600">Production Rate</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {productionData.current?.productionRate?.toFixed(1) || 0}/hr
            </p>
          </div>
        </Card>
      </div>

      {/* Production Trends */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Production Trends</h3>
          <div className="h-80">
            {productionData.trends && productionData.trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={productionData.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="totalProduced" stackId="1" stroke="#3B82F6" fill="#3B82F6" name="Total Produced" />
                  <Area type="monotone" dataKey="goodParts" stackId="2" stroke="#10B981" fill="#10B981" name="Good Parts" />
                  <Area type="monotone" dataKey="rejectedParts" stackId="2" stroke="#EF4444" fill="#EF4444" name="Rejected Parts" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No production trend data available
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Production by Shift and Product */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Production by Shift</h3>
            <div className="h-64">
              {productionData.byShift && productionData.byShift.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productionData.byShift}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="shift" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalProduced" fill="#3B82F6" name="Total Produced" />
                    <Bar dataKey="goodParts" fill="#10B981" name="Good Parts" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No shift data available
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Production by Product Type</h3>
            <div className="h-64">
              {productionData.byProduct && productionData.byProduct.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productionData.byProduct}
                      dataKey="totalProduced"
                      nameKey="productType"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {productionData.byProduct.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No product data available
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Comprehensive Quality Tab
function ComprehensiveQualityTab({ qualityData }: any) {
  if (!qualityData) return null;

  return (
    <div className="space-y-6">
      {/* Quality KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600">First Pass Yield</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {((qualityData.current?.firstPassYield || 0) * 100).toFixed(2)}%
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600">Defect Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {((qualityData.current?.defectRate || 0) * 100).toFixed(2)}%
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600">Average Cpk</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {qualityData.current?.avgCpk?.toFixed(3) || 0}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600">Average Ppk</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {qualityData.current?.avgPpk?.toFixed(3) || 0}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600">Within Spec</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {qualityData.current?.withinSpec?.toLocaleString() || 0}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600">Out of Spec</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {qualityData.current?.outOfSpec?.toLocaleString() || 0}
            </p>
          </div>
        </Card>
      </div>

      {/* Quality by Parameter */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quality Metrics by Parameter</h3>
          <div className="h-80">
            {qualityData.byParameter && qualityData.byParameter.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={qualityData.byParameter}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="parameter" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="avgCpk" fill="#3B82F6" name="Avg Cpk" />
                  <Bar yAxisId="left" dataKey="avgPpk" fill="#10B981" name="Avg Ppk" />
                  <Bar yAxisId="right" dataKey="count" fill="#F59E0B" name="Sample Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No parameter data available
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Quality Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Defect Analysis */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Defect Type Analysis</h3>
            <div className="h-64">
              {qualityData.defectAnalysis && qualityData.defectAnalysis.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qualityData.defectAnalysis}
                      dataKey="count"
                      nameKey="defectType"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({value, percentage}: any) => `${value} (${percentage}%)`}
                    >
                      {qualityData.defectAnalysis.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No defect data available
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Quality by Shift */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Quality Performance by Shift</h3>
            <div className="h-64">
              {qualityData.byShift && qualityData.byShift.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={qualityData.byShift}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="shift" />
                    <PolarRadiusAxis />
                    <Radar name="Avg Cpk" dataKey="avgCpk" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                    <Radar name="Avg Ppk" dataKey="avgPpk" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No shift data available
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Quality Trends */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quality Trends Over Time</h3>
          <div className="h-80">
            {qualityData.trends && qualityData.trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Legend />
                  <Scatter name="Measurements" data={qualityData.trends} fill="#3B82F6">
                    {qualityData.trends.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.isWithinSpec ? '#10B981' : '#EF4444'} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No trend data available
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// Comprehensive Equipment Tab
function ComprehensiveEquipmentTab({ equipmentData }: any) {
  if (!equipmentData) return null;

  return (
    <div className="space-y-6">
      {/* Equipment Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600">Average Health</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {equipmentData.averageHealth?.toFixed(1) || 0}%
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600">At Risk Equipment</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {equipmentData.atRiskCount || 0}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600">Critical Failures</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {equipmentData.criticalCount || 0}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-6">
            <p className="text-sm font-medium text-gray-600">Maintenance Due</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {equipmentData.maintenanceDue || 0}
            </p>
          </div>
        </Card>
      </div>

      {/* Equipment Health Details */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Equipment Health Status</h3>
          <div className="space-y-4">
            {equipmentData.equipment && equipmentData.equipment.length > 0 ? (
              equipmentData.equipment.map((eq: any) => (
                <div key={eq.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{eq.equipmentId || 'Unknown Equipment'}</h4>
                    <span className={`px-2 py-1 text-xs rounded ${
                      eq.overallHealth >= 80 ? 'bg-green-100 text-green-800' :
                      eq.overallHealth >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {eq.overallHealth?.toFixed(0)}% Health
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-600">Mechanical</p>
                      <div className="flex items-center mt-1">
                        <Wrench className="h-4 w-4 mr-1 text-gray-500" />
                        <span className="text-sm font-medium">{eq.mechanicalHealth?.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Electrical</p>
                      <div className="flex items-center mt-1">
                        <Zap className="h-4 w-4 mr-1 text-gray-500" />
                        <span className="text-sm font-medium">{eq.electricalHealth?.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Temperature</p>
                      <div className="flex items-center mt-1">
                        <ThermometerSun className="h-4 w-4 mr-1 text-gray-500" />
                        <span className="text-sm font-medium">{eq.temperature?.toFixed(1)}°C</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">MTBF</p>
                      <div className="flex items-center mt-1">
                        <Clock className="h-4 w-4 mr-1 text-gray-500" />
                        <span className="text-sm font-medium">{eq.mtbf?.toFixed(0)}h</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bars for health components */}
                  <div className="mt-4 space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Availability</span>
                        <span>{eq.availability?.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(eq.availability || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Reliability</span>
                        <span>{eq.reliability?.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${Math.min(eq.reliability || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No equipment data available
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ComprehensiveManufacturingDashboard;