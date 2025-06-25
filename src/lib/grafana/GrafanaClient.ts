import axios, { AxiosInstance } from 'axios';

export interface GrafanaDashboard {
  id?: number;
  uid?: string;
  title: string;
  tags?: string[];
  timezone?: string;
  schemaVersion?: number;
  version?: number;
  refresh?: string | false;
  time?: {
    from: string;
    to: string;
  };
  templating?: {
    list: any[];
  };
  annotations?: {
    list: any[];
  };
  panels: any[];
  editable?: boolean;
  gnetId?: number;
  graphTooltip?: number;
  links?: any[];
  liveNow?: boolean;
}

export interface GrafanaDataSource {
  id?: number;
  uid?: string;
  orgId?: number;
  name: string;
  type: string;
  typeName?: string;
  typeLogoUrl?: string;
  access?: string;
  url?: string;
  password?: string;
  user?: string;
  database?: string;
  basicAuth?: boolean;
  basicAuthUser?: string;
  basicAuthPassword?: string;
  withCredentials?: boolean;
  isDefault?: boolean;
  jsonData?: any;
  secureJsonData?: any;
  version?: number;
  readOnly?: boolean;
}

export interface GrafanaOrganization {
  id: number;
  name: string;
  address?: {
    address1?: string;
    address2?: string;
    city?: string;
    zipCode?: string;
    state?: string;
    country?: string;
  };
}

export interface GrafanaUser {
  id: number;
  email: string;
  name: string;
  login: string;
  theme?: string;
  orgId: number;
  isGrafanaAdmin?: boolean;
  isDisabled?: boolean;
  isExternal?: boolean;
  authLabels?: string[];
  updatedAt?: string;
  createdAt?: string;
  avatarUrl?: string;
}

export interface GrafanaAlertRule {
  uid?: string;
  title: string;
  condition: string;
  data: any[];
  noDataState: 'NoData' | 'Alerting' | 'OK';
  execErrState: 'Alerting' | 'OK';
  for: string;
  annotations?: Record<string, string>;
  labels?: Record<string, string>;
  folderUID?: string;
  ruleGroup?: string;
}

export class GrafanaClient {
  private client: AxiosInstance;
  
