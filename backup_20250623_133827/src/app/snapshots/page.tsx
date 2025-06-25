import React from 'react';

import { Metadata } from 'next';
import { SnapshotManager } from '@/components/dashboard';

export const metadata: Metadata = {
  title: 'Dashboard Snapshots | Manufacturing AnalyticsPlatform',
  description: 'Manage and view dashboard snapshots'
};

export default function SnapshotsPage() {
  return (
    <div className="p-6">
      <SnapshotManager />
    </div>
  );
}