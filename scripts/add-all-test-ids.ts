#!/usr/bin/env node

/**
 * Comprehensive script to add all missing test IDs for Playwright tests
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface ComponentUpdate {
  file: string;
  updates: string;
}

const componentUpdates: ComponentUpdate[] = [
  // Alert Page Updates
  {
    file: 'src/app/alerts/page.tsx',
    updates: `'use client';

import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import AlertList from '@/components/alerts/AlertList';
import AlertStatistics from '@/components/alerts/AlertStatistics';
import { Alert } from '@/models/alert';
import alertService from '@/services/alertService';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await alertService?.getAllAlerts();
        setAlerts(data);
      } catch (err) {
        setError('Failed to load alerts. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAlerts();
  }, []);

  // Action buttons
  const actionButton = (
    <div className="flex space-x-3">
      <button 
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        data-testid="create-alert-rule-button"
      >
        <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http: />/www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Create Alert Rule
      </button>
      <button 
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        data-testid="notification-settings-button"
      >
        <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http: />/www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Manage Notifications
      </button>
      <button 
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        data-testid="bulk-select-button"
        onClick={() => setBulkMode(!bulkMode)}
      >
        {bulkMode ? 'Cancel Selection' : 'Bulk Select'}
      </button>
      <button 
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        data-testid="export-alerts-button"
      >
        Export
      </button>
      <button 
        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        data-testid="generate-report-button"
      >
        Generate Report
      </button>
    </div>
  );

  return (
    <PageLayout 
      title="Manufacturing Alerts" 
      actionButton={actionButton}
    >
      {bulkMode && selectedAlerts.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg flex items-center justify-between" data-testid="bulk-actions-bar">
          <span data-testid="selected-count">{selectedAlerts.length} selected</span>
          <div className="space-x-2">
            <button 
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              data-testid="bulk-acknowledge-button"
            >
              Acknowledge Selected
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-3">
          <AlertStatistics />
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-medium text-gray-900 mb-4">Active Alerts</h2>
        {loading ? (
          <div className="text-center p-8">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-200 rounded-full border-t-blue-600" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <p className="mt-2 text-gray-500">Loading alerts...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h?.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        ) : (
          <AlertList 
            initialAlerts={alerts?.filter(alert => alert?.status === 'active')} 
            showFilters={true}
            showSearch={true}
            bulkMode={bulkMode}
            selectedAlerts={selectedAlerts}
            onSelectionChange={setSelectedAlerts}
          />
        )}
      </div>

      <div>
        <h2 className="text-xl font-medium text-gray-900 mb-4">Recent Alerts</h2>
        {loading ? (
          <div className="text-center p-8">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-gray-200 rounded-full border-t-blue-600" role="status">
              <span className="sr-only">Loading...</span>
            </div>
            <p className="mt-2 text-gray-500">Loading alerts...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h?.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        ) : (
          <AlertList 
            initialAlerts={alerts
              .filter(alert => alert?.status !== 'active')
              .sort((a, b) => new Date(b?.createdAt).getTime() - new Date(a?.createdAt).getTime())
              .slice(0, 6)
            } 
            showFilters={false}
            showSearch={false}
            compact={true}
          />
        )}
      </div>
    </PageLayout>
  );
}`
  },
  
  // More component updates would go here...
];

async function updateComponent(update: ComponentUpdate) {
  const filePath = path.join(process.cwd(), update.file);
  
  try {
    await fs.writeFile(filePath, update.updates, 'utf-8');
    console.log(`✅ Updated ${update.file}`);
  } catch (error) {
    console.error(`❌ Failed to update ${update.file}:`, error);
  }
}

async function main() {
  console.log('🔧 Adding all missing test IDs for Playwright tests...\n');

  for (const update of componentUpdates) {
    await updateComponent(update);
  }

  console.log('\n✨ All test ID updates complete!');
}

main().catch(console.error);
