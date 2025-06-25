import { NextRequest, NextResponse } from 'next/server';

// Mock default preferences for development
const mockDefaultPreferences = {
  id: 'mock-preferences',
  userId: 'mock-user',
  ui: {
    theme: 'light',
    language: 'en',
    timezone: 'browser',
    weekStart: 'monday',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h'
  },
  dashboard: {
    defaultTimeRange: 'Last 6 hours',
    queryHistory: 50,
    autoRefresh: '30s'
  },
  editor: {
    graphTooltipMode: 'single',
    exploreMode: 'metrics',
    queryTimeout: 300,
    liveNow: true
  },
  notifications: {
    emailNotifications: true,
    browserNotifications: true,
    alertNotifications: true,
    alertSeverityFilter: ['critical', 'high'],
    notificationSound: true,
    desktopNotifications: false
  },
  accessibility: {
    reduceMotion: false,
    highContrast: false,
    fontSize: 'medium',
    keyboardShortcuts: true,
    screenReaderMode: false,
    focusIndicators: true
  },
  features: {
    featureAnnouncementsEnabled: true,
    experimentalFeaturesEnabled: false,
    developerMode: process.env.NODE_ENV === 'development'
  },
  navigation: {
    sidebarCollapsed: false,
    sidebarWidth: 240,
    navbarFixed: true
  },
  dataDisplay: {
    nullValueDisplay: 'null',
    unitSystem: 'metric',
    decimalPlaces: 2,
    thousandsSeparator: ','
  },
  privacy: {
    shareAnalytics: true,
    saveDashboardQueries: true
  },
  version: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

export async function GET(request: NextRequest) {
  try {
    // In development, return mock preferences
    return NextResponse.json(mockDefaultPreferences);
  } catch (error) {
    console.error('Failed to fetch user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = await request.json();
    
    // In development, just return the updated preferences
    const updatedPreferences = {
      ...mockDefaultPreferences,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return NextResponse.json(updatedPreferences);
  } catch (error) {
    console.error('Failed to update user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}