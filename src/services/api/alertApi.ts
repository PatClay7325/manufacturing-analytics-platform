import apiService from './apiService';
import { 
  Alert, 
  AlertFilter, 
  AlertStatistics, 
  AlertRule, 
  AlertResponse, 
  AlertSummary 
} from '@/models/alert';

/**
 * Alert API Service
 * 
 * Provides methods for interacting with the alert API endpoints
 */
export class AlertApiService {
  private resource = 'alerts';

  /**
   * Get all alerts
   */
  async getAllAlerts(): Promise<Alert[]> {
    return apiService.get<Alert[]>({
      resource: this.resource,
      cache: { ttl: 2 * 60 * 1000 } // Cache for 2 minutes (alerts change frequently)
    });
  }

  /**
   * Get alert summaries
   */
  async getAlertSummaries(): Promise<AlertSummary[]> {
    return apiService.get<AlertSummary[]>({
      resource: this.resource,
      endpoint: '/summaries',
      cache: { ttl: 2 * 60 * 1000 } // Cache for 2 minutes
    });
  }

  /**
   * Get alert by ID
   */
  async getAlertById(id: string): Promise<Alert> {
    return apiService.get<Alert>({
      resource: this.resource,
      endpoint: `/${id}`,
      cache: { ttl: 2 * 60 * 1000 } // Cache for 2 minutes
    });
  }

  /**
   * Filter alerts
   */
  async filterAlerts(filter: AlertFilter): Promise<Alert[]> {
    return apiService.get<Alert[]>({
      resource: this.resource,
      endpoint: '/filter',
      params: filter as Record<string, string | number | boolean | undefined | null>,
      cache: { ttl: 2 * 60 * 1000 } // Cache for 2 minutes
    });
  }

  /**
   * Get alert statistics
   */
  async getAlertStatistics(): Promise<AlertStatistics> {
    return apiService.get<AlertStatistics>({
      resource: this.resource,
      endpoint: '/statistics',
      cache: { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
    });
  }

  /**
   * Get alert rules
   */
  async getAlertRules(): Promise<AlertRule[]> {
    return apiService.get<AlertRule[]>({
      resource: this.resource,
      endpoint: '/rules',
      cache: { ttl: 10 * 60 * 1000 } // Cache for 10 minutes (rules change less frequently)
    });
  }

  /**
   * Get alert rule by ID
   */
  async getAlertRuleById(id: string): Promise<AlertRule> {
    return apiService.get<AlertRule>({
      resource: this.resource,
      endpoint: `/rules/${id}`,
      cache: { ttl: 10 * 60 * 1000 } // Cache for 10 minutes
    });
  }

  /**
   * Create alert rule
   */
  async createAlertRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AlertRule> {
    const result = await apiService.post<AlertRule>({
      resource: this.resource,
      endpoint: '/rules'
    }, rule);
    
    // Clear cache after modification
    apiService.clearResourceCache(this.resource);
    
    return result;
  }

  /**
   * Update alert rule
   */
  async updateAlertRule(id: string, rule: Partial<AlertRule>): Promise<AlertRule> {
    const result = await apiService.put<AlertRule>({
      resource: this.resource,
      endpoint: `/rules/${id}`
    }, rule);
    
    // Clear cache after modification
    apiService.clearResourceCache(this.resource);
    
    return result;
  }

  /**
   * Delete alert rule
   */
  async deleteAlertRule(id: string): Promise<void> {
    await apiService.delete({
      resource: this.resource,
      endpoint: `/rules/${id}`
    });
    
    // Clear cache after modification
    apiService.clearResourceCache(this.resource);
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(
    alertId: string, 
    userId: string, 
    userName: string, 
    comment?: string
  ): Promise<Alert> {
    const result = await apiService.post<Alert>({
      resource: this.resource,
      endpoint: `/${alertId}/acknowledge`
    }, { userId, userName, comment });
    
    // Clear cache after modification
    apiService.clearResourceCache(this.resource);
    
    return result;
  }

  /**
   * Resolve alert
   */
  async resolveAlert(
    alertId: string, 
    userId: string, 
    userName: string, 
    comment?: string
  ): Promise<Alert> {
    const result = await apiService.post<Alert>({
      resource: this.resource,
      endpoint: `/${alertId}/resolve`
    }, { userId, userName, comment });
    
    // Clear cache after modification
    apiService.clearResourceCache(this.resource);
    
    return result;
  }

  /**
   * Assign alert
   */
  async assignAlert(
    alertId: string, 
    userId: string, 
    userName: string, 
    assignedTo: string, 
    comment?: string
  ): Promise<Alert> {
    const result = await apiService.post<Alert>({
      resource: this.resource,
      endpoint: `/${alertId}/assign`
    }, { userId, userName, assignedTo, comment });
    
    // Clear cache after modification
    apiService.clearResourceCache(this.resource);
    
    return result;
  }

  /**
   * Get alert responses
   */
  async getAlertResponses(alertId: string): Promise<AlertResponse[]> {
    return apiService.get<AlertResponse[]>({
      resource: this.resource,
      endpoint: `/${alertId}/responses`,
      cache: { ttl: 2 * 60 * 1000 } // Cache for 2 minutes
    });
  }

  /**
   * Add comment to alert
   */
  async addAlertComment(
    alertId: string, 
    userId: string, 
    userName: string, 
    comment: string
  ): Promise<AlertResponse> {
    const result = await apiService.post<AlertResponse>({
      resource: this.resource,
      endpoint: `/${alertId}/comments`
    }, { userId, userName, comment });
    
    // Clear cache after modification
    apiService.clearResourceCache(this.resource);
    
    return result;
  }
}

// Create and export a default instance
const alertApi = new AlertApiService();
export default alertApi;