import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import NavMenu from "./components/NavMenu";
import SideBar from "./components/SideBar";
import SessionProvider from "./components/SessionProvider";
import QueryProvider from "@/query-client-provider";

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
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <SessionProvider>
            <main className="flex justify-center mx-auto max-w-5xl text-2xl gap-2 text-white">
              <div className="flex justify-center items-start">
                <NavMenu />
                {children}
                <SideBar />
              </div>
            </main>
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
