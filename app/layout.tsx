import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Open_Sans, Overpass } from "next/font/google";

import { Providers } from "@/components/providers/providers";
import { siteConfig } from "@/config";
import { cn } from "@/lib/utils";
import "./globals.css";
import NotificationListener from "@/components/notification-listener";
import { Toaster } from "@/components/ui/sonner";
import { ModalProvider } from "@/components/providers/modal-provider";
import { LiveKitProvider } from "@/components/providers/media-room-provider";

// Force dynamic rendering for all pages
export const dynamic = "force-dynamic";
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
      <body className="w-full h-screen bg-background">
        <Providers>
          <Toaster position="top-center" />
          {children}
          <NotificationListener />
        </Providers>
      </body>
    </html>
  );
}
