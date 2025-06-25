/**
 * Baseline Overlay Component
 * Implements Phase 2.1: Historical baselines and shift targets
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, Calendar, BarChart3, Settings } from 'lucide-react';
import { ReferenceLine, ReferenceArea } from 'recharts';

export interface BaselineConfig {
  id: string;
  label: string;
  value: number | null;
  type: 'target' | 'average' | 'benchmark' | 'control_limit' | 'shift_goal';
  period: string;
  color: string;
  strokeDasharray?: string;
  enabled: boolean;
  tolerance?: {
    upper: number;
    lower: number;
  };
}

export interface BaselineOverlayProps {
  metric: string;
  equipmentId?: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  children: React.ReactNode;
  showControls?: boolean;
  onConfigChange?: (configs: BaselineConfig[]) => void;
}

export function BaselineOverlay({
  metric,
  equipmentId,
  timeRange,
  children,
  showControls = true,
  onConfigChange
}: BaselineOverlayProps) {
  const [baselines, setBaselines] = useState<BaselineConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // Default baseline configurations
  const defaultBaselines: Omit<BaselineConfig, 'value'>[] = [
    {
      id: 'target',
      label: 'Target',
      type: 'target',
      period: 'Set Point',
      color: '#10b981',
      strokeDasharray: '5 5',
      enabled: true
    },
    {
      id: 'previous_week',
      label: 'Previous Week Average',
      type: 'average',
      period: '7 days',
      color: '#6b7280',
      strokeDasharray: '3 3',
      enabled: true
    },
    {
      id: 'previous_month',
      label: 'Previous Month Average',
      type: 'average',
      period: '30 days',
      color: '#9ca3af',
      strokeDasharray: '2 2',
      enabled: false
    },
    {
      id: 'shift_goal',
      label: 'Shift Goal',
      type: 'shift_goal',
      period: '8 hours',
      color: '#f59e0b',
      strokeDasharray: '4 2',
      enabled: true
    },
    {
      id: 'control_upper',
      label: 'Upper Control Limit',
      type: 'control_limit',
      period: '3σ',
      color: '#ef4444',
      strokeDasharray: '1 1',
      enabled: false,
      tolerance: { upper: 0, lower: 0 }
    },
    {
      id: 'control_lower',
      label: 'Lower Control Limit',
      type: 'control_limit',
      period: '3σ',
      color: '#ef4444',
      strokeDasharray: '1 1',
      enabled: false,
      tolerance: { upper: 0, lower: 0 }
    }
  ];

  useEffect(() => {
    loadBaselines();
  }, [metric, equipmentId, timeRange]);

  const loadBaselines = async () => {
    setLoading(true);
    try {
      const calculatedBaselines = await Promise.all(
        defaultBaselines.map(async (baseline) => {
          const value = await calculateBaselineValue(baseline);
          return {
            ...baseline,
            value
          };
        })
      );
      
      setBaselines(calculatedBaselines);
      onConfigChange?.(calculatedBaselines);
    } catch (error) {
      console.error('Failed to load baselines:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBaselineValue = async (baseline: Omit<BaselineConfig, 'value'>): Promise<number | null> => {
    try {
      switch (baseline.type) {
        case 'target':
          return getTargetValue(metric);
          
        case 'shift_goal':
          return getShiftGoal(metric);
          
        case 'average':
          return await getHistoricalAverage(baseline.period);
          
        case 'control_limit':
          return await getControlLimit(baseline.id);
          
        case 'benchmark':
          return getBenchmarkValue(metric);
          
        default:
          return null;
      }
    } catch (error) {
      console.error(`Failed to calculate baseline for ${baseline.id}:`, error);
      return null;
    }
  };

  const getTargetValue = (metric: string): number => {
    // Industry standard targets
    const targets: Record<string, number> = {
      oee: 85,
      availability: 90,
      performance: 95,
      quality: 99.5,
      temperature: 75,
      vibration: 2.0,
      pressure: 100,
      throughput: 1000,
      cycle_time: 60,
      downtime: 5
    };
    
    return targets[metric.toLowerCase()] || 100;
  };

  const getShiftGoal = (metric: string): number => {
    // Shift-specific goals (typically 80-90% of target)
    const target = getTargetValue(metric);
    return target * 0.85;
  };

  const getBenchmarkValue = (metric: string): number => {
    // World-class benchmarks
    const benchmarks: Record<string, number> = {
      oee: 85,
      availability: 95,
      performance: 98,
      quality: 99.9,
      throughput: 1200
    };
    
    return benchmarks[metric.toLowerCase()] || getTargetValue(metric) * 1.1;
  };

  const getHistoricalAverage = async (period: string): Promise<number> => {
    const days = period === '7 days' ? 7 : 30;
    const startDate = new Date(timeRange.start.getTime() - days * 24 * 60 * 60 * 1000);
    
    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [metric],
          equipmentIds: equipmentId ? [equipmentId] : undefined,
          startTime: startDate.toISOString(),
          endTime: timeRange.start.toISOString(),
          interval: '1h',
          aggregation: 'avg'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch historical data');
      }

      const data = await response.json();
      const values = data.map((item: any) => item.value).filter((v: number) => !isNaN(v));
      
      if (values.length === 0) {
        return getTargetValue(metric) * 0.9; // Fallback to 90% of target
      }
      
      return values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
    } catch (error) {
      console.error('Failed to fetch historical average:', error);
      return getTargetValue(metric) * 0.9;
    }
  };

  const getControlLimit = async (limitType: string): Promise<number> => {
    // Calculate statistical control limits (mean ± 3σ)
    try {
      const historicalAverage = await getHistoricalAverage('30 days');
      const standardDeviation = await getStandardDeviation();
      
      if (limitType === 'control_upper') {
        return historicalAverage + (3 * standardDeviation);
      } else {
        return Math.max(0, historicalAverage - (3 * standardDeviation));
      }
    } catch (error) {
      console.error('Failed to calculate control limits:', error);
      const target = getTargetValue(metric);
      return limitType === 'control_upper' ? target * 1.2 : target * 0.8;
    }
  };

  const getStandardDeviation = async (): Promise<number> => {
    // Mock implementation - in real scenario, calculate from historical data
    const target = getTargetValue(metric);
    return target * 0.05; // Assume 5% standard deviation
  };

  const toggleBaseline = (id: string) => {
    const updatedBaselines = baselines.map(baseline => 
      baseline.id === id 
        ? { ...baseline, enabled: !baseline.enabled }
        : baseline
    );
    setBaselines(updatedBaselines);
    onConfigChange?.(updatedBaselines);
  };

  const updateBaselineValue = (id: string, value: number) => {
    const updatedBaselines = baselines.map(baseline => 
      baseline.id === id 
        ? { ...baseline, value }
        : baseline
    );
    setBaselines(updatedBaselines);
    onConfigChange?.(updatedBaselines);
  };

  // Render baseline lines as React children that can be injected into charts
  const renderBaselines = () => {
    return baselines
      .filter(baseline => baseline.enabled && baseline.value !== null)
      .map(baseline => (
        <ReferenceLine
          key={baseline.id}
          y={baseline.value!}
          stroke={baseline.color}
          strokeDasharray={baseline.strokeDasharray}
          strokeWidth={2}
          label={{
            value: `${baseline.label}: ${baseline.value!.toFixed(1)}`,
            position: 'topRight',
            style: { 
              fontSize: '12px',
              fill: baseline.color,
              fontWeight: 'bold'
            }
          }}
        />
      ));
  };

  // Clone children and inject baseline components
  const childrenWithBaselines = React.Children.map(children, child => {
    if (React.isValidElement(child) && child.type === React.Fragment) {
      return React.cloneElement(child, {}, [
        ...(Array.isArray(child.props.children) ? child.props.children : [child.props.children]),
        ...renderBaselines()
      ]);
    }
    
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {}, [
        ...(Array.isArray(child.props.children) ? child.props.children : [child.props.children]),
        ...renderBaselines()
      ]);
    }
    
    return child;
  });

  return (
    <div className="relative">
      {/* Baseline Controls */}
      {showControls && (
        <div className="absolute top-0 right-0 z-10">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700"
            title="Configure Baselines"
          >
            <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
          
          {showConfig && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-20">
              <div className="p-4">
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Baseline Configuration
                </h4>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {baselines.map((baseline) => (
                    <div key={baseline.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={baseline.enabled}
                          onChange={() => toggleBaseline(baseline.id)}
                          className="rounded border-gray-300"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: baseline.color }}
                            />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {baseline.label}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {baseline.period}
                          </span>
                        </div>
                      </div>
                      
                      {baseline.enabled && baseline.value !== null && (
                        <input
                          type="number"
                          value={baseline.value}
                          onChange={(e) => updateBaselineValue(baseline.id, parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded"
                          step="0.1"
                        />
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={loadBaselines}
                    disabled={loading}
                    className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Recalculating...' : 'Recalculate Baselines'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Chart with baselines */}
      {childrenWithBaselines}
      
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 dark:bg-gray-800 dark:bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Loading baselines...
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for baseline management
export function useBaselines(metric: string, equipmentId?: string) {
  const [baselines, setBaselines] = useState<BaselineConfig[]>([]);
  
  const enabledBaselines = baselines.filter(b => b.enabled && b.value !== null);
  
  const getBaselineValue = (type: BaselineConfig['type']) => {
    return baselines.find(b => b.type === type && b.enabled)?.value || null;
  };
  
  const isAboveTarget = (value: number) => {
    const target = getBaselineValue('target');
    return target ? value >= target : false;
  };
  
  const isWithinControlLimits = (value: number) => {
    const upper = getBaselineValue('control_limit');
    const lower = baselines.find(b => b.id === 'control_lower')?.value;
    
    if (upper && lower) {
      return value >= lower && value <= upper;
    }
    return true;
  };
  
  return {
    baselines,
    setBaselines,
    enabledBaselines,
    getBaselineValue,
    isAboveTarget,
    isWithinControlLimits
  };
}