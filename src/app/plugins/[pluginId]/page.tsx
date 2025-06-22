'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import {
  ArrowLeft,
  Download,
  Star,
  Clock,
  Users,
  Shield,
  AlertCircle,
  CheckCircle,
  GitBranch,
  ExternalLink,
  Heart,
  MessageSquare,
  Code,
  FileText,
  Image as ImageIcon,
  Calendar,
  Package,
  Settings,
  Trash2,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import Image from 'next/image';

interface PluginDetails {
  id: string;
  pluginId: string;
  name: string;
  description: string;
  longDescription?: string;
  type: string;
  category: string;
  version: string;
  author: string;
  authorUrl?: string;
  authorEmail?: string;
  downloads: number;
  stars: number;
  rating: number;
  ratingCount: number;
  signature: string;
  signedBy?: string;
  logoUrl?: string;
  screenshots?: Array<{ path: string; name: string }>;
  repository?: string;
  homepage?: string;
  documentationUrl?: string;
  features?: string[];
  keywords?: string[];
  dependencies?: Record<string, any>;
  minGrafanaVersion?: string;
  versions: Array<{
    version: string;
    releasedAt: string;
    releaseNotes?: string;
    breaking?: boolean;
  }>;
  ratings: Array<{
    user: { name: string; id: string };
    rating: number;
    review?: string;
    createdAt: string;
    helpful: number;
  }>;
  installed?: boolean;
  enabled?: boolean;
  configuration?: any;
}

