'use client';

import { useState } from 'react';
import { 
  CloudArrowUpIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowRightIcon,
  DocumentCheckIcon,
  ServerIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

interface MigrationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  icon: React.ComponentType<any>;
}

export default function MigrateToCloudPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [migrationStarted, setMigrationStarted] = useState(false);
  
  const [steps, setSteps] = useState<MigrationStep[]>([
    {
      id: 'analyze',
      title: 'Analyze Current Setup',
      description: 'Scan your current installation for compatibility',
      status: 'pending',
      icon: DocumentCheckIcon,
    },
    {
      id: 'prepare',
      title: 'Prepare Data',
      description: 'Export dashboards, users, and configurations',
      status: 'pending',
      icon: ServerIcon,
    },
    {
      id: 'validate',
      title: 'Validate Migration',
      description: 'Check data integrity and compatibility',
      status: 'pending',
      icon: ShieldCheckIcon,
    },
    {
      id: 'migrate',
      title: 'Migrate to Cloud',
      description: 'Transfer data to cloud infrastructure',
      status: 'pending',
      icon: CloudArrowUpIcon,
    },
  ]);

  const startMigration = () => {
    setMigrationStarted(true);
    // Simulate migration process
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          setSteps((prevSteps) => {
            const newSteps = [...prevSteps];
            newSteps[prev].status = 'completed';
            newSteps[prev + 1].status = 'in-progress';
            return newSteps;
          });
          return prev + 1;
        } else {
          clearInterval(interval);
          setSteps((prevSteps) => {
            const newSteps = [...prevSteps];
            newSteps[prev].status = 'completed';
            return newSteps;
          });
          return prev;
        }
      });
    }, 3000);
  };

  const migrationComplete = steps.every(step => step.status === 'completed');

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Migrate to Cloud</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Move your manufacturing analytics platform to the cloud for enhanced scalability and reliability
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Benefits */}
          {!migrationStarted && (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Why migrate to cloud?
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                    <CloudArrowUpIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Automatic Scaling
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Scale resources automatically based on demand
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                    <ShieldCheckIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Enhanced Security
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Enterprise-grade security and compliance
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                    <ServerIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Managed Infrastructure
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No server maintenance or updates required
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Migration Process */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              Migration Process
            </h2>

            {/* Warning */}
            {!migrationStarted && (
              <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Before you begin
                    </h3>
                    <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                      Ensure you have a complete backup of your data. The migration process will export all dashboards, 
                      data sources, and user configurations.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Steps */}
            <div className="space-y-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.id} className="flex items-start">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                        ${step.status === 'completed' 
                          ? 'bg-green-100 dark:bg-green-900' 
                          : step.status === 'in-progress'
                          ? 'bg-blue-100 dark:bg-blue-900'
                          : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                        {step.status === 'completed' ? (
                          <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                        ) : (
                          <Icon className={`h-5 w-5 
                            ${step.status === 'in-progress' 
                              ? 'text-blue-600 dark:text-blue-400' 
                              : 'text-gray-400'
                            }`} />
                        )}
                      </div>
                      {index < steps.length - 1 && (
                        <div className={`w-0.5 h-16 ml-5 -mb-6
                          ${step.status === 'completed' 
                            ? 'bg-green-300 dark:bg-green-700' 
                            : 'bg-gray-300 dark:bg-gray-700'
                          }`} />
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className={`text-sm font-medium 
                        ${step.status === 'in-progress' 
                          ? 'text-blue-600 dark:text-blue-400' 
                          : 'text-gray-900 dark:text-white'
                        }`}>
                        {step.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {step.description}
                      </p>
                      {step.status === 'in-progress' && (
                        <div className="mt-2">
                          <div className="animate-pulse flex space-x-1">
                            <div className="h-1 w-1 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                            <div className="h-1 w-1 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                            <div className="h-1 w-1 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Button */}
            <div className="mt-8">
              {!migrationStarted ? (
                <button
                  onClick={startMigration}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
                >
                  Start Migration
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              ) : migrationComplete ? (
                <div className="text-center">
                  <CheckCircleIcon className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Migration Complete!
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Your manufacturing analytics platform has been successfully migrated to the cloud.
                  </p>
                  <button className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700">
                    Go to Cloud Dashboard
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Migration in progress... Please do not close this window.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}