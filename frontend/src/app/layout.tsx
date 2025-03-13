import type React from 'react';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import NavMenu from './components/ui/NavMenu';
import SideBar from './components/ui/SideBar';
import SessionProvider from './utils/SessionProvider';
import QueryProvider from '@/query-client-provider';
import { Toaster } from 'react-hot-toast';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'X Clone',
  description: 'Clone of the popular X website',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black`}
      >
        <QueryProvider>
          <SessionProvider>
            <div className="flex justify-center min-h-screen">
              {/* Main content layout */}
              <div className="flex w-full max-w-[1265px] mx-auto">
                {/* Left navigation */}
                <div className="w-[275px] flex-shrink-0">
                  <NavMenu />
                </div>

                {/* Center content */}
                <main className="w-[598px] min-h-screen">{children}</main>

                {/* Right sidebar */}
                <div className="w-[350px] ml-2">
                  <SideBar />
                </div>
              </div>
            </div>
          </SessionProvider>
        </QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
