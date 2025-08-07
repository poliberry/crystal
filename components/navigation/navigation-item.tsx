"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";

import { ActionTooltip } from "@/components/action-tooltip";
import { cn } from "@/lib/utils";

type NavigationItemProps = {
  id: string;
  imageUrl: string;
  name: string;
};

export const NavigationItem = ({ id, imageUrl, name }: NavigationItemProps) => {
  const params = useParams();
  const router = useRouter();

  const onClick = () => {
    router.push(`/servers/${id}`);
  };

  return (
    <ActionTooltip side="bottom" align="center" label={name}>
      <button onClick={onClick} className="group flex flex-col items-center">
        <div
          className={cn(
            "relative group mx-2 flex h-[35px] w-[35px] rounded-[16px] transition-all border-2 border-primary-foreground group-hover:border-primary group-hover:-translate-y-0.5 overflow-hidden",
            params?.serverId === id &&
              "border-primary bg-primary/10 dark:bg-primary/20",
          )}
        >
          <Image src={imageUrl} alt={name} fill />
        </div>
      </button>
    </ActionTooltip>
  );
};