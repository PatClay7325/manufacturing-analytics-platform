/**
 * API Gateway Middleware Types
 */

export interface ApiRequest {
  id: string;
  url: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  user?: {
    id: string;
    permissions: string[];
    isSystemAdmin: boolean;
  };
  tenant?: {
    id: string;
    name: string;
    subdomain: string;
    settings: Record<string, any>;
  };
  tenantId?: string;
}

export interface ApiResponse {
  error(code: number, title: string, message: string): void;
}