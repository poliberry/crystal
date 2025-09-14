"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { appFileRouter } from "@/app/api/uploadthing/core";
import { ModalProvider } from "@/components/providers/modal-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { PusherProvider } from "@/components/providers/pusher-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { NotificationProvider } from "@/components/providers/notification-provider";
import { DNDProvider } from "@/components/providers/dnd-provider";
import { PathTracker } from "@/components/providers/path-tracker-provider";
import { ProgressProvider } from "@/components/progress-bar";

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers = ({ children }: ProvidersProps) => {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        storageKey="discord-theme"
      >
        <PusherProvider>
          <DNDProvider>
            <NotificationProvider>
              <NextSSRPlugin
                routerConfig={extractRouterConfig(appFileRouter)}
              />
              <QueryProvider>
                <PathTracker />
                <ProgressProvider />
                {children}
              </QueryProvider>
            </NotificationProvider>
          </DNDProvider>
        </PusherProvider>
      </ThemeProvider>
    </ClerkProvider>
  );
};
