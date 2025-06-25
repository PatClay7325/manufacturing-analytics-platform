// Use local Grafana types until packages are properly installed
// TODO: Replace with official @grafana/data imports once packages are installed
import { DataFrame, DataQueryRequest, DataQueryResponse } from '@/core/datasources/GrafanaDataSourcePlugin';
import { logger } from '@/lib/logger';
import { CircuitBreaker } from '@/lib/resilience/CircuitBreaker';

export interface GrafanaConfig {
  grafanaUrl: string;
  apiKey: string;
  timeout?: number;
  retryAttempts?: number;
}

export interface GrafanaUser {
  id: number;
  email: string;
  login: string;
  name?: string;
  orgId: number;
  isGrafanaAdmin?: boolean;
}

export interface GrafanaDashboard {
  id?: number;
  uid?: string;
  title: string;
  tags?: string[];
  url?: string;
  folderId?: number;
  folderUid?: string;
  folderTitle?: string;
  folderUrl?: string;
  isStarred?: boolean;
  dashboard?: any;
  meta?: any;
}

export interface GrafanaDatasource {
  id: number;
  uid: string;
  name: string;
  type: string;
  url: string;
  access: string;
  isDefault: boolean;
  database?: string;
  user?: string;
  jsonData?: any;
  secureJsonFields?: any;
}

export interface GrafanaAlertRule {
  id?: number;
  uid?: string;
  title: string;
  condition: string;
  data: any[];
  intervalSeconds: number;
  noDataState: string;
  execErrState: string;
  annotations?: Record<string, string>;
  labels?: Record<string, string>;
  folderUID?: string;
  ruleGroup?: string;
}

export interface DashboardQueryOptions {
  range?: {
    from: string;
    to: string;
  };
  variables?: Record<string, string>;
  refresh?: boolean;
  panelId?: number;
}

export interface GrafanaQueryResult {
  data: DataFrame[];
  error?: string;
  state?: string;
}

export class GrafanaApiService {
  private config: GrafanaConfig;
  private baseHeaders: Record<string, string>;
  private circuitBreaker: CircuitBreaker;

  constructor(config: GrafanaConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      ...config,
    };
    
    this.baseHeaders = {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Manufacturing-Analytics-Platform/1.0',
    };

