'use client';

import React from 'react';
import Link from 'next/link';

interface PageFallbackProps {
  title?: string;
  message?: string;
  showHomeLink?: boolean;
  showBackButton?: boolean;
}

/**
 * A fallback component to display when a page is not fully implemented or is missing data
 */
const PageFallback: React.FC<PageFallbackProps> = ({
  title = 'Page Under Construction',
  message = 'This page is currently being developed. Please check back later.',
  showHomeLink = true,
  showBackButton = true,
}) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <svg
            className="mx-auto h-16 w-16 text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        
        <h1 className="mb-4 text-2xl font-bold text-gray-900">{title}</h1>
        
        <p className="mb-8 text-gray-600">{message}</p>
        
        <div className="space-y-4">
          {showHomeLink && (
            <Link
              href="/"
              className="inline-block w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Go to Homepage
            </Link>
          )}
          
          {showBackButton && (
            <button
              onClick={() => window.history.back()}
              className="inline-block w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageFallback;