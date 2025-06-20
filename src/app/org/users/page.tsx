'use client';

import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { 
  Users, 
  Plus, 
  Search, 
  Shield, 
  Mail,
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  UserX,
  UserPlus
} from 'lucide-react';
import Link from 'next/link';

interface OrgUser {
  id: string;
  name: string;
  email: string;
  login: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  lastSeenAt: Date;
  createdAt: Date;
  avatarUrl?: string;
  isDisabled: boolean;
}

const mockUsers: OrgUser[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@manufacturing.com',
    login: 'jsmith',
    role: 'Admin',
    lastSeenAt: new Date(Date.now() - 1000 * 60 * 5),
    createdAt: new Date('2024-01-01'),
    isDisabled: false
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@manufacturing.com',
    login: 'sjohnson',
    role: 'Editor',
    lastSeenAt: new Date(Date.now() - 1000 * 60 * 60),
    createdAt: new Date('2024-01-15'),
    isDisabled: false
  },
  {
    id: '3',
    name: 'Mike Williams',
    email: 'mike.williams@manufacturing.com',
    login: 'mwilliams',
    role: 'Viewer',
    lastSeenAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    createdAt: new Date('2024-02-01'),
    isDisabled: false
  },
  {
    id: '4',
    name: 'Emily Davis',
    email: 'emily.davis@manufacturing.com',
    login: 'edavis',
    role: 'Editor',
    lastSeenAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    createdAt: new Date('2024-02-15'),
    isDisabled: true
  }
];

export default function OrgUsersPage() {
  const [users] = useState(mockUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showActions, setShowActions] = useState<string | null>(null);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.login.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'Editor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Viewer':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const formatLastSeen = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <PageLayout
      title="Organization users"
      description="Manage users in your organization"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total users</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{users.length}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active users</p>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {users.filter(u => !u.isDisabled).length}
                </p>
              </div>
              <UserPlus className="h-8 w-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Admins</p>
                <p className="text-2xl font-semibold text-purple-600 dark:text-purple-400">
                  {users.filter(u => u.role === 'Admin').length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All roles</option>
              <option value="Admin">Admin</option>
              <option value="Editor">Editor</option>
              <option value="Viewer">Viewer</option>
            </select>
            
            <Link
              href="/org/users/invite"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Invite user
            </Link>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last seen
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${user.isDisabled ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.name}
                          {user.isDisabled && (
                            <span className="ml-2 text-xs text-red-600 dark:text-red-400">(Disabled)</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white font-mono">
                      {user.login}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatLastSeen(user.lastSeenAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="relative">
                      <button
                        onClick={() => setShowActions(showActions === user.id ? null : user.id)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                      
                      {showActions === user.id && (
                        <div className="absolute right-0 z-10 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5">
                          <div className="py-1">
                            <button className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full">
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit user
                            </button>
                            <button className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full">
                              <Mail className="h-4 w-4 mr-2" />
                              Send email
                            </button>
                            {user.isDisabled ? (
                              <button className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full">
                                <UserPlus className="h-4 w-4 mr-2" />
                                Enable user
                              </button>
                            ) : (
                              <button className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full">
                                <UserX className="h-4 w-4 mr-2" />
                                Disable user
                              </button>
                            )}
                            <button className="flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 w-full">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove from org
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No users found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}