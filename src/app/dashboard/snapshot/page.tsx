/**
 * Dashboard Snapshot Page - Create and manage dashboard snapshots
 * /dashboard/snapshot route
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Share2, Clock, Shield, Globe, Link2, Copy, Check } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { cn } from '@/lib/utils';

export default function DashboardSnapshotPage() {
  const router = useRouter();
  const [snapshotName, setSnapshotName] = useState('');
  const [expiresIn, setExpiresIn] = useState('never');
  const [shareExternally, setShareExternally] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdSnapshot, setCreatedSnapshot] = useState<{
    key: string;
    url: string;
    deleteUrl: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCreateSnapshot = async () => {
    setIsCreating(true);
    try {
      // Get current dashboard ID from URL or context
      const dashboardId = new URLSearchParams(window.location.search).get('dashboard');
      
      const response = await fetch('/api/dashboards/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dashboardId,
          name: snapshotName || 'Dashboard Snapshot',
          expires: expiresIn === 'never' ? 0 : parseInt(expiresIn),
          external: shareExternally,
        }),
      });

      if (response.ok) {
        const snapshot = await response.json();
        setCreatedSnapshot({
          key: snapshot.key,
          url: `${window.location.origin}/dashboard/snapshot/${snapshot.key}`,
          deleteUrl: snapshot.deleteUrl,
        });
      }
    } catch (error) {
      console.error('Failed to create snapshot:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <PageLayout
      title="Share Dashboard Snapshot"
      description="Create a snapshot to share your dashboard"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {!createdSnapshot ? (
          <>
            {/* Snapshot settings */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Snapshot name
                </label>
                <input
                  type="text"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  placeholder="My Dashboard Snapshot"
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Expire after
                </label>
                <select
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="never">Never</option>
                  <option value="3600">1 hour</option>
                  <option value="86400">1 day</option>
                  <option value="604800">7 days</option>
                  <option value="2592000">30 days</option>
                  <option value="31536000">1 year</option>
                </select>
              </div>

              <div className="border rounded-lg p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={shareExternally}
                    onChange={(e) => setShareExternally(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Publish to snapshot.raintank.io
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Share externally. Anyone with the link can view. 
                      Free snapshots are retained for 30 days.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Info boxes */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Snapshots are read-only
                  </p>
                  <p className="text-blue-800 dark:text-blue-200 mt-1">
                    Dashboard snapshots are static and cannot be edited. 
                    They capture the current state of your dashboard including panel data.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">
                    Time range preserved
                  </p>
                  <p className="text-yellow-800 dark:text-yellow-200 mt-1">
                    The snapshot will use the current time range and variables. 
                    Data is embedded in the snapshot.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCreateSnapshot}
                disabled={isCreating}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                <Camera className="h-4 w-4" />
                {isCreating ? 'Creating snapshot...' : 'Create snapshot'}
              </button>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 border rounded-md hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Success state */}
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full mb-4">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Snapshot created!</h2>
              <p className="text-muted-foreground">
                Your dashboard snapshot has been created successfully.
              </p>
            </div>

            {/* Share links */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Snapshot URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={createdSnapshot.url}
                    readOnly
                    className="flex-1 px-3 py-2 border rounded-md bg-muted"
                  />
                  <button
                    onClick={() => copyToClipboard(createdSnapshot.url, 'url')}
                    className="px-3 py-2 border rounded-md hover:bg-accent"
                  >
                    {copiedField === 'url' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Delete URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={createdSnapshot.deleteUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border rounded-md bg-muted"
                  />
                  <button
                    onClick={() => copyToClipboard(createdSnapshot.deleteUrl, 'delete')}
                    className="px-3 py-2 border rounded-md hover:bg-accent"
                  >
                    {copiedField === 'delete' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Save this URL to delete the snapshot later
                </p>
              </div>
            </div>

            {/* Share options */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Share options</h3>
              <div className="space-y-2">
                <button
                  onClick={() => window.open(createdSnapshot.url, '_blank')}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-accent rounded-md"
                >
                  <Share2 className="h-4 w-4" />
                  Open snapshot
                </button>
                <button
                  onClick={() => {
                    const embedCode = `<iframe src="${createdSnapshot.url}" width="100%" height="600" frameborder="0"></iframe>`;
                    copyToClipboard(embedCode, 'embed');
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-accent rounded-md"
                >
                  <Link2 className="h-4 w-4" />
                  {copiedField === 'embed' ? 'Embed code copied!' : 'Copy embed code'}
                </button>
              </div>
            </div>

            {/* Done button */}
            <div className="flex justify-center">
              <button
                onClick={() => router.back()}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}