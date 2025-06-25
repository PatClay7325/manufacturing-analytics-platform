import { KeyboardShortcut } from '@/types/help';
import { ShortcutContext } from './KeyboardShortcutManager';

// Default contexts
export const defaultContexts: ShortcutContext[] = [
  {
    id: 'global',
    name: 'Global',
    priority: 0,
    isActive: () => true
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    priority: 10,
    isActive: () => {
      if (typeof window === 'undefined') return false;
      return window.location.pathname.includes('/dashboard') || 
             window.location.pathname.includes('/d/');
    }
  },
  {
    id: 'editor',
    name: 'Editor',
    priority: 20,
    isActive: () => {
      if (typeof window === 'undefined') return false;
      return window.location.pathname.includes('/edit') ||
             document.querySelector('.panel-editor') !== null;
    }
  },
  {
    id: 'explore',
    name: 'Explore',
    priority: 10,
    isActive: () => {
      if (typeof window === 'undefined') return false;
      return window.location.pathname.includes('/explore');
    }
  },
  {
    id: 'table',
    name: 'Table',
    priority: 15,
    isActive: () => {
      if (typeof window === 'undefined') return false;
      return document.activeElement?.closest('table') !== null ||
             document.activeElement?.closest('[role="grid"]') !== null;
    }
  }
];

// Global Navigation Shortcuts
export const globalNavigationShortcuts: KeyboardShortcut[] = [
  {
    id: 'search-command-palette',
    key: 'k',
    modifiers: ['ctrl'],
    description: 'Open search / command palette',
    category: 'global',
    action: () => {
      const event = new CustomEvent('open-command-palette');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'go-home',
    key: 'h',
    modifiers: [],
    description: 'Go to home (press g then h)',
    category: 'global',
    action: () => {
      // This will be handled by the sequence detector
    }
  },
  {
    id: 'go-dashboards',
    key: 'd',
    modifiers: [],
    description: 'Go to dashboards (press g then d)',
    category: 'global',
    action: () => {
      // This will be handled by the sequence detector
    }
  },
  {
    id: 'go-explore',
    key: 'e',
    modifiers: [],
    description: 'Go to explore (press g then e)',
    category: 'global',
    action: () => {
      // This will be handled by the sequence detector
    }
  },
  {
    id: 'go-alerting',
    key: 'a',
    modifiers: [],
    description: 'Go to alerting (press g then a)',
    category: 'global',
    action: () => {
      // This will be handled by the sequence detector
    }
  },
  {
    id: 'go-configuration',
    key: 'c',
    modifiers: [],
    description: 'Go to configuration (press g then c)',
    category: 'global',
    action: () => {
      // This will be handled by the sequence detector
    }
  },
  {
    id: 'go-profile',
    key: 'p',
    modifiers: [],
    description: 'Go to profile (press g then p)',
    category: 'global',
    action: () => {
      // This will be handled by the sequence detector
    }
  },
  {
    id: 'toggle-help',
    key: '?',
    modifiers: [],
    description: 'Show help',
    category: 'global',
    action: () => {
      const event = new CustomEvent('toggle-help');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'show-shortcuts',
    key: '?',
    modifiers: ['shift'],
    description: 'Show keyboard shortcuts',
    category: 'global',
    action: () => {
      const event = new CustomEvent('show-keyboard-shortcuts');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'toggle-theme',
    key: 't',
    modifiers: [],
    description: 'Toggle theme (press t then t)',
    category: 'global',
    action: () => {
      // This will be handled by the sequence detector
    }
  },
  {
    id: 'escape',
    key: 'Escape',
    modifiers: [],
    description: 'Close dialogs/panels',
    category: 'global',
    action: () => {
      const event = new CustomEvent('escape-pressed');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'save',
    key: 's',
    modifiers: ['ctrl'],
    description: 'Save current item',
    category: 'global',
    action: () => {
      const event = new CustomEvent('save-requested');
      window.dispatchEvent(event);
    }
  }
];

// Dashboard Shortcuts
export const dashboardShortcuts: KeyboardShortcut[] = [
  {
    id: 'toggle-kiosk',
    key: 'F11',
    modifiers: [],
    description: 'Toggle kiosk/TV mode',
    category: 'dashboard',
    action: () => {
      const event = new CustomEvent('toggle-kiosk-mode');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'focus-panel-search',
    key: 'f',
    modifiers: [],
    description: 'Focus panel search',
    category: 'dashboard',
    action: () => {
      const searchInput = document.querySelector('[data-testid="panel-search"]') as HTMLInputElement;
      searchInput?.focus();
    }
  },
  {
    id: 'refresh-all',
    key: 'r',
    modifiers: [],
    description: 'Refresh all panels (press e then r)',
    category: 'dashboard',
    action: () => {
      // This will be handled by the sequence detector
    }
  },
  {
    id: 'toggle-time-picker',
    key: 't',
    modifiers: [],
    description: 'Open time range picker',
    category: 'dashboard',
    action: () => {
      const event = new CustomEvent('toggle-time-picker');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'zoom-out',
    key: 'z',
    modifiers: ['ctrl'],
    description: 'Zoom out time range',
    category: 'dashboard',
    action: () => {
      const event = new CustomEvent('zoom-time-range', { detail: { direction: 'out' } });
      window.dispatchEvent(event);
    }
  },
  {
    id: 'shift-time-left',
    key: 'Left',
    modifiers: ['shift'],
    description: 'Shift time range left',
    category: 'dashboard',
    action: () => {
      const event = new CustomEvent('shift-time-range', { detail: { direction: 'left' } });
      window.dispatchEvent(event);
    }
  },
  {
    id: 'shift-time-right',
    key: 'Right',
    modifiers: ['shift'],
    description: 'Shift time range right',
    category: 'dashboard',
    action: () => {
      const event = new CustomEvent('shift-time-range', { detail: { direction: 'right' } });
      window.dispatchEvent(event);
    }
  },
  {
    id: 'toggle-fullscreen-panel',
    key: 'v',
    modifiers: [],
    description: 'View panel in fullscreen',
    category: 'dashboard',
    action: () => {
      const event = new CustomEvent('toggle-panel-fullscreen');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'edit-panel',
    key: 'e',
    modifiers: [],
    description: 'Edit panel',
    category: 'dashboard',
    action: () => {
      const event = new CustomEvent('edit-panel');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'share-panel',
    key: 's',
    modifiers: ['shift'],
    description: 'Share panel',
    category: 'dashboard',
    action: () => {
      const event = new CustomEvent('share-panel');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'duplicate-panel',
    key: 'd',
    modifiers: [],
    description: 'Duplicate panel (when focused)',
    category: 'dashboard',
    action: () => {
      const event = new CustomEvent('duplicate-panel');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'remove-panel',
    key: 'r',
    modifiers: [],
    description: 'Remove panel (when focused)',
    category: 'dashboard',
    action: () => {
      const event = new CustomEvent('remove-panel');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'toggle-legend',
    key: 'l',
    modifiers: ['shift'],
    description: 'Toggle all legends',
    category: 'dashboard',
    action: () => {
      const event = new CustomEvent('toggle-all-legends');
      window.dispatchEvent(event);
    }
  }
];

// Editor Shortcuts
export const editorShortcuts: KeyboardShortcut[] = [
  {
    id: 'run-query',
    key: 'Enter',
    modifiers: ['ctrl'],
    description: 'Run queries',
    category: 'editor',
    action: () => {
      const event = new CustomEvent('run-queries');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'toggle-query-history',
    key: 'h',
    modifiers: ['ctrl', 'shift'],
    description: 'Toggle query history',
    category: 'editor',
    action: () => {
      const event = new CustomEvent('toggle-query-history');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'toggle-panel-options',
    key: 'o',
    modifiers: ['ctrl'],
    description: 'Toggle panel options',
    category: 'editor',
    action: () => {
      const event = new CustomEvent('toggle-panel-options');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'toggle-visualization-picker',
    key: 'v',
    modifiers: ['ctrl', 'shift'],
    description: 'Toggle visualization picker',
    category: 'editor',
    action: () => {
      const event = new CustomEvent('toggle-visualization-picker');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'apply-changes',
    key: 'Enter',
    modifiers: ['ctrl'],
    description: 'Apply changes',
    category: 'editor',
    action: () => {
      const event = new CustomEvent('apply-editor-changes');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'discard-changes',
    key: 'Escape',
    modifiers: [],
    description: 'Discard changes and exit edit mode',
    category: 'editor',
    action: () => {
      const event = new CustomEvent('discard-editor-changes');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'toggle-query-inspector',
    key: 'i',
    modifiers: ['ctrl', 'shift'],
    description: 'Toggle query inspector',
    category: 'editor',
    action: () => {
      const event = new CustomEvent('toggle-query-inspector');
      window.dispatchEvent(event);
    }
  }
];

// Table/Data Shortcuts
export const tableShortcuts: KeyboardShortcut[] = [
  {
    id: 'navigate-up',
    key: 'Up',
    modifiers: [],
    description: 'Navigate up in table',
    category: 'table',
    action: () => {
      const event = new CustomEvent('table-navigate', { detail: { direction: 'up' } });
      window.dispatchEvent(event);
    }
  },
  {
    id: 'navigate-down',
    key: 'Down',
    modifiers: [],
    description: 'Navigate down in table',
    category: 'table',
    action: () => {
      const event = new CustomEvent('table-navigate', { detail: { direction: 'down' } });
      window.dispatchEvent(event);
    }
  },
  {
    id: 'navigate-left',
    key: 'Left',
    modifiers: [],
    description: 'Navigate left in table',
    category: 'table',
    action: () => {
      const event = new CustomEvent('table-navigate', { detail: { direction: 'left' } });
      window.dispatchEvent(event);
    }
  },
  {
    id: 'navigate-right',
    key: 'Right',
    modifiers: [],
    description: 'Navigate right in table',
    category: 'table',
    action: () => {
      const event = new CustomEvent('table-navigate', { detail: { direction: 'right' } });
      window.dispatchEvent(event);
    }
  },
  {
    id: 'copy-cell',
    key: 'c',
    modifiers: ['ctrl'],
    description: 'Copy cell data',
    category: 'table',
    action: () => {
      const event = new CustomEvent('table-copy-cell');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'export-data',
    key: 'e',
    modifiers: ['ctrl', 'shift'],
    description: 'Export table data',
    category: 'table',
    action: () => {
      const event = new CustomEvent('table-export');
      window.dispatchEvent(event);
    }
  },
  {
    id: 'sort-column',
    key: 'Enter',
    modifiers: [],
    description: 'Sort column (when header focused)',
    category: 'table',
    action: () => {
      const event = new CustomEvent('table-sort-column');
      window.dispatchEvent(event);
    }
  }
];

// All default shortcuts
export const defaultShortcuts: KeyboardShortcut[] = [
  ...globalNavigationShortcuts,
  ...dashboardShortcuts,
  ...editorShortcuts,
  ...tableShortcuts
];