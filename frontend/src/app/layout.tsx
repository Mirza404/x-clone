import type React from 'react';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import NavMenu from './components/ui/NavMenu';
import SideBar from './components/ui/SideBar';
import SessionProvider from './utils/SessionProvider';
import QueryProvider from '@/query-client-provider';
import CustomToaster from './components/ui/CustomToaster';
import MobilePostButton from './components/mobile/MobilePostButton';
import MobileHeader from './components/mobile/MobileHeader';
import MobileNavBar from './components/mobile/MobileNavBar';
import MobileTabs from './components/mobile/MobileTabs';

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
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
      >
        <QueryProvider>
          <SessionProvider>
            {/* Mobile Header - Only visible on mobile */}
            <MobileHeader />

            <div className="flex justify-center min-h-screen pb-14 md:pb-0">
              {/* Main content layout */}
              <div className="flex w-full max-w-[1265px] mx-auto">
                {/* Left navigation - Hidden on mobile */}
                <div className="hidden md:block w-[275px] flex-shrink-0">
                  <NavMenu />
                </div>

                {/* Center content */}
                <main className="w-full md:w-[598px] min-h-screen">
                  {/* Mobile Tabs - Only visible on mobile */}
                  <MobileTabs />

                  {children}
                  {/* Page Content */}

                  {/* Mobile Post Button - Only visible on mobile */}
                  <MobilePostButton />
                </main>

                {/* Right sidebar - Hidden on mobile */}
                <div className="hidden md:block w-[350px] ml-2">
                  <SideBar />
                </div>
              </div>
            </div>

            {/* Mobile Navigation Bar - Only visible on mobile */}
            <MobileNavBar />
          </SessionProvider>
        </QueryProvider>
        <CustomToaster />
      </body>
    </html>
  );
}
