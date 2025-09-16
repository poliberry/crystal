"use client";
import { PageContextProvider } from "@/components/providers/page-context-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  UserPlus,
  UserMinus,
  Ban,
  MessageCircle,
  Check,
  X,
} from "lucide-react";
import { useModal } from "@/hooks/use-modal-store";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardTitle } from "@/components/ui/card";
import { Kode_Mono } from "next/font/google";

const kodeMono = Kode_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-kode-mono",
});

interface Friend {
  id: string;
  name: string;
  globalName?: string;
  imageUrl: string;
  status: string;
  friendshipId?: string;
  since?: string;
  requestedAt?: string;
  blockId?: string;
  reason?: string;
}

interface FriendsData {
  friends?: Friend[];
  pendingRequests?: Friend[];
  sentRequests?: Friend[];
  blockedUsers?: Friend[];
}

export default function ConversationsHome() {
  const [activeTab, setActiveTab] = useState("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [friendsData, setFriendsData] = useState<FriendsData>({});
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchFriendsData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchFriendsData = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/friends");
      setFriendsData(response.data);
    } catch (error) {
      console.error("Error fetching friends data:", error);
      toast.error("Failed to load friends data");
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      setSearchLoading(true);
      const response = await axios.get(
        `/api/friends/search?q=${encodeURIComponent(searchQuery)}`
      );
      setSearchResults(response.data.users || []);
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFriendRequest = async (targetUserId: string) => {
    try {
      await axios.post("/api/friends", { targetUserId });
      toast.success("Friend request sent!");
      fetchFriendsData();
      setSearchQuery("");
      setSearchResults([]);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to send friend request"
      );
    }
  };

  const respondToFriendRequest = async (
    friendshipId: string,
    action: "accept" | "decline" | "cancel"
  ) => {
    try {
      await axios.patch(`/api/friends/${friendshipId}`, { action });
      toast.success(`Friend request ${action}ed!`);
      fetchFriendsData();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || `Failed to ${action} friend request`
      );
    }
  };

  const removeFriend = async (friendshipId: string) => {
    try {
      await axios.delete(`/api/friends/${friendshipId}`);
      toast.success("Friend removed");
      fetchFriendsData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to remove friend");
    }
  };

  const blockUser = async (targetUserId: string, reason?: string) => {
    try {
      await axios.post("/api/friends/block", { targetUserId, reason });
      toast.success("User blocked");
      fetchFriendsData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to block user");
    }
  };

  const unblockUser = async (blockId: string) => {
    try {
      await axios.delete(`/api/friends/block/${blockId}`);
      toast.success("User unblocked");
      fetchFriendsData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to unblock user");
    }
  };

  const startConversation = async (targetUserId: string) => {
    try {
      const response = await axios.post("/api/conversations", {
        participantIds: [targetUserId],
        type: "DIRECT_MESSAGE",
      });
      router.push(`/conversations/${response.data.id}`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to start conversation"
      );
    }
  };

  const statusColors = {
    ONLINE: "bg-green-500",
    IDLE: "bg-yellow-500",
    DND: "bg-red-500",
    INVISIBLE: "bg-gray-400",
    OFFLINE: "bg-gray-400",
  };

  const renderUserCard = (user: Friend, actions: React.ReactNode) => (
    <div
      key={user.id}
      className="flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-background rounded-lg m-4"
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <UserAvatar
            src={user.imageUrl}
            alt={user.globalName || user.name}
            className="h-10 w-10"
          />
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
              statusColors[user.status as keyof typeof statusColors] ||
              statusColors.OFFLINE
            }`}
          />
        </div>
        <div>
          <p className="font-medium">{user.globalName || user.name}</p>
          {user.since && (
            <p className="text-sm text-muted-foreground">
              Friends since {new Date(user.since).toLocaleDateString()}
            </p>
          )}
          {user.requestedAt && (
            <p className="text-sm text-muted-foreground">
              Requested {new Date(user.requestedAt).toLocaleDateString()}
            </p>
          )}
          {user.reason && (
            <p className="text-sm text-muted-foreground">
              Reason: {user.reason}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">{actions}</div>
    </div>
  );

  return (
    <PageContextProvider
      conversationData={{
        id: "home",
        name: "Friends",
        type: "conversation",
      }}
    >
      <div className="flex flex-col h-full">
        <Card className="rounded-none border-none p-[15.5px] bg-gradient-to-br from-white dark:from-black to-blue dark:to-[#000226]">
          <CardTitle className="headerFont uppercase">Friends</CardTitle>
        </Card>
        <div className="pb-6 border-t">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 rounded-none border-b dark:bg-black h-fit p-0">
              <TabsTrigger value="friends" className="py-3 rounded-none">
                Friends
                {friendsData.friends && (
                  <Badge variant="secondary" className="ml-2">
                    {friendsData.friends.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending" className="py-3 rounded-none">
                Pending
                {friendsData.pendingRequests && (
                  <Badge variant="secondary" className="ml-2">
                    {friendsData.pendingRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent" className="py-3 rounded-none">
                Sent
                {friendsData.sentRequests && (
                  <Badge variant="secondary" className="ml-2">
                    {friendsData.sentRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="blocked" className="py-3 rounded-none">
                Blocked
              </TabsTrigger>
              <TabsTrigger value="add" className="py-3 rounded-none">
                Add Friends
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <TabsContent value="friends" className="space-y-4">
                <ScrollArea className="h-96">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : friendsData.friends?.length ? (
                    <div className="space-y-2">
                      {friendsData.friends.map((friend) =>
                        renderUserCard(
                          friend,
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startConversation(friend.id)}
                              title="Send Message"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                friend.friendshipId &&
                                removeFriend(friend.friendshipId)
                              }
                              title="Remove Friend"
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => blockUser(friend.id)}
                              title="Block User"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No friends yet. Start by adding some friends!
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="pending" className="space-y-4">
                <ScrollArea className="h-96">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : friendsData.pendingRequests?.length ? (
                    <div className="space-y-2">
                      {friendsData.pendingRequests.map((request) =>
                        renderUserCard(
                          request,
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                request.friendshipId &&
                                respondToFriendRequest(
                                  request.friendshipId,
                                  "accept"
                                )
                              }
                              title="Accept"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                request.friendshipId &&
                                respondToFriendRequest(
                                  request.friendshipId,
                                  "decline"
                                )
                              }
                              title="Decline"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No pending friend requests
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="sent" className="space-y-4">
                <ScrollArea className="h-96">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : friendsData.sentRequests?.length ? (
                    <div className="space-y-2">
                      {friendsData.sentRequests.map((request) =>
                        renderUserCard(
                          request,
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              request.friendshipId &&
                              respondToFriendRequest(
                                request.friendshipId,
                                "cancel"
                              )
                            }
                            title="Cancel Request"
                          >
                            Cancel
                          </Button>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No sent friend requests
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="blocked" className="space-y-4">
                <ScrollArea className="h-96">
                  {loading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : friendsData.blockedUsers?.length ? (
                    <div className="space-y-2">
                      {friendsData.blockedUsers.map((blockedUser) =>
                        renderUserCard(
                          blockedUser,
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              blockedUser.blockId &&
                              unblockUser(blockedUser.blockId)
                            }
                          >
                            Unblock
                          </Button>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No blocked users
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="add" className="space-y-4">
                <div className="relative px-12">
                  <Search className="absolute left-16 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-11"
                  />
                </div>

                <ScrollArea className="h-80">
                  {searchLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : searchResults.length ? (
                    <div className="space-y-2">
                      {searchResults.map((user) =>
                        renderUserCard(
                          user,
                          <Button
                            size="sm"
                            onClick={() => sendFriendRequest(user.id)}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Add Friend
                          </Button>
                        )
                      )}
                    </div>
                  ) : searchQuery.trim().length >= 2 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No users found
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Enter at least 2 characters to search for users
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </PageContextProvider>
  );
}
