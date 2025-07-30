import { SignOutButton, SignedIn, currentUser } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

import { NavigationAction } from "./navigation-action";
import { NavigationItem } from "./navigation-item";
import { UserCard } from "./user-card";
import { Separator } from "../ui/separator";

export const NavigationSidebar = async () => {
  const profile = await currentProfile();

  if (!profile) redirect("/");

  const servers = await db.server.findMany({
    where: {
      members: {
        some: {
          profileId: profile.id,
        },
      },
    },
  });

  const CARD_HEIGHT = 499;

  return (
    <div className="flex flex-row items-center h-12 text-primary w-full border-b bg-white dark:bg-black py-3">
      <Link href="/" className="group flex items-center">
        <div className="flex mx-1 rounded-[16px] transition-all overflow-hidden items-center justify-center group-hover:bg-zinc-500 group-hover:-translate-y-0.5 group-hover:shadow-md">
          <Image
            src="/logo.svg"
            alt="Discord Clone"
            width={40}
            height={40}
            className="rounded-full transition"
          />
        </div>
      </Link>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <div className={`w-full flex items-center h-12 m-0 overflow-x-auto`}>
        {servers.map((server) => (
          <div key={server.id}>
            <NavigationItem
              id={server.id}
              name={server.name}
              imageUrl={server.imageUrl}
            />
          </div>
        ))}
        <NavigationAction />
      </div>

      {/*<div className="pb-3 mt-auto flex items-center flex-col gap-y-4">

        <div className="absolute bottom-0 left-0 right-0 w-[344px] px-2 pb-2 bg-white dark:bg-black">
          <SignedIn>
            <UserCard CARD_HEIGHT={CARD_HEIGHT} profile={profile} />

            <SignOutButton>
              <button
                className="md:hidden hover:bg-background/30 p-2.5 rounded-md"
                title="Log out"
              >
                <LogOut className="h-5 w-5 cursor-pointer" />
              </button>
            </SignOutButton>
          </SignedIn>
        </div>
      </div>*/}
    </div>
  );
};
