'use client';

import { useState } from 'react';
import { LinkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Correlation {
  id: string;
  sourceDataSource: string;
  sourceField: string;
  targetDataSource: string;
  targetField: string;
  label: string;
  description?: string;
}

export default function CorrelationsPage() {
  const [correlations, setCorrelations] = useState<Correlation[]>([
    {
      id: '1',
      sourceDataSource: 'Manufacturing Metrics',
      sourceField: 'equipment_id',
      targetDataSource: 'Equipment Logs',
      targetField: 'machine_id',
      label: 'Equipment to Logs',
      description: 'Links equipment metrics to their corresponding log entries'
    },
    {
      id: '2',
      sourceDataSource: 'Production Database',
      sourceField: 'batch_id',
      targetDataSource: 'Quality Control',
      targetField: 'batch_number',
      label: 'Production to Quality',
      description: 'Correlates production batches with quality control results'
    }
  ]);

  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Correlations</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Define relationships between data from different sources
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Add correlation
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4">
          {correlations.length === 0 ? (
            <div className="text-center py-12">
              <LinkIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No correlations</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating a new correlation.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium 
                           rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 
                           focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add correlation
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {correlations.map((correlation) => (
                <div
                  key={correlation.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <LinkIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {correlation.label}
                      </h3>
                    </div>
                    <button
                      onClick={() => setCorrelations(correlations.filter(c => c.id !== correlation.id))}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {correlation.description && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {correlation.description}
                    </p>
                  )}

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400 w-16">Source:</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {correlation.sourceDataSource}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 mx-2">→</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {correlation.sourceField}
                      </span>
                    </div>
                    <div className="flex items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400 w-16">Target:</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {correlation.targetDataSource}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 mx-2">→</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {correlation.targetField}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal (placeholder) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Add New Correlation
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This feature is coming soon. You'll be able to define correlations between different data sources.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 
                         border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}