export default function PluginDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const pluginId = params.pluginId as string;
  
  const [plugin, setPlugin] = useState<PluginDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'versions' | 'reviews'>('overview');
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [userRating, setUserRating] = useState(0);
  const [userReview, setUserReview] = useState('');

  useEffect(() => {
    fetchPluginDetails();
  }, [pluginId]);

  const fetchPluginDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/plugins/${pluginId}`);
      const data = await response.json();
      setPlugin(data);
      setSelectedVersion(data.latestVersion);
    } catch (error) {
      console.error('Failed to fetch plugin details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const response = await fetch('/api/plugins/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pluginId, 
          version: selectedVersion,
          userId: 'user-123' 
        }),
      });

      if (response.ok) {
        await fetchPluginDetails();
      } else {
        const error = await response.json();
        alert(`Failed to install plugin: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to install plugin:', error);
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async () => {
    if (!confirm('Are you sure you want to uninstall this plugin?')) {
      return;
    }

    try {
      const response = await fetch(`/api/plugins/${pluginId}/uninstall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-123' }),
      });

      if (response.ok) {
        await fetchPluginDetails();
      }
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    try {
      const response = await fetch(`/api/plugins/${pluginId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, userId: 'user-123' }),
      });

      if (response.ok) {
        await fetchPluginDetails();
      }
    } catch (error) {
      console.error('Failed to toggle plugin:', error);
    }
  };

  const handleRate = async () => {
    if (userRating === 0) return;

    try {
      const response = await fetch(`/api/plugins/${pluginId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          rating: userRating,
          review: userReview,
          userId: 'user-123' 
        }),
      });

      if (response.ok) {
        await fetchPluginDetails();
        setUserRating(0);
        setUserReview('');
      }
    } catch (error) {
      console.error('Failed to rate plugin:', error);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Loading...">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </PageLayout>
    );
  }

  if (!plugin) {
    return (
      <PageLayout title="Plugin Not Found">
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Plugin not found
          </h3>
          <button
            onClick={() => router.push('/plugins')}
            className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            Back to plugins
          </button>
        </div>
      </PageLayout>
    );
  }

  const renderStars = (rating: number, interactive = false) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => interactive && setUserRating(star)}
            disabled={!interactive}
            className={interactive ? 'cursor-pointer' : 'cursor-default'}
          >
            <Star
              className={`h-5 w-5 ${
                star <= (interactive ? userRating : rating)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const getSignatureIcon = () => {
    switch (plugin.signature) {
      case 'core':
        return <Shield className="h-5 w-5 text-blue-500" />;
      case 'commercial':
        return <Shield className="h-5 w-5 text-green-500" />;
      case 'community':
        return <Users className="h-5 w-5 text-purple-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <PageLayout title={plugin.name}>
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => router.push('/plugins')}
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to plugins
        </button>

        {/* Plugin Header */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                {plugin.logoUrl ? (
                  <Image
                    src={plugin.logoUrl}
                    alt={plugin.name}
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                ) : (
                  <Package className="h-8 w-8 text-gray-400" />
                )}
              </div>
              
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {plugin.name}
                  </h1>
                  {getSignatureIcon()}
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                    {plugin.type}
                  </span>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {plugin.description}
                </p>
                
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>by {plugin.author}</span>
                  <span>v{plugin.version}</span>
                  <span className="flex items-center">
                    <Download className="h-4 w-4 mr-1" />
                    {plugin.downloads.toLocaleString()} downloads
                  </span>
                  <span className="flex items-center">
                    {renderStars(plugin.rating)}
                    <span className="ml-1">({plugin.ratingCount})</span>
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {plugin.installed ? (
                <>
                  <button
                    onClick={() => handleToggle(!plugin.enabled)}
                    className={`inline-flex items-center px-4 py-2 rounded-md ${
                      plugin.enabled
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {plugin.enabled ? (
                      <>
                        <Pause className="h-5 w-5 mr-2" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5 mr-2" />
                        Enable
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => router.push(`/plugins/${pluginId}/config`)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md"
                  >
                    <Settings className="h-5 w-5 mr-2" />
                    Configure
                  </button>
                  
                  <button
                    onClick={handleUninstall}
                    className="inline-flex items-center px-4 py-2 border border-red-300 dark:border-red-600 text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                  >
                    <Trash2 className="h-5 w-5 mr-2" />
                    Uninstall
                  </button>
                </>
              ) : (
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  {installing ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Installing...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5 mr-2" />
                      Install
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-4">
          {plugin.homepage && (
            <a
              href={plugin.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Homepage
            </a>
          )}
          {plugin.repository && (
            <a
              href={plugin.repository}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              <GitBranch className="h-4 w-4 mr-1" />
              Repository
            </a>
          )}
          {plugin.documentationUrl && (
            <a
              href={plugin.documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              <FileText className="h-4 w-4 mr-1" />
              Documentation
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('versions')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'versions'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Versions ({plugin.versions.length})
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'reviews'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Reviews ({plugin.ratings.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Long Description */}
                {plugin.longDescription && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Description
                    </h3>
                    <div className="prose dark:prose-invert max-w-none">
                      {plugin.longDescription}
                    </div>
                  </div>
                )}

                {/* Features */}
                {plugin.features && plugin.features.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Features
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                      {plugin.features.map((feature, index) => (
                        <li key={index} className="text-gray-600 dark:text-gray-400">
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Screenshots */}
                {plugin.screenshots && plugin.screenshots.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Screenshots
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {plugin.screenshots.map((screenshot, index) => (
                        <div key={index} className="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                          <Image
                            src={screenshot.path}
                            alt={screenshot.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dependencies */}
                {plugin.dependencies && Object.keys(plugin.dependencies).length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Dependencies
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(plugin.dependencies).map(([dep, version]) => (
                        <div key={dep} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
                          <span className="font-mono text-sm">{dep}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{version}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'versions' && (
              <div className="space-y-4">
                {plugin.versions.map((version) => (
                  <div key={version.version} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          v{version.version}
                        </h4>
                        {version.breaking && (
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                            Breaking changes
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(version.releasedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {version.releaseNotes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {version.releaseNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-6">
                {/* Add Review */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Write a Review
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Rating
                      </label>
                      {renderStars(userRating, true)}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Review (optional)
                      </label>
                      <textarea
                        value={userReview}
                        onChange={(e) => setUserReview(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Share your experience with this plugin..."
                      />
                    </div>
                    <button
                      onClick={handleRate}
                      disabled={userRating === 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Submit Review
                    </button>
                  </div>
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                  {plugin.ratings.map((rating) => (
                    <div key={rating.user.id} className="border-b border-gray-200 dark:border-gray-700 pb-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {rating.user.name}
                            </span>
                            {renderStars(rating.rating)}
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(rating.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                          <Heart className="h-4 w-4 inline mr-1" />
                          Helpful ({rating.helpful})
                        </button>
                      </div>
                      {rating.review && (
                        <p className="text-gray-600 dark:text-gray-400">
                          {rating.review}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}