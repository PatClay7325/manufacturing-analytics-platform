'use client';

import React, { useState } from 'react';
import { Panel } from '@/types/dashboard';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'ne';
  duration: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

interface AlertRulesEditorProps {
  panel?: Panel;
  onChange?: (alertRules?: AlertRule[]) => void;
}

export default function AlertRulesEditor({
  panel,
  onChange
}: AlertRulesEditorProps) {
  const [alertRules, setAlertRules] = useState<AlertRule[]>(
    (panel as any).alertRules || []
  );

  const addAlertRule = () => {
    const newRule: AlertRule = {
      id: `rule_${Date.now()}`,
      name: 'New Alert Rule',
      condition: 'avg()',
      threshold: 100,
      operator: 'gt',
      duration: '5m',
      severity: 'medium',
      enabled: true
    };
    
    const updated = [...alertRules, newRule];
    setAlertRules(updated);
    onChange(updated);
  };

  const removeAlertRule = (id: string) => {
    const updated = alertRules?.filter(rule => rule?.id !== id);
    setAlertRules(updated);
    onChange(updated);
  };

  const updateAlertRule = (id: string, updates: Partial<AlertRule>) => {
    const updated = alertRules?.map(rule =>
      rule?.id === id ? { ...rule, ...updates } : rule
    );
    setAlertRules(updated);
    onChange(updated);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Alert Rules</h3>
        <button
          onClick={addAlertRule}
          className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
        >
          <PlusIcon className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      {alertRules.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">No alert rules configured</p>
          <p className="text-sm">Add alert rules to monitor this panel's data</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alertRules?.map((rule) => (
            <div key={rule?.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <input
                  type="text"
                  value={rule?.name}
                  onChange={(e) => updateAlertRule(rule?.id, { name: e.target.value })}
                  className="font-medium text-white bg-transparent border-none outline-none"
                />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rule?.enabled}
                      onChange={(e) => updateAlertRule(rule?.id, { enabled: e.target.checked })}
                      className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">Enabled</span>
                  </label>
                  <button
                    onClick={() => removeAlertRule(rule?.id)}
                    className="p-1 hover:bg-gray-600 rounded text-red-400"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Condition
                  </label>
                  <select
                    value={rule?.condition}
                    onChange={(e) => updateAlertRule(rule?.id, { condition: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="avg()">Average</option>
                    <option value="min()">Minimum</option>
                    <option value="max()">Maximum</option>
                    <option value="sum()">Sum</option>
                    <option value="count()">Count</option>
                    <option value="last()">Last value</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Operator
                  </label>
                  <select
                    value={rule?.operator}
                    onChange={(e) => updateAlertRule(rule?.id, { operator: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="gt">Greater than</option>
                    <option value="lt">Less than</option>
                    <option value="eq">Equal to</option>
                    <option value="ne">Not equal to</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Threshold
                  </label>
                  <input
                    type="number"
                    value={rule?.threshold}
                    onChange={(e) => updateAlertRule(rule?.id, { threshold: Number(e?.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Duration
                  </label>
                  <select
                    value={rule?.duration}
                    onChange={(e) => updateAlertRule(rule?.id, { duration: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="1m">1 minute</option>
                    <option value="5m">5 minutes</option>
                    <option value="10m">10 minutes</option>
                    <option value="15m">15 minutes</option>
                    <option value="30m">30 minutes</option>
                    <option value="1h">1 hour</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Severity
                </label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high', 'critical'] as const).map((severity) => (
                    <button
                      key={severity}
                      onClick={() => updateAlertRule(rule?.id, { severity })}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        rule?.severity === severity
                          ? severity === 'low' ? 'bg-green-600 text-white'
                            : severity === 'medium' ? 'bg-yellow-600 text-white'
                            : severity === 'high' ? 'bg-orange-600 text-white'
                            : 'bg-red-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      {severity?.charAt(0).toUpperCase() + severity?.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-800 rounded">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Alert Configuration</h4>
        <p className="text-xs text-gray-500 mb-2">
          Alert rules will evaluate the panel's query results and trigger notifications when conditions are met.
        </p>
        <div className="text-xs text-gray-600">
          <p>• Rules evaluate every minute</p>
          <p>• Notifications are sent to configured channels</p>
          <p>• Rules can be temporarily disabled</p>
        </div>
      </div>
    </div>
  );
}