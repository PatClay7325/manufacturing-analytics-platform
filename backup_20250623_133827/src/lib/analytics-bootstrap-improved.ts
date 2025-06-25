// Improved Navigation Structure for Manufacturing AnalyticsPlatform
// Following industry SOP for clarity and logical grouping

export function createImprovedNavigationTree(): NavTreeNode[] {
  return [
    // PRIMARY OPERATIONS - Most frequently used features at the top
    {
      id: 'operations',
      text: 'Operations',
      icon: 'apps',
      children: [
        { id: 'home-dashboard', text: 'Operations Overview', url: '/dashboard', icon: 'home-alt' },
        { id: 'live-monitoring', text: 'Live Monitoring', url: '/monitoring', icon: 'eye' },
        { id: 'oee-dashboard', text: 'OEE Dashboard', url: '/dashboards/oee', icon: 'chart-line' },
        { id: 'production-dashboard', text: 'Production Metrics', url: '/dashboards/production', icon: 'chart-bar' },
        { id: 'quality-dashboard', text: 'Quality Control', url: '/dashboards/quality', icon: 'shield-check' }
      ]
    },
    
    // AI & INSIGHTS - Strategic features
    {
      id: 'intelligence',
      text: 'Intelligence',
      icon: 'brain',
      children: [
        { id: 'ai-assistant', text: 'AI Assistant', url: '/ai-chat', icon: 'comment-alt-share' },
        { id: 'manufacturing-chat', text: 'Manufacturing Expert', url: '/manufacturing-chat', icon: 'chat' },
        { id: 'analytics', text: 'Advanced Analytics', url: '/Analytics-dashboard', icon: 'chart-pie' },
        { id: 'insights', text: 'Insights & Trends', url: '/explore', icon: 'compass' }
      ]
    },
    
    // EQUIPMENT & ASSETS - Core manufacturing focus
    {
      id: 'equipment',
      text: 'Equipment',
      icon: 'cog',
      children: [
        { id: 'equipment-status', text: 'Equipment Status', url: '/equipment', icon: 'heart-rate' },
        { id: 'maintenance-schedule', text: 'Maintenance', url: '/dashboards/maintenance', icon: 'wrench' },
        { id: 'diagnostics', text: 'Diagnostics', url: '/diagnostics', icon: 'stethoscope' },
        { id: 'equipment-history', text: 'Performance History', url: '/equipment/history', icon: 'history' }
      ]
    },
    
    // ALERTS & NOTIFICATIONS - Critical for operations
    {
      id: 'alerts',
      text: 'Alerts',
      icon: 'bell',
      children: [
        { id: 'active-alerts', text: 'Active Alerts', url: '/alerts', icon: 'bell' },
        { id: 'alert-rules', text: 'Alert Rules', url: '/alerting/list', icon: 'list-ul' },
        { id: 'notifications', text: 'Notifications', url: '/alerting/notifications', icon: 'comment-alt-share' },
        { id: 'alert-history', text: 'Alert History', url: '/alerting/history', icon: 'history' },
        { id: 'silences', text: 'Silences', url: '/alerting/silences', icon: 'bell-slash' }
      ]
    },
    
    // DASHBOARDS & REPORTS - Separated for clarity
    {
      id: 'dashboards',
      text: 'Dashboards',
      icon: 'apps',
      children: [
        { id: 'browse-dashboards', text: 'All Dashboards', url: '/dashboards', icon: 'sitemap' },
        { id: 'my-dashboards', text: 'My Dashboards', url: '/dashboards/mine', icon: 'user' },
        { id: 'shared-dashboards', text: 'Shared', url: '/dashboards/shared', icon: 'share-alt' },
        { id: 'public-dashboards', text: 'Public', url: '/dashboards/public', icon: 'globe-alt' },
        { id: 'create-dashboard', text: 'Create New', url: '/dashboards/new', icon: 'plus' }
      ]
    },
    
    // DATA MANAGEMENT - Grouped together
    {
      id: 'data',
      text: 'Data',
      icon: 'database',
      children: [
        { id: 'data-sources', text: 'Data Sources', url: '/datasources', icon: 'database' },
        { id: 'data-upload', text: 'Upload Data', url: '/data-upload', icon: 'upload' },
        { id: 'import-data', text: 'Import', url: '/import', icon: 'arrow-down' },
        { id: 'export-data', text: 'Export', url: '/export', icon: 'arrow-up' },
        { id: 'data-explorer', text: 'Data Explorer', url: '/explore', icon: 'search' }
      ]
    },
    
    // ADMINISTRATION - System settings
    {
      id: 'admin',
      text: 'Administration',
      icon: 'shield',
      children: [
        { id: 'users', text: 'Users', url: '/admin/users', icon: 'user' },
        { id: 'teams', text: 'Teams', url: '/admin/teams', icon: 'users-alt' },
        { id: 'permissions', text: 'Permissions', url: '/admin/permissions', icon: 'lock' },
        { id: 'organization', text: 'Organization', url: '/org', icon: 'office-building' },
        { id: 'api-keys', text: 'API Keys', url: '/api-keys', icon: 'key-skeleton-alt' }
      ]
    },
    
    // SETTINGS - User preferences
    {
      id: 'settings',
      text: 'Settings',
      icon: 'cog',
      children: [
        { id: 'preferences', text: 'Preferences', url: '/profile/preferences', icon: 'sliders-v-alt' },
        { id: 'profile', text: 'My Profile', url: '/profile', icon: 'user' },
        { id: 'plugins', text: 'Plugins', url: '/plugins', icon: 'plug' },
        { id: 'system-settings', text: 'System', url: '/admin', icon: 'cog' }
      ]
    },
    
    // HELP & SUPPORT - Always at bottom
    {
      id: 'help',
      text: 'Help',
      icon: 'question-circle',
      children: [
        { id: 'documentation', text: 'Documentation', url: '/documentation', icon: 'document-info' },
        { id: 'support', text: 'Support', url: '/support', icon: 'life-ring' },
        { id: 'shortcuts', text: 'Keyboard Shortcuts', url: '/shortcuts', icon: 'keyboard' },
        { id: 'about', text: 'About', url: '/about', icon: 'info-circle' }
      ]
    }
  ];
}

// Quick Actions Bar - For frequently used actions
export function createQuickActionsBar(): NavTreeNode {
  return {
    id: 'quick-actions',
    text: 'Quick Actions',
    icon: 'bolt',
    children: [
      { id: 'new-dashboard', text: 'New Dashboard', url: '/dashboards/new', icon: 'plus' },
      { id: 'new-alert', text: 'New Alert', url: '/alerting/new', icon: 'bell' },
      { id: 'upload-data', text: 'Upload Data', url: '/data-upload', icon: 'upload' },
      { id: 'view-alerts', text: 'View Alerts', url: '/alerts', icon: 'exclamation-triangle' }
    ]
  };
}

// Development menu - Only show in development mode
export function createDevelopmentMenu(): NavTreeNode | null {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return {
    id: 'development',
    text: 'Development',
    icon: 'code-branch',
    children: [
      { id: 'test-prometheus', text: 'Prometheus Test', url: '/test-prometheus', icon: 'bug' },
      { id: 'component-library', text: 'Component Library', url: '/dev/ui-components', icon: 'layer-group' },
      { id: 'api-explorer', text: 'API Explorer', url: '/dev/api-testing', icon: 'code' },
      { id: 'performance-profiler', text: 'Performance', url: '/dev/performance', icon: 'tachometer-alt' },
      { id: 'debug-tools', text: 'Debug Tools', url: '/dev/debugging', icon: 'bug' }
    ]
  };
}