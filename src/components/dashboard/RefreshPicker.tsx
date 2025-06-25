/**
 * Refresh Picker Component
 * 
 * Provides refresh interval selection and manual refresh controls
 * for Grafana dashboards in manufacturing analytics.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  RefreshCw, 
  ChevronDown, 
  Play, 
  Pause, 
  Square,
  Timer,
  Zap
} from 'lucide-react';

interface RefreshPickerProps {
  value: string; // Refresh interval (e.g., '30s', '1m', '5m', etc.)
  onChange: (interval: string) => void;
  onRefresh?: () => void;
  autoRefresh?: boolean;
  onAutoRefreshChange?: (enabled: boolean) => void;
  lastRefresh?: Date;
  loading?: boolean;
  className?: string;
}

// Refresh interval options for manufacturing dashboards
const REFRESH_INTERVALS = [
  { value: '', label: 'Off', description: 'Manual refresh only', milliseconds: 0 },
  { value: '1s', label: '1s', description: 'Every second (high load)', milliseconds: 1000 },
  { value: '5s', label: '5s', description: 'Every 5 seconds', milliseconds: 5000 },
  { value: '10s', label: '10s', description: 'Every 10 seconds', milliseconds: 10000 },
  { value: '30s', label: '30s', description: 'Every 30 seconds (recommended)', milliseconds: 30000 },
  { value: '1m', label: '1m', description: 'Every minute', milliseconds: 60000 },
  { value: '5m', label: '5m', description: 'Every 5 minutes', milliseconds: 300000 },
  { value: '15m', label: '15m', description: 'Every 15 minutes', milliseconds: 900000 },
  { value: '30m', label: '30m', description: 'Every 30 minutes', milliseconds: 1800000 },
  { value: '1h', label: '1h', description: 'Every hour', milliseconds: 3600000 },
];

// Manufacturing-specific refresh presets
const MANUFACTURING_PRESETS = [
  { 
    name: 'Real-time Monitoring', 
    interval: '5s', 
    description: 'For critical equipment monitoring',
    icon: Zap,
    color: 'text-red-600'
  },
  { 
    name: 'Production Dashboard', 
    interval: '30s', 
    description: 'Standard production monitoring',
    icon: Timer,
    color: 'text-blue-600'
  },
  { 
    name: 'Quality Reports', 
    interval: '5m', 
    description: 'Quality metrics and trends',
    icon: RefreshCw,
    color: 'text-green-600'
  },
  { 
    name: 'Management Overview', 
    interval: '15m', 
    description: 'Executive dashboards',
    icon: Timer,
    color: 'text-purple-600'
  },
];

export default function RefreshPicker({
  value,
  onChange,
  onRefresh,
  autoRefresh = false,
  onAutoRefreshChange,
  lastRefresh,
  loading = false,
  className = ''
}: RefreshPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeUntilRefresh, setTimeUntilRefresh] = useState(0);

  const currentInterval = REFRESH_INTERVALS.find(interval => interval.value === value);
  const isAutoRefreshActive = autoRefresh && value && value !== '';

  // Calculate time until next refresh
  useEffect(() => {
    if (isAutoRefreshActive && lastRefresh && currentInterval?.milliseconds) {
      const interval = setInterval(() => {
        const now = Date.now();
        const lastRefreshTime = lastRefresh.getTime();
        const nextRefresh = lastRefreshTime + currentInterval.milliseconds;
        const remaining = Math.max(0, nextRefresh - now);
        setTimeUntilRefresh(remaining);

        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isAutoRefreshActive, lastRefresh, currentInterval]);

  const handleIntervalChange = (intervalValue: string) => {
    onChange(intervalValue);
    setIsOpen(false);
  };

  const handlePresetSelect = (preset: typeof MANUFACTURING_PRESETS[0]) => {
    onChange(preset.interval);
    if (onAutoRefreshChange) {
      onAutoRefreshChange(true);
    }
    setIsOpen(false);
  };

  const toggleAutoRefresh = () => {
    if (onAutoRefreshChange) {
      onAutoRefreshChange(!autoRefresh);
    }
  };

  const formatTimeRemaining = (ms: number): string => {
    if (ms === 0) return '0s';
    
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const getRefreshStatus = () => {
    if (loading) return { text: 'Refreshing...', color: 'text-blue-600' };
    if (!isAutoRefreshActive) return { text: 'Manual', color: 'text-gray-600' };
    if (timeUntilRefresh > 0) {
      return { 
        text: `Next: ${formatTimeRemaining(timeUntilRefresh)}`, 
        color: 'text-green-600' 
      };
    }
    return { text: 'Ready to refresh', color: 'text-orange-600' };
  };

  const status = getRefreshStatus();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Manual Refresh Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-1"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        Refresh
      </Button>

      {/* Auto Refresh Toggle */}
      <Button
        variant={autoRefresh ? "default" : "outline"}
        size="sm"
        onClick={toggleAutoRefresh}
        className="flex items-center gap-1"
      >
        {autoRefresh ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
        Auto
      </Button>

      {/* Refresh Interval Picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 min-w-[120px] justify-between"
          >
            <div className="flex items-center gap-1">
              <Timer className="w-4 h-4" />
              <span className="text-sm">
                {currentInterval?.label || 'Off'}
              </span>
            </div>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-0" align="end">
          <div className="border-b p-4">
            <h4 className="font-semibold text-sm mb-2">Refresh Settings</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Status:</span>
                <span className={status.color}>{status.text}</span>
              </div>
              {lastRefresh && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Last refresh:</span>
                  <span className="text-gray-900">
                    {lastRefresh.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Manufacturing Presets */}
          <div className="p-4 border-b">
            <h5 className="font-medium text-sm mb-3">Manufacturing Presets</h5>
            <div className="space-y-2">
              {MANUFACTURING_PRESETS.map((preset, index) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={index}
                    className={`w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors ${
                      value === preset.interval ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => handlePresetSelect(preset)}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-4 h-4 mt-0.5 ${preset.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{preset.name}</span>
                          <span className="text-xs text-gray-500">{preset.interval}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{preset.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* All Intervals */}
          <div className="p-4">
            <h5 className="font-medium text-sm mb-3">Refresh Intervals</h5>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {REFRESH_INTERVALS.map((interval, index) => (
                <button
                  key={index}
                  className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors ${
                    value === interval.value ? 'bg-blue-50 text-blue-600 font-medium' : ''
                  }`}
                  onClick={() => handleIntervalChange(interval.value)}
                >
                  <div className="flex items-center justify-between">
                    <span>{interval.label || 'Off'}</span>
                    {interval.value === '1s' && (
                      <span className="text-xs text-red-500">High Load</span>
                    )}
                    {interval.value === '30s' && (
                      <span className="text-xs text-green-500">Recommended</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {interval.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Status Indicator */}
      {isAutoRefreshActive && (
        <div className="flex items-center gap-2 text-xs">
          <div className={`w-2 h-2 rounded-full ${
            loading ? 'bg-blue-500 animate-pulse' : 
            timeUntilRefresh > 0 ? 'bg-green-500' : 'bg-orange-500'
          }`}></div>
          <span className={status.color}>{status.text}</span>
        </div>
      )}
    </div>
  );
}