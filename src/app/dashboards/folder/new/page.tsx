'use client';

import React from 'react';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import { Save, X, Folder, AlertCircle, Users, Lock, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const permissionOptions = [
  { id: 'private', name: 'Private', description: 'Only you can access this folder', icon: Lock },
  { id: 'team', name: 'Team', description: 'Your team members can access', icon: Users },
  { id: 'public', name: 'Public', description: 'Everyone in the organization can access', icon: Globe },
];

export default function NewFolderPage() {
  const router = useRouter();
  const { user, hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permission: 'private',
    tags: [] as string[],
  });

  const [newTag, setNewTag] = useState('');

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/dashboards/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          createdBy: user.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create folder');
      }

      const folder = await response.json();
      router.push(`/dashboards/folder/${folder.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout 
      title="Create Dashboard Folder"
      showBreadcrumbs
      breadcrumbs={[
        { label: 'Dashboards', href: '/dashboards' },
        { label: 'Create Folder', href: '/dashboards/folder/new' }
      ]}
    >
      <form onSubmit={handleSubmit} className="max-w-2xl">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="flex items-center">
              <Folder className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-medium text-gray-900">Folder Details</h3>
            </div>
          </div>
          
          <div className="px-6 py-6 space-y-6">
            {/* Folder Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Folder Name *
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., Production Dashboards"
              />
            </div>

            {/* Description */}
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
                placeholder="Describe what this folder contains..."
              />
            </div>

            {/* Permission Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Access Permission
              </label>
              <div className="space-y-3">
                {permissionOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <label key={option.id} className="flex items-start">
                      <input
                        type="radio"
                        name="permission"
                        value={option.id}
                        checked={formData.permission === option.id}
                        onChange={(e) => setFormData({ ...formData, permission: e.target.value })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 mt-1"
                      />
                      <div className="ml-3">
                        <div className="flex items-center">
                          <Icon className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{option.name}</span>
                        </div>
                        <span className="text-sm text-gray-500">{option.description}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <div className="flex space-x-2 mb-3">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Add a tag..."
                  className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add
                </button>
              </div>

              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Folder className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    About Dashboard Folders
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Folders help you organize your dashboards into logical groups. You can create 
                      folders for different teams, projects, or use cases to keep your workspace tidy.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 rounded-b-lg">
            <button
              type="button"
              onClick={() => router.push('/dashboards')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </div>
      </form>
    </PageLayout>
  );
}