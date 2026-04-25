import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { AssumptionsProvider } from '@/context/AssumptionsContext';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'S8 Deal Finder',
  description: 'Section 8 real estate investment analysis tool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <AssumptionsProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#0f172a',
                color: '#e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
              },
            }}
          />
        </AssumptionsProvider>
      </body>
    </html>
  );
}
