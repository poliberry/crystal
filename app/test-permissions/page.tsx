"use client";

import { useEffect, useState } from "react";
import { AdminManager } from "@/components/admin-manager";
import { useServerPermissions } from "@/hooks/use-simple-permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { currentProfile } from "@/lib/current-profile";

export default function PermissionsTestPage() {
  const [memberId, setMemberId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const permissions = useServerPermissions(memberId);

  useEffect(() => {
    // Get current member ID
    const getCurrentMember = async () => {
      try {
        // You'll need to replace this with your actual method to get current member
        const response = await fetch('/api/current-member');
        if (response.ok) {
          const data = await response.json();
          setMemberId(data.memberId);
        }
      } catch (error) {
        console.error('Error getting current member:', error);
      } finally {
        setLoading(false);
      }
    };

    getCurrentMember();
  }, []);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!memberId) {
    return <div className="p-8">Please enter a member ID to test permissions</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Permissions Test Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AdminManager currentMemberId={memberId} />
        
        <Card>
          <CardHeader>
            <CardTitle>Current Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            {permissions.loading ? (
              <p>Loading permissions...</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span>Admin Status:</span>
                  <Badge variant={permissions.isAdmin ? "default" : "destructive"}>
                    {permissions.isAdmin ? "Admin" : "Not Admin"}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <span>Can Send Messages:</span>
                  <Badge variant={permissions.canSendMessages ? "default" : "destructive"}>
                    {permissions.canSendMessages ? "Yes" : "No"}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <span>Can Manage Channels:</span>
                  <Badge variant={permissions.canManageChannels ? "default" : "destructive"}>
                    {permissions.canManageChannels ? "Yes" : "No"}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <span>Can Manage Roles:</span>
                  <Badge variant={permissions.canManageRoles ? "default" : "destructive"}>
                    {permissions.canManageRoles ? "Yes" : "No"}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <span>Can Manage Server:</span>
                  <Badge variant={permissions.canManageServer ? "default" : "destructive"}>
                    {permissions.canManageServer ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="text-sm text-muted-foreground">
        <p>Member ID: {memberId}</p>
        <p>Use the Admin Manager to grant yourself admin permissions and test the system.</p>
        <p>The chat input should now properly respect the new permissions system.</p>
      </div>
    </div>
  );
}
