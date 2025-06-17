'use client';

import React, { useState, useEffect } from 'react';
import { AlertStatistics } from '@/models/alert';
import alertService from '@/services/alertService';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface AlertStatisticsComponentProps {
  initialStats?: AlertStatistics;
}

export default function AlertStatisticsComponent({ initialStats }: AlertStatisticsComponentProps) {
  const [stats, setStats] = useState<AlertStatistics>(initialStats || {
    total: 0,
    bySeverity: {},
    byStatus: {},
    byAlertType: {},
    trend: []
  });
  const [loading, setLoading] = useState<boolean>(!initialStats);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (initialStats) return;
    
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await alertService.getAlertStatistics();
        setStats(data);
      } catch (err) {
        setError('Failed to load alert statistics. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [initialStats]);
  
  // Prepare data for trend chart
  const trendData = {
    labels: stats.trend.map(item => item.date),
    datasets: [
      {
        label: 'Alert Count',
        data: stats.trend.map(item => item.count),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
      },
    ],
  };
  
  // Prepare data for severity chart
  const severityData = {
    labels: Object.keys(stats.bySeverity),
    datasets: [
      {
        label: 'Alerts by Severity',
        data: Object.values(stats.bySeverity),
        backgroundColor: [
          'rgba(239, 68, 68, 0.7)',   // critical - red
          'rgba(249, 115, 22, 0.7)',  // high - orange
          'rgba(234, 179, 8, 0.7)',   // medium - yellow
          'rgba(59, 130, 246, 0.7)',  // low - blue
          'rgba(156, 163, 175, 0.7)', // info - gray
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(249, 115, 22, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(156, 163, 175, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  // Prepare data for status chart
  const statusData = {
    labels: Object.keys(stats.byStatus),
    datasets: [
      {
        label: 'Alerts by Status',
        data: Object.values(stats.byStatus),
        backgroundColor: [
          'rgba(239, 68, 68, 0.7)',   // active - red
          'rgba(59, 130, 246, 0.7)',  // acknowledged - blue
          'rgba(34, 197, 94, 0.7)',   // resolved - green
          'rgba(156, 163, 175, 0.7)', // muted - gray
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(34, 197, 94, 1)',
          'rgba(156, 163, 175, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Prepare data for alert type chart
  const alertTypeData = {
    labels: Object.keys(stats.byAlertType),
    datasets: [
      {
        label: 'Alerts by Type',
        data: Object.values(stats.byAlertType),
        backgroundColor: [
          'rgba(239, 68, 68, 0.7)',
          'rgba(249, 115, 22, 0.7)',
          'rgba(234, 179, 8, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(156, 163, 175, 0.7)',
          'rgba(124, 58, 237, 0.7)',
          'rgba(236, 72, 153, 0.7)',
          'rgba(20, 184, 166, 0.7)',
          'rgba(109, 40, 217, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  };
  
  if (loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </div>
        <div className="mt-4 text-center text-gray-500">Loading statistics...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-5">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Statistics</h3>
        
        {/* Summary numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Total Alerts</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Active Alerts</p>
            <p className="text-2xl font-bold text-red-600">{stats.byStatus.active || 0}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Critical Alerts</p>
            <p className="text-2xl font-bold text-orange-600">{stats.bySeverity.critical || 0}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">Resolved Today</p>
            <p className="text-2xl font-bold text-green-600">
              {/* For demo, show last day's resolved count */}
              {stats.trend.length > 0 ? stats.trend[stats.trend.length - 1].count : 0}
            </p>
          </div>
        </div>
        
        {/* Trend chart */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Alert Trend (Last 7 Days)</h4>
          <div className="h-60">
            <Line 
              data={trendData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0
                    }
                  }
                }
              }}
            />
          </div>
        </div>
        
        {/* Charts section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Severity chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Alerts by Severity</h4>
            <div className="h-60">
              <Doughnut 
                data={severityData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                }}
              />
            </div>
          </div>
          
          {/* Status chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Alerts by Status</h4>
            <div className="h-60">
              <Doughnut 
                data={statusData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                }}
              />
            </div>
          </div>
        </div>
        
        {/* By Alert Type */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Alerts by Type</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(stats.byAlertType).map(([alertType, count]) => {
              if (typeof count === 'number' && count > 0) {
                return (
                  <div key={alertType} className="flex items-center">
                    <span className="w-24 text-xs text-gray-500 capitalize">{alertType}</span>
                    <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-xs font-medium text-gray-700">{count}</span>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}