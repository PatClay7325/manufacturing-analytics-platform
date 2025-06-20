'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardEditor from '@/components/dashboard/DashboardEditor';
import { dashboardEngine } from '@/core/dashboard/DashboardEngine';
import { Dashboard } from '@/types/dashboard';

export default function NewDashboardPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (dashboard: Dashboard) => {
    setIsSaving(true);
    try {
      const saved = await dashboardEngine?.saveDashboard(dashboard);
      router?.push(`/dashboards/edit/${saved?.uid}`);
    } catch (error) {
      console.error('Failed to save dashboard:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router?.push('/dashboards');
  };

  // Create a new empty dashboard
  const newDashboard = dashboardEngine?.createDashboard('New Dashboard');

  if (!newDashboard) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-red-600 mb-4">Failed to create new dashboard</p>
          <button 
            onClick={() => router.push('/dashboards')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboards
          </button>
        </div>
      </div>
    );
  }

  return (
    <DashboardEditor
      dashboard={newDashboard}
      onSave={handleSave}
      onCancel={handleCancel}
      isSaving={isSaving}
      isNew={true}
    />
  );
}