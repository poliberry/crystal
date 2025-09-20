import { useState, useEffect } from "react";
import type { UserPermissions } from "@/lib/crystal-permissions";

export function useCrystalPermissions(memberId?: string) {
  const [permissions, setPermissions] = useState<UserPermissions>({
    // Server Management
    canManageServer: false,
    canDeleteServer: false,
    canManageRoles: false,
    canManageMembers: false,
    canViewAuditLog: false,
    
    // Channel Management
    canManageChannels: false,
    canCreateChannels: false,
    canDeleteChannels: false,
    canManageCategories: false,
    
    // Member Actions
    canKickMembers: false,
    canBanMembers: false,
    canInviteMembers: false,
    
    // Basic Permissions
    canSendMessages: false,
    canViewChannels: false,
    canConnectToVoice: false,
    
    // Meta
    isServerOwner: false,
    isAdmin: false,
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[useCrystalPermissions] useEffect triggered with memberId:', memberId);
    
    if (!memberId) {
      console.log('[useCrystalPermissions] No memberId provided, setting loading to false');
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        console.log('[useCrystalPermissions] Starting fetch for memberId:', memberId);
        setLoading(true);
        
        const requestBody = JSON.stringify({ memberId });
        console.log('[useCrystalPermissions] Request body:', requestBody);
        
        const response = await fetch('/api/permissions/crystal', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: requestBody
        });

        console.log('[useCrystalPermissions] Response status:', response.status);
        console.log('[useCrystalPermissions] Response headers:', response.headers);

        if (response.ok) {
          const data = await response.json();
          console.log('[useCrystalPermissions] Received permissions:', data);
          setPermissions(data);
        } else {
          const errorText = await response.text();
          console.error('[useCrystalPermissions] Failed to fetch permissions:', response.status, response.statusText, errorText);
        }
      } catch (error) {
        console.error('[useCrystalPermissions] Network/fetch error:', error);
      } finally {
        console.log('[useCrystalPermissions] Setting loading to false');
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [memberId]);

  return { permissions, loading };
}

// Simple boolean hooks for common checks
export function useIsServerOwner(memberId?: string) {
  const { permissions, loading } = useCrystalPermissions(memberId);
  return { isOwner: permissions.isServerOwner, loading };
}

export function useCanManageServer(memberId?: string) {
  const { permissions, loading } = useCrystalPermissions(memberId);
  return { canManage: permissions.canManageServer, loading };
}

export function useCanManageChannels(memberId?: string) {
  const { permissions, loading } = useCrystalPermissions(memberId);
  return { canManage: permissions.canManageChannels, loading };
}
