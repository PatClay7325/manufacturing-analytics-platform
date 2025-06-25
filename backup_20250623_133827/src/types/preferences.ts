// User Preferences Types and Interfaces

export interface UIPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  weekStart: 'sunday' | 'monday';
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

export interface DashboardPreferences {
  homeDashboardId?: string;
  defaultTimeRange: string;
  autoRefresh?: string;
  queryHistory: number;
}

export interface EditorPreferences {
  defaultDatasourceId?: string;
  graphTooltipMode: 'single' | 'multi' | 'none';
  exploreMode: 'metrics' | 'logs' | 'traces';
  queryTimeout: number;
  liveNow: boolean;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  browserNotifications: boolean;
  alertNotifications: boolean;
  alertSeverityFilter: ('critical' | 'high' | 'medium' | 'low' | 'info')[];
  notificationSound: boolean;
  desktopNotifications: boolean;
}

export interface AccessibilityPreferences {
  reduceMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'medium' | 'large';
  keyboardShortcuts: boolean;
  screenReaderMode: boolean;
  focusIndicators: boolean;
}

export interface FeaturePreferences {
  featureAnnouncementsEnabled: boolean;
  experimentalFeaturesEnabled: boolean;
  developerMode: boolean;
}

export interface NavigationPreferences {
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  navbarFixed: boolean;
}

export interface DataDisplayPreferences {
  nullValueDisplay: string;
  unitSystem: 'metric' | 'imperial';
  decimalPlaces: number;
  thousandsSeparator: string;
}

export interface PrivacyPreferences {
  shareAnalytics: boolean;
  saveDashboardQueries: boolean;
}

