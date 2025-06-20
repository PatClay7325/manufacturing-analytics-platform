/**
 * Adaptive Factory Manufacturing Intelligence Platform
 * Dashboard Card Component
 * 
 * Original implementation for dashboard display and management
 */

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Dashboard } from '@/types/dashboard';

interface DashboardCardProps {
  dashboard?: Dashboard;
  viewMode?: 'grid' | 'list';
  onDelete?: (uid?: string) => void;
  onDuplicate?: (uid?: string) => void;
}

export default function DashboardCard({ 
  dashboard, 
  viewMode, 
  onDelete, 
  onDuplicate 
}: DashboardCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (): string => {
    // Determine dashboard health/status based on last update
    const lastUpdate = new Date(dashboard?.meta.updated || 0);
    const now = new Date();
    const hoursSinceUpdate = (now?.getTime() - lastUpdate?.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceUpdate < 1) return '🟢'; // Active
    if (hoursSinceUpdate < 24) return '🟡'; // Recent
    return '🔴'; // Stale
  };

  const getManufacturingIcon = (): string => {
    // Determine icon based on dashboard tags or content
    if (dashboard?.tags.includes('oee')) return '📊';
    if (dashboard?.tags.includes('quality')) return '✅';
    if (dashboard?.tags.includes('maintenance')) return '🔧';
    if (dashboard?.tags.includes('energy')) return '⚡';
    if (dashboard?.tags.includes('production')) return '🏭';
    if (dashboard?.tags.includes('equipment')) return '⚙️';
    return '📈';
  };

  const getPanelCount = (): number => {
    return dashboard?.panels.length;
  };

  const getRefreshStatus = (): string => {
    if (dashboard?.refresh === false || !dashboard?.refresh) return 'Manual';
    return `Every ${dashboard?.refresh}`;
  };

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              {/* Dashboard Icon */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">{getManufacturingIcon()}</span>
                </div>
              </div>
              
              {/* Dashboard Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    <Link 
                      href={`/dashboard/${dashboard?.uid}`}
                      className="hover:text-blue-600"
                    >
                      {dashboard?.title}
                    </Link>
                  </h3>
                  <span className="text-sm">{getStatusIcon()}</span>
                </div>
                
                {dashboard?.description && (
                  <p className="text-sm text-gray-600 truncate mt-1">
                    {dashboard?.description}
                  </p>
                )}
                
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>{getPanelCount()} panels</span>
                  <span>•</span>
                  <span>Refresh: {getRefreshStatus()}</span>
                  <span>•</span>
                  <span>Updated: {formatDate(dashboard?.meta.updated)}</span>
                </div>
              </div>
              
              {/* Tags */}
              <div className="flex flex-wrap gap-1 max-w-xs">
                {dashboard?.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
                {dashboard?.tags.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{dashboard?.tags.length - 3} more
                  </span>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center space-x-2 ml-4">
              <Link
                href={`/dashboard/${dashboard?.uid}`}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                View
              </Link>
              
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  ⋮
                </button>
                
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                    <div className="py-1">
                      <Link
                        href={`/dashboard/${dashboard?.uid}/edit`}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setShowMenu(false)}
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => {
                          onDuplicate(dashboard?.uid);
                          setShowMenu(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => {
                          navigator?.clipboard.writeText(JSON.stringify(dashboard, null, 2));
                          setShowMenu(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Export JSON
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={() => {
                          onDelete(dashboard?.uid);
                          setShowMenu(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow group">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">{getManufacturingIcon()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                <Link 
                  href={`/dashboard/${dashboard?.uid}`}
                  className="hover:text-blue-600"
                >
                  {dashboard?.title}
                </Link>
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs">{getStatusIcon()}</span>
                <span className="text-xs text-gray-500">
                  {getPanelCount()} panels
                </span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 p-1 transition-opacity"
            >
              ⋮
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="py-1">
                  <Link
                    href={`/dashboard/${dashboard?.uid}/edit`}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowMenu(false)}
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => {
                      onDuplicate(dashboard?.uid);
                      setShowMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      navigator?.clipboard.writeText(JSON.stringify(dashboard, null, 2));
                      setShowMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Export JSON
                  </button>
                  <hr className="my-1" />
                  <button
                    onClick={() => {
                      onDelete(dashboard?.uid);
                      setShowMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Description */}
        {dashboard?.description && (
          <p className="text-sm text-gray-600 mt-3 line-clamp-2">
            {dashboard?.description}
          </p>
        )}
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-4">
          {dashboard?.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {tag}
            </span>
          ))}
          {dashboard?.tags.length > 4 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              +{dashboard?.tags.length - 4}
            </span>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            <div>Updated: {formatDate(dashboard?.meta.updated)}</div>
            <div className="mt-1">Refresh: {getRefreshStatus()}</div>
          </div>
          
          <Link
            href={`/dashboard/${dashboard?.uid}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            Open
          </Link>
        </div>
      </div>
    </div>
  );
}