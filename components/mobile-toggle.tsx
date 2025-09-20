"use client";

import { Menu } from "lucide-react";

import { NavigationSidebar } from "@/components/navigation/navigation-sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// TODO: Create a client-side version of ServerSidebar for mobile
// For now, we'll disable the server sidebar in mobile view
export const MobileToggle = ({ serverId }: { serverId: string }) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="p-0 flex gap-0" hideCloseIcon>
        <div className="w-[72px]">
          <NavigationSidebar />
        </div>

        <div className="p-4">
          <p className="text-sm text-muted-foreground">Mobile server sidebar coming soon...</p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
