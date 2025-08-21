"use client";

import axios from "axios";
import {
  Check,
  Gavel,
  Loader2,
  MoreVertical,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import qs from "query-string";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "@/components/user-avatar";
import { useModal } from "@/hooks/use-modal-store";
import { ServerWithMembersWithProfiles } from "@/types";
import { PermissionManager } from "@/lib/permissions";
import { PermissionType } from "@/types/permissions";

const getRoleIcon = (member: any) => {
  // Check if member has administrator permission
  if (member.memberRoles?.some((mr: any) => 
    mr.role.permissions?.some((p: any) => p.permission === 'ADMINISTRATOR' && p.grant === 'ALLOW')
  )) {
    return <ShieldAlert className="h-4 w-4 ml-2 text-rose-500" />;
  }
  
  // Check if member has moderation permissions
  if (member.memberRoles?.some((mr: any) => 
    mr.role.permissions?.some((p: any) => 
      ['MANAGE_CHANNELS', 'MANAGE_MESSAGES', 'MANAGE_ROLES'].includes(p.permission) && p.grant === 'ALLOW'
    )
  )) {
    return <ShieldCheck className="h-4 w-4 ml-2 text-indigo-500" />;
  }
  
  // Default guest
  return null;
};

export const MembersModal = () => {
  const { isOpen, onOpen, onClose, type, data } = useModal();
  const [loadingId, setLoadingId] = useState("");
  const [currentMember, setCurrentMember] = useState<any>(null);
  const router = useRouter();

  const isModalOpen = isOpen && type === "members";

  const { server } = data as { server: ServerWithMembersWithProfiles };

  useEffect(() => {
    const getCurrentMember = async () => {
      if (!server) return;
      
      // Get current member from server
      // This would typically come from your authentication/profile context
      // For now, assuming it's passed through server data or available globally
      const member = server.members.find((m: any) => m.profile.id === "current-user-id");
      setCurrentMember(member);
    };

    getCurrentMember();
  }, [server]);

  const onKick = async (memberId: string) => {
    try {
      setLoadingId(memberId);

      const url = qs.stringifyUrl({
        url: `/api/members/${memberId}`,
        query: {
          serverId: server?.id,
        },
      });

      const response = await axios.delete(url);

      router.refresh();
      onOpen("members", { server: response.data });
    } catch (error: unknown) {
      console.error(error);
    } finally {
      setLoadingId("");
    }
  };

  const onRoleChange = async (memberId: string, roleType: string) => {
    try {
      setLoadingId(memberId);

      // This would need to be updated to work with the new permission system
      // Instead of directly changing roles, you'd assign/remove role assignments
      const url = qs.stringifyUrl({
        url: `/api/members/${memberId}/roles`,
        query: {
          serverId: server?.id,
        },
      });

      const response = await axios.patch(url, { roleType });

      router.refresh();
      onOpen("members", { server: response.data });
    } catch (error: unknown) {
      console.error(error);
    } finally {
      setLoadingId("");
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={onClose}>
      <DialogContent className="overflow-hidden">
        <DialogHeader className="pt-8 px-6">
          <DialogTitle className="text-2xl text-center font-bold">
            Manage Members
          </DialogTitle>

          <DialogDescription className="text-center text-zinc-500">
            {server?.members?.length} Members
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="mt-8 max-h-[420px] pr-6">
          {server?.members?.map((member) => (
            <div key={member.id} className="flex items-center gap-x-2 mb-6">
              <UserAvatar
                alt={member.profile.name}
                src={member.profile.imageUrl}
              />
              <div className="flex flex-col gap-y-1">
                <div className="text-xs font-semibold flex items-center gap-x-1">
                  {member.profile.name}
                  {getRoleIcon(member)}
                </div>

                <p className="text-xs text-zinc-500">{member.profile.email}</p>
              </div>

              {server.profileId !== member.profileId &&
                loadingId !== member.id && (
                  <div className="ml-auto">
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <MoreVertical className="h-4 w-4 text-zinc-500" />
                      </DropdownMenuTrigger>

                      <DropdownMenuContent side="left">
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="flex items-center">
                            <ShieldQuestion className="w-4 h-4 mr-2" />
                            <span>Role</span>
                          </DropdownMenuSubTrigger>

                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem
                                onClick={() => onRoleChange(member.id, "GUEST")}
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                Guest Role
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() =>
                                  onRoleChange(member.id, "MODERATOR")
                                }
                              >
                                <ShieldCheck className="h-4 w-4 mr-2" />
                                Moderator Role
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() =>
                                  onRoleChange(member.id, "ADMIN")
                                }
                              >
                                <ShieldAlert className="h-4 w-4 mr-2" />
                                Admin Role
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onKick(member.id)}>
                          <Gavel className="h-4 w-4 mr-2" />
                          Kick
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

              {loadingId === member.id && (
                <Loader2 className="animate-spin text-zinc-500 ml-auto w-4 h-4" />
              )}
            </div>
          ))}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
