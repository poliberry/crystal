"use client";

import { Plus, PlusCircle } from "lucide-react";

import { ActionTooltip } from "../action-tooltip";
import { useModal } from "@/hooks/use-modal-store";

export const NavigationAction = () => {
  const { onOpen } = useModal();

  return (
    <div>
      <ActionTooltip side="bottom" align="center" label="Add a community">
        <button
          onClick={() => onOpen("createServer")}
          className="group flex items-center"
        >
          <div className="flex mx-4 h-[35px] w-[35px] rounded-[12px] transition-all overflow-hidden items-center justify-center bg-transparent group-hover:bg-purple-500 group-hover:shadow-md">
            <PlusCircle
              className="group-hover:text-white transition text-white"
              size={20}
            />
          </div>
        </button>
      </ActionTooltip>
    </div>
  );
};