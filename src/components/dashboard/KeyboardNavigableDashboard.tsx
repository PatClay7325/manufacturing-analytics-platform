'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useKeyboardShortcut, useDashboardShortcuts, useKeyboardEvent } from '@/hooks/useKeyboardShortcut';

interface KeyboardNavigableDashboardProps {
  dashboardId: string;
  children: React.ReactNode;
}

export function KeyboardNavigableDashboard({ dashboardId, children }: KeyboardNavigableDashboardProps) {
  const [selectedPanelIndex, setSelectedPanelIndex] = useState(-1);
  const panelsRef = useRef<HTMLElement[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use dashboard shortcuts
  useDashboardShortcuts();

  // Panel navigation with Tab
  useKeyboardShortcut('Tab', () => {
    const panels = containerRef.current?.querySelectorAll('[data-panel-id]');
    if (!panels || panels.length === 0) return;

    const nextIndex = (selectedPanelIndex + 1) % panels.length;
    setSelectedPanelIndex(nextIndex);
    
    // Focus the panel
    const panel = panels[nextIndex] as HTMLElement;
    panel.focus();
    panel.setAttribute('data-panel-focused', 'true');
    
    // Remove focus from other panels
    panels.forEach((p, i) => {
      if (i !== nextIndex) {
        p.setAttribute('data-panel-focused', 'false');
      }
    });
  });

  // Panel navigation with Shift+Tab
  useKeyboardShortcut('Tab', () => {
    const panels = containerRef.current?.querySelectorAll('[data-panel-id]');
    if (!panels || panels.length === 0) return;

    const prevIndex = selectedPanelIndex === -1 
      ? panels.length - 1 
      : (selectedPanelIndex - 1 + panels.length) % panels.length;
    
    setSelectedPanelIndex(prevIndex);
    
    // Focus the panel
    const panel = panels[prevIndex] as HTMLElement;
    panel.focus();
    panel.setAttribute('data-panel-focused', 'true');
    
    // Remove focus from other panels
    panels.forEach((p, i) => {
      if (i !== prevIndex) {
        p.setAttribute('data-panel-focused', 'false');
      }
    });
  }, ['shift']);

  // Listen for time range events
  useKeyboardEvent('toggle-time-picker', () => {
    const timePicker = document.querySelector('[data-testid="time-picker"]') as HTMLElement;
    timePicker?.click();
  });

  useKeyboardEvent('keyboard-zoom-time-range', (event) => {
    const direction = event.detail?.direction;
    console.log('Zoom time range:', direction);
    // Implement zoom logic based on your time range component
  });

  useKeyboardEvent('keyboard-shift-time-range', (event) => {
    const direction = event.detail?.direction;
    console.log('Shift time range:', direction);
    // Implement shift logic based on your time range component
  });

  // Focus search when 'f' is pressed
  useKeyboardShortcut('f', () => {
    const searchInput = document.querySelector('[data-testid="panel-search"]') as HTMLInputElement;
    searchInput?.focus();
  });

  // Full screen toggle
  useKeyboardShortcut('F11', () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });

  // Add visual indicators for keyboard navigation
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const panel = (e.target as HTMLElement).closest('[data-panel-id]');
      if (panel) {
        panel.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const panel = (e.target as HTMLElement).closest('[data-panel-id]');
      if (panel) {
        panel.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="keyboard-navigable-dashboard"
      data-dashboard-id={dashboardId}
    >
      {/* Keyboard navigation indicator */}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
        <div className="bg-gray-900 dark:bg-gray-800 text-white px-3 py-1 rounded-lg text-sm opacity-0 transition-opacity duration-300 keyboard-hint">
          Press <kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs">Tab</kbd> to navigate panels
        </div>
      </div>
      
      {children}
    </div>
  );
}

// Panel wrapper that supports keyboard navigation
interface KeyboardNavigablePanelProps {
  panelId: string;
  children: React.ReactNode;
}

export function KeyboardNavigablePanel({ panelId, children }: KeyboardNavigablePanelProps) {
  // Listen for panel-specific shortcuts when focused
  useKeyboardEvent('keyboard-edit-panel', () => {
    const panel = document.querySelector(`[data-panel-id="${panelId}"]`);
    if (panel?.getAttribute('data-panel-focused') === 'true') {
      console.log('Edit panel:', panelId);
      // Trigger edit action
    }
  });

  useKeyboardEvent('keyboard-view-panel', () => {
    const panel = document.querySelector(`[data-panel-id="${panelId}"]`);
    if (panel?.getAttribute('data-panel-focused') === 'true') {
      console.log('View panel:', panelId);
      // Trigger view action
    }
  });

  useKeyboardEvent('keyboard-duplicate-panel', () => {
    const panel = document.querySelector(`[data-panel-id="${panelId}"]`);
    if (panel?.getAttribute('data-panel-focused') === 'true') {
      console.log('Duplicate panel:', panelId);
      // Trigger duplicate action
    }
  });

  useKeyboardEvent('keyboard-remove-panel', () => {
    const panel = document.querySelector(`[data-panel-id="${panelId}"]`);
    if (panel?.getAttribute('data-panel-focused') === 'true') {
      if (confirm('Remove this panel?')) {
        console.log('Remove panel:', panelId);
        // Trigger remove action
      }
    }
  });

  return (
    <div
      data-panel-id={panelId}
      data-panel-focused="false"
      tabIndex={0}
      className="panel keyboard-navigable-panel focus:outline-none transition-all"
      role="region"
      aria-label={`Panel ${panelId}`}
    >
      {children}
    </div>
  );
}