'use client';

import React, { useState } from 'react';
import {
  XMarkIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline';
import { Dashboard, TemplateVariable } from '@/types/dashboard';
import VariableEditor from './VariableEditor';

interface VariableManagerProps {
  dashboard?: Dashboard;
  onSave?: (variables?: TemplateVariable[]) => void;
  onClose?: () => void;
}

export default function VariableManager({
  dashboard,
  onSave,
  onClose
}: VariableManagerProps) {
  const [variables, setVariables] = useState<TemplateVariable[]>(
    dashboard?.templating?.list || []
  );
  const [editingVariable, setEditingVariable] = useState<TemplateVariable | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleAddVariable = () => {
    const newVariable: TemplateVariable = {
      name: 'new_variable',
      label: 'New Variable',
      type: 'query',
      query: '',
      datasource: 'default',
      refresh: 1,
      multi: false,
      includeAll: false,
      current: {},
      options: [],
      hide: 0
    };
    setEditingVariable(newVariable);
    setIsCreating(true);
  };

  const handleEditVariable = (variable: TemplateVariable) => {
    setEditingVariable({ ...variable });
    setIsCreating(false);
  };

  const handleDeleteVariable = (variableName: string) => {
    if (confirm(`Are you sure you want to delete the variable "${variableName}"?`)) {
      setVariables(variables?.filter(v => v?.name !== variableName));
    }
  };

  const handleSaveVariable = (variable: TemplateVariable) => {
    if (isCreating) {
      setVariables([...variables, variable]);
    } else {
      setVariables(variables?.map(v => 
        v?.name === editingVariable?.name ? variable : v
      ));
    }
    setEditingVariable(null);
    setIsCreating(false);
  };

  const handleMoveVariable = (index: number, direction: 'up' | 'down') => {
    const newVariables = [...variables];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < variables?.length) {
      [newVariables[index], newVariables[newIndex]] = [newVariables[newIndex], newVariables[index]];
      setVariables(newVariables);
    }
  };

  const handleSave = () => {
    onSave(variables);
  };

  const getVariableTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      query: 'Query',
      custom: 'Custom',
      textbox: 'Text box',
      constant: 'Constant',
      datasource: 'Data source',
      interval: 'Interval',
      adhoc: 'Ad hoc filters'
    };
    return types[type] || type;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Variables</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-700 text-gray-400"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Variables List */}
          {variables.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No variables defined yet.</p>
              <button
                onClick={handleAddVariable}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                <PlusIcon className="w-5 h-5" />
                Add Variable
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {variables?.map((variable, index) => (
                  <div
                    key={variable?.name}
                    className="bg-gray-700 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-white">
                          ${variable?.name}
                        </h3>
                        <span className="text-xs px-2 py-1 bg-gray-600 rounded text-gray-300">
                          {getVariableTypeLabel(variable?.type)}
                        </span>
                        {variable?.hide === 2 && (
                          <span className="text-xs px-2 py-1 bg-yellow-600 rounded text-white">
                            Hidden
                          </span>
                        )}
                      </div>
                      {variable?.label && variable?.label !== variable?.name && (
                        <p className="text-sm text-gray-400 mt-1">
                          Label: {variable?.label}
                        </p>
                      )}
                      {variable?.query && (
                        <p className="text-sm text-gray-500 mt-1 font-mono truncate">
                          {variable?.query}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Move Up */}
                      <button
                        onClick={() => handleMoveVariable(index, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-gray-600 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        <ChevronUpIcon className="w-4 h-4" />
                      </button>

                      {/* Move Down */}
                      <button
                        onClick={() => handleMoveVariable(index, 'down')}
                        disabled={index === variables?.length - 1}
                        className="p-1 rounded hover:bg-gray-600 text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        <ChevronDownIcon className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => handleEditVariable(variable)}
                        className="p-1 rounded hover:bg-gray-600 text-gray-400"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteVariable(variable?.name)}
                        className="p-1 rounded hover:bg-gray-600 text-red-400"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddVariable}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
              >
                <PlusIcon className="w-5 h-5" />
                Add Variable
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Save Variables
          </button>
        </div>

        {/* Variable Editor Modal */}
        {editingVariable && (
          <VariableEditor
            variable={editingVariable}
            existingVariables={variables}
            isNew={isCreating}
            onSave={handleSaveVariable}
            onClose={() => {
              setEditingVariable(null);
              setIsCreating(false);
            }}
          />
        )}
      </div>
    </div>
  );
}