# Analytics UI Corrections Guide

## Critical UI/UX Deviations to Fix

### 1. Top Navigation Bar Corrections

**Current Issue**: Missing Analytics's exact top navigation structure

**Required Implementation**:

```typescript
// src/components/Analytics-engine/layout/TopNavBar.tsx
import React from 'react';
import { 
  RefreshCw, 
  Maximize2, 
  Monitor, 
  Share2, 
  Star, 
  Settings,
  Save,
  ChevronDown,
  Clock
} from 'lucide-react';

export const TopNavBar: React.FC = () => {
  return (
    <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
      {/* Left Section - Dashboard Title & Actions */}
      <div className="flex items-center gap-3">
        {/* Dashboard Title Dropdown */}
        <button className="flex items-center gap-2 hover:bg-gray-700 px-3 py-1 rounded">
          <span className="text-white font-medium">Production Overview</span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
        
        {/* Star Button */}
        <button className="text-gray-400 hover:text-yellow-500 transition-colors">
          <Star className="w-5 h-5" />
        </button>
        
        {/* Share Button */}
        <button className="flex items-center gap-2 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">
          <Share2 className="w-4 h-4" />
          <span className="text-sm">Share</span>
        </button>
      </div>

      {/* Center Section - Time Range Picker */}
      <div className="flex items-center gap-2">
        <TimeRangePicker />
        <button className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Right Section - View Options */}
      <div className="flex items-center gap-2">
        {/* TV Mode */}
        <button className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded">
          <Monitor className="w-4 h-4" />
        </button>
        
        {/* Fullscreen */}
        <button className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded">
          <Maximize2 className="w-4 h-4" />
        </button>
        
        {/* Dashboard Settings */}
        <button className="flex items-center gap-2 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">
          <Settings className="w-4 h-4" />
          <span className="text-sm">Dashboard settings</span>
        </button>
        
        {/* Save Dashboard */}
        <button className="flex items-center gap-2 text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded">
          <Save className="w-4 h-4" />
          <span className="text-sm">Save dashboard</span>
        </button>
      </div>
    </div>
  );
};
```

### 2. Panel Chrome (Header) Corrections

**Current Issue**: Panels don't have Analytics's exact header structure

**Required Implementation**:

```typescript
// src/components/Analytics-engine/panels/PanelChrome.tsx
import React, { useState } from 'react';
import { 
  MoreVertical, 
  Eye, 
  Share2, 
  Maximize2, 
  Code, 
  Copy,
  Trash2,
  ChevronDown,
  Info
} from 'lucide-react';

interface PanelChromeProps {
  title: string;
  description?: string;
  onEdit?: () => void;
  onRemove?: () => void;
  onDuplicate?: () => void;
  onView?: () => void;
  transparent?: boolean;
  children: React.ReactNode;
}

export const PanelChrome: React.FC<PanelChromeProps> = ({
  title,
  description,
  onEdit,
  onRemove,
  onDuplicate,
  onView,
  transparent,
  children
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <div className={`
      panel-wrapper h-full flex flex-col
      ${transparent ? '' : 'bg-gray-850 border border-gray-700'}
      rounded
    `}>
      {/* Panel Header - Exact Analytics Style */}
      <div className="panel-header h-8 flex items-center justify-between px-2 border-b border-gray-700">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Title with dropdown indicator */}
          <button 
            onClick={onEdit}
            className="flex items-center gap-1 text-sm font-medium text-gray-200 hover:text-white"
          >
            <span className="truncate">{title}</span>
            <ChevronDown className="w-3 h-3 text-gray-500" />
          </button>
          
          {/* Info icon for description */}
          {description && (
            <button
              onMouseEnter={() => setInfoOpen(true)}
              onMouseLeave={() => setInfoOpen(false)}
              className="relative text-gray-500 hover:text-gray-300"
            >
              <Info className="w-3 h-3" />
              {infoOpen && (
                <div className="absolute top-6 left-0 z-50 bg-gray-800 border border-gray-700 rounded p-2 text-xs text-gray-300 w-64">
                  {description}
                </div>
              )}
            </button>
          )}
        </div>

        {/* Panel Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-700 rounded"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 top-6 z-50 bg-gray-800 border border-gray-700 rounded shadow-lg py-1 w-48">
              <button
                onClick={() => { onView?.(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <Eye className="w-4 h-4" />
                View
              </button>
              <button
                onClick={() => { onEdit?.(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <Settings className="w-4 h-4" />
                Edit
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
                <Code className="w-4 h-4" />
                Panel JSON
              </button>
              <div className="border-t border-gray-700 my-1" />
              <button
                onClick={() => { onDuplicate?.(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
                <Copy className="w-4 h-4" />
                Copy
              </button>
              <div className="border-t border-gray-700 my-1" />
              <button
                onClick={() => { onRemove?.(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Panel Content */}
      <div className="panel-content flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};
```

