"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface PathRestorerProps {
  hasServer: boolean;
  serverId?: string;
}

export const PathRestorer = ({ hasServer, serverId }: PathRestorerProps) => {
  const router = useRouter();

  useEffect(() => {
    // Try to restore the last path from localStorage
    const restoreLastPath = () => {
      if (typeof window !== "undefined") {
        try {
          const lastPath = localStorage.getItem("discord-clone-last-path");
          
          if (lastPath && lastPath !== "/") {
            console.log("Restoring last path:", lastPath);
            router.push(lastPath);
            return;
          }
        } catch (error) {
          console.error("Failed to get path from localStorage:", error);
        }
      }

      // If no last path or restoration failed, use default behavior
      if (hasServer && serverId) {
        router.push(`/servers/${serverId}`);
      } else {
        router.push("/setup");
      }
    };

    // Small delay to ensure client-side hydration is complete
    const timer = setTimeout(restoreLastPath, 100);
    
    return () => clearTimeout(timer);
  }, [router, hasServer, serverId]);

  // Show a loading state while navigation is happening
  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
};
