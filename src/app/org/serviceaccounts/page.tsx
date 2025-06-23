'use client';

import React from 'react';

import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { 
  Key, 
  Plus, 
  Search, 
  Shield,
  Calendar,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  RefreshCw,
  AlertCircle,
  Bot
} from 'lucide-react';
import Link from 'next/link';

interface ServiceAccount {
  id: string;
  name: string;
  login: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  tokens: number;
  lastUsed?: Date;
  createdAt: Date;
  expiresAt?: Date;
  isDisabled: boolean;
  teams: string[];
}

const mockServiceAccounts: ServiceAccount[] = [
  {
    id: '1',
    name: 'Production Monitoring',
    login: 'sa-production-monitoring',
    role: 'Viewer',
    tokens: 2,
    lastUsed: new Date(Date.now() - 1000 * 60 * 30),
    createdAt: new Date('2024-01-01'),
    teams: ['Platform', 'SRE']
  },
  {
    id: '2',
    name: 'CI/CD Pipeline',
    login: 'sa-cicd-pipeline',
    role: 'Editor',
    tokens: 1,
    lastUsed: new Date(Date.now() - 1000 * 60 * 60 * 2),
    createdAt: new Date('2024-01-15'),
    teams: ['DevOps']
  },
  {
    id: '3',
    name: 'Data Ingestion Service',
    login: 'sa-data-ingestion',
    role: 'Editor',
    tokens: 3,
    lastUsed: new Date(Date.now() - 1000 * 60 * 5),
    createdAt: new Date('2024-02-01'),
    expiresAt: new Date('2025-02-01'),
    teams: ['Data Engineering']
  },
  {
    id: '4',
    name: 'Backup Service',
    login: 'sa-backup-service',
    role: 'Admin',
    tokens: 1,
    createdAt: new Date('2024-02-15'),
    isDisabled: true,
    teams: ['Infrastructure']
  },
  {
    id: '5',
    name: 'External API Integration',
    login: 'sa-external-api',
    role: 'Viewer',
    tokens: 0,
    createdAt: new Date('2024-03-01'),
    teams: ['API Team']
  }
].map(sa => ({ ...sa, isDisabled: sa.isDisabled || false }));

export default function ServiceAccountsPage() {
  const [serviceAccounts] = useState(mockServiceAccounts);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showActions, setShowActions] = useState<string | null>(null);

  const filteredAccounts = serviceAccounts.filter(account => {
    const matchesSearch = 
      account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.login.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.teams.some(team => team.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || account.role === roleFilter;
    
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

  const formatLastUsed = (date?: Date) => {
    if (!date) return 'Never';
    
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

  const getExpiryStatus = (expiresAt?: Date) => {
    if (!expiresAt) return null;
    
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { text: 'Expired', color: 'text-red-600 dark:text-red-400' };
    } else if (daysUntilExpiry < 30) {
      return { text: `Expires in ${daysUntilExpiry}d`, color: 'text-yellow-600 dark:text-yellow-400' };
    } else {
      return { text: `Expires in ${daysUntilExpiry}d`, color: 'text-gray-500 dark:text-gray-400' };
    }
  };

  return (
    <PageLayout
      title="Service accounts"
      description="Manage service accounts for programmatic access"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total accounts</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{serviceAccounts.length}</p>
              </div>
              <Bot className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {serviceAccounts.filter(sa => !sa.isDisabled).length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total tokens</p>
                <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  {serviceAccounts.reduce((sum, sa) => sum + sa.tokens, 0)}
                </p>
              </div>
              <Key className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Expiring soon</p>
                <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
                  {serviceAccounts.filter(sa => {
                    if (!sa.expiresAt) return false;
                    const days = Math.floor((sa.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return days >= 0 && days < 30;
                  }).length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search service accounts..."
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
              href="/org/serviceaccounts/create"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add service account
            </Link>
          </div>
        </div>

        {/* Service Accounts List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tokens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last used
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Expiry
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAccounts.map((account) => {
                const expiryStatus = getExpiryStatus(account.expiresAt);
                return (
                  <tr key={account.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${account.isDisabled ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                            <Bot className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {account.name}
                            {account.isDisabled && (
                              <span className="ml-2 text-xs text-red-600 dark:text-red-400">(Disabled)</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {account.login}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(account.role)}`}>
                        {account.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {account.tokens} {account.tokens === 1 ? 'token' : 'tokens'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatLastUsed(account.lastUsed)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {expiryStatus ? (
                        <span className={expiryStatus.color}>{expiryStatus.text}</span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">No expiry</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="relative">
                        <button
                          onClick={() => setShowActions(showActions === account.id ? null : account.id)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                        
                        {showActions === account.id && (
                          <div className="absolute right-0 z-10 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5">
                            <div className="py-1">
                              <Link
                                href={`/org/serviceaccounts/${account.id}`}
                                className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                              >
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit details
                              </Link>
                              <button className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full">
                                <Key className="h-4 w-4 mr-2" />
                                Add token
                              </button>
                              <button className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full">
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </button>
                              {account.isDisabled ? (
                                <button className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full">
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Enable
                                </button>
                              ) : (
                                <button className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 w-full">
                                  <Shield className="h-4 w-4 mr-2" />
                                  Disable
                                </button>
                              )}
                              <button className="flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 w-full">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredAccounts.length === 0 && (
            <div className="text-center py-12">
              <Bot className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No service accounts found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchQuery || roleFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating a service account'}
              </p>
              {!searchQuery && roleFilter === 'all' && (
                <div className="mt-6">
                  <Link
                    href="/org/serviceaccounts/create"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add service account
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}