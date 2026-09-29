import type { Metadata } from 'next';
import './globals.css';
import { ClientProviders } from './providers';

export const metadata: Metadata = {
  title: 'SyncDrive - Cloud Storage Platform',
  description:
    'Enterprise-grade cloud storage SaaS management platform with 25 GB free trial, user dashboard, file manager, and encrypted personal cloud storage.',
  openGraph: {
    title: 'SyncDrive - Cloud Storage Platform',
    description:
      'Enterprise-grade cloud storage SaaS management platform with 25 GB free trial, user dashboard, file manager, and encrypted personal cloud storage.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SyncDrive - Cloud Storage Platform',
    description:
      'Enterprise-grade cloud storage SaaS management platform with 25 GB free trial, user dashboard, file manager, and encrypted personal cloud storage.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased min-h-screen">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
