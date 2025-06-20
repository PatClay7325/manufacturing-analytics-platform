'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import ManufacturingDashboard from '@/components/dashboard/ManufacturingDashboard';

export default function RootCauseAnalysisPage() {
  return (
    <DashboardLayout>
      <ManufacturingDashboard
        title="Root Cause Analysis Dashboard"
        defaultTimeRange="last30d"
        defaultEquipment="all"
        defaultTabIndex={5} />/ Start on Root Cause Analysis tab
      />
    </DashboardLayout>
  );
}