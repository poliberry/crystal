import { ClerkProvider } from "@clerk/nextjs";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Open_Sans, Overpass } from "next/font/google";
import { extractRouterConfig } from "uploadthing/server";

import { appFileRouter } from "@/app/api/uploadthing/core";
import { ModalProvider } from "@/components/providers/modal-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { SocketProvider } from "@/components/providers/socket-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { siteConfig } from "@/config";
import { cn } from "@/lib/utils";
import "./globals.css";
import { CustomCssInjector } from "@/components/custom-css-injector";

const font = Hanken_Grotesk({ subsets: ["latin"] });


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
    <ClerkProvider>
        <html lang="en" suppressHydrationWarning>
          <body
            className={cn(
              font.className,
              "bg-white overflow-hidden",
              "dark:bg-black"
            )}
          >
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={false}
              storageKey="discord-theme"
            >
              <SocketProvider>
                <NextSSRPlugin
                  routerConfig={extractRouterConfig(appFileRouter)}
                />
                <QueryProvider>{children}</QueryProvider>
              </SocketProvider>
            </ThemeProvider>
          </body>
        </html>
    </ClerkProvider>
  );
}
