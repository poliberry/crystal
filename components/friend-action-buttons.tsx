"use client";

import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Ban, MessageCircle, UserCheck, Clock, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";

interface FriendActionButtonsProps {
  targetUserId: string;
  targetUserName: string;
  relationshipStatus: "none" | "pending_sent" | "pending_received" | "friends" | "blocked_by_them" | "blocked_by_you";
  friendshipId?: string;
  blockId?: string;
  allowDM?: boolean;
  onRelationshipChange?: () => void;
}

export const FriendActionButtons = ({
  targetUserId,
  targetUserName,
  relationshipStatus,
  friendshipId,
  blockId,
  allowDM = true,
  onRelationshipChange
}: FriendActionButtonsProps) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const sendFriendRequest = async () => {
    try {
      setLoading(true);
      await axios.post("/api/friends", { targetUserId });
      toast.success("Friend request sent!");
      onRelationshipChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send friend request");
    } finally {
      setLoading(false);
    }
  };

  const respondToFriendRequest = async (action: "accept" | "decline" | "cancel") => {
    if (!friendshipId) return;
    
    try {
      setLoading(true);
      await axios.patch(`/api/friends/${friendshipId}`, { action });
      toast.success(`Friend request ${action}ed!`);
      onRelationshipChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action} friend request`);
    } finally {
      setLoading(false);
    }
  };

  const removeFriend = async () => {
    if (!friendshipId) return;
    
    try {
      setLoading(true);
      await axios.delete(`/api/friends/${friendshipId}`);
      toast.success("Friend removed");
      onRelationshipChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to remove friend");
    } finally {
      setLoading(false);
    }
  };

  const blockUser = async () => {
    try {
      setLoading(true);
      await axios.post("/api/friends/block", { targetUserId });
      toast.success("User blocked");
      onRelationshipChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to block user");
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async () => {
    if (!blockId) return;
    
    try {
      setLoading(true);
      await axios.delete(`/api/friends/block/${blockId}`);
      toast.success("User unblocked");
      onRelationshipChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to unblock user");
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async () => {
    try {
      setLoading(true);
      const response = await axios.post("/api/conversations", {
        participantIds: [targetUserId],
        type: "DIRECT_MESSAGE"
      });
      router.push(`/conversations/${response.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to start conversation");
    } finally {
      setLoading(false);
    }
  };

  const renderButtons = () => {
    switch (relationshipStatus) {
      case "none":
        return (
          <>
            <Button
              size="sm"
              onClick={sendFriendRequest}
              disabled={loading}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Friend
            </Button>
            {allowDM && (
              <Button
                size="sm"
                variant="outline"
                onClick={startConversation}
                disabled={loading}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={blockUser}
              disabled={loading}
            >
              <Ban className="h-4 w-4" />
            </Button>
          </>
        );

      case "pending_sent":
        return (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => respondToFriendRequest("cancel")}
              disabled={loading}
            >
              <Clock className="h-4 w-4 mr-2" />
              Cancel Request
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={blockUser}
              disabled={loading}
            >
              <Ban className="h-4 w-4" />
            </Button>
          </>
        );

      case "pending_received":
        return (
          <>
            <Button
              size="sm"
              onClick={() => respondToFriendRequest("accept")}
              disabled={loading}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => respondToFriendRequest("decline")}
              disabled={loading}
            >
              Decline
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={blockUser}
              disabled={loading}
            >
              <Ban className="h-4 w-4" />
            </Button>
          </>
        );

      case "friends":
        return (
          <>
            <Button
              size="sm"
              onClick={startConversation}
              disabled={loading}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Message
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={removeFriend}
              disabled={loading}
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Remove Friend
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={blockUser}
              disabled={loading}
            >
              <Ban className="h-4 w-4" />
            </Button>
          </>
        );

      case "blocked_by_you":
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={unblockUser}
            disabled={loading}
          >
            <Shield className="h-4 w-4 mr-2" />
            Unblock
          </Button>
        );

      case "blocked_by_them":
        return (
          <div className="text-sm text-muted-foreground">
            This user has blocked you
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex items-center space-x-2">
      {renderButtons()}
    </div>
  );
};
