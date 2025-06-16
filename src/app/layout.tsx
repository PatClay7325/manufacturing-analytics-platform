import './globals.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Manufacturing Intelligence Platform',
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
        <div className="flex min-h-screen flex-col">
          <header className="bg-primary-700 text-white">
            <div className="container mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">
                  Manufacturing Intelligence Platform
                </h1>
                <nav>
                  <ul className="flex space-x-4">
                    <li>
                      <a href="/" className="hover:underline">
                        Home
                      </a>
                    </li>
                    <li>
                      <a href="/dashboard" className="hover:underline">
                        Dashboard
                      </a>
                    </li>
                    <li>
                      <a href="/equipment" className="hover:underline">
                        Equipment
                      </a>
                    </li>
                    <li>
                      <a href="/alerts" className="hover:underline">
                        Alerts
                      </a>
                    </li>
                    <li>
                      <a href="/manufacturing-chat" className="hover:underline">
                        AI Chat
                      </a>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </header>
          <main className="flex-1 bg-gray-50">{children}</main>
          <footer className="bg-gray-800 py-4 text-center text-sm text-white">
            <p>© 2025 Manufacturing Intelligence Platform</p>
          </footer>
        </div>
      </body>
    </html>
  );
}