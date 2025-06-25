/**
 * Tenant Context Interface
 */

import { Tenant } from './TenantResolver';

export interface TenantContextData {
  tenant: Tenant;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  permissions: string[];
  isSystemAdmin: boolean;
}

export interface TenantContext {
  setCurrentContext(context: TenantContextData): void;
  getCurrentContext(): TenantContextData | null;
  clearContext(): void;
}