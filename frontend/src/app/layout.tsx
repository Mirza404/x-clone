import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import NavMenu from "./components/NavMenu";
import { getServerSession } from "next-auth";
import SessionProvider from "./components/SessionProvider";
import QueryProvider from "@/query-client-provider";
import PostList from "./posts/page";
import Post from "./components/Post";

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
  description: "Project 2",
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
            <main className="mx-auto max-w-5xl text-2xl flex gap-2 text-white">
              <NavMenu />
              {children}
            </main>
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
