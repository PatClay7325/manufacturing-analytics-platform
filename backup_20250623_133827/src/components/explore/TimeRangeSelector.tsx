'use client';

import React, { useState } from 'react';
import { Clock, Calendar, ChevronDown } from 'lucide-react';
import { TimeRange } from '@/types/dashboard';

interface TimeRangeSelectorProps {
  timeRange?: TimeRange;
  onChange?: (timeRange?: TimeRange) => void;
  className?: string;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({
  timeRange,
  onChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  interface PresetRange {
    from: string;
    to: string;
    display: string;
  }

  const presetRanges: PresetRange[] = [
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
    { from: 'now-90d', to: 'now', display: 'Last 90 days' },
    { from: 'now-6M', to: 'now', display: 'Last 6 months' },
    { from: 'now-1y', to: 'now', display: 'Last 1 year' },
    { from: 'now-2y', to: 'now', display: 'Last 2 years' },
    { from: 'now-5y', to: 'now', display: 'Last 5 years' }
  ];

  // Find current display name based on timeRange
  const getCurrentDisplay = (): string => {
    const preset = presetRanges?.find(r => r?.from === timeRange?.from && r?.to === timeRange?.to);
    return preset ? preset?.display : 'Custom range';
  };

  const handleSelect = (range: PresetRange) => {
    onChange({ from: range.from, to: range.to });
    setIsOpen(false);
    setIsCustom(false);
  };

  const handleCustomRange = () => {
    setIsCustom(true);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <Clock className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-700">{getCurrentDisplay()}</span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-10 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-1">
              Quick Ranges
            </div>
            <div className="max-h-64 overflow-y-auto">
              {presetRanges?.map((range, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(range)}
                  className={`w-full px-2 py-1.5 text-left text-sm rounded hover:bg-gray-100 ${
                    range?.from === timeRange?.from && range?.to === timeRange?.to ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
                  }`}
                >
                  {range?.display}
                </button>
              ))}
            </div>
          </div>
          
          <div className="border-t border-gray-200 p-2">
            <button
              onClick={handleCustomRange}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
            >
              <Calendar className="h-4 w-4" />
              <span>Custom time range</span>
            </button>
          </div>
        </div>
      )}

      {/* Custom Date Range Modal - Simplified for now */}
      {isCustom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Time Range</h3>
            <p className="text-sm text-gray-500 mb-4">
              Custom date range picker would be implemented here with date/time inputs.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsCustom(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsCustom(false)}
                className="px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-md"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeRangeSelector;