import { useState, useEffect, useMemo } from "react";
import { PermissionType, PermissionScope } from "@prisma/client";
import { SimplePermissionResult } from "@/lib/simple-permissions";

interface UseSimplePermissionOptions {
  memberId: string;
  permission: PermissionType;
  scope?: PermissionScope;
  targetId?: string;
}

interface UseSimplePermissionsOptions {
  memberId: string;
  permissions: {
    permission: PermissionType;
    scope?: PermissionScope;
    targetId?: string;
  }[];
}

interface SimplePermissionHookResult extends SimplePermissionResult {
  loading: boolean;
}

interface SimplePermissionsHookResult {
  loading: boolean;
  hasPermission: (permission: PermissionType, scope?: PermissionScope, targetId?: string) => SimplePermissionResult;
  isAdmin: boolean;
  canSendMessages: boolean;
  canManageChannels: boolean;
  canManageRoles: boolean;
  canManageServer: boolean;
}

/**
 * Hook for checking a single permission
 */
export function useSimplePermission({ 
  memberId, 
  permission, 
  scope = PermissionScope.SERVER, 
  targetId 
}: UseSimplePermissionOptions): SimplePermissionHookResult {
  const [result, setResult] = useState<SimplePermissionResult>({ 
    granted: false, 
    reason: 'DENIED' 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!memberId) {
      setResult({ granted: false, reason: 'DENIED' });
      setLoading(false);
      return;
    }

    const checkPermission = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/simple-permissions/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            memberId,
            permission,
            scope,
            targetId
          })
        });

        if (response.ok) {
          const data = await response.json();
          setResult(data);
        } else {
          console.error('Permission check failed:', response.status);
          setResult({ granted: false, reason: 'DENIED' });
        }
      } catch (error) {
        console.error('Permission check error:', error);
        setResult({ granted: false, reason: 'DENIED' });
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [memberId, permission, scope, targetId]);

  return { ...result, loading };
}

/**
 * Hook for checking multiple permissions efficiently
 */
export function useSimplePermissions({ 
  memberId, 
  permissions 
}: UseSimplePermissionsOptions): SimplePermissionsHookResult {
  const [results, setResults] = useState<Record<string, SimplePermissionResult>>({});
  const [loading, setLoading] = useState(true);

  // Memoize the permissions array to prevent infinite re-renders
  const memoizedPermissions = useMemo(() => 
    JSON.stringify(permissions.map(p => ({
      permission: p.permission,
      scope: p.scope || PermissionScope.SERVER,
      targetId: p.targetId
    }))),
    [permissions]
  );

  useEffect(() => {
    if (!memberId || !permissions.length) {
      setResults({});
      setLoading(false);
      return;
    }

    const checkPermissions = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/simple-permissions/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            memberId,
            permissions: JSON.parse(memoizedPermissions)
          })
        });

        if (response.ok) {
          const data = await response.json();
          const resultsMap: Record<string, SimplePermissionResult> = {};
          
          if (Array.isArray(data)) {
            data.forEach((result: any) => {
              const key = `${result.permission}:${result.scope || 'SERVER'}:${result.targetId || 'none'}`;
              resultsMap[key] = {
                granted: result.granted,
                reason: result.reason,
                source: result.source
              };
            });
          }
          
          setResults(resultsMap);
        } else {
          console.error('Permissions check failed:', response.status);
          setResults({});
        }
      } catch (error) {
        console.error('Permissions check error:', error);
        setResults({});
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, [memberId, memoizedPermissions]);

  const hasPermission = (permission: PermissionType, scope?: PermissionScope, targetId?: string): SimplePermissionResult => {
    const key = `${permission}:${scope || 'SERVER'}:${targetId || 'none'}`;
    return results[key] || { granted: false, reason: 'DENIED' };
  };

  // Helper computed properties
  const adminResult = hasPermission(PermissionType.ADMINISTRATOR);
  const isAdmin = adminResult.granted || 
                  adminResult.reason === 'ADMIN' || 
                  adminResult.reason === 'LEGACY_ADMIN';
  
  const canSendMessages = hasPermission(PermissionType.SEND_MESSAGES).granted || isAdmin;
  const canManageChannels = hasPermission(PermissionType.MANAGE_CHANNELS).granted || isAdmin;
  const canManageRoles = hasPermission(PermissionType.MANAGE_ROLES).granted || isAdmin;
  const canManageServer = hasPermission(PermissionType.MANAGE_SERVER).granted || isAdmin;

  // Debug logging for permissions hook
  if (memberId) {
    console.log('[USE_SIMPLE_PERMISSIONS] Debug:', {
      memberId,
      loading,
      adminResult,
      isAdmin,
      canSendMessages,
      allResults: results
    });
  }

  return { 
    loading, 
    hasPermission, 
    isAdmin,
    canSendMessages,
    canManageChannels,
    canManageRoles,
    canManageServer
  };
}

/**
 * Hook for checking common server permissions
 */
export function useServerPermissions(memberId: string) {
  return useSimplePermissions({
    memberId,
    permissions: [
      { permission: PermissionType.ADMINISTRATOR },
      { permission: PermissionType.MANAGE_SERVER },
      { permission: PermissionType.MANAGE_CHANNELS },
      { permission: PermissionType.MANAGE_ROLES },
      { permission: PermissionType.MANAGE_MESSAGES },
      { permission: PermissionType.KICK_MEMBERS },
      { permission: PermissionType.BAN_MEMBERS },
      { permission: PermissionType.CREATE_INSTANT_INVITE },
      { permission: PermissionType.SEND_MESSAGES },
      { permission: PermissionType.ATTACH_FILES },
      { permission: PermissionType.USE_EXTERNAL_EMOJIS }
    ]
  });
}

/**
 * Hook for checking channel-specific permissions
 */
export function useChannelPermissions(memberId: string, channelId: string) {
  return useSimplePermissions({
    memberId,
    permissions: [
      { permission: PermissionType.ADMINISTRATOR, scope: PermissionScope.SERVER }, // Add this for isAdmin check
      { permission: PermissionType.VIEW_CHANNELS, scope: PermissionScope.CHANNEL, targetId: channelId },
      { permission: PermissionType.SEND_MESSAGES, scope: PermissionScope.CHANNEL, targetId: channelId },
      { permission: PermissionType.ATTACH_FILES, scope: PermissionScope.CHANNEL, targetId: channelId },
      { permission: PermissionType.USE_EXTERNAL_EMOJIS, scope: PermissionScope.CHANNEL, targetId: channelId },
      { permission: PermissionType.MANAGE_MESSAGES, scope: PermissionScope.CHANNEL, targetId: channelId },
      { permission: PermissionType.READ_MESSAGE_HISTORY, scope: PermissionScope.CHANNEL, targetId: channelId }
    ]
  });
}
