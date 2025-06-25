'use client';

import React from 'react';
import ManufacturingDashboard from '@/components/dashboard/ManufacturingDashboard';

export default function RootCauseAnalysisPage() {
  return (
    <ManufacturingDashboard
      title="Root Cause Analysis Dashboard"
      defaultTimeRange="last30d"
      defaultEquipment="all"
      defaultTabIndex={5} // Start on Root Cause Analysis tab
    />
  );
}