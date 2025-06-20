'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CodeBracketIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Dashboard } from '@/types/dashboard';
import { getAvailableVariables } from '@/utils/variableUtils';

interface VariableSelectorProps {
  dashboard?: Dashboard;
  onSelect?: (variable: string) => void;
  className?: string;
  buttonText?: string;
}

export default function VariableSelector({
  dashboard,
  onSelect,
  className = '',
  buttonText = 'Variables'
}: VariableSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get available variables
  const variables = dashboard ? getAvailableVariables(dashboard) : [];
  
  // Filter variables based on search
  const filteredVariables = variables.filter(
    v => v.name.toLowerCase().includes(search.toLowerCase()) ||
         v.description.toLowerCase().includes(search.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (variableName: string) => {
    onSelect?.(`$${variableName}`);
    setIsOpen(false);
    setSearch('');
  };

  if (!dashboard || variables.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded border border-gray-600"
      >
        <CodeBracketIcon className="w-4 h-4" />
        <span>{buttonText}</span>
        <ChevronDownIcon className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl">
          {/* Search */}
          <div className="p-2 border-b border-gray-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search variables..."
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          {/* Variables List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredVariables.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                No variables found
              </div>
            ) : (
              <div className="p-1">
                {/* Template Variables */}
                {filteredVariables.filter(v => !v.name.startsWith('__')).length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-medium text-gray-500 uppercase">
                      Template Variables
                    </div>
                    {filteredVariables
                      .filter(v => !v.name.startsWith('__'))
                      .map(variable => (
                        <button
                          key={variable.name}
                          onClick={() => handleSelect(variable.name)}
                          className="w-full text-left px-2 py-2 hover:bg-gray-700 rounded group"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-mono text-blue-400">
                                ${variable.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {variable.description}
                              </div>
                            </div>
                            <div className="text-xs text-gray-600 group-hover:text-gray-400">
                              {variable.value}
                            </div>
                          </div>
                        </button>
                      ))}
                  </>
                )}

                {/* Built-in Variables */}
                {filteredVariables.filter(v => v.name.startsWith('__')).length > 0 && (
                  <>
                    <div className="px-2 py-1 mt-2 text-xs font-medium text-gray-500 uppercase">
                      Built-in Variables
                    </div>
                    {filteredVariables
                      .filter(v => v.name.startsWith('__'))
                      .map(variable => (
                        <button
                          key={variable.name}
                          onClick={() => handleSelect(variable.name)}
                          className="w-full text-left px-2 py-2 hover:bg-gray-700 rounded group"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-mono text-green-400">
                                ${variable.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {variable.description}
                              </div>
                            </div>
                            <div className="text-xs text-gray-600 group-hover:text-gray-400 font-mono truncate max-w-[120px]">
                              {variable.value}
                            </div>
                          </div>
                        </button>
                      ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Help Footer */}
          <div className="p-2 border-t border-gray-700 text-xs text-gray-500">
            <div>Click to insert variable at cursor position</div>
            <div className="mt-1">
              Formats: <span className="font-mono">$var</span>, 
              <span className="font-mono ml-1">${'{var}'}</span>, 
              <span className="font-mono ml-1">[[var]]</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}