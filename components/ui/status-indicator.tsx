"use client";

import { cn } from "@/lib/utils";
import { UserStatus } from "@prisma/client";
import { getStatusColor } from "@/lib/presence-utils";

interface StatusIndicatorProps {
  status: UserStatus;
  className?: string;
  size?: "sm" | "md" | "lg";
  showBorder?: boolean;
}

export const StatusIndicator = ({ 
  status, 
  className, 
  size = "md",
  showBorder = true 
}: StatusIndicatorProps) => {
  const sizeClasses = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3", 
    lg: "w-4 h-4"
  };

  const borderClasses = showBorder 
    ? "border-2 border-white dark:border-gray-800" 
    : "";

  return (
    <div
      className={cn(
        "rounded-full flex-shrink-0",
        sizeClasses[size],
        getStatusColor(status),
        borderClasses,
        className
      )}
      title={status.toLowerCase()}
    />
  );
};
