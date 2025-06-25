'use client';

import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { 
  Settings, 
  Building, 
  Shield, 
  Clock, 
  Database,
  Save,
  AlertCircle,
  Check,
  Users
} from 'lucide-react';
import { OrganizationDefaults } from '@/types/preferences';

export default function OrganizationSettingsPage() {
  const [defaults, setDefaults] = useState<OrganizationDefaults | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchDefaults();
  }, []);

  const fetchDefaults = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/org/preferences');
      if (!response.ok) {
        throw new Error('Failed to fetch organization defaults');
      }
      const data = await response.json();
      setDefaults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!defaults) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/org/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(defaults),
      });

      if (!response.ok) {
        throw new Error('Failed to save organization defaults');
      }

      setSuccess('Organization defaults saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateDefaults = (field: string, value: any) => {
    if (!defaults) return;
    setDefaults({ ...defaults, [field]: value });
  };

  if (loading) {
    return (
      <PageLayout title="Organization Settings">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    );
  }

  if (!defaults) {
    return (
      <PageLayout title="Organization Settings">
        <div className="text-center py-12">
          <p className="text-gray-500">Unable to load organization settings</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Organization Settings" description="Configure default settings for all users in your organization">
      <div className="max-w-4xl">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-md flex items-center">
            <Check className="h-5 w-5 mr-2" />
            {success}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Building className="h-6 w-6 text-gray-400 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Organization Defaults</h2>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {/* UI Defaults */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <Settings className="h-5 w-5 mr-2 text-gray-400" />
                UI Defaults
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Theme
                  </label>
                  <select
                    value={defaults.defaultTheme}
                    onChange={(e) => updateDefaults('defaultTheme', e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Language
                  </label>
                  <select
                    value={defaults.defaultLanguage}
                    onChange={(e) => updateDefaults('defaultLanguage', e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Timezone
                  </label>
                  <select
                    value={defaults.defaultTimezone}
                    onChange={(e) => updateDefaults('defaultTimezone', e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time Format
                  </label>
                  <select
                    value={defaults.timeFormat}
                    onChange={(e) => updateDefaults('timeFormat', e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="12h">12-hour (AM/PM)</option>
                    <option value="24h">24-hour</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Feature Flags */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-gray-400" />
                Feature Settings
              </h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={defaults.publicDashboardsEnabled}
                    onChange={(e) => updateDefaults('publicDashboardsEnabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Enable public dashboards
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={defaults.snapshotsEnabled}
                    onChange={(e) => updateDefaults('snapshotsEnabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Enable dashboard snapshots
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={defaults.alertingEnabled}
                    onChange={(e) => updateDefaults('alertingEnabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Enable alerting system
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={defaults.exploreEnabled}
                    onChange={(e) => updateDefaults('exploreEnabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Enable explore functionality
                  </span>
                </label>
              </div>
            </div>

            {/* Security Settings */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-gray-400" />
                Security Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Minimum Password Length
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="32"
                    value={defaults.passwordMinLength}
                    onChange={(e) => updateDefaults('passwordMinLength', parseInt(e.target.value))}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Session Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    min="300"
                    max="604800"
                    value={defaults.sessionTimeout}
                    onChange={(e) => updateDefaults('sessionTimeout', parseInt(e.target.value))}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={defaults.enforcePasswordPolicy}
                    onChange={(e) => updateDefaults('enforcePasswordPolicy', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Enforce password policy
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={defaults.requirePasswordChange}
                    onChange={(e) => updateDefaults('requirePasswordChange', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Require password change on first login
                  </span>
                </label>
              </div>
            </div>

            {/* Resource Limits */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-gray-400" />
                Resource Limits
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Dashboards per User
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={defaults.maxDashboardsPerUser || ''}
                    onChange={(e) => updateDefaults('maxDashboardsPerUser', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="No limit"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Queries per Minute
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={defaults.maxQueriesPerMinute || ''}
                    onChange={(e) => updateDefaults('maxQueriesPerMinute', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="No limit"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Alerts per User
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={defaults.maxAlertsPerUser || ''}
                    onChange={(e) => updateDefaults('maxAlertsPerUser', e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="No limit"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Data Retention */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <Database className="h-5 w-5 mr-2 text-gray-400" />
                Data Retention
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Dashboard Version Retention
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={defaults.dashboardVersionRetention}
                    onChange={(e) => updateDefaults('dashboardVersionRetention', parseInt(e.target.value))}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  />
                  <p className="mt-1 text-sm text-gray-500">Number of versions to keep</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Query History Retention
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={defaults.queryHistoryRetention}
                    onChange={(e) => updateDefaults('queryHistoryRetention', parseInt(e.target.value))}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  />
                  <p className="mt-1 text-sm text-gray-500">Days to keep query history</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}