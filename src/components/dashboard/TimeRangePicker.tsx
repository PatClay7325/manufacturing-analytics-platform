'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ClockIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { TimeRange } from '@/types/dashboard';
import { format, subHours, subDays, subWeeks, subMonths, startOfToday, endOfToday } from 'date-fns';

interface TimeRangePickerProps {
  value?: TimeRange;
  onChange?: (timeRange?: TimeRange) => void;
}

interface QuickRange {
  label: string;
  from: string;
  to: string;
}

const quickRanges: QuickRange[] = [
  { label: 'Last 5 minutes', from: 'now-5m', to: 'now' },
  { label: 'Last 15 minutes', from: 'now-15m', to: 'now' },
  { label: 'Last 30 minutes', from: 'now-30m', to: 'now' },
  { label: 'Last 1 hour', from: 'now-1h', to: 'now' },
  { label: 'Last 3 hours', from: 'now-3h', to: 'now' },
  { label: 'Last 6 hours', from: 'now-6h', to: 'now' },
  { label: 'Last 12 hours', from: 'now-12h', to: 'now' },
  { label: 'Last 24 hours', from: 'now-24h', to: 'now' },
  { label: 'Last 2 days', from: 'now-2d', to: 'now' },
  { label: 'Last 7 days', from: 'now-7d', to: 'now' },
  { label: 'Last 30 days', from: 'now-30d', to: 'now' },
  { label: 'Last 90 days', from: 'now-90d', to: 'now' },
  { label: 'Last 6 months', from: 'now-6M', to: 'now' },
  { label: 'Last 1 year', from: 'now-1y', to: 'now' },
  { label: 'Today', from: 'today', to: 'now' },
  { label: 'Today so far', from: 'today', to: 'now' },
  { label: 'This week', from: 'now/w', to: 'now' },
  { label: 'This month', from: 'now/M', to: 'now' },
  { label: 'This year', from: 'now/y', to: 'now' },
];

export default function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef?.current && !dropdownRef?.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format display text for current range
  const formatRangeDisplay = (range: TimeRange): string => {
    const quickRange = quickRanges?.find(qr => qr?.from === range?.from && qr?.to === range?.to);
    if (quickRange) {
      return quickRange?.label;
    }

    // For custom ranges, try to parse and format dates
    try {
      if (range?.from.startsWith('now-')) {
        return `Last ${range?.from.substring(4)} to ${range?.to}`;
      }
      return `${range?.from} to ${range?.to}`;
    } catch {
      return 'Custom range';
    }
  };

  const handleQuickRangeSelect = (range: QuickRange) => {
    onChange({ from: range.from, to: range.to });
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    if (customFrom && customTo) {
      onChange({ from: customFrom, to: customTo });
      setIsOpen(false);
      setCustomMode(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-sm"
      >
        <ClockIcon className="w-4 h-4" />
        <span>{formatRangeDisplay(value)}</span>
        <ChevronDownIcon className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-[280px]">
          {!customMode ? (
            <>
              {/* Quick ranges */}
              <div className="p-2">
                <h3 className="text-xs font-medium text-gray-400 uppercase px-2 py-1">
                  Quick ranges
                </h3>
                <div className="grid grid-cols-2 gap-1">
                  {quickRanges?.map((range) => (
                    <button
                      key={range?.label}
                      onClick={() => handleQuickRangeSelect(range)}
                      className={`
                        text-left px-3 py-2 text-sm rounded hover:bg-gray-700
                        ${value?.from === range?.from && value?.to === range?.to
                          ? 'bg-gray-700 text-white'
                          : 'text-gray-300'
                        }
                      `}
                    >
                      {range?.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom range button */}
              <div className="border-t border-gray-700 p-2">
                <button
                  onClick={() => setCustomMode(true)}
                  className="w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
                >
                  Custom time range
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Custom range inputs */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-white mb-3">
                  Custom time range
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">From</label>
                    <input
                      type="text"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      placeholder="now-1h, 2024-01-01, etc."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">To</label>
                    <input
                      type="text"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      placeholder="now, 2024-01-02, etc."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setCustomMode(false)}
                    className="flex-1 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleCustomApply}
                    disabled={!customFrom || !customTo}
                    className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}