import { Metadata } from 'next';
import { ManufacturingDashboardStandalone } from '@/components/dashboard/ManufacturingDashboardStandalone';

export const metadata: Metadata = {
  title: 'Manufacturing Dashboard - Standalone',
  description: 'Manufacturing dashboard using internal APIs without external analytics dependencies',
};

export default function StandaloneDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ManufacturingDashboardStandalone
        title="Manufacturing Analytics Dashboard"
        refreshInterval={30}
      />
    </div>
  );
}