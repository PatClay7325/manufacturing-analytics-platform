'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import PageLayout from '@/components/layout/PageLayout';
import { 
  ArrowLeft,
  Edit2,
  Trash2,
  Copy,
  Share2,
  Download,
  Upload,
  History,
  Eye,
  ExternalLink,
  Clock,
  Users,
  Tag,
  Folder,
  Activity,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  BarChart3,
  LineChart,
  PieChart,
  Gauge,
  Table2,
  FileText,
  Grid3X3
} from 'lucide-react';
import type { 
  LibraryPanel,
  LibraryPanelWithConnections,
  LibraryPanelVersion,
  LibraryPanelUsage 
} from '@/types/dashboard';

// Panel type configurations
const panelTypes = [
  { id: 'timeseries', name: 'Time series', icon: LineChart },
  { id: 'barchart', name: 'Bar chart', icon: BarChart3 },
  { id: 'piechart', name: 'Pie chart', icon: PieChart },
  { id: 'gauge', name: 'Gauge', icon: Gauge },
  { id: 'table', name: 'Table', icon: Table2 },
  { id: 'stat', name: 'Stat', icon: Activity },
  { id: 'text', name: 'Text', icon: FileText }
];

// Notification component
interface NotificationProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ type, message, onClose }) => {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  };
  
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  
  const Icon = icons[type];
  
  return (
    <div className={`fixed top-4 right-4 p-4 rounded-lg border z-50 ${colors[type]} shadow-lg`}>
      <div className="flex items-center">
        <Icon className="h-5 w-5 mr-2" />
        <span className="mr-4">{message}</span>
        <button onClick={onClose} className="hover:opacity-70">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Version History Component
interface VersionHistoryProps {
  versions: LibraryPanelVersion[];
  currentVersion: number;
  onRestoreVersion: (version: LibraryPanelVersion) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ 
  versions, 
  currentVersion, 
  onRestoreVersion 
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Version History</h3>
      <div className="space-y-3">
        {versions.map((version) => (
          <div
            key={version.id}
            className={`p-4 border rounded-lg ${
              version.version === currentVersion
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`px-2 py-1 rounded text-sm font-medium ${
                  version.version === currentVersion
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  v{version.version}
                  {version.version === currentVersion && (
                    <span className="ml-1 text-xs">(Current)</span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {version.message || `Version ${version.version}`}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Created by {version.creator.name} on {new Date(version.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {/* TODO: View version details */}}
                  className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  title="View version"
                >
                  <Eye className="h-4 w-4" />
                </button>
                {version.version !== currentVersion && (
                  <button
                    onClick={() => onRestoreVersion(version)}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Restore
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Connections Component
interface ConnectionsProps {
  connections: LibraryPanelUsage[];
  onRemoveConnection: (connection: LibraryPanelUsage) => void;
}

const Connections: React.FC<ConnectionsProps> = ({ connections, onRemoveConnection }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        Connected Dashboards ({connections.length})
      </h3>
      {connections.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Grid3X3 className="mx-auto h-12 w-12 mb-2" />
          <p>This panel is not used in any dashboards yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <Link
                    href={`/d/${connection.dashboardUid}`}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {connection.dashboardTitle}
                  </Link>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Panel ID: {connection.panelId} • Added {new Date(connection.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link
                    href={`/d/${connection.dashboardUid}`}
                    className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    title="View dashboard"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => onRemoveConnection(connection)}
                    className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Remove connection"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function LibraryPanelDetailPage() {
  const params = useParams();
  const uid = params?.uid as string;
  
  const [panel, setPanel] = useState<LibraryPanelWithConnections | null>(null);
  const [versions, setVersions] = useState<LibraryPanelVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'versions' | 'connections'>('overview');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Fetch panel details
  useEffect(() => {
    if (!uid) return;
    
    const fetchPanel = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/library-panels/${uid}`);
        if (!response.ok) {
          throw new Error('Failed to fetch library panel');
        }

        const data = await response.json();
        setPanel(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch panel');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPanel();
  }, [uid]);

  // Fetch versions
  useEffect(() => {
    if (!uid) return;
    
    const fetchVersions = async () => {
      try {
        const response = await fetch(`/api/library-panels/${uid}/versions`);
        if (response.ok) {
          const data = await response.json();
          setVersions(data);
        }
      } catch (error) {
        console.error('Failed to fetch versions:', error);
      }
    };

    fetchVersions();
  }, [uid]);

  // Handle delete panel
  const handleDeletePanel = async () => {
    if (!panel || !confirm(`Are you sure you want to delete "${panel.name}"?`)) return;

    try {
      const response = await fetch(`/api/library-panels/${panel.uid}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete panel');
      }

      setNotification({ type: 'success', message: 'Library panel deleted successfully' });
      // Redirect to library panels page
      window.location.href = '/dashboards/library-panels';
    } catch (error) {
      setNotification({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to delete panel' 
      });
    }
  };

  // Handle copy panel
  const handleCopyPanel = async () => {
    if (!panel) return;

    try {
      const data = {
        name: `${panel.name} (Copy)`,
        type: panel.type,
        description: panel.description,
        model: panel.model,
        tags: panel.tags,
        category: panel.category,
        folderId: panel.folderId,
      };

      const response = await fetch('/api/library-panels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to copy panel');

      setNotification({ type: 'success', message: 'Library panel copied successfully' });
    } catch (error) {
      setNotification({ 
        type: 'error', 
        message: 'Failed to copy panel' 
      });
    }
  };

  // Handle restore version
  const handleRestoreVersion = async (version: LibraryPanelVersion) => {
    if (!panel || !confirm(`Restore to version ${version.version}?`)) return;

    try {
      const response = await fetch(`/api/library-panels/${panel.uid}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: version.model,
          message: `Restored to version ${version.version}`,
        }),
      });

      if (!response.ok) throw new Error('Failed to restore version');

      setNotification({ type: 'success', message: `Restored to version ${version.version}` });
      // Refresh panel data
      window.location.reload();
    } catch (error) {
      setNotification({ 
        type: 'error', 
        message: 'Failed to restore version' 
      });
    }
  };

  // Handle remove connection
  const handleRemoveConnection = async (connection: LibraryPanelUsage) => {
    if (!confirm(`Remove connection to "${connection.dashboardTitle}"?`)) return;

    try {
      const response = await fetch(
        `/api/library-panels/${uid}/connections?dashboardUid=${connection.dashboardUid}&panelId=${connection.panelId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to remove connection');

      setNotification({ type: 'success', message: 'Connection removed successfully' });
      
      // Update panel data
      if (panel) {
        setPanel({
          ...panel,
          connections: panel.connections.filter(c => c.id !== connection.id),
          connectedDashboards: panel.connectedDashboards - 1,
        });
      }
    } catch (error) {
      setNotification({ 
        type: 'error', 
        message: 'Failed to remove connection' 
      });
    }
  };

  // Get panel type icon
  const getPanelIcon = (type: string) => {
    const panelType = panelTypes.find(pt => pt.id === type);
    return panelType ? panelType.icon : FileText;
  };

  if (isLoading) {
    return (
      <PageLayout title="Loading..." description="">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    );
  }

  if (error || !panel) {
    return (
      <PageLayout title="Error" description="">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Library panel not found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {error || 'The requested library panel could not be found.'}
          </p>
          <div className="mt-6">
            <Link
              href="/dashboards/library-panels"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Library Panels
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  const Icon = getPanelIcon(panel.type);
  const panelType = panelTypes.find(pt => pt.id === panel.type);

  return (
    <PageLayout title={panel.name} description={panel.description || ''}>
      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboards/library-panels"
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Icon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {panel.name}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {panelType?.name || panel.type} • Version {panel.version}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Link
              href={`/dashboards/library-panels/${panel.uid}/edit`}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Link>
            <button
              onClick={handleCopyPanel}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </button>
            <button
              onClick={handleDeletePanel}
              className="inline-flex items-center px-3 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: Info },
              { id: 'versions', name: 'Versions', icon: History, count: versions.length },
              { id: 'connections', name: 'Connections', icon: ExternalLink, count: panel.connections.length },
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <TabIcon className="h-4 w-4 mr-2" />
                  {tab.name}
                  {tab.count !== undefined && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Panel Information
                  </h3>
                  
                  {panel.description && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {panel.description}
                      </p>
                    </div>
                  )}

                  {panel.tags.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tags
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {panel.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {panel.category && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Category
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {panel.category}
                      </p>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Usage Statistics
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {panel.connectedDashboards}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Connected Dashboards
                        </div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {panel.usageCount}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Total Usage Count
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Panel Preview */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Panel Preview
                  </h3>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center bg-gray-50 dark:bg-gray-700">
                    <Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Panel preview would be rendered here
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      Type: {panelType?.name || panel.type}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Metadata
                  </h3>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Created by:</span>
                      <span className="text-gray-900 dark:text-white">{panel.meta.createdBy.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Created:</span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(panel.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Last updated:</span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(panel.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {panel.meta.updatedBy && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Updated by:</span>
                        <span className="text-gray-900 dark:text-white">{panel.meta.updatedBy.name}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Version:</span>
                      <span className="text-gray-900 dark:text-white">v{panel.version}</span>
                    </div>
                    {panel.lastUsedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Last used:</span>
                        <span className="text-gray-900 dark:text-white">
                          {new Date(panel.lastUsedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {panel.meta.folderName && (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Organization
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Folder className="h-4 w-4 mr-2" />
                      {panel.meta.folderName}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'versions' && (
            <VersionHistory
              versions={versions}
              currentVersion={panel.version}
              onRestoreVersion={handleRestoreVersion}
            />
          )}

          {activeTab === 'connections' && (
            <Connections
              connections={panel.connections}
              onRemoveConnection={handleRemoveConnection}
            />
          )}
        </div>
      </div>
    </PageLayout>
  );
}