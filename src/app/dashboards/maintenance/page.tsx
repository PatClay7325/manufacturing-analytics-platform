'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import ManufacturingDashboard from '@/components/dashboard/ManufacturingDashboard';

export default function MaintenanceDashboardPage() {
  return (
    <DashboardLayout>
      <ManufacturingDashboard
        title="Maintenance Dashboard"
        defaultTimeRange="last30d"
        defaultEquipment="all"
        defaultTabIndex={4} />/ Start on Maintenance tab
      />
    </DashboardLayout>
  );
}