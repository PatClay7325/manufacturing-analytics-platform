/**
 * External Systems Configuration
 * Centralized configuration for SAP and Ignition connections
 */

import { z } from 'zod';

// Configuration schemas for validation
export const SAPConfigSchema = z.object({
  host: z.string().min(1),
  systemNumber: z.string().regex(/^\d{2}$/),
  client: z.string().regex(/^\d{3}$/),
  user: z.string().min(1),
  password: z.string().min(1),
  language: z.string().default('EN'),
  poolSize: z.number().default(5),
  peakLimit: z.number().default(10),
  connectionTimeout: z.number().default(30000),
  idleTimeout: z.number().default(300000),
});

export const IgnitionConfigSchema = z.object({
  gatewayUrl: z.string().url(),
  apiKey: z.string().min(1),
  projectName: z.string().min(1),
  pollInterval: z.number().default(5000),
  requestTimeout: z.number().default(10000),
  maxRetries: z.number().default(3),
  retryDelay: z.number().default(1000),
});

export type SAPConfig = z.infer<typeof SAPConfigSchema>;
export type IgnitionConfig = z.infer<typeof IgnitionConfigSchema>;

// Load configuration from environment with validation
export function loadSAPConfig(): SAPConfig | null {
  if (!process.env.SAP_HOST) {
    console.warn('SAP configuration not found. SAP integration disabled.');
    return null;
  }

  try {
    const config = SAPConfigSchema.parse({
      host: process.env.SAP_HOST,
      systemNumber: process.env.SAP_SYSTEM_NUMBER || '00',
      client: process.env.SAP_CLIENT || '100',
      user: process.env.SAP_USER,
      password: process.env.SAP_PASSWORD,
      language: process.env.SAP_LANGUAGE || 'EN',
      poolSize: parseInt(process.env.SAP_POOL_SIZE || '5'),
      peakLimit: parseInt(process.env.SAP_PEAK_LIMIT || '10'),
      connectionTimeout: parseInt(process.env.SAP_CONNECTION_TIMEOUT || '30000'),
      idleTimeout: parseInt(process.env.SAP_IDLE_TIMEOUT || '300000'),
    });

    // Never log passwords
    console.log('SAP configuration loaded for system:', config.host);
    return config;
  } catch (error) {
    console.error('Invalid SAP configuration:', error);
    return null;
  }
}

export function loadIgnitionConfig(): IgnitionConfig | null {
  if (!process.env.IGNITION_GATEWAY_URL) {
    console.warn('Ignition configuration not found. Ignition integration disabled.');
    return null;
  }

  try {
    const config = IgnitionConfigSchema.parse({
      gatewayUrl: process.env.IGNITION_GATEWAY_URL,
      apiKey: process.env.IGNITION_API_KEY,
      projectName: process.env.IGNITION_PROJECT_NAME || 'Manufacturing',
      pollInterval: parseInt(process.env.IGNITION_POLL_INTERVAL || '5000'),
      requestTimeout: parseInt(process.env.IGNITION_REQUEST_TIMEOUT || '10000'),
      maxRetries: parseInt(process.env.IGNITION_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.IGNITION_RETRY_DELAY || '1000'),
    });

    console.log('Ignition configuration loaded for:', config.gatewayUrl);
    return config;
  } catch (error) {
    console.error('Invalid Ignition configuration:', error);
    return null;
  }
}

// Configuration status for health checks
export interface SystemStatus {
  configured: boolean;
  connected: boolean;
  lastCheck: Date | null;
  error: string | null;
}

export const systemStatus: Record<string, SystemStatus> = {
  sap: {
    configured: false,
    connected: false,
    lastCheck: null,
    error: null,
  },
  ignition: {
    configured: false,
    connected: false,
    lastCheck: null,
    error: null,
  },
};