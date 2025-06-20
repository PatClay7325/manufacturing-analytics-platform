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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to create new dashboard</p>
          <button 
            onClick={() => router.push('/dashboards')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Dashboards
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardEditor
        dashboard={newDashboard}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSaving}
        isNew={true}
      />
    </div>
  );
}