import React from 'react';

import './globals.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import AppLayout from '@/components/layout/AppLayout';
// import MockServerProvider from '@/components/providers/MockServerProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Adaptive Factory AI Solutions, Inc.',
  description: 'Advanced manufacturing intelligence and Analytics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter?.className}>
        <ErrorBoundary>
          <AppLayout>
            {children}
          </AppLayout>
        </ErrorBoundary>
        {/* Initialize mock server in development mode */}
        {/* <MockServerProvider /> */}
      </body>
    </html>
  );
}