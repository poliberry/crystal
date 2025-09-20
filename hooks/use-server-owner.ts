import { useState, useEffect } from "react";

interface ServerOwnerCheck {
  isOwner: boolean;
  isAdmin: boolean;
  loading: boolean;
}

export function useServerOwner(memberId: string, serverId?: string): ServerOwnerCheck {
  const [result, setResult] = useState<ServerOwnerCheck>({
    isOwner: false,
    isAdmin: false,
    loading: true
  });

  useEffect(() => {
    if (!memberId) {
      setResult({ isOwner: false, isAdmin: false, loading: false });
      return;
    }

    const checkOwnership = async () => {
      try {
        const response = await fetch('/api/permissions/server-owner', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ memberId, serverId })
        });

        if (response.ok) {
          const data = await response.json();
          setResult({ ...data, loading: false });
        } else {
          setResult({ isOwner: false, isAdmin: false, loading: false });
        }
      } catch (error) {
        console.error('Server owner check failed:', error);
        setResult({ isOwner: false, isAdmin: false, loading: false });
      }
    };

    checkOwnership();
  }, [memberId, serverId]);

  return result;
}
