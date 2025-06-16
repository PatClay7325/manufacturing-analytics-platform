'use client';

import React, { useState, useEffect } from 'react';
import { AlertStatistics as AlertStatsType } from '@/models/alert';
import alertService from '@/services/alertService';

interface AlertStatisticsProps {
  className?: string;
}

export default function AlertStatistics({ className = '' }: AlertStatisticsProps) {
  const [stats, setStats] = useState<AlertStatsType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await alertService.getAlertStatistics();
        setStats(data);
      } catch (err) {
        setError('Failed to load alert statistics.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse flex flex-col space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Unable to load statistics</h3>
          <p className="mt-1 text-sm text-gray-500">{error || 'An error occurred while loading alert statistics.'}</p>
        </div>
      </div>
    );
  }

  // Calculate the highest count in trend data for scaling
  const maxTrendCount = Math.max(...stats.trend.map(t => t.count));

  return (
    <div className={`bg-white rounded-lg shadow ${className}`} data-testid="alert-statistics">
      <div className="border-b border-gray-200 px-6 py-5">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Alert Statistics</h3>
      </div>
      
      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-blue-800 text-sm font-medium mb-1">Total Alerts</div>
            <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-red-800 text-sm font-medium mb-1">Active</div>
            <div className="text-2xl font-bold text-red-900">{stats.byStatus.active}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-yellow-800 text-sm font-medium mb-1">Acknowledged</div>
            <div className="text-2xl font-bold text-yellow-900">{stats.byStatus.acknowledged}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-green-800 text-sm font-medium mb-1">Resolved</div>
            <div className="text-2xl font-bold text-green-900">{stats.byStatus.resolved}</div>
          </div>
        </div>
        
        {/* By Severity */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Alerts by Severity</h4>
          <div className="space-y-3">
            <div className="flex items-center">
              <span className="w-24 text-xs text-gray-500">Critical</span>
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500"
                  style={{ width: `${(stats.bySeverity.critical / stats.total) * 100}%` }}
                ></div>
              </div>
              <span className="ml-2 text-xs font-medium text-gray-700">{stats.bySeverity.critical}</span>
            </div>
            <div className="flex items-center">
              <span className="w-24 text-xs text-gray-500">High</span>
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-orange-500"
                  style={{ width: `${(stats.bySeverity.high / stats.total) * 100}%` }}
                ></div>
              </div>
              <span className="ml-2 text-xs font-medium text-gray-700">{stats.bySeverity.high}</span>
            </div>
            <div className="flex items-center">
              <span className="w-24 text-xs text-gray-500">Medium</span>
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500"
                  style={{ width: `${(stats.bySeverity.medium / stats.total) * 100}%` }}
                ></div>
              </div>
              <span className="ml-2 text-xs font-medium text-gray-700">{stats.bySeverity.medium}</span>
            </div>
            <div className="flex items-center">
              <span className="w-24 text-xs text-gray-500">Low</span>
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500"
                  style={{ width: `${(stats.bySeverity.low / stats.total) * 100}%` }}
                ></div>
              </div>
              <span className="ml-2 text-xs font-medium text-gray-700">{stats.bySeverity.low}</span>
            </div>
            <div className="flex items-center">
              <span className="w-24 text-xs text-gray-500">Info</span>
              <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gray-500"
                  style={{ width: `${(stats.bySeverity.info / stats.total) * 100}%` }}
                ></div>
              </div>
              <span className="ml-2 text-xs font-medium text-gray-700">{stats.bySeverity.info}</span>
            </div>
          </div>
        </div>
        
        {/* By Source */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Alerts by Source</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(stats.bySource).map(([source, count]) => (
              count > 0 && (
                <div key={source} className="flex items-center">
                  <span className="w-24 text-xs text-gray-500 capitalize">{source}</span>
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500"
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-xs font-medium text-gray-700">{count}</span>
                </div>
              )
            ))}
          </div>
        </div>
        
        {/* Trend Chart */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Alerts Trend (Last 7 Days)</h4>
          <div className="relative h-40">
            <div className="absolute inset-0 flex items-end">
              {stats.trend.map((day, index) => (
                <div 
                  key={day.date} 
                  className="flex-1 flex flex-col items-center"
                >
                  <div 
                    className="w-full max-w-[30px] bg-blue-500 rounded-t-sm mx-auto"
                    style={{ 
                      height: maxTrendCount ? `${(day.count / maxTrendCount) * 100}%` : '0',
                      opacity: 0.2 + (0.8 * index / (stats.trend.length - 1))
                    }}
                  ></div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(day.date).toLocaleDateString(undefined, { weekday: 'short' })}
                  </div>
                  <div className="text-xs font-medium text-gray-700">
                    {day.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}