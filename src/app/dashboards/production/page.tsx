'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import ManufacturingDashboard from '@/components/dashboard/ManufacturingDashboard';

export default function ProductionDashboardPage() {
  return (
    <DashboardLayout>
      <ManufacturingDashboard
        title="Production Lines Dashboard"
        defaultTimeRange="last24h"
        defaultEquipment="all"
        defaultTabIndex={2} />/ Start on Production tab
      />
    </DashboardLayout>
  );
}