'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { HelpConfig, Tutorial, UserProgress, ContextualHelp } from '@/types/help';
import { HelpCenter } from '@/components/help/HelpCenter';
import { KeyboardShortcuts, useKeyboardShortcuts } from '@/components/help/KeyboardShortcuts';
import { TutorialSystem } from '@/components/help/TutorialSystem';

interface HelpContextValue {
  config: HelpConfig;
  updateConfig: (config: Partial<HelpConfig>) => void;
  showHelp: (topic?: string) => void;
  hideHelp: () => void;
  showKeyboardShortcuts: () => void;
  startTutorial: (tutorial: Tutorial) => void;
  getUserProgress: () => UserProgress | null;
  updateUserProgress: (progress: Partial<UserProgress>) => void;
  registerContextualHelp: (componentId: string, help: ContextualHelp) => void;
  getContextualHelp: (componentId: string) => ContextualHelp | undefined;
}

const HelpContext = createContext<HelpContextValue | undefined>(undefined);

export function useHelp() {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}

interface HelpProviderProps {
  children: React.ReactNode;
  initialConfig?: Partial<HelpConfig>;
}

export function HelpProvider({ children, initialConfig }: HelpProviderProps) {
  const [config, setConfig] = useState<HelpConfig>({
    enableTooltips: true,
    enableTutorials: true,
    enableKeyboardShortcuts: true,
    defaultHelpPosition: { placement: 'auto' },
    searchDebounceMs: 300,
    maxSearchResults: 20,
    ...initialConfig
  });

  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [helpTopic, setHelpTopic] = useState<string | undefined>();
  const [activeTutorial, setActiveTutorial] = useState<Tutorial | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [contextualHelps, setContextualHelps] = useState<Map<string, ContextualHelp>>(new Map());

  // Load user progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('help-user-progress');
    if (savedProgress) {
      try {
        setUserProgress(JSON.parse(savedProgress));
      } catch (error) {
        console.error('Failed to load user progress:', error);
      }
    }
  }, []);

  // Save user progress to localStorage
  useEffect(() => {
    if (userProgress) {
      localStorage.setItem('help-user-progress', JSON.stringify(userProgress));
    }
  }, [userProgress]);

  const updateConfig = useCallback((newConfig: Partial<HelpConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  const showHelp = useCallback((topic?: string) => {
    setHelpTopic(topic);
    setShowHelpCenter(true);
  }, []);

  const hideHelp = useCallback(() => {
    setShowHelpCenter(false);
    setHelpTopic(undefined);
  }, []);

  const showKeyboardShortcuts = useCallback(() => {
    setShowShortcuts(true);
  }, []);

  const startTutorial = useCallback((tutorial: Tutorial) => {
    if (config.enableTutorials) {
      setActiveTutorial(tutorial);
    }
  }, [config.enableTutorials]);

  const getUserProgress = useCallback(() => {
    return userProgress;
  }, [userProgress]);

  const updateUserProgress = useCallback((progress: Partial<UserProgress>) => {
    setUserProgress(prev => prev ? { ...prev, ...progress } : null);
  }, []);

  const registerContextualHelp = useCallback((componentId: string, help: ContextualHelp) => {
    setContextualHelps(prev => {
      const newMap = new Map(prev);
      newMap.set(componentId, help);
      return newMap;
    });
  }, []);

  const getContextualHelp = useCallback((componentId: string) => {
    return contextualHelps.get(componentId);
  }, [contextualHelps]);

  // Global keyboard shortcuts
  const globalShortcuts = [
    {
      id: 'open-help',
      key: '?',
      description: 'Open help center',
      category: 'Help',
      action: () => showHelp(),
      enabled: config.enableKeyboardShortcuts
    },
    {
      id: 'show-shortcuts',
      key: '?',
      modifiers: ['shift'] as const,
      description: 'Show keyboard shortcuts',
      category: 'Help',
      action: () => showKeyboardShortcuts(),
      enabled: config.enableKeyboardShortcuts
    },
    {
      id: 'close-help',
      key: 'Escape',
      description: 'Close help dialogs',
      category: 'Help',
      action: () => {
        if (showHelpCenter) hideHelp();
        if (showShortcuts) setShowShortcuts(false);
        if (activeTutorial) setActiveTutorial(null);
      },
      enabled: config.enableKeyboardShortcuts && (showHelpCenter || showShortcuts || !!activeTutorial)
    }
  ];

  useKeyboardShortcuts(globalShortcuts);

  const contextValue: HelpContextValue = {
    config,
    updateConfig,
    showHelp,
    hideHelp,
    showKeyboardShortcuts,
    startTutorial,
    getUserProgress,
    updateUserProgress,
    registerContextualHelp,
    getContextualHelp
  };

  return (
    <HelpContext.Provider value={contextValue}>
      {children}
      
      {/* Help Center Modal */}
      <HelpCenter
        isOpen={showHelpCenter}
        onClose={hideHelp}
        initialTopic={helpTopic}
      />
      
      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcuts
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
      
      {/* Active Tutorial */}
      {activeTutorial && (
        <TutorialSystem
          tutorial={activeTutorial}
          onComplete={() => {
            setActiveTutorial(null);
            // Update user progress
            if (userProgress) {
              updateUserProgress({
                tutorialsCompleted: [...userProgress.tutorialsCompleted, activeTutorial.id],
                lastAccessed: new Date()
              });
            }
          }}
          onSkip={() => setActiveTutorial(null)}
          onProgress={(stepIndex) => {
            if (userProgress) {
              updateUserProgress({
                tutorialsInProgress: {
                  ...userProgress.tutorialsInProgress,
                  [activeTutorial.id]: stepIndex
                }
              });
            }
          }}
        />
      )}
    </HelpContext.Provider>
  );
}