'use client';

import React from 'react';

import PageLayout from '@/components/layout/PageLayout';

export default function APITestingPage() {
  return (
    <PageLayout 
      title="API Testing"
      description="Development page for testing API endpoints and backend services"
    >
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            API Testing Suite
          </h2>
          <p className="text-gray-600 mb-6">
            This development page will contain tools for testing API endpoints,
            validating request/response formats, and monitoring backend services.
          </p>
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
            <span className="mr-2">🔧</span>
            <span>Development in progress - Coming Soon</span>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}