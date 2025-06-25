'use client';

import React from 'react';
import { Variable } from '@/core/variables/VariableTypes';
import { VariableDropdown } from './VariableDropdown';
import { TimeRangePicker, TimeRange } from './TimeRangePicker';
import { RefreshPicker } from './RefreshPicker';
import { variableManager } from '@/core/variables/VariableManager';
import { Settings, Share2, Star, Save } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  variables: Variable[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  refreshInterval: string;
  onRefreshIntervalChange: (interval: string) => void;
  onRefresh?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onSettings?: () => void;
  isStarred?: boolean;
  onToggleStar?: () => void;
  isEditing?: boolean;
  className?: string;
}

export function DashboardHeader({
  title,
  variables,
  timeRange,
  onTimeRangeChange,
  refreshInterval,
  onRefreshIntervalChange,
  onRefresh,
  onSave,
  onShare,
  onSettings,
  isStarred,
  onToggleStar,
  isEditing,
  className = ''
}: DashboardHeaderProps) {
  const handleVariableChange = (variable: Variable, value: string | string[]) => {
    variableManager.updateVariable(variable.name, value);
  };
  
  return (
    <div className={`dashboard-header bg-white border-b border-gray-200 ${className}`}>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Title and actions */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            
            {/* Star button */}
            {onToggleStar && (
              <button
                onClick={onToggleStar}
                className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${
                  isStarred ? 'text-yellow-500' : 'text-gray-500 hover:text-gray-700'
                }`}
                title={isStarred ? 'Unstar dashboard' : 'Star dashboard'}
              >
                <Star className={`w-5 h-5 ${isStarred ? 'fill-current' : ''}`} />
              </button>
            )}
            
            {/* Action buttons */}
            <div className="flex items-center gap-1 ml-2">
              {onShare && (
                <button
                  onClick={onShare}
                  className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Share dashboard"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              )}
              
              {onSave && isEditing && (
                <button
                  onClick={onSave}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                  title="Save dashboard"
                >
                  <Save className="w-4 h-4 inline mr-1" />
                  Save
                </button>
              )}
              
              {onSettings && (
                <button
                  onClick={onSettings}
                  className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="Dashboard settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          
          {/* Right side - Variables and time controls */}
          <div className="flex items-center gap-4">
            {/* Variables */}
            {variables.length > 0 && (
              <div className="flex items-center gap-3">
                {variables
                  .filter(v => v.hide !== 'variable')
                  .map(variable => (
                    <VariableDropdown
                      key={variable.id}
                      variable={variable}
                      onChange={(value) => handleVariableChange(variable, value)}
                    />
                  ))}
              </div>
            )}
            
            {/* Separator */}
            {variables.length > 0 && (
              <div className="h-6 w-px bg-gray-300" />
            )}
            
            {/* Time Controls */}
            <div className="flex items-center gap-2">
              <TimeRangePicker
                value={timeRange}
                onChange={onTimeRangeChange}
              />
              <RefreshPicker
                value={refreshInterval}
                onChange={onRefreshIntervalChange}
                onRefresh={onRefresh}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Variable descriptions (if any) */}
      {variables.some(v => v.description) && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {variables
            .filter(v => v.description)
            .map(variable => (
              <div key={variable.id} className="text-xs text-gray-500">
                <span className="font-medium">{variable.label || variable.name}:</span> {variable.description}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}