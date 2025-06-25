import httpClient from '@/lib/httpClient';

export interface Role {
  name: string;
  level: number;
  description: string;
  userCount: number;
  isSystem: boolean;
}

export interface Permission {
  key: string;
  name: string;
  description: string;
  category: string;
  allowedRoles: string[];
}

export interface UserPermission {
  userId: string;
  userName: string;
  email: string;
  role: string;
  department?: string;
  site?: string;
  enterprise?: string;
  permissions: string[];
  customPermissions: string[];
  lastModified: Date;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  userId: string;
  userEmail: string;
  targetId: string;
  targetEmail: string;
  changes: any;
  ipAddress: string;
  userAgent?: string;
}

export interface PermissionsData {
  permissions: Record<string, string[]>;
  roles: Role[];
  users: UserPermission[];
  categories: Record<string, string[]>;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

class PermissionService {
  /**
   * Get all permissions, roles, and user permissions
   */
  async getPermissions(): Promise<PermissionsData> {
    const response = await httpClient.get<PermissionsData>('/api/permissions');
    
    // Convert date strings to Date objects
    if (response.users) {
      response.users = response.users.map(user => ({
        ...user,
        lastModified: new Date(user.lastModified),
      }));
    }
    
    return response;
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: string): Promise<void> {
    await httpClient.patch('/api/permissions', {
      userId,
      role,
    });
  }

  /**
   * Update user permissions
   */
  async updateUserPermissions(userId: string, permissions: string[]): Promise<void> {
    await httpClient.patch('/api/permissions', {
      userId,
      permissions,
    });
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(params?: {
    limit?: number;
    offset?: number;
    action?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLogsResponse> {
    const queryParams: any = {};
    
    if (params) {
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.offset !== undefined) queryParams.offset = params.offset;
      if (params.action) queryParams.action = params.action;
      if (params.userId) queryParams.userId = params.userId;
      if (params.startDate) queryParams.startDate = params.startDate.toISOString();
      if (params.endDate) queryParams.endDate = params.endDate.toISOString();
    }
    
    return httpClient.get<AuditLogsResponse>('/api/permissions/audit', {
      params: queryParams,
    });
  }

  /**
   * Create an audit log entry
   */
  async createAuditLog(data: {
    action: string;
    targetId: string;
    targetEmail?: string;
    changes?: any;
    metadata?: any;
  }): Promise<void> {
    await httpClient.post('/api/permissions/audit', data);
  }

  /**
   * Check if a user has a specific permission
   */
  hasPermission(userRole: string, permission: string): boolean {
    const roleHierarchy: Record<string, number> = {
      admin: 100,
      manager: 80,
      engineer: 70,
      supervisor: 60,
      quality_analyst: 50,
      technician: 40,
      operator: 30,
      viewer: 20,
      user: 10,
    };

    const permissionRoles: Record<string, string[]> = {
      'manage:users': ['admin'],
      'manage:teams': ['admin', 'manager'],
      'manage:settings': ['admin'],
      'manage:dashboards': ['admin', 'manager', 'engineer'],
      'manage:alerts': ['admin', 'manager', 'supervisor'],
      'manage:equipment': ['admin', 'manager', 'engineer'],
      'manage:integrations': ['admin'],
      'edit:all': ['admin'],
      'edit:dashboards': ['admin', 'manager', 'engineer'],
      'edit:alerts': ['admin', 'manager', 'supervisor'],
      'edit:equipment': ['admin', 'manager', 'engineer', 'technician'],
      'edit:maintenance': ['admin', 'manager', 'engineer', 'technician'],
      'edit:quality': ['admin', 'manager', 'quality_analyst'],
      'create:dashboards': ['admin', 'manager', 'engineer'],
      'create:alerts': ['admin', 'manager', 'supervisor', 'engineer'],
      'create:maintenance': ['admin', 'manager', 'engineer', 'technician'],
      'create:quality:reports': ['admin', 'manager', 'quality_analyst'],
      'delete:all': ['admin'],
      'delete:own': ['admin', 'manager', 'engineer'],
      'view:all': ['admin', 'manager', 'engineer'],
      'view:users': ['admin', 'manager'],
      'view:team': ['admin', 'manager', 'supervisor'],
      'view:dashboards': ['admin', 'manager', 'engineer', 'supervisor', 'operator', 'quality_analyst', 'viewer'],
      'view:equipment': ['admin', 'manager', 'engineer', 'supervisor', 'operator', 'technician', 'quality_analyst'],
      'view:alerts': ['admin', 'manager', 'engineer', 'supervisor', 'operator', 'technician'],
      'view:maintenance': ['admin', 'manager', 'engineer', 'technician'],
      'view:quality': ['admin', 'manager', 'engineer', 'quality_analyst'],
      'view:analytics': ['admin', 'manager', 'engineer'],
      'view:own': ['user'],
      'acknowledge:alerts': ['admin', 'manager', 'supervisor', 'operator'],
      'update:equipment:status': ['admin', 'manager', 'engineer', 'supervisor', 'operator'],
    };

    // Check if user has specific permission
    const allowedRoles = permissionRoles[permission];
    if (allowedRoles && allowedRoles.includes(userRole)) {
      return true;
    }

    // Check if user has a higher role in hierarchy
    const userLevel = roleHierarchy[userRole] || 0;
    const requiredLevel = Math.max(
      ...(allowedRoles || []).map(role => roleHierarchy[role] || 0)
    );

    return userLevel >= requiredLevel;
  }

  /**
   * Export permissions configuration
   */
  exportPermissions(data: PermissionsData): void {
    const exportData = {
      roles: data.roles.map(r => ({
        name: r.name,
        level: r.level,
        description: r.description,
      })),
      permissions: data.permissions,
      userPermissions: data.users.map(u => ({
        email: u.email,
        role: u.role,
        permissions: u.permissions,
        customPermissions: u.customPermissions,
      })),
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permissions-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Export singleton instance
export const permissionService = new PermissionService();
export default permissionService;