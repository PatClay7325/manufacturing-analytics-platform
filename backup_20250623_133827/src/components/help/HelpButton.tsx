'use client';

import React, { useState } from 'react';
import { HelpCircle, Book, Keyboard, PlayCircle, MessageCircle, ChevronDown } from 'lucide-react';
import { useHelp } from '@/contexts/HelpContext';

interface HelpButtonProps {
  className?: string;
  variant?: 'icon' | 'text' | 'dropdown';
}

export function HelpButton({ className = '', variant = 'icon' }: HelpButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const { showHelp, showKeyboardShortcuts, startTutorial } = useHelp();

  const handleHelpClick = () => {
    if (variant === 'dropdown') {
      setShowDropdown(!showDropdown);
    } else {
      showHelp();
    }
  };

  const menuItems = [
    {
      icon: Book,
      label: 'Documentation',
      action: () => {
        showHelp();
        setShowDropdown(false);
      }
    },
    {
      icon: Keyboard,
      label: 'Keyboard Shortcuts',
      action: () => {
        showKeyboardShortcuts();
        setShowDropdown(false);
      }
    },
    {
      icon: PlayCircle,
      label: 'Interactive Tutorial',
      action: () => {
        // Start a basic tutorial
        startTutorial({
          id: 'quick-start',
          title: 'Quick Start Guide',
          description: 'Learn the basics in 5 minutes',
          category: 'getting-started',
          difficulty: 'beginner',
          estimatedTime: 5,
          steps: [
            {
              id: 'welcome',
              title: 'Welcome to the Platform',
              description: 'Let\'s take a quick tour of the main features.',
              skipAllowed: true
            }
          ]
        });
        setShowDropdown(false);
      }
    },
    {
      icon: MessageCircle,
      label: 'Community Support',
      action: () => {
        window.open('https://community.example.com', '_blank');
        setShowDropdown(false);
      }
    }
  ];

  if (variant === 'icon') {
    return (
      <button
        onClick={handleHelpClick}
        className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${className}`}
        title="Help (press ?)"
      >
        <HelpCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      </button>
    );
  }

  if (variant === 'text') {
    return (
      <button
        onClick={handleHelpClick}
        className={`flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 ${className}`}
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Help
      </button>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <button
          onClick={handleHelpClick}
          className={`flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${className}`}
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          Help
          <ChevronDown className="h-4 w-4 ml-1" />
        </button>

        {showDropdown && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />

            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  onClick={item.action}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  <item.icon className="h-4 w-4 mr-3 text-gray-400" />
                  {item.label}
                </button>
              ))}
              
              <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
                <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                  Press <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">?</kbd> for quick help
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return null;
}

// Help button specifically for forms
export function FormHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
    >
      <HelpCircle className="h-4 w-4" />
    </button>
  );
}