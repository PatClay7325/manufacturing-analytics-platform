'use client';

import React, { useState } from 'react';
import { usePreferences } from '@/contexts/PreferencesContext';
import PreferencesSearch from './PreferencesSearch';
import { 
  Settings, 
  Palette, 
  Globe, 
  Bell, 
  Eye, 
  Shield, 
  Database,
  Laptop,
  RefreshCw,
  Save,
  RotateCcw,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  THEME_OPTIONS,
  LANGUAGE_OPTIONS,
  DATE_FORMAT_OPTIONS,
  TIME_RANGE_OPTIONS,
  AUTO_REFRESH_OPTIONS,
  FONT_SIZE_OPTIONS,
} from '@/types/preferences';

interface TabProps {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabProps[] = [
  { id: 'ui', label: 'User Interface', icon: <Palette className="h-4 w-4" /> },
  { id: 'localization', label: 'Localization', icon: <Globe className="h-4 w-4" /> },
  { id: 'dashboard', label: 'Dashboard', icon: <Laptop className="h-4 w-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { id: 'accessibility', label: 'Accessibility', icon: <Eye className="h-4 w-4" /> },
  { id: 'privacy', label: 'Privacy & Security', icon: <Shield className="h-4 w-4" /> },
  { id: 'data', label: 'Data Display', icon: <Database className="h-4 w-4" /> },
];

export default function UserPreferencesManager() {
  const { preferences, updatePreferences, resetPreferences, loading, error } = usePreferences();
  const [activeTab, setActiveTab] = useState('ui');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Unable to load preferences</p>
      </div>
    );
  }

  const handleChange = async (category: string, field: string, value: any) => {
    setSuccess(null);
    await updatePreferences({
      [category]: { [field]: value }
    });
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all preferences to defaults?')) {
      return;
    }
    
