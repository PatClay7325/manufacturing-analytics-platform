'use client';

import React from 'react';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { TimeSeriesPanel } from '@/components/panels/TimeSeriesPanel';
import { StatPanel } from '@/components/panels/StatPanel';
import { GaugePanel } from '@/components/dashboard/panels/GaugePanel';
import { TablePanel } from '@/components/dashboard/panels/TablePanel';
import { BarChartPanel } from '@/components/dashboard/panels/BarChartPanel';
import { PieChartPanel } from '@/components/dashboard/panels/PieChartPanel';
import { TextPanel } from '@/components/dashboard/panels/TextPanel';
import { HeatmapPanel } from '@/components/dashboard/panels/HeatmapPanel';

interface PanelData {
  id: string;
  type: string;
  title: string;
  data: any;
  options: any;
}

// Panel type mapping
const panelComponents: Record<string, React.ComponentType<any>> = {
  'timeseries': TimeSeriesPanel,
  'graph': TimeSeriesPanel, // Legacy graph panel
  'stat': StatPanel,
  'gauge': GaugePanel,
  'table': TablePanel,
  'bar-chart': BarChartPanel,
  'pie-chart': PieChartPanel,
  'text': TextPanel,
  'heatmap': HeatmapPanel,
};

export default function SoloPanelPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const uid = params.uid as string;
  const slug = params.slug as string[];
  const panelId = searchParams.get('panelId') || slug?.[0];
  const theme = searchParams.get('theme') || 'light';
  const refresh = searchParams.get('refresh');
  const from = searchParams.get('from') || 'now-6h';
  const to = searchParams.get('to') || 'now';
  
  const [panel, setPanel] = useState<PanelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPanelData();
  }, [uid, panelId]);

  const fetchPanelData = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from the API
      // For now, we'll use mock data
      const mockPanel: PanelData = {
        id: panelId || '1',
        type: 'timeseries',
        title: 'Manufacturing Metrics',
        data: generateMockData(),
        options: {
          legend: { show: true },
          tooltip: { mode: 'single' },
          lineWidth: 2
        }
      };
      
      setPanel(mockPanel);
    } catch (err) {
      setError('Failed to load panel');
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = () => {
    const now = Date.now();
    const data = [];
    for (let i = 0; i < 100; i++) {
      data.push({
        time: new Date(now - (100 - i) * 60 * 1000),
        value: Math.sin(i / 10) * 50 + 50 + Math.random() * 10
      });
    }
    return data;
  };

  useEffect(() => {
    // Apply theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    // Set up auto-refresh if specified
    if (refresh) {
      const interval = parseRefreshInterval(refresh);
      if (interval > 0) {
        const timer = setInterval(() => {
          fetchPanelData();
        }, interval);
        return () => clearInterval(timer);
      }
    }
  }, [refresh]);

  const parseRefreshInterval = (refresh: string): number => {
    const match = refresh.match(/(\d+)([smh])/);
    if (!match) return 0;
    
    const [, value, unit] = match;
    const num = parseInt(value);
    
    switch (unit) {
      case 's': return num * 1000;
      case 'm': return num * 60 * 1000;
      case 'h': return num * 60 * 60 * 1000;
      default: return 0;
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !panel) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">
            {error || 'Panel not found'}
          </p>
        </div>
      </div>
    );
  }

  const PanelComponent = panelComponents[panel.type] || TextPanel;

  return (
    <div className="h-screen w-screen p-4 bg-gray-50 dark:bg-gray-900">
      <div className="h-full w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {/* Panel Header */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {panel.title}
          </h2>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {from} to {to}
          </div>
        </div>
        
        {/* Panel Content */}
        <div className="h-[calc(100%-60px)] p-4">
          <PanelComponent
            data={panel.data}
            options={panel.options}
            width="100%"
            height="100%"
          />
        </div>
      </div>
    </div>
  );
}

