import React from 'react';

import './globals.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import GrafanaLayout from '@/components/layout/GrafanaLayout';
// import MockServerProvider from '@/components/providers/MockServerProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Manufacturing Analytics Platform',
  description: 'Advanced manufacturing intelligence and analytics platform powered by Grafana-style architecture',
  keywords: 'manufacturing, analytics, intelligence, dashboard, metrics, grafana, industrial, IoT',
  authors: [{ name: 'Manufacturing Analytics Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'Manufacturing Analytics Platform',
    description: 'Advanced manufacturing intelligence and analytics platform',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Manufacturing Analytics Platform',
    description: 'Advanced manufacturing intelligence and analytics platform',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  other: {
    'theme-color': '#1f2937',
    'color-scheme': 'dark light',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="dark light" />
        <meta name="theme-color" content="#1f2937" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Prevent FOUC (Flash of Unstyled Content) by setting theme immediately
              (function() {
                var theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.classList.add(theme);
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter?.className} h-full antialiased`}>
        <ErrorBoundary level="critical" context="root-layout">
          <GrafanaLayout>
            {children}
          </GrafanaLayout>
        </ErrorBoundary>
        {/* Initialize mock server in development mode */}
        {/* <MockServerProvider /> */}
      </body>
    </html>
  );
}