"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { appFileRouter } from "@/app/api/uploadthing/core";
import { ModalProvider } from "@/components/providers/modal-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DNDProvider } from "@/components/providers/dnd-provider";
import { PathTracker } from "@/components/providers/path-tracker-provider";
import { ProgressProvider } from "@/components/progress-bar";
import { NovuProvider } from "@novu/nextjs";
import { useAuthStore } from "@/lib/auth-store";

interface ProvidersProps {
  children: React.ReactNode;
}

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || ""
);

export const Providers = ({ children }: ProvidersProps) => {
  const { user } = useAuthStore();
  return (
    <ConvexProvider client={convex}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
      >
        <DNDProvider>
          <NovuProvider applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APP_ID as string} subscriber={{
            subscriberId: user?.userId as string,
            email: user?.email as string,
            firstName: user?.name as string,
          }}>
            <NextSSRPlugin
              routerConfig={extractRouterConfig(appFileRouter)}
            />
            <QueryProvider>
              <PathTracker />
              <ProgressProvider />
              {children}
            </QueryProvider>
          </NovuProvider>
        </DNDProvider>
      </ThemeProvider>
    </ConvexProvider>
  );
};
