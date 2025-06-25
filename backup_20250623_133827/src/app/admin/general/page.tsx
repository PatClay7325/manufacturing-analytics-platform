'use client';

import React from 'react';

import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { 
  Settings, 
  Globe, 
  Clock, 
  Home,
  Shield,
  Bell,
  Save,
  RotateCcw
} from 'lucide-react';

interface GeneralSettings {
  orgName: string;
  instanceName: string;
  homePageUrl: string;
  defaultTheme: 'light' | 'dark' | 'system';
  weekStart: string;
  defaultTimezone: string;
  autoRefresh: string[];
  disableLoginForm: boolean;
  disableSignups: boolean;
  allowOrgCreate: boolean;
  verifyEmail: boolean;
  defaultLanguage: string;
}

const defaultSettings: GeneralSettings = {
  orgName: 'Manufacturing Analytics Inc',
  instanceName: 'Manufacturing AnalyticsPlatform',
  homePageUrl: '/dashboard',
  defaultTheme: 'light',
  weekStart: 'monday',
  defaultTimezone: 'browser',
  autoRefresh: ['5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h', '2h', '1d'],
  disableLoginForm: false,
  disableSignups: false,
  allowOrgCreate: false,
  verifyEmail: true,
  defaultLanguage: 'en-US'
};

export default function AdminGeneralPage() {
  const [settings, setSettings] = useState<GeneralSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof GeneralSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real app, this would save to the API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHasChanges(false);
      alert('Settings saved successfully');
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    setHasChanges(false);
  };

  return (
    <PageLayout
      title="General settings"
      description="Configure general system settings"
    >
      <div className="max-w-4xl space-y-6">
        {/* Organization Settings */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Organization
              </h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Organization name
              </label>
              <input
                type="text"
                value={settings.orgName}
                onChange={(e) => handleChange('orgName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Default organization name for new users
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Instance name
              </label>
              <input
                type="text"
                value={settings.instanceName}
                onChange={(e) => handleChange('instanceName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Name of this Analytics instance, used in notifications
              </p>
            </div>
          </div>
        </div>

        {/* UI Settings */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                User interface
              </h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Home page URL
              </label>
              <input
                type="text"
                value={settings.homePageUrl}
                onChange={(e) => handleChange('homePageUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Path to redirect to after login
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default theme
              </label>
              <select
                value={settings.defaultTheme}
                onChange={(e) => handleChange('defaultTheme', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System preference</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default language
              </label>
              <select
                value={settings.defaultLanguage}
                onChange={(e) => handleChange('defaultLanguage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="en-US">English (US)</option>
                <option value="es-ES">Spanish</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
                <option value="ja-JP">Japanese</option>
                <option value="zh-CN">Chinese (Simplified)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Date & Time Settings */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Date & time
              </h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Week start
              </label>
              <select
                value={settings.weekStart}
                onChange={(e) => handleChange('weekStart', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="sunday">Sunday</option>
                <option value="monday">Monday</option>
                <option value="saturday">Saturday</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default timezone
              </label>
              <select
                value={settings.defaultTimezone}
                onChange={(e) => handleChange('defaultTimezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="browser">Browser timezone</option>
                <option value="utc">UTC</option>
                <option value="America/New_York">America/New York</option>
                <option value="America/Chicago">America/Chicago</option>
                <option value="America/Los_Angeles">America/Los Angeles</option>
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="Asia/Tokyo">Asia/Tokyo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Authentication Settings */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Authentication
              </h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.disableLoginForm}
                onChange={(e) => handleChange('disableLoginForm', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Disable login form
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Hide the login form and only allow OAuth login
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.disableSignups}
                onChange={(e) => handleChange('disableSignups', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Disable user sign-ups
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Prevent users from creating new accounts
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.allowOrgCreate}
                onChange={(e) => handleChange('allowOrgCreate', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Allow users to create organizations
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Users can create their own organizations
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={settings.verifyEmail}
                onChange={(e) => handleChange('verifyEmail', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Verify email address
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Require email verification for new accounts
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