### 3. Dashboard Grid Corrections

**Current Issue**: Not using Analytics's exact grid system

**Required Implementation**:

```typescript
// src/components/Analytics-engine/dashboard/DashboardGrid.tsx
import React, { useState, useCallback } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { PanelChrome } from '../panels/PanelChrome';
import { PanelRenderer } from '../panels/PanelRenderer';

interface DashboardGridProps {
  panels: Panel[];
  onLayoutChange?: (panels: Panel[]) => void;
  isEditing?: boolean;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  panels,
  onLayoutChange,
  isEditing = false
}) => {
  // Analytics's exact grid settings
  const GRID_COLS = 24;
  const ROW_HEIGHT = 30;
  const GRID_MARGIN: [number, number] = [10, 10];
  
  const layouts = panels.map(panel => ({
    i: panel.id.toString(),
    x: panel.gridPos.x,
    y: panel.gridPos.y,
    w: panel.gridPos.w,
    h: panel.gridPos.h,
    minW: 3,
    minH: 3,
    static: !isEditing
  }));

  const handleLayoutChange = useCallback((layout: any[]) => {
    if (!onLayoutChange) return;
    
    const updatedPanels = panels.map(panel => {
      const layoutItem = layout.find(l => l.i === panel.id.toString());
      if (layoutItem) {
        return {
          ...panel,
          gridPos: {
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h
          }
        };
      }
      return panel;
    });
    
    onLayoutChange(updatedPanels);
  }, [panels, onLayoutChange]);

  return (
    <div className="dashboard-grid p-4">
      <GridLayout
        className="layout"
        layout={layouts}
        cols={GRID_COLS}
        rowHeight={ROW_HEIGHT}
        margin={GRID_MARGIN}
        containerPadding={[0, 0]}
        isDraggable={isEditing}
        isResizable={isEditing}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".panel-header"
        compactType={null}
        preventCollision={false}
      >
        {panels.map(panel => (
          <div key={panel.id} className="h-full">
            <PanelChrome
              title={panel.title}
              description={panel.description}
              onEdit={() => console.log('Edit panel', panel.id)}
              onRemove={() => console.log('Remove panel', panel.id)}
              transparent={panel.transparent}
            >
              <PanelRenderer panel={panel} />
            </PanelChrome>
          </div>
        ))}
      </GridLayout>
      
      {/* Add Panel Button - Analytics Style */}
      {isEditing && (
        <div className="mt-4">
          <button className="w-full h-24 border-2 border-dashed border-gray-700 hover:border-gray-500 rounded flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <Plus className="w-8 h-8 mr-2" />
            <span className="text-lg">Add panel</span>
          </button>
        </div>
      )}
    </div>
  );
};
```

### 4. Time Range Picker Corrections

**Current Issue**: Missing exact Analytics time range options

**Required Implementation**:

```typescript
// src/components/Analytics-engine/layout/TimeRangePicker.tsx
const QUICK_RANGES = [
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
  { label: 'Last 2 years', from: 'now-2y', to: 'now' },
  { label: 'Last 5 years', from: 'now-5y', to: 'now' },
  { label: 'Yesterday', from: 'now-1d/d', to: 'now-1d/d' },
  { label: 'Day before yesterday', from: 'now-2d/d', to: 'now-2d/d' },
  { label: 'This day last week', from: 'now-7d/d', to: 'now-7d/d' },
  { label: 'Previous week', from: 'now-1w/w', to: 'now-1w/w' },
  { label: 'Previous month', from: 'now-1M/M', to: 'now-1M/M' },
  { label: 'Previous year', from: 'now-1y/y', to: 'now-1y/y' },
  { label: 'Today', from: 'now/d', to: 'now/d' },
  { label: 'Today so far', from: 'now/d', to: 'now' },
  { label: 'This week', from: 'now/w', to: 'now/w' },
  { label: 'This week so far', from: 'now/w', to: 'now' },
  { label: 'This month', from: 'now/M', to: 'now/M' },
  { label: 'This month so far', from: 'now/M', to: 'now' },
  { label: 'This year', from: 'now/y', to: 'now/y' },
  { label: 'This year so far', from: 'now/y', to: 'now' }
];
```

### 5. Panel Types Missing

**Critical Missing Panels**:

