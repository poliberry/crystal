"use client";

import { useState, useEffect } from "react";
import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { PageContextProvider } from "@/components/providers/page-context-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { UserDialog } from "@/components/user-dialog";
import { Search, UserPlus, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

export default function ConversationsHome() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("online");

  const friends = useQuery(
    api.friends.getFriends,
    user?.userId ? { userId: user.userId } : "skip"
  ) || [];

  const onlineFriends = useQuery(
    api.friends.getOnlineFriends,
    user?.userId ? { userId: user.userId } : "skip"
  ) || [];

  const pendingReceived = useQuery(
    api.friends.getPendingReceived,
    user?.userId ? { userId: user.userId } : "skip"
  ) || [];

  const pendingSent = useQuery(
    api.friends.getPendingSent,
    user?.userId ? { userId: user.userId } : "skip"
  ) || [];

  const sendRequest = useMutation(api.friends.sendRequest);
  const acceptRequest = useMutation(api.friends.acceptRequest);
  const removeFriend = useMutation(api.friends.removeFriend);

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const searchResultsQuery = useQuery(
    api.profiles.search,
    searchQuery.length >= 2 && user?.userId && activeTab === "add"
      ? { query: searchQuery, userId: user.userId }
      : "skip"
  );

  useEffect(() => {
    if (searchResultsQuery) {
      setSearchResults(searchResultsQuery);
      setSearching(false);
    } else if (searchQuery.length >= 2 && activeTab === "add") {
      setSearching(true);
    } else {
      setSearchResults([]);
      setSearching(false);
    }
  }, [searchResultsQuery, searchQuery, activeTab]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    // Search is handled by the query above
  };

  const handleSendRequest = async (friendUserId: string) => {
    if (!user?.userId) return;
    try {
      await sendRequest({ userId: user.userId, friendUserId });
    } catch (error) {
      console.error("Failed to send friend request:", error);
    }
  };

  const handleAcceptRequest = async (friendUserId: string) => {
    if (!user?.userId) return;
    try {
      await acceptRequest({ userId: user.userId, friendUserId });
    } catch (error) {
      console.error("Failed to accept friend request:", error);
    }
  };

  const filteredFriends = friends.filter((friend: any) =>
    friend?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend?.globalName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOnlineFriends = onlineFriends.filter((friend: any) =>
    friend?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend?.globalName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageContextProvider
      conversationData={{
        id: "home",
        name: "Conversations",
        type: "conversation",
      }}
    >
      <div className="flex flex-col h-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="online">Online ({onlineFriends.length})</TabsTrigger>
              <TabsTrigger value="all">All Friends ({friends.length})</TabsTrigger>
              <TabsTrigger value="add">Add Friend</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="online" className="flex-1 flex flex-col m-0">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              {pendingReceived.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                    Pending Requests ({pendingReceived.length})
                  </h3>
                  <div className="space-y-2">
                    {pendingReceived.map((friend: any) => (
                      <Card key={friend._id} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <UserAvatar src={friend.imageUrl} alt={friend.name} className="h-10 w-10" />
                          <div>
                            <p className="font-medium">{friend.globalName || friend.name}</p>
                            <p className="text-sm text-muted-foreground">@{friend.name}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptRequest(friend.userId)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFriend({ userId: user?.userId, friendUserId: friend.userId })}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {filteredOnlineFriends.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No online friends</p>
                  </div>
                ) : (
                  filteredOnlineFriends.map((friend: any) => (
                    <UserDialog key={friend._id} profileId={friend._id}>
                      <Card className="p-3 cursor-pointer hover:bg-muted/50 transition">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <UserAvatar src={friend.imageUrl} alt={friend.name} className="h-10 w-10" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                          </div>
                          <div>
                            <p className="font-medium">{friend.globalName || friend.name}</p>
                            <p className="text-sm text-muted-foreground">@{friend.name}</p>
                          </div>
                        </div>
                      </Card>
                    </UserDialog>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="all" className="flex-1 flex flex-col m-0">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-2">
                {filteredFriends.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No friends yet</p>
                    <p className="text-sm mt-2">Add friends to start chatting!</p>
                  </div>
                ) : (
                  filteredFriends.map((friend: any) => {
                    const isOnline = friend.status !== "OFFLINE" && friend.status !== "INVISIBLE";
                    return (
                      <UserDialog key={friend._id} profileId={friend._id}>
                        <Card className="p-3 cursor-pointer hover:bg-muted/50 transition">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <UserAvatar src={friend.imageUrl} alt={friend.name} className="h-10 w-10" />
                              {isOnline && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{friend.globalName || friend.name}</p>
                              <p className="text-sm text-muted-foreground">@{friend.name}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFriend({ userId: user?.userId, friendUserId: friend.userId });
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      </UserDialog>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="add" className="flex-1 flex flex-col m-0">
            <div className="p-4 border-b border-border">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by username or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button type="submit" disabled={searching || !searchQuery.trim()}>
                  {searching ? "Searching..." : "Search"}
                </Button>
              </form>
            </div>
            <ScrollArea className="flex-1 p-4">
              {searchResults.length === 0 && searchQuery && !searching && (
                <div className="text-center text-muted-foreground py-8">
                  <p>No users found</p>
                </div>
              )}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((user: any) => {
                    const isPending = pendingSent.some((p: any) => p.userId === user.userId);
                    const isFriend = friends.some((f: any) => f.userId === user.userId);
                    
                    return (
                      <Card key={user._id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <UserAvatar src={user.imageUrl} alt={user.name} className="h-10 w-10" />
                            <div>
                              <p className="font-medium">{user.globalName || user.name}</p>
                              <p className="text-sm text-muted-foreground">@{user.name}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            disabled={isPending || isFriend}
                            onClick={() => handleSendRequest(user.userId)}
                          >
                            {isFriend ? (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Friends
                              </>
                            ) : isPending ? (
                              "Pending"
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4 mr-1" />
                                Add Friend
                              </>
                            )}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </PageContextProvider>
  );
}