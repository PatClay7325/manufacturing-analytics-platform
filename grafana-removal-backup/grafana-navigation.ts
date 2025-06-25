/**
 * Grafana-style Navigation Configuration
 * Professional navigation structure for Manufacturing Analytics Platform
 */

export interface GrafanaNavItem {
  id: string;
  text: string;
  icon?: string;
  url?: string;
  target?: string;
  divider?: boolean;
  children?: GrafanaNavItem[];
  badge?: {
    text: string;
    color: string;
  };
}

export function createGrafanaStyleNavigation(): GrafanaNavItem[] {
  return [
    // Home
    {
      id: 'home',
      text: 'Home',
      icon: 'home-alt',
      url: '/',
    },

    // Create Section
    {
      id: 'create',
      text: 'Create',
      icon: 'plus',
      children: [
        { id: 'create-dashboard', text: 'Dashboard', url: '/dashboards/new', icon: 'apps' },
        { id: 'create-folder', text: 'Folder', url: '/dashboards/folder/new', icon: 'folder' },
        { id: 'import', text: 'Import', url: '/import', icon: 'import' },
      ]
    },

    // Dashboards Section
    {
      id: 'dashboards',
      text: 'Dashboards',
      icon: 'apps',
      children: [
        { id: 'dashboards-manage', text: 'Manage', url: '/dashboards', icon: 'apps' },
        { id: 'dashboards-browse', text: 'Browse', url: '/dashboards/browse', icon: 'search' },
        { id: 'dashboards-playlists', text: 'Playlists', url: '/playlists', icon: 'presentation-play' },
        { id: 'dashboards-snapshots', text: 'Snapshots', url: '/snapshots', icon: 'camera' },
        { id: 'dashboards-library', text: 'Library panels', url: '/dashboards/library-panels', icon: 'layer-group' },
        { id: 'dashboards-new', text: 'New dashboard', url: '/dashboards/new', icon: 'plus' },
        { id: 'dashboards-import', text: 'Import dashboard', url: '/import', icon: 'import' },
      ]
    },

    // Explore Section
    {
      id: 'explore',
      text: 'Explore',
      icon: 'compass',
      children: [
        { id: 'explore-metrics', text: 'Metrics', url: '/explore', icon: 'chart-line' },
        { id: 'explore-logs', text: 'Logs', url: '/logs', icon: 'document-info' },
        { id: 'explore-traces', text: 'Traces', url: '/explore/traces', icon: 'sitemap' },
        { id: 'explore-correlations', text: 'Correlations', url: '/explore/correlations', icon: 'link' },
      ]
    },

    // Alerting Section
    {
      id: 'alerting',
      text: 'Alerting',
      icon: 'bell',
      children: [
        { id: 'alerting-list', text: 'Alert rules', url: '/alerting/list', icon: 'list-ul' },
        { id: 'alerting-notifications', text: 'Contact points', url: '/alerting/notifications', icon: 'comment-alt-share' },
        { id: 'alerting-routes', text: 'Notification policies', url: '/alerting/routes', icon: 'sitemap' },
        { id: 'alerting-silences', text: 'Silences', url: '/alerting/silences', icon: 'bell-slash' },
        { id: 'alerting-groups', text: 'Alert groups', url: '/alerting/groups', icon: 'layer-group' },
        { id: 'alerting-admin', text: 'Admin', url: '/alerting/admin', icon: 'shield' },
      ]
    },

    // Connections Section
    {
      id: 'connections',
      text: 'Connections',
      icon: 'plug',
      children: [
        { id: 'datasources', text: 'Data sources', url: '/connections/datasources', icon: 'database' },
        { id: 'connections-add', text: 'Add new connection', url: '/connections/add-new-connection', icon: 'plus' },
      ]
    },

    // Administration Section
    {
      id: 'administration',
      text: 'Administration',
      icon: 'shield',
      children: [
        { id: 'admin-general', text: 'General', url: '/admin/general', icon: 'sliders-v-alt' },
        { id: 'admin-plugins', text: 'Plugins', url: '/admin/plugins', icon: 'plug' },
        { id: 'admin-users', text: 'Users', url: '/admin/users', icon: 'user' },
        { id: 'admin-teams', text: 'Teams', url: '/admin/teams', icon: 'users-alt' },
        { id: 'admin-serviceaccounts', text: 'Service accounts', url: '/admin/serviceaccounts', icon: 'key-skeleton-alt' },
        { id: 'admin-apikeys', text: 'API keys', url: '/admin/apikeys', icon: 'key-skeleton-alt' },
        { id: 'admin-org', text: 'Organizations', url: '/admin/organizations', icon: 'office-building' },
        { id: 'admin-settings', text: 'Settings', url: '/admin/settings', icon: 'cog' },
        { id: 'admin-migrate', text: 'Migrate to cloud', url: '/admin/migrate', icon: 'cloud-upload' },
      ]
    },

    // Divider
    { id: 'divider-1', text: '', divider: true },

    // Manufacturing Section (Custom)
    {
      id: 'manufacturing',
      text: 'Manufacturing',
      icon: 'factory',
      children: [
        { id: 'manufacturing-overview', text: 'Overview', url: '/dashboards/manufacturing', icon: 'chart-bar' },
        { id: 'equipment-monitoring', text: 'Equipment', url: '/equipment', icon: 'cog' },
        { id: 'production-metrics', text: 'Production', url: '/dashboards/production', icon: 'chart-line' },
        { id: 'quality-control', text: 'Quality', url: '/dashboards/quality', icon: 'shield-check' },
        { id: 'oee-dashboard', text: 'OEE Analysis', url: '/dashboards/oee', icon: 'chart-line' },
        { id: 'ai-assistant', text: 'AI Assistant', url: '/manufacturing-chat', icon: 'chat' },
      ]
    },

    // Divider
    { id: 'divider-2', text: '', divider: true },

    // Help Section
    {
      id: 'help',
      text: 'Help',
      icon: 'question-circle',
      children: [
        { id: 'help-docs', text: 'Documentation', url: '/help', icon: 'document-info' },
        { id: 'help-support', text: 'Support', url: '/support', icon: 'life-ring' },
        { id: 'help-community', text: 'Community', url: 'https://community.grafana.com', icon: 'comments', target: '_blank' },
      ]
    },
  ];
}

