'use client';

import React, { useState } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import {
  ChartBarIcon,
  ChartPieIcon,
  TableCellsIcon,
  CircleStackIcon,
  ClockIcon,
  DocumentTextIcon,
  BeakerIcon,
  CubeIcon,
  BellAlertIcon,
  NewspaperIcon,
  ShareIcon,
  MapIcon,
  CalculatorIcon,
  Squares2X2Icon,
  RectangleStackIcon,
  ListBulletIcon,
  ChartBarSquareIcon,
  PresentationChartLineIcon
} from '@heroicons/react/24/outline';

interface PanelLibraryProps {
  onSelect?: (panelType?: string) => void;
  onClose?: () => void;
}

interface PanelType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  tags: string[];
}

const panelTypes: PanelType[] = [
  // Visualizations
  {
    id: 'timeseries',
    name: 'Time Series',
    description: 'Show data points over time as lines, bars, or points',
    icon: ChartBarIcon,
    category: 'Visualizations',
    tags: ['graph', 'line', 'area', 'trending']
  },
  {
    id: 'stat',
    name: 'Stat',
    description: 'Big single value with optional sparkline',
    icon: CalculatorIcon,
    category: 'Visualizations',
    tags: ['singlestat', 'value', 'number']
  },
  {
    id: 'gauge',
    name: 'Gauge',
    description: 'Standard radial or linear gauge',
    icon: CircleStackIcon,
    category: 'Visualizations',
    tags: ['gauge', 'progress', 'threshold']
  },
  {
    id: 'barchart',
    name: 'Bar Chart',
    description: 'Categorical data comparison',
    icon: ChartBarSquareIcon,
    category: 'Visualizations',
    tags: ['bar', 'column', 'comparison']
  },
  {
    id: 'piechart',
    name: 'Pie Chart',
    description: 'Show data distribution',
    icon: ChartPieIcon,
    category: 'Visualizations',
    tags: ['pie', 'donut', 'distribution']
  },
  {
    id: 'table',
    name: 'Table',
    description: 'Display data in table format',
    icon: TableCellsIcon,
    category: 'Visualizations',
    tags: ['table', 'grid', 'tabular']
  },
  {
    id: 'heatmap',
    name: 'Heatmap',
    description: 'Data intensity visualization',
    icon: Squares2X2Icon,
    category: 'Visualizations',
    tags: ['heatmap', 'density', 'matrix']
  },
  {
    id: 'histogram',
    name: 'Histogram',
    description: 'Distribution of values',
    icon: ChartBarIcon,
    category: 'Visualizations',
    tags: ['histogram', 'distribution', 'frequency']
  },
  {
    id: 'state-timeline',
    name: 'State Timeline',
    description: 'State changes over time',
    icon: RectangleStackIcon,
    category: 'Visualizations',
    tags: ['state', 'timeline', 'status']
  },
  {
    id: 'candlestick',
    name: 'Candlestick',
    description: 'Financial/OHLC data visualization',
    icon: ChartBarIcon,
    category: 'Visualizations',
    tags: ['candlestick', 'ohlc', 'financial']
  },

  // Manufacturing Specific
  {
    id: 'oee-panel',
    name: 'OEE Panel',
    description: 'Overall Equipment Effectiveness metrics',
    icon: PresentationChartLineIcon,
    category: 'Manufacturing',
    tags: ['oee', 'manufacturing', 'efficiency']
  },
  {
    id: 'andon-board',
    name: 'Andon Board',
    description: 'Production line status display',
    icon: RectangleStackIcon,
    category: 'Manufacturing',
    tags: ['andon', 'status', 'production']
  },
  {
    id: 'spc-chart',
    name: 'SPC Chart',
    description: 'Statistical Process Control',
    icon: ChartBarIcon,
    category: 'Manufacturing',
    tags: ['spc', 'quality', 'control']
  },
  {
    id: 'pareto-chart',
    name: 'Pareto Chart',
    description: '80/20 analysis visualization',
    icon: ChartBarSquareIcon,
    category: 'Manufacturing',
    tags: ['pareto', 'quality', 'analysis']
  },

  // Other
  {
    id: 'text',
    name: 'Text',
    description: 'Markdown or HTML text panel',
    icon: DocumentTextIcon,
    category: 'Other',
    tags: ['text', 'markdown', 'html', 'documentation']
  },
  {
    id: 'alertlist',
    name: 'Alert List',
    description: 'Display list of alerts',
    icon: BellAlertIcon,
    category: 'Other',
    tags: ['alerts', 'notifications', 'warnings']
  },
  {
    id: 'dashlist',
    name: 'Dashboard List',
    description: 'List of dashboard links',
    icon: ListBulletIcon,
    category: 'Other',
    tags: ['dashboards', 'navigation', 'links']
  },
  {
    id: 'news',
    name: 'News',
    description: 'RSS feed or announcements',
    icon: NewspaperIcon,
    category: 'Other',
    tags: ['news', 'rss', 'feed', 'announcements']
  },
  {
    id: 'logs',
    name: 'Logs',
    description: 'Display and search logs',
    icon: DocumentTextIcon,
    category: 'Other',
    tags: ['logs', 'events', 'messages']
  },
  {
    id: 'nodeGraph',
    name: 'Node Graph',
    description: 'Display node topology',
    icon: ShareIcon,
    category: 'Other',
    tags: ['graph', 'topology', 'network']
  },
  {
    id: 'geomap',
    name: 'Geomap',
    description: 'Data on a world map',
    icon: MapIcon,
    category: 'Other',
    tags: ['map', 'geo', 'location']
  },
  {
    id: 'canvas',
    name: 'Canvas',
    description: 'Custom elements on a canvas',
    icon: CubeIcon,
    category: 'Other',
    tags: ['canvas', 'custom', 'drawing']
  }
];

const categories = ['All', 'Visualizations', 'Manufacturing', 'Other'];

export default function PanelLibrary({ onSelect, onClose }: PanelLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Filter panels based on search and category
  const filteredPanels = panelTypes?.filter(panel => {
    const matchesSearch = !searchQuery ||
      panel?.name.toLowerCase().includes(searchQuery?.toLowerCase()) ||
      panel?.description.toLowerCase().includes(searchQuery?.toLowerCase()) ||
      panel?.tags.some(tag => tag?.toLowerCase().includes(searchQuery?.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || panel?.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Add Panel</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-700 text-gray-400"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e?.target.value)}
              placeholder="Search panels..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category Tabs */}
          <div className="mt-4 flex gap-2">
            {categories?.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`
                  px-4 py-2 rounded text-sm font-medium transition-colors
                  ${selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }
                `}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Panel Grid */}
        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPanels?.map(panel => {
              const Icon = panel?.icon;
              return (
                <button
                  key={panel?.id}
                  onClick={() => onSelect(panel?.id)}
                  className="bg-gray-700 hover:bg-gray-600 rounded-lg p-4 text-left transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-800 rounded group-hover:bg-gray-700">
                      <Icon className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{panel?.name}</h3>
                      <p className="text-sm text-gray-400 mt-1">{panel?.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredPanels.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No panels found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}