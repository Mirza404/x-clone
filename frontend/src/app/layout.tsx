import type React from 'react';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import './globals.css';
import NavMenu from './components/ui/NavMenu';
import SideBar from './components/ui/SideBar';
import SessionProvider from './utils/SessionProvider';
import SocketProvider from './utils/SocketProvider';
import QueryProvider from '@/query-client-provider';
import CustomToaster from './components/ui/CustomToaster';
import MobilePostButton from './components/mobile/MobilePostButton';
import MobileHeader from './components/mobile/MobileHeader';
import MobileNavBar from './components/mobile/MobileNavBar';
import MobileTabs from './components/mobile/MobileTabs';
import ThemeProvider from './utils/ThemeProvider';
import FloatingActions from './components/ui/FloatingActions';
import PostModalProvider from './utils/PostModalProvider';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.classList.toggle('dark',t==='dark');}catch(e){}})();`}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <QueryProvider>
            <SessionProvider>
              <SocketProvider>
                <PostModalProvider>
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
                      <main className="w-full md:w-[600px] min-h-screen border-x border-border">
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

                  {/* Floating action buttons - desktop only */}
                  <FloatingActions />
                </PostModalProvider>
              </SocketProvider>
            </SessionProvider>
          </QueryProvider>
        </ThemeProvider>
        <CustomToaster />
      </body>
    </html>
  );
}
