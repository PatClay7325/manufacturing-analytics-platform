import { grafanaClient } from '../GrafanaClient';
import { sessionBridge, SessionUser } from '@/lib/auth/SessionBridge';
import { logger } from '@/lib/logger';

export interface ServiceAccount {
  id: number;
  name: string;
  login: string;
  orgId: number;
  isDisabled: boolean;
  role: string;
  tokens: number;
  avatarUrl: string;
}

export interface ServiceAccountToken {
  id: number;
  name: string;
  key?: string; // Only returned on creation
  hasExpired: boolean;
  isRevoked: boolean;
  created: string;
  expiration?: string;
}

export class ServiceAccountManager {
  private serviceAccounts: Map<string, ServiceAccount> = new Map();

  /**
   * Create a service account in Grafana
   */
  async createServiceAccount(
    name: string,
    role: 'Admin' | 'Editor' | 'Viewer' = 'Viewer'
  ): Promise<ServiceAccount> {
    try {
      const response = await grafanaClient.request('/api/serviceaccounts', {
        method: 'POST',
        body: JSON.stringify({
          name,
          role,
          isDisabled: false,
        }),
      });

      const serviceAccount = await response.json();
      this.serviceAccounts.set(name, serviceAccount);
      
      logger.info(`Created service account: ${name} with role ${role}`);
      return serviceAccount;
    } catch (error) {
      logger.error('Error creating service account:', error);
      throw new Error('Failed to create service account');
    }
  }