    setSaving(true);
    try {
      await resetPreferences();
      setSuccess('Preferences reset to defaults');
    } catch (err) {
      console.error('Error resetting preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSearchResult = (category: string, item: any) => {
    setActiveTab(category);
    setSuccess(`Navigated to ${item.label} setting`);
    setTimeout(() => setSuccess(null), 2000);
  };

  const renderUISettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Appearance</h3>
        
        {/* Theme Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Theme
          </label>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleChange('ui', 'theme', option.value)}
                className={`px-4 py-3 rounded-lg border transition-all ${
                  preferences.ui.theme === option.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <span className="text-2xl mb-1">{option.icon}</span>
                <div className="text-sm font-medium">{option.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Font Size
          </label>
          <select
            value={preferences.accessibility.fontSize}
            onChange={(e) => handleChange('accessibility', 'fontSize', e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {FONT_SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Settings */}
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.navigation.sidebarCollapsed}
              onChange={(e) => handleChange('navigation', 'sidebarCollapsed', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Collapse sidebar by default
            </span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.navigation.navbarFixed}
              onChange={(e) => handleChange('navigation', 'navbarFixed', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Fixed navigation bar
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderLocalizationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Regional Settings</h3>
        
        {/* Language */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Language
          </label>
          <select
            value={preferences.ui.language}
            onChange={(e) => handleChange('ui', 'language', e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Timezone */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Timezone
          </label>
          <select
            value={preferences.ui.timezone}
            onChange={(e) => handleChange('ui', 'timezone', e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="browser">Browser timezone</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Asia/Tokyo">Tokyo</option>
            <option value="Asia/Shanghai">Shanghai</option>
            <option value="Australia/Sydney">Sydney</option>
          </select>
        </div>

        {/* Date Format */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Date Format
          </label>
          <select
            value={preferences.ui.dateFormat}
            onChange={(e) => handleChange('ui', 'dateFormat', e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {DATE_FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.example})
              </option>
            ))}
          </select>
        </div>

        {/* Time Format */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Time Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleChange('ui', 'timeFormat', '12h')}
              className={`px-4 py-2 rounded-lg border transition-all ${
                preferences.ui.timeFormat === '12h'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              12-hour (AM/PM)
            </button>
            <button
              onClick={() => handleChange('ui', 'timeFormat', '24h')}
              className={`px-4 py-2 rounded-lg border transition-all ${
                preferences.ui.timeFormat === '24h'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              24-hour
            </button>
          </div>
        </div>

        {/* Week Start */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Week Starts On
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleChange('ui', 'weekStart', 'sunday')}
              className={`px-4 py-2 rounded-lg border transition-all ${
                preferences.ui.weekStart === 'sunday'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              Sunday
            </button>
            <button
              onClick={() => handleChange('ui', 'weekStart', 'monday')}
              className={`px-4 py-2 rounded-lg border transition-all ${
                preferences.ui.weekStart === 'monday'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              Monday
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDashboardSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Dashboard Defaults</h3>
        
        {/* Default Time Range */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Default Time Range
          </label>
          <select
            value={preferences.dashboard.defaultTimeRange}
            onChange={(e) => handleChange('dashboard', 'defaultTimeRange', e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {TIME_RANGE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Auto Refresh */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Auto Refresh Interval
          </label>
          <select
            value={preferences.dashboard.autoRefresh || ''}
            onChange={(e) => handleChange('dashboard', 'autoRefresh', e.target.value || null)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            {AUTO_REFRESH_OPTIONS.map((option) => (
              <option key={option.value || 'off'} value={option.value || ''}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Query History */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Query History Size
          </label>
          <input
            type="number"
            min="0"
            max="1000"
            value={preferences.dashboard.queryHistory}
            onChange={(e) => handleChange('dashboard', 'queryHistory', parseInt(e.target.value))}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          />
          <p className="mt-1 text-sm text-gray-500">Number of queries to keep in history</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Editor Settings</h3>
        
        {/* Graph Tooltip Mode */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Graph Tooltip Mode
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleChange('editor', 'graphTooltipMode', 'single')}
              className={`px-4 py-2 rounded-lg border transition-all ${
                preferences.editor.graphTooltipMode === 'single'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              Single
            </button>
            <button
              onClick={() => handleChange('editor', 'graphTooltipMode', 'multi')}
              className={`px-4 py-2 rounded-lg border transition-all ${
                preferences.editor.graphTooltipMode === 'multi'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              Multi
            </button>
            <button
              onClick={() => handleChange('editor', 'graphTooltipMode', 'none')}
              className={`px-4 py-2 rounded-lg border transition-all ${
                preferences.editor.graphTooltipMode === 'none'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              None
            </button>
          </div>
        </div>

        {/* Live Now */}
        <div className="mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.editor.liveNow}
              onChange={(e) => handleChange('editor', 'liveNow', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Enable live now feature
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Notification Channels</h3>
        
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.notifications.emailNotifications}
              onChange={(e) => handleChange('notifications', 'emailNotifications', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Email notifications
            </span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.notifications.browserNotifications}
              onChange={(e) => handleChange('notifications', 'browserNotifications', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Browser notifications
            </span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.notifications.desktopNotifications}
              onChange={(e) => handleChange('notifications', 'desktopNotifications', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Desktop notifications
            </span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.notifications.notificationSound}
              onChange={(e) => handleChange('notifications', 'notificationSound', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Notification sound
            </span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Alert Settings</h3>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Alert Severity Filter
          </label>
          <div className="space-y-2">
            {['critical', 'high', 'medium', 'low', 'info'].map((severity) => (
              <label key={severity} className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.notifications.alertSeverityFilter.includes(severity as any)}
                  onChange={(e) => {
                    const newFilter = e.target.checked
                      ? [...preferences.notifications.alertSeverityFilter, severity as any]
                      : preferences.notifications.alertSeverityFilter.filter(s => s !== severity);
                    handleChange('notifications', 'alertSeverityFilter', newFilter);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                  {severity}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAccessibilitySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Visual Settings</h3>
        
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.accessibility.reduceMotion}
              onChange={(e) => handleChange('accessibility', 'reduceMotion', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Reduce motion and animations
            </span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.accessibility.highContrast}
              onChange={(e) => handleChange('accessibility', 'highContrast', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              High contrast mode
            </span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.accessibility.focusIndicators}
              onChange={(e) => handleChange('accessibility', 'focusIndicators', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Show focus indicators
            </span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Interaction Settings</h3>
        
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.accessibility.keyboardShortcuts}
              onChange={(e) => handleChange('accessibility', 'keyboardShortcuts', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Enable keyboard shortcuts
            </span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.accessibility.screenReaderMode}
              onChange={(e) => handleChange('accessibility', 'screenReaderMode', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Optimize for screen readers
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Privacy Settings</h3>
        
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.privacy.shareAnalytics}
              onChange={(e) => handleChange('privacy', 'shareAnalytics', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Share usage analytics to help improve the platform
            </span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.privacy.saveDashboardQueries}
              onChange={(e) => handleChange('privacy', 'saveDashboardQueries', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Save dashboard queries for quick access
            </span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Feature Settings</h3>
        
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.features.featureAnnouncementsEnabled}
              onChange={(e) => handleChange('features', 'featureAnnouncementsEnabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Show feature announcements
            </span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.features.experimentalFeaturesEnabled}
              onChange={(e) => handleChange('features', 'experimentalFeaturesEnabled', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Enable experimental features
            </span>
          </label>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.features.developerMode}
              onChange={(e) => handleChange('features', 'developerMode', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Developer mode
            </span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderDataDisplaySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Data Formatting</h3>
        
        {/* Unit System */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Unit System
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleChange('dataDisplay', 'unitSystem', 'metric')}
              className={`px-4 py-2 rounded-lg border transition-all ${
                preferences.dataDisplay.unitSystem === 'metric'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              Metric
            </button>
            <button
              onClick={() => handleChange('dataDisplay', 'unitSystem', 'imperial')}
              className={`px-4 py-2 rounded-lg border transition-all ${
                preferences.dataDisplay.unitSystem === 'imperial'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              Imperial
            </button>
          </div>
        </div>

        {/* Null Value Display */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Null Value Display
          </label>
          <input
            type="text"
            value={preferences.dataDisplay.nullValueDisplay}
            onChange={(e) => handleChange('dataDisplay', 'nullValueDisplay', e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          />
        </div>

        {/* Decimal Places */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Default Decimal Places
          </label>
          <input
            type="number"
            min="0"
            max="10"
            value={preferences.dataDisplay.decimalPlaces}
            onChange={(e) => handleChange('dataDisplay', 'decimalPlaces', parseInt(e.target.value))}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          />
        </div>

        {/* Thousands Separator */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Thousands Separator
          </label>
          <input
            type="text"
            maxLength={1}
            value={preferences.dataDisplay.thousandsSeparator}
            onChange={(e) => handleChange('dataDisplay', 'thousandsSeparator', e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-800 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          />
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'ui':
        return renderUISettings();
      case 'localization':
        return renderLocalizationSettings();
      case 'dashboard':
        return renderDashboardSettings();
      case 'notifications':
        return renderNotificationSettings();
      case 'accessibility':
        return renderAccessibilitySettings();
      case 'privacy':
        return renderPrivacySettings();
      case 'data':
        return renderDataDisplaySettings();
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Settings className="h-6 w-6 text-gray-400 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User Preferences</h2>
            </div>
            <button
              onClick={handleReset}
              disabled={saving}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Reset to Defaults
            </button>
          </div>
          
          {/* Search */}
          <div className="w-full max-w-md">
            <PreferencesSearch onResultClick={handleSearchResult} />
          </div>
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700">
            <nav className="p-4 space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {tab.icon}
                  <span className="ml-3">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}