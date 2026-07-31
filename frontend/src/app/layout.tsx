import type React from 'react';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import './globals.css';
import SessionProvider from './utils/SessionProvider';
import SocketProvider from './utils/SocketProvider';
import QueryProvider from '@/query-client-provider';
import CustomToaster from './components/ui/CustomToaster';
import MobileHeader from './components/mobile/MobileHeader';
import MobileNavBar from './components/mobile/MobileNavBar';
import ThemeProvider from './utils/ThemeProvider';
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
        {/* Resolves the theme before paint. The system preference is only an
            initial default: it is persisted immediately on first resolve, so
            the choice is stable for the rest of the session and every session
            after (an OS night-mode switch must not flip the app mid-visit). */}
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){var t;try{t=localStorage.getItem('theme');}catch(e){}if(t!=='dark'&&t!=='light'){try{t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}catch(e){t='light';}try{localStorage.setItem('theme',t);}catch(e){}}document.documentElement.classList.toggle('dark',t==='dark');})();`}
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

                  {children}

                  {/* Mobile Navigation Bar - Only visible on mobile */}
                  <MobileNavBar />
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
