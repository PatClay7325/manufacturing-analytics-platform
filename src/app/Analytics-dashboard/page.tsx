'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import ManufacturingDashboard from '@/components/dashboard/ManufacturingDashboard';

export default function ManufacturingDashboardPage() {
  const handleFullscreen = () => {
    // Implement fullscreen logic if needed
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    }
  };

  return (
    <DashboardLayout>
      <ManufacturingDashboard
        title="Manufacturing Intelligence Dashboard"
        defaultTimeRange="last-6h"
        defaultEquipment="all"
        defaultTabIndex={0}
        onFullscreenClick={handleFullscreen}
      />
    </DashboardLayout>
  );
}