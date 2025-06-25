/**
 * Time Range Selector Component
 * Implements Phase 2.1: Time-range presets and custom selection
 */

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ChevronDown } from 'lucide-react';

export interface TimeRange {
  label: string;
  start: Date;
  end: Date;
  preset?: string;
}

export interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (timeRange: TimeRange) => void;
  className?: string;
  showCustom?: boolean;
  manufacturingContext?: boolean;
}

// Predefined time range presets
const TIME_PRESETS = [
  {
    id: 'last_hour',
    label: 'Last Hour',
    getValue: () => ({
      start: new Date(Date.now() - 60 * 60 * 1000),
      end: new Date()
    })
  },
  {
    id: 'last_4_hours',
    label: 'Last 4 Hours',
    getValue: () => ({
      start: new Date(Date.now() - 4 * 60 * 60 * 1000),
      end: new Date()
    })
  },
  {
    id: 'last_12_hours',
    label: 'Last 12 Hours',
    getValue: () => ({
      start: new Date(Date.now() - 12 * 60 * 60 * 1000),
      end: new Date()
    })
  },
  {
    id: 'today',
    label: 'Today',
    getValue: () => {
      const now = new Date();
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
  },
  {
    id: 'yesterday',
    label: 'Yesterday',
    getValue: () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  },
  {
    id: 'last_7_days',
    label: 'Last 7 Days',
    getValue: () => ({
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    })
  },
  {
    id: 'last_30_days',
    label: 'Last 30 Days',
    getValue: () => ({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date()
    })
  }
];

// Manufacturing-specific presets
const MANUFACTURING_PRESETS = [
  {
    id: 'current_shift',
    label: 'Current Shift',
    getValue: () => {
      const now = new Date();
      const hour = now.getHours();
      let shiftStart: Date;
      
      // Determine shift based on time (8-hour shifts)
      if (hour >= 6 && hour < 14) {
        // Day shift: 6 AM - 2 PM
        shiftStart = new Date(now);
        shiftStart.setHours(6, 0, 0, 0);
      } else if (hour >= 14 && hour < 22) {
        // Evening shift: 2 PM - 10 PM
        shiftStart = new Date(now);
        shiftStart.setHours(14, 0, 0, 0);
      } else {
        // Night shift: 10 PM - 6 AM
        shiftStart = new Date(now);
        if (hour >= 22) {
          shiftStart.setHours(22, 0, 0, 0);
        } else {
          shiftStart.setDate(shiftStart.getDate() - 1);
          shiftStart.setHours(22, 0, 0, 0);
        }
      }
      
      return { start: shiftStart, end: now };
    }
  },
  {
    id: 'previous_shift',
    label: 'Previous Shift',
    getValue: () => {
      const now = new Date();
      const hour = now.getHours();
      let shiftStart: Date;
      let shiftEnd: Date;
      
      if (hour >= 6 && hour < 14) {
        // Current: Day, Previous: Night
        shiftStart = new Date(now);
        shiftStart.setDate(shiftStart.getDate() - 1);
        shiftStart.setHours(22, 0, 0, 0);
        shiftEnd = new Date(now);
        shiftEnd.setHours(6, 0, 0, 0);
      } else if (hour >= 14 && hour < 22) {
        // Current: Evening, Previous: Day
        shiftStart = new Date(now);
        shiftStart.setHours(6, 0, 0, 0);
        shiftEnd = new Date(now);
        shiftEnd.setHours(14, 0, 0, 0);
      } else {
        // Current: Night, Previous: Evening
        shiftStart = new Date(now);
        if (hour >= 22) {
          shiftStart.setHours(14, 0, 0, 0);
          shiftEnd = new Date(now);
          shiftEnd.setHours(22, 0, 0, 0);
        } else {
          shiftStart.setDate(shiftStart.getDate() - 1);
          shiftStart.setHours(14, 0, 0, 0);
          shiftEnd = new Date(now);
          shiftEnd.setDate(shiftEnd.getDate() - 1);
          shiftEnd.setHours(22, 0, 0, 0);
        }
      }
      
      return { start: shiftStart, end: shiftEnd };
    }
  },
  {
    id: 'this_week',
    label: 'This Week',
    getValue: () => {
      const now = new Date();
      const start = new Date(now);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    }
  },
  {
    id: 'last_week',
    label: 'Last Week',
    getValue: () => {
      const now = new Date();
      const start = new Date(now);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
      start.setDate(diff - 7); // Previous week
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  }
];

export function TimeRangeSelector({
  value,
  onChange,
  className = '',
  showCustom = true,
  manufacturingContext = false
}: TimeRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const presets = manufacturingContext 
    ? [...MANUFACTURING_PRESETS, ...TIME_PRESETS]
    : TIME_PRESETS;

  // Update custom inputs when value changes
  useEffect(() => {
    setCustomStart(formatDateTimeLocal(value.start));
    setCustomEnd(formatDateTimeLocal(value.end));
    setSelectedPreset(value.preset || '');
  }, [value]);

  const formatDateTimeLocal = (date: Date): string => {
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  const handlePresetClick = (preset: typeof presets[0]) => {
    const { start, end } = preset.getValue();
    onChange({
      label: preset.label,
      start,
      end,
      preset: preset.id
    });
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      const start = new Date(customStart);
      const end = new Date(customEnd);
      
      if (start < end) {
        onChange({
          label: 'Custom Range',
          start,
          end,
          preset: undefined
        });
        setIsOpen(false);
      }
    }
  };

  const getDisplayText = () => {
    if (value.preset) {
      return value.label;
    }
    
    const formatDate = (date: Date) => {
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const isYesterday = date.toDateString() === new Date(now.getTime() - 24*60*60*1000).toDateString();
      
      if (isToday) {
        return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else if (isYesterday) {
        return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        return date.toLocaleDateString([], { 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    };
    
    return `${formatDate(value.start)} - ${formatDate(value.end)}`;
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Clock className="h-4 w-4" />
        <span className="max-w-48 truncate">{getDisplayText()}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50">
          <div className="p-3">
            {/* Quick Presets */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                {manufacturingContext ? 'Manufacturing Ranges' : 'Quick Ranges'}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {presets.slice(0, manufacturingContext ? 4 : 8).map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handlePresetClick(preset)}
                    className={`px-2 py-1.5 text-xs rounded-md border transition-colors ${
                      selectedPreset === preset.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Presets */}
            {presets.length > 8 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  More Options
                </h4>
                <div className="space-y-1">
                  {presets.slice(manufacturingContext ? 4 : 8).map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetClick(preset)}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors ${
                        selectedPreset === preset.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Range */}
            {showCustom && (
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Custom Range
                </h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">From</label>
                    <input
                      type="datetime-local"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">To</label>
                    <input
                      type="datetime-local"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <button
                    onClick={handleCustomApply}
                    disabled={!customStart || !customEnd || new Date(customStart) >= new Date(customEnd)}
                    className="w-full px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply Custom Range
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}