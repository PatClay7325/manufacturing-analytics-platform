import React from 'react';

import { Metadata } from 'next';
import PublicDashboardViewer from '@/components/dashboard/PublicDashboardViewer';


// Force dynamic rendering because: Uses fetch in generateMetadata
export const dynamic = 'force-dynamic';
interface PageProps {
  params: {
    shareKey: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // Fetch share data for metadata
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/public/share/${params.shareKey}`,
      { cache: 'no-store' }
    );
    
    if (response.ok) {
      const data = await response.json();
      return {
        title: data.title || 'Shared Dashboard',
        description: `View ${data.title} dashboard`
      };
    }
  } catch (error) {
    console.error('Failed to fetch metadata:', error);
  }
  
  return {
    title: 'Shared Dashboard',
    description: 'View shared dashboard'
  };
}

export default function PublicDashboardPage({ params }: PageProps) {
  return <PublicDashboardViewer shareKey={params.shareKey} />;
}