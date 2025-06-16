import './globals.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import Navigation from '@/components/layout/Navigation';
import Footer from '@/components/layout/Footer';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import MockServerProvider from '@/components/providers/MockServerProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Adaptive Factory AI Solutions, Inc.',
  description: 'Advanced manufacturing intelligence and analytics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <div className="flex min-h-screen flex-col">
            <header>
              <Navigation />
            </header>
            <main className="flex-1 bg-gray-50">{children}</main>
            <Footer />
          </div>
        </ErrorBoundary>
        {/* Initialize mock server in development mode */}
        <MockServerProvider />
      </body>
    </html>
  );
}