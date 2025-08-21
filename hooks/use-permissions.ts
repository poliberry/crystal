import { useState, useEffect, useMemo } from "react";
import { PermissionType, PermissionScope, PermissionCheckResult } from "@/types/permissions";

interface UsePermissionOptions {
  memberId: string;
  permission: PermissionType;
  scope?: PermissionScope;
  targetId?: string;
}

interface UsePermissionsOptions {
  memberId: string;
  permissions: {
    permission: PermissionType;
    scope?: PermissionScope;
    targetId?: string;
  }[];
}

export function usePermission({ memberId, permission, scope, targetId }: UsePermissionOptions) {
  const [result, setResult] = useState<PermissionCheckResult>({ granted: false, reason: 'DENIED' });
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
        const response = await fetch('/api/permissions/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            memberId,
            permission,
            scope: scope || PermissionScope.SERVER,
            targetId
          })
        });

        if (response.ok) {
          const data = await response.json();
          setResult(data);
        } else {
          setResult({ granted: false, reason: 'DENIED' });
        }
      } catch (error) {
        console.error('Permission check failed:', error);
        setResult({ granted: false, reason: 'DENIED' });
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [memberId, permission, scope, targetId]);

  return { ...result, loading };
}

export function usePermissions({ memberId, permissions }: UsePermissionsOptions) {
  const [results, setResults] = useState<Record<string, PermissionCheckResult>>({});
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
        const response = await fetch('/api/permissions/check', {
          method: 'PUT',
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
          const resultsMap: Record<string, PermissionCheckResult> = {};
          
          data.forEach((result: any) => {
            const key = `${result.permission}:${result.scope || 'SERVER'}:${result.targetId || 'none'}`;
            resultsMap[key] = {
              granted: result.granted,
              reason: result.reason,
              source: result.source
            };
          });
          
          setResults(resultsMap);
        } else {
          setResults({});
        }
      } catch (error) {
        console.error('Permissions check failed:', error);
        setResults({});
      } finally {
        setLoading(false);
      }
    };

    checkPermissions();
  }, [memberId, memoizedPermissions]);

  const getPermission = (permission: PermissionType, scope?: PermissionScope, targetId?: string): PermissionCheckResult => {
    const key = `${permission}:${scope || 'SERVER'}:${targetId || 'none'}`;
    return results[key] || { granted: false, reason: 'DENIED' };
  };

  return { results, loading, getPermission };
}

// Convenience hook for common permission patterns
export function useServerPermissions(memberId: string) {
  return usePermissions({
    memberId,
    permissions: [
      { permission: PermissionType.ADMINISTRATOR },
      { permission: PermissionType.MANAGE_SERVER },
      { permission: PermissionType.MANAGE_CHANNELS },
      { permission: PermissionType.MANAGE_ROLES },
      { permission: PermissionType.MANAGE_MESSAGES },
      { permission: PermissionType.CREATE_INSTANT_INVITE },
      { permission: PermissionType.SEND_MESSAGES },
      { permission: PermissionType.ATTACH_FILES },
      { permission: PermissionType.USE_EXTERNAL_EMOJIS }
    ]
  });
}
