import type { PropsWithChildren } from "react";

import { NavigationSidebar } from "@/components/navigation/navigation-sidebar";
import { CustomCssInjector } from "@/components/custom-css-injector";
import { currentProfile } from "@/lib/current-profile";
import { LiveKitProvider } from "@/components/providers/media-room-provider";
import { ModalProvider } from "@/components/providers/modal-provider";

const SIDEBAR_WIDTH = 72; // px

const MainLayout = async ({ children }: PropsWithChildren) => {
  const profile = await currentProfile();

  return (
    <LiveKitProvider>
      <ModalProvider />
      <div className="h-screen w-full flex flex-col bg-white dark:bg-black relative">
        {/* Sidebar */}
        <aside
          className={`absolute top-0 left-0 h-full w-full mb-[${SIDEBAR_WIDTH}px]`}
        >
          <NavigationSidebar />
        </aside>
        {/* Main content with left padding */}
        <main className={`h-full w-full`}>{children}</main>
      </div>
    </LiveKitProvider>
  );
};

export default MainLayout;
