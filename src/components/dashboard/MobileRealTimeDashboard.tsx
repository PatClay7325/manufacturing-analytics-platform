'use client';

import React from 'react';
import { Card } from '@/components/common/Card';
import { Activity, Zap, TrendingUp, AlertTriangle, Gauge, BarChart3 } from 'lucide-react';
import {
  LineChart, Line, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { 
  ResponsiveGrid,
  MobileCard,
  ResponsiveChartContainer,
  CollapsibleSection,
  ResponsiveText,
  MobileToolbar,
  SwipeableChartCarousel
} from '@/components/common/ResponsiveWrapper';
import { useIsMobile } from '@/hooks/useMediaQuery';

interface MobileKPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  sparklineData?: any[];
  color: string;
  referenceValue?: number;
}

// Mobile-optimized KPI card
function MobileKPICard({ 
  title, 
  value, 
  icon, 
  sparklineData = [], 
  color,
  referenceValue
}: MobileKPICardProps) {
  const isMobile = useIsMobile();
  
  return (
    <MobileCard className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <ResponsiveText 
              sizeMobile="text-xs" 
              sizeDesktop="text-sm" 
              className="font-medium text-gray-600"
            >
              {title}
            </ResponsiveText>
            {!isMobile && icon}
          </div>
          <ResponsiveText 
            sizeMobile="text-xl" 
            sizeDesktop="text-2xl" 
            className="font-bold text-gray-900"
          >
            {value}
          </ResponsiveText>
        </div>
        {isMobile && (
          <div className="text-gray-400">
            {icon}
          </div>
        )}
      </div>
      
      {sparklineData.length > 0 && (
        <div className="h-6 sm:h-8 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                strokeWidth={isMobile ? 1 : 2} 
                dot={false} 
              />
              {referenceValue && (
                <ReferenceLine 
                  y={referenceValue} 
                  stroke="#10b981" 
                  strokeDasharray="3 3" 
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </MobileCard>
  );
}

// Mobile connection status bar
function MobileConnectionStatus({ 
  isConnected, 
  mode, 
  retries 
}: { 
  isConnected: boolean; 
  mode: string; 
  retries: number;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 px-4 py-2 shadow-sm mb-4 rounded-lg">
      <div className="flex items-center justify-between">
        <ResponsiveText sizeMobile="text-xs" sizeTablet="text-sm" className="font-medium">
          {isConnected ? (
            <span className="text-green-600 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              {mode === 'websocket' ? 'Live' : 'Connected'}
            </span>
          ) : (
            <span className="text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-gray-400 rounded-full" />
              Connecting ({retries}/10)
            </span>
          )}
        </ResponsiveText>
      </div>
    </div>
  );
}

// Mobile-optimized alert item
function MobileAlert({ alert }: { alert: any }) {
  const isMobile = useIsMobile();
  
  return (
    <div className={`
      p-3 rounded-lg border animate-pulse-once
      ${alert.severity === 'critical' 
        ? 'bg-red-50 border-red-200' 
        : 'bg-yellow-50 border-yellow-200'}
    `}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`
          flex-shrink-0
          ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}
          ${alert.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'}
        `} />
        <div className="flex-1 min-w-0">
          <ResponsiveText 
            sizeMobile="text-sm" 
            sizeDesktop="text-base" 
            className="font-medium text-gray-900"
          >
            {alert.type}
          </ResponsiveText>
          <ResponsiveText 
            sizeMobile="text-xs" 
            sizeDesktop="text-sm" 
            className="text-gray-600 truncate"
          >
            {alert.equipment} • {alert.value}
          </ResponsiveText>
          {!isMobile && (
            <p className="text-xs text-gray-500 mt-1">
              {alert.timestamp} • ISO 22400 Violation
            </p>
          )}
        </div>
        {!isMobile && (
          <span className={`
            px-2 py-1 text-xs font-medium rounded-full
            ${alert.severity === 'critical' 
              ? 'bg-red-100 text-red-700' 
              : 'bg-yellow-100 text-yellow-700'}
          `}>
            {alert.severity.toUpperCase()}
          </span>
        )}
      </div>
    </div>
  );
}

// Export wrapper that makes RealTimeDashboard responsive
export function MobileRealTimeDashboard({
  currentMetrics,
  liveData,
  alertsData,
  isConnected,
  status,
  refreshInterval,
  onRefreshIntervalChange,
  getSparklineData,
  children
}: any) {
  const isMobile = useIsMobile();

  const kpiCards = [
    {
      title: 'OEE',
      value: `${(currentMetrics.oee || 0).toFixed(1)}%`,
      icon: <Gauge className="h-4 w-4 text-blue-600" />,
      sparklineData: getSparklineData('oee'),
      color: '#3b82f6',
      referenceValue: 85
    },
    {
      title: 'Availability',
      value: `${(currentMetrics.availability || 0).toFixed(1)}%`,
      icon: <Activity className="h-4 w-4 text-green-600" />,
      sparklineData: getSparklineData('availability'),
      color: '#10b981',
      referenceValue: 90
    },
    {
      title: 'Performance',
      value: `${(currentMetrics.performance || 0).toFixed(1)}%`,
      icon: <TrendingUp className="h-4 w-4 text-blue-600" />,
      sparklineData: getSparklineData('performance'),
      color: '#3b82f6',
      referenceValue: 95
    },
    {
      title: 'Quality',
      value: `${(currentMetrics.quality || 0).toFixed(1)}%`,
      icon: <BarChart3 className="h-4 w-4 text-purple-600" />,
      sparklineData: getSparklineData('quality'),
      color: '#8b5cf6',
      referenceValue: 99.9
    }
  ];

  return (
    <div className="space-y-4 px-4 sm:px-6 lg:px-8">
      {/* Mobile header */}
      <div className="mb-4">
        <ResponsiveText 
          as="h2" 
          sizeMobile="text-xl" 
          sizeDesktop="text-2xl" 
          className="font-bold text-gray-900"
        >
          Real-Time Monitor
        </ResponsiveText>
        {isMobile && <MobileConnectionStatus {...status} />}
      </div>

      {/* Mobile Toolbar */}
      <MobileToolbar className="mb-4">
        <select
          value={refreshInterval}
          onChange={(e) => onRefreshIntervalChange(parseInt(e.target.value))}
          className="w-full sm:w-auto text-sm border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="0">Paused</option>
          <option value="1000">1s refresh</option>
          <option value="5000">5s refresh</option>
          <option value="30000">30s refresh</option>
        </select>
      </MobileToolbar>

      {/* KPI Cards Grid */}
      <ResponsiveGrid 
        cols={{ mobile: 2, tablet: 4, desktop: 4, wide: 8 }}
        gap="gap-3 sm:gap-4"
      >
        {kpiCards.map((kpi, index) => (
          <MobileKPICard key={index} {...kpi} />
        ))}
      </ResponsiveGrid>

      {/* Charts Section */}
      {isMobile ? (
        <SwipeableChartCarousel>
          {React.Children.toArray(children).filter((child: any) => 
            child?.props?.className?.includes('chart')
          )}
        </SwipeableChartCarousel>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {children}
        </div>
      )}

      {/* Alerts Section */}
      <CollapsibleSection 
        title="Active Alerts" 
        defaultOpen={!isMobile}
        className="mt-6"
      >
        <div className="space-y-2">
          {alertsData.length > 0 ? (
            alertsData.slice(0, isMobile ? 3 : 10).map((alert) => (
              <MobileAlert key={alert.id} alert={alert} />
            ))
          ) : (
            <div className="text-center py-6">
              <Activity className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <ResponsiveText 
                sizeMobile="text-sm" 
                sizeDesktop="text-base" 
                className="text-gray-600"
              >
                All systems normal
              </ResponsiveText>
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
}