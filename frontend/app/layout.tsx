import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '../providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: { default: 'LeadPilot AI', template: '%s | LeadPilot AI' },
  description: 'AI-powered CRM for modern sales teams',
  keywords: ['CRM', 'AI', 'sales', 'leads', 'pipeline'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-background text-text antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
