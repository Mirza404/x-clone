import type React from 'react';
import { Suspense } from 'react';
import NavMenu from '../components/ui/NavMenu';
import SideBar from '../components/ui/SideBar';
import MobilePostButton from '../components/mobile/MobilePostButton';
import FloatingActions from '../components/ui/FloatingActions';

export default function FeedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex justify-center min-h-screen pb-14 md:pb-0">
      <div className="flex w-full max-w-[1265px] mx-auto">
        {/* Left navigation - Hidden on mobile */}
        <div className="hidden md:block w-[275px] flex-shrink-0 mr-2">
          <NavMenu />
        </div>

        {/* Center content */}
        <main className="w-full md:w-[600px] min-h-screen border-x border-border">
          {children}

          {/* Mobile Post Button - Only visible on mobile */}
          <MobilePostButton />
        </main>

        {/* Right sidebar - Hidden on mobile */}
        <div className="hidden md:block w-[350px] ml-2">
          {/* SideBar reads the URL's `q` param via useSearchParams, which
              opts out of static rendering unless boundary-wrapped. */}
          <Suspense fallback={null}>
            <SideBar />
          </Suspense>
        </div>
      </div>

      {/* Floating action buttons - desktop only */}
      <FloatingActions />
    </div>
  );
}
