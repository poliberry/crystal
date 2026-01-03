
import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Open_Sans, Overpass } from "next/font/google";

import { Providers } from "@/components/providers/providers";
import { siteConfig } from "@/config";
import { cn } from "@/lib/utils";
import "./globals.css";
import NotificationListener from "@/components/notification-listener";
import { Toaster } from "@/components/ui/sonner";

// Force dynamic rendering for all pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const viewport: Viewport = {
  themeColor: "#5865F2",
};

export let metadata: Metadata = siteConfig;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "hubot-sans bg-white overflow-hidden",
          "dark:bg-black"
        )}
      >
        <Providers>
          <Toaster position="top-center" />
          {children}
          <NotificationListener />
        </Providers>
      </body>
    </html>
  );
}
