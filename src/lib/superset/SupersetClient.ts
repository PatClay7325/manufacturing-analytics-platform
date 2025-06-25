/**
 * Apache Superset Client for Manufacturing Analytics Platform
 * Provides integration with Superset for embedded dashboards and data visualization
 */

import { SignJWT } from 'jose';

export interface SupersetConfig {
  baseUrl: string;
  guestTokenSecret: string;
  username?: string;
  password?: string;
}

export interface EmbeddedDashboardConfig {
  dashboardId: string;
  filters?: Record<string, any>;
  urlParams?: Record<string, string>;
}

export interface GuestTokenPayload {
  user: {
    username: string;
    first_name: string;
    last_name: string;
  };
  resources: Array<{
    type: string;
    id: string;
  }>;
  rls: Array<{
    clause: string;
  }>;
}

export class SupersetClient {
  private config: SupersetConfig;
  private accessToken?: string;
  private csrfToken?: string;

  constructor(config: SupersetConfig) {
    this.config = config;
  }

  /**
   * Login to Superset using username/password
   */
  async login(): Promise<void> {
    if (!this.config.username || !this.config.password) {
      throw new Error('Username and password required for login');
    }

    // Get CSRF token
    const csrfResponse = await fetch(`${this.config.baseUrl}/api/v1/security/csrf_token/`, {
      method: 'GET',
      credentials: 'include',
    });

    const csrfData = await csrfResponse.json();
    this.csrfToken = csrfData.result;

    // Login
    const loginResponse = await fetch(`${this.config.baseUrl}/api/v1/security/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': this.csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({
        username: this.config.username,
        password: this.config.password,
        provider: 'db',
        refresh: true,
      }),
    });

    if (!loginResponse.ok) {
      throw new Error('Failed to login to Superset');
    }

    const loginData = await loginResponse.json();
    this.accessToken = loginData.access_token;
  }

  /**
   * Generate a guest token for embedded dashboards
   */
  async generateGuestToken(dashboardId: string, user: any): Promise<string> {
    const payload: GuestTokenPayload = {
      user: {
        username: user.email || 'guest',
        first_name: user.name?.split(' ')[0] || 'Guest',
        last_name: user.name?.split(' ').slice(1).join(' ') || 'User',
      },
      resources: [
        {
          type: 'dashboard',
          id: dashboardId,
        },
      ],
      rls: [], // Add row-level security if needed
    };

    // Create JWT token
    const secret = new TextEncoder().encode(this.config.guestTokenSecret);
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(secret);

    return token;
  }

  /**
   * Get embedded dashboard URL
   */
  getEmbeddedDashboardUrl(config: EmbeddedDashboardConfig): string {
    const params = new URLSearchParams();
    
    // Add filters
    if (config.filters) {
      params.append('preselect_filters', JSON.stringify(config.filters));
    }

    // Add URL params
    if (config.urlParams) {
      Object.entries(config.urlParams).forEach(([key, value]) => {
        params.append(key, value);
      });
    }

    // Embedded mode
    params.append('standalone', '2');
    params.append('show_filters', '0');
    params.append('expand_filters', '0');

    return `${this.config.baseUrl}/superset/dashboard/${config.dashboardId}/?${params.toString()}`;
  }

  /**
   * Fetch available dashboards
   */
  async getDashboards(): Promise<any[]> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/dashboard/`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dashboards');
    }

    const data = await response.json();
    return data.result;
  }

  /**
   * Fetch available datasets
   */
  async getDatasets(): Promise<any[]> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/dataset/`, {
      headers: this.getHeaders(),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch datasets');
    }

    const data = await response.json();
    return data.result;
  }

  /**
   * Execute SQL query
   */
  async executeQuery(database_id: number, sql: string): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/sqllab/execute/`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        database_id,
        sql,
        runAsync: false,
        schema: null,
        tab: 'Untitled Query',
        tmp_table_name: '',
        select_as_cta: false,
        ctas_method: 'TABLE',
        queryLimit: 1000,
        expand_data: true,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to execute query');
    }

    return response.json();
  }

  /**
   * Create a new dashboard
   */
  async createDashboard(name: string, description?: string): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/dashboard/`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        dashboard_title: name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        published: true,
        description,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create dashboard');
    }

    return response.json();
  }

  /**
   * Export dashboard
   */
  async exportDashboard(dashboardId: string): Promise<Blob> {
    const response = await fetch(
      `${this.config.baseUrl}/api/v1/dashboard/export/?q=["${dashboardId}"]`,
      {
        headers: this.getHeaders(),
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to export dashboard');
    }

    return response.blob();
  }

  /**
   * Import dashboard
   */
  async importDashboard(file: File, overwrite = false): Promise<any> {
    const formData = new FormData();
    formData.append('formData', file);
    formData.append('overwrite', String(overwrite));

    const response = await fetch(`${this.config.baseUrl}/api/v1/dashboard/import/`, {
      method: 'POST',
      headers: this.getHeaders(),
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to import dashboard');
    }

    return response.json();
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (this.csrfToken) {
      headers['X-CSRFToken'] = this.csrfToken;
    }

    return headers;
  }
}

// Factory function for creating Superset client
export function createSupersetClient(): SupersetClient {
  return new SupersetClient({
    baseUrl: process.env.SUPERSET_URL || 'http://localhost:8088',
    guestTokenSecret: process.env.SUPERSET_GUEST_TOKEN_SECRET || 'thisISaSECRET_1234',
    username: process.env.SUPERSET_ADMIN_USERNAME,
    password: process.env.SUPERSET_ADMIN_PASSWORD,
  });
}