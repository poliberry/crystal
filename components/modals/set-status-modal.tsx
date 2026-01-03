"use client";

import { useState, useEffect } from "react";
import { useModal } from "@/hooks/use-modal-store";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/auth-store";
import { Check, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export const SetStatusModal = () => {
  const { isOpen, onClose, type } = useModal();
  const { user } = useAuthStore();
  const [selectedPresence, setSelectedPresence] = useState<"ONLINE" | "IDLE" | "DND">("ONLINE");
  const [customStatus, setCustomStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get current profile to pre-populate status
  const currentProfile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );

  // Convex mutations
  const updateStatusMutation = useMutation(api.profiles.updateStatus);
  const updatePresenceStatusMutation = useMutation(api.profiles.updatePresenceStatus);

  // Pre-populate form when modal opens and profile loads
  useEffect(() => {
    if (isOpen && type === "setStatus" && currentProfile) {
      // Set the current status (default to ONLINE if not set)
      if (currentProfile.status && ["ONLINE", "IDLE", "DND"].includes(currentProfile.status)) {
        setSelectedPresence(currentProfile.status as "ONLINE" | "IDLE" | "DND");
      }
      // Pre-populate custom status if it exists
      if (currentProfile.presenceStatus) {
        setCustomStatus(currentProfile.presenceStatus);
      } else {
        setCustomStatus("");
      }
    }
  }, [isOpen, type, currentProfile]);

  const isModalOpen = isOpen && type === "setStatus";

  // Map presence to badge color and text
  const presenceMap = {
    ONLINE: { color: "bg-green-500", text: "Online" },
    IDLE: { color: "bg-yellow-500", text: "Idle" },
    DND: { color: "bg-red-500", text: "Do Not Disturb" },
  };

  const handleSetStatus = async () => {
    if (!user?.userId) return;
    
    setIsLoading(true);
    try {
      // Update presence status (ONLINE/IDLE/DND)
      await updateStatusMutation({
        status: selectedPresence,
        userId: user.userId,
      });

      // Update custom status (supports emojis)
      await updatePresenceStatusMutation({
        presenceStatus: customStatus.trim() || null,
        userId: user.userId,
      });

      onClose();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearStatus = async () => {
    if (!user?.userId) return;
    
    setIsLoading(true);
    try {
      // Clear custom status
      await updatePresenceStatusMutation({
        presenceStatus: null,
        userId: user.userId,
      });
      
      setCustomStatus("");
      onClose();
    } catch (error) {
      console.error("Failed to clear status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCustomStatus("");
    setSelectedPresence("ONLINE");
    onClose();
  };

  return (
    <Drawer open={isModalOpen} onOpenChange={handleClose} direction="bottom">
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className={`text-2xl text-left font-bold hubot-sans`}>
            Set your status
          </DrawerTitle>
          <DrawerDescription className="hubot-sans text-left text-zinc-500 dark:text-zinc-400">
            Let others know what you're up to
          </DrawerDescription>
        </DrawerHeader>

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
                  onClick={() => setSelectedPresence(status as "ONLINE" | "IDLE" | "DND")}
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
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              placeholder="What's happening? 😊"
              className="bg-zinc-300/50 dark:bg-zinc-700/75 border-0 focus-visible:ring-0 text-black dark:text-white focus-visible:ring-offset-0"
              maxLength={100}
              disabled={isLoading}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {customStatus.length}/100 characters • Emojis are supported 😄
            </p>
          </div>
        </div>

        <DrawerFooter>
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
                variant="default"
                onClick={handleSetStatus}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 rounded-sm"
              >
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
