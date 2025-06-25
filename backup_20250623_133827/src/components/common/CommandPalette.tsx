'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Command, ChevronRight, Clock, Star, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { keyboardManager } from '@/lib/keyboard/KeyboardShortcutManager';

export interface CommandItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  action: () => void;
  icon?: React.ComponentType<{ className?: string }>;
  keywords?: string[];
  shortcut?: {
    key: string;
    modifiers?: string[];
  };
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands?: CommandItem[];
}

const defaultCommands: CommandItem[] = [
  // Navigation
  {
    id: 'nav-home',
    title: 'Go to Home',
    category: 'Navigation',
    action: () => window.location.href = '/',
    keywords: ['home', 'dashboard', 'main']
  },
  {
    id: 'nav-dashboards',
    title: 'Go to Dashboards',
    category: 'Navigation',
    action: () => window.location.href = '/dashboards',
    keywords: ['dashboards', 'browse']
  },
  {
    id: 'nav-explore',
    title: 'Go to Explore',
    category: 'Navigation',
    action: () => window.location.href = '/explore',
    keywords: ['explore', 'query', 'data']
  },
  {
    id: 'nav-alerting',
    title: 'Go to Alerting',
    category: 'Navigation',
    action: () => window.location.href = '/alerting',
    keywords: ['alerts', 'alerting', 'notifications']
  },
  {
    id: 'nav-admin',
    title: 'Go to Admin',
    category: 'Navigation',
    action: () => window.location.href = '/admin',
    keywords: ['admin', 'configuration', 'settings']
  },
  
  // Dashboard Actions
  {
    id: 'dashboard-new',
    title: 'Create New Dashboard',
    category: 'Dashboard',
    action: () => window.location.href = '/dashboard/new',
    keywords: ['new', 'create', 'dashboard']
  },
  {
    id: 'dashboard-import',
    title: 'Import Dashboard',
    category: 'Dashboard',
    action: () => window.location.href = '/dashboard/import',
    keywords: ['import', 'dashboard', 'upload']
  },
  {
    id: 'dashboard-folder',
    title: 'Create Dashboard Folder',
    category: 'Dashboard',
    action: () => window.location.href = '/dashboards/folder/new',
    keywords: ['folder', 'organize', 'dashboard']
  },
  
  // Data Source Actions
  {
    id: 'datasource-add',
    title: 'Add Data Source',
    category: 'Configuration',
    action: () => window.location.href = '/datasources/new',
    keywords: ['datasource', 'data', 'connection', 'add']
  },
  {
    id: 'datasource-list',
    title: 'Data Sources',
    category: 'Configuration',
    action: () => window.location.href = '/datasources',
    keywords: ['datasource', 'data', 'connections', 'list']
  },
  
  // User Actions
  {
    id: 'user-profile',
    title: 'User Profile',
    category: 'User',
    action: () => window.location.href = '/profile',
    keywords: ['profile', 'user', 'account']
  },
  {
    id: 'user-preferences',
    title: 'Preferences',
    category: 'User',
    action: () => window.location.href = '/profile/preferences',
    keywords: ['preferences', 'settings', 'user']
  },
  {
    id: 'user-api-keys',
    title: 'API Keys',
    category: 'User',
    action: () => window.location.href = '/org/apikeys',
    keywords: ['api', 'keys', 'tokens']
  },
  
  // Help
  {
    id: 'help-documentation',
    title: 'Documentation',
    category: 'Help',
    action: () => window.location.href = '/help',
    keywords: ['help', 'docs', 'documentation']
  },
  {
    id: 'help-shortcuts',
    title: 'Keyboard Shortcuts',
    category: 'Help',
    action: () => {
      const event = new CustomEvent('show-keyboard-shortcuts');
      window.dispatchEvent(event);
    },
    keywords: ['keyboard', 'shortcuts', 'hotkeys']
  },
  
  // Theme
  {
    id: 'theme-toggle',
    title: 'Toggle Theme',
    category: 'Preferences',
    action: () => {
      const event = new CustomEvent('toggle-theme');
      window.dispatchEvent(event);
    },
    keywords: ['theme', 'dark', 'light', 'toggle']
  }
];

