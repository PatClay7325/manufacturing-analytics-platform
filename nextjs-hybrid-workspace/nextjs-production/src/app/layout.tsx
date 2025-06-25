import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Next.js Production - Ported from Bolt.diy',
  description: 'Production-ready Next.js application with components ported from bolt.diy prototypes',
  keywords: ['Next.js', 'React', 'TypeScript', 'Bolt.diy', 'AI', 'Development'],
  authors: [{ name: 'Hybrid Development Team' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div className="min-h-screen bg-background font-sans antialiased">
          <main className="relative flex min-h-screen flex-col">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}