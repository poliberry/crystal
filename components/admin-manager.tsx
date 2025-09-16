"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSimplePermission } from "@/hooks/use-simple-permissions";
import { PermissionType } from "@prisma/client";

interface AdminManagerProps {
  currentMemberId: string;
}

export const AdminManager = ({ currentMemberId }: AdminManagerProps) => {
  const [targetMemberId, setTargetMemberId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const currentAdminStatus = useSimplePermission({
    memberId: currentMemberId,
    permission: PermissionType.ADMINISTRATOR
  });

  const targetAdminStatus = useSimplePermission({
    memberId: targetMemberId,
    permission: PermissionType.ADMINISTRATOR
  });

  const handleGrantAdmin = async () => {
    if (!targetMemberId) return;
    
    setLoading(true);
    setMessage("");
    
    try {
      const response = await fetch('/api/simple-permissions/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: targetMemberId,
          action: 'grant'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`✅ ${data.message}`);
      } else {
        const error = await response.text();
        setMessage(`❌ Error: ${error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAdmin = async () => {
    if (!targetMemberId) return;
    
    setLoading(true);
    setMessage("");
    
    try {
      const response = await fetch('/api/simple-permissions/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: targetMemberId,
          action: 'revoke'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`✅ ${data.message}`);
      } else {
        const error = await response.text();
        setMessage(`❌ Error: ${error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Admin Permission Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            Your Admin Status: {currentAdminStatus.loading ? "Loading..." : 
              currentAdminStatus.granted ? "✅ Admin" : "❌ Not Admin"}
          </p>
          <p className="text-xs text-muted-foreground">
            Reason: {currentAdminStatus.reason}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Target Member ID:</label>
          <Input
            value={targetMemberId}
            onChange={(e) => setTargetMemberId(e.target.value)}
            placeholder="Enter member ID to manage"
          />
        </div>

        {targetMemberId && (
          <div>
            <p className="text-sm text-muted-foreground">
              Target Admin Status: {targetAdminStatus.loading ? "Loading..." : 
                targetAdminStatus.granted ? "✅ Admin" : "❌ Not Admin"}
            </p>
            <p className="text-xs text-muted-foreground">
              Reason: {targetAdminStatus.reason}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleGrantAdmin}
            disabled={loading || !targetMemberId}
            variant="default"
            size="sm"
          >
            Grant Admin
          </Button>
          <Button
            onClick={handleRevokeAdmin}
            disabled={loading || !targetMemberId}
            variant="destructive"
            size="sm"
          >
            Revoke Admin
          </Button>
        </div>

        {message && (
          <div className="p-2 text-sm rounded bg-muted">
            {message}
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>Current Member ID: {currentMemberId}</p>
          <p>Use this to test permissions by granting yourself admin rights.</p>
        </div>
      </CardContent>
    </Card>
  );
};