  /**
   * Create a token for a service account
   */
  async createServiceAccountToken(
    serviceAccountId: number,
    tokenName: string,
    secondsToLive?: number
  ): Promise<ServiceAccountToken> {
    try {
      const response = await grafanaClient.request(
        `/api/serviceaccounts/${serviceAccountId}/tokens`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: tokenName,
            secondsToLive,
          }),
        }
      );

      const token = await response.json();
      logger.info(`Created token ${tokenName} for service account ${serviceAccountId}`);
      return token;
    } catch (error) {
      logger.error('Error creating service account token:', error);
      throw new Error('Failed to create service account token');
    }
  }

  /**
   * Get or create a service account for the Next.js application
   */
  async getOrCreateAppServiceAccount(): Promise<{
    account: ServiceAccount;
    token?: ServiceAccountToken;
  }> {
    const accountName = 'nextjs-manufacturing-app';
    
    try {
      // Check if account exists
      const accounts = await this.listServiceAccounts();
      let account = accounts.find(a => a.name === accountName);

      if (!account) {
        // Create new service account
        account = await this.createServiceAccount(accountName, 'Editor');
        
        // Create a long-lived token
        const token = await this.createServiceAccountToken(
          account.id,
          'app-integration-token',
          31536000 // 1 year
        );

        return { account, token };
      }

      return { account };
    } catch (error) {
      logger.error('Error getting app service account:', error);
      throw new Error('Failed to get or create app service account');
    }
  }

  /**
   * List all service accounts
   */
  async listServiceAccounts(): Promise<ServiceAccount[]> {
    try {
      const response = await grafanaClient.request('/api/serviceaccounts');
      const data = await response.json();
      return data.serviceAccounts || [];
    } catch (error) {
      logger.error('Error listing service accounts:', error);
      return [];
    }
  }

  /**
   * Get service account by ID
   */
  async getServiceAccount(id: number): Promise<ServiceAccount | null> {
    try {
      const response = await grafanaClient.request(`/api/serviceaccounts/${id}`);
      return await response.json();
    } catch (error) {
      logger.error(`Error getting service account ${id}:`, error);
      return null;
    }
  }

  /**
   * List tokens for a service account
   */
  async listServiceAccountTokens(
    serviceAccountId: number
  ): Promise<ServiceAccountToken[]> {
    try {
      const response = await grafanaClient.request(
        `/api/serviceaccounts/${serviceAccountId}/tokens`
      );
      return await response.json();
    } catch (error) {
      logger.error(`Error listing tokens for service account ${serviceAccountId}:`, error);
      return [];
    }
  }

  /**
   * Revoke a service account token
   */
  async revokeServiceAccountToken(
    serviceAccountId: number,
    tokenId: number
  ): Promise<void> {
    try {
      await grafanaClient.request(
        `/api/serviceaccounts/${serviceAccountId}/tokens/${tokenId}`,
        {
          method: 'DELETE',
        }
      );
      logger.info(`Revoked token ${tokenId} for service account ${serviceAccountId}`);
    } catch (error) {
      logger.error('Error revoking service account token:', error);
      throw new Error('Failed to revoke service account token');
    }
  }

  /**
   * Update service account role
   */
  async updateServiceAccountRole(
    serviceAccountId: number,
    role: 'Admin' | 'Editor' | 'Viewer'
  ): Promise<void> {
    try {
      await grafanaClient.request(
        `/api/serviceaccounts/${serviceAccountId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ role }),
        }
      );
      logger.info(`Updated service account ${serviceAccountId} role to ${role}`);
    } catch (error) {
      logger.error('Error updating service account role:', error);
      throw new Error('Failed to update service account role');
    }
  }

  /**
   * Delete a service account
   */
  async deleteServiceAccount(serviceAccountId: number): Promise<void> {
    try {
      await grafanaClient.request(
        `/api/serviceaccounts/${serviceAccountId}`,
        {
          method: 'DELETE',
        }
      );
      logger.info(`Deleted service account ${serviceAccountId}`);
    } catch (error) {
      logger.error('Error deleting service account:', error);
      throw new Error('Failed to delete service account');
    }
  }

  /**
   * Create a session for service account access
   * This allows service accounts to access our Next.js APIs
   */
  async createServiceAccountSession(
    serviceAccountId: number,
    tokenName: string
  ): Promise<{ session: any; token: string }> {
    try {
      const account = await this.getServiceAccount(serviceAccountId);
      if (!account) {
        throw new Error('Service account not found');
      }

      // Create a user representation for the service account
      const serviceUser: SessionUser = {
        id: `sa_${serviceAccountId}`,
        email: `${account.login}@service.local`,
        name: account.name,
        role: account.role,
        groups: ['service_accounts', account.role.toLowerCase()],
        organizationId: account.orgId.toString(),
      };

      // Create session
      const { session, token } = await sessionBridge.createSession(serviceUser);
      
      // Add service account metadata
      session.metadata = {
        type: 'service_account',
        serviceAccountId,
        tokenName,
      };

      await sessionBridge.refreshSession(session.id);

      logger.info(`Created session for service account ${account.name}`);
      return { session, token };
    } catch (error) {
      logger.error('Error creating service account session:', error);
      throw new Error('Failed to create service account session');
    }
  }

  /**
   * Validate if a session belongs to a service account
   */
  isServiceAccountSession(session: any): boolean {
    return session?.metadata?.type === 'service_account';
  }

  /**
   * Get service account from session
   */
  async getServiceAccountFromSession(
    session: any
  ): Promise<ServiceAccount | null> {
    if (!this.isServiceAccountSession(session)) {
      return null;
    }

    const serviceAccountId = session.metadata?.serviceAccountId;
    if (!serviceAccountId) {
      return null;
    }

    return this.getServiceAccount(serviceAccountId);
  }

  /**
   * Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    let cleaned = 0;

    try {
      const accounts = await this.listServiceAccounts();
      
      for (const account of accounts) {
        const tokens = await this.listServiceAccountTokens(account.id);
        
        for (const token of tokens) {
          if (token.hasExpired || token.isRevoked) {
            // Token is already revoked or expired, no action needed
            cleaned++;
          }
        }
      }

      logger.info(`Identified ${cleaned} expired/revoked service account tokens`);
      return cleaned;
    } catch (error) {
      logger.error('Error cleaning up expired tokens:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const serviceAccountManager = new ServiceAccountManager();