'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Dashboard } from '@/types/dashboard';
import { dashboardEngine } from '@/core/dashboard/DashboardEngine';
import DashboardViewer from '@/components/dashboard/DashboardViewer';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ArrowLeftIcon, PencilIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function ViewDashboardPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboard();
  }, [params?.id]);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const loadedDashboard = await dashboardEngine.loadDashboard(params?.id);
      setDashboard(loadedDashboard);
      setLastRefresh(new Date());
    } catch (err) {
      setError('Failed to load dashboard');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!dashboard) return;
    
    try {
      setIsRefreshing(true);
      await dashboardEngine.refreshDashboard(dashboard.uid);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to refresh dashboard:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <p className="text-red-600 mb-4">{error || 'Dashboard not found'}</p>
          <Link
            href="/dashboards"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Dashboards
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link
                href="/dashboards"
                className="text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {dashboard.title}
                </h1>
                {dashboard.description && (
                  <p className="text-sm text-gray-600">{dashboard.description}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Last refresh time */}
              <span className="text-sm text-gray-500">
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </span>
              
              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              {/* Edit button */}
              <Link
                href={`/dashboards/edit/${dashboard.uid}`}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        <DashboardViewer dashboard={dashboard} />
      </div>
    </div>
  );
}