// Icon mapping for Grafana-style icons
export const grafanaIconMap: Record<string, string> = {
  'home-alt': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  'plus': 'M12 4v16m8-8H4',
  'apps': 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z',
  'folder': 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
  'import': 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10',
  'search': 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  'presentation-play': 'M7 4v16l13-8z',
  'camera': 'M3 9a2 2 0 012-2h1.28a2 2 0 001.7-1.05l.8-2.4a2 2 0 011.7-1.05h5.04a2 2 0 011.7 1.05l.8 2.4A2 2 0 0019.72 7H21a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z',
  'layer-group': 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  'compass': 'M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14',
  'chart-line': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  'document-info': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  'sitemap': 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  'link': 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
  'bell': 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  'list-ul': 'M4 6h16M4 12h16M4 18h16',
  'comment-alt-share': 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  'bell-slash': 'M13.73 21a2 2 0 01-3.46 0M18.63 13A17.89 17.89 0 0118 8M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14M18 8a6 6 0 00-9.33-5M3 3l18 18',
  'shield': 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  'plug': 'M10 12V6m0 12v-6m-5 0h5m5 0h5m3 5a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2h14a2 2 0 012 2v6z',
  'database': 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
  'sliders-v-alt': 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
  'user': 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  'users-alt': 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  'key-skeleton-alt': 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17l-4 4-4-4 4-4 2.257-2.257A6 6 0 1121 9z',
  'office-building': 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  'cog': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  'cloud-upload': 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v9',
  'factory': 'M19 21V13.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 7H11V3H9v4H7.586A1 1 0 006.879 7.293l-5.414 5.414A1 1 0 001.172 13.414V21h18z',
  'chart-bar': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  'shield-check': 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  'chat': 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  'question-circle': 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  'life-ring': 'M16.712 4.33a9.027 9.027 0 011.652 1.306c.51.51.944 1.064 1.306 1.652M16.712 4.33l-3.448 4.138m3.448-4.138a9.014 9.014 0 00-9.424 0M19.67 7.288l-4.138 3.448m4.138-3.448a9.014 9.014 0 010 9.424m-4.138-5.976a3.736 3.736 0 00-.88-1.388 3.737 3.737 0 00-1.388-.88m2.268 2.268a3.765 3.765 0 010 2.528m-2.268-4.796a3.765 3.765 0 00-2.528 0m4.796 4.796c-.181.506-.475.982-.88 1.388a3.736 3.736 0 01-1.388.88m2.268-2.268l4.138 3.448m0 0a9.027 9.027 0 01-1.306 1.652c-.51.51-1.064.944-1.652 1.306m0 0l-3.448-4.138m3.448 4.138a9.014 9.014 0 01-9.424 0m5.976-4.138a3.765 3.765 0 01-2.528 0m0 0a3.736 3.736 0 01-1.388-.88 3.737 3.737 0 01-.88-1.388m2.268 2.268L7.288 19.67m0 0a9.024 9.024 0 01-1.652-1.306 9.027 9.027 0 01-1.306-1.652m0 0l4.138-3.448M4.33 16.712a9.014 9.014 0 010-9.424m4.138 5.976a3.765 3.765 0 010-2.528m0 0c.181-.506.475-.982.88-1.388a3.736 3.736 0 011.388-.88m-2.268 2.268L4.33 7.288m6.406 1.18L7.288 4.33m0 0a9.024 9.024 0 00-1.652 1.306A9.025 9.025 0 004.33 7.288',
  'comments': 'M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z',
};