    // Circuit breaker for Grafana API calls
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      timeout: 60000, // 1 minute
      monitoringPeriod: 30000, // 30 seconds
      name: 'grafana-api'
    });
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      const url = `${this.config.grafanaUrl}/api/${endpoint}`;
      
      logger.debug('Making Grafana API request', {
        endpoint,
        method: options.method || 'GET',
        url: url.replace(this.config.grafanaUrl, '[REDACTED]')
      });

      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.baseHeaders,
          ...options.headers,
        },
        signal: AbortSignal.timeout(this.config.timeout!),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Grafana API error', {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        
        // Throw different error types based on status code
        if (response.status === 401) {
          throw new Error('Grafana authentication failed');
        } else if (response.status === 403) {
          throw new Error('Grafana authorization failed');
        } else if (response.status === 404) {
          throw new Error(`Grafana resource not found: ${endpoint}`);
        } else if (response.status >= 500) {
          throw new Error(`Grafana server error: ${response.status}`);
        } else {
          throw new Error(`Grafana API error: ${response.status} ${response.statusText}`);
        }
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      } else {
        return response.text() as any;
      }
    });
  }

  // User Management
  async getCurrentUser(): Promise<GrafanaUser> {
    return this.makeRequest<GrafanaUser>('user');
  }

  async getUsers(): Promise<GrafanaUser[]> {
    return this.makeRequest<GrafanaUser[]>('users');
  }

  async getUserByEmail(email: string): Promise<GrafanaUser | null> {
    try {
      return await this.makeRequest<GrafanaUser>(`users/lookup?loginOrEmail=${encodeURIComponent(email)}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return null;
      }
      throw error;
    }
  }

  // Dashboard Management
  async getDashboards(): Promise<GrafanaDashboard[]> {
    const searchResults = await this.makeRequest<any[]>('search?type=dash-db');
    return searchResults.map(result => ({
      id: result.id,
      uid: result.uid,
      title: result.title,
      tags: result.tags,
      url: result.url,
      folderId: result.folderId,
      folderUid: result.folderUid,
      folderTitle: result.folderTitle,
      folderUrl: result.folderUrl,
      isStarred: result.isStarred,
    }));
  }

  async getDashboard(uid: string): Promise<GrafanaDashboard> {
    const response = await this.makeRequest<any>(`dashboards/uid/${uid}`);
    return {
      uid: response.dashboard.uid,
      title: response.dashboard.title,
      tags: response.dashboard.tags,
      dashboard: response.dashboard,
      meta: response.meta,
    };
  }

  async createDashboard(dashboardData: any): Promise<GrafanaDashboard> {
    const payload = {
      dashboard: dashboardData.dashboard,
      folderId: dashboardData.folderId || 0,
      overwrite: dashboardData.overwrite || false,
      message: dashboardData.message || 'Created via API',
    };

    const response = await this.makeRequest<any>('dashboards/db', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      id: response.id,
      uid: response.uid,
      title: dashboardData.dashboard.title,
      url: response.url,
    };
  }

  async updateDashboard(uid: string, dashboardData: any): Promise<GrafanaDashboard> {
    // Get existing dashboard first to preserve version
    const existing = await this.getDashboard(uid);
    
    const payload = {
      dashboard: {
        ...dashboardData.dashboard,
        id: existing.dashboard?.id,
        version: existing.dashboard?.version,
      },
      folderId: dashboardData.folderId || existing.meta?.folderId || 0,
      overwrite: true,
      message: dashboardData.message || 'Updated via API',
    };

    const response = await this.makeRequest<any>('dashboards/db', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      id: response.id,
      uid: response.uid,
      title: dashboardData.dashboard.title,
      url: response.url,
    };
  }

  async deleteDashboard(uid: string): Promise<void> {
    await this.makeRequest<void>(`dashboards/uid/${uid}`, {
      method: 'DELETE',
    });
  }

  // Query dashboards with specific parameters
  async queryDashboard(uid: string, options: DashboardQueryOptions = {}): Promise<GrafanaQueryResult> {
    try {
      const dashboard = await this.getDashboard(uid);
      
      // For now, return dashboard structure
      // In a real implementation, you'd query individual panels
      return {
        data: [], // Would contain actual DataFrame data
        state: 'Done'
      };
    } catch (error) {
      logger.error('Failed to query dashboard', { uid, error });
      return {
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        state: 'Error'
      };
    }
  }

  // Datasource Management
  async getDatasources(): Promise<GrafanaDatasource[]> {
    return this.makeRequest<GrafanaDatasource[]>('datasources');
  }

  async getDatasource(uid: string): Promise<GrafanaDatasource> {
    return this.makeRequest<GrafanaDatasource>(`datasources/uid/${uid}`);
  }

  async createDatasource(datasource: Partial<GrafanaDatasource>): Promise<GrafanaDatasource> {
    return this.makeRequest<GrafanaDatasource>('datasources', {
      method: 'POST',
      body: JSON.stringify(datasource),
    });
  }

  async updateDatasource(uid: string, datasource: Partial<GrafanaDatasource>): Promise<GrafanaDatasource> {
    return this.makeRequest<GrafanaDatasource>(`datasources/uid/${uid}`, {
      method: 'PUT',
      body: JSON.stringify(datasource),
    });
  }

  async deleteDatasource(uid: string): Promise<void> {
    await this.makeRequest<void>(`datasources/uid/${uid}`, {
      method: 'DELETE',
    });
  }

  async testDatasource(datasource: Partial<GrafanaDatasource>): Promise<any> {
    return this.makeRequest<any>('datasources/test', {
      method: 'POST',
      body: JSON.stringify(datasource),
    });
  }

  // Alert Management (Unified Alerting)
  async getAlertRules(folderUID?: string): Promise<GrafanaAlertRule[]> {
    const endpoint = folderUID 
      ? `ruler/grafana/api/v1/rules/${folderUID}`
      : 'ruler/grafana/api/v1/rules';
    
    const response = await this.makeRequest<any>(endpoint);
    
    // Flatten the nested structure from Grafana's API
    const rules: GrafanaAlertRule[] = [];
    if (response && typeof response === 'object') {
      Object.values(response).forEach((folder: any) => {
        if (folder && Array.isArray(folder)) {
          folder.forEach((group: any) => {
            if (group.rules && Array.isArray(group.rules)) {
              rules.push(...group.rules);
            }
          });
        }
      });
    }
    
    return rules;
  }

  async createAlertRule(rule: Partial<GrafanaAlertRule>): Promise<GrafanaAlertRule> {
    const folderUID = rule.folderUID || 'general';
    const ruleGroup = rule.ruleGroup || 'default';
    
    const payload = {
      ...rule,
      uid: rule.uid || this.generateUID(),
    };

    return this.makeRequest<GrafanaAlertRule>(`ruler/grafana/api/v1/rules/${folderUID}/${ruleGroup}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateAlertRule(folderUID: string, ruleGroup: string, rule: Partial<GrafanaAlertRule>): Promise<GrafanaAlertRule> {
    return this.makeRequest<GrafanaAlertRule>(`ruler/grafana/api/v1/rules/${folderUID}/${ruleGroup}`, {
      method: 'PUT',
      body: JSON.stringify(rule),
    });
  }

  async deleteAlertRule(folderUID: string, ruleGroup: string, uid: string): Promise<void> {
    await this.makeRequest<void>(`ruler/grafana/api/v1/rules/${folderUID}/${ruleGroup}/${uid}`, {
      method: 'DELETE',
    });
  }

  // Organization Management
  async getCurrentOrg(): Promise<any> {
    return this.makeRequest<any>('org');
  }

  async getOrgUsers(): Promise<any[]> {
    return this.makeRequest<any[]>('org/users');
  }

  async addOrgUser(loginOrEmail: string, role: string): Promise<any> {
    return this.makeRequest<any>('org/users', {
      method: 'POST',
      body: JSON.stringify({
        loginOrEmail,
        role,
      }),
    });
  }

  // API Key Management
  async getApiKeys(): Promise<any[]> {
    return this.makeRequest<any[]>('auth/keys');
  }

  async createApiKey(name: string, role: 'Admin' | 'Editor' | 'Viewer' = 'Viewer', secondsToLive?: number): Promise<any> {
    const payload: any = {
      name,
      role,
    };
    
    if (secondsToLive) {
      payload.secondsToLive = secondsToLive;
    }

    return this.makeRequest<any>('auth/keys', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async deleteApiKey(id: number): Promise<void> {
    await this.makeRequest<void>(`auth/keys/${id}`, {
      method: 'DELETE',
    });
  }

  // Health Check
  async healthCheck(): Promise<any> {
    return this.makeRequest<any>('health');
  }

  // Search
  async search(query: string, type?: string, tags?: string[]): Promise<any[]> {
    const params = new URLSearchParams({ query });
    if (type) params.append('type', type);
    if (tags) tags.forEach(tag => params.append('tag', tag));
    
    return this.makeRequest<any[]>(`search?${params.toString()}`);
  }

  // Folders
  async getFolders(): Promise<any[]> {
    return this.makeRequest<any[]>('folders');
  }

  async createFolder(title: string, uid?: string): Promise<any> {
    const payload: any = { title };
    if (uid) payload.uid = uid;
    
    return this.makeRequest<any>('folders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Annotations
  async getAnnotations(from?: number, to?: number, tags?: string[]): Promise<any[]> {
    const params = new URLSearchParams();
    if (from) params.append('from', from.toString());
    if (to) params.append('to', to.toString());
    if (tags) tags.forEach(tag => params.append('tags', tag));
    
    return this.makeRequest<any[]>(`annotations?${params.toString()}`);
  }

  async createAnnotation(annotation: any): Promise<any> {
    return this.makeRequest<any>('annotations', {
      method: 'POST',
      body: JSON.stringify(annotation),
    });
  }

  async updateAnnotation(id: number, annotation: any): Promise<any> {
    return this.makeRequest<any>(`annotations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(annotation),
    });
  }

  async deleteAnnotation(id: number): Promise<void> {
    await this.makeRequest<void>(`annotations/${id}`, {
      method: 'DELETE',
    });
  }

  // Utility methods
  private generateUID(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Get circuit breaker metrics for monitoring
  getCircuitBreakerMetrics() {
    return this.circuitBreaker.getMetrics();
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      logger.error('Grafana connection test failed', { error });
      return false;
    }
  }
}