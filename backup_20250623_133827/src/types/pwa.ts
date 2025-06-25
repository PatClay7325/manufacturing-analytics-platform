// PWA and Mobile Types

export interface PWAConfig {
  enablePWA: boolean;
  enableOffline: boolean;
  enablePushNotifications: boolean;
  enableBackgroundSync: boolean;
  enableInstallPrompt: boolean;
}

export interface ServiceWorkerConfig {
  scope: string;
  updateViaCache: 'all' | 'imports' | 'none';
  skipWaiting: boolean;
  clientsClaim: boolean;
}

export interface CacheStrategy {
  name: string;
  pattern: RegExp | string;
  handler: 'CacheFirst' | 'NetworkFirst' | 'NetworkOnly' | 'StaleWhileRevalidate';
  options?: {
    cacheName?: string;
    expiration?: {
      maxEntries?: number;
      maxAgeSeconds?: number;
    };
    cacheableResponse?: {
      statuses?: number[];
    };
  };
}

export interface OfflineData {
  id: string;
  type: 'metric' | 'alert' | 'equipment' | 'dashboard';
  data: any;
  timestamp: number;
  synced: boolean;
}

export interface MobileGesture {
  type: 'swipe' | 'tap' | 'pinch' | 'rotate';
  direction?: 'left' | 'right' | 'up' | 'down';
  callback: () => void;
}

export interface DeviceCapabilities {
  isOnline: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
  orientation: 'portrait' | 'landscape';
  networkType: '2g' | '3g' | '4g' | '5g' | 'wifi' | 'unknown';
  batteryLevel?: number;
  isCharging?: boolean;
}

export interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
  vibrate?: number[];
  silent?: boolean;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
  preventDefault(): void;
}

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export interface MobileViewport {
  width: number;
  height: number;
  scale: number;
  safeAreaInsets: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface TouchGesture {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  deltaX: number;
  deltaY: number;
  velocity: number;
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
  duration: number;
}

export interface MobileNavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
  active?: boolean;
}

export interface MobileQuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  color?: string;
  disabled?: boolean;
}