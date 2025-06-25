'use client';

import React from 'react';
import { FunnelIcon, Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';

interface DashboardFiltersProps {
  availableTags?: string[];
  selectedTags?: string[];
  sortBy?: 'name' | 'updated' | 'created';
  sortDirection?: 'asc' | 'desc';
  viewMode?: 'grid' | 'list';
  onTagFilter?: (tags?: string[]) => void;
  onSort?: (sortBy?: 'name' | 'updated' | 'created', direction?: 'asc' | 'desc') => void;
  onViewModeChange?: (viewMode?: 'grid' | 'list') => void;
}

export default function DashboardFilters({
  availableTags,
  selectedTags,
  sortBy,
  sortDirection,
  viewMode,
  onTagFilter,
  onSort,
  onViewModeChange
}: DashboardFiltersProps) {
  const handleTagToggle = (tag: string) => {
    if (selectedTags?.includes(tag)) {
      onTagFilter(selectedTags?.filter(t => t !== tag));
    } else {
      onTagFilter([...selectedTags, tag]);
    }
  };

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      // Toggle direction if same field
      onSort(sortBy, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Default to desc for new field
      onSort(newSortBy, 'desc');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      {/* Tags Filter */}
      <div className="flex items-center gap-2">
        <FunnelIcon className="h-5 w-5 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">Tags:</span>
        <div className="flex flex-wrap gap-2">
          {availableTags.length === 0 ? (
            <span className="text-sm text-gray-500">No tags available</span>
          ) : (
            availableTags?.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedTags?.includes(tag)
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))
          )}
        </div>
        {selectedTags?.length > 0 && (
          <button
            onClick={() => onTagFilter([])}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Sort and View Controls */}
      <div className="flex items-center gap-4">
        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Sort by:</span>
          <select
            value={`${sortBy}-${sortDirection}`}
            onChange={(e) => {
              const [field, direction] = e?.target.value?.split('-') as [typeof sortBy, typeof sortDirection];
              onSort(field, direction);
            }}
            className="text-sm border-gray-300 rounded focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="updated-desc">Last Updated</option>
            <option value="updated-asc">Oldest Updated</option>
            <option value="created-desc">Newest Created</option>
            <option value="created-asc">Oldest Created</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center border border-gray-300 rounded-lg">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-l-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Grid view"
          >
            <Squares2X2Icon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded-r-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            title="List view"
          >
            <ListBulletIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}