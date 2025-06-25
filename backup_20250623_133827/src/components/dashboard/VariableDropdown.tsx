'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Variable } from '@/core/variables/VariableTypes';
import { Check, ChevronDown, X } from 'lucide-react';

interface VariableDropdownProps {
  variable: Variable;
  onChange: (value: string | string[]) => void;
  className?: string;
}

export function VariableDropdown({ variable, onChange, className = '' }: VariableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (value: string) => {
    if (variable.multi) {
      const currentValues = Array.isArray(variable.current.value) 
        ? variable.current.value 
        : variable.current.value ? [variable.current.value] : [];
      
      if (value === '$__all' || value === variable.allValue) {
        // Toggle all selection
        onChange(currentValues.length === variable.options.length - 1 ? [] : '$__all');
      } else {
        const newValues = currentValues.includes(value)
          ? currentValues.filter(v => v !== value && v !== '$__all')
          : [...currentValues.filter(v => v !== '$__all'), value];
        
        onChange(newValues);
      }
    } else {
      onChange(value);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const displayText = () => {
    if (!variable.current || !variable.current.value) {
      return 'None';
    }

    if (Array.isArray(variable.current.value)) {
      const values = variable.current.value;
      if (values.length === 0) return 'None';
      if (values.includes('$__all') || values.includes(variable.allValue || '')) return 'All';
      if (values.length === 1) {
        const option = variable.options.find(opt => opt.value === values[0]);
        return option?.text || values[0];
      }
      return `${values.length} selected`;
    }

    if (variable.current.value === '$__all' || variable.current.value === variable.allValue) {
      return 'All';
    }

    return variable.current.text || String(variable.current.value);
  };

  const filteredOptions = variable.options.filter(option => {
    if (!searchTerm) return true;
    return option.text.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const isAllSelected = () => {
    if (!variable.multi || !variable.includeAll) return false;
    const currentValues = Array.isArray(variable.current.value) ? variable.current.value : [];
    return currentValues.includes('$__all') || 
           currentValues.includes(variable.allValue || '') ||
           currentValues.length === variable.options.filter(o => o.value !== '$__all').length;
  };

  if (variable.hide === 'variable') return null;

  return (
    <div className={`variable-dropdown ${className}`} ref={dropdownRef}>
      {variable.hide !== 'label' && variable.label && (
        <label className="text-xs text-gray-400 block mb-1">
          {variable.label}
        </label>
      )}
      
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center justify-between min-w-[120px] px-3 py-1.5 text-sm 
            bg-gray-800 border border-gray-700 rounded hover:border-gray-600 
            focus:outline-none focus:border-blue-500 transition-colors
            ${isOpen ? 'border-blue-500' : ''}
          `}
        >
          <span className="truncate max-w-[200px]">{displayText()}</span>
          <ChevronDown className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-gray-800 border border-gray-700 rounded shadow-lg">
            {/* Search box for long lists */}
            {variable.options.length > 10 && (
              <div className="p-2 border-b border-gray-700">
                <input
                  ref={searchRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search options..."
                  className="w-full px-2 py-1 text-sm bg-gray-900 border border-gray-700 rounded focus:outline-none focus:border-blue-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            
            <div className="max-h-60 overflow-auto">
              {/* All option */}
              {variable.includeAll && variable.multi && (
                <button
                  onClick={() => handleSelect('$__all')}
                  className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
                >
                  <div className="w-4 h-4 mr-2 flex items-center justify-center">
                    {isAllSelected() && <Check className="w-4 h-4 text-blue-500" />}
                  </div>
                  <span>All</span>
                </button>
              )}
              
              {/* Regular options */}
              {filteredOptions
                .filter(opt => opt.value !== '$__all' && opt.value !== variable.allValue)
                .map((option, index) => {
                  const isSelected = Array.isArray(variable.current.value)
                    ? variable.current.value.includes(option.value as string)
                    : option.value === variable.current.value;
                  
                  return (
                    <button
                      key={`${option.value}-${index}`}
                      onClick={() => handleSelect(option.value as string)}
                      className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-700 transition-colors"
                    >
                      <div className="w-4 h-4 mr-2 flex items-center justify-center">
                        {isSelected && <Check className="w-4 h-4 text-blue-500" />}
                      </div>
                      <span className="truncate">{option.text}</span>
                    </button>
                  );
                })}
              
              {filteredOptions.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No options found
                </div>
              )}
            </div>
            
            {/* Clear button for multi-select */}
            {variable.multi && Array.isArray(variable.current.value) && variable.current.value.length > 0 && (
              <div className="p-2 border-t border-gray-700">
                <button
                  onClick={() => {
                    onChange([]);
                    setSearchTerm('');
                  }}
                  className="flex items-center text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear selection
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}