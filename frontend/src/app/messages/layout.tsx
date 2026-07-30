import type React from 'react';
import NavMenu from '../components/ui/NavMenu';

export default function MessagesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen justify-center pb-14 md:pb-0">
      <div className="flex w-full max-w-[1600px]">
        {/* Left navigation - Hidden on mobile */}
        <div className="hidden md:block w-[275px] flex-shrink-0 mr-2">
          <NavMenu />
        </div>

        {/* Full-bleed messages content - no right rail, no width cap */}
        <main className="min-h-screen w-full min-w-0 border-x border-border">
          {children}
        </main>
      </div>
    </div>
  );
}
