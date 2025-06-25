import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';

// POST /api/user/preferences/reset - Reset user preferences to defaults
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { preferences: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Store old preferences for audit
    const oldPreferences = user.preferences;

    // Delete existing preferences if they exist
    if (oldPreferences) {
      await prisma.userPreferences.delete({
        where: { userId: user.id },
      });
    }

    // Create new default preferences
    const newPreferences = await prisma.userPreferences.create({
      data: {
        userId: user.id,
      },
    });

    // Log the reset
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const userAgent = request.headers.get('user-agent');

    await prisma.preferenceChangeHistory.create({
      data: {
        userId: user.id,
        preferenceType: 'user',
        preferenceId: newPreferences.id,
        fieldChanged: 'all_preferences',
        oldValue: oldPreferences ? JSON.stringify(oldPreferences) : null,
        newValue: 'reset_to_defaults',
        changedBy: user.id,
        changeSource: 'web',
        changeReason: 'User requested preferences reset',
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
      },
    });

    // Transform to nested structure for response
    const formattedPreferences = {
      id: newPreferences.id,
      userId: newPreferences.userId,
      ui: {
        theme: newPreferences.theme as 'light' | 'dark' | 'system',
        language: newPreferences.language,
        timezone: newPreferences.timezone,
        weekStart: newPreferences.weekStart as 'sunday' | 'monday',
        dateFormat: newPreferences.dateFormat,
        timeFormat: newPreferences.timeFormat as '12h' | '24h',
      },
      dashboard: {
        homeDashboardId: newPreferences.homeDashboardId,
        defaultTimeRange: newPreferences.defaultTimeRange,
        autoRefresh: newPreferences.autoRefresh,
        queryHistory: newPreferences.queryHistory,
      },
      editor: {
        defaultDatasourceId: newPreferences.defaultDatasourceId,
        graphTooltipMode: newPreferences.graphTooltipMode as 'single' | 'multi' | 'none',
        exploreMode: newPreferences.exploreMode as 'metrics' | 'logs' | 'traces',
        queryTimeout: newPreferences.queryTimeout,
        liveNow: newPreferences.liveNow,
      },
      notifications: {
        emailNotifications: newPreferences.emailNotifications,
        browserNotifications: newPreferences.browserNotifications,
        alertNotifications: newPreferences.alertNotifications,
        alertSeverityFilter: newPreferences.alertSeverityFilter as ('critical' | 'high' | 'medium' | 'low' | 'info')[],
        notificationSound: newPreferences.notificationSound,
        desktopNotifications: newPreferences.desktopNotifications,
      },
      accessibility: {
        reduceMotion: newPreferences.reduceMotion,
        highContrast: newPreferences.highContrast,
        fontSize: newPreferences.fontSize as 'small' | 'medium' | 'large',
        keyboardShortcuts: newPreferences.keyboardShortcuts,
        screenReaderMode: newPreferences.screenReaderMode,
        focusIndicators: newPreferences.focusIndicators,
      },
      features: {
        featureAnnouncementsEnabled: newPreferences.featureAnnouncementsEnabled,
        experimentalFeaturesEnabled: newPreferences.experimentalFeaturesEnabled,
        developerMode: newPreferences.developerMode,
      },
      navigation: {
        sidebarCollapsed: newPreferences.sidebarCollapsed,
        sidebarWidth: newPreferences.sidebarWidth,
        navbarFixed: newPreferences.navbarFixed,
      },
      dataDisplay: {
        nullValueDisplay: newPreferences.nullValueDisplay,
        unitSystem: newPreferences.unitSystem as 'metric' | 'imperial',
        decimalPlaces: newPreferences.decimalPlaces,
        thousandsSeparator: newPreferences.thousandsSeparator,
      },
      privacy: {
        shareAnalytics: newPreferences.shareAnalytics,
        saveDashboardQueries: newPreferences.saveDashboardQueries,
      },
      customSettings: newPreferences.customSettings as Record<string, any> | undefined,
      version: newPreferences.version,
      migratedAt: newPreferences.migratedAt,
      createdAt: newPreferences.createdAt,
      updatedAt: newPreferences.updatedAt,
    };

    return NextResponse.json({
      message: 'Preferences reset to defaults successfully',
      preferences: formattedPreferences,
    });
  } catch (error) {
    console.error('Error resetting user preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}