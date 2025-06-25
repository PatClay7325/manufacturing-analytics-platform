'use client';

import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';

interface SearchableItem {
  id: string;
  category: string;
  label: string;
  description: string;
  keywords: string[];
}

const searchableItems: SearchableItem[] = [
  // UI Preferences
  { id: 'theme', category: 'ui', label: 'Theme', description: 'Choose between light, dark, or system theme', keywords: ['appearance', 'color', 'mode', 'dark', 'light'] },
  { id: 'language', category: 'localization', label: 'Language', description: 'Set your preferred language', keywords: ['locale', 'translation', 'international'] },
  { id: 'timezone', category: 'localization', label: 'Timezone', description: 'Configure your timezone for accurate timestamps', keywords: ['time', 'zone', 'clock'] },
  { id: 'dateFormat', category: 'localization', label: 'Date Format', description: 'Customize how dates are displayed', keywords: ['date', 'format', 'display'] },
  { id: 'timeFormat', category: 'localization', label: 'Time Format', description: 'Choose 12-hour or 24-hour time format', keywords: ['time', 'clock', '12h', '24h'] },
  { id: 'weekStart', category: 'localization', label: 'Week Start', description: 'Set which day your week starts on', keywords: ['calendar', 'week', 'monday', 'sunday'] },
  
  // Dashboard Preferences
  { id: 'homeDashboard', category: 'dashboard', label: 'Home Dashboard', description: 'Set your default dashboard', keywords: ['default', 'home', 'landing'] },
  { id: 'defaultTimeRange', category: 'dashboard', label: 'Default Time Range', description: 'Default time range for new dashboards', keywords: ['time', 'range', 'default'] },
  { id: 'autoRefresh', category: 'dashboard', label: 'Auto Refresh', description: 'Automatic dashboard refresh interval', keywords: ['refresh', 'auto', 'interval'] },
  { id: 'queryHistory', category: 'dashboard', label: 'Query History', description: 'Number of queries to keep in history', keywords: ['history', 'query', 'storage'] },
  
  // Editor Preferences
  { id: 'defaultDatasource', category: 'dashboard', label: 'Default Datasource', description: 'Default data source for queries', keywords: ['datasource', 'data', 'source', 'default'] },
  { id: 'graphTooltip', category: 'dashboard', label: 'Graph Tooltip Mode', description: 'How tooltips appear on graphs', keywords: ['tooltip', 'graph', 'hover'] },
  { id: 'liveNow', category: 'dashboard', label: 'Live Now', description: 'Enable live streaming of current data', keywords: ['live', 'now', 'streaming', 'real-time'] },
  
  // Notification Preferences
  { id: 'emailNotifications', category: 'notifications', label: 'Email Notifications', description: 'Receive notifications via email', keywords: ['email', 'notification', 'alert'] },
  { id: 'browserNotifications', category: 'notifications', label: 'Browser Notifications', description: 'Show notifications in your browser', keywords: ['browser', 'notification', 'popup'] },
  { id: 'desktopNotifications', category: 'notifications', label: 'Desktop Notifications', description: 'Show desktop system notifications', keywords: ['desktop', 'system', 'notification'] },
  { id: 'notificationSound', category: 'notifications', label: 'Notification Sound', description: 'Play sound for notifications', keywords: ['sound', 'audio', 'notification'] },
  { id: 'alertSeverity', category: 'notifications', label: 'Alert Severity Filter', description: 'Which alert severities to notify about', keywords: ['alert', 'severity', 'filter', 'critical', 'warning'] },
  
  // Accessibility Preferences
  { id: 'reduceMotion', category: 'accessibility', label: 'Reduce Motion', description: 'Reduce animations and motion effects', keywords: ['motion', 'animation', 'reduce', 'accessibility'] },
  { id: 'highContrast', category: 'accessibility', label: 'High Contrast', description: 'Increase contrast for better visibility', keywords: ['contrast', 'visibility', 'accessibility'] },
  { id: 'fontSize', category: 'accessibility', label: 'Font Size', description: 'Adjust the size of text throughout the interface', keywords: ['font', 'size', 'text', 'scale'] },
  { id: 'keyboardShortcuts', category: 'accessibility', label: 'Keyboard Shortcuts', description: 'Enable keyboard navigation shortcuts', keywords: ['keyboard', 'shortcuts', 'navigation', 'accessibility'] },
  { id: 'screenReader', category: 'accessibility', label: 'Screen Reader Mode', description: 'Optimize interface for screen readers', keywords: ['screen', 'reader', 'accessibility', 'aria'] },
  { id: 'focusIndicators', category: 'accessibility', label: 'Focus Indicators', description: 'Show visual focus indicators', keywords: ['focus', 'indicator', 'accessibility', 'navigation'] },
  
  // Privacy Preferences
  { id: 'shareAnalytics', category: 'privacy', label: 'Share Analytics', description: 'Share usage analytics to help improve the platform', keywords: ['analytics', 'privacy', 'tracking', 'data'] },
  { id: 'saveDashboardQueries', category: 'privacy', label: 'Save Dashboard Queries', description: 'Save dashboard queries for quick access', keywords: ['save', 'query', 'dashboard', 'privacy'] },
  { id: 'featureAnnouncements', category: 'privacy', label: 'Feature Announcements', description: 'Show announcements about new features', keywords: ['feature', 'announcement', 'updates', 'news'] },
  { id: 'experimentalFeatures', category: 'privacy', label: 'Experimental Features', description: 'Enable experimental and beta features', keywords: ['experimental', 'beta', 'features', 'preview'] },
  { id: 'developerMode', category: 'privacy', label: 'Developer Mode', description: 'Enable developer tools and features', keywords: ['developer', 'debug', 'tools', 'advanced'] },
  
  // Data Display Preferences
  { id: 'unitSystem', category: 'data', label: 'Unit System', description: 'Choose between metric and imperial units', keywords: ['units', 'metric', 'imperial', 'measurement'] },
  { id: 'nullValueDisplay', category: 'data', label: 'Null Value Display', description: 'How to display null or missing values', keywords: ['null', 'missing', 'empty', 'display'] },
  { id: 'decimalPlaces', category: 'data', label: 'Decimal Places', description: 'Number of decimal places to show', keywords: ['decimal', 'precision', 'numbers'] },
  { id: 'thousandsSeparator', category: 'data', label: 'Thousands Separator', description: 'Character used to separate thousands', keywords: ['thousands', 'separator', 'comma', 'format'] },
];

interface PreferencesSearchProps {
  onResultClick: (category: string, item: SearchableItem) => void;
}

export default function PreferencesSearch({ onResultClick }: PreferencesSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    
    const searchTerm = query.toLowerCase();
    return searchableItems.filter(item => 
      item.label.toLowerCase().includes(searchTerm) ||
      item.description.toLowerCase().includes(searchTerm) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm)) ||
      item.category.toLowerCase().includes(searchTerm)
    ).slice(0, 8); // Limit to 8 results
  }, [query]);

  const handleResultClick = (item: SearchableItem) => {
    onResultClick(item.category, item);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search preferences..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        {query && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Search Results */}
      {isOpen && searchResults.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 max-h-96 overflow-auto">
          <div className="py-1">
            {searchResults.map((item) => (
              <button
                key={item.id}
                onClick={() => handleResultClick(item)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700 focus:outline-none"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.label}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {item.description}
                    </div>
                  </div>
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 capitalize">
                    {item.category === 'localization' ? 'locale' : item.category}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}