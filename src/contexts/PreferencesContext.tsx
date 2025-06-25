'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { UserPreferences, PreferenceUpdate, DEFAULT_USER_PREFERENCES } from '@/types/preferences';
import { useAuth } from './AuthContext';

// Simple debounce implementation
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

interface PreferencesContextValue {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  updatePreferences: (updates: PreferenceUpdate) => Promise<void>;
  resetPreferences: () => Promise<void>;
  applyTheme: (theme: 'light' | 'dark' | 'system') => void;
  appliedTheme: 'light' | 'dark';
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedTheme, setAppliedTheme] = useState<'light' | 'dark'>('light');
  
  // Use ref to track if we're currently saving
  const savingRef = useRef(false);
  const pendingUpdatesRef = useRef<PreferenceUpdate | null>(null);

  // Fetch preferences on mount and when user changes
  useEffect(() => {
    if (user) {
      fetchPreferences();
    } else {
      // Use default preferences for non-authenticated users
      const defaultPrefs: UserPreferences = {
        id: 'default',
        userId: 'anonymous',
        ...DEFAULT_USER_PREFERENCES,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setPreferences(defaultPrefs);
      setLoading(false);
    }
  }, [user]);

  // Apply theme when preferences change
  useEffect(() => {
    if (preferences) {
      applyTheme(preferences.ui.theme);
    }
  }, [preferences?.ui.theme]);

  // Apply other UI preferences
  useEffect(() => {
    if (!preferences) return;

    // Apply font size
    const fontScale = {
      small: 0.875,
      medium: 1,
      large: 1.125,
    }[preferences?.accessibility?.fontSize || 'medium'];
    
    if (fontScale) {
      document.documentElement.style.setProperty('--font-scale', fontScale.toString());
    }

    // Apply reduce motion
    if (preferences?.accessibility?.reduceMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }

    // Apply high contrast
    if (preferences?.accessibility?.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    // Apply language (if i18n is set up)
    if (preferences?.ui?.language && typeof window !== 'undefined') {
      document.documentElement.lang = preferences.ui.language;
    }

  }, [preferences]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to get from localStorage first for immediate UI update
      const cached = localStorage.getItem('userPreferences');
      if (cached) {
        try {
          const cachedPrefs = JSON.parse(cached);
          setPreferences(cachedPrefs);
        } catch (parseError) {
          console.warn('Failed to parse cached preferences:', parseError);
          localStorage.removeItem('userPreferences');
        }
      }
      
      // Skip API call during tests or if running without server
      if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
        const defaultPrefs: UserPreferences = {
          id: 'default',
          userId: user?.id || 'anonymous',
          ...DEFAULT_USER_PREFERENCES,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setPreferences(defaultPrefs);
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/user/preferences', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        // Don't throw for 404s during initial load
        if (response.status === 404) {
          console.warn('Preferences endpoint not found, using defaults');
        } else {
          throw new Error(`Failed to fetch preferences: ${response.status}`);
        }
      } else {
        const data = await response.json();
        setPreferences(data);
        
        // Cache in localStorage
        localStorage.setItem('userPreferences', JSON.stringify(data));
      }
    } catch (err) {
      // Only set error for non-404 errors
      if (err instanceof Error && !err.message.includes('404')) {
        setError(err.message);
      }
      console.warn('Error fetching preferences, using defaults:', err);
      
      // Fall back to cached or default preferences
      const cached = localStorage.getItem('userPreferences');
      if (cached) {
        try {
          setPreferences(JSON.parse(cached));
        } catch {
          // If cache is corrupted, use defaults
          const defaultPrefs: UserPreferences = {
            id: 'default',
            userId: user?.id || 'anonymous',
            ...DEFAULT_USER_PREFERENCES,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setPreferences(defaultPrefs);
        }
      } else {
        const defaultPrefs: UserPreferences = {
          id: 'default',
          userId: user?.id || 'anonymous',
          ...DEFAULT_USER_PREFERENCES,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setPreferences(defaultPrefs);
      }
    } finally {
      setLoading(false);
    }
  };

  // Debounced save function
  const savePreferences = useCallback(
    debounce(async (updates: PreferenceUpdate) => {
      if (!user || savingRef.current) {
        pendingUpdatesRef.current = updates;
        return;
      }

      try {
        savingRef.current = true;
        const response = await fetch('/api/user/preferences', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error('Failed to save preferences');
        }

        const data = await response.json();
        setPreferences(data);
        
        // Update cache
        localStorage.setItem('userPreferences', JSON.stringify(data));
        
        // Check for pending updates
        if (pendingUpdatesRef.current) {
          const pending = pendingUpdatesRef.current;
          pendingUpdatesRef.current = null;
          savePreferences(pending);
        }
      } catch (err) {
        console.error('Error saving preferences:', err);
        setError(err instanceof Error ? err.message : 'Failed to save preferences');
      } finally {
        savingRef.current = false;
      }
    }, 500),
    [user]
  );

  const updatePreferences = async (updates: PreferenceUpdate) => {
    if (!preferences) return;

    // Optimistic update
    const newPreferences = { ...preferences };
    
    if (updates.ui) {
      newPreferences.ui = { ...newPreferences.ui, ...updates.ui };
    }
    if (updates.dashboard) {
      newPreferences.dashboard = { ...newPreferences.dashboard, ...updates.dashboard };
    }
    if (updates.editor) {
      newPreferences.editor = { ...newPreferences.editor, ...updates.editor };
    }
    if (updates.notifications) {
      newPreferences.notifications = { ...newPreferences.notifications, ...updates.notifications };
    }
    if (updates.accessibility) {
      newPreferences.accessibility = { ...newPreferences.accessibility, ...updates.accessibility };
    }
    if (updates.features) {
      newPreferences.features = { ...newPreferences.features, ...updates.features };
    }
    if (updates.navigation) {
      newPreferences.navigation = { ...newPreferences.navigation, ...updates.navigation };
    }
    if (updates.dataDisplay) {
      newPreferences.dataDisplay = { ...newPreferences.dataDisplay, ...updates.dataDisplay };
    }
    if (updates.privacy) {
      newPreferences.privacy = { ...newPreferences.privacy, ...updates.privacy };
    }
    if (updates.customSettings) {
      newPreferences.customSettings = { ...newPreferences.customSettings, ...updates.customSettings };
    }
    
    newPreferences.updatedAt = new Date();
    setPreferences(newPreferences);
    
    // Update localStorage immediately
    localStorage.setItem('userPreferences', JSON.stringify(newPreferences));

    // Save to server (debounced)
    if (user) {
      savePreferences(updates);
    }
  };

  const resetPreferences = async () => {
    if (!user) {
      // For non-authenticated users, just reset to defaults
      const defaultPrefs: UserPreferences = {
        id: 'default',
        userId: 'anonymous',
        ...DEFAULT_USER_PREFERENCES,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setPreferences(defaultPrefs);
      localStorage.setItem('userPreferences', JSON.stringify(defaultPrefs));
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/user/preferences/reset', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reset preferences');
      }

      // Fetch fresh preferences
      await fetchPreferences();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset preferences');
      console.error('Error resetting preferences:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    let effectiveTheme: 'light' | 'dark' = 'light';
    
    if (theme === 'system') {
      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        effectiveTheme = 'dark';
      }
    } else {
      effectiveTheme = theme;
    }
    
    setAppliedTheme(effectiveTheme);
    
    // Apply theme to document
    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Store theme preference
    localStorage.setItem('theme', theme);
  };

  // Listen for system theme changes
  useEffect(() => {
    if (preferences?.ui.theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      applyTheme('system');
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [preferences?.ui.theme]);

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        loading,
        error,
        updatePreferences,
        resetPreferences,
        applyTheme,
        appliedTheme,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}