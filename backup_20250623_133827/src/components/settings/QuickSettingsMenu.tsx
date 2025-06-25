'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePreferences } from '@/contexts/PreferencesContext';
import { 
  Settings, 
  Palette, 
  Monitor, 
  Sun, 
  Moon, 
  Globe,
  Bell,
  Eye,
  ChevronDown,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { THEME_OPTIONS, LANGUAGE_OPTIONS, FONT_SIZE_OPTIONS } from '@/types/preferences';

interface QuickSettingsMenuProps {
  onClose?: () => void;
}

export default function QuickSettingsMenu({ onClose }: QuickSettingsMenuProps) {
  const { preferences, updatePreferences, appliedTheme } = usePreferences();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        onClose?.();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!preferences) {
    return null;
  }

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    updatePreferences({ ui: { theme } });
  };

  const handleLanguageChange = (language: string) => {
    updatePreferences({ ui: { language } });
  };

  const handleFontSizeChange = (fontSize: 'small' | 'medium' | 'large') => {
    updatePreferences({ accessibility: { fontSize } });
  };

  const toggleNotifications = () => {
    updatePreferences({ 
      notifications: { 
        browserNotifications: !preferences.notifications.browserNotifications 
      } 
    });
  };

  const toggleReduceMotion = () => {
    updatePreferences({ 
      accessibility: { 
        reduceMotion: !preferences.accessibility.reduceMotion 
      } 
    });
  };

  const currentLanguage = LANGUAGE_OPTIONS.find(lang => lang.value === preferences.ui.language);
  const currentFontSize = FONT_SIZE_OPTIONS.find(size => size.value === preferences.accessibility.fontSize);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        aria-label="Quick Settings"
      >
        <Settings className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 dark:ring-gray-700 z-50"
        >
          <div className="py-1">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Quick Settings
                </h3>
                <Link
                  href="/profile/preferences"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
                  onClick={() => setIsOpen(false)}
                >
                  All Settings
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </div>
            </div>

            {/* Theme Selection */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Palette className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Theme
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleThemeChange(option.value as any)}
                    className={`flex flex-col items-center p-2 rounded-md text-xs transition-all ${
                      preferences.ui.theme === option.value
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <span className="text-sm mb-1">{option.icon}</span>
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Globe className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Language
                  </span>
                </div>
                <select
                  value={preferences.ui.language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="text-xs bg-transparent border-none focus:ring-0 text-gray-600 dark:text-gray-400"
                >
                  {LANGUAGE_OPTIONS.slice(0, 5).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Font Size */}
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Eye className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Font Size
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {FONT_SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFontSizeChange(option.value as any)}
                    className={`py-1.5 px-2 rounded-md text-xs transition-all ${
                      preferences.accessibility.fontSize === option.value
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 ring-1 ring-blue-200 dark:ring-blue-800'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Toggles */}
            <div className="px-4 py-3">
              <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Quick Toggles
              </h4>
              <div className="space-y-2">
                <label className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Bell className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Browser Notifications
                    </span>
                  </div>
                  <button
                    onClick={toggleNotifications}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      preferences.notifications.browserNotifications
                        ? 'bg-blue-600'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        preferences.notifications.browserNotifications
                          ? 'translate-x-5'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Reduce Motion
                    </span>
                  </div>
                  <button
                    onClick={toggleReduceMotion}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      preferences.accessibility.reduceMotion
                        ? 'bg-blue-600'
                        : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        preferences.accessibility.reduceMotion
                          ? 'translate-x-5'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
              <Link
                href="/profile/preferences"
                className="flex items-center justify-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="h-4 w-4 mr-2" />
                View All Preferences
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}