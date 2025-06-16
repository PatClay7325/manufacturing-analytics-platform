'use client';

import React, { useState, useEffect } from 'react';
import { Alert, AlertFilter, AlertSeverity, AlertStatus, AlertSource } from '@/models/alert';
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
    source: []
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
  
  const sourceOptions: { value: AlertSource; label: string }[] = [
    { value: 'equipment', label: 'Equipment' },
    { value: 'process', label: 'Process' },
    { value: 'quality', label: 'Quality' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'safety', label: 'Safety' },
    { value: 'system', label: 'System' }
  ];
  
  // Fetch alerts if not provided
  useEffect(() => {
    if (!initialAlerts) {
      fetchAlerts();
    }
  }, [initialAlerts]);
  
  // Fetch alerts with current filters
  useEffect(() => {
    if (initialAlerts) {
      applyFiltersLocally();
    } else {
      fetchAlerts();
    }
  }, [filter]);
  
  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await alertService.filterAlerts(filter);
      setAlerts(data);
    } catch (err) {
      setError('Failed to load alerts. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const applyFiltersLocally = () => {
    if (!initialAlerts) return;
    
    let filtered = [...initialAlerts];
    
    // Apply severity filter
    if (filter.severity && filter.severity.length > 0) {
      filtered = filtered.filter(a => filter.severity?.includes(a.severity));
    }
    
    // Apply status filter
    if (filter.status && filter.status.length > 0) {
      filtered = filtered.filter(a => filter.status?.includes(a.status));
    }
    
    // Apply source filter
    if (filter.source && filter.source.length > 0) {
      filtered = filtered.filter(a => filter.source?.includes(a.source));
    }
    
    // Apply search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(searchLower) ||
        ('description' in a && a.description.toLowerCase().includes(searchLower)) ||
        a.sourceName?.toLowerCase().includes(searchLower)
      );
    }
    
    setAlerts(filtered);
  };
  
  const handleSeverityChange = (severity: AlertSeverity) => {
    setFilter(prev => {
      const newSeverity = prev.severity?.includes(severity)
        ? prev.severity.filter(s => s !== severity)
        : [...(prev.severity || []), severity];
      
      return { ...prev, severity: newSeverity };
    });
  };
  
  const handleStatusChange = (status: AlertStatus) => {
    setFilter(prev => {
      const newStatus = prev.status?.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...(prev.status || []), status];
      
      return { ...prev, status: newStatus };
    });
  };
  
  const handleSourceChange = (source: AlertSource) => {
    setFilter(prev => {
      const newSource = prev.source?.includes(source)
        ? prev.source.filter(s => s !== source)
        : [...(prev.source || []), source];
      
      return { ...prev, source: newSource };
    });
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(prev => ({ ...prev, search: e.target.value }));
  };
  
  const clearFilters = () => {
    setFilter({ severity: [], status: [], source: [], search: '' });
  };
  
  const hasActiveFilters = () => {
    return (
      (filter.severity && filter.severity.length > 0) ||
      (filter.status && filter.status.length > 0) ||
      (filter.source && filter.source.length > 0) ||
      (filter.search && filter.search.length > 0)
    );
  };
  
  return (
    <div data-testid="alert-list">
      {(showFilters || showSearch) && (
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            {hasActiveFilters() && (
              <button 
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all filters
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            {showSearch && (
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  id="search"
                  value={filter.search || ''}
                  onChange={handleSearchChange}
                  placeholder="Search alerts..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  data-testid="alert-search"
                />
              </div>
            )}
            
            {showFilters && (
              <>
                <div>
                  <h4 className="block text-sm font-medium text-gray-700 mb-1">Severity</h4>
                  <div className="flex flex-wrap gap-2" data-testid="severity-filter">
                    {severityOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleSeverityChange(option.value)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition
                          ${filter.severity?.includes(option.value)
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                          }`}
                      >
                        <AlertBadge 
                          type="severity" 
                          value={option.value} 
                          showLabel={false} 
                          className="mr-1.5" 
                        />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="block text-sm font-medium text-gray-700 mb-1">Status</h4>
                  <div className="flex flex-wrap gap-2" data-testid="status-filter">
                    {statusOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleStatusChange(option.value)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition
                          ${filter.status?.includes(option.value)
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                          }`}
                      >
                        <AlertBadge 
                          type="status" 
                          value={option.value} 
                          showLabel={false} 
                          className="mr-1.5" 
                        />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="block text-sm font-medium text-gray-700 mb-1">Source</h4>
                  <div className="flex flex-wrap gap-2" data-testid="source-filter">
                    {sourceOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleSourceChange(option.value)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition
                          ${filter.source?.includes(option.value)
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                          }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {loading ? (
        <div className="text-center p-8">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-200 rounded-full border-t-blue-600" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-2 text-gray-500">Loading alerts...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No alerts found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {hasActiveFilters()
              ? 'Try adjusting your filters to find what you\'re looking for.'
              : 'There are currently no alerts that require attention.'}
          </p>
        </div>
      ) : (
        <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'} gap-6`}>
          {alerts.map(alert => (
            <AlertCard 
              key={alert.id} 
              alert={alert} 
              compact={compact} 
            />
          ))}
        </div>
      )}
    </div>
  );
}