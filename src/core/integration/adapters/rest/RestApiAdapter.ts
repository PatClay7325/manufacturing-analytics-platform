/**
 * REST API Adapter Implementation
 * 
 * Implements integration with manufacturing systems using REST APIs.
 * Handles HTTP requests, polling, webhooks, and request management.
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, Method } from 'axios';
import http from 'http';
import https from 'https';
import { v4 as uuidv4 } from 'uuid';
import { URLSearchParams } from 'url';
import { AbstractIntegrationAdapter } from '../../abstract/AbstractIntegrationAdapter';
import { DataTransformer } from '../../interfaces/DataTransformer';
import { DataValidator } from '../../interfaces/DataValidator';
import { LoggerService } from '../../../architecture/interfaces';
import { BaseConfig } from '../../../architecture/types';
import { 
  IntegrationConfig, 
  IntegrationDataPacket, 
  ConnectionStatus,
  IntegrationErrorType
} from '../../types';

/**
 * REST API connection parameters
 */
export interface RestApiConnectionParams {
  /**
   * Base URL for the API
   */
  baseUrl: string;
  
  /**
   * Default request timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Default headers to include in all requests
   */
  headers?: Record<string, string>;
  
  /**
   * Maximum number of concurrent requests
   */
  maxConcurrentRequests?: number;
  
  /**
   * HTTP agent options
   */
  httpAgent?: {
    /**
     * Keep alive enabled
     */
    keepAlive?: boolean;
    
    /**
     * Keep alive timeout in milliseconds
     */
    keepAliveMsecs?: number;
    
    /**
     * Maximum sockets to use
     */
    maxSockets?: number;
    
    /**
     * Maximum free sockets to keep alive
     */
    maxFreeSockets?: number;
  };
  
  /**
   * SSL/TLS verification settings
   */
  ssl?: {
    /**
     * Reject unauthorized SSL certificates
     */
    rejectUnauthorized?: boolean;
    
    /**
     * Path to CA certificate file
     */
    ca?: string;
    
    /**
     * Path to client certificate file
     */
    cert?: string;
    
    /**
     * Path to client key file
     */
    key?: string;
  };
  
  /**
   * Polling configuration
   */
  polling?: {
    /**
     * Whether polling is enabled
     */
    enabled: boolean;
    
    /**
     * Polling interval in milliseconds
     */
    interval: number;
    
    /**
     * Polling endpoints
     */
    endpoints: {
      /**
       * Path to the endpoint (will be combined with baseUrl)
       */
      path: string;
      
      /**
       * HTTP method to use
       */
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      
      /**
       * Request data for POST, PUT, PATCH methods
       */
      data?: Record<string, unknown>;
      
      /**
       * Request headers
       */
      headers?: Record<string, string>;
      
      /**
       * Query parameters
       */
      params?: Record<string, string>;
      
      /**
       * Response data path to extract
       */
      responsePath?: string;
    }[];
  };
  
  /**
   * Webhook configuration
   */
  webhook?: {
    /**
     * Whether webhook is enabled
     */
    enabled: boolean;
    
    /**
     * Port to listen on
     */
    port: number;
    
    /**
     * Host to bind to
     */
    host?: string;
    
    /**
     * Path to listen for webhooks
     */
    path: string;
    
    /**
     * HTTPS options
     */
    https?: {
      /**
       * Path to HTTPS certificate file
       */
      certPath: string;
      
      /**
       * Path to HTTPS key file
       */
      keyPath: string;
      
      /**
       * Path to CA certificate file
       */
      caPath?: string;
    };
    
    /**
     * Secret for webhook verification
     */
    secret?: string;
    
    /**
     * Header name for webhook verification
     */
    signatureHeader?: string;
    
    /**
     * How to verify the signature
     */
    verificationMethod?: 'sha1' | 'sha256' | 'plain';
  };
}

/**
 * REST API authentication parameters
 */
export interface RestApiAuthParams {
  /**
   * Authentication type
   */
  type: 'none' | 'basic' | 'bearer' | 'api_key' | 'oauth2';
  
  /**
   * Username for basic authentication
   */
  username?: string;
  
  /**
   * Password for basic authentication
   */
  password?: string;
  
  /**
   * Token for bearer authentication
   */
  token?: string;
  
  /**
   * API key name for API key authentication
   */
  apiKeyName?: string;
  
  /**
   * API key value for API key authentication
   */
  apiKey?: string;
  
  /**
   * Where to add the API key
   */
  apiKeyIn?: 'header' | 'query' | 'cookie';
  
  /**
   * OAuth2 configuration
   */
  oauth2?: {
    /**
     * OAuth2 flow type
     */
    flow: 'client_credentials' | 'password' | 'authorization_code';
    
    /**
     * Token URL
     */
    tokenUrl: string;
    
    /**
     * Client ID
     */
    clientId: string;
    
    /**
     * Client secret
     */
    clientSecret: string;
    
    /**
     * Scope(s) to request
     */
    scope?: string;
    
    /**
     * Authorization URL (for authorization_code flow)
     */
    authorizationUrl?: string;
    
    /**
     * Redirect URL (for authorization_code flow)
     */
    redirectUrl?: string;
    
    /**
     * Username (for password flow)
     */
    username?: string;
    
    /**
     * Password (for password flow)
     */
    password?: string;
  };
}

/**
 * REST API polling subscription information
 */
interface RestApiPollingSubscription {
  /**
   * Polling interval timer
   */
  timer: NodeJS.Timeout;
  
  /**
   * Polling endpoint information
   */
  endpoint: RestApiConnectionParams['polling']['endpoints'][0];
  
  /**
   * Callback function to be called when data is received
   */
  callback: (data: IntegrationDataPacket<unknown>) => void | Promise<void>;
}

/**
 * REST API webhook subscription information
 */
interface RestApiWebhookSubscription {
  /**
   * Callback function to be called when data is received
   */
  callback: (data: IntegrationDataPacket<unknown>) => void | Promise<void>;
}

/**
 * REST API adapter for manufacturing systems integration
 */
export class RestApiAdapter extends AbstractIntegrationAdapter {
  /**
   * HTTP client instance
   */
  private client: AxiosInstance | null = null;
  
  /**
   * Last measured latency in milliseconds
   */
  private latencyValue: number = 0;
  
  /**
   * Webhook server instance
   */
  private webhookServer: http.Server | https.Server | null = null;
  
  /**
   * Active polling timers
   */
  private pollingTimers: Set<NodeJS.Timeout> = new Set();
  
  /**
   * Current OAuth token
   */
  private oauthToken: {
    accessToken: string;
    expiresAt: number;
    refreshToken?: string;
  } | null = null;
  
  /**
   * Token refresh timer
   */
  private tokenRefreshTimer: NodeJS.Timeout | null = null;
  
  /**
   * Pending requests queue
   */
  private requestQueue: Array<() => Promise<void>> = [];
  
  /**
   * Current number of active requests
   */
  private activeRequests: number = 0;
  
  /**
   * Connection parameters
   */
  private restParams: RestApiConnectionParams;
  
  /**
   * Authentication parameters
   */
  private restAuth: RestApiAuthParams;
  
  /**
   * Constructor
   * @param config Integration configuration
   * @param transformer Data transformer
   * @param validator Data validator
   * @param logger Logger service
   */
  constructor(
    config: IntegrationConfig,
    transformer: DataTransformer,
    validator: DataValidator,
    logger: LoggerService
  ) {
    super(config, transformer, validator, logger);
    
    // Extract REST API-specific connection parameters
    this.restParams = config.connectionParams as RestApiConnectionParams;
    
    // Extract authentication parameters if available
    this.restAuth = (config.authParams || { type: 'none' }) as RestApiAuthParams;
    
    // Validate required parameters
    if (!this.restParams.baseUrl) {
      throw new Error('REST API base URL is required');
    }
  }
  
  /**
   * Initialize the REST API adapter
   * @param baseConfig Base configuration
   */
  protected async initializeAdapter(baseConfig: BaseConfig): Promise<void> {
    this.logger.debug('Initializing REST API adapter', {
      baseUrl: this.restParams.baseUrl
    });
    
    // Create HTTP client with default configuration
    this.createHttpClient();
  }
  
