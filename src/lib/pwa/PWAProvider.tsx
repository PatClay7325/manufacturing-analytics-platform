'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DeviceCapabilities, BeforeInstallPromptEvent, PWAConfig } from '@/types/pwa';

interface PWAContextValue {
  isInstalled: boolean;
  isOffline: boolean;
  deviceCapabilities: DeviceCapabilities;
  installPrompt: BeforeInstallPromptEvent | null;
  showInstallPrompt: () => Promise<void>;
  updateAvailable: boolean;
  updateServiceWorker: () => void;
  registration: ServiceWorkerRegistration | null;
}

const PWAContext = createContext<PWAContextValue | undefined>(undefined);

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

interface PWAProviderProps {
  children: React.ReactNode;
  config?: Partial<PWAConfig>;
}

export function PWAProvider({ children, config }: PWAProviderProps) {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilities>({
    isOnline: navigator.onLine,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    hasTouch: false,
    orientation: 'portrait',
    networkType: 'unknown',
  });

  // Detect device type and capabilities
  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const orientation = width > height ? 'landscape' : 'portrait';

      setDeviceCapabilities({
        isOnline: navigator.onLine,
        isMobile: width < 640,
        isTablet: width >= 640 && width < 1024,
        isDesktop: width >= 1024,
        hasTouch,
        orientation,
        networkType: getNetworkType(),
        batteryLevel: undefined,
        isCharging: undefined,
      });
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    window.addEventListener('orientationchange', detectDevice);

    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, []);

  // Check if app is installed
  useEffect(() => {
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      } else if ((window.navigator as any).standalone) {
        setIsInstalled(true);
      }
    };

    checkInstalled();
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setDeviceCapabilities(prev => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setIsOffline(true);
      setDeviceCapabilities(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
    };
  }, []);

  // Register service worker
  useEffect(() => {
    // Disable service worker in development to prevent conflicts with hot reloading
    if ('serviceWorker' in navigator && config?.enablePWA !== false && process.env.NODE_ENV !== 'development') {
      registerServiceWorker();
    }
  }, [config?.enablePWA]);

  const registerServiceWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      setRegistration(reg);

      // Check for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        }
      });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });

    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  };

  const showInstallPrompt = async () => {
    if (!installPrompt) {
      throw new Error('No install prompt available');
    }

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setInstallPrompt(null);
  };

  const updateServiceWorker = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  // Get network type
  const getNetworkType = (): DeviceCapabilities['networkType'] => {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    if (!connection) return 'unknown';

    if (connection.effectiveType) {
      switch (connection.effectiveType) {
        case 'slow-2g':
        case '2g':
          return '2g';
        case '3g':
          return '3g';
        case '4g':
          return '4g';
        default:
          return 'unknown';
      }
    }

    return 'unknown';
  };

  // Monitor battery status
  useEffect(() => {
    const monitorBattery = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          
          const updateBattery = () => {
            setDeviceCapabilities(prev => ({
              ...prev,
              batteryLevel: battery.level,
              isCharging: battery.charging,
            }));
          };

          updateBattery();
          battery.addEventListener('levelchange', updateBattery);
          battery.addEventListener('chargingchange', updateBattery);

          return () => {
            battery.removeEventListener('levelchange', updateBattery);
            battery.removeEventListener('chargingchange', updateBattery);
          };
        } catch (error) {
          console.error('Battery API not available:', error);
        }
      }
    };

    monitorBattery();
  }, []);

  const value: PWAContextValue = {
    isInstalled,
    isOffline,
    deviceCapabilities,
    installPrompt,
    showInstallPrompt,
    updateAvailable,
    updateServiceWorker,
    registration,
  };

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
}