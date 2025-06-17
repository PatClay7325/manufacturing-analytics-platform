'use client';

import React, { useState, useEffect } from 'react';
import { Alert, AlertFilter, AlertSeverity, AlertStatus, AlertType } from '@/models/alert';
import AlertCard from './AlertCard';
import AlertBadge from './AlertBadge';
import alertService from '@/services/alertService';

interface AlertListProps {
  initialAlerts?: Alert[];
  showFilters?: boolean;
  showSearch?: boolean;
  compact?: boolean;
}

export default function AlertList({ 
  initialAlerts,
  showFilters = true,
  showSearch = true,
  compact = false
}: AlertListProps) {
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts || []);
  const [loading, setLoading] = useState<boolean>(!initialAlerts);
  const [error, setError] = useState<string | null>(null);
  
  const [filter, setFilter] = useState<AlertFilter>({
    severity: [],
    status: [],
    alertType: []
  });
  
  // Define filter options
  const severityOptions: { value: AlertSeverity; label: string }[] = [
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
    { value: 'info', label: 'Info' }
  ];
  
  const statusOptions: { value: AlertStatus; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'acknowledged', label: 'Acknowledged' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'muted', label: 'Muted' }
  ];
  
  const alertTypeOptions: { value: string; label: string }[] = [
    { value: 'equipment', label: 'Equipment' },
    { value: 'process', label: 'Process' },
    { value: 'quality', label: 'Quality' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'safety', label: 'Safety' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'production', label: 'Production' },
    { value: 'system', label: 'System' },
    { value: 'network', label: 'Network' }
  ];
  
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Fetch alerts from API
  useEffect(() => {
    if (initialAlerts) return;
    
    const fetchAlerts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await alertService.getAllAlerts();
        setAlerts(data);
      } catch (err) {
        setError('Failed to load alerts. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAlerts();
  }, [initialAlerts]);
  
  // Filter alerts based on filter state
  const filteredAlerts = alerts.filter(alert => {
    // Apply severity filter
    if (filter.severity && filter.severity.length > 0 && !filter.severity.includes(alert.severity as AlertSeverity)) {
      return false;
    }
    
    // Apply status filter
    if (filter.status && filter.status.length > 0 && !filter.status.includes(alert.status as AlertStatus)) {
      return false;
    }
    
    // Apply alertType filter
    if (filter.alertType && filter.alertType.length > 0 && !filter.alertType.includes(alert.alertType)) {
      return false;
    }
    
    // Apply search filter
    if (searchTerm && !alert.message.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });
  
  // Toggle filter selection
  const toggleFilter = (type: 'severity' | 'status' | 'alertType', value: string) => {
    setFilter(prev => {
      const currentFilter = prev[type] || [];
      
      if (currentFilter.includes(value)) {
        return {
          ...prev,
          [type]: currentFilter.filter(item => item !== value)
        };
      } else {
        return {
          ...prev,
          [type]: [...currentFilter, value]
        };
      }
    });
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilter({
      severity: [],
      status: [],
      alertType: []
    });
    setSearchTerm('');
  };
  
  // Render loading state
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
        <div className="mt-4 text-center text-gray-500">Loading alerts...</div>
      </div>
    );
  }
  
  // Render error state
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
  
  // No alerts found
  if (filteredAlerts.length === 0) {
    return (
      <div>
        {showFilters && (
          <div className="mb-4 flex flex-wrap gap-2">
            {/* Severity filters */}
            <div className="mr-4">
              <span className="block text-sm font-medium text-gray-700 mb-1">Severity</span>
              <div className="flex flex-wrap gap-1">
                {severityOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => toggleFilter('severity', option.value)}
                    className={`px-2 py-1 rounded-md text-xs font-medium ${
                      filter.severity?.includes(option.value)
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Status filters */}
            <div className="mr-4">
              <span className="block text-sm font-medium text-gray-700 mb-1">Status</span>
              <div className="flex flex-wrap gap-1">
                {statusOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => toggleFilter('status', option.value)}
                    className={`px-2 py-1 rounded-md text-xs font-medium ${
                      filter.status?.includes(option.value)
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Alert Type filters */}
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">Alert Type</span>
              <div className="flex flex-wrap gap-1">
                {alertTypeOptions.map(option => (
                  <button
                    key={option.value}
                    onClick={() => toggleFilter('alertType', option.value)}
                    className={`px-2 py-1 rounded-md text-xs font-medium ${
                      filter.alertType?.includes(option.value)
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Clear filters button */}
            {(filter.severity?.length || filter.status?.length || filter.alertType?.length) && (
              <button
                onClick={clearFilters}
                className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md text-sm hover:bg-gray-300 transition-colors mt-4"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
        
        {/* Search input */}
        {showSearch && (
          <div className="mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
        
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No alerts found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {(filter.severity?.length || filter.status?.length || filter.alertType?.length || searchTerm)
              ? 'Try adjusting your filters or search criteria.'
              : 'There are no alerts to display at this time.'}
          </p>
          {(filter.severity?.length || filter.status?.length || filter.alertType?.length || searchTerm) && (
            <div className="mt-3">
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Render alert list
  return (
    <div>
      {showFilters && (
        <div className="mb-4 flex flex-wrap gap-2">
          {/* Severity filters */}
          <div className="mr-4">
            <span className="block text-sm font-medium text-gray-700 mb-1">Severity</span>
            <div className="flex flex-wrap gap-1">
              {severityOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => toggleFilter('severity', option.value)}
                  className={`px-2 py-1 rounded-md text-xs font-medium ${
                    filter.severity?.includes(option.value)
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Status filters */}
          <div className="mr-4">
            <span className="block text-sm font-medium text-gray-700 mb-1">Status</span>
            <div className="flex flex-wrap gap-1">
              {statusOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => toggleFilter('status', option.value)}
                  className={`px-2 py-1 rounded-md text-xs font-medium ${
                    filter.status?.includes(option.value)
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Alert Type filters */}
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">Alert Type</span>
            <div className="flex flex-wrap gap-1">
              {alertTypeOptions.map(option => (
                <button
                  key={option.value}
                  onClick={() => toggleFilter('alertType', option.value)}
                  className={`px-2 py-1 rounded-md text-xs font-medium ${
                    filter.alertType?.includes(option.value)
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Clear filters button */}
          {(filter.severity?.length || filter.status?.length || filter.alertType?.length) && (
            <button
              onClick={clearFilters}
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md text-sm hover:bg-gray-300 transition-colors mt-4"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
      
      {/* Search input */}
      {showSearch && (
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}
      
      {/* Results summary */}
      <div className="mb-4">
        <p className="text-sm text-gray-500">
          Showing {filteredAlerts.length} of {alerts.length} alerts
          {(filter.severity?.length || filter.status?.length || filter.alertType?.length || searchTerm) && ' (filtered)'}
        </p>
      </div>
      
      {/* Alert grid */}
      <div className={`grid gap-4 ${compact ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
        {filteredAlerts.map(alert => (
          <AlertCard 
            key={alert.id} 
            alert={alert} 
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}