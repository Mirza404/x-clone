import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import NavMenu from "./components/ui/NavMenu";
import SideBar from "./components/ui/SideBar";
import SessionProvider from "./utils/SessionProvider";
import QueryProvider from "@/query-client-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "X Clone",
  description: "Clone of the popular X website",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const queryClient = new QueryClient();
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <SessionProvider>
            <div className="flex justify-center mx-80 max-w-5xl text-2xl text-white">
              {/* Main content layout with proper spacing */}
              <main className="flex justify-center w-full">
                {/* Left spacer to account for fixed NavMenu */}
                <div className="w-[275px] flex-shrink-0">
                  <NavMenu />
                </div>

                {/* Center content - the children */}
                <div className="flex-1 min-w-0 max-w-[598px]mr-32">
                  {children}
                </div>

                {/* Right sidebar */}
                <div className="fixed top-0 right-[22rem] w-[350px] flex-shrink-0">
                  <SideBar />
                </div>
              </main>
            </div>
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
