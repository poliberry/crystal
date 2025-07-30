"use client";

import { CodeIcon, Plus } from "lucide-react";

import { ActionTooltip } from "../action-tooltip";
import { useModal } from "@/hooks/use-modal-store";

export const CustomCssAction = () => {
  const { onOpen } = useModal();

  return (
    <div className="border-b border-muted pb-2">
      <ActionTooltip side="right" align="center" label="Add a community">
        <button
          onClick={() => onOpen("cssEditor")}
          className="group flex items-center"
        >
          <div className="flex mx-3 h-[48px] w-[48px] rounded-[24px] transition-all overflow-hidden items-center justify-center bg-background dark:bg-neutral-700 group-hover:bg-purple-500 group-hover:-translate-y-0.5 group-hover:shadow-md">
            <CodeIcon
              className="group-hover:text-white transition text-purple-500"
              size={25}
            />
          </div>
        </button>
      </ActionTooltip>
    </div>
  );
};