  /**
   * Connect to the REST API
   */
  public async connect(): Promise<void> {
    if (this.connectionStatus === ConnectionStatus.CONNECTED) {
      this.logger.debug('Already connected to REST API');
      return;
    }
    
    try {
      this.setConnectionStatus(ConnectionStatus.CONNECTING);
      
      // Ensure HTTP client is created
      if (!this.client) {
        this.createHttpClient();
      }
      
      // Authenticate if needed
      if (this.restAuth.type !== 'none') {
        await this.authenticate();
      }
      
      // Start webhook server if enabled
      if (this.restParams.webhook?.enabled) {
        await this.startWebhookServer();
      }
      
      // Start polling if enabled
      if (this.restParams.polling?.enabled) {
        this.startPolling();
      }
      
      // Update connection status
      this.setConnectionStatus(ConnectionStatus.CONNECTED);
      this.clearLastError();
      this.retryCount = 0;
      
      // Test the connection
      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new Error('Connection test failed after connecting to REST API');
      }
      
      this.logger.info('Successfully connected to REST API');
      
    } catch (error) {
      this.setConnectionStatus(ConnectionStatus.ERROR);
      this.setLastError(
        IntegrationErrorType.CONNECTION,
        `Failed to connect to REST API: ${error.message}`,
        error
      );
      
      // Cleanup failed connection attempt
      await this.cleanup();
      
      throw error;
    }
  }
  
  /**
   * Disconnect from the REST API
   */
  public async disconnect(): Promise<void> {
    if (this.connectionStatus === ConnectionStatus.DISCONNECTED) {
      this.logger.debug('Already disconnected from REST API');
      return;
    }
    
    try {
      this.logger.info('Disconnecting from REST API');
      
      // Cleanup resources
      await this.cleanup();
      
      this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
      this.logger.info('Disconnected from REST API');
    } catch (error) {
      this.setLastError(
        IntegrationErrorType.CONNECTION,
        `Failed to disconnect from REST API: ${error.message}`,
        error
      );
      throw error;
    }
  }
  
  /**
   * Clean up REST API resources
   */
  private async cleanup(): Promise<void> {
    try {
      // Stop polling timers
      this.stopPolling();
      
      // Stop webhook server
      await this.stopWebhookServer();
      
      // Clear token refresh timer
      if (this.tokenRefreshTimer) {
        clearTimeout(this.tokenRefreshTimer);
        this.tokenRefreshTimer = null;
      }
      
      // Clear request queue
      this.requestQueue = [];
      this.activeRequests = 0;
      
      // Clear OAuth token
      this.oauthToken = null;
    } catch (error) {
      this.logger.error(`Error during REST API cleanup: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Send data to the REST API
   * @param data The data to send
   * @param options Optional sending options
   */
  public async sendData<T>(
    data: IntegrationDataPacket<T>,
    options?: Record<string, unknown>
  ): Promise<void> {
    if (this.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw new Error('Cannot send data: Not connected to REST API');
    }
    
    try {
      // Extract request parameters from options
      const path = options?.path as string;
      if (!path) {
        throw new Error('Path is required for REST API request');
      }
      
      const method = (options?.method as Method) || 'POST';
      const headers = options?.headers as Record<string, string>;
      const params = options?.params as Record<string, string>;
      
      // Transform data if needed
      const transformedData = await this.transformer.transform(data);
      
      // Validate the data
      await this.validator.validate(transformedData);
      
      this.logger.debug(`Sending ${method} request to ${path}`, {
        method,
        path,
        dataId: data.id
      });
      
      // Queue the request
      return this.queueRequest(async () => {
        try {
          // Build request URL
          const url = this.buildUrl(path);
          
          // Send the request
          const response = await this.client!.request({
            method,
            url,
            data: transformedData.payload,
            headers,
            params
          });
          
          this.logger.debug(`Successfully sent ${method} request to ${path}`, {
            statusCode: response.status
          });
        } catch (error) {
          this.logger.error(`Failed to send ${method} request to ${path}: ${error.message}`, error);
          throw error;
        }
      });
    } catch (error) {
      this.setLastError(
        IntegrationErrorType.COMMUNICATION,
        `Failed to send data: ${error.message}`,
        error
      );
      throw error;
    }
  }
  
  /**
   * Receive data from the REST API
   * @param callback Function to call when data is received
   * @param options Optional receiving options
   * @returns Subscription ID that can be used to unsubscribe
   */
  public async receiveData<T>(
    callback: (data: IntegrationDataPacket<T>) => void | Promise<void>,
    options?: Record<string, unknown>
  ): Promise<string> {
    if (this.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw new Error('Cannot subscribe: Not connected to REST API');
    }
    
    try {
      // Generate subscription ID
      const subscriptionId = `${this.id}-${uuidv4()}`;
      
      // Determine subscription type
      const subscriptionType = options?.type as 'polling' | 'webhook' || 'polling';
      
      if (subscriptionType === 'polling') {
        // Extract polling parameters
        const pollingPath = options?.path as string;
        if (!pollingPath) {
          throw new Error('Path is required for polling subscription');
        }
        
        const pollingMethod = (options?.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH') || 'GET';
        const pollingInterval = (options?.interval as number) || this.restParams.polling?.interval || 60000;
        const pollingData = options?.data as Record<string, unknown>;
        const pollingHeaders = options?.headers as Record<string, string>;
        const pollingParams = options?.params as Record<string, string>;
        const pollingResponsePath = options?.responsePath as string;
        
        this.logger.debug(`Creating polling subscription for ${pollingPath}`, {
          method: pollingMethod,
          interval: pollingInterval
        });
        
        // Create polling endpoint config
        const endpoint = {
          path: pollingPath,
          method: pollingMethod,
          data: pollingData,
          headers: pollingHeaders,
          params: pollingParams,
          responsePath: pollingResponsePath
        };
        
        // Create polling timer
        const timer = setInterval(() => {
          this.pollEndpoint(endpoint, subscriptionId).catch(err => {
            this.logger.error(`Error polling endpoint ${pollingPath}: ${err.message}`, err);
          });
        }, pollingInterval);
        
        // Add to polling timers set
        this.pollingTimers.add(timer);
        
        // Store subscription information
        const subscription: RestApiPollingSubscription = {
          timer,
          endpoint,
          callback: callback as (data: IntegrationDataPacket<unknown>) => void | Promise<void>
        };
        
        // Add to subscriptions map
        this.subscriptions.set(subscriptionId, subscription);
        
        // Trigger immediate poll
        this.pollEndpoint(endpoint, subscriptionId).catch(err => {
          this.logger.error(`Error during initial poll of ${pollingPath}: ${err.message}`, err);
        });
      } else if (subscriptionType === 'webhook') {
        if (!this.webhookServer) {
          throw new Error('Webhook server is not running');
        }
        
        this.logger.debug('Creating webhook subscription');
        
        // Store subscription information
        const subscription: RestApiWebhookSubscription = {
          callback: callback as (data: IntegrationDataPacket<unknown>) => void | Promise<void>
        };
        
        // Add to subscriptions map
        this.subscriptions.set(subscriptionId, subscription);
      } else {
        throw new Error(`Unknown subscription type: ${subscriptionType}`);
      }
      
      return subscriptionId;
    } catch (error) {
      this.setLastError(
        IntegrationErrorType.COMMUNICATION,
        `Failed to subscribe: ${error.message}`,
        error
      );
      throw error;
    }
  }
  
  /**
   * Unsubscribe from a subscription
   * @param subscriptionId The subscription ID to unsubscribe
   */
  public async unsubscribe(subscriptionId: string): Promise<void> {
    // Get subscription information
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      this.logger.warn(`Subscription not found: ${subscriptionId}`);
      return;
    }
    
    try {
      this.logger.debug(`Unsubscribing from subscription: ${subscriptionId}`);
      
      // Handle polling subscription
      if ('timer' in subscription) {
        const pollingSubscription = subscription as RestApiPollingSubscription;
        
        // Clear the timer
        clearInterval(pollingSubscription.timer);
        
        // Remove from polling timers set
        this.pollingTimers.delete(pollingSubscription.timer);
      }
      
      // Remove from subscriptions map
      this.subscriptions.delete(subscriptionId);
      
      this.logger.info(`Successfully unsubscribed from subscription: ${subscriptionId}`);
    } catch (error) {
      this.setLastError(
        IntegrationErrorType.COMMUNICATION,
        `Failed to unsubscribe: ${error.message}`,
        error
      );
      throw error;
    }
  }
  
  /**
   * Test the connection to the REST API
   */
  public async testConnection(): Promise<boolean> {
    if (!this.client || this.connectionStatus !== ConnectionStatus.CONNECTED) {
      return false;
    }
    
    try {
      // Measure latency with a simple request
      await this.measureLatency();
      return true;
    } catch (error) {
      this.logger.error(`Connection test failed: ${error.message}`, error);
      return false;
    }
  }
  
  /**
   * Get the connection latency in milliseconds
   */
  public async getLatency(): Promise<number> {
    if (!this.client || this.connectionStatus !== ConnectionStatus.CONNECTED) {
      return -1;
    }
    
    try {
      await this.measureLatency();
      return this.latencyValue;
    } catch (error) {
      this.logger.error(`Failed to measure latency: ${error.message}`, error);
      return -1;
    }
  }
  
  /**
   * Measure the latency to the REST API
   */
  private async measureLatency(): Promise<void> {
    if (!this.client || this.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw new Error('Cannot measure latency: Not connected to REST API');
    }
    
    try {
      // Measure time to make a simple request
      const startTime = Date.now();
      
      // Make a HEAD request to the base URL
      await this.client.head(this.restParams.baseUrl);
      
      // Calculate latency
      const endTime = Date.now();
      this.latencyValue = endTime - startTime;
    } catch (error) {
      this.logger.error(`Error measuring latency: ${error.message}`, error);
      this.latencyValue = 5000; // Set a high latency value on error
      throw error;
    }
  }
  
  /**
   * Create HTTP client with configured options
   */
  private createHttpClient(): void {
    try {
      // Create HTTP and HTTPS agents
      const httpAgent = new http.Agent(this.restParams.httpAgent || {
        keepAlive: true,
        maxSockets: 10
      });
      
      const httpsAgent = new https.Agent({
        ...this.restParams.httpAgent,
        rejectUnauthorized: this.restParams.ssl?.rejectUnauthorized !== false,
        ca: this.restParams.ssl?.ca,
        cert: this.restParams.ssl?.cert,
        key: this.restParams.ssl?.key
      });
      
      // Create axios client with default configuration
      this.client = axios.create({
        baseURL: this.restParams.baseUrl,
        timeout: this.restParams.timeout || 30000,
        headers: this.restParams.headers || {},
        httpAgent,
        httpsAgent,
        validateStatus: status => status < 500 // Don't reject on 4xx responses
      });
      
      // Set up request interceptor for authentication
      this.client.interceptors.request.use(async config => {
        // Add authentication headers
        config = await this.addAuthHeaders(config);
        return config;
      });
      
      // Set up response interceptor for error handling
      this.client.interceptors.response.use(
        response => response,
        async error => {
          // Handle authentication errors
          if (error.response?.status === 401 && this.restAuth.type === 'oauth2' && this.oauthToken) {
            // Token might be expired, refresh and retry
            await this.refreshOAuthToken();
            
            // Retry the request
            const originalRequest = error.config;
            originalRequest.headers = await this.addAuthHeaders(originalRequest).then(cfg => cfg.headers);
            
            return this.client!.request(originalRequest);
          }
          
          throw error;
        }
      );
      
      this.logger.debug('HTTP client created successfully');
    } catch (error) {
      this.logger.error(`Failed to create HTTP client: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Add authentication headers to request config
   * @param config Axios request config
   * @returns Updated config with authentication headers
   */
  private async addAuthHeaders(config: AxiosRequestConfig): Promise<AxiosRequestConfig> {
    const headers = { ...config.headers };
    
    switch (this.restAuth.type) {
      case 'basic':
        if (this.restAuth.username) {
          const auth = Buffer.from(`${this.restAuth.username}:${this.restAuth.password || ''}`).toString('base64');
          headers['Authorization'] = `Basic ${auth}`;
        }
        break;
        
      case 'bearer':
        if (this.restAuth.token) {
          headers['Authorization'] = `Bearer ${this.restAuth.token}`;
        }
        break;
        
      case 'api_key':
        if (this.restAuth.apiKey && this.restAuth.apiKeyName) {
          const apiKeyIn = this.restAuth.apiKeyIn || 'header';
          
          if (apiKeyIn === 'header') {
            headers[this.restAuth.apiKeyName] = this.restAuth.apiKey;
          } else if (apiKeyIn === 'query') {
            config.params = config.params || {};
            config.params[this.restAuth.apiKeyName] = this.restAuth.apiKey;
          } else if (apiKeyIn === 'cookie') {
            headers['Cookie'] = `${this.restAuth.apiKeyName}=${this.restAuth.apiKey}`;
          }
        }
        break;
        
      case 'oauth2':
        if (this.oauthToken && this.oauthToken.accessToken) {
          // Check if token is expired or about to expire
          const now = Date.now();
          if (this.oauthToken.expiresAt <= now + 60000) {
            // Token is expired or will expire in 1 minute, refresh it
            await this.refreshOAuthToken();
          }
          
          headers['Authorization'] = `Bearer ${this.oauthToken.accessToken}`;
        }
        break;
    }
    
    return { ...config, headers };
  }
  
  /**
   * Authenticate with the REST API
   */
  private async authenticate(): Promise<void> {
    try {
      switch (this.restAuth.type) {
        case 'oauth2':
          await this.authenticateOAuth2();
          break;
          
        case 'basic':
        case 'bearer':
        case 'api_key':
          // Nothing to do, headers will be added in request interceptor
          break;
          
        default:
          // No authentication needed
          break;
      }
    } catch (error) {
      this.setLastError(
        IntegrationErrorType.AUTHENTICATION,
        `Authentication failed: ${error.message}`,
        error
      );
      throw error;
    }
  }
  
  /**
   * Authenticate using OAuth 2.0
   */
  private async authenticateOAuth2(): Promise<void> {
    if (!this.restAuth.oauth2) {
      throw new Error('OAuth2 configuration is required');
    }
    
    const oauth2Config = this.restAuth.oauth2;
    
    try {
      this.logger.debug('Authenticating with OAuth 2.0', {
        flow: oauth2Config.flow,
        tokenUrl: oauth2Config.tokenUrl
      });
      
      let tokenRequestData: URLSearchParams;
      
      // Build token request data based on flow
      switch (oauth2Config.flow) {
        case 'client_credentials':
          tokenRequestData = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: oauth2Config.clientId,
            client_secret: oauth2Config.clientSecret
          });
          
          if (oauth2Config.scope) {
            tokenRequestData.append('scope', oauth2Config.scope);
          }
          break;
          
        case 'password':
          if (!oauth2Config.username || !oauth2Config.password) {
            throw new Error('Username and password are required for password flow');
          }
          
          tokenRequestData = new URLSearchParams({
            grant_type: 'password',
            client_id: oauth2Config.clientId,
            client_secret: oauth2Config.clientSecret,
            username: oauth2Config.username,
            password: oauth2Config.password
          });
          
          if (oauth2Config.scope) {
            tokenRequestData.append('scope', oauth2Config.scope);
          }
          break;
          
        case 'authorization_code':
          throw new Error('Authorization code flow is not supported for server-to-server authentication');
          
        default:
          throw new Error(`Unsupported OAuth2 flow: ${oauth2Config.flow}`);
      }
      
      // Send token request
      const response = await axios.post(
        oauth2Config.tokenUrl,
        tokenRequestData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      // Extract token information
      const { access_token, expires_in, refresh_token } = response.data;
      
      if (!access_token) {
        throw new Error('Access token not provided in the response');
      }
      
      // Store token information
      this.oauthToken = {
        accessToken: access_token,
        expiresAt: Date.now() + (expires_in ? expires_in * 1000 : 3600000), // Default to 1 hour
        refreshToken: refresh_token
      };
      
      this.logger.info('OAuth 2.0 authentication successful');
      
      // Set up token refresh timer if refresh token is provided
      if (refresh_token && expires_in) {
        this.setupTokenRefreshTimer(expires_in);
      }
    } catch (error) {
      this.logger.error(`OAuth 2.0 authentication failed: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Refresh OAuth 2.0 token
   */
  private async refreshOAuthToken(): Promise<void> {
    if (!this.restAuth.oauth2 || !this.oauthToken?.refreshToken) {
      // Re-authenticate if no refresh token is available
      return this.authenticateOAuth2();
    }
    
    const oauth2Config = this.restAuth.oauth2;
    
    try {
      this.logger.debug('Refreshing OAuth 2.0 token');
      
      // Build token refresh request
      const tokenRequestData = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: oauth2Config.clientId,
        client_secret: oauth2Config.clientSecret,
        refresh_token: this.oauthToken.refreshToken
      });
      
      // Send token refresh request
      const response = await axios.post(
        oauth2Config.tokenUrl,
        tokenRequestData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      // Extract token information
      const { access_token, expires_in, refresh_token } = response.data;
      
      if (!access_token) {
        throw new Error('Access token not provided in the response');
      }
      
      // Update token information
      this.oauthToken = {
        accessToken: access_token,
        expiresAt: Date.now() + (expires_in ? expires_in * 1000 : 3600000), // Default to 1 hour
        refreshToken: refresh_token || this.oauthToken.refreshToken
      };
      
      this.logger.info('OAuth 2.0 token refreshed successfully');
      
      // Set up token refresh timer
      if (expires_in) {
        this.setupTokenRefreshTimer(expires_in);
      }
    } catch (error) {
      this.logger.error(`OAuth 2.0 token refresh failed: ${error.message}`, error);
      
      // Re-authenticate from scratch
      await this.authenticateOAuth2();
    }
  }
  
  /**
   * Set up token refresh timer
   * @param expiresIn Expiration time in seconds
   */
  private setupTokenRefreshTimer(expiresIn: number): void {
    // Clear existing timer
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
    
    // Calculate refresh time (refresh 5 minutes before expiration)
    const refreshTime = Math.max((expiresIn - 300) * 1000, 0);
    
    // Set up timer
    this.tokenRefreshTimer = setTimeout(() => {
      this.refreshOAuthToken().catch(err => {
        this.logger.error(`Failed to refresh token: ${err.message}`, err);
      });
    }, refreshTime);
  }
  
  /**
   * Start webhook server
   */
  private async startWebhookServer(): Promise<void> {
    if (this.webhookServer) {
      this.logger.debug('Webhook server is already running');
      return;
    }
    
    const webhook = this.restParams.webhook;
    if (!webhook || !webhook.enabled) {
      this.logger.debug('Webhook is not enabled');
      return;
    }
    
    try {
      this.logger.info(`Starting webhook server on port ${webhook.port}`);
      
      // Create HTTP or HTTPS server
      if (webhook.https) {
        // Create HTTPS server
        const httpsOptions = {
          cert: await this.readFile(webhook.https.certPath),
          key: await this.readFile(webhook.https.keyPath),
          ca: webhook.https.caPath ? await this.readFile(webhook.https.caPath) : undefined
        };
        
        this.webhookServer = https.createServer(httpsOptions, this.handleWebhookRequest.bind(this));
      } else {
        // Create HTTP server
        this.webhookServer = http.createServer(this.handleWebhookRequest.bind(this));
      }
      
      // Start listening
      await new Promise<void>((resolve, reject) => {
        if (!this.webhookServer) {
          reject(new Error('Webhook server not created'));
          return;
        }
        
        this.webhookServer.listen(webhook.port, webhook.host || '0.0.0.0', () => {
          this.logger.info(`Webhook server started on port ${webhook.port}`);
          resolve();
        });
        
        this.webhookServer.on('error', (err) => {
          reject(err);
        });
      });
    } catch (error) {
      this.logger.error(`Failed to start webhook server: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Stop webhook server
   */
  private async stopWebhookServer(): Promise<void> {
    if (!this.webhookServer) {
      return;
    }
    
    try {
      this.logger.info('Stopping webhook server');
      
      // Close the server
      await new Promise<void>((resolve, reject) => {
        if (!this.webhookServer) {
          resolve();
          return;
        }
        
        this.webhookServer.close((err) => {
          if (err) {
            reject(err);
          } else {
            this.logger.info('Webhook server stopped');
            this.webhookServer = null;
            resolve();
          }
        });
      });
    } catch (error) {
      this.logger.error(`Failed to stop webhook server: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Handle webhook request
   * @param req HTTP request
   * @param res HTTP response
   */
  private handleWebhookRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    try {
      const webhook = this.restParams.webhook;
      if (!webhook) {
        res.statusCode = 500;
        res.end('Webhook not configured');
        return;
      }
      
      // Check if the path matches
      if (req.url !== webhook.path) {
        res.statusCode = 404;
        res.end('Not Found');
        return;
      }
      
      // Only accept POST requests
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end('Method Not Allowed');
        return;
      }
      
      // Read request body
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        // Verify webhook signature if configured
        if (webhook.secret && webhook.signatureHeader) {
          const signature = req.headers[webhook.signatureHeader.toLowerCase()] as string;
          if (!signature) {
            res.statusCode = 401;
            res.end('Unauthorized: Missing signature');
            return;
          }
          
          const isValid = this.verifyWebhookSignature(body, signature, webhook.secret, webhook.verificationMethod || 'sha1');
          if (!isValid) {
            res.statusCode = 401;
            res.end('Unauthorized: Invalid signature');
            return;
          }
        }
        
        // Process the webhook data
        this.processWebhookData(body, req.headers)
          .then(() => {
            res.statusCode = 200;
            res.end('OK');
          })
          .catch(err => {
            this.logger.error(`Error processing webhook data: ${err.message}`, err);
            res.statusCode = 500;
            res.end('Internal Server Error');
          });
      });
      
      req.on('error', (err) => {
        this.logger.error(`Error handling webhook request: ${err.message}`, err);
        res.statusCode = 500;
        res.end('Internal Server Error');
      });
    } catch (error) {
      this.logger.error(`Error in webhook handler: ${error.message}`, error);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  }
  
  /**
   * Process webhook data
   * @param body Request body
   * @param headers Request headers
   */
  private async processWebhookData(body: string, headers: http.IncomingHttpHeaders): Promise<void> {
    try {
      // Parse the body as JSON
      let data: unknown;
      try {
        data = JSON.parse(body);
      } catch {
        // If not valid JSON, use the raw body
        data = body;
      }
      
      // Create data packet
      const dataPacket: IntegrationDataPacket<unknown> = {
        id: uuidv4(),
        source: 'webhook',
        timestamp: new Date(),
        payload: data,
        metadata: {
          headers,
          receivedAt: new Date().toISOString()
        }
      };
      
      // Notify all webhook subscribers
      for (const [subscriptionId, subscription] of this.subscriptions.entries()) {
        if ('callback' in subscription && !('timer' in subscription)) {
          const webhookSubscription = subscription as RestApiWebhookSubscription;
          
          try {
            await webhookSubscription.callback(dataPacket);
          } catch (error) {
            this.logger.error(`Error in webhook subscription callback: ${error.message}`, error, {
              subscriptionId
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error processing webhook data: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Verify webhook signature
   * @param payload Request payload
   * @param signature Signature header value
   * @param secret Webhook secret
   * @param method Verification method
   * @returns Whether the signature is valid
   */
  private verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
    method: 'sha1' | 'sha256' | 'plain'
  ): boolean {
    try {
      // For plain verification, just compare the signature with the secret
      if (method === 'plain') {
        return signature === secret;
      }
      
      // For SHA-based verification, compute the HMAC
      const crypto = require('crypto');
      const hmac = crypto.createHmac(method, secret);
      hmac.update(payload);
      const computedSignature = `${method}=${hmac.digest('hex')}`;
      
      return signature === computedSignature;
    } catch (error) {
      this.logger.error(`Error verifying webhook signature: ${error.message}`, error);
      return false;
    }
  }
  
  /**
   * Start polling for data
   */
  private startPolling(): void {
    const polling = this.restParams.polling;
    if (!polling || !polling.enabled || !polling.endpoints || polling.endpoints.length === 0) {
      this.logger.debug('Polling is not enabled or no endpoints configured');
      return;
    }
    
    this.logger.info(`Starting polling for ${polling.endpoints.length} endpoints`);
    
    // Clear existing polling timers
    this.stopPolling();
    
    // Set up polling for each endpoint
    for (const endpoint of polling.endpoints) {
      const interval = polling.interval || 60000;
      
      this.logger.debug(`Setting up polling for ${endpoint.path} every ${interval}ms`);
      
      // Create polling timer
      const timer = setInterval(() => {
        this.pollEndpoint(endpoint).catch(err => {
          this.logger.error(`Error polling endpoint ${endpoint.path}: ${err.message}`, err);
        });
      }, interval);
      
      // Add to polling timers set
      this.pollingTimers.add(timer);
      
      // Trigger immediate poll
      this.pollEndpoint(endpoint).catch(err => {
        this.logger.error(`Error during initial poll of ${endpoint.path}: ${err.message}`, err);
      });
    }
  }
  
  /**
   * Stop all polling
   */
  private stopPolling(): void {
    // Clear all polling timers
    for (const timer of this.pollingTimers) {
      clearInterval(timer);
    }
    
    // Clear the set
    this.pollingTimers.clear();
  }
  
  /**
   * Poll an endpoint for data
   * @param endpoint Polling endpoint configuration
   * @param subscriptionId Optional subscription ID for directed polling
   */
  private async pollEndpoint(
    endpoint: RestApiConnectionParams['polling']['endpoints'][0],
    subscriptionId?: string
  ): Promise<void> {
    if (!this.client || this.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw new Error('Cannot poll endpoint: Not connected to REST API');
    }
    
    try {
      this.logger.debug(`Polling endpoint: ${endpoint.path}`, {
        method: endpoint.method
      });
      
      // Build request URL
      const url = this.buildUrl(endpoint.path);
      
      // Send the request
      const response = await this.client.request({
        method: endpoint.method,
        url,
        data: endpoint.data,
        headers: endpoint.headers,
        params: endpoint.params
      });
      
      // Extract data using response path if specified
      let responseData = response.data;
      if (endpoint.responsePath) {
        responseData = this.extractDataByPath(responseData, endpoint.responsePath);
      }
      
      // Create data packet
      const dataPacket: IntegrationDataPacket<unknown> = {
        id: uuidv4(),
        source: endpoint.path,
        timestamp: new Date(),
        payload: responseData,
        metadata: {
          statusCode: response.status,
          headers: response.headers,
          method: endpoint.method,
          url
        }
      };
      
      // If subscriptionId is provided, notify only that subscription
      if (subscriptionId) {
        const subscription = this.subscriptions.get(subscriptionId) as RestApiPollingSubscription;
        if (subscription) {
          await subscription.callback(dataPacket);
        }
      } else {
        // Otherwise, notify all matching polling subscriptions
        for (const [subId, subscription] of this.subscriptions.entries()) {
          if ('timer' in subscription) {
            const pollingSubscription = subscription as RestApiPollingSubscription;
            
            // Check if this subscription is for this endpoint
            if (pollingSubscription.endpoint.path === endpoint.path) {
              try {
                await pollingSubscription.callback(dataPacket);
              } catch (error) {
                this.logger.error(`Error in polling subscription callback: ${error.message}`, error, {
                  subscriptionId: subId,
                  endpoint: endpoint.path
                });
              }
            }
          }
        }
      }
      
      this.logger.debug(`Successfully polled endpoint: ${endpoint.path}`, {
        statusCode: response.status
      });
    } catch (error) {
      this.logger.error(`Failed to poll endpoint ${endpoint.path}: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Extract data from response using a path
   * @param data Response data
   * @param path Path to the data (dot notation)
   * @returns Extracted data
   */
  private extractDataByPath(data: unknown, path: string): unknown {
    const parts = path.split('.');
    let result = data;
    
    for (const part of parts) {
      if (result === null || result === undefined) {
        return undefined;
      }
      
      if (typeof result !== 'object') {
        return undefined;
      }
      
      result = (result as Record<string, unknown>)[part];
    }
    
    return result;
  }
  
  /**
   * Build a URL from the base URL and path
   * @param path URL path
   * @returns Full URL
   */
  private buildUrl(path: string): string {
    // If path is already a full URL, return it
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    
    // If path starts with a slash, append it to the base URL
    if (path.startsWith('/')) {
      // Remove trailing slash from base URL if present
      const baseUrl = this.restParams.baseUrl.endsWith('/')
        ? this.restParams.baseUrl.slice(0, -1)
        : this.restParams.baseUrl;
      
      return `${baseUrl}${path}`;
    }
    
    // Otherwise, append path to base URL with a slash
    const baseUrl = this.restParams.baseUrl.endsWith('/')
      ? this.restParams.baseUrl
      : `${this.restParams.baseUrl}/`;
    
    return `${baseUrl}${path}`;
  }
  
  /**
   * Queue a request to manage concurrency
   * @param request Request function to execute
   */
  private async queueRequest(request: () => Promise<void>): Promise<void> {
    // Add to queue
    return new Promise<void>((resolve, reject) => {
      const execute = async (): Promise<void> => {
        // If we've reached the concurrency limit, wait
        if (this.activeRequests >= (this.restParams.maxConcurrentRequests || 10)) {
          // Put back in the queue
          this.requestQueue.push(execute);
          return;
        }
        
        try {
          // Increment active requests counter
          this.activeRequests++;
          
          // Execute the request
          await request();
          
          // Resolve the promise
          resolve();
        } catch (error) {
          // Reject the promise
          reject(error);
        } finally {
          // Decrement active requests counter
          this.activeRequests--;
          
          // Process next request in queue
          this.processNextRequest();
        }
      };
      
      // Add to queue if we've reached the concurrency limit
      if (this.activeRequests >= (this.restParams.maxConcurrentRequests || 10)) {
        this.requestQueue.push(execute);
      } else {
        // Otherwise, execute immediately
        execute().catch(reject);
      }
    });
  }
  
  /**
   * Process the next request in the queue
   */
  private processNextRequest(): void {
    if (this.requestQueue.length === 0) {
      return;
    }
    
    // Get the next request from the queue
    const nextRequest = this.requestQueue.shift();
    if (nextRequest) {
      // Execute the request
      nextRequest().catch(err => {
        this.logger.error(`Error processing queued request: ${err.message}`, err);
      });
    }
  }
  
  /**
   * Read a file from disk
   * @param filePath Path to the file
   * @returns File contents
   */
  private async readFile(filePath: string): Promise<string> {
    try {
      const fs = require('fs').promises;
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      this.logger.error(`Failed to read file ${filePath}: ${error.message}`, error);
      throw error;
    }
  }
}