'use client';

import React from 'react';
import ManufacturingDashboard from '@/components/dashboard/ManufacturingDashboard';

export default function ProductionDashboardPage() {
  return (
    <ManufacturingDashboard
      title="Production Lines Dashboard"
      defaultTimeRange="24h"
      defaultEquipment="all"
      defaultTabIndex={2} // Start on Production tab
    />
  );
}