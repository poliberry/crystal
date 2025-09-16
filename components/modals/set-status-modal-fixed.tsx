"use client";

import { useState } from "react";
import { useModal } from "@/hooks/use-modal-store";
import { useStatus } from "@/components/providers/status-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useUser } from "@clerk/nextjs";
import { Check, X } from "lucide-react";
import { UserStatus } from "@prisma/client";

export const SetStatusModal = () => {
  const { isOpen, onClose, type } = useModal();
  const { setBoth, setCustomStatus } = useStatus();
  const { user } = useUser();
  const [selectedPresence, setSelectedPresence] = useState<UserStatus>(UserStatus.ONLINE);
  const [customStatusInput, setCustomStatusInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isModalOpen = isOpen && type === "setStatus";

  // Map presence to badge color and text
  const presenceMap = {
    [UserStatus.ONLINE]: { color: "bg-green-500", text: "Online" },
    [UserStatus.IDLE]: { color: "bg-yellow-500", text: "Idle" },
    [UserStatus.DND]: { color: "bg-red-500", text: "Do Not Disturb" },
  };

  const handleSetStatus = async () => {
    setIsLoading(true);
    try {
      // Use the status provider to update both status and custom status
      await setBoth(selectedPresence, customStatusInput.trim() || null);

      // Trigger members list update via websocket
      await fetch("/api/socket/poll-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      onClose();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearStatus = async () => {
    setIsLoading(true);
    try {
      // Use the status provider to clear custom status
      await setCustomStatus(null);
      
      // Trigger members list update via websocket
      await fetch("/api/socket/poll-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      setCustomStatusInput("");
      onClose();
    } catch (error) {
      console.error("Failed to clear status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCustomStatusInput("");
    setSelectedPresence(UserStatus.ONLINE);
    onClose();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-white dark:bg-black text-black dark:text-white p-0 overflow-hidden rounded-none">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className={`text-2xl text-left font-bold hubot-sans`}>
            Set your status
          </DialogTitle>
          <DialogDescription className="hubot-sans text-left text-zinc-500 dark:text-zinc-400">
            Let others know what you're up to
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* Presence Status Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Presence Status
            </Label>
            <div className="space-y-2">
              {Object.entries(presenceMap).map(([status, config]) => (
                <button
                  key={status}
                  onClick={() => setSelectedPresence(status as UserStatus)}
                  className={`w-full flex items-center gap-3 p-3 rounded-md transition-colors ${
                    selectedPresence === status
                      ? "bg-blue-100 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Badge
                    className={`${config.color} text-white p-[6px] text-xs border-2 border-white dark:border-black`}
                  />
                  <span className="text-sm font-medium">{config.text}</span>
                  {selectedPresence === status && (
                    <Check className="w-4 h-4 ml-auto text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Status Message */}
          <div className="space-y-3">
            <Label htmlFor="custom-status" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Custom Status Message (Optional)
            </Label>
            <Input
              id="custom-status"
              value={customStatusInput}
              onChange={(e) => setCustomStatusInput(e.target.value)}
              placeholder="What's happening?"
              className="bg-zinc-300/50 dark:bg-zinc-700/75 border-0 focus-visible:ring-0 text-black dark:text-white focus-visible:ring-offset-0"
              maxLength={100}
              disabled={isLoading}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {customStatusInput.length}/100 characters
            </p>
          </div>
        </div>

        <DialogFooter className="bg-gray-100 dark:bg-[#2B2D31] px-2 py-2 rounded-sm m-2">
          <div className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              onClick={handleClearStatus}
              disabled={isLoading}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Clear Status
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSetStatus}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 rounded-sm"
              >
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
