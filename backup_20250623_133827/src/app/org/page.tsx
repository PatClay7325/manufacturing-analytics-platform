'use client';

import React from 'react';

import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { 
  Building2, 
  Users, 
  Settings, 
  Shield, 
  Mail,
  Calendar,
  Edit2,
  Save,
  X
} from 'lucide-react';
import Link from 'next/link';

interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  created: Date;
  updated: Date;
  users: number;
  teams: number;
  dashboards: number;
  dataSources: number;
}

// Mock organization data
const mockOrg: Organization = {
  id: '1',
  name: 'Manufacturing Analytics Inc',
  slug: 'manufacturing-analytics',
  email: 'admin@manufacturing-analytics.com',
  address: '123 Industrial Way',
  city: 'Detroit',
  state: 'MI',
  country: 'USA',
  created: new Date('2024-01-01'),
  updated: new Date(),
  users: 45,
  teams: 8,
  dashboards: 127,
  dataSources: 12
};

export default function OrgPage() {
  const [org, setOrg] = useState(mockOrg);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(org);

  const handleSave = () => {
    setOrg(editForm);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm(org);
    setIsEditing(false);
  };

  return (
    <PageLayout
      title="Organization settings"
      description="Manage your organization details and preferences"
    >
      <div className="max-w-4xl space-y-6">
        {/* Organization Details */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Organization details
              </h2>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    className="inline-flex items-center px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            {/* Organization Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Organization name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{org.name}</p>
              )}
            </div>

            {/* Organization Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contact email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{org.email}</p>
              )}
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{org.address}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{org.city}</p>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Organization ID:</span>
                  <p className="text-gray-900 dark:text-white font-mono">{org.slug}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Created:</span>
                  <p className="text-gray-900 dark:text-white">{org.created.toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Organization Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/org/users" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Users</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{org.users}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </Link>
          
          <Link href="/org/teams" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Teams</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{org.teams}</p>
              </div>
              <Shield className="h-8 w-8 text-gray-400" />
            </div>
          </Link>
          
          <Link href="/dashboards" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Dashboards</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{org.dashboards}</p>
              </div>
              <Building2 className="h-8 w-8 text-gray-400" />
            </div>
          </Link>
          
          <Link href="/connections/datasources" className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Data sources</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{org.dataSources}</p>
              </div>
              <Settings className="h-8 w-8 text-gray-400" />
            </div>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Quick actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/org/users/invite"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Invite users
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Add new members to your organization
                </p>
              </div>
            </Link>
            
            <Link
              href="/org/serviceaccounts"
              className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  Service accounts
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage API access for applications
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}