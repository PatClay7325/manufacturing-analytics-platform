// Offline Storage Manager using IndexedDB

import { OfflineData } from '@/types/pwa';

const DB_NAME = 'manufacturing-analytics-offline';
const DB_VERSION = 1;

interface OfflineStore {
  metrics: OfflineData[];
  alerts: OfflineData[];
  equipment: OfflineData[];
  dashboards: OfflineData[];
}

export class OfflineStorage {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        const stores: (keyof OfflineStore)[] = ['metrics', 'alerts', 'equipment', 'dashboards'];

        stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp');
            store.createIndex('synced', 'synced');
            store.createIndex('type', 'type');
          }
        });
      };
    });
  }

  async saveData<T extends keyof OfflineStore>(
    storeName: T,
    data: OfflineData
  ): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to save offline data'));
    });
  }

  async getData<T extends keyof OfflineStore>(
    storeName: T,
    id: string
  ): Promise<OfflineData | null> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get offline data'));
    });
  }

  async getAllData<T extends keyof OfflineStore>(
    storeName: T
  ): Promise<OfflineData[]> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get all offline data'));
    });
  }

  async getUnsyncedData<T extends keyof OfflineStore>(
    storeName: T
  ): Promise<OfflineData[]> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index('synced');
      const request = index.getAll(false);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error('Failed to get unsynced data'));
    });
  }

  async markAsSynced<T extends keyof OfflineStore>(
    storeName: T,
    id: string
  ): Promise<void> {
    const data = await this.getData(storeName, id);
    if (data) {
      data.synced = true;
      await this.saveData(storeName, data);
    }
  }

  async deleteData<T extends keyof OfflineStore>(
    storeName: T,
    id: string
  ): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to delete offline data'));
    });
  }

  async clearStore<T extends keyof OfflineStore>(storeName: T): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear store'));
    });
  }

  async clearAllStores(): Promise<void> {
    const stores: (keyof OfflineStore)[] = ['metrics', 'alerts', 'equipment', 'dashboards'];
    await Promise.all(stores.map(store => this.clearStore(store)));
  }

  // Helper methods for specific data types
  async saveMetric(metric: any): Promise<void> {
    const offlineData: OfflineData = {
      id: `metric-${Date.now()}-${Math.random()}`,
      type: 'metric',
      data: metric,
      timestamp: Date.now(),
      synced: false,
    };
    await this.saveData('metrics', offlineData);
  }

  async saveAlert(alert: any): Promise<void> {
    const offlineData: OfflineData = {
      id: `alert-${Date.now()}-${Math.random()}`,
      type: 'alert',
      data: alert,
      timestamp: Date.now(),
      synced: false,
    };
    await this.saveData('alerts', offlineData);
  }

  async saveDashboard(dashboard: any): Promise<void> {
    const offlineData: OfflineData = {
      id: `dashboard-${dashboard.id || Date.now()}`,
      type: 'dashboard',
      data: dashboard,
      timestamp: Date.now(),
      synced: true, // Dashboards are already synced when saved
    };
    await this.saveData('dashboards', offlineData);
  }

  async getCachedDashboard(id: string): Promise<any | null> {
    const data = await this.getData('dashboards', `dashboard-${id}`);
    return data ? data.data : null;
  }

  // Sync all unsynced data
  async syncAll(
    onSync: (storeName: keyof OfflineStore, data: OfflineData) => Promise<void>
  ): Promise<void> {
    const stores: (keyof OfflineStore)[] = ['metrics', 'alerts', 'equipment'];

    for (const storeName of stores) {
      const unsyncedData = await this.getUnsyncedData(storeName);

      for (const data of unsyncedData) {
        try {
          await onSync(storeName, data);
          await this.markAsSynced(storeName, data.id);
        } catch (error) {
          console.error(`Failed to sync ${storeName} ${data.id}:`, error);
        }
      }
    }
  }

  // Get storage usage
  async getStorageUsage(): Promise<{ usage: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return { usage: 0, quota: 0 };
  }

  // Clean old data
  async cleanOldData(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const stores: (keyof OfflineStore)[] = ['metrics', 'alerts', 'equipment', 'dashboards'];
    const cutoffTime = Date.now() - maxAgeMs;

    for (const storeName of stores) {
      const allData = await this.getAllData(storeName);
      const oldData = allData.filter(item => item.timestamp < cutoffTime && item.synced);

      for (const item of oldData) {
        await this.deleteData(storeName, item.id);
      }
    }
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage();