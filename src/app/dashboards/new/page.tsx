'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GrafanaDashboardEditor from '@/components/dashboard/GrafanaDashboardEditor';
import { dashboardEngine } from '@/core/dashboard/DashboardEngine';
import type { Dashboard } from '@/types/dashboard';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorState } from '@/components/common/ErrorState';

export default function NewDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create a new dashboard instance
    try {
      const newDashboard = dashboardEngine.createDashboard('New dashboard');
      setDashboard(newDashboard);
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to create new dashboard:', err);
      setError('Failed to create new dashboard');
      setIsLoading(false);
    }
  }, []);

  const handleSave = async (updatedDashboard: Dashboard, options?: { saveAs?: boolean }) => {
    if (!updatedDashboard) return;
    
    setIsSaving(true);
    try {
      // If saveAs is true, create a copy with a new UID
      if (options?.saveAs) {
        const duplicated = await dashboardEngine.duplicateDashboard(
          updatedDashboard.uid,
          updatedDashboard.title
        );
        router.push(`/d/${duplicated.uid}`);
      } else {
        const saved = await dashboardEngine.saveDashboard(updatedDashboard);
        router.push(`/d/${saved.uid}`);
      }
    } catch (error) {
      console.error('Failed to save dashboard:', error);
      setError('Failed to save dashboard. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    if (window.confirm('Discard unsaved changes?')) {
      router.push('/dashboards');
    }
  };

  const handleBack = () => {
    router.push('/dashboards');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorState 
          message={error || 'Failed to create dashboard'}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <GrafanaDashboardEditor
      dashboard={dashboard}
      onSave={handleSave}
      onDiscard={handleDiscard}
      onBack={handleBack}
      isSaving={isSaving}
      isNew={true}
    />
  );
}