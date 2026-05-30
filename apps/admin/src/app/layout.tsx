import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AdminShell } from './admin-shell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kutty Story Admin',
  description: 'Admin panel for Kutty Story personalized storybook platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
