'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  TrendingUp,
  AlertCircle,
  Users,
  Activity,
  Clock,
  Shield,
  RefreshCw
} from 'lucide-react';
import { format, subDays } from 'date-fns';

interface AuditAnalytics {
  eventCounts: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  severityBreakdown: Record<string, number>;
  topUsers: Array<{ userId: string; userName?: string; count: number }>;
  topResources: Array<{ resourceType: string; count: number }>;
  performanceMetrics: {
    avgResponseTime: number;
    avgQueryDuration: number;
    slowestOperations: Array<{ action: string; avgDuration: number }>;
  };
  errorRate: number;
  timeline: Array<{ period: string; count: number; errors: number }>;
}

export function AuditLogAnalytics() {
  const [analytics, setAnalytics] = useState<AuditAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    groupBy: 'day' as 'hour' | 'day' | 'week' | 'month'
  });

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        startDate: new Date(dateRange.startDate).toISOString(),
        endDate: new Date(dateRange.endDate).toISOString(),
        groupBy: dateRange.groupBy
      });
      
      const response = await fetch(`/api/audit-logs/analytics?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-20 bg-gray-200 rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Card className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error || 'Failed to load analytics'}</p>
        </div>
      </Card>
    );
  }

  // Prepare chart data
  const categoryData = Object.entries(analytics.categoryBreakdown).map(([name, value]) => ({
    name,
    value
  }));

  const statusData = Object.entries(analytics.statusBreakdown).map(([name, value]) => ({
    name,
    value
  }));

  const severityData = Object.entries(analytics.severityBreakdown).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
          />
          <span>to</span>
          <Input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
          />
          <Select
            value={dateRange.groupBy}
            onChange={(e) => setDateRange({ ...dateRange, groupBy: e.target.value as any })}
          >
            <option value="hour">Hourly</option>
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </Select>
          <Button onClick={fetchAnalytics} variant="outline">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Events</p>
              <p className="text-2xl font-bold">
                {Object.values(analytics.eventCounts).reduce((a, b) => a + b, 0).toLocaleString()}
              </p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Error Rate</p>
              <p className="text-2xl font-bold">{analytics.errorRate.toFixed(2)}%</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Response Time</p>
              <p className="text-2xl font-bold">{analytics.performanceMetrics.avgResponseTime}ms</p>
            </div>
            <Clock className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Users</p>
              <p className="text-2xl font-bold">{analytics.topUsers.length}</p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Timeline Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Event Timeline</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={analytics.timeline}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="count" stackId="1" stroke="#8884d8" fill="#8884d8" name="Total Events" />
            <Area type="monotone" dataKey="errors" stackId="1" stroke="#ff8042" fill="#ff8042" name="Errors" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Events by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Status Breakdown */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Events by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#8884d8">
                {statusData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={
                      entry.name === 'success' ? '#10b981' :
                      entry.name === 'error' ? '#ef4444' :
                      entry.name === 'warning' ? '#f59e0b' :
                      '#6b7280'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Users */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Most Active Users</h3>
          <div className="space-y-2">
            {analytics.topUsers.slice(0, 10).map((user, index) => (
              <div key={user.userId} className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">#{index + 1}</span>
                  <div>
                    <p className="font-medium">{user.userName || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">{user.userId}</p>
                  </div>
                </div>
                <span className="font-semibold">{user.count}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Slowest Operations */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Slowest Operations</h3>
          <div className="space-y-2">
            {analytics.performanceMetrics.slowestOperations.slice(0, 10).map((op, index) => (
              <div key={op.action} className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">#{index + 1}</span>
                  <p className="font-medium">{op.action}</p>
                </div>
                <span className="font-semibold">{op.avgDuration}ms</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Severity Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Events by Severity</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={severityData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8">
              {severityData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={
                    entry.name === 'critical' ? '#991b1b' :
                    entry.name === 'error' ? '#ef4444' :
                    entry.name === 'warning' ? '#f59e0b' :
                    entry.name === 'info' ? '#3b82f6' :
                    '#6b7280'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}