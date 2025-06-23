import React from 'react';

import './globals.css';
import type { Metadata, Viewport } from 'next';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import AnalyticsLayout from '@/components/layout/AnalyticsLayout';
import ClientLayout from './ClientLayout';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
// import MockServerProvider from '@/components/providers/MockServerProvider';

// Use system fonts instead of Google Fonts for better reliability
const fontStack = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const metadata: Metadata = {
  title: 'Manufacturing AnalyticsPlatform',
  description: 'Advanced manufacturing intelligence and analyticsPlatform powered by analytics dashboard architecture',
  keywords: 'manufacturing, analytics, intelligence, dashboard, metrics, industrial, IoT',
  authors: [{ name: 'Manufacturing Analytics Team' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Manufacturing AnalyticsPlatform',
    description: 'Advanced manufacturing intelligence and analyticsPlatform',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Manufacturing AnalyticsPlatform',
    description: 'Advanced manufacturing intelligence and analyticsPlatform',
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
      <body className="h-full antialiased" style={{ fontFamily: fontStack }}>
        <ErrorBoundary level="critical" context="root-layout">
          <ClientLayout>
            <PreferencesProvider>
              <AnalyticsLayout>
                {children}
              </AnalyticsLayout>
            </PreferencesProvider>
          </ClientLayout>
        </ErrorBoundary>
        {/* Initialize mock server in development mode */}
        {/* <MockServerProvider /> */}
      </body>
    </html>
  );
}