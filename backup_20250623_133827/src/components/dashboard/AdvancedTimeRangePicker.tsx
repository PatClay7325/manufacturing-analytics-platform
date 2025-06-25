/**
 * Advanced Time Range Picker - Analytics-compatible time controls
 * Includes timezone support, fiscal calendar, and time comparisons
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Globe, ChevronDown, ChevronLeft, ChevronRight,
  RotateCcw, Zap, TrendingUp, CalendarDays, Settings, Check
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, startOfQuarter, endOfQuarter } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import { cn } from '@/lib/utils';

export interface TimeRange {
  from: string | Date;
  to: string | Date;
  display?: string;
}

export interface TimeZone {
  name: string;
  offset: string;
  abbr: string;
}

export interface FiscalYearConfig {
  startMonth: number; // 1-12
  timezone?: string;
}

export interface TimeCompareConfig {
  enabled: boolean;
  compareWith: 'previousPeriod' | 'previousYear' | 'custom';
  customRange?: TimeRange;
}

interface AdvancedTimeRangePickerProps {
  value: TimeRange;
  onChange: (range: TimeRange, comparison?: TimeCompareConfig) => void;
  onRefresh?: () => void;
  timezone?: string;
  fiscalYearConfig?: FiscalYearConfig;
  showComparison?: boolean;
  quickRanges?: Array<{
    label: string;
    from: string;
    to: string;
  }>;
  className?: string;
}

const defaultQuickRanges = [
  // Relative ranges
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
  { label: 'Last 2 years', from: 'now-2y', to: 'now' },
  { label: 'Last 5 years', from: 'now-5y', to: 'now' },
  
  // Absolute ranges
  { label: 'Yesterday', from: 'now-1d/d', to: 'now-1d/d' },
  { label: 'Day before yesterday', from: 'now-2d/d', to: 'now-2d/d' },
  { label: 'This day last week', from: 'now-7d/d', to: 'now-7d/d' },
  { label: 'Previous week', from: 'now-1w/w', to: 'now-1w/w' },
  { label: 'Previous month', from: 'now-1M/M', to: 'now-1M/M' },
  { label: 'Previous year', from: 'now-1y/y', to: 'now-1y/y' },
  
  // Current period ranges
  { label: 'Today', from: 'now/d', to: 'now/d' },
  { label: 'Today so far', from: 'now/d', to: 'now' },
  { label: 'This week', from: 'now/w', to: 'now/w' },
  { label: 'This week so far', from: 'now/w', to: 'now' },
  { label: 'This month', from: 'now/M', to: 'now/M' },
  { label: 'This month so far', from: 'now/M', to: 'now' },
  { label: 'This year', from: 'now/y', to: 'now/y' },
  { label: 'This year so far', from: 'now/y', to: 'now' },
];

const commonTimezones: TimeZone[] = [
  { name: 'UTC', offset: '+00:00', abbr: 'UTC' },
  { name: 'America/New_York', offset: '-05:00', abbr: 'EST' },
  { name: 'America/Chicago', offset: '-06:00', abbr: 'CST' },
  { name: 'America/Denver', offset: '-07:00', abbr: 'MST' },
  { name: 'America/Los_Angeles', offset: '-08:00', abbr: 'PST' },
  { name: 'Europe/London', offset: '+00:00', abbr: 'GMT' },
  { name: 'Europe/Paris', offset: '+01:00', abbr: 'CET' },
  { name: 'Asia/Tokyo', offset: '+09:00', abbr: 'JST' },
  { name: 'Asia/Shanghai', offset: '+08:00', abbr: 'CST' },
  { name: 'Australia/Sydney', offset: '+11:00', abbr: 'AEDT' },
];

export function AdvancedTimeRangePicker({
  value,
  onChange,
  onRefresh,
  timezone = 'browser',
  fiscalYearConfig,
  showComparison = false,
  quickRanges = defaultQuickRanges,
  className,
}: AdvancedTimeRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick' | 'relative' | 'absolute' | 'fiscal'>('quick');
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);
  const [comparison, setComparison] = useState<TimeCompareConfig>({
    enabled: false,
    compareWith: 'previousPeriod',
  });
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [relativeValue, setRelativeValue] = useState('1');
  const [relativeUnit, setRelativeUnit] = useState('h');

  // Get current timezone
  const getCurrentTimezone = () => {
    if (selectedTimezone === 'browser') {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    return selectedTimezone;
  };

  // Format display string
  const getDisplayString = () => {
    if (value.display) return value.display;
    
    // Check if it's a relative time
    if (typeof value.from === 'string' && value.from.startsWith('now')) {
      const range = quickRanges.find(r => r.from === value.from && r.to === value.to);
      if (range) return range.label;
      return `${value.from} to ${value.to}`;
    }
    
    // Format absolute times
    const from = new Date(value.from);
    const to = new Date(value.to);
    return `${format(from, 'MMM d, HH:mm')} - ${format(to, 'MMM d, HH:mm')}`;
  };

  // Calculate fiscal periods
  const getFiscalPeriods = () => {
    if (!fiscalYearConfig) return [];
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const fiscalStart = fiscalYearConfig.startMonth - 1; // Convert to 0-based
    
    const periods = [];
    
    // Current fiscal year
    const fyStart = new Date(currentYear, fiscalStart, 1);
    if (fyStart > now) {
      fyStart.setFullYear(currentYear - 1);
    }
    const fyEnd = new Date(fyStart);
    fyEnd.setFullYear(fyEnd.getFullYear() + 1);
    fyEnd.setDate(0); // Last day of previous month
    
    periods.push({
      label: `FY ${fyStart.getFullYear()}`,
      from: fyStart,
      to: fyEnd,
    });
    
    // Fiscal quarters
    for (let q = 0; q < 4; q++) {
      const qStart = new Date(fyStart);
      qStart.setMonth(qStart.getMonth() + (q * 3));
      const qEnd = new Date(qStart);
      qEnd.setMonth(qEnd.getMonth() + 3);
      qEnd.setDate(0);
      
      periods.push({
        label: `FY ${fyStart.getFullYear()} Q${q + 1}`,
        from: qStart,
        to: qEnd,
      });
    }
    
    return periods;
  };

  const handleQuickRangeSelect = (range: typeof quickRanges[0]) => {
    onChange({ from: range.from, to: range.to, display: range.label });
    setIsOpen(false);
  };

  const handleRelativeSubmit = () => {
    const from = `now-${relativeValue}${relativeUnit}`;
    const to = 'now';
    onChange({ from, to, display: `Last ${relativeValue} ${getUnitLabel(relativeUnit)}` });
    setIsOpen(false);
  };

  const handleAbsoluteSubmit = () => {
    if (customFrom && customTo) {
      onChange({ 
        from: new Date(customFrom), 
        to: new Date(customTo) 
      });
      setIsOpen(false);
    }
  };

  const handleTimezoneChange = (tz: string) => {
    setSelectedTimezone(tz);
    // Re-calculate current range with new timezone
    if (typeof value.from !== 'string' && typeof value.to !== 'string') {
      const from = utcToZonedTime(value.from, tz);
      const to = utcToZonedTime(value.to, tz);
      onChange({ from, to });
    }
  };

  const getUnitLabel = (unit: string) => {
    const labels: Record<string, string> = {
      's': 'seconds',
      'm': 'minutes',
      'h': 'hours',
      'd': 'days',
      'w': 'weeks',
      'M': 'months',
      'y': 'years',
    };
    return labels[unit] || unit;
  };

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
        >
          <Calendar className="h-4 w-4" />
          <span>{getDisplayString()}</span>
          <ChevronDown className="h-4 w-4" />
        </button>
        
        {showComparison && (
          <button
            onClick={() => setComparison(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={cn(
              "p-1.5 border rounded-md",
              comparison.enabled ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            )}
            title="Compare time periods"
          >
            <TrendingUp className="h-4 w-4" />
          </button>
        )}
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1.5 border rounded-md hover:bg-accent"
            title="Refresh"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-[600px] bg-background border rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Time Range</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleTimezoneChange(timezone === 'browser' ? 'UTC' : 'browser')}
                className="flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-accent"
              >
                <Globe className="h-3 w-3" />
                {selectedTimezone === 'browser' ? 'Local' : selectedTimezone}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            {[
              { id: 'quick', label: 'Quick ranges' },
              { id: 'relative', label: 'Relative' },
              { id: 'absolute', label: 'Absolute' },
              ...(fiscalYearConfig ? [{ id: 'fiscal', label: 'Fiscal' }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-4">
            {activeTab === 'quick' && (
              <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                {quickRanges.map((range, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickRangeSelect(range)}
                    className="px-3 py-2 text-sm text-left hover:bg-accent rounded-md"
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'relative' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Last</span>
                  <input
                    type="number"
                    value={relativeValue}
                    onChange={(e) => setRelativeValue(e.target.value)}
                    className="w-20 px-2 py-1 border rounded-md"
                    min="1"
                  />
                  <select
                    value={relativeUnit}
                    onChange={(e) => setRelativeUnit(e.target.value)}
                    className="px-2 py-1 border rounded-md"
                  >
                    <option value="s">seconds</option>
                    <option value="m">minutes</option>
                    <option value="h">hours</option>
                    <option value="d">days</option>
                    <option value="w">weeks</option>
                    <option value="M">months</option>
                    <option value="y">years</option>
                  </select>
                </div>
                <button
                  onClick={handleRelativeSubmit}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Apply
                </button>
              </div>
            )}

            {activeTab === 'absolute' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">From</label>
                  <input
                    type="datetime-local"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">To</label>
                  <input
                    type="datetime-local"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <button
                  onClick={handleAbsoluteSubmit}
                  disabled={!customFrom || !customTo}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            )}

            {activeTab === 'fiscal' && fiscalYearConfig && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {getFiscalPeriods().map((period, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onChange({ from: period.from, to: period.to, display: period.label });
                      setIsOpen(false);
                    }}
                    className="w-full px-3 py-2 text-sm text-left hover:bg-accent rounded-md"
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comparison settings */}
          {showComparison && comparison.enabled && (
            <div className="p-4 border-t bg-muted/50">
              <h4 className="text-sm font-medium mb-3">Compare to</h4>
              <div className="space-y-2">
                {[
                  { value: 'previousPeriod', label: 'Previous period' },
                  { value: 'previousYear', label: 'Previous year' },
                  { value: 'custom', label: 'Custom range' },
                ].map((option) => (
                  <label key={option.value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="compareWith"
                      value={option.value}
                      checked={comparison.compareWith === option.value}
                      onChange={(e) => setComparison(prev => ({ 
                        ...prev, 
                        compareWith: e.target.value as any 
                      }))}
                      className="text-primary"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
              {comparison.compareWith === 'custom' && (
                <div className="mt-3 p-3 border rounded-md bg-background">
                  <p className="text-xs text-muted-foreground">
                    Custom comparison ranges coming soon
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}