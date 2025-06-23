/**
 * Variable Picker - Analytics-style variable selector dropdown
 * Allows users to select values for template variables
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { VariableModel, VariableOption, VariableHide } from '@/core/variables/types';

interface VariablePickerProps {
  variable: VariableModel;
  onSelectionChange: (variable: VariableModel, option: VariableOption) => void;
  className?: string;
}

export const VariablePicker: React.FC<VariablePickerProps> = ({
  variable,
  onSelectionChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term
  const filteredOptions = variable.options.filter(option => {
    if (!searchTerm) return true;
    const text = Array.isArray(option.text) ? option.text.join(' ') : option.text;
    return text.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle option selection
  const handleOptionSelect = (option: VariableOption) => {
    if (variable.multi) {
      // Multi-select mode
      const newOptions = variable.options.map(opt => ({
        ...opt,
        selected: opt.value === option.value ? !opt.selected : opt.selected,
      }));
      
      const selectedOptions = newOptions.filter(opt => opt.selected);
      const newVariable = {
        ...variable,
        options: newOptions,
        current: {
          text: selectedOptions.map(opt => opt.text),
          value: selectedOptions.map(opt => opt.value),
        },
      };
      
      onSelectionChange(newVariable, newVariable.current);
    } else {
      // Single select mode
      const newVariable = {
        ...variable,
        current: option,
        options: variable.options.map(opt => ({
          ...opt,
          selected: opt.value === option.value,
        })),
      };
      
      onSelectionChange(newVariable, option);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  // Don't render if variable is hidden
  if (variable.hide === VariableHide.HideVariable) {
    return null;
  }

  const showLabel = variable.hide !== VariableHide.HideLabel;
  const currentText = Array.isArray(variable.current.text) 
    ? variable.current.text.join(', ') 
    : variable.current.text;

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Variable Label */}
      {showLabel && variable.label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {variable.label}
          {variable.description && (
            <span className="text-gray-500 text-xs ml-1">({variable.description})</span>
          )}
        </label>
      )}

      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={variable.loading}
        className={`
          relative w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-left cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed
          ${variable.error ? 'border-red-300' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <span className="block truncate">
            {variable.loading ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Loading...
              </span>
            ) : variable.error ? (
              <span className="text-red-600">Error: {variable.error}</span>
            ) : (
              currentText || 'Select...'
            )}
          </span>
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && !variable.loading && !variable.error && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
          {/* Search Input for large option lists */}
          {variable.options.length > 10 && (
            <div className="sticky top-0 bg-white px-3 py-2 border-b">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Options List */}
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-gray-500 text-sm">
              {searchTerm ? 'No matching options' : 'No options available'}
            </div>
          ) : (
            filteredOptions.map((option, index) => {
              const optionText = Array.isArray(option.text) ? option.text.join(', ') : option.text;
              const isSelected = variable.multi 
                ? option.selected 
                : variable.current.value === option.value;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleOptionSelect(option)}
                  className={`
                    w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:outline-none focus:bg-gray-100
                    ${isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="block truncate">{optionText}</span>
                    {variable.multi && (
                      <span className={`ml-2 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                        {isSelected ? '✓' : ''}
                      </span>
                    )}
                  </div>
                  {option.value !== optionText && (
                    <div className="text-xs text-gray-500 truncate">
                      Value: {Array.isArray(option.value) ? option.value.join(', ') : option.value}
                    </div>
                  )}
                </button>
              );
            })
          )}

          {/* Multi-select info */}
          {variable.multi && variable.options.some(opt => opt.selected) && (
            <div className="sticky bottom-0 bg-gray-50 px-3 py-2 border-t text-xs text-gray-600">
              {variable.options.filter(opt => opt.selected).length} of {variable.options.length} selected
            </div>
          )}
        </div>
      )}

      {/* Variable Type Badge (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute -top-2 -right-2 bg-blue-100 text-blue-800 text-xs px-1 rounded">
          {variable.type}
        </div>
      )}
    </div>
  );
};