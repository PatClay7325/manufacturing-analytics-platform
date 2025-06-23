'use client';

import React from 'react';
import ManufacturingDashboard from '@/components/dashboard/ManufacturingDashboard';

export default function QualityDashboardPage() {
  return (
    <ManufacturingDashboard
      title="Quality Control Dashboard"
      defaultTimeRange="last7d"
      defaultEquipment="all"
      defaultTabIndex={3} // Start on Quality tab
    />
  );
}