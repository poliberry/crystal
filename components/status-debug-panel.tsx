"use client";

import { useStatus } from "@/components/providers/status-provider";
import { UserStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";

export const StatusDebugPanel = () => {
  const { status, customStatus, prevStatus, loading, setStatus, setBoth } = useStatus();

  if (loading) {
    return <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded">Loading status...</div>;
  }

  const testOfflineRestore = async () => {
    console.log("[STATUS_DEBUG] Setting status to OFFLINE to test restoration");
    await setStatus(UserStatus.OFFLINE);
  };

  const testRestorePrevious = async () => {
    if (prevStatus) {
      console.log("[STATUS_DEBUG] Manually restoring previous status:", prevStatus);
      await setStatus(prevStatus);
    } else {
      console.log("[STATUS_DEBUG] No previous status to restore");
    }
  };

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded space-y-4">
      <h3 className="font-bold text-lg">Status Debug Panel</h3>
      
      <div className="space-y-2 text-sm">
        <div><strong>Current Status:</strong> {status}</div>
        <div><strong>Custom Status:</strong> {customStatus || "None"}</div>
        <div><strong>Previous Status:</strong> {prevStatus || "None"}</div>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">Quick Actions:</h4>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setStatus(UserStatus.ONLINE)} size="sm">
            Set Online
          </Button>
          <Button onClick={() => setStatus(UserStatus.IDLE)} size="sm">
            Set Idle
          </Button>
          <Button onClick={() => setStatus(UserStatus.DND)} size="sm">
            Set DND
          </Button>
          <Button onClick={testOfflineRestore} size="sm" variant="outline">
            Test Offline → Restore
          </Button>
          <Button onClick={testRestorePrevious} size="sm" variant="outline">
            Restore Previous
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">localStorage Debug:</h4>
        <Button 
          onClick={() => {
            const userId = localStorage.getItem("clerk-user") || "unknown";
            console.log("localStorage status data:", {
              status: localStorage.getItem(`discord-status-${userId}`),
              customStatus: localStorage.getItem(`discord-custom-status-${userId}`),
              prevStatus: localStorage.getItem(`discord-prev-status-${userId}`),
            });
          }} 
          size="sm" 
          variant="ghost"
        >
          Log localStorage Data
        </Button>
      </div>
    </div>
  );
};
