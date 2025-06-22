'use client';

import PageLayout from '@/components/layout/PageLayout';
import LibraryPanelManager from '@/components/dashboard/LibraryPanelManager';

export default function LibraryPanelsPage() {
  return (
    <PageLayout
      title="Library panels"
      description="Reusable panels that can be shared across multiple dashboards"
    >
      <LibraryPanelManager />
    </PageLayout>
  );
}