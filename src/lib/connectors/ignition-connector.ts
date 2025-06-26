/**
 * Ignition SCADA Connector Implementation
 * Handles API calls, tag reading, and historical data retrieval
 */

import { loadIgnitionConfig, systemStatus, type IgnitionConfig } from '@/config/external-systems';
import { AppError, ExternalServiceError } from '@/lib/error-handler';
import axios, { AxiosInstance, AxiosError } from 'axios';

// Ignition data types
export interface Tag {
  path: string;
  name: string;
  value: any;
  quality: number;
  timestamp: Date;
  dataType: string;
  engineeringUnits?: string;
}

export interface TagHistory {
  tagPath: string;
  data: Array<{
    timestamp: Date;
    value: any;
    quality: number;
  }>;
}

export interface AlarmEvent {
  id: string;
  source: string;
  displayPath: string;
  priority: number;
  state: string;
  activeTime: Date;
  clearTime?: Date;
  ackTime?: Date;
  notes?: string;
}

/**
 * Ignition Connector with retry logic and connection management
 */
export class IgnitionConnector {
  private config: IgnitionConfig | null;
  private client: AxiosInstance | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private tagCache = new Map<string, { tag: Tag; timestamp: number }>();
  private cacheTimeout = 5000; // 5 seconds

  constructor() {
    this.config = loadIgnitionConfig();
    systemStatus.ignition.configured = !!this.config;
  }

  /**
   * Initialize HTTP client with interceptors
   */
  private async initializeClient(): Promise<void> {
    if (!this.config) {
      throw new AppError('Ignition not configured', 500, 'CONFIG_ERROR');
    }

    this.client = axios.create({
      baseURL: this.config.gatewayUrl,
      timeout: this.config.requestTimeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`Ignition API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, attempt reconnection
          await this.reconnect();
          return this.client!.request(error.config!);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Connect to Ignition Gateway
   */
  async connect(): Promise<void> {
    if (this.isConnected || !this.config) {
      return;
    }

    try {
      await this.initializeClient();
      
      // Test connection
      await this.testConnection();
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      systemStatus.ignition.connected = true;
      systemStatus.ignition.lastCheck = new Date();
      systemStatus.ignition.error = null;
      
      console.log('Connected to Ignition Gateway:', this.config.gatewayUrl);
    } catch (error) {
      systemStatus.ignition.connected = false;
      systemStatus.ignition.error = error instanceof Error ? error.message : 'Connection failed';
      throw new ExternalServiceError('Ignition', 'Failed to connect to gateway');
    }
  }

  /**
   * Reconnect with exponential backoff
   */
  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw new ExternalServiceError('Ignition', 'Max reconnection attempts reached');
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`Reconnecting to Ignition (attempt ${this.reconnectAttempts})...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    this.isConnected = false;
    await this.connect();
  }

  /**
   * Execute API call with retry logic
   */
  private async executeRequest<T>(
    method: 'get' | 'post',
    endpoint: string,
    data?: any,
    retries = 3
  ): Promise<T> {
    if (!this.isConnected) {
      await this.connect();
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await this.client![method](endpoint, data);
        return response.data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Request failed');
        
        if (axios.isAxiosError(error)) {
          // Don't retry on client errors
          if (error.response && error.response.status >= 400 && error.response.status < 500) {
            throw new ExternalServiceError(
              'Ignition',
              `API error: ${error.response.status} - ${error.response.data?.message || error.message}`
            );
          }
        }

        if (attempt < retries - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, this.config!.retryDelay * Math.pow(2, attempt))
          );
        }
      }
    }

