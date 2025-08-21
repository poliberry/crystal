"use client";

import { useEffect, useRef } from "react";
import { UserStatus } from "@prisma/client";

interface UseAutoStatusProps {
  onStatusChange: (status: UserStatus) => void;
  idleTimeout?: number; // milliseconds before marking as idle (default: 5 minutes)
  offlineTimeout?: number; // milliseconds before marking as offline (default: 15 minutes)
}

export function useAutoStatus({ 
  onStatusChange, 
  idleTimeout = 300000, // 5 minutes
  offlineTimeout = 900000 // 15 minutes
}: UseAutoStatusProps) {
  const lastActivityRef = useRef<number>(Date.now());
  const statusRef = useRef<UserStatus>(UserStatus.ONLINE);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track user activity
  const updateActivity = () => {
    lastActivityRef.current = Date.now();
    
    // If user was idle or offline, mark as online
    if (statusRef.current !== UserStatus.ONLINE) {
      statusRef.current = UserStatus.ONLINE;
      onStatusChange(UserStatus.ONLINE);
    }
  };

  // Check status based on last activity
  const checkStatus = () => {
    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;
    
    let newStatus = statusRef.current;

    if (timeSinceActivity >= offlineTimeout) {
      newStatus = UserStatus.OFFLINE;
    } else if (timeSinceActivity >= idleTimeout) {
      newStatus = UserStatus.IDLE;
    } else {
      newStatus = UserStatus.ONLINE;
    }

    if (newStatus !== statusRef.current) {
      statusRef.current = newStatus;
      onStatusChange(newStatus);
    }
  };

  useEffect(() => {
    // Set initial status as online
    onStatusChange(UserStatus.ONLINE);

    // Activity event listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Check status every 30 seconds
    intervalRef.current = setInterval(checkStatus, 30000);

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle beforeunload to set offline status
    const handleBeforeUnload = () => {
      // Try to set status to offline when user leaves
      navigator.sendBeacon('/api/profile/status', JSON.stringify({ 
        status: UserStatus.OFFLINE 
      }));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [onStatusChange, idleTimeout, offlineTimeout]);

  return {
    updateActivity,
    getCurrentStatus: () => statusRef.current
  };
}
