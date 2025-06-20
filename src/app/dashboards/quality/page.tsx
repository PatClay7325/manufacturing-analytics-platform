'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import ManufacturingDashboard from '@/components/dashboard/ManufacturingDashboard';

export default function QualityDashboardPage() {
  return (
    <DashboardLayout>
      <ManufacturingDashboard
        title="Quality Control Dashboard"
        defaultTimeRange="last7d"
        defaultEquipment="all"
        defaultTabIndex={3} />/ Start on Quality tab
      />
    </DashboardLayout>
  );
}