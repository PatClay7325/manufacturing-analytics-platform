# Sprint 1 Implementation Guide: Variables & Time Controls

## Day 1-2: Variable Types and Core

### 1. Create Variable Types
```typescript
// src/core/variables/VariableTypes.ts
export type VariableType = 
  | 'query' 
  | 'custom' 
  | 'constant' 
  | 'datasource' 
  | 'interval' 
  | 'textbox' 
  | 'adhoc';

export interface VariableOption {
  text: string;
  value: string | string[];
  selected: boolean;
}

export interface Variable {
  id: string;
  name: string;
  label?: string;
  type: VariableType;
  query?: string;
  datasource?: string;
  current: VariableOption;
  options: VariableOption[];
  multi?: boolean;
  includeAll?: boolean;
  allValue?: string;
  refresh?: 'never' | 'on-dashboard-load' | 'on-time-range-change';
  regex?: string;
  sort?: 'disabled' | 'alphabetical' | 'numerical' | 'alphabetical-case-insensitive';
  hide?: 'label' | 'variable' | '';
  skipUrlSync?: boolean;
}

export interface BuiltInVariable {
  name: string;
  value: string | (() => string);
}
```

### 2. Implement Variable Manager
```typescript
// src/core/variables/VariableManager.ts
import { Variable, VariableOption, BuiltInVariable } from './VariableTypes';

export class VariableManager {
  private variables = new Map<string, Variable>();
  private listeners = new Set<(variables: Variable[]) => void>();
  
  // Built-in variables
  private builtInVariables: BuiltInVariable[] = [
    { name: '__interval', value: () => this.calculateInterval() },
    { name: '__interval_ms', value: () => String(this.calculateIntervalMs()) },
    { name: '__range', value: () => this.getTimeRange() },
    { name: '__range_s', value: () => String(this.getTimeRangeSeconds()) },
    { name: '__rate_interval', value: () => this.calculateRateInterval() },
  ];

  async initializeVariables(variables: Variable[]) {
    // Sort by dependencies
    const sorted = this.topologicalSort(variables);
    
    for (const variable of sorted) {
      await this.refreshVariable(variable);
      this.variables.set(variable.name, variable);
    }
    
    this.notifyListeners();
  }

  async refreshVariable(variable: Variable) {
    switch (variable.type) {
      case 'query':
        variable.options = await this.executeQuery(variable);
        break;
      case 'custom':
        variable.options = this.parseCustomOptions(variable.query || '');
        break;
      case 'interval':
        variable.options = this.getIntervalOptions();
        break;
      case 'datasource':
        variable.options = await this.getDataSourceOptions(variable);
        break;
      case 'constant':
        variable.options = [{
          text: variable.query || '',
          value: variable.query || '',
          selected: true
        }];
        break;
      case 'textbox':
        variable.options = [{
          text: variable.current?.value as string || '',
          value: variable.current?.value as string || '',
          selected: true
        }];
        break;
    }
    
    // Apply regex filter
    if (variable.regex) {
      variable.options = this.applyRegexFilter(variable.options, variable.regex);
    }
    
    // Sort options
    if (variable.sort !== 'disabled') {
      variable.options = this.sortOptions(variable.options, variable.sort);
    }
    
    // Add "All" option
    if (variable.includeAll) {
      variable.options.unshift({
        text: 'All',
        value: variable.allValue || '$__all',
        selected: false
      });
    }
    
    // Set current value
    this.updateCurrentValue(variable);
  }

  interpolateQuery(query: string, scopedVars?: Record<string, any>): string {
    let interpolated = query;
    
    // Replace scoped variables first
    if (scopedVars) {
      Object.entries(scopedVars).forEach(([name, value]) => {
        const regex = new RegExp(`\\$\\{${name}(?::([^}]+))?\\}|\\$${name}\\b`, 'g');
        interpolated = interpolated.replace(regex, String(value));
      });
    }
    
    // Replace dashboard variables
    this.variables.forEach((variable, name) => {
      const regex = new RegExp(`\\$\\{${name}(?::([^}]+))?\\}|\\$${name}\\b`, 'g');
      interpolated = interpolated.replace(regex, (match, format) => {
        return this.formatVariableValue(variable, format);
      });
    });
    
    // Replace built-in variables
    this.builtInVariables.forEach(({ name, value }) => {
      const regex = new RegExp(`\\$\\{${name}\\}|\\$${name}\\b`, 'g');
      const val = typeof value === 'function' ? value() : value;
      interpolated = interpolated.replace(regex, val);
    });
    
    return interpolated;
  }

  private formatVariableValue(variable: Variable, format?: string): string {
    const value = variable.current.value;
    
    if (Array.isArray(value)) {
      switch (format) {
        case 'csv':
          return value.join(',');
        case 'pipe':
          return value.join('|');
        case 'regex':
          return `(${value.join('|')})`;
        case 'glob':
          return `{${value.join(',')}}`;
        case 'json':
          return JSON.stringify(value);
        case 'queryparam':
          return value.map(v => `var-${variable.name}=${v}`).join('&');
        default:
          return value.join(',');
      }
    }
    
    return String(value);
  }

  updateVariable(name: string, value: string | string[]) {
    const variable = this.variables.get(name);
    if (!variable) return;
    
    // Update current value
    if (variable.multi && Array.isArray(value)) {
      variable.current = {
        text: value.join(' + '),
        value: value,
        selected: true
      };
    } else {
      const option = variable.options.find(opt => opt.value === value);
      if (option) {
        variable.current = { ...option, selected: true };
      }
    }
    
    // Update options selected state
    variable.options.forEach(opt => {
      opt.selected = Array.isArray(value) 
        ? value.includes(opt.value as string)
        : opt.value === value;
    });
    
    this.notifyListeners();
  }

  subscribe(listener: (variables: Variable[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const variables = Array.from(this.variables.values());
    this.listeners.forEach(listener => listener(variables));
  }
}

// Singleton instance
export const variableManager = new VariableManager();
```