  constructor(
    private baseUrl: string,
    private apiKey?: string,
    private username?: string
  ) {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Authorization': apiKey ? `Bearer ${apiKey}` : undefined,
        'X-Grafana-User': username,
        'Content-Type': 'application/json',
      },
    });
  }

  // ============================================================================
  // Dashboard Management
  // ============================================================================

  /**
   * Create a new dashboard
   */
  async createDashboard(dashboard: GrafanaDashboard, folderId?: number) {
    const response = await this.client.post('/api/dashboards/db', {
      dashboard,
      folderId,
      overwrite: false,
    });
    return response.data;
  }

  /**
   * Get dashboard by UID
   */
  async getDashboard(uid: string) {
    const response = await this.client.get(`/api/dashboards/uid/${uid}`);
    return response.data;
  }

  /**
   * Update existing dashboard
   */
  async updateDashboard(uid: string, dashboard: GrafanaDashboard, folderId?: number) {
    const current = await this.getDashboard(uid);
    const response = await this.client.post('/api/dashboards/db', {
      dashboard: {
        ...dashboard,
        id: current.dashboard.id,
        uid: uid,
        version: current.dashboard.version,
      },
      folderId,
      overwrite: true,
    });
    return response.data;
  }

  /**
   * Delete dashboard by UID
   */
  async deleteDashboard(uid: string) {
    const response = await this.client.delete(`/api/dashboards/uid/${uid}`);
    return response.data;
  }

  /**
   * Search dashboards
   */
  async searchDashboards(query?: string, tag?: string[], folderIds?: number[], starred?: boolean) {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (tag) tag.forEach(t => params.append('tag', t));
    if (folderIds) folderIds.forEach(id => params.append('folderIds', id.toString()));
    if (starred !== undefined) params.append('starred', starred.toString());
    
    const response = await this.client.get(`/api/search?${params}`);
    return response.data;
  }

  /**
   * Get dashboard permissions
   */
  async getDashboardPermissions(uid: string) {
    const response = await this.client.get(`/api/dashboards/uid/${uid}/permissions`);
    return response.data;
  }

  /**
   * Update dashboard permissions
   */
  async updateDashboardPermissions(uid: string, permissions: any[]) {
    const response = await this.client.post(`/api/dashboards/uid/${uid}/permissions`, {
      items: permissions,
    });
    return response.data;
  }

  // ============================================================================
  // DataSource Management
  // ============================================================================

  /**
   * Create a new data source
   */
  async createDataSource(dataSource: GrafanaDataSource) {
    const response = await this.client.post('/api/datasources', dataSource);
    return response.data;
  }

  /**
   * Get all data sources
   */
  async getDataSources() {
    const response = await this.client.get('/api/datasources');
    return response.data;
  }

  /**
   * Get data source by ID
   */
  async getDataSource(id: number) {
    const response = await this.client.get(`/api/datasources/${id}`);
    return response.data;
  }

  /**
   * Get data source by UID
   */
  async getDataSourceByUID(uid: string) {
    const response = await this.client.get(`/api/datasources/uid/${uid}`);
    return response.data;
  }

  /**
   * Update data source
   */
  async updateDataSource(id: number, dataSource: GrafanaDataSource) {
    const response = await this.client.put(`/api/datasources/${id}`, dataSource);
    return response.data;
  }

  /**
   * Delete data source by ID
   */
  async deleteDataSource(id: number) {
    const response = await this.client.delete(`/api/datasources/${id}`);
    return response.data;
  }

  /**
   * Test data source connection
   */
  async testDataSource(dataSource: GrafanaDataSource) {
    const response = await this.client.post('/api/datasources/test', dataSource);
    return response.data;
  }

  // ============================================================================
  // Query Execution
  // ============================================================================

  /**
   * Execute queries against data sources
   */
  async query(queries: any[], from: string, to: string, maxDataPoints?: number) {
    const response = await this.client.post('/api/ds/query', {
      queries,
      from,
      to,
      maxDataPoints,
    });
    return response.data;
  }

  /**
   * Get query history
   */
  async getQueryHistory(datasourceUid: string, limit?: number) {
    const params = new URLSearchParams();
    params.append('datasourceUid', datasourceUid);
    if (limit) params.append('limit', limit.toString());
    
    const response = await this.client.get(`/api/query-history?${params}`);
    return response.data;
  }

  // ============================================================================
  // Organizations
  // ============================================================================

  /**
   * Get current organization
   */
  async getCurrentOrg() {
    const response = await this.client.get('/api/org');
    return response.data;
  }

  /**
   * Create organization
   */
  async createOrganization(name: string) {
    const response = await this.client.post('/api/orgs', { name });
    return response.data;
  }

  /**
   * Get all organizations
   */
  async getOrganizations() {
    const response = await this.client.get('/api/orgs');
    return response.data;
  }

  /**
   * Update organization
   */
  async updateOrganization(id: number, name: string) {
    const response = await this.client.put(`/api/orgs/${id}`, { name });
    return response.data;
  }

  /**
   * Add user to organization
   */
  async addUserToOrg(orgId: number, loginOrEmail: string, role: 'Viewer' | 'Editor' | 'Admin') {
    const response = await this.client.post(`/api/orgs/${orgId}/users`, {
      loginOrEmail,
      role,
    });
    return response.data;
  }

  // ============================================================================
  // Users
  // ============================================================================

  /**
   * Get current user
   */
  async getCurrentUser() {
    const response = await this.client.get('/api/user');
    return response.data;
  }

  /**
   * Create user
   */
  async createUser(user: {
    name: string;
    email: string;
    login: string;
    password: string;
    OrgId?: number;
  }) {
    const response = await this.client.post('/api/admin/users', user);
    return response.data;
  }

  /**
   * Search users
   */
  async searchUsers(query?: string, page?: number, perpage?: number) {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (page) params.append('page', page.toString());
    if (perpage) params.append('perpage', perpage.toString());
    
    const response = await this.client.get(`/api/users?${params}`);
    return response.data;
  }

  // ============================================================================
  // Teams
  // ============================================================================

  /**
   * Create team
   */
  async createTeam(name: string, email?: string) {
    const response = await this.client.post('/api/teams', { name, email });
    return response.data;
  }

  /**
   * Search teams
   */
  async searchTeams(query?: string, page?: number, perpage?: number) {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (page) params.append('page', page.toString());
    if (perpage) params.append('perpage', perpage.toString());
    
    const response = await this.client.get(`/api/teams/search?${params}`);
    return response.data;
  }

  // ============================================================================
  // Folders
  // ============================================================================

  /**
   * Create folder
   */
  async createFolder(title: string, uid?: string) {
    const response = await this.client.post('/api/folders', { title, uid });
    return response.data;
  }

  /**
   * Get all folders
   */
  async getFolders(limit?: number) {
    const params = limit ? `?limit=${limit}` : '';
    const response = await this.client.get(`/api/folders${params}`);
    return response.data;
  }

  /**
   * Get folder by UID
   */
  async getFolder(uid: string) {
    const response = await this.client.get(`/api/folders/${uid}`);
    return response.data;
  }

  /**
   * Update folder
   */
  async updateFolder(uid: string, title: string, version: number) {
    const response = await this.client.put(`/api/folders/${uid}`, {
      title,
      version,
    });
    return response.data;
  }

  /**
   * Delete folder
   */
  async deleteFolder(uid: string, forceDeleteRules?: boolean) {
    const params = forceDeleteRules ? '?forceDeleteRules=true' : '';
    const response = await this.client.delete(`/api/folders/${uid}${params}`);
    return response.data;
  }

  // ============================================================================
  // Alerting
  // ============================================================================

  /**
   * Create alert rule
   */
  async createAlertRule(rule: GrafanaAlertRule) {
    const response = await this.client.post('/api/v1/provisioning/alert-rules', rule);
    return response.data;
  }

  /**
   * Get all alert rules
   */
  async getAlertRules() {
    const response = await this.client.get('/api/v1/provisioning/alert-rules');
    return response.data;
  }

  /**
   * Get alert rule by UID
   */
  async getAlertRule(uid: string) {
    const response = await this.client.get(`/api/v1/provisioning/alert-rules/${uid}`);
    return response.data;
  }

  /**
   * Update alert rule
   */
  async updateAlertRule(uid: string, rule: GrafanaAlertRule) {
    const response = await this.client.put(`/api/v1/provisioning/alert-rules/${uid}`, rule);
    return response.data;
  }

  /**
   * Delete alert rule
   */
  async deleteAlertRule(uid: string) {
    const response = await this.client.delete(`/api/v1/provisioning/alert-rules/${uid}`);
    return response.data;
  }

  /**
   * Create notification policy
   */
  async createNotificationPolicy(policy: any) {
    const response = await this.client.put('/api/v1/provisioning/policies', policy);
    return response.data;
  }

  /**
   * Get contact points
   */
  async getContactPoints() {
    const response = await this.client.get('/api/v1/provisioning/contact-points');
    return response.data;
  }

  // ============================================================================
  // Annotations
  // ============================================================================

  /**
   * Create annotation
   */
  async createAnnotation(annotation: {
    dashboardId?: number;
    panelId?: number;
    time: number;
    timeEnd?: number;
    tags?: string[];
    text: string;
  }) {
    const response = await this.client.post('/api/annotations', annotation);
    return response.data;
  }

  /**
   * Find annotations
   */
  async findAnnotations(params: {
    from?: number;
    to?: number;
    limit?: number;
    alertId?: number;
    dashboardId?: number;
    panelId?: number;
    userId?: number;
    type?: string;
    tags?: string[];
  }) {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });
    
    const response = await this.client.get(`/api/annotations?${queryParams}`);
    return response.data;
  }

  // ============================================================================
  // API Keys
  // ============================================================================

  /**
   * Create API key
   */
  async createAPIKey(name: string, role: 'Viewer' | 'Editor' | 'Admin', secondsToLive?: number) {
    const response = await this.client.post('/api/auth/keys', {
      name,
      role,
      secondsToLive,
    });
    return response.data;
  }

  /**
   * Get all API keys
   */
  async getAPIKeys() {
    const response = await this.client.get('/api/auth/keys');
    return response.data;
  }

  /**
   * Delete API key
   */
  async deleteAPIKey(id: number) {
    const response = await this.client.delete(`/api/auth/keys/${id}`);
    return response.data;
  }

  // ============================================================================
  // Service Accounts
  // ============================================================================

  /**
   * Create service account
   */
  async createServiceAccount(name: string, role: 'Viewer' | 'Editor' | 'Admin') {
    const response = await this.client.post('/api/serviceaccounts', {
      name,
      role,
    });
    return response.data;
  }

  /**
   * Create service account token
   */
  async createServiceAccountToken(serviceAccountId: number, name: string, secondsToLive?: number) {
    const response = await this.client.post(`/api/serviceaccounts/${serviceAccountId}/tokens`, {
      name,
      secondsToLive,
    });
    return response.data;
  }

  // ============================================================================
  // Preferences
  // ============================================================================

  /**
   * Get current user preferences
   */
  async getUserPreferences() {
    const response = await this.client.get('/api/user/preferences');
    return response.data;
  }

  /**
   * Update current user preferences
   */
  async updateUserPreferences(preferences: {
    theme?: 'light' | 'dark' | 'system';
    homeDashboardId?: number;
    timezone?: string;
    weekStart?: string;
  }) {
    const response = await this.client.put('/api/user/preferences', preferences);
    return response.data;
  }

  // ============================================================================
  // Admin
  // ============================================================================

  /**
   * Get server settings (admin only)
   */
  async getSettings() {
    const response = await this.client.get('/api/admin/settings');
    return response.data;
  }

  /**
   * Get server stats (admin only)
   */
  async getStats() {
    const response = await this.client.get('/api/admin/stats');
    return response.data;
  }

  // ============================================================================
  // Provisioning
  // ============================================================================

  /**
   * Reload provisioning configurations
   */
  async reloadProvisioning(type: 'dashboards' | 'datasources' | 'plugins' | 'notifications' | 'alerting') {
    const response = await this.client.post(`/api/admin/provisioning/${type}/reload`);
    return response.data;
  }

  // ============================================================================
  // Health
  // ============================================================================

  /**
   * Get health status
   */
  async getHealth() {
    const response = await this.client.get('/api/health');
    return response.data;
  }

  // ============================================================================
  // Playlists
  // ============================================================================

  /**
   * Create playlist
   */
  async createPlaylist(playlist: {
    name: string;
    interval: string;
    items: Array<{
      type: 'dashboard_by_id' | 'dashboard_by_tag' | 'dashboard_by_uid';
      value: string;
      order: number;
      title?: string;
    }>;
  }) {
    const response = await this.client.post('/api/playlists', playlist);
    return response.data;
  }

  /**
   * Get all playlists
   */
  async getPlaylists() {
    const response = await this.client.get('/api/playlists');
    return response.data;
  }

  /**
   * Start playlist
   */
  async startPlaylist(uid: string) {
    const response = await this.client.get(`/api/playlists/${uid}/start`);
    return response.data;
  }

  // ============================================================================
  // Library Elements (Panels)
  // ============================================================================

  /**
   * Create library panel
   */
  async createLibraryPanel(panel: {
    folderUid?: string;
    name: string;
    model: any;
  }) {
    const response = await this.client.post('/api/library-elements', {
      ...panel,
      kind: 1, // 1 for panels, 2 for variables
    });
    return response.data;
  }

  /**
   * Get library panels
   */
  async getLibraryPanels(searchString?: string, folderFilter?: string[]) {
    const params = new URLSearchParams();
    params.append('kind', '1'); // panels
    if (searchString) params.append('searchString', searchString);
    if (folderFilter) folderFilter.forEach(f => params.append('folderFilter', f));
    
    const response = await this.client.get(`/api/library-elements?${params}`);
    return response.data;
  }
}

// Create a singleton instance
let grafanaClientInstance: GrafanaClient | null = null;

export function getGrafanaClient(): GrafanaClient {
  if (!grafanaClientInstance) {
    const baseUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3000';
    const apiKey = process.env.GRAFANA_API_KEY;
    grafanaClientInstance = new GrafanaClient(baseUrl, apiKey);
  }
  return grafanaClientInstance;
}

// Export singleton instance
export const grafanaClient = getGrafanaClient();