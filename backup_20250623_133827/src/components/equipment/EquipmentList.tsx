'use client';

import React, { useState, useEffect } from 'react';
import { Equipment, EquipmentFilter } from '@/models/equipment';
import EquipmentCard from './EquipmentCard';
import EquipmentStatusBadge from './EquipmentStatusBadge';
import equipmentService from '@/services/equipmentService';

interface EquipmentListProps {
  initialEquipment?: Equipment[];
  showFilters?: boolean;
  showSearch?: boolean;
}

export default function EquipmentList({ 
  initialEquipment,
  showFilters = true,
  showSearch = true
}: EquipmentListProps) {
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment || []);
  const [loading, setLoading] = useState<boolean>(!initialEquipment);
  const [error, setError] = useState<string | null>(null);
  
  const [filter, setFilter] = useState<EquipmentFilter>({
    status: [],
    type: [],
    search: ''
  });
  
  const statusOptions = [
    { value: 'operational', label: 'Operational' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'offline', label: 'Offline' },
    { value: 'error', label: 'Error' }
  ];
  
  const typeOptions = Array.from(
    new Set((initialEquipment || []).map(e => e?.type))
  ).map(type => ({ value: type, label: type }));
  
  // Fetch equipment if not provided
  useEffect(() => {
    if (!initialEquipment) {
      fetchEquipment();
    }
  }, [initialEquipment]);
  
  // Fetch equipment with current filters
  useEffect(() => {
    if (initialEquipment) {
      applyFiltersLocally();
    } else {
      fetchEquipment();
    }
  }, [filter]);
  
  const fetchEquipment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await equipmentService?.filterEquipment(filter);
      setEquipment(data);
    } catch (err) {
      setError('Failed to load equipment. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const applyFiltersLocally = () => {
    if (!initialEquipment) return;
    
    let filtered = [...initialEquipment];
    
    // Apply status filter
    if (filter?.status && filter?.status.length > 0) {
      filtered = filtered?.filter(e => filter?.status?.includes(e?.status));
    }
    
    // Apply type filter
    if (filter?.type && filter?.type.length > 0) {
      filtered = filtered?.filter(e => filter?.type?.includes(e?.type));
    }
    
    // Apply search filter
    if (filter?.search) {
      const searchLower = filter?.search.toLowerCase();
      filtered = filtered?.filter(e => 
        e?.name.toLowerCase().includes(searchLower) ||
        e?.type.toLowerCase().includes(searchLower) ||
        e?.location?.toLowerCase().includes(searchLower)
      );
    }
    
    setEquipment(filtered);
  };
  
  const handleStatusChange = (status: string) => {
    setFilter(prev => {
      const newStatus = prev?.status?.includes(status as any)
        ? prev?.status.filter(s => s !== status)
        : [...(prev?.status || []), status as any];
      
      return { ...prev, status: newStatus };
    });
  };
  
  const handleTypeChange = (type: string) => {
    setFilter(prev => {
      const newType = prev?.type?.includes(type)
        ? prev?.type.filter(t => t !== type)
        : [...(prev?.type || []), type];
      
      return { ...prev, type: newType };
    });
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(prev => ({ ...prev, search: e.target.value }));
  };
  
  const clearFilters = () => {
    setFilter({ status: [], type: [], search: '' });
  };
  
  const hasActiveFilters = () => {
    return (
      (filter?.status && filter?.status.length > 0) ||
      (filter?.type && filter?.type.length > 0) ||
      (filter?.search && filter?.search.length > 0)
    );
  };
  
  return (
    <div data-testid="equipment-list">
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
                  value={filter?.search}
                  onChange={handleSearchChange}
                  placeholder="Search equipment..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  data-testid="equipment-search"
                />
              </div>
            )}
            
            {showFilters && (
              <>
                <div>
                  <h4 className="block text-sm font-medium text-gray-700 mb-1">Status</h4>
                  <div className="flex flex-wrap gap-2" data-testid="status-filter">
                    {statusOptions?.map(option => (
                      <button
                        key={option?.value}
                        onClick={() => handleStatusChange(option?.value)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition
                          ${filter?.status?.includes(option?.value as any)
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                          }`}
                      >
                        <EquipmentStatusBadge 
                          status={option?.value as any} 
                          showLabel={false} 
                          className="mr-1.5" 
                        />
                        {option?.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {typeOptions?.length > 0 && (
                  <div>
                    <h4 className="block text-sm font-medium text-gray-700 mb-1">Type</h4>
                    <div className="flex flex-wrap gap-2" data-testid="type-filter">
                      {typeOptions?.map(option => (
                        <button
                          key={option?.value}
                          onClick={() => handleTypeChange(option?.value)}
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition
                            ${filter?.type?.includes(option?.value)
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200'
                            }`}
                        >
                          {option?.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
          <p className="mt-2 text-gray-500">Loading equipment...</p>
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
      ) : equipment.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No equipment found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {hasActiveFilters()
              ? 'Try adjusting your filters to find what you\'re looking for.'
              : 'Get started by adding your first equipment.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipment?.map(item => (
            <EquipmentCard key={item?.id} equipment={item} />
          ))}
        </div>
      )}
    </div>
  );
}
