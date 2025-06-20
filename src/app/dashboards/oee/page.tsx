'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import ManufacturingDashboard from '@/components/dashboard/ManufacturingDashboard';

export default function OEEAnalyticsPage() {
  return (
    <DashboardLayout>
      <ManufacturingDashboard
        title="OEE Analytics Dashboard"
        defaultTimeRange="last24h"
        defaultEquipment="all"
        defaultTabIndex={1} // Start on OEE Analytics tab
      />
    </DashboardLayout>
  );
}