/**
 * Enhanced Variable Selector - UI for template variables
 * Supports multi-select, search, and dependent variables
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VariableModel, VariableOption } from '@/core/dashboard/TemplateVariableSystem';

interface EnhancedVariableSelectorProps {
  variable: VariableModel;
  onChange: (value: string | string[]) => void;
  className?: string;
}

export function EnhancedVariableSelector({
  variable,
  onChange,
  className,
}: EnhancedVariableSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set());

  // Initialize selected values
  useEffect(() => {
    const values = new Set<string>();
    if (Array.isArray(variable.current)) {
      variable.current.forEach(opt => values.add(opt.value));
    } else if (variable.current) {
      values.add(variable.current.value);
    }
    setSelectedValues(values);
  }, [variable.current]);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchQuery) return variable.options;
    
    const query = searchQuery.toLowerCase();
    return variable.options.filter(option => 
      option.text.toLowerCase().includes(query) ||
      option.value.toLowerCase().includes(query)
    );
  }, [variable.options, searchQuery]);

  // Handle option selection
  const handleSelect = (option: VariableOption) => {
    if (variable.multi) {
      const newValues = new Set(selectedValues);
      
      if (option.value === '$__all') {
        // Toggle all
        if (newValues.has('$__all')) {
          newValues.clear();
        } else {
          variable.options.forEach(opt => newValues.add(opt.value));
        }
      } else {
        // Toggle individual option
        if (newValues.has(option.value)) {
          newValues.delete(option.value);
          newValues.delete('$__all'); // Remove 'All' if deselecting
        } else {
          newValues.add(option.value);
          
          // Check if all non-'All' options are selected
          const nonAllOptions = variable.options.filter(opt => opt.value !== '$__all');
          const allSelected = nonAllOptions.every(opt => newValues.has(opt.value));
          if (allSelected && variable.includeAll) {
            newValues.add('$__all');
          }
        }
      }
      
      setSelectedValues(newValues);
      onChange(Array.from(newValues));
    } else {
      // Single select
      setSelectedValues(new Set([option.value]));
      onChange(option.value);
      setIsOpen(false);
    }
  };

  // Get display text
  const getDisplayText = () => {
    if (variable.state === 'Loading') {
      return 'Loading...';
    }
    
    if (variable.state === 'Error') {
      return 'Error';
    }

    if (selectedValues.size === 0) {
      return 'None selected';
    }

    if (selectedValues.has('$__all')) {
      return 'All';
    }

    if (selectedValues.size === 1) {
      const value = Array.from(selectedValues)[0];
      const option = variable.options.find(opt => opt.value === value);
      return option?.text || value;
    }

    return `${selectedValues.size} selected`;
  };

  // Clear all selections (multi-select only)
  const handleClearAll = () => {
    setSelectedValues(new Set());
    onChange([]);
  };

  return (
    <div className={cn('relative', className)}>
      {/* Label */}
      {variable.label && variable.hide !== 1 && (
        <label className="block text-sm font-medium mb-1">
          {variable.label}
        </label>
      )}

      {/* Selector */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={variable.state === 'Loading'}
          className={cn(
            "w-full px-3 py-1.5 text-sm border rounded-md text-left flex items-center justify-between",
            "hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed",
            isOpen && "ring-2 ring-primary"
          )}
        >
          <span className="truncate">{getDisplayText()}</span>
          <div className="flex items-center gap-1 ml-2">
            {variable.state === 'Loading' && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {variable.multi && selectedValues.size > 0 && !selectedValues.has('$__all') && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
                className="p-0.5 hover:bg-accent rounded"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              isOpen && "transform rotate-180"
            )} />
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute top-full mt-1 w-full bg-background border rounded-md shadow-lg z-50">
            {/* Search */}
            {variable.options.length > 10 && (
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-md"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            )}

            {/* Options */}
            <div className="max-h-64 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.has(option.value);
                  const isAll = option.value === '$__all';
                  
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleSelect(option)}
                      className={cn(
                        "w-full px-3 py-1.5 text-sm text-left flex items-center justify-between hover:bg-accent",
                        isSelected && "bg-accent",
                        isAll && "font-medium border-b"
                      )}
                    >
                      <span className="truncate">{option.text}</span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Multi-select actions */}
            {variable.multi && filteredOptions.length > 0 && (
              <div className="p-2 border-t flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {selectedValues.size} of {variable.options.length} selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const allValues = new Set(variable.options.map(opt => opt.value));
                      setSelectedValues(allValues);
                      onChange(Array.from(allValues));
                    }}
                    className="text-primary hover:underline"
                  >
                    Select all
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {variable.state === 'Error' && variable.error && (
        <p className="mt-1 text-xs text-destructive">
          {variable.error}
        </p>
      )}
    </div>
  );
}