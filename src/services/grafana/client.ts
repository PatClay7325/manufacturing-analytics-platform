// Grafana API client for integration

const GRAFANA_URL = process.env.GRAFANA_URL || 'http://localhost:3001';
const GRAFANA_API_KEY = process.env.GRAFANA_API_KEY || '';

export class GrafanaClient {
  private headers: HeadersInit;

  constructor(apiKey?: string) {
    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey || GRAFANA_API_KEY}`
    };
  }

  async getDashboards() {
    const response = await fetch(`${GRAFANA_URL}/api/search?type=dash-db`, {
      headers: this.headers
    });
    return response.json();
  }

  async getDashboard(uid: string) {
    const response = await fetch(`${GRAFANA_URL}/api/dashboards/uid/${uid}`, {
      headers: this.headers
    });
    return response.json();
  }

  async getAlerts() {
    const response = await fetch(`${GRAFANA_URL}/api/alerts`, {
      headers: this.headers
    });
    return response.json();
  }

  async queryDatasource(datasourceId: string, query: any) {
    const response = await fetch(`${GRAFANA_URL}/api/ds/query`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        queries: [query],
        from: 'now-1h',
        to: 'now'
      })
    });
    return response.json();
  }
}

export const grafanaClient = new GrafanaClient();
