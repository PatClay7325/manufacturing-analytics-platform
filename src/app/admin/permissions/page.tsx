'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import {
  Shield,
  Users,
  Key,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  ChevronDown,
  AlertCircle,
  Check,
  X,
  Lock,
  Unlock,
  UserCheck,
  Building,
  Factory,
  MapPin,
  Wrench,
  Save,
  History,
  Download,
  Upload,
  RefreshCw,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import permissionService, {
  Role,
  Permission,
  UserPermission,
  AuditLog,
  PermissionsData
} from '@/services/permissionService';

// Additional types
interface HierarchicalScope {
  enterprise?: string;
  site?: string;
  area?: string;
  workCenter?: string;
}

// Role hierarchy from auth.ts
const ROLE_HIERARCHY: Record<string, number> = {
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


export default function AdminPermissionsPage() {
  const router = useRouter();
  
  // State management
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions' | 'users' | 'audit'>('roles');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserPermission | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Data from API
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserPermission[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [categories, setCategories] = useState<Record<string, string[]>>({});

  // Fetch data on mount
  useEffect(() => {
    fetchPermissionsData();
    fetchAuditLogs();
  }, []);

  const fetchPermissionsData = async () => {
    try {
      setLoading(true);
      const data = await permissionService.getPermissions();
      setRoles(data.roles);
      setUsers(data.users);
      setPermissions(data.permissions);
      setCategories(data.categories);
      setError(null);
    } catch (err) {
      setError('Failed to load permissions data');
      console.error('Error fetching permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await permissionService.getAuditLogs({ limit: 100 });
      setAuditLogs(response.logs.map(log => ({
        ...log,
        timestamp: new Date(log.timestamp),
        user: log.userEmail,
        target: log.targetEmail,
      })));
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  // Computed values
  const totalPermissions = Object.keys(permissions).length;
  const totalUsers = users.length;
  const activeRoles = roles.filter(r => r.userCount > 0).length;

  // Filtered permissions based on search and category
  const filteredPermissions = useMemo(() => {
    let permissionsList = Object.entries(permissions).map(([key, allowedRoles]) => ({
      key,
      name: key.replace(/:/g, ' ').replace(/_/g, ' ').toUpperCase(),
      description: getPermissionDescription(key),
      category: getPermissionCategory(key),
      allowedRoles,
    }));

    if (searchQuery) {
      permissionsList = permissionsList.filter(p =>
        p.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterCategory !== 'all') {
      permissionsList = permissionsList.filter(p => p.category === filterCategory);
    }

    return permissionsList;
  }, [permissions, searchQuery, filterCategory]);

  // Helper functions
  function getPermissionDescription(permission: string): string {
    const descriptions: Record<string, string> = {
      'manage:users': 'Create, edit, and delete user accounts',
      'manage:teams': 'Create and manage teams and team memberships',
      'manage:settings': 'Modify system-wide settings and configurations',
      'manage:dashboards': 'Create, edit, and delete dashboards',
      'manage:alerts': 'Configure alert rules and notification channels',
      'manage:equipment': 'Add, edit, and remove equipment records',
      'manage:integrations': 'Configure external system integrations',
      'edit:all': 'Edit any content in the system',
      'edit:dashboards': 'Modify existing dashboards',
      'edit:alerts': 'Modify alert configurations',
      'edit:equipment': 'Update equipment information',
      'edit:maintenance': 'Edit maintenance records and schedules',
      'edit:quality': 'Edit quality control records',
      'create:dashboards': 'Create new dashboards',
      'create:alerts': 'Create new alert rules',
      'create:maintenance': 'Create maintenance work orders',
      'create:quality:reports': 'Generate quality reports',
      'delete:all': 'Delete any content in the system',
      'delete:own': 'Delete own created content',
      'view:all': 'View all content in the system',
      'view:users': 'View user profiles and information',
      'view:team': 'View team information',
      'view:dashboards': 'View dashboards and analytics',
      'view:equipment': 'View equipment status and history',
      'view:alerts': 'View active and historical alerts',
      'view:maintenance': 'View maintenance schedules and records',
      'view:quality': 'View quality metrics and reports',
      'view:analytics': 'Access advanced analytics features',
      'view:own': 'View own content only',
      'acknowledge:alerts': 'Acknowledge and clear alerts',
      'update:equipment:status': 'Update equipment operational status',
    };
    return descriptions[permission] || permission;
  }

  function getPermissionCategory(permission: string): string {
    for (const [category, perms] of Object.entries(categories)) {
      if (perms.includes(permission)) {
        return category;
      }
    }
    return 'Other';
  }

  // API calls
  const updateUserPermissions = async (userId: string, permissions: string[]) => {
    setLoading(true);
    try {
      await permissionService.updateUserPermissions(userId, permissions);
      
      // Create audit log
      const user = users.find(u => u.userId === userId);
      if (user) {
        await permissionService.createAuditLog({
          action: 'PERMISSIONS_UPDATED',
          targetId: userId,
          targetEmail: user.email,
          changes: { permissions },
        });
      }
      
      // Refresh data
      await fetchPermissionsData();
      await fetchAuditLogs();
      
      setSuccessMessage('Permissions updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update permissions');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    setLoading(true);
    try {
      const user = users.find(u => u.userId === userId);
      if (!user) return;
      
      await permissionService.updateUserRole(userId, newRole);
      
      // Create audit log
      await permissionService.createAuditLog({
        action: 'ROLE_CHANGED',
        targetId: userId,
        targetEmail: user.email,
        changes: { from: user.role, to: newRole },
      });
      
      // Refresh data
      await fetchPermissionsData();
      await fetchAuditLogs();
      
      setSuccessMessage('Role updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to update role');
      setTimeout(() => setError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const exportPermissions = () => {
    const data = {
      roles: roles.map(r => ({
        name: r.name,
        level: r.level,
        description: r.description,
      })),
      permissions: permissions,
      userPermissions: users.map(u => ({
        email: u.email,
        role: u.role,
        permissions: u.permissions,
        customPermissions: u.customPermissions,
      })),
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permissions-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render functions
  const renderRolesTab = () => (
    <div className="space-y-6">
      {/* Role Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Roles</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{roles.length}</p>
            </div>
            <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Roles</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeRoles}</p>
            </div>
            <UserCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">System Roles</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{roles.filter(r => r.isSystem).length}</p>
            </div>
            <Lock className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </div>

      {/* Roles List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Role Hierarchy</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Roles are organized by permission level. Higher levels inherit permissions from lower levels.
          </p>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {roles.sort((a, b) => b.level - a.level).map((role) => (
            <div
              key={role.name}
              className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                selectedRole === role.name ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
              onClick={() => setSelectedRole(role.name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-2 h-16 rounded-full ${
                    role.level >= 80 ? 'bg-red-500' :
                    role.level >= 60 ? 'bg-orange-500' :
                    role.level >= 40 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-base font-medium text-gray-900 dark:text-white capitalize">
                        {role.name.replace(/_/g, ' ')}
                      </h4>
                      {role.isSystem && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          System
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{role.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>Level: {role.level}</span>
                      <span>•</span>
                      <span>{role.userCount} users</span>
                      <span>•</span>
                      <span>
                        {Object.entries(permissions)
                          .filter(([_, allowedRoles]) => allowedRoles.includes(role.name))
                          .length} permissions
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${
                  selectedRole === role.name ? 'rotate-180' : ''
                }`} />
              </div>
              
              {selectedRole === role.name && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Permissions</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(permissions)
                      .filter(([_, allowedRoles]) => allowedRoles.includes(role.name))
                      .map(([permission]) => (
                        <div key={permission} className="flex items-center space-x-2 text-sm">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {permission.replace(/:/g, ' ').replace(/_/g, ' ')}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPermissionsTab = () => (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {Object.keys(categories).map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Permissions Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Permission Matrix</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Overview of all system permissions and their role assignments
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Permission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Allowed Roles
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPermissions.map((permission) => (
                <tr key={permission.key} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Key className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {permission.key}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {permission.description}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {permission.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {permission.allowedRoles.map(role => (
                        <span
                          key={role}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderUsersTab = () => (
    <div className="space-y-6">
      {/* User Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add User Permissions
        </button>
      </div>

      {/* Users List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Permissions</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage individual user permissions and role assignments
          </p>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {users
            .filter(user => 
              searchQuery === '' || 
              user.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              user.email.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((user) => (
              <div
                key={user.userId}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                  selectedUser?.userId === user.userId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {user.userName.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-base font-medium text-gray-900 dark:text-white">
                        {user.userName}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center">
                          <Shield className="h-3 w-3 mr-1" />
                          {user.role}
                        </span>
                        {user.department && (
                          <>
                            <span>•</span>
                            <span className="flex items-center">
                              <Building className="h-3 w-3 mr-1" />
                              {user.department}
                            </span>
                          </>
                        )}
                        {user.site && (
                          <>
                            <span>•</span>
                            <span className="flex items-center">
                              <Factory className="h-3 w-3 mr-1" />
                              {user.site}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {user.customPermissions.length > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                        +{user.customPermissions.length} custom
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUser(user);
                        setIsEditingUser(true);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {selectedUser?.userId === user.userId && !isEditingUser && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Role Permissions ({user.permissions.length})
                        </h5>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {user.permissions.map(permission => (
                            <div key={permission} className="flex items-center space-x-2 text-sm">
                              <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                              <span className="text-gray-700 dark:text-gray-300">
                                {permission.replace(/:/g, ' ').replace(/_/g, ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {user.customPermissions.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            Custom Permissions
                          </h5>
                          <div className="space-y-1">
                            {user.customPermissions.map(permission => (
                              <div key={permission} className="flex items-center space-x-2 text-sm">
                                <Key className="h-3 w-3 text-purple-500 flex-shrink-0" />
                                <span className="text-gray-700 dark:text-gray-300">
                                  {permission.replace(/:/g, ' ').replace(/_/g, ' ')}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      Last modified: {format(user.lastModified, 'PPp')}
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderAuditTab = () => (
    <div className="space-y-6">
      {/* Audit Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Events</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{auditLogs.length}</p>
            </div>
            <History className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Permission Changes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {auditLogs.filter(log => log.action.includes('PERMISSION')).length}
              </p>
            </div>
            <Key className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Role Changes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {auditLogs.filter(log => log.action.includes('ROLE')).length}
              </p>
            </div>
            <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Last 24h</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {auditLogs.filter(log => 
                  log.timestamp > new Date(Date.now() - 86400000)
                ).length}
              </p>
            </div>
            <RefreshCw className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Audit Trail</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Complete history of permission and role changes
            </p>
          </div>
          <button
            onClick={exportPermissions}
            className="inline-flex items-center px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </button>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                    log.action.includes('GRANTED') || log.action.includes('CREATED') ? 'bg-green-500' :
                    log.action.includes('REVOKED') || log.action.includes('DELETED') ? 'bg-red-500' :
                    log.action.includes('UPDATED') || log.action.includes('CHANGED') ? 'bg-blue-500' :
                    'bg-gray-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span className="font-medium">{log.user}</span>
                      {' → '}
                      <span className="font-medium">{log.target}</span>
                    </p>
                    {log.changes && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {log.action === 'ROLE_CHANGED' && log.changes.from && log.changes.to && (
                          <span className="inline-flex items-center space-x-1">
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                              {log.changes.from}
                            </span>
                            <span>→</span>
                            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                              {log.changes.to}
                            </span>
                          </span>
                        )}
                        {log.action === 'PERMISSION_GRANTED' && log.changes.permission && (
                          <span className="text-green-600 dark:text-green-400">
                            + {log.changes.permission}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {format(log.timestamp, 'PPp')}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    IP: {log.ipAddress}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <PageLayout
      title="Permissions Management"
      description="Configure roles, permissions, and access control for your manufacturing platform"
    >
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
            <span className="text-sm text-green-800 dark:text-green-200">{successMessage}</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
            <span className="text-sm text-red-800 dark:text-red-200">{error}</span>
          </div>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalUsers}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Permissions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalPermissions}</p>
            </div>
            <Key className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Roles</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeRoles}</p>
            </div>
            <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Custom Permissions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {users.reduce((sum, u) => sum + u.customPermissions.length, 0)}
              </p>
            </div>
            <Settings className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'roles', label: 'Roles', icon: Shield },
            { id: 'permissions', label: 'Permissions', icon: Key },
            { id: 'users', label: 'User Permissions', icon: Users },
            { id: 'audit', label: 'Audit Trail', icon: History },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              <tab.icon className={`mr-2 h-5 w-5 ${
                activeTab === tab.id
                  ? 'text-blue-500 dark:text-blue-400'
                  : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
              }`} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {activeTab === 'roles' && renderRolesTab()}
            {activeTab === 'permissions' && renderPermissionsTab()}
            {activeTab === 'users' && renderUsersTab()}
            {activeTab === 'audit' && renderAuditTab()}
          </>
        )}
      </div>

      {/* Edit User Modal */}
      {isEditingUser && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit User Permissions
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {selectedUser.userName} ({selectedUser.email})
              </p>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={selectedUser.role}
                  onChange={(e) => updateUserRole(selectedUser.userId, e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {roles.map(role => (
                    <option key={role.name} value={role.name}>
                      {role.name.replace(/_/g, ' ')} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Permissions
                </label>
                <div className="space-y-4">
                  {Object.entries(categories).map(([category, categoryPermissions]) => (
                    <div key={category}>
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        {category}
                      </h4>
                      <div className="space-y-2">
                        {categoryPermissions.map(permission => {
                          const hasPermission = selectedUser.permissions.includes(permission) ||
                                              selectedUser.customPermissions.includes(permission);
                          const isRolePermission = permissions[permission]?.includes(selectedUser.role);
                          
                          return (
                            <label
                              key={permission}
                              className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <input
                                type="checkbox"
                                checked={hasPermission}
                                disabled={isRolePermission}
                                onChange={(e) => {
                                  const newPermissions = e.target.checked
                                    ? [...selectedUser.permissions, permission]
                                    : selectedUser.permissions.filter(p => p !== permission);
                                  updateUserPermissions(selectedUser.userId, newPermissions);
                                }}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {permission.replace(/:/g, ' ').replace(/_/g, ' ')}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {getPermissionDescription(permission)}
                                </p>
                              </div>
                              {isRolePermission && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  (Role default)
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setIsEditingUser(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsEditingUser(false);
                  setSuccessMessage('User permissions updated successfully');
                  setTimeout(() => setSuccessMessage(null), 3000);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}