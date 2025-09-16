"use client";

import { useServerPermissions } from "@/hooks/use-simple-permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PermissionsDebugProps {
  memberId: string;
  title?: string;
}

export const PermissionsDebug = ({ memberId, title = "Permissions Debug" }: PermissionsDebugProps) => {
  const permissions = useServerPermissions(memberId);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div><strong>Member ID:</strong> {memberId}</div>
          <div><strong>Loading:</strong> {permissions.loading ? "Yes" : "No"}</div>
          <div><strong>Is Admin:</strong> {permissions.isAdmin ? "✅ Yes" : "❌ No"}</div>
          <div><strong>Can Send Messages:</strong> {permissions.canSendMessages ? "✅ Yes" : "❌ No"}</div>
          <div><strong>Can Manage Channels:</strong> {permissions.canManageChannels ? "✅ Yes" : "❌ No"}</div>
          <div><strong>Can Manage Roles:</strong> {permissions.canManageRoles ? "✅ Yes" : "❌ No"}</div>
          <div><strong>Can Manage Server:</strong> {permissions.canManageServer ? "✅ Yes" : "❌ No"}</div>
          
          <div className="mt-4">
            <strong>Raw Administrator Permission:</strong>
            <pre className="mt-1 p-2 bg-muted rounded text-xs">
              {JSON.stringify(permissions.hasPermission("ADMINISTRATOR" as any), null, 2)}
            </pre>
          </div>
          
          <div className="mt-4">
            <strong>Raw Send Messages Permission:</strong>
            <pre className="mt-1 p-2 bg-muted rounded text-xs">
              {JSON.stringify(permissions.hasPermission("SEND_MESSAGES" as any), null, 2)}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
