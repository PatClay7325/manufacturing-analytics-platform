/**
 * Analytics Bootstrap Configuration System
 * Provides comprehensive application configuration for the manufacturing analyticsPlatform
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  login: string;
  orgId: string;
  orgName: string;
  orgRole: string;
  isAdmin: boolean;
  isSignedIn: boolean;
  theme: 'light' | 'dark';
  locale: string;
  timezone: string;
  hasEditPermissionInFolders: boolean;
  lightTheme: boolean;
  permissions: Record<string, boolean>;
}

export interface NavTreeNode {
  id: string;
  text: string;
  subTitle?: string;
  icon?: string;
  url?: string;
  target?: string;
  divider?: boolean;
  hideFromTabs?: boolean;
  children?: NavTreeNode[];
  isSection?: boolean;
  breadcrumbs?: Array<{ title: string; url: string }>;
  active?: boolean;
  hasSubMenu?: boolean;
  parentItem?: NavTreeNode;
}

export interface PanelPlugin {
  id: string;
  name: string;
  sort: number;
  info: {
    author: {
      name: string;
      url: string;
    };
    description: string;
    screenshots: any[];
    updated: string;
    version: string;
  };
  hideFromList: boolean;
  module: string;
  baseUrl: string;
  category: string;
  state: 'stable' | 'beta' | 'deprecated';
  signature: string;
  angular?: {
    detected: boolean;
    hideDeprecation: boolean;
  };
}

export interface DataSource {
  id: string;
  uid: string;
  orgId: number;
  name: string;
  type: string;
  typeName: string;
  typeLogoUrl: string;
  access: string;
  url: string;
  password: string;
  user: string;
  database: string;
  basicAuth: boolean;
  basicAuthUser: string;
  basicAuthPassword: string;
  withCredentials: boolean;
  isDefault: boolean;
  jsonData: Record<string, any>;
  secureJsonFields: Record<string, boolean>;
  version: number;
  readOnly: boolean;
  apiVersion: string;
  metricsNamespacePrefix: string;
}

export interface BootstrapConfig {
  user: User;
  settings: {
    dateFormats: {
      fullDate: string;
      interval: {
        millisecond: string;
        second: string;
        minute: string;
        hour: string;
        day: string;
        month: string;
        year: string;
      };
      useBrowserLocale: boolean;
      defaultTimezone: string;
    };
    panels: Record<string, PanelPlugin>;
    navTree: NavTreeNode[];
    datasources: Record<string, DataSource>;
    defaultDatasource: string;
    alertingEnabled: boolean;
    alertingErrorOrTimeout: string;
    alertingNoDataOrNullValues: string;
    alertingMinInterval: string;
    angularSupportEnabled: boolean;
    authProxyEnabled: boolean;
    ldapEnabled: boolean;
    samlEnabled: boolean;
    autoAssignOrg: boolean;
    verifyEmailEnabled: boolean;
    oauth: Record<string, any>;
    disableUserSignUp: boolean;
    loginHint: string;
    passwordHint: string;
    externalUserMngInfo: string;
    externalUserMngLinkUrl: string;
    externalUserMngLinkName: string;
    allowOrgCreate: boolean;
    feedbackLinksEnabled: boolean;
    googleAnalyticsId: string;
    googleTagManagerId: string;
    buildInfo: {
      version: string;
      commit: string;
      env: string;
      edition: string;
      latestVersion: string;
      hasUpdate: boolean;
      hideVersion: boolean;
    };
    licenseInfo: {
      hasLicense: boolean;
      expiry: number;
      stateInfo: string;
      limitBy: string;
      included_users: number;
      slug: string;
    };
    featureToggles: Record<string, boolean>;
    rendererAvailable: boolean;
    rendererVersion: string;
    secretsManagerPluginEnabled: boolean;
    supportBundlesEnabled: boolean;
    dashboardPreviews: {
      systemRequirements: {
        met: boolean;
        requiredImageRendererPluginVersion: string;
      };
    };
    sentry: {
      enabled: boolean;
      dsn: string;
      customEndpoint: string;
      sampleRate: number;
    };
    pluginCatalogURL: string;
    pluginAdminEnabled: boolean;
    pluginAdminExternalManageEnabled: boolean;
    pluginCatalogHiddenPlugins: string[];
    expressionsEnabled: boolean;
    customTheme?: {
      path: string;
    };
    bootData: any;
  };
  theme: {
    type: 'light' | 'dark';
    colors: Record<string, string>;
  };
  licensing: {
    limitBy: string;
    slug: string;
    includedUsers: number;
  };
}

class BootstrapManager {
  private static instance: BootstrapManager;
  private config: BootstrapConfig | null = null;

  private constructor() {}

  public static getInstance(): BootstrapManager {
    if (!BootstrapManager.instance) {
      BootstrapManager.instance = new BootstrapManager();
    }
    return BootstrapManager.instance;
  }

  public initializeBootstrapConfig(user?: Partial<User>): BootstrapConfig {
    this.config = {
      user: {
        id: user?.id || 'default-user',
        email: user?.email || 'admin@manufacturing.local',
        name: user?.name || 'Manufacturing Admin',
        login: user?.login || 'admin',
        orgId: user?.orgId || '1',
        orgName: user?.orgName || 'Manufacturing Analytics',
        orgRole: user?.orgRole || 'Admin',
        isAdmin: user?.isAdmin ?? true,
        isSignedIn: user?.isSignedIn ?? true,
        theme: user?.theme || 'dark',
        locale: user?.locale || 'en-US',
        timezone: user?.timezone || 'browser',
        hasEditPermissionInFolders: user?.hasEditPermissionInFolders ?? true,
        lightTheme: user?.lightTheme ?? false,
        permissions: user?.permissions || {
          'dashboards:create': true,
          'dashboards:read': true,
          'dashboards:write': true,
          'dashboards:delete': true,
          'alerts:read': true,
          'alerts:write': true,
          'datasources:read': true,
          'datasources:write': true,
          'users:read': true,
          'users:write': true,
          'teams:read': true,
          'teams:write': true,
          'folders:create': true,
          'folders:read': true,
          'folders:write': true,
          'folders:delete': true,
        }
      },
      settings: this.createDefaultSettings(),
      theme: {
        type: user?.theme || 'dark',
        colors: this.getThemeColors(user?.theme || 'dark')
      },
      licensing: {
        limitBy: 'users',
        slug: 'manufacturing',
        includedUsers: -1
      }
    };

    return this.config;
  }

  private createDefaultSettings() {
    return {
      dateFormats: {
        fullDate: 'YYYY-MM-DD HH:mm:ss',
        interval: {
          millisecond: 'HH:mm:ss.SSS',
          second: 'HH:mm:ss',
          minute: 'HH:mm',
          hour: 'MM/DD HH:mm',
          day: 'MM/DD',
          month: 'YYYY-MM',
          year: 'YYYY'
        },
        useBrowserLocale: false,
        defaultTimezone: 'browser'
      },
      panels: this.createPanelRegistry(),
      navTree: this.createNavigationTree(),
      datasources: this.createDataSources(),
      defaultDatasource: 'manufacturing-metrics',
      alertingEnabled: true,
      alertingErrorOrTimeout: 'alerting',
      alertingNoDataOrNullValues: 'no_data',
      alertingMinInterval: '10s',
      angularSupportEnabled: false,
      authProxyEnabled: false,
      ldapEnabled: false,
      samlEnabled: false,
      autoAssignOrg: true,
      verifyEmailEnabled: false,
      oauth: {},
      disableUserSignUp: false,
      loginHint: '',
      passwordHint: '',
      externalUserMngInfo: '',
      externalUserMngLinkUrl: '',
      externalUserMngLinkName: '',
      allowOrgCreate: false,
      feedbackLinksEnabled: true,
      googleAnalyticsId: '',
      googleTagManagerId: '',
      buildInfo: {
        version: '1.0.0',
        commit: 'development',
        env: 'development',
        edition: 'Manufacturing Intelligence Platform',
        latestVersion: '1.0.0',
        hasUpdate: false,
        hideVersion: false
      },
      licenseInfo: {
        hasLicense: true,
        expiry: 0,
        stateInfo: '',
        limitBy: 'users',
        included_users: -1,
        slug: 'manufacturing'
      },
      featureToggles: {
        live: true,
        meta: true,
        panelTitleSearch: true,
        publicDashboards: true,
        publicDashboardsEmailSharing: true,
        lokiLive: true,
        lokiDataframeApi: true,
        storageLocalUpload: true,
        exploreMixedDatasource: true,
        tracing: true,
        correlations: true,
        datasourceQueryMultiStatus: true,
        autoMigrateOldPanels: true,
        disableAngular: false,
        canvasPanelNesting: true,
        scenes: true,
        disableSecretsCompatibility: false,
        logRequestsInstrumentedAsUnknown: false,
        dataConnectionsConsole: true,
        internationalization: false,
        topnav: true,
        grpcServer: false,
        entityStore: true,
        cloudWatchCrossAccountQuerying: true,
        redshiftAsyncQueryDataSupport: true,
        athenaAsyncQueryDataSupport: true,
        newNavigation: false,
        showDashboardValidationWarnings: false,
        mysqlAnsiQuotes: true,
        accessControlOnCall: false,
        nestedFolders: false,
        nestedFolderPicker: false,
        alertingBacktesting: false,
        returnUnameRegexErrors: false,
        alertingNoNormalState: false,
        logsContextDatasourceUi: false,
        lokiQuerySplitting: true,
        lokiQuerySplittingConfig: true,
        individualCookiePreferences: true,
        prometheusMetricEncyclopedia: true,
        influxdbBackendMigration: true,
        clientTokenRotation: true,
        prometheusDataplane: false,
        lokiMetricDataplane: false,
        dataplaneFrontendFallback: true,
        disableSSEDataplane: false,
        alertStateHistoryLokiSecondary: false,
        alertStateHistoryLokiPrimary: false,
        unifiedRequestLog: false,
        renderAuthJWT: false
      },
      rendererAvailable: false,
      rendererVersion: '',
      secretsManagerPluginEnabled: false,
      supportBundlesEnabled: true,
      dashboardPreviews: {
        systemRequirements: {
          met: false,
          requiredImageRendererPluginVersion: ''
        }
      },
      sentry: {
        enabled: false,
        dsn: '',
        customEndpoint: '',
        sampleRate: 1.0
      },
      pluginCatalogURL: 'https://analyticsPlatform.com/api/plugins',
      pluginAdminEnabled: true,
      pluginAdminExternalManageEnabled: false,
      pluginCatalogHiddenPlugins: [],
      expressionsEnabled: true,
      bootData: {}
    };
  }

  private createPanelRegistry(): Record<string, PanelPlugin> {
    const panels: Record<string, PanelPlugin> = {};
    
    // Core Manufacturing Panels
    const panelConfigs = [
      { id: 'timeseries', name: 'Time series', category: 'Time series', state: 'stable' as const },
      { id: 'stat', name: 'Stat', category: 'Single stat', state: 'stable' as const },
      { id: 'gauge', name: 'Gauge', category: 'Single stat', state: 'stable' as const },
      { id: 'bargauge', name: 'Bar gauge', category: 'Single stat', state: 'stable' as const },
      { id: 'table', name: 'Table', category: 'Table', state: 'stable' as const },
      { id: 'piechart', name: 'Pie chart', category: 'Chart', state: 'stable' as const },
      { id: 'barchart', name: 'Bar chart', category: 'Chart', state: 'stable' as const },
      { id: 'histogram', name: 'Histogram', category: 'Chart', state: 'stable' as const },
      { id: 'heatmap', name: 'Heatmap', category: 'Chart', state: 'stable' as const },
      { id: 'logs', name: 'Logs', category: 'Logs', state: 'stable' as const },
      { id: 'text', name: 'Text', category: 'Text', state: 'stable' as const },
      { id: 'news', name: 'News', category: 'Text', state: 'stable' as const },
      { id: 'dashlist', name: 'Dashboard list', category: 'List', state: 'stable' as const },
      { id: 'alertlist', name: 'Alert list', category: 'List', state: 'stable' as const },
      { id: 'canvas', name: 'Canvas', category: 'Canvas', state: 'beta' as const },
      { id: 'geomap', name: 'Geomap', category: 'Map', state: 'beta' as const },
      { id: 'nodeGraph', name: 'Node Graph', category: 'Graph', state: 'beta' as const },
      { id: 'traces', name: 'Traces', category: 'Traces', state: 'beta' as const },
      { id: 'flamegraph', name: 'Flame Graph', category: 'Profiling', state: 'beta' as const },
      { id: 'candlestick', name: 'Candlestick', category: 'Chart', state: 'beta' as const },
      { id: 'state-timeline', name: 'State timeline', category: 'Timeline', state: 'stable' as const },
      { id: 'status-history', name: 'Status history', category: 'Timeline', state: 'stable' as const }
    ];

    panelConfigs.forEach((config, index) => {
      panels[config.id] = {
        id: config.id,
        name: config.name,
        sort: index + 1,
        info: {
          author: { name: 'Manufacturing Analytics', url: '' },
          description: `${config.name} panel for manufacturing data visualization`,
          screenshots: [],
          updated: new Date().toISOString(),
          version: '1.0.0'
        },
        hideFromList: false,
        module: `app/plugins/panel/${config.id}/module`,
        baseUrl: `public/app/plugins/panel/${config.id}`,
        category: config.category,
        state: config.state,
        signature: 'internal'
      };
    });

    return panels;
  }

  private createNavigationTree(): NavTreeNode[] {
    const navItems: NavTreeNode[] = [
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

      // POC Management Section (Priority)
      {
        id: 'poc-management',
        text: '🎯 POC Management',
        icon: 'target',
        url: '/poc-management',
        isSection: false
      },

      // Divider
      { id: 'divider-poc', text: '', divider: true },

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

      // Grafana Integration
      {
        id: 'grafana',
        text: 'Grafana Dashboards',
        icon: 'chart-line',
        children: [
          { id: 'grafana-oee-dashboard', text: '⭐ ISO 22400 OEE Dashboard', url: '/grafana/oee-dashboard', icon: 'chart-line' },
          { id: 'grafana-external', text: 'Open Grafana ↗', url: process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001', target: '_blank', icon: 'external-link-alt' }
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
        ]
      }
    ];

    return navItems;
  }

  private createDataSources(): Record<string, DataSource> {
    return {
      'manufacturing-metrics': {
        id: '1',
        uid: 'manufacturing-metrics',
        orgId: 1,
        name: 'Manufacturing-Metrics',
        type: 'prometheus',
        typeName: 'Prometheus',
        typeLogoUrl: 'public/img/icn-datasource-prometheus.svg',
        access: 'proxy',
        url: 'http://localhost:9090',
        password: '',
        user: '',
        database: '',
        basicAuth: false,
        basicAuthUser: '',
        basicAuthPassword: '',
        withCredentials: false,
        isDefault: true,
        jsonData: {
          httpMethod: 'POST',
          prometheusType: 'Prometheus',
          prometheusVersion: '2.40.0',
          timeInterval: '30s',
          queryTimeout: '60s',
          httpHeaderName1: 'Authorization'
        },
        secureJsonFields: {},
        version: 1,
        readOnly: false,
        apiVersion: '1',
        metricsNamespacePrefix: ''
      },
      'manufacturing-testdata': {
        id: '2',
        uid: 'manufacturing-testdata',
        orgId: 1,
        name: 'Manufacturing-TestData',
        type: 'testdata',
        typeName: 'TestData',
        typeLogoUrl: 'public/img/icn-datasource-default.svg',
        access: 'direct',
        url: '',
        password: '',
        user: '',
        database: '',
        basicAuth: false,
        basicAuthUser: '',
        basicAuthPassword: '',
        withCredentials: false,
        isDefault: false,
        jsonData: {},
        secureJsonFields: {},
        version: 1,
        readOnly: false,
        apiVersion: '1',
        metricsNamespacePrefix: ''
      }
    };
  }

  private getThemeColors(theme: 'light' | 'dark'): Record<string, string> {
    if (theme === 'light') {
      return {
        primary: '#1f2937',
        secondary: '#6b7280',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
        light: '#f9fafb',
        dark: '#111827',
        body: '#ffffff',
        muted: '#6b7280'
      };
    }

    return {
      primary: '#f9fafb',
      secondary: '#9ca3af',
      success: '#10b981',
      danger: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6',
      light: '#374151',
      dark: '#111827',
      body: '#1f2937',
      muted: '#6b7280'
    };
  }

  public getConfig(): BootstrapConfig | null {
    return this.config;
  }

  public updateUser(userUpdate: Partial<User>): void {
    if (this.config) {
      this.config.user = { ...this.config.user, ...userUpdate };
    }
  }

  public addNavItem(item: NavTreeNode, parentId?: string): void {
    if (!this.config) return;

    if (parentId) {
      // Find parent and add to children
      const findAndAddToParent = (nodes: NavTreeNode[]): boolean => {
        for (const node of nodes) {
          if (node.id === parentId) {
            if (!node.children) node.children = [];
            node.children.push(item);
            return true;
          }
          if (node.children && findAndAddToParent(node.children)) {
            return true;
          }
        }
        return false;
      };
      findAndAddToParent(this.config.settings.navTree);
    } else {
      this.config.settings.navTree.push(item);
    }
  }

  public registerPanel(panelId: string, panel: PanelPlugin): void {
    if (this.config) {
      this.config.settings.panels[panelId] = panel;
    }
  }

  public addDataSource(uid: string, datasource: DataSource): void {
    if (this.config) {
      this.config.settings.datasources[uid] = datasource;
    }
  }
}

export const bootstrapManager = BootstrapManager.getInstance();