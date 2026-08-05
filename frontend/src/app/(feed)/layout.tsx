import type React from 'react';
import { Suspense } from 'react';
import NavMenu from '../components/ui/NavMenu';
import SideBar from '../components/ui/SideBar';
import MobilePostButton from '../components/mobile/MobilePostButton';
import FloatingActions from '../components/ui/FloatingActions';
import BackendWakingBanner from '../components/ui/BackendWakingBanner';

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
        <main className="w-full md:w-[600px] min-h-screen border-x border-border relative">
          {/* Pages like /profile intentionally skip a top header/border, so
              without this the column's top edge reads as an unstyled cutoff.
              This pins a fade to the viewport top as a "you're at the start,
              can't scroll further up" cue instead of adding a border back. */}
          <div className="sticky top-0 z-10 -mb-6 h-6 bg-gradient-to-b from-bg to-transparent pointer-events-none" />

          <BackendWakingBanner />

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
