'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Keyboard, Command, Search, X, Settings, RotateCcw } from 'lucide-react';
import { KeyboardShortcut } from '@/types/help';
import { createPortal } from 'react-dom';
import { keyboardManager, ShortcutGroup } from '@/lib/keyboard/KeyboardShortcutManager';
import { defaultSequences } from '@/lib/keyboard/SequenceDetector';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCustomization, setShowCustomization] = useState(false);
  const [customizingShortcut, setCustomizingShortcut] = useState<KeyboardShortcut | null>(null);
  const [recordingKeys, setRecordingKeys] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<{ key: string; modifiers: string[] } | null>(null);

  // Get all shortcuts from the keyboard manager
  const allShortcutGroups = useMemo(() => keyboardManager.getAllShortcuts(), []);
  
  // Flatten shortcuts for filtering
  const allShortcuts = useMemo(() => {
    return allShortcutGroups.flatMap(group => group.shortcuts);
  }, [allShortcutGroups]);

  // Add sequences as virtual shortcuts
  const sequenceShortcuts: KeyboardShortcut[] = useMemo(() => {
    return defaultSequences.map(seq => ({
      id: `seq-${seq.keys.join('-')}`,
      key: seq.keys.join(' → '),
      modifiers: [],
      description: seq.description,
      category: 'Sequences',
      action: seq.action,
      enabled: true
    }));
  }, []);

  const allShortcutsWithSequences = [...allShortcuts, ...sequenceShortcuts];

  // Get unique categories
  const categories = Array.from(new Set(allShortcutsWithSequences.map(s => s.category)));
  
  const filteredShortcuts = allShortcutsWithSequences.filter(shortcut => {
    const matchesSearch = !searchQuery || 
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.key.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedCategory || shortcut.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const formatKey = (key: string) => {
    // Special key formatting
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
    if (!modifiers || modifiers.length === 0) return null;
    
    const modifierMap: { [key: string]: string } = {
      'ctrl': 'Ctrl',
      'alt': 'Alt',
      'shift': 'Shift',
      'meta': '⌘'
    };
    
    return modifiers.map(mod => modifierMap[mod] || mod);
  };

  // Handle key recording for customization
  const handleKeyRecord = useCallback((e: KeyboardEvent) => {
    if (!recordingKeys) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const modifiers: string[] = [];
    if (e.ctrlKey || e.metaKey) modifiers.push('ctrl');
    if (e.shiftKey) modifiers.push('shift');
    if (e.altKey) modifiers.push('alt');
    
    setRecordedKeys({
      key: e.key,
      modifiers
    });
    setRecordingKeys(false);
  }, [recordingKeys]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    if (recordingKeys) {
      handleKeyRecord(e);
      return;
    }
    
    if (e.key === 'Escape') {
      if (showCustomization) {
        setShowCustomization(false);
        setCustomizingShortcut(null);
        setRecordedKeys(null);
      } else {
        onClose();
      }
    }
  }, [isOpen, onClose, recordingKeys, showCustomization, handleKeyRecord]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Customization handlers
  const startCustomization = (shortcut: KeyboardShortcut) => {
    setCustomizingShortcut(shortcut);
    setShowCustomization(true);
    setRecordedKeys(null);
  };

  const saveCustomization = () => {
    if (customizingShortcut && recordedKeys) {
      // Check for conflicts
      const conflict = keyboardManager.hasConflict(recordedKeys.key, recordedKeys.modifiers);
      if (conflict && conflict.id !== customizingShortcut.id) {
        alert(`This shortcut conflicts with: ${conflict.description}`);
        return;
      }

      keyboardManager.customizeShortcut(customizingShortcut.id, {
        key: recordedKeys.key,
        modifiers: recordedKeys.modifiers
      });

      setShowCustomization(false);
      setCustomizingShortcut(null);
      setRecordedKeys(null);
    }
  };

  const resetShortcut = (shortcutId: string) => {
    keyboardManager.resetShortcut(shortcutId);
    setShowCustomization(false);
    setCustomizingShortcut(null);
    setRecordedKeys(null);
  };

  const resetAllShortcuts = () => {
    if (confirm('Are you sure you want to reset all keyboard shortcuts to defaults?')) {
      keyboardManager.resetAllShortcuts();
      window.location.reload(); // Refresh to apply changes
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose} 
        />
        
        <div className="inline-block align-bottom bg-white dark:bg-gray-900 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          {/* Header */}
          <div className="bg-white dark:bg-gray-900 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Keyboard className="h-6 w-6 text-gray-600 dark:text-gray-400 mr-3" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Keyboard Shortcuts
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetAllShortcuts}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group"
                  title="Reset all shortcuts"
                >
                  <RotateCcw className="h-4 w-4 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search shortcuts..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Shortcuts List */}
          <div className="px-6 py-4 max-h-96 overflow-y-auto">
            {categories.map(category => {
              const categoryShortcuts = filteredShortcuts.filter(s => s.category === category);
              
              if (categoryShortcuts.length === 0) return null;
              
              return (
                <div key={category} className="mb-6 last:mb-0">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {categoryShortcuts.map(shortcut => {
                      const isSequence = shortcut.id.startsWith('seq-');
                      const hasCustomization = !isSequence && keyboardManager.getShortcut(shortcut.id);
                      
                      return (
                        <div
                          key={shortcut.id}
                          className="group flex items-center justify-between py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {shortcut.description}
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              {formatModifiers(shortcut.modifiers)?.map((mod, index) => (
                                <React.Fragment key={mod}>
                                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                    {mod}
                                  </kbd>
                                  {index < (shortcut.modifiers?.length || 0) - 1 && (
                                    <span className="text-gray-400">+</span>
                                  )}
                                </React.Fragment>
                              ))}
                              {shortcut.modifiers && shortcut.modifiers.length > 0 && (
                                <span className="text-gray-400">+</span>
                              )}
                              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                {formatKey(shortcut.key)}
                              </kbd>
                            </div>
                            {!isSequence && (
                              <button
                                onClick={() => startCustomization(shortcut)}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-all"
                                title="Customize shortcut"
                              >
                                <Settings className="h-3 w-3 text-gray-500" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {filteredShortcuts.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No shortcuts found matching your search.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center">
                  <Command className="h-4 w-4 mr-1" />
                  Command key on Mac
                </span>
                <span>
                  Press <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">?</kbd> anytime for help
                </span>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customization Dialog */}
      {showCustomization && customizingShortcut && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setShowCustomization(false)}
          />
          <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Customize Shortcut
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {customizingShortcut.description}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Current: {formatModifiers(customizingShortcut.modifiers)?.join(' + ')} 
                {customizingShortcut.modifiers?.length ? ' + ' : ''}
                {formatKey(customizingShortcut.key)}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Shortcut
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={
                    recordedKeys
                      ? `${recordedKeys.modifiers.join(' + ')}${recordedKeys.modifiers.length ? ' + ' : ''}${recordedKeys.key}`
                      : ''
                  }
                  placeholder="Click to record shortcut..."
                  onClick={() => setRecordingKeys(true)}
                  className={`
                    w-full px-4 py-2 border rounded-lg cursor-pointer
                    ${recordingKeys 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-300 dark:border-gray-600'
                    }
                    dark:bg-gray-800 dark:text-gray-100
                  `}
                />
                {recordingKeys && (
                  <p className="absolute -bottom-6 left-0 text-xs text-blue-600 dark:text-blue-400">
                    Press any key combination...
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => resetShortcut(customizingShortcut.id)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-lg"
              >
                Reset to Default
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCustomization(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCustomization}
                  disabled={!recordedKeys}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

// Hook to register and use keyboard shortcuts
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Find matching shortcut
      const matchingShortcut = shortcuts.find(shortcut => {
        if (!shortcut.enabled && shortcut.enabled !== undefined) return false;
        
        // Check key
        if (e.key !== shortcut.key) return false;
        
        // Check modifiers
        const modifiers = shortcut.modifiers || [];
        const ctrlPressed = e.ctrlKey || e.metaKey;
        const shiftPressed = e.shiftKey;
        const altPressed = e.altKey;
        
        const hasCtrl = modifiers.includes('ctrl') || modifiers.includes('meta');
        const hasShift = modifiers.includes('shift');
        const hasAlt = modifiers.includes('alt');
        
        return (
          hasCtrl === ctrlPressed &&
          hasShift === shiftPressed &&
          hasAlt === altPressed
        );
      });
      
      if (matchingShortcut) {
        e.preventDefault();
        matchingShortcut.action();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}