export function CommandPalette({ isOpen, onClose, commands = defaultCommands }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [favoriteCommands, setFavoriteCommands] = useState<Set<string>>(new Set());

  // Load recent and favorite commands
  useEffect(() => {
    const savedRecent = localStorage.getItem('command-palette-recent');
    const savedFavorites = localStorage.getItem('command-palette-favorites');
    
    if (savedRecent) {
      setRecentCommands(JSON.parse(savedRecent));
    }
    
    if (savedFavorites) {
      setFavoriteCommands(new Set(JSON.parse(savedFavorites)));
    }
  }, []);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search) {
      // Show recent and favorite commands when no search
      const recent = commands.filter(cmd => recentCommands.includes(cmd.id));
      const favorites = commands.filter(cmd => favoriteCommands.has(cmd.id));
      const others = commands.filter(
        cmd => !recentCommands.includes(cmd.id) && !favoriteCommands.has(cmd.id)
      );
      
      return [...favorites, ...recent, ...others];
    }

    const searchLower = search.toLowerCase();
    
    return commands.filter(command => {
      const titleMatch = command.title.toLowerCase().includes(searchLower);
      const descriptionMatch = command.description?.toLowerCase().includes(searchLower);
      const categoryMatch = command.category.toLowerCase().includes(searchLower);
      const keywordMatch = command.keywords?.some(k => k.toLowerCase().includes(searchLower));
      
      return titleMatch || descriptionMatch || categoryMatch || keywordMatch;
    }).sort((a, b) => {
      // Prioritize exact matches
      const aExact = a.title.toLowerCase() === searchLower;
      const bExact = b.title.toLowerCase() === searchLower;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then prioritize favorites
      const aFav = favoriteCommands.has(a.id);
      const bFav = favoriteCommands.has(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      
      return 0;
    });
  }, [search, commands, recentCommands, favoriteCommands]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups = new Map<string, CommandItem[]>();
    
    filteredCommands.forEach(command => {
      const category = command.category;
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(command);
    });
    
    return Array.from(groups.entries());
  }, [filteredCommands]);

  // Calculate flat index for keyboard navigation
  const flatCommands = useMemo(() => {
    return groupedCommands.flatMap(([_, cmds]) => cmds);
  }, [groupedCommands]);

  // Execute command
  const executeCommand = useCallback((command: CommandItem) => {
    // Add to recent commands
    const newRecent = [command.id, ...recentCommands.filter(id => id !== command.id)].slice(0, 5);
    setRecentCommands(newRecent);
    localStorage.setItem('command-palette-recent', JSON.stringify(newRecent));
    
    // Execute action
    command.action();
    onClose();
  }, [recentCommands, onClose]);

  // Toggle favorite
  const toggleFavorite = useCallback((commandId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = new Set(favoriteCommands);
    
    if (newFavorites.has(commandId)) {
      newFavorites.delete(commandId);
    } else {
      newFavorites.add(commandId);
    }
    
    setFavoriteCommands(newFavorites);
    localStorage.setItem('command-palette-favorites', JSON.stringify(Array.from(newFavorites)));
  }, [favoriteCommands]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => (i + 1) % flatCommands.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => (i - 1 + flatCommands.length) % flatCommands.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (flatCommands[selectedIndex]) {
            executeCommand(flatCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, flatCommands, executeCommand, onClose]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      <div className="fixed inset-x-0 top-20 mx-auto max-w-2xl px-4">
        <div className="overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
          {/* Search Input */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
            <Search className="ml-4 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search commands..."
              className="flex-1 px-4 py-4 text-sm outline-none bg-transparent dark:text-gray-100"
              autoFocus
            />
            <button
              onClick={onClose}
              className="p-4 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>

          {/* Command List */}
          <div className="max-h-96 overflow-y-auto py-2">
            {groupedCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No commands found
              </div>
            ) : (
              groupedCommands.map(([category, categoryCommands], groupIndex) => (
                <div key={category}>
                  <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {category}
                  </div>
                  {categoryCommands.map((command, cmdIndex) => {
                    const flatIndex = flatCommands.indexOf(command);
                    const isSelected = selectedIndex === flatIndex;
                    const isFavorite = favoriteCommands.has(command.id);
                    const isRecent = recentCommands.includes(command.id);
                    
                    return (
                      <div
                        key={command.id}
                        onClick={() => executeCommand(command)}
                        onMouseEnter={() => setSelectedIndex(flatIndex)}
                        className={`
                          flex items-center justify-between px-4 py-2 cursor-pointer
                          ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                          hover:bg-gray-50 dark:hover:bg-gray-800
                        `}
                      >
                        <div className="flex items-center gap-3">
                          {command.icon && (
                            <command.icon className="h-4 w-4 text-gray-400" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {command.title}
                              </span>
                              {isRecent && (
                                <Clock className="h-3 w-3 text-gray-400" />
                              )}
                            </div>
                            {command.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {command.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {command.shortcut && (
                            <div className="flex items-center gap-1">
                              {command.shortcut.modifiers?.map(mod => (
                                <kbd
                                  key={mod}
                                  className="px-1.5 py-0.5 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                                >
                                  {mod}
                                </kbd>
                              ))}
                              <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                                {command.shortcut.key}
                              </kbd>
                            </div>
                          )}
                          <button
                            onClick={(e) => toggleFavorite(command.id, e)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          >
                            <Star
                              className={`h-3 w-3 ${
                                isFavorite
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-400'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 font-semibold bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:border-gray-600">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 font-semibold bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:border-gray-600">⏎</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 font-semibold bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:border-gray-600">Esc</kbd>
                Close
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>Favorite</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}