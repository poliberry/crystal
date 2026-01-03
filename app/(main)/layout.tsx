"use client";

import type { PropsWithChildren } from "react";

import { NavigationSidebar } from "@/components/navigation/navigation-sidebar";
import { CustomCssInjector } from "@/components/custom-css-injector";
import { LiveKitProvider } from "@/components/providers/media-room-provider";
import { ModalProvider } from "@/components/providers/modal-provider";
import { Cascadia_Mono, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { TopNavigationBar } from "@/components/navigation/top-navigation-bar";

const cascadiaMono = Cascadia_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
});

const MainLayout = ({ children }: PropsWithChildren) => {
  return (
    <LiveKitProvider>
      <ModalProvider />
      <div
        className={cn(
          "h-screen w-full flex flex-col bg-background",
          cascadiaMono.className
        )}
      >
        {/* Navigation */}
        <div className="w-full">
          <TopNavigationBar />
        </div>
        {/* Main content */}
        <main className="flex-1 w-full overflow-hidden">{children}</main>
      </div>
    </LiveKitProvider>
  );
};

export default MainLayout;
