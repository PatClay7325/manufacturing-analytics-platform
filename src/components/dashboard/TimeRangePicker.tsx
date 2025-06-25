/**
 * Time Range Picker Component
 * 
 * Provides time range selection for Grafana dashboards
 * with common manufacturing analytics time ranges.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { 
  Clock, 
  Calendar as CalendarIcon, 
  ChevronDown,
  RotateCcw,
  Play,
  Pause
} from 'lucide-react';
import { format } from 'date-fns';

export interface TimeRange {
  from: string;
  to: string;
  display: string;
}

interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (timeRange: TimeRange) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
  onAutoRefreshChange?: (enabled: boolean) => void;
  onRefreshIntervalChange?: (interval: number) => void;
  className?: string;
}

// Predefined time ranges common in manufacturing
const QUICK_RANGES: TimeRange[] = [
  { from: 'now-5m', to: 'now', display: 'Last 5 minutes' },
  { from: 'now-15m', to: 'now', display: 'Last 15 minutes' },
  { from: 'now-30m', to: 'now', display: 'Last 30 minutes' },
  { from: 'now-1h', to: 'now', display: 'Last 1 hour' },
  { from: 'now-3h', to: 'now', display: 'Last 3 hours' },
  { from: 'now-6h', to: 'now', display: 'Last 6 hours' },
  { from: 'now-12h', to: 'now', display: 'Last 12 hours' },
  { from: 'now-24h', to: 'now', display: 'Last 24 hours' },
  { from: 'now-2d', to: 'now', display: 'Last 2 days' },
  { from: 'now-7d', to: 'now', display: 'Last 7 days' },
  { from: 'now-30d', to: 'now', display: 'Last 30 days' },
  { from: 'now/d', to: 'now/d', display: 'Today' },
  { from: 'now-1d/d', to: 'now-1d/d', display: 'Yesterday' },
  { from: 'now/w', to: 'now/w', display: 'This week' },
  { from: 'now-1w/w', to: 'now-1w/w', display: 'Previous week' },
  { from: 'now/M', to: 'now/M', display: 'This month' },
  { from: 'now-1M/M', to: 'now-1M/M', display: 'Previous month' },
];

// Manufacturing shift-specific ranges
const SHIFT_RANGES: TimeRange[] = [
  { from: 'now/d+6h', to: 'now/d+14h', display: 'Day Shift (6AM-2PM)' },
  { from: 'now/d+14h', to: 'now/d+22h', display: 'Evening Shift (2PM-10PM)' },
  { from: 'now/d+22h', to: 'now/d+30h', display: 'Night Shift (10PM-6AM)' },
  { from: 'now-1d/d+6h', to: 'now-1d/d+14h', display: 'Previous Day Shift' },
  { from: 'now-1d/d+14h', to: 'now-1d/d+22h', display: 'Previous Evening Shift' },
  { from: 'now-1d/d+22h', to: 'now-1d/d+30h', display: 'Previous Night Shift' },
];

// Refresh interval options (in milliseconds)
const REFRESH_INTERVALS = [
  { value: 0, label: 'Off' },
  { value: 5000, label: '5s' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '1m' },
  { value: 300000, label: '5m' },
  { value: 900000, label: '15m' },
  { value: 1800000, label: '30m' },
  { value: 3600000, label: '1h' },
];

export default function TimeRangePicker({
  value,
  onChange,
  autoRefresh = false,
  refreshInterval = 30000,
  onAutoRefreshChange,
  onRefreshIntervalChange,
  className = ''
}: TimeRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [activeTab, setActiveTab] = useState<'quick' | 'shifts' | 'custom'>('quick');

  // Parse relative time strings to display format
  const getDisplayTime = (timeStr: string): string => {
    if (timeStr === 'now') return 'now';
    
    // Handle relative times like 'now-1h', 'now-30m', etc.
    const relativeMatch = timeStr.match(/^now(-(\d+)([mhd]))?$/);
    if (relativeMatch) {
      if (!relativeMatch[1]) return 'now';
      const amount = relativeMatch[2];
      const unit = relativeMatch[3];
      const unitMap = { m: 'min', h: 'hour', d: 'day' };
      return `${amount} ${unitMap[unit as keyof typeof unitMap]}${parseInt(amount) > 1 ? 's' : ''} ago`;
    }

    // Handle business time like 'now/d', 'now-1d/d', etc.
    if (timeStr.includes('/')) {
      return timeStr; // Return as-is for business times
    }

    return timeStr;
  };

  const handleQuickRangeSelect = (range: TimeRange) => {
    onChange(range);
    setIsOpen(false);
  };

  const handleCustomTimeApply = () => {
    if (fromDate && toDate) {
      const customRange: TimeRange = {
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        display: `${format(fromDate, 'MMM dd, HH:mm')} - ${format(toDate, 'MMM dd, HH:mm')}`
      };
      onChange(customRange);
      setIsOpen(false);
    }
  };

  const toggleAutoRefresh = () => {
    onAutoRefreshChange?.(!autoRefresh);
  };

  const handleRefreshIntervalChange = (interval: number) => {
    onRefreshIntervalChange?.(interval);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-2 min-w-[200px] justify-between"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{value.display}</span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-96 p-0" align="end">
          <div className="border-b">
            <div className="flex">
              <button
                className={`px-4 py-2 text-sm ${activeTab === 'quick' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setActiveTab('quick')}
              >
                Quick Ranges
              </button>
              <button
                className={`px-4 py-2 text-sm ${activeTab === 'shifts' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setActiveTab('shifts')}
              >
                Shifts
              </button>
              <button
                className={`px-4 py-2 text-sm ${activeTab === 'custom' ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                onClick={() => setActiveTab('custom')}
              >
                Custom
              </button>
            </div>
          </div>

          <div className="p-4">
            {activeTab === 'quick' && (
              <div className="space-y-1">
                {QUICK_RANGES.map((range, index) => (
                  <button
                    key={index}
                    className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                      value.from === range.from && value.to === range.to ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                    onClick={() => handleQuickRangeSelect(range)}
                  >
                    {range.display}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'shifts' && (
              <div className="space-y-1">
                {SHIFT_RANGES.map((range, index) => (
                  <button
                    key={index}
                    className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                      value.from === range.from && value.to === range.to ? 'bg-blue-50 text-blue-600' : ''
                    }`}
                    onClick={() => handleQuickRangeSelect(range)}
                  >
                    {range.display}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'custom' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">From</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {fromDate ? format(fromDate, 'PPP HH:mm') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={setFromDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">To</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {toDate ? format(toDate, 'PPP HH:mm') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={setToDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <Button
                  onClick={handleCustomTimeApply}
                  disabled={!fromDate || !toDate}
                  className="w-full"
                >
                  Apply Custom Range
                </Button>
              </div>
            )}
          </div>

          <div className="border-t p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Auto Refresh</span>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAutoRefresh}
                className="flex items-center gap-1"
              >
                {autoRefresh ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                {autoRefresh ? 'Pause' : 'Start'}
              </Button>
            </div>

            {autoRefresh && (
              <div>
                <label className="block text-sm font-medium mb-2">Refresh Interval</label>
                <select
                  value={refreshInterval}
                  onChange={(e) => handleRefreshIntervalChange(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {REFRESH_INTERVALS.map((interval) => (
                    <option key={interval.value} value={interval.value}>
                      {interval.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {autoRefresh && (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Auto-refresh: {REFRESH_INTERVALS.find(r => r.value === refreshInterval)?.label}
        </div>
      )}
    </div>
  );
}