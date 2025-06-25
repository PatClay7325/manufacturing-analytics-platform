import { useEffect, useRef } from 'react';
import { KeyboardShortcut } from '@/types/help';
import { keyboardManager } from '@/lib/keyboard/KeyboardShortcutManager';

interface UseKeyboardShortcutOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  modifiers: string[] = [],
  options: UseKeyboardShortcutOptions = {}
) {
  const { enabled = true, preventDefault = true, stopPropagation = true } = options;
  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const shortcut: KeyboardShortcut = {
      id: `hook-${key}-${modifiers.join('-')}`,
      key,
      modifiers: modifiers as ('ctrl' | 'alt' | 'shift' | 'meta')[],
      description: 'Hook-registered shortcut',
      category: 'custom',
      action: () => callbackRef.current(),
      enabled: true
    };

    keyboardManager.registerShortcut(shortcut);

    return () => {
      keyboardManager.unregisterShortcut(shortcut.id);
    };
  }, [key, modifiers, enabled]);
}

// Hook for registering multiple shortcuts at once
export function useKeyboardShortcuts(
  shortcuts: Array<{
    key: string;
    modifiers?: string[];
    callback: () => void;
    description?: string;
  }>,
  options: UseKeyboardShortcutOptions = {}
) {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const registeredShortcuts: KeyboardShortcut[] = shortcuts.map((shortcut, index) => ({
      id: `hook-multi-${index}-${shortcut.key}-${(shortcut.modifiers || []).join('-')}`,
      key: shortcut.key,
      modifiers: (shortcut.modifiers || []) as ('ctrl' | 'alt' | 'shift' | 'meta')[],
      description: shortcut.description || 'Hook-registered shortcut',
      category: 'custom',
      action: shortcut.callback,
      enabled: true
    }));

    keyboardManager.registerShortcuts(registeredShortcuts);

    return () => {
      registeredShortcuts.forEach(shortcut => {
        keyboardManager.unregisterShortcut(shortcut.id);
      });
    };
  }, [shortcuts, enabled]);
}

// Hook for listening to keyboard events
export function useKeyboardEvent(
  eventName: string,
  callback: (event: CustomEvent) => void
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handler = (event: Event) => {
      callbackRef.current(event as CustomEvent);
    };

    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [eventName]);
}

// Hook for panel-specific shortcuts
export function usePanelShortcuts(panelId: string) {
  useKeyboardEvent('keyboard-edit-panel', (event) => {
    const focusedPanel = document.querySelector('[data-panel-focused="true"]');
    if (focusedPanel?.getAttribute('data-panel-id') === panelId) {
      // Handle edit
      const editButton = focusedPanel.querySelector('[data-action="edit"]') as HTMLElement;
      editButton?.click();
    }
  });

  useKeyboardEvent('keyboard-view-panel', (event) => {
    const focusedPanel = document.querySelector('[data-panel-focused="true"]');
    if (focusedPanel?.getAttribute('data-panel-id') === panelId) {
      // Handle view
      const viewButton = focusedPanel.querySelector('[data-action="view"]') as HTMLElement;
      viewButton?.click();
    }
  });

  useKeyboardEvent('keyboard-duplicate-panel', (event) => {
    const focusedPanel = document.querySelector('[data-panel-focused="true"]');
    if (focusedPanel?.getAttribute('data-panel-id') === panelId) {
      // Handle duplicate
      const duplicateButton = focusedPanel.querySelector('[data-action="duplicate"]') as HTMLElement;
      duplicateButton?.click();
    }
  });

  useKeyboardEvent('keyboard-remove-panel', (event) => {
    const focusedPanel = document.querySelector('[data-panel-focused="true"]');
    if (focusedPanel?.getAttribute('data-panel-id') === panelId) {
      // Handle remove
      const removeButton = focusedPanel.querySelector('[data-action="remove"]') as HTMLElement;
      removeButton?.click();
    }
  });

  useKeyboardEvent('keyboard-share-panel', (event) => {
    const focusedPanel = document.querySelector('[data-panel-focused="true"]');
    if (focusedPanel?.getAttribute('data-panel-id') === panelId) {
      // Handle share
      const shareButton = focusedPanel.querySelector('[data-action="share"]') as HTMLElement;
      shareButton?.click();
    }
  });
}

// Hook for dashboard shortcuts
export function useDashboardShortcuts() {
  useKeyboardEvent('keyboard-save-requested', () => {
    const saveButton = document.querySelector('[data-action="save-dashboard"]') as HTMLElement;
    saveButton?.click();
  });

  useKeyboardEvent('keyboard-refresh-requested', () => {
    const refreshButton = document.querySelector('[data-action="refresh-dashboard"]') as HTMLElement;
    refreshButton?.click();
  });

  useKeyboardEvent('keyboard-toggle-kiosk', () => {
    document.documentElement.requestFullscreen?.();
  });

  useKeyboardEvent('keyboard-zoom-time-range', (event) => {
    const direction = event.detail?.direction;
    // Implement zoom logic
  });

  useKeyboardEvent('keyboard-shift-time-range', (event) => {
    const direction = event.detail?.direction;
    // Implement shift logic
  });
}