export interface UserPreferences {
  id: string;
  userId: string;
  ui: UIPreferences;
  dashboard: DashboardPreferences;
  editor: EditorPreferences;
  notifications: NotificationPreferences;
  accessibility: AccessibilityPreferences;
  features: FeaturePreferences;
  navigation: NavigationPreferences;
  dataDisplay: DataDisplayPreferences;
  privacy: PrivacyPreferences;
  customSettings?: Record<string, any>;
  version: number;
  migratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationDefaults {
  id: string;
  organizationId: string;
  
  // Default UI Settings
  defaultTheme: 'light' | 'dark';
  defaultLanguage: string;
  defaultTimezone: string;
  weekStart: 'sunday' | 'monday';
  dateFormat: string;
  timeFormat: '12h' | '24h';
  
  // Default Dashboard Settings
  defaultHomeDashboardId?: string;
  defaultTimeRange: string;
  defaultRefreshInterval?: string;
  
  // Default Editor Settings
  defaultDatasourceId?: string;
  queryTimeout: number;
  maxDataPoints: number;
  
  // Default Notification Settings
  emailNotificationsEnabled: boolean;
  browserNotificationsEnabled: boolean;
  
  // Feature Flags
  publicDashboardsEnabled: boolean;
  snapshotsEnabled: boolean;
  annotationsEnabled: boolean;
  alertingEnabled: boolean;
  exploreEnabled: boolean;
  
  // Security Settings
  enforcePasswordPolicy: boolean;
  passwordMinLength: number;
  requirePasswordChange: boolean;
  sessionTimeout: number;
  
  // Data Retention
  dashboardVersionRetention: number;
  queryHistoryRetention: number;
  
  // Resource Limits
  maxDashboardsPerUser?: number;
  maxQueriesPerMinute?: number;
  maxAlertsPerUser?: number;
  
  // Branding
  loginMessage?: string;
  footerMessage?: string;
  customLogoUrl?: string;
  
  // Custom Defaults
  customDefaults?: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface PreferenceUpdate {
  ui?: Partial<UIPreferences>;
  dashboard?: Partial<DashboardPreferences>;
  editor?: Partial<EditorPreferences>;
  notifications?: Partial<NotificationPreferences>;
  accessibility?: Partial<AccessibilityPreferences>;
  features?: Partial<FeaturePreferences>;
  navigation?: Partial<NavigationPreferences>;
  dataDisplay?: Partial<DataDisplayPreferences>;
  privacy?: Partial<PrivacyPreferences>;
  customSettings?: Record<string, any>;
}

export interface PreferenceChangeEvent {
  userId: string;
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  source: 'web' | 'api' | 'admin' | 'system';
}

// Default values for new users
export const DEFAULT_USER_PREFERENCES: Omit<UserPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  ui: {
    theme: 'system',
    language: 'en',
    timezone: 'browser',
    weekStart: 'sunday',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  },
  dashboard: {
    defaultTimeRange: 'Last 6 hours',
    queryHistory: 50,
  },
  editor: {
    graphTooltipMode: 'single',
    exploreMode: 'metrics',
    queryTimeout: 300,
    liveNow: true,
  },
  notifications: {
    emailNotifications: true,
    browserNotifications: true,
    alertNotifications: true,
    alertSeverityFilter: ['critical', 'high'],
    notificationSound: true,
    desktopNotifications: false,
  },
  accessibility: {
    reduceMotion: false,
    highContrast: false,
    fontSize: 'medium',
    keyboardShortcuts: true,
    screenReaderMode: false,
    focusIndicators: true,
  },
  features: {
    featureAnnouncementsEnabled: true,
    experimentalFeaturesEnabled: false,
    developerMode: false,
  },
  navigation: {
    sidebarCollapsed: false,
    sidebarWidth: 240,
    navbarFixed: true,
  },
  dataDisplay: {
    nullValueDisplay: 'null',
    unitSystem: 'metric',
    decimalPlaces: 2,
    thousandsSeparator: ',',
  },
  privacy: {
    shareAnalytics: true,
    saveDashboardQueries: true,
  },
  version: 1,
};

// Time range options
export const TIME_RANGE_OPTIONS = [
  'Last 5 minutes',
  'Last 15 minutes',
  'Last 30 minutes',
  'Last 1 hour',
  'Last 3 hours',
  'Last 6 hours',
  'Last 12 hours',
  'Last 24 hours',
  'Last 2 days',
  'Last 7 days',
  'Last 30 days',
  'Last 90 days',
  'Last 6 months',
  'Last 1 year',
  'Last 2 years',
  'Last 5 years',
  'Yesterday',
  'Day before yesterday',
  'This day last week',
  'Previous week',
  'Previous month',
  'Previous year',
  'Today',
  'Today so far',
  'This week',
  'This week so far',
  'This month',
  'This month so far',
  'This year',
  'This year so far',
];

// Auto-refresh intervals
export const AUTO_REFRESH_OPTIONS = [
  { label: 'Off', value: null },
  { label: '5s', value: '5s' },
  { label: '10s', value: '10s' },
  { label: '30s', value: '30s' },
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
  { label: '2h', value: '2h' },
  { label: '1d', value: '1d' },
];

// Language options
export const LANGUAGE_OPTIONS = [
  { label: 'English', value: 'en' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Italian', value: 'it' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Russian', value: 'ru' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Chinese (Simplified)', value: 'zh-CN' },
  { label: 'Chinese (Traditional)', value: 'zh-TW' },
  { label: 'Korean', value: 'ko' },
  { label: 'Arabic', value: 'ar' },
  { label: 'Hebrew', value: 'he' },
  { label: 'Dutch', value: 'nl' },
  { label: 'Swedish', value: 'sv' },
  { label: 'Norwegian', value: 'no' },
  { label: 'Danish', value: 'da' },
  { label: 'Finnish', value: 'fi' },
  { label: 'Polish', value: 'pl' },
  { label: 'Turkish', value: 'tr' },
];

// Date format options
export const DATE_FORMAT_OPTIONS = [
  { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY', example: '12/31/2023' },
  { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY', example: '31/12/2023' },
  { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD', example: '2023-12-31' },
  { label: 'DD.MM.YYYY', value: 'DD.MM.YYYY', example: '31.12.2023' },
  { label: 'DD-MM-YYYY', value: 'DD-MM-YYYY', example: '31-12-2023' },
  { label: 'MMM DD, YYYY', value: 'MMM DD, YYYY', example: 'Dec 31, 2023' },
  { label: 'DD MMM YYYY', value: 'DD MMM YYYY', example: '31 Dec 2023' },
  { label: 'MMMM DD, YYYY', value: 'MMMM DD, YYYY', example: 'December 31, 2023' },
];

// Theme options
export const THEME_OPTIONS = [
  { label: 'Light', value: 'light', icon: '☀️' },
  { label: 'Dark', value: 'dark', icon: '🌙' },
  { label: 'System', value: 'system', icon: '💻' },
];

// Font size options
export const FONT_SIZE_OPTIONS = [
  { label: 'Small', value: 'small', scale: 0.875 },
  { label: 'Medium', value: 'medium', scale: 1 },
  { label: 'Large', value: 'large', scale: 1.125 },
];