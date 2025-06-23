'use client';

import React from 'react';
import ManufacturingDashboard from '@/components/dashboard/ManufacturingDashboard';

export default function MaintenanceDashboardPage() {
  return (
    <ManufacturingDashboard
      title="Maintenance Dashboard"
      defaultTimeRange="last30d"
      defaultEquipment="all"
      defaultTabIndex={4} // Start on Maintenance tab
    />
  );
}