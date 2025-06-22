'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronDown } from 'lucide-react';
import { format, subHours, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';

export interface TimeRange {
  from: Date | string;
  to: Date | string;
  raw: {
    from: string;
    to: string;
  };
}

interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
}

interface QuickRange {
  label: string;
  from: string;
  to: string;
  section?: string;
}

const quickRanges: QuickRange[] = [
  // Relative ranges
  { label: 'Last 5 minutes', from: 'now-5m', to: 'now', section: 'relative' },
  { label: 'Last 15 minutes', from: 'now-15m', to: 'now', section: 'relative' },
  { label: 'Last 30 minutes', from: 'now-30m', to: 'now', section: 'relative' },
  { label: 'Last 1 hour', from: 'now-1h', to: 'now', section: 'relative' },
  { label: 'Last 3 hours', from: 'now-3h', to: 'now', section: 'relative' },
  { label: 'Last 6 hours', from: 'now-6h', to: 'now', section: 'relative' },
  { label: 'Last 12 hours', from: 'now-12h', to: 'now', section: 'relative' },
  { label: 'Last 24 hours', from: 'now-24h', to: 'now', section: 'relative' },
  { label: 'Last 2 days', from: 'now-2d', to: 'now', section: 'relative' },
  { label: 'Last 7 days', from: 'now-7d', to: 'now', section: 'relative' },
  { label: 'Last 30 days', from: 'now-30d', to: 'now', section: 'relative' },
  { label: 'Last 90 days', from: 'now-90d', to: 'now', section: 'relative' },
  { label: 'Last 6 months', from: 'now-6M', to: 'now', section: 'relative' },
  { label: 'Last 1 year', from: 'now-1y', to: 'now', section: 'relative' },
  { label: 'Last 2 years', from: 'now-2y', to: 'now', section: 'relative' },
  { label: 'Last 5 years', from: 'now-5y', to: 'now', section: 'relative' },
  
  // Other quick ranges
  { label: 'Today', from: 'now/d', to: 'now/d', section: 'other' },
  { label: 'Today so far', from: 'now/d', to: 'now', section: 'other' },
  { label: 'This week', from: 'now/w', to: 'now/w', section: 'other' },
  { label: 'This week so far', from: 'now/w', to: 'now', section: 'other' },
  { label: 'This month', from: 'now/M', to: 'now/M', section: 'other' },
  { label: 'This month so far', from: 'now/M', to: 'now', section: 'other' },
  { label: 'This year', from: 'now/y', to: 'now/y', section: 'other' },
  { label: 'This year so far', from: 'now/y', to: 'now', section: 'other' },
  
  // Previous periods
  { label: 'Yesterday', from: 'now-1d/d', to: 'now-1d/d', section: 'previous' },
  { label: 'Previous week', from: 'now-1w/w', to: 'now-1w/w', section: 'previous' },
  { label: 'Previous month', from: 'now-1M/M', to: 'now-1M/M', section: 'previous' },
  { label: 'Previous year', from: 'now-1y/y', to: 'now-1y/y', section: 'previous' },
];

export function TimeRangePicker({ value, onChange, className = '' }: TimeRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'relative' | 'absolute'>('relative');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuickSelect = (range: QuickRange) => {
    onChange({
      from: range.from,
      to: range.to,
      raw: { from: range.from, to: range.to }
    });
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    if (activeTab === 'relative' && customFrom && customTo) {
      onChange({
        from: customFrom,
        to: customTo,
        raw: { from: customFrom, to: customTo }
      });
      setIsOpen(false);
    } else if (activeTab === 'absolute' && fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      onChange({
        from,
        to,
        raw: { from: from.toISOString(), to: to.toISOString() }
      });
      setIsOpen(false);
    }
  };

  const getDisplayText = () => {
    // Find matching quick range
    const quickRange = quickRanges.find(
      r => r.from === value.raw.from && r.to === value.raw.to
    );
    if (quickRange) return quickRange.label;

    // Check if it's a relative time
    if (typeof value.raw.from === 'string' && value.raw.from.includes('now')) {
      return `${value.raw.from} to ${value.raw.to}`;
    }

    // Format absolute time
    try {
      const from = new Date(value.from);
      const to = new Date(value.to);
      return `${format(from, 'yyyy-MM-dd HH:mm')} to ${format(to, 'yyyy-MM-dd HH:mm')}`;
    } catch {
      return 'Custom time range';
    }
  };

  const groupedRanges = quickRanges.reduce((acc, range) => {
    const section = range.section || 'other';
    if (!acc[section]) acc[section] = [];
    acc[section].push(range);
    return acc;
  }, {} as Record<string, QuickRange[]>);

  return (
    <div className={`time-range-picker ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700
          rounded hover:border-gray-400 focus:outline-none focus:border-blue-500
          transition-colors ${isOpen ? 'border-blue-500' : ''}
        `}
      >
        <Clock className="w-4 h-4 mr-2" />
        <span>{getDisplayText()}</span>
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-[600px] bg-white border border-gray-300 rounded shadow-lg">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('relative')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'relative' 
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Relative time ranges
            </button>
            <button
              onClick={() => setActiveTab('absolute')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'absolute' 
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Absolute time range
            </button>
          </div>
          
          {activeTab === 'relative' ? (
            <div className="flex">
              {/* Quick ranges */}
              <div className="flex-1 p-4 border-r border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Quick ranges</h3>
                <div className="space-y-4">
                  {Object.entries(groupedRanges).map(([section, ranges]) => (
                    <div key={section}>
                      {section !== 'relative' && (
                        <h4 className="text-xs text-gray-500 uppercase mb-2">
                          {section === 'previous' ? 'Previous' : 'Other'}
                        </h4>
                      )}
                      <div className="grid grid-cols-2 gap-1">
                        {ranges.map((range, index) => (
                          <button
                            key={index}
                            onClick={() => handleQuickSelect(range)}
                            className="px-3 py-1.5 text-sm text-left text-gray-700 hover:bg-gray-100 rounded transition-colors"
                          >
                            {range.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Custom relative range */}
              <div className="w-64 p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Custom range</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">From</label>
                    <input
                      type="text"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      placeholder="now-6h"
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">To</label>
                    <input
                      type="text"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      placeholder="now"
                      className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleCustomApply}
                    disabled={!customFrom || !customTo}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 rounded text-sm transition-colors"
                  >
                    Apply time range
                  </button>
                  
                  <div className="text-xs text-gray-500 mt-2">
                    <p className="mb-1">Examples:</p>
                    <p>now-1h, now-1d, now-7d</p>
                    <p>now/d (start of day)</p>
                    <p>now-1d/d (yesterday)</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">From</label>
                  <input
                    type="datetime-local"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">To</label>
                  <input
                    type="datetime-local"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const now = new Date();
                    const from = startOfDay(now);
                    const to = endOfDay(now);
                    setFromDate(format(from, "yyyy-MM-dd'T'HH:mm"));
                    setToDate(format(to, "yyyy-MM-dd'T'HH:mm"));
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const to = new Date();
                    const from = subDays(to, 7);
                    setFromDate(format(from, "yyyy-MM-dd'T'HH:mm"));
                    setToDate(format(to, "yyyy-MM-dd'T'HH:mm"));
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                >
                  Last 7 days
                </button>
                <div className="flex-1" />
                <button
                  onClick={handleCustomApply}
                  disabled={!fromDate || !toDate}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded text-sm transition-colors"
                >
                  Apply time range
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}