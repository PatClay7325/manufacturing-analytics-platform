import apiService from './apiService';

/**
 * Interface for production metrics
 */
export interface ProductionMetrics {
  lineId: string;
  lineName: string;
  target: number;
  actual: number;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  period?: string;
}

/**
 * Interface for downtime reason
 */
export interface DowntimeReason {
  reason: string;
  hours: number;
  percentage: number;
  change?: number;
}

/**
 * Interface for quality metrics
 */
export interface QualityMetrics {
  period: string;
  rejectRate: number;
  previousRate: number;
  changePercentage: number;
  defectCategories: {
    name: string;
    percentage: number;
    change: number;
  }[];
}

/**
 * Interface for dashboard metrics
 */
export interface DashboardMetrics {
  totalEquipment: number;
  operationalEquipment: number;
  equipmentInMaintenance: number;
  offlineEquipment: number;
  averageOee: number;
  productionTarget: number;
  productionActual: number;
  productionProgress: number;
  qualityRejectRate: number;
  alertsCritical: number;
  alertsHigh: number;
  alertsMedium: number;
  alertsLow: number;
}

/**
 * Metrics API Service
 * 
 * Provides methods for interacting with the metrics API endpoints
 */
export class MetricsApiService {
  private resource = 'metrics';

  /**
   * Get production metrics for a specific line
   */
  async getProductionMetrics(lineId?: string, period?: string): Promise<ProductionMetrics[]> {
    return apiService.get<ProductionMetrics[]>({
      resource: this.resource,
      endpoint: '/production',
      params: { lineId, period },
      cache: { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
    });
  }

  /**
   * Get downtime reasons
   */
  async getDowntimeReasons(period?: string, count?: number): Promise<DowntimeReason[]> {
    return apiService.get<DowntimeReason[]>({
      resource: this.resource,
      endpoint: '/downtime',
      params: { period, count },
      cache: { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
    });
  }

  /**
   * Get quality metrics
   */
  async getQualityMetrics(period?: string): Promise<QualityMetrics> {
    return apiService.get<QualityMetrics>({
      resource: this.resource,
      endpoint: '/quality',
      params: { period },
      cache: { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
    });
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return apiService.get<DashboardMetrics>({
      resource: this.resource,
      endpoint: '/dashboard',
      cache: { ttl: 2 * 60 * 1000 } // Cache for 2 minutes
    });
  }

  /**
   * Get OEE trend
   */
  async getOeeTrend(lineId?: string, days: number = 30): Promise<{ date: string; oee: number }[]> {
    return apiService.get<{ date: string; oee: number }[]>({
      resource: this.resource,
      endpoint: '/oee/trend',
      params: { lineId, days },
      cache: { ttl: 30 * 60 * 1000 } // Cache for 30 minutes
    });
  }

  /**
   * Get production trend
   */
  async getProductionTrend(
    lineId?: string, 
    days: number = 30
  ): Promise<{ date: string; target: number; actual: number }[]> {
    return apiService.get<{ date: string; target: number; actual: number }[]>({
      resource: this.resource,
      endpoint: '/production/trend',
      params: { lineId, days },
      cache: { ttl: 30 * 60 * 1000 } // Cache for 30 minutes
    });
  }

  /**
   * Get quality trend
   */
  async getQualityTrend(
    days: number = 30
  ): Promise<{ date: string; rejectRate: number }[]> {
    return apiService.get<{ date: string; rejectRate: number }[]>({
      resource: this.resource,
      endpoint: '/quality/trend',
      params: { days },
      cache: { ttl: 30 * 60 * 1000 } // Cache for 30 minutes
    });
  }

  /**
   * Get equipment performance
   */
  async getEquipmentPerformance(equipmentId: string): Promise<{
    oee: number;
    availability: number;
    performance: number;
    quality: number;
    uptime: number;
    downtime: number;
  }> {
    return apiService.get<{
      oee: number;
      availability: number;
      performance: number;
      quality: number;
      uptime: number;
      downtime: number;
    }>({
      resource: this.resource,
      endpoint: `/equipment/${equipmentId}/performance`,
      cache: { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
    });
  }
}

// Create and export a default instance
const metricsApi = new MetricsApiService();
export default metricsApi;