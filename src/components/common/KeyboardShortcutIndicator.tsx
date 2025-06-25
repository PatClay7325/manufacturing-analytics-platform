'use client';

import React, { useEffect, useState } from 'react';
import { keyboardManager } from '@/lib/keyboard/KeyboardShortcutManager';
import { KeyboardShortcut } from '@/types/help';

interface KeyboardShortcutIndicatorProps {
  shortcutId?: string;
  shortcut?: KeyboardShortcut;
  className?: string;
  showDescription?: boolean;
}

export function KeyboardShortcutIndicator({ 
  shortcutId, 
  shortcut: propShortcut, 
  className = '',
  showDescription = false
}: KeyboardShortcutIndicatorProps) {
  const [shortcut, setShortcut] = useState<KeyboardShortcut | undefined>(propShortcut);

  useEffect(() => {
    if (shortcutId && !propShortcut) {
      const s = keyboardManager.getShortcut(shortcutId);
      setShortcut(s);
    }
  }, [shortcutId, propShortcut]);

  if (!shortcut) return null;

  const formatKey = (key: string) => {
    const keyMap: { [key: string]: string } = {
      'ArrowUp': '↑',
      'ArrowDown': '↓',
      'ArrowLeft': '←',
      'ArrowRight': '→',
      'Enter': '⏎',
      'Escape': 'Esc',
      ' ': 'Space'
    };
    
    return keyMap[key] || key.toUpperCase();
  };

  const formatModifiers = (modifiers?: string[]) => {
    if (!modifiers || modifiers.length === 0) return [];
    
    const modifierMap: { [key: string]: string } = {
      'ctrl': window.navigator.platform.includes('Mac') ? '⌘' : 'Ctrl',
      'alt': window.navigator.platform.includes('Mac') ? '⌥' : 'Alt',
      'shift': '⇧',
      'meta': '⌘'
    };
    
    return modifiers.map(mod => modifierMap[mod] || mod);
  };

  const modifiers = formatModifiers(shortcut.modifiers);

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {showDescription && (
        <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">
          {shortcut.description}:
        </span>
      )}
      <span className="inline-flex items-center gap-0.5">
        {modifiers.map((mod, index) => (
          <React.Fragment key={mod}>
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
              {mod}
            </kbd>
            {index < modifiers.length - 1 && (
              <span className="text-gray-400 text-xs">+</span>
            )}
          </React.Fragment>
        ))}
        {modifiers.length > 0 && (
          <span className="text-gray-400 text-xs">+</span>
        )}
        <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
          {formatKey(shortcut.key)}
        </kbd>
      </span>
    </span>
  );
}

// Component to show shortcut hints on hover
interface ShortcutHintProps {
  shortcutId: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function ShortcutHint({ shortcutId, children, position = 'top' }: ShortcutHintProps) {
  const [showHint, setShowHint] = useState(false);
  const [shortcut, setShortcut] = useState<KeyboardShortcut | undefined>();

  useEffect(() => {
    const s = keyboardManager.getShortcut(shortcutId);
    setShortcut(s);
  }, [shortcutId]);

  if (!shortcut) return <>{children}</>;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShowHint(true)}
      onMouseLeave={() => setShowHint(false)}
    >
      {children}
      {showHint && (
        <div className={`absolute ${positionClasses[position]} z-50 pointer-events-none`}>
          <div className="bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            <KeyboardShortcutIndicator shortcut={shortcut} />
          </div>
        </div>
      )}
    </div>
  );
}

// Visual feedback when a shortcut is triggered
export function KeyboardShortcutFeedback() {
  const [triggeredShortcut, setTriggeredShortcut] = useState<KeyboardShortcut | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleShortcut = (shortcut: KeyboardShortcut) => {
      setTriggeredShortcut(shortcut);
      setShow(true);
      
      setTimeout(() => {
        setShow(false);
      }, 2000);
    };

    keyboardManager.addListener(handleShortcut);
    return () => keyboardManager.removeListener(handleShortcut);
  }, []);

  if (!show || !triggeredShortcut) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 animate-slide-up">
      <div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
        <span className="text-sm">{triggeredShortcut.description}</span>
        <KeyboardShortcutIndicator shortcut={triggeredShortcut} />
      </div>
    </div>
  );
}

// Add CSS animation
const styles = `
@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}