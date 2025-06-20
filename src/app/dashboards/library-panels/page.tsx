'use client';

import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { 
  LayoutDashboard, 
  Search, 
  Plus, 
  Grid3X3,
  List,
  Filter,
  ChevronDown,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Gauge,
  Table2,
  FileText,
  Edit2,
  Trash2,
  Copy,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface LibraryPanel {
  id: string;
  uid: string;
  name: string;
  description: string;
  type: string;
  typeDisplay: string;
  icon: React.ElementType;
  folderName?: string;
  tags: string[];
  usedIn: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const mockPanels: LibraryPanel[] = [
  {
    id: '1',
    uid: 'oee-gauge',
    name: 'OEE Gauge',
    description: 'Overall Equipment Effectiveness gauge with target line',
    type: 'gauge',
    typeDisplay: 'Gauge',
    icon: Gauge,
    folderName: 'Manufacturing',
    tags: ['oee', 'manufacturing', 'kpi'],
    usedIn: 12,
    createdBy: 'admin',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '2',
    uid: 'production-trend',
    name: 'Production Trend',
    description: 'Time series chart showing production volume over time',
    type: 'timeseries',
    typeDisplay: 'Time series',
    icon: LineChart,
    folderName: 'Manufacturing',
    tags: ['production', 'trend', 'timeseries'],
    usedIn: 8,
    createdBy: 'admin',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-18')
  },
  {
    id: '3',
    uid: 'quality-distribution',
    name: 'Quality Distribution',
    description: 'Pie chart showing defect categories distribution',
    type: 'piechart',
    typeDisplay: 'Pie chart',
    icon: PieChart,
    folderName: 'Quality',
    tags: ['quality', 'defects', 'distribution'],
    usedIn: 5,
    createdBy: 'quality_manager',
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-01-12')
  },
  {
    id: '4',
    uid: 'equipment-status-table',
    name: 'Equipment Status Table',
    description: 'Table showing real-time equipment status and metrics',
    type: 'table',
    typeDisplay: 'Table',
    icon: Table2,
    folderName: 'Equipment',
    tags: ['equipment', 'status', 'realtime'],
    usedIn: 15,
    createdBy: 'admin',
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-01-22')
  },
  {
    id: '5',
    uid: 'shift-performance',
    name: 'Shift Performance',
    description: 'Bar chart comparing performance across shifts',
    type: 'barchart',
    typeDisplay: 'Bar chart',
    icon: BarChart3,
    tags: ['shift', 'performance', 'comparison'],
    usedIn: 3,
    createdBy: 'supervisor',
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20')
  }
];

const panelTypes = [
  { id: 'all', name: 'All types', icon: Grid3X3 },
  { id: 'timeseries', name: 'Time series', icon: LineChart },
  { id: 'barchart', name: 'Bar chart', icon: BarChart3 },
  { id: 'piechart', name: 'Pie chart', icon: PieChart },
  { id: 'gauge', name: 'Gauge', icon: Gauge },
  { id: 'table', name: 'Table', icon: Table2 },
  { id: 'stat', name: 'Stat', icon: Activity },
  { id: 'text', name: 'Text', icon: FileText }
];

export default function LibraryPanelsPage() {
  const [panels] = useState(mockPanels);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'used' | 'updated'>('updated');

  const filteredPanels = panels
    .filter(panel => {
      const matchesSearch = 
        panel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        panel.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        panel.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesType = selectedType === 'all' || panel.type === selectedType;
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'used':
          return b.usedIn - a.usedIn;
        case 'updated':
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        default:
          return 0;
      }
    });

  return (
    <PageLayout
      title="Library panels"
      description="Reusable panels that can be shared across multiple dashboards"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search library panels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              <Filter className="h-5 w-5 mr-2" />
              Filters
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            
            <div className="flex border border-gray-300 dark:border-gray-600 rounded-md">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'} hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-md transition-colors`}
              >
                <Grid3X3 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'} hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-md transition-colors`}
              >
                <List className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            <Link
              href="/dashboards/library-panels/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create library panel
            </Link>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Panel type</h4>
                <div className="flex flex-wrap gap-2">
                  {panelTypes.map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          selectedType === type.id
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-1.5" />
                        {type.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sort by
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="updated">Recently updated</option>
                  <option value="name">Name</option>
                  <option value="used">Most used</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Library Panels */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPanels.map(panel => {
              const Icon = panel.icon;
              return (
                <div
                  key={panel.id}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <Icon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {panel.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {panel.typeDisplay}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {panel.description}
                  </p>
                  
                  {panel.folderName && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Folder: {panel.folderName}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {panel.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Used in {panel.usedIn} dashboards
                    </span>
                    <div className="flex items-center space-x-1">
                      <button className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Used in
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPanels.map((panel) => {
                  const Icon = panel.icon;
                  return (
                    <tr key={panel.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Icon className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {panel.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {panel.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {panel.typeDisplay}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {panel.usedIn} dashboards
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {panel.updatedAt.toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                            <Copy className="h-4 w-4" />
                          </button>
                          <button className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredPanels.length === 0 && (
          <div className="text-center py-12">
            <LayoutDashboard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No library panels found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery || selectedType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating a new library panel'}
            </p>
            {!searchQuery && selectedType === 'all' && (
              <div className="mt-6">
                <Link
                  href="/dashboards/library-panels/new"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create library panel
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}