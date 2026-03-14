import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Situator WebGUI',
  description: 'Real-time security access dashboard for Situator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} flex h-screen overflow-hidden antialiased selection:bg-blue-500/30`}>
        <Sidebar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-transparent relative">
           {children}
        </main>
      </body>
    </html>
  );
}
