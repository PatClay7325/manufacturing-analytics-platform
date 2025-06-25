'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Dashboard } from '@/types/dashboard';
import DashboardViewerV2 from '@/components/dashboard/DashboardViewerV2';
import DashboardEditorV2 from '@/components/dashboard/DashboardEditorV2';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ArrowLeftIcon, PencilIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function ViewDashboardPage({ 
  params 
}: { 
  params: Promise<{ uid: string }> 
}) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dashboardUid, setDashboardUid] = useState<string>('');

  useEffect(() => {
    params.then(p => {
      setDashboardUid(p.uid);
      loadDashboard(p.uid);
    });
  }, [params]);

  const loadDashboard = async (uid: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch dashboard from database
      const response = await fetch(`/api/dashboards/${uid}`);
      if (!response.ok) {
        throw new Error('Failed to load dashboard');
      }
      
      const dashboardData = await response.json();
      setDashboard(dashboardData);
    } catch (err) {
      setError('Failed to load dashboard');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (updatedDashboard: Dashboard) => {
    try {
      setIsSaving(true);
      
      // Save dashboard using API
      const response = await fetch(`/api/dashboards/${dashboardUid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedDashboard),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save dashboard');
      }
      
      const savedDashboard = await response.json();
      setDashboard(savedDashboard);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save dashboard:', err);
      setError('Failed to save dashboard');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 rounded-lg shadow p-8 max-w-md w-full text-center">
          <p className="text-red-400 mb-4">{error || 'Dashboard not found'}</p>
          <Link
            href="/dashboards"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Dashboards
          </Link>
        </div>
      </div>
    );
  }

  // Edit mode
  if (isEditing) {
    return (
      <DashboardEditorV2
        dashboard={dashboard}
        onSave={handleSave}
        onCancel={handleCancelEdit}
        isSaving={isSaving}
        isNew={false}
      />
    );
  }

  // View mode
  return (
    <div className="min-h-screen bg-gray-900">
      <DashboardViewerV2
        dashboard={dashboard}
        onEdit={handleEdit}
      />
    </div>
  );
}
