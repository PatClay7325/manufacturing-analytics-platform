'use client';

import React from 'react';

import { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { Plus, Key, Calendar, AlertCircle, Trash2, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface ApiKey {
  id: string;
  name: string;
  key?: string;
  keyPreview: string;
  permissions: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<ApiKey | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [showFullKey, setShowFullKey] = useState<string | null>(null);
  const router = useRouter();
  const { user, hasPermission } = useAuth();

  // New API key form state
  const [newKeyForm, setNewKeyForm] = useState({
    name: '',
    permissions: [] as string[],
    expiresIn: '30', // days
  });

  const [createdKey, setCreatedKey] = useState<{ id: string; key: string } | null>(null);

  const availablePermissions = [
    { id: 'read', name: 'Read', description: 'Read access to data and dashboards' },
    { id: 'write', name: 'Write', description: 'Create and modify resources' },
    { id: 'admin', name: 'Admin', description: 'Full administrative access' },
  ];

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchApiKeys();
  }, [user, router]);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/api-keys');
      if (!response.ok) throw new Error('Failed to fetch API keys');
      
      const data = await response.json();
      setApiKeys(data.keys || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(newKeyForm.expiresIn));

      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyForm.name,
          permissions: newKeyForm.permissions,
          expiresAt: expiresAt.toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Failed to create API key');
      
      const data = await response.json();
      setCreatedKey({ id: data.id, key: data.key });
      fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    }
  };

  const handleDeleteKey = async () => {
    if (!keyToDelete) return;

    try {
      const response = await fetch(`/api/api-keys/${keyToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete API key');

      setShowDeleteModal(false);
      setKeyToDelete(null);
      fetchApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    }
  };

  const copyToClipboard = async (text: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKeyId(keyId);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (loading && apiKeys.length === 0) {
    return (
      <PageLayout title="API Keys">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title="API Keys"
      actionButton={
        <button
          onClick={() => {
            setNewKeyForm({ name: '', permissions: [], expiresIn: '30' });
            setCreatedKey(null);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </button>
      }
    >
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {/* API Keys List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {apiKeys.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Key className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">No API keys found</p>
            <p className="text-sm text-gray-400 mt-2">Create your first API key to get started</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Key
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Used
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apiKeys.map((apiKey) => (
                <tr key={apiKey.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Key className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{apiKey.name}</div>
                        <div className="text-xs text-gray-500">
                          Created {formatDate(apiKey.createdAt)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        {showFullKey === apiKey.id ? (apiKey.key || apiKey.keyPreview) : apiKey.keyPreview}
                      </code>
                      {apiKey.key && (
                        <button
                          onClick={() => setShowFullKey(showFullKey === apiKey.id ? null : apiKey.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {showFullKey === apiKey.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                      <button
                        onClick={() => copyToClipboard(apiKey.key || apiKey.keyPreview, apiKey.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {copiedKeyId === apiKey.id ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {apiKey.permissions.map((permission) => (
                        <span
                          key={permission}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {permission}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {apiKey.expiresAt ? (
                      <div className={`text-sm ${isExpired(apiKey.expiresAt) ? 'text-red-600' : 'text-gray-900'}`}>
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {formatDate(apiKey.expiresAt)}
                        {isExpired(apiKey.expiresAt) && (
                          <span className="ml-2 text-xs font-medium text-red-600">(Expired)</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Never</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(apiKey.lastUsedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setKeyToDelete(apiKey);
                        setShowDeleteModal(true);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {createdKey ? 'API Key Created' : 'Create New API Key'}
            </h3>
            
            {createdKey ? (
              <div>
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800 mb-2">
                    Make sure to copy your API key now. You won't be able to see it again!
                  </p>
                  <div className="flex items-center space-x-2 mt-3">
                    <code className="flex-1 text-xs font-mono bg-white px-3 py-2 rounded border border-yellow-300">
                      {createdKey.key}
                    </code>
                    <button
                      onClick={() => copyToClipboard(createdKey.key, createdKey.id)}
                      className="text-yellow-700 hover:text-yellow-900"
                    >
                      {copiedKeyId === createdKey.id ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-full px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey}>
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Key Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={newKeyForm.name}
                    onChange={(e) => setNewKeyForm({ ...newKeyForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Production API Key"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Permissions
                  </label>
                  <div className="space-y-2">
                    {availablePermissions.map((permission) => (
                      <label key={permission.id} className="flex items-start">
                        <input
                          type="checkbox"
                          checked={newKeyForm.permissions.includes(permission.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewKeyForm({
                                ...newKeyForm,
                                permissions: [...newKeyForm.permissions, permission.id]
                              });
                            } else {
                              setNewKeyForm({
                                ...newKeyForm,
                                permissions: newKeyForm.permissions.filter(p => p !== permission.id)
                              });
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                        />
                        <div className="ml-2">
                          <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                          <div className="text-xs text-gray-500">{permission.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label htmlFor="expiresIn" className="block text-sm font-medium text-gray-700 mb-1">
                    Expires In
                  </label>
                  <select
                    id="expiresIn"
                    value={newKeyForm.expiresIn}
                    onChange={(e) => setNewKeyForm({ ...newKeyForm, expiresIn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="7">7 days</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">1 year</option>
                    <option value="never">Never</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-base font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newKeyForm.name}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && keyToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-2">Delete API Key</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete the API key "{keyToDelete.name}"? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-4 mt-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setKeyToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 text-base font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteKey}
                  className="flex-1 px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  );
}