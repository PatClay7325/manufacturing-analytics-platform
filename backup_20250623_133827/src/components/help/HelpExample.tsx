'use client';

import React from 'react';
import { ContextualHelp, FormFieldHelp } from './ContextualHelp';
import { ContextualHelp as ContextualHelpType } from '@/types/help';

// Example of using contextual help in a dashboard settings form
export function DashboardSettingsExample() {
  const refreshIntervalHelp: ContextualHelpType = {
    componentId: 'dashboard-refresh-interval',
    title: 'Refresh Interval',
    content: 'Controls how often the dashboard queries for new data. Lower values provide more real-time updates but may impact performance.',
    examples: [
      {
        title: 'Common intervals',
        description: '5s for real-time, 30s for standard, 5m for historical'
      }
    ],
    relatedTopics: ['performance-optimization', 'real-time-data']
  };

  const timeRangeHelp: ContextualHelpType = {
    componentId: 'dashboard-time-range',
    title: 'Time Range',
    content: 'Sets the default time window for all panels in this dashboard. Individual panels can override this setting.',
    learnMoreUrl: '/docs/dashboards/time-ranges',
    examples: [
      {
        title: 'Relative ranges',
        description: 'Last 1 hour, Last 24 hours, Last 7 days'
      },
      {
        title: 'Absolute ranges',
        description: 'Specific start and end dates for historical analysis'
      }
    ]
  };

  const variablesHelp: ContextualHelpType = {
    componentId: 'dashboard-variables',
    title: 'Dashboard Variables',
    content: 'Variables allow you to create dynamic dashboards that can be customized by users. Common uses include filtering by machine, product line, or time period.',
    examples: [
      {
        title: 'Machine selector',
        code: '$machine = query(SELECT DISTINCT machine_id FROM production)'
      }
    ],
    relatedTopics: ['template-variables', 'dynamic-dashboards']
  };

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-xl font-semibold mb-4">Dashboard Settings Example</h2>
      
      {/* Example 1: Form field with help */}
      <FormFieldHelp
        label="Refresh Interval"
        help={refreshIntervalHelp}
        required
      >
        <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
          <option>Off</option>
          <option>5s</option>
          <option>10s</option>
          <option>30s</option>
          <option>1m</option>
          <option>5m</option>
        </select>
      </FormFieldHelp>

      {/* Example 2: Form field with help */}
      <FormFieldHelp
        label="Default Time Range"
        help={timeRangeHelp}
      >
        <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
          <option>Last 5 minutes</option>
          <option>Last 15 minutes</option>
          <option>Last 30 minutes</option>
          <option>Last 1 hour</option>
          <option>Last 24 hours</option>
          <option>Last 7 days</option>
        </select>
      </FormFieldHelp>

      {/* Example 3: Inline contextual help */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Dashboard Variables</h3>
          <ContextualHelp help={variablesHelp} />
        </div>
        <p className="text-sm text-gray-600">
          No variables configured. Add variables to make your dashboard dynamic.
        </p>
        <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Add Variable
        </button>
      </div>

      {/* Example 4: Help tooltip on complex UI element */}
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-1">
            <h3 className="font-medium mb-1">Advanced Settings</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm">Enable shared crosshair</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm">Hide time picker</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" />
                <span className="text-sm">Enable panel collapse</span>
              </label>
            </div>
          </div>
          <ContextualHelp
            help={{
              componentId: 'advanced-settings',
              title: 'Advanced Dashboard Settings',
              content: 'These settings control advanced dashboard behaviors. Shared crosshair synchronizes hover tooltips across panels. Hiding time picker prevents users from changing the time range.',
              relatedTopics: ['dashboard-features']
            }}
            position={{ placement: 'left' }}
          />
        </div>
      </div>
    </div>
  );
}