```typescript
// src/components/Analytics-engine/panels/types/

// 1. Graph Panel (Time Series)
export const GraphPanel: React.FC<PanelProps> = ({ data, options }) => {
  // Implement using Recharts LineChart with Analytics styling
};

// 2. Singlestat Panel
export const SinglestatPanel: React.FC<PanelProps> = ({ data, options }) => {
  // Large single value with sparkline
};

// 3. Table Panel with Analytics features
export const TablePanel: React.FC<PanelProps> = ({ data, options }) => {
  // Sortable, filterable, with cell coloring
};

// 4. Text Panel (Markdown/HTML)
export const TextPanel: React.FC<PanelProps> = ({ options }) => {
  // Render markdown or HTML content
};

// 5. Dashboard List Panel
export const DashboardListPanel: React.FC<PanelProps> = ({ options }) => {
  // List of dashboards with search
};

// 6. Plugin Panel Wrapper
export const PluginPanel: React.FC<PanelProps> = ({ plugin, data, options }) => {
  // Dynamic panel loading
};
```

### 6. Color Scheme Corrections

**Analytics's Exact Colors**:

```css
/* src/styles/manufacturingPlatform-theme.css */
:root {
  /* Backgrounds */
  --manufacturingPlatform-bg-0: #0b0c0e;      /* Darkest */
  --manufacturingPlatform-bg-1: #111217;      /* Page background */
  --manufacturingPlatform-bg-2: #1f1f23;      /* Panel background */
  --manufacturingPlatform-bg-3: #26262b;      /* Hover states */
  
  /* Borders */
  --manufacturingPlatform-border-0: #000000;
  --manufacturingPlatform-border-1: #1f1f23;
  --manufacturingPlatform-border-2: #34343b;
  
  /* Text */
  --manufacturingPlatform-text: #d8d9da;
  --manufacturingPlatform-text-weak: #9fa0a2;
  --manufacturingPlatform-text-disabled: #6e7072;
  
  /* Primary colors */
  --manufacturingPlatform-primary: #3871dc;
  --manufacturingPlatform-primary-shade: #1f60c4;
  
  /* Status colors */
  --manufacturingPlatform-success: #1a7f4b;
  --manufacturingPlatform-warning: #ff9830;
  --manufacturingPlatform-error: #e02f44;
}
```

### 7. Missing Core Features Implementation Priority

1. **Variables System** (CRITICAL)
   - Query variables
   - Custom variables
   - Interval variables
   - Constant variables
   - Chained variables

2. **Panel Edit Mode** (CRITICAL)
   - In-panel query editor
   - Visualization switcher
   - Panel options
   - Transform data

3. **Dashboard Settings Modal** (HIGH)
   - General settings
   - Variables
   - Annotations
   - Links
   - Versions
   - Permissions
   - JSON Model

4. **Explore Mode** (HIGH)
   - Split view
   - Query history
   - Log context
   - Live tailing

5. **Import/Export** (HIGH)
   - JSON import
   - Analytics.com import
   - Export with/without data

### 8. API Endpoint Corrections

```typescript
// Required Analytics-compatible API endpoints

// Dashboard API
app.get('/api/dashboards/uid/:uid', getDashboardByUID);
app.get('/api/dashboards/id/:id', getDashboardByID);
app.post('/api/dashboards/db', saveDashboard);
app.delete('/api/dashboards/uid/:uid', deleteDashboard);

// Search API
app.get('/api/search', searchDashboards);

// Folder API
app.get('/api/folders', getFolders);
app.post('/api/folders', createFolder);

// Data Source API
app.get('/api/datasources', getDataSources);
app.post('/api/datasources', createDataSource);
app.put('/api/datasources/:id', updateDataSource);
app.delete('/api/datasources/:id', deleteDataSource);
app.post('/api/datasources/proxy/:id/*', proxyDataSourceRequest);

// Query API
app.post('/api/ds/query', executeQueries);

// Annotations API
app.get('/api/annotations', getAnnotations);
app.post('/api/annotations', createAnnotation);

// Alert API
app.get('/api/alerts', getAlerts);
app.get('/api/alert-notifications', getAlertNotifications);
```

## Validation Checklist

- [ ] Sidebar collapses exactly like Analytics
- [ ] Time picker has all Analytics ranges
- [ ] Panels have exact header chrome
- [ ] Dashboard grid is 24 columns
- [ ] Panel resize/drag handles match
- [ ] Color scheme matches exactly
- [ ] Keyboard shortcuts work (e.g., 'd d' for dashboards)
- [ ] URL structure matches (/d/:uid/:slug)
- [ ] Panel fullscreen mode works
- [ ] TV/Kiosk mode implemented
- [ ] All panel types available
- [ ] Variables dropdown in nav
- [ ] Save/Save As functionality
- [ ] Dashboard settings modal
- [ ] Panel edit experience matches

## Testing for Parity

```typescript
// Visual regression test
it('should match Analytics UI exactly', async () => {
  const manufacturingPlatformScreenshot = await page.screenshot({ path: 'manufacturingPlatform-reference.png' });
  const ourScreenshot = await page.screenshot({ path: 'our-implementation.png' });
  
  const diff = await compareImages(manufacturingPlatformScreenshot, ourScreenshot);
  expect(diff.misMatchPercentage).toBeLessThan(5);
});
```