    throw new ExternalServiceError(
      'Ignition',
      `Request failed after ${retries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Read current tag values
   */
  async readTags(tagPaths: string[]): Promise<Tag[]> {
    // Check cache first
    const now = Date.now();
    const cachedTags: Tag[] = [];
    const uncachedPaths: string[] = [];

    for (const path of tagPaths) {
      const cached = this.tagCache.get(path);
      if (cached && now - cached.timestamp < this.cacheTimeout) {
        cachedTags.push(cached.tag);
      } else {
        uncachedPaths.push(path);
      }
    }

    if (uncachedPaths.length === 0) {
      return cachedTags;
    }

    // Read uncached tags
    const endpoint = `/system/webdev/${this.config!.projectName}/tags/read`;
    const response = await this.executeRequest<{ tags: Tag[] }>('post', endpoint, {
      tagPaths: uncachedPaths,
    });

    // Update cache
    for (const tag of response.tags) {
      this.tagCache.set(tag.path, { tag, timestamp: now });
    }

    return [...cachedTags, ...response.tags];
  }

  /**
   * Write tag values
   */
  async writeTags(tagWrites: Array<{ path: string; value: any }>): Promise<boolean> {
    const endpoint = `/system/webdev/${this.config!.projectName}/tags/write`;
    const response = await this.executeRequest<{ success: boolean }>('post', endpoint, {
      tags: tagWrites,
    });

    // Invalidate cache for written tags
    for (const write of tagWrites) {
      this.tagCache.delete(write.path);
    }

    return response.success;
  }

  /**
   * Get tag history data
   */
  async getTagHistory(
    tagPaths: string[],
    startTime: Date,
    endTime: Date,
    maxResults = 1000
  ): Promise<TagHistory[]> {
    const endpoint = `/system/webdev/${this.config!.projectName}/tags/history`;
    const response = await this.executeRequest<{ history: TagHistory[] }>('post', endpoint, {
      tagPaths,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      maxResults,
      aggregationMode: 'Average',
      returnSize: maxResults,
    });

    return response.history;
  }

  /**
   * Get active alarms
   */
  async getActiveAlarms(source?: string): Promise<AlarmEvent[]> {
    const endpoint = `/system/webdev/${this.config!.projectName}/alarms/active`;
    const response = await this.executeRequest<{ alarms: AlarmEvent[] }>('get', endpoint);

    if (source) {
      return response.alarms.filter(alarm => alarm.source.includes(source));
    }

    return response.alarms;
  }

  /**
   * Browse available tags
   */
  async browseTags(folderPath: string): Promise<string[]> {
    const endpoint = `/system/webdev/${this.config!.projectName}/tags/browse`;
    const response = await this.executeRequest<{ paths: string[] }>('post', endpoint, {
      path: folderPath,
    });

    return response.paths;
  }

  /**
   * Execute named query
   */
  async executeNamedQuery(
    queryPath: string,
    parameters: Record<string, any> = {}
  ): Promise<any[]> {
    const endpoint = `/system/webdev/${this.config!.projectName}/namedQuery/execute`;
    const response = await this.executeRequest<{ rows: any[] }>('post', endpoint, {
      path: queryPath,
      parameters,
    });

    return response.rows;
  }

  /**
   * Test connection to Ignition
   */
  async testConnection(): Promise<boolean> {
    try {
      const endpoint = `/system/webdev/${this.config!.projectName}/status`;
      await this.executeRequest('get', endpoint);
      return true;
    } catch (error) {
      console.error('Ignition connection test failed:', error);
      return false;
    }
  }

  /**
   * Start polling for tag updates
   */
  startPolling(tagPaths: string[], callback: (tags: Tag[]) => void): NodeJS.Timeout {
    const pollInterval = setInterval(async () => {
      try {
        const tags = await this.readTags(tagPaths);
        callback(tags);
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, this.config!.pollInterval);

    return pollInterval;
  }

  /**
   * Stop polling
   */
  stopPolling(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
  }

  /**
   * Disconnect from Ignition
   */
  disconnect(): void {
    this.isConnected = false;
    this.client = null;
    this.tagCache.clear();
    systemStatus.ignition.connected = false;
  }
}

// Singleton instance
let ignitionConnector: IgnitionConnector | null = null;

export function getIgnitionConnector(): IgnitionConnector {
  if (!ignitionConnector) {
    ignitionConnector = new IgnitionConnector();
  }
  return ignitionConnector;
}