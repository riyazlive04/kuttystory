import type { Metadata } from 'next';
import { Inter, Nunito } from 'next/font/google';
import './globals.css';
import { AdminShell } from './admin-shell';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-nunito',
});

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
      <body className={`${inter.variable} ${nunito.variable} font-body`}>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
