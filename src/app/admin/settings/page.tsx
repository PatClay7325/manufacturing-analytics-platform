'use client';

import { useState } from 'react';
import { 
  CogIcon, 
  BellIcon, 
  ShieldCheckIcon, 
  CircleStackIcon, 
  GlobeAltIcon,
  KeyIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface SettingSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
}

const settingSections: SettingSection[] = [
  {
    id: 'general',
    title: 'General',
    description: 'Basic instance configuration and branding',
    icon: CogIcon,
  },
  {
    id: 'auth',
    title: 'Authentication',
    description: 'Configure authentication providers and security settings',
    icon: ShieldCheckIcon,
  },
  {
    id: 'datasources',
    title: 'Data Sources',
    description: 'Default data source settings and connection limits',
    icon: CircleStackIcon,
  },
  {
    id: 'alerting',
    title: 'Alerting',
    description: 'Alert notification settings and channels',
    icon: BellIcon,
  },
  {
    id: 'plugins',
    title: 'Plugins',
    description: 'Plugin management and security settings',
    icon: KeyIcon,
  },
  {
    id: 'reporting',
    title: 'Reporting',
    description: 'Configure automated reports and exports',
    icon: DocumentTextIcon,
  },
];

export default function AdminSettingsPage() {
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState({
    instanceName: 'Manufacturing Analytics Platform',
    instanceUrl: 'https://analytics.manufacturing.com',
    allowSignUp: false,
    defaultTheme: 'dark',
    sessionTimeout: 24,
    maxDashboards: 100,
    maxDataSources: 50,
    enableLDAP: false,
    enableOAuth: true,
    alertingEnabled: true,
    emailNotifications: true,
  });

  const renderSettingsContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Instance Name
              </label>
              <input
                type="text"
                value={settings.instanceName}
                onChange={(e) => setSettings({ ...settings, instanceName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Instance URL
              </label>
              <input
                type="url"
                value={settings.instanceUrl}
                onChange={(e) => setSettings({ ...settings, instanceUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Theme
              </label>
              <select
                value={settings.defaultTheme}
                onChange={(e) => setSettings({ ...settings, defaultTheme: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Allow Public Sign Up</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Allow users to create accounts without invitation
                </p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, allowSignUp: !settings.allowSignUp })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${settings.allowSignUp ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${settings.allowSignUp ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </div>
        );

      case 'auth':
        return (
          <div className="space-y-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Authentication Settings
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                    Changes to authentication settings require a server restart to take effect.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Session Timeout (hours)
              </label>
              <input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Enable LDAP</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Allow authentication via LDAP server
                </p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, enableLDAP: !settings.enableLDAP })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${settings.enableLDAP ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${settings.enableLDAP ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Enable OAuth</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Allow authentication via OAuth providers
                </p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, enableOAuth: !settings.enableOAuth })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${settings.enableOAuth ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${settings.enableOAuth ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              {settingSections.find(s => s.id === activeSection)?.title} Settings
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This section is under development.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Server Admin</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Configure global server settings and preferences
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {settingSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-start px-3 py-2 text-sm rounded-md transition-colors
                    ${activeSection === section.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  <Icon className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="font-medium">{section.title}</p>
                    <p className={`text-xs mt-0.5 ${
                      activeSection === section.id 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {section.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6">
            <div className="max-w-2xl">
              {renderSettingsContent()}
              
              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 
                               focus:outline-none focus:ring-2 focus:ring-blue-500">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}