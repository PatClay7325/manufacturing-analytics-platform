'use client';

import React from 'react';
import ManufacturingDashboard from '@/components/dashboard/ManufacturingDashboard';

export default function OEEAnalyticsPage() {
  return (
    <ManufacturingDashboard
      title="OEE Analytics Dashboard"
      defaultTimeRange="last24h"
      defaultEquipment="all"
      defaultTabIndex={1} // Start on OEE Analytics tab
    />
  );
}