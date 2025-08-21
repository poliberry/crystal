import type { PropsWithChildren } from "react";

import { NavigationSidebar } from "@/components/navigation/navigation-sidebar";
import { CustomCssInjector } from "@/components/custom-css-injector";
import { initialProfile } from "@/lib/initial-profile";
import { LiveKitProvider } from "@/components/providers/media-room-provider";
import { ModalProvider } from "@/components/providers/modal-provider";

const MainLayout = async ({ children }: PropsWithChildren) => {
  const profile = await initialProfile();

  return (
    <LiveKitProvider>
      <ModalProvider />
      <div className="h-screen w-full flex flex-col bg-white dark:bg-black relative">
        {/* Navigation */}
        <div className="w-full">
          <NavigationSidebar />
        </div>
        {/* Main content */}
        <main className="flex-1 w-full overflow-hidden">
          {children}
        </main>
      </div>
    </LiveKitProvider>
  );
};

export default MainLayout;
