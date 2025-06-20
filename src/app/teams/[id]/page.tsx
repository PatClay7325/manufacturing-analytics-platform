'use client';

import React from 'react';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import { Save, X, Shield, Plus, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const availablePermissions = [
  { id: 'admin', name: 'Administrator', description: 'Full system access' },
  { id: 'read', name: 'Read Only', description: 'View dashboards and data' },
  { id: 'write', name: 'Write', description: 'Create and edit dashboards' },
  { id: 'manage_users', name: 'Manage Users', description: 'Create and manage user accounts' },
  { id: 'manage_teams', name: 'Manage Teams', description: 'Create and manage teams' },
  { id: 'manage_alerts', name: 'Manage Alerts', description: 'Create and manage alert rules' },
  { id: 'manage_datasources', name: 'Manage Data Sources', description: 'Configure data sources' },
];

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function EditTeamPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    members: [] as TeamMember[],
  });

  const [newMemberEmail, setNewMemberEmail] = useState('');

  useEffect(() => {
    if (!hasPermission('admin') && !hasPermission('manage_teams')) {
      router.push('/');
      return;
    }
    fetchTeam();
  }, [params.id, hasPermission, router]);

  const fetchTeam = async () => {
    try {
      const response = await fetch(`/api/teams/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch team');
      
      const team = await response.json();
      setFormData({
        name: team.name,
        description: team.description || '',
        permissions: team.permissions || [],
        members: team.members || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const handleAddMember = async () => {
    if (!newMemberEmail) return;

    try {
      const response = await fetch(`/api/teams/${params.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newMemberEmail }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add member');
      }

      setNewMemberEmail('');
      fetchTeam(); // Refresh the team data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/teams/${params.id}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to remove member');
      
      fetchTeam(); // Refresh the team data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const response = await fetch(`/api/teams/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          permissions: formData.permissions,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update team');
      }

      router.push('/teams');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Edit Team">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title="Edit Team"
      showBreadcrumbs
      breadcrumbs={[
        { label: 'Teams', href: '/teams' },
        { label: formData.name || 'Edit Team', href: `/teams/${params.id}` }
      ]}
    >
      <form onSubmit={handleSubmit} className="max-w-4xl">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          {/* Basic Information */}
          <div className="px-6 py-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          </div>
          
          <div className="px-6 py-6 space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Team Name *
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Permissions */}
          <div className="px-6 py-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Permissions</h3>
            <div className="space-y-3">
              {availablePermissions.map((permission) => (
                <label key={permission.id} className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(permission.id)}
                    onChange={() => handlePermissionToggle(permission.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                  />
                  <div className="ml-3">
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-1 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{permission.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">{permission.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Team Members */}
          <div className="px-6 py-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Team Members</h3>
            
            <div className="flex space-x-2 mb-4">
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddMember())}
                placeholder="Enter member email address"
                className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <button
                type="button"
                onClick={handleAddMember}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {formData.members.length > 0 && (
              <div className="space-y-2">
                {formData.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{member.name || member.email}</span>
                      {member.name && (
                        <span className="text-sm text-gray-500 ml-2">({member.email})</span>
                      )}
                      <span className="text-xs text-gray-500 ml-2 capitalize">• {member.role}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 rounded-b-lg">
            <button
              type="button"
              onClick={() => router.push('/teams')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}