---

## Day 3-4: UI Components

### 3. Variable Dropdown Component
```typescript
// src/components/dashboard/VariableDropdown.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Variable } from '@/core/variables/VariableTypes';
import { Check, ChevronDown } from 'lucide-react';

interface VariableDropdownProps {
  variable: Variable;
  onChange: (value: string | string[]) => void;
}

export function VariableDropdown({ variable, onChange }: VariableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (value: string) => {
    if (variable.multi) {
      const currentValues = Array.isArray(variable.current.value) 
        ? variable.current.value 
        : [variable.current.value];
      
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      
      onChange(newValues);
    } else {
      onChange(value);
      setIsOpen(false);
    }
  };

  const handleSelectAll = () => {
    if (variable.includeAll) {
      const allSelected = variable.current.value === '$__all';
      onChange(allSelected ? [] : '$__all');
    }
  };

  const displayText = () => {
    if (Array.isArray(variable.current.value)) {
      const count = variable.current.value.length;
      if (count === 0) return 'None';
      if (count === variable.options.length - (variable.includeAll ? 1 : 0)) return 'All';
      if (count === 1) return variable.current.text;
      return `${variable.current.text} (+${count - 1})`;
    }
    return variable.current.text;
  };

  if (variable.hide === 'variable') return null;

  return (
    <div className="variable-dropdown" ref={dropdownRef}>
      {variable.hide !== 'label' && (
        <label className="text-xs text-gray-400 block mb-1">
          {variable.label || variable.name}
        </label>
      )}
      
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded hover:border-gray-600 focus:outline-none focus:border-blue-500"
        >
          <span className="truncate">{displayText()}</span>
          <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg max-h-60 overflow-auto">
            {variable.includeAll && (
              <button
                onClick={handleSelectAll}
                className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-700"
              >
                <div className="w-4 h-4 mr-2">
                  {variable.current.value === '$__all' && <Check className="w-4 h-4" />}
                </div>
                <span>All</span>
              </button>
            )}
            
            {variable.options
              .filter(opt => opt.value !== '$__all')
              .map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(option.value as string)}
                  className="flex items-center w-full px-3 py-2 text-sm hover:bg-gray-700"
                >
                  <div className="w-4 h-4 mr-2">
                    {option.selected && <Check className="w-4 h-4" />}
                  </div>
                  <span>{option.text}</span>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 4. Time Range Picker
```typescript
// src/components/dashboard/TimeRangePicker.tsx
import React, { useState } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface TimeRange {
  from: Date | string;
  to: Date | string;
  display: string;
}

interface TimeRangePickerProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const quickRanges = [
  { label: 'Last 5 minutes', from: 'now-5m', to: 'now' },
  { label: 'Last 15 minutes', from: 'now-15m', to: 'now' },
  { label: 'Last 30 minutes', from: 'now-30m', to: 'now' },
  { label: 'Last 1 hour', from: 'now-1h', to: 'now' },
  { label: 'Last 3 hours', from: 'now-3h', to: 'now' },
  { label: 'Last 6 hours', from: 'now-6h', to: 'now' },
  { label: 'Last 12 hours', from: 'now-12h', to: 'now' },
  { label: 'Last 24 hours', from: 'now-24h', to: 'now' },
  { label: 'Last 2 days', from: 'now-2d', to: 'now' },
  { label: 'Last 7 days', from: 'now-7d', to: 'now' },
  { label: 'Last 30 days', from: 'now-30d', to: 'now' },
  { label: 'Last 90 days', from: 'now-90d', to: 'now' },
  { label: 'Last 6 months', from: 'now-6M', to: 'now' },
  { label: 'Last 1 year', from: 'now-1y', to: 'now' },
];

export function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick' | 'absolute'>('quick');
  
  const handleQuickSelect = (range: typeof quickRanges[0]) => {
    onChange({
      from: range.from,
      to: range.to,
      display: range.label
    });
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded hover:border-gray-600"
      >
        <Clock className="w-4 h-4 mr-2" />
        <span>{value.display}</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-96 bg-gray-800 border border-gray-700 rounded shadow-lg">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('quick')}
              className={`flex-1 px-4 py-2 text-sm ${
                activeTab === 'quick' ? 'bg-gray-700 text-white' : 'text-gray-400'
              }`}
            >
              Quick ranges
            </button>
            <button
              onClick={() => setActiveTab('absolute')}
              className={`flex-1 px-4 py-2 text-sm ${
                activeTab === 'absolute' ? 'bg-gray-700 text-white' : 'text-gray-400'
              }`}
            >
              Absolute time range
            </button>
          </div>
          
          {activeTab === 'quick' ? (
            <div className="grid grid-cols-2 gap-1 p-2">
              {quickRanges.map((range, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSelect(range)}
                  className="px-3 py-2 text-sm text-left hover:bg-gray-700 rounded"
                >
                  {range.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-1">From</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-sm"
                />
              </div>
              <div className="mb-4">
                <label className="block text-xs text-gray-400 mb-1">To</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded text-sm"
                />
              </div>
              <button
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              >
                Apply time range
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Day 5: Integration & Testing

### 5. Dashboard Header with Variables
```typescript
// src/components/dashboard/DashboardHeader.tsx
import React from 'react';
import { Variable } from '@/core/variables/VariableTypes';
import { VariableDropdown } from './VariableDropdown';
import { TimeRangePicker } from './TimeRangePicker';
import { RefreshPicker } from './RefreshPicker';
import { variableManager } from '@/core/variables/VariableManager';

interface DashboardHeaderProps {
  title: string;
  variables: Variable[];
  timeRange: any;
  onTimeRangeChange: (range: any) => void;
  refreshInterval: string;
  onRefreshIntervalChange: (interval: string) => void;
}

export function DashboardHeader({
  title,
  variables,
  timeRange,
  onTimeRangeChange,
  refreshInterval,
  onRefreshIntervalChange
}: DashboardHeaderProps) {
  const handleVariableChange = (variable: Variable, value: string | string[]) => {
    variableManager.updateVariable(variable.name, value);
  };
  
  return (
    <div className="dashboard-header bg-gray-900 border-b border-gray-800 px-4 py-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{title}</h1>
        
        <div className="flex items-center gap-4">
          {/* Variables */}
          <div className="flex items-center gap-3">
            {variables.map(variable => (
              <VariableDropdown
                key={variable.id}
                variable={variable}
                onChange={(value) => handleVariableChange(variable, value)}
              />
            ))}
          </div>
          
          {/* Time Controls */}
          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-700">
            <TimeRangePicker
              value={timeRange}
              onChange={onTimeRangeChange}
            />
            <RefreshPicker
              value={refreshInterval}
              onChange={onRefreshIntervalChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 6. Tests
```typescript
// src/core/variables/__tests__/VariableManager.test.ts
import { describe, it, expect } from 'vitest';
import { VariableManager } from '../VariableManager';
import { Variable } from '../VariableTypes';

describe('VariableManager', () => {
  it('should interpolate variables in queries', () => {
    const manager = new VariableManager();
    const variable: Variable = {
      id: '1',
      name: 'server',
      type: 'custom',
      current: { text: 'server1', value: 'server1', selected: true },
      options: []
    };
    
    manager.initializeVariables([variable]);
    
    const query = 'SELECT * FROM metrics WHERE host = "$server"';
    const interpolated = manager.interpolateQuery(query);
    
    expect(interpolated).toBe('SELECT * FROM metrics WHERE host = "server1"');
  });
  
  it('should support multiple value formatting', () => {
    const manager = new VariableManager();
    const variable: Variable = {
      id: '1',
      name: 'servers',
      type: 'custom',
      multi: true,
      current: { 
        text: 'server1 + server2', 
        value: ['server1', 'server2'], 
        selected: true 
      },
      options: []
    };
    
    manager.initializeVariables([variable]);
    
    expect(manager.interpolateQuery('$servers')).toBe('server1,server2');
    expect(manager.interpolateQuery('${servers:pipe}')).toBe('server1|server2');
    expect(manager.interpolateQuery('${servers:regex}')).toBe('(server1|server2)');
  });
});
```

---

## Day 6: Wire Everything Together

### 7. Update Dashboard Page
```typescript
// src/app/dashboards/[id]/page.tsx
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { variableManager } from '@/core/variables/VariableManager';

export default function DashboardPage({ params }: { params: { id: string } }) {
  const [dashboard, setDashboard] = useState(null);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [timeRange, setTimeRange] = useState({
    from: 'now-6h',
    to: 'now',
    display: 'Last 6 hours'
  });
  
  useEffect(() => {
    // Load dashboard
    loadDashboard(params.id).then(dash => {
      setDashboard(dash);
      
      // Initialize variables
      if (dash.templating?.list) {
        variableManager.initializeVariables(dash.templating.list);
      }
    });
    
    // Subscribe to variable changes
    const unsubscribe = variableManager.subscribe(setVariables);
    return unsubscribe;
  }, [params.id]);
  
  // Refresh panels when variables or time changes
  useEffect(() => {
    if (dashboard) {
      refreshPanels();
    }
  }, [variables, timeRange]);
  
  return (
    <div className="h-full flex flex-col">
      <DashboardHeader
        title={dashboard?.title || ''}
        variables={variables}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        refreshInterval={dashboard?.refresh || 'off'}
        onRefreshIntervalChange={handleRefreshChange}
      />
      
      <div className="flex-1 overflow-auto p-4">
        {/* Render panels with interpolated queries */}
        {dashboard?.panels.map(panel => (
          <PanelRenderer
            key={panel.id}
            panel={panel}
            variables={variables}
            timeRange={timeRange}
          />
        ))}
      </div>
    </div>
  );
}
```

---

## Success Checklist

### Variables
- [ ] All variable types implemented
- [ ] Variable interpolation working
- [ ] Variable dropdowns render correctly
- [ ] Multi-select variables work
- [ ] Include All option works
- [ ] Variables persist in dashboard JSON

### Time Controls
- [ ] Time range picker works
- [ ] Quick ranges available
- [ ] Custom time range input
- [ ] Refresh picker works
- [ ] Auto-refresh functionality

### Integration
- [ ] Variables update panel queries
- [ ] Time range affects all panels
- [ ] Dashboard header responsive
- [ ] Variables load from dashboard JSON
- [ ] Changes trigger panel refresh

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing complete
- [ ] No console errors
- [ ] Performance acceptable

---

## Common Issues & Solutions

### Issue: Variables not interpolating
```typescript
// Check variable is registered
console.log(variableManager.getVariable('myvar'));

// Check interpolation
console.log(variableManager.interpolateQuery('$myvar'));
```

### Issue: Time range not updating panels
```typescript
// Ensure panels subscribe to time changes
useEffect(() => {
  refetchData();
}, [timeRange]);
```

### Issue: Dropdown not closing
```typescript
// Add click outside handler
useEffect(() => {
  function handleClickOutside(event) {
    if (ref.current && !ref.current.contains(event.target)) {
      setIsOpen(false);
    }
  }
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);
```