'use client';

import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import PluginMarketplace from '@/components/plugins/PluginMarketplace';
import PluginManager from '@/components/plugins/PluginManager';
import { Package, Store, Settings } from 'lucide-react';

type TabType = 'marketplace' | 'installed';

export default function PluginsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('marketplace');
  
  // In a real app, these would come from auth context
  const userId = 'user-123';
  const organizationId = undefined;

  const tabs = [
    { id: 'marketplace' as TabType, name: 'Browse', icon: Store },
    { id: 'installed' as TabType, name: 'Installed Plugins', icon: Settings },
  ];

  return (
    <PageLayout
      title="Plugins"
      description="Extend your platform with plugins for data sources, panels, and apps"
    >
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors inline-flex items-center ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'marketplace' ? (
          <PluginMarketplace userId={userId} organizationId={organizationId} />
        ) : (
          <PluginManager userId={userId} organizationId={organizationId} />
        )}
      </div>
    </PageLayout>
  );
}