'use client';

import React from 'react';

import PageLayout from '@/components/layout/PageLayout';
import { Construction } from 'lucide-react';


export default function SessionsPage() {
  
  
  return (
    <PageLayout
      title="Sessions"
      description="This page is under construction"
    >
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Construction className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Sessions
        </h2>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
          This page is currently being implemented to match Analytics platform functionality.
        </p>
        
      </div>
    </PageLayout>
  );
}