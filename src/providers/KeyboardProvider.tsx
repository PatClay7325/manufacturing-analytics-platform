'use client';

import React, { useEffect, useState } from 'react';
import { keyboardManager } from '@/lib/keyboard/KeyboardShortcutManager';
import { sequenceDetector, defaultSequences } from '@/lib/keyboard/SequenceDetector';
import { defaultShortcuts, defaultContexts } from '@/lib/keyboard/defaultShortcuts';
import { CommandPalette } from '@/components/common/CommandPalette';
import { useRouter } from 'next/navigation';

interface KeyboardProviderProps {
  children: React.ReactNode;
}

export function KeyboardProvider({ children }: KeyboardProviderProps) {
  const router = useRouter();
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    // Register default contexts
    defaultContexts.forEach(context => {
      keyboardManager.registerContext(context);
    });

    // Register default shortcuts
    keyboardManager.registerShortcuts(defaultShortcuts);

    // Register default sequences
    sequenceDetector.registerSequences(defaultSequences);

    // Activate global context
    keyboardManager.activateContext('global');

    // Listen for custom events
    const handleOpenCommandPalette = () => setShowCommandPalette(true);
    const handleToggleTheme = () => {
      const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', newTheme);
    };

    const handleSaveRequested = () => {
      // Dispatch save event for current context
      const saveEvent = new CustomEvent('keyboard-save-requested', {
        detail: { timestamp: Date.now() }
      });
      window.dispatchEvent(saveEvent);
    };

    const handleEscape = () => {
      // Close any open modals/dialogs
      const escapeEvent = new CustomEvent('keyboard-escape-pressed', {
        detail: { timestamp: Date.now() }
      });
      window.dispatchEvent(escapeEvent);
    };

    const handleRefreshData = () => {
      // Refresh data in current context
      const refreshEvent = new CustomEvent('keyboard-refresh-requested', {
        detail: { timestamp: Date.now() }
      });
      window.dispatchEvent(refreshEvent);
    };

    const handleToggleHelp = () => {
      const helpEvent = new CustomEvent('toggle-help');
      window.dispatchEvent(helpEvent);
    };

    const handleShowKeyboardShortcuts = () => {
      const shortcutsEvent = new CustomEvent('show-keyboard-shortcuts');
      window.dispatchEvent(shortcutsEvent);
    };

    // Time range events
    const handleToggleTimePicker = () => {
      const event = new CustomEvent('toggle-time-picker');
      window.dispatchEvent(event);
    };

    const handleZoomTimeRange = (e: CustomEvent) => {
      const event = new CustomEvent('keyboard-zoom-time-range', {
        detail: e.detail
      });
      window.dispatchEvent(event);
    };

    const handleShiftTimeRange = (e: CustomEvent) => {
      const event = new CustomEvent('keyboard-shift-time-range', {
        detail: e.detail
      });
      window.dispatchEvent(event);
    };

    // Panel events
    const handleEditPanel = () => {
      const event = new CustomEvent('keyboard-edit-panel');
      window.dispatchEvent(event);
    };

    const handleViewPanel = () => {
      const event = new CustomEvent('keyboard-view-panel');
      window.dispatchEvent(event);
    };

    const handleDuplicatePanel = () => {
      const event = new CustomEvent('keyboard-duplicate-panel');
      window.dispatchEvent(event);
    };

    const handleRemovePanel = () => {
      const event = new CustomEvent('keyboard-remove-panel');
      window.dispatchEvent(event);
    };

    const handleSharePanel = () => {
      const event = new CustomEvent('keyboard-share-panel');
      window.dispatchEvent(event);
    };

    const handleToggleKiosk = () => {
      const event = new CustomEvent('keyboard-toggle-kiosk');
      window.dispatchEvent(event);
    };

    // Editor events
    const handleRunQueries = () => {
      const event = new CustomEvent('keyboard-run-queries');
      window.dispatchEvent(event);
    };

    const handleTogglePanelOptions = () => {
      const event = new CustomEvent('keyboard-toggle-panel-options');
      window.dispatchEvent(event);
    };

    const handleToggleVisualizationPicker = () => {
      const event = new CustomEvent('keyboard-toggle-visualization-picker');
      window.dispatchEvent(event);
    };

    // Subscribe to events
    window.addEventListener('open-command-palette', handleOpenCommandPalette);
    window.addEventListener('toggle-theme', handleToggleTheme);
    window.addEventListener('save-requested', handleSaveRequested);
    window.addEventListener('escape-pressed', handleEscape);
    window.addEventListener('refresh-all-data', handleRefreshData);
    window.addEventListener('toggle-help', handleToggleHelp);
    window.addEventListener('show-keyboard-shortcuts', handleShowKeyboardShortcuts);
    window.addEventListener('toggle-time-picker', handleToggleTimePicker);
    window.addEventListener('zoom-time-range', handleZoomTimeRange as EventListener);
    window.addEventListener('shift-time-range', handleShiftTimeRange as EventListener);
    window.addEventListener('edit-panel', handleEditPanel);
    window.addEventListener('view-panel', handleViewPanel);
    window.addEventListener('duplicate-panel', handleDuplicatePanel);
    window.addEventListener('remove-panel', handleRemovePanel);
    window.addEventListener('share-panel', handleSharePanel);
    window.addEventListener('toggle-kiosk-mode', handleToggleKiosk);
    window.addEventListener('run-queries', handleRunQueries);
    window.addEventListener('toggle-panel-options', handleTogglePanelOptions);
    window.addEventListener('toggle-visualization-picker', handleToggleVisualizationPicker);

    // Check URL and activate appropriate contexts
    const checkContexts = () => {
      const path = window.location.pathname;
      
      // Dashboard context
      if (path.includes('/dashboard') || path.includes('/d/')) {
        keyboardManager.activateContext('dashboard');
      } else {
        keyboardManager.deactivateContext('dashboard');
      }

      // Editor context
      if (path.includes('/edit') || document.querySelector('.panel-editor')) {
        keyboardManager.activateContext('editor');
      } else {
        keyboardManager.deactivateContext('editor');
      }

      // Explore context
      if (path.includes('/explore')) {
        keyboardManager.activateContext('explore');
      } else {
        keyboardManager.deactivateContext('explore');
      }
    };

    checkContexts();
    
    // Listen for route changes
    const observer = new MutationObserver(checkContexts);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      // Cleanup
      window.removeEventListener('open-command-palette', handleOpenCommandPalette);
      window.removeEventListener('toggle-theme', handleToggleTheme);
      window.removeEventListener('save-requested', handleSaveRequested);
      window.removeEventListener('escape-pressed', handleEscape);
      window.removeEventListener('refresh-all-data', handleRefreshData);
      window.removeEventListener('toggle-help', handleToggleHelp);
      window.removeEventListener('show-keyboard-shortcuts', handleShowKeyboardShortcuts);
      window.removeEventListener('toggle-time-picker', handleToggleTimePicker);
      window.removeEventListener('zoom-time-range', handleZoomTimeRange as EventListener);
      window.removeEventListener('shift-time-range', handleShiftTimeRange as EventListener);
      window.removeEventListener('edit-panel', handleEditPanel);
      window.removeEventListener('view-panel', handleViewPanel);
      window.removeEventListener('duplicate-panel', handleDuplicatePanel);
      window.removeEventListener('remove-panel', handleRemovePanel);
      window.removeEventListener('share-panel', handleSharePanel);
      window.removeEventListener('toggle-kiosk-mode', handleToggleKiosk);
      window.removeEventListener('run-queries', handleRunQueries);
      window.removeEventListener('toggle-panel-options', handleTogglePanelOptions);
      window.removeEventListener('toggle-visualization-picker', handleToggleVisualizationPicker);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {children}
      <CommandPalette 
        isOpen={showCommandPalette} 
        onClose={() => setShowCommandPalette(false)} 
      />
    </>
  );
}