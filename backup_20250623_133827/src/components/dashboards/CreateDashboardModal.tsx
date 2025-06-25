'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CreateDashboardModalProps {
  onClose?: () => void;
  onCreate?: (data?: any) => void;
}

interface CreateFormData {
  title: string;
  description: string;
  tags: string[];
  manufacturingConfig: {
    facility: string;
    line: string;
    shift: string;
    includeOEE: boolean;
    includeQuality: boolean;
    includeProduction: boolean;
    includeEquipment: boolean;
    refreshInterval: number;
  };
}

export default function CreateDashboardModal({
  onClose,
  onCreate
}: CreateDashboardModalProps) {
  const [formData, setFormData] = useState<CreateFormData>({
    title: '',
    description: '',
    tags: [],
    manufacturingConfig: {
      facility: 'main',
      line: 'line-1',
      shift: 'day',
      includeOEE: true,
      includeQuality: true,
      includeProduction: true,
      includeEquipment: true,
      refreshInterval: 30
    }
  });

  const [tagInput, setTagInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const updateManufacturingConfig = (updates: Partial<CreateFormData['manufacturingConfig']>) => {
    setFormData(prev => ({
      ...prev,
      manufacturingConfig: {
        ...prev.manufacturingConfig,
        ...updates
      }
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Create New Dashboard</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 text-gray-400"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dashboard Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="Production Overview"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="A comprehensive view of production metrics and KPIs"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      placeholder="Add a tag"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-1"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-blue-600"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Manufacturing Configuration */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Manufacturing Configuration</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Facility
                    </label>
                    <select
                      value={formData.manufacturingConfig.facility}
                      onChange={(e) => updateManufacturingConfig({ facility: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="main">Main Facility</option>
                      <option value="north">North Plant</option>
                      <option value="south">South Plant</option>
                      <option value="all">All Facilities</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Production Line
                    </label>
                    <select
                      value={formData.manufacturingConfig.line}
                      onChange={(e) => updateManufacturingConfig({ line: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="line-1">Line 1</option>
                      <option value="line-2">Line 2</option>
                      <option value="line-3">Line 3</option>
                      <option value="all">All Lines</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shift
                    </label>
                    <select
                      value={formData.manufacturingConfig.shift}
                      onChange={(e) => updateManufacturingConfig({ shift: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="day">Day Shift</option>
                      <option value="night">Night Shift</option>
                      <option value="swing">Swing Shift</option>
                      <option value="all">All Shifts</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Include Metrics
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'includeOEE', label: 'OEE (Overall Equipment Effectiveness)' },
                      { key: 'includeQuality', label: 'Quality Metrics' },
                      { key: 'includeProduction', label: 'Production Output' },
                      { key: 'includeEquipment', label: 'Equipment Status' }
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.manufacturingConfig[key as keyof CreateFormData['manufacturingConfig']] as boolean}
                          onChange={(e) => updateManufacturingConfig({ [key]: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Refresh Interval (seconds)
                  </label>
                  <select
                    value={formData.manufacturingConfig.refreshInterval}
                    onChange={(e) => updateManufacturingConfig({ refreshInterval: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value={15}>15 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                    <option value={300}>5 minutes</option>
                    <option value={0}>Manual refresh only</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Create Dashboard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}