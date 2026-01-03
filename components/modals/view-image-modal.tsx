"use client";

import { Download } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useModal } from "@/hooks/use-modal-store";
import { UserAvatar } from "@/components/user-avatar";
import { UserDialog } from "@/components/user-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export const ViewImageModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const isModalOpen = isOpen && type === "viewImage";

  const { imageUrl, imageName, sender, timestamp } = data;

  // Reset loading state when modal opens or image URL changes
  useEffect(() => {
    if (isModalOpen && imageUrl) {
      setImageLoading(true);
      setImageError(false);
    }
  }, [isModalOpen, imageUrl]);

  const handleDownload = async () => {
    if (!imageUrl) return;

    try {
      // Try to fetch the image as a blob to handle CORS
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = imageName || "image";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      // Fallback to opening in new tab if download fails (e.g., CORS issues)
      window.open(imageUrl, "_blank");
    }
  };

  if (!imageUrl) return null;

  return (
    <Drawer open={isModalOpen} onOpenChange={onClose} direction="bottom">
      <DrawerContent className="max-h-[95vh] w-fit mx-auto h-auto p-0 overflow-hidden bg-black/95 border-t border-white/10 [&>div:first-of-type]:hidden">
        <DrawerHeader className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            {sender && (
              <div className="flex flex-row items-center gap-2">
                <Avatar className="h-10 w-10 cursor-pointer rounded-none after:rounded-none">
                  <AvatarImage src={sender.imageUrl} className="rounded-none" />
                  <AvatarFallback className="rounded-none">
                    {sender.globalName || sender.name || "User"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <DrawerTitle className="text-base font-semibold text-white truncate">
                    {sender.globalName || sender.name}
                  </DrawerTitle>
                  {timestamp && (
                    <DrawerDescription className="text-xs text-white/70">
                      {timestamp}
                    </DrawerDescription>
                  )}
                </div>
              </div>
            )}

            <Button
              onClick={handleDownload}
              variant="outline"
              size="icon"
              className="text-white hover:bg-white/10"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div
          className="relative w-full flex items-center justify-center bg-black min-h-[400px] flex-1 overflow-auto"
          style={{ maxHeight: "calc(95vh - 140px)" }}
        >
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
          {!imageError ? (
            <div className="relative w-full h-full flex items-center justify-center p-4">
              <Image
                src={imageUrl}
                alt={imageName || "Image"}
                width={400}
                height={400}
                className="max-w-full max-h-full object-contain"
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
                unoptimized
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-white">
              <p className="text-lg font-medium mb-2">Failed to load image</p>
              <p className="text-sm text-white/70">
                The image could not be displayed
              </p>
            </div>
          )}
        </div>

        {imageName && (
          <div className="px-6 py-3 border-t border-white/10">
            <p className="text-sm text-white/70 truncate">{imageName}</p>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};
