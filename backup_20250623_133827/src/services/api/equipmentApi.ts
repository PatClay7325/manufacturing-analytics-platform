import apiService from './apiService';
import { Equipment, EquipmentFilter, EquipmentSummary, Maintenance } from '@/models/equipment';

/**
 * Equipment API Service
 * 
 * Provides methods for interacting with the equipment API endpoints
 */
export class EquipmentApiService {
  private resource = 'equipment';

  /**
   * Get all equipment
   */
  async getAllEquipment(): Promise<Equipment[]> {
    return apiService.get<Equipment[]>({
      resource: this.resource,
      cache: { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
    });
  }

  /**
   * Get equipment summaries
   */
  async getEquipmentSummaries(): Promise<EquipmentSummary[]> {
    return apiService.get<EquipmentSummary[]>({
      resource: this.resource,
      endpoint: '/summaries',
      cache: { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
    });
  }

  /**
   * Get equipment by ID
   */
  async getEquipmentById(id: string): Promise<Equipment> {
    return apiService.get<Equipment>({
      resource: this.resource,
      endpoint: `/${id}`,
      cache: { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
    });
  }

  /**
   * Filter equipment
   */
  async filterEquipment(filter: EquipmentFilter): Promise<Equipment[]> {
    return apiService.get<Equipment[]>({
      resource: this.resource,
      endpoint: '/filter',
      params: filter as Record<string, string | number | boolean | undefined | null>,
      cache: { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
    });
  }

  /**
   * Get maintenance history
   */
  async getMaintenanceHistory(equipmentId: string): Promise<Maintenance[]> {
    return apiService.get<Maintenance[]>({
      resource: this.resource,
      endpoint: `/${equipmentId}/maintenance`,
      cache: { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
    });
  }

  /**
   * Add equipment
   */
  async addEquipment(equipment: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<Equipment> {
    const result = await apiService.post<Equipment>({
      resource: this.resource
    }, equipment);
    
    // Clear cache after modification
    apiService.clearResourceCache(this.resource);
    
    return result;
  }

  /**
   * Update equipment
   */
  async updateEquipment(id: string, equipment: Partial<Equipment>): Promise<Equipment> {
    const result = await apiService.put<Equipment>({
      resource: this.resource,
      endpoint: `/${id}`
    }, equipment);
    
    // Clear cache after modification
    apiService.clearResourceCache(this.resource);
    
    return result;
  }

  /**
   * Delete equipment
   */
  async deleteEquipment(id: string): Promise<void> {
    await apiService.delete({
      resource: this.resource,
      endpoint: `/${id}`
    });
    
    // Clear cache after modification
    apiService.clearResourceCache(this.resource);
  }

  /**
   * Add maintenance record
   */
  async addMaintenanceRecord(
    equipmentId: string, 
    maintenance: Omit<Maintenance, 'id'>
  ): Promise<Maintenance> {
    const result = await apiService.post<Maintenance>({
      resource: this.resource,
      endpoint: `/${equipmentId}/maintenance`
    }, maintenance);
    
    // Clear cache after modification
    apiService.clearResourceCache(this.resource);
    
    return result;
  }

  /**
   * Update maintenance record
   */
  async updateMaintenanceRecord(
    equipmentId: string,
    maintenanceId: string,
    maintenance: Partial<Maintenance>
  ): Promise<Maintenance> {
    const result = await apiService.put<Maintenance>({
      resource: this.resource,
      endpoint: `/${equipmentId}/maintenance/${maintenanceId}`
    }, maintenance);
    
    // Clear cache after modification
    apiService.clearResourceCache(this.resource);
    
    return result;
  }
}

// Create and export a default instance
const equipmentApi = new EquipmentApiService();
export default equipmentApi;