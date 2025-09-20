"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Hash, Mic, Video, Radio, Megaphone, MoreHorizontal } from "lucide-react";
import { Channel } from "@prisma/client";
import type { ServerWithMembersWithProfiles } from "@/types";
import { ServerChannel } from "./server-channel";
import { ServerSection } from "./server-section";
import { useCrystalPermissions } from "@/hooks/use-crystal-permissions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSocket } from "@/components/providers/pusher-provider";

// Types
interface Category {
    id: string;
    name: string;
    position: number;
    channels: Channel[];
}

interface ServerChannelListSimpleProps {
    categories: Category[];
    member: any;
    server: ServerWithMembersWithProfiles;
}

// Simple Category Component with clean hover controls
const SimpleCategory = ({ 
    category, 
    index, 
    member, 
    server,
    canManageChannels,
    totalCategories,
    onMoveUp,
    onMoveDown,
    onMoveChannelUp,
    onMoveChannelDown
}: { 
    category: Category; 
    index: number; 
    member: any; 
    server: ServerWithMembersWithProfiles;
    canManageChannels: boolean;
    totalCategories: number;
    onMoveUp: (categoryId: string) => void;
    onMoveDown: (categoryId: string) => void;
    onMoveChannelUp: (channelId: string, categoryId: string, currentIndex: number) => void;
    onMoveChannelDown: (channelId: string, categoryId: string, currentIndex: number) => void;
}) => {
    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 group">
                <div className="flex-1">
                    <ServerSection
                        sectionType="category"
                        server={server}
                        label={category.name}
                        member={member}
                        categoryId={category.id}
                        categoryIndex={index}
                        totalCategories={totalCategories}
                        onMoveCategoryUp={onMoveUp}
                        onMoveCategoryDown={onMoveDown}
                    />
                </div>
                {canManageChannels && !category.id.startsWith('fallback-') && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity"
                            >
                                <MoreHorizontal className="h-3 w-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={() => onMoveUp(category.id)}
                                disabled={index === 0}
                            >
                                <ChevronUp className="h-4 w-4 mr-2" />
                                Move Up
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => onMoveDown(category.id)}
                                disabled={index === totalCategories - 1}
                            >
                                <ChevronDown className="h-4 w-4 mr-2" />
                                Move Down
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            <div className="space-y-1">
                {category.channels.map((channel, channelIndex) => (
                    <div key={channel.id} className="flex items-center group">
                        <div className="flex-1">
                            <ServerChannel
                                key={channel.id}
                                channel={channel}
                                member={member}
                                server={server}
                                categoryId={category.id}
                                channelIndex={channelIndex}
                                totalChannelsInCategory={category.channels.length}
                                onMoveUp={onMoveChannelUp}
                                onMoveDown={onMoveChannelDown}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Main Component
export const ServerChannelListSimple = ({ categories, member, server }: ServerChannelListSimpleProps) => {
    const router = useRouter();
    const { pusher } = useSocket();
    
    const { permissions, loading } = useCrystalPermissions(member?.id);
    
    // Extract permission checks for easier use
    const canManageChannels = permissions.canManageChannels;
    const canViewChannels = permissions.canViewChannels;

    // Set up Pusher live updates
    useEffect(() => {
        if (!pusher || !server.id) return;

        const serverChannel = pusher.subscribe(`server-${server.id}`);
        
        serverChannel.bind("channels:moved", (data: any) => {
            console.log("[PUSHER] Channel moved:", data);
            router.refresh();
        });

        serverChannel.bind("categories:moved", (data: any) => {
            console.log("[PUSHER] Category moved:", data);
            router.refresh();
        });

        serverChannel.bind("channels:created", (data: any) => {
            console.log("[PUSHER] Channel created:", data);
            router.refresh();
        });

        serverChannel.bind("categories:created", (data: any) => {
            console.log("[PUSHER] Category created:", data);
            router.refresh();
        });

        return () => {
            pusher.unsubscribe(`server-${server.id}`);
        };
    }, [pusher, server.id, router]);

    // Helper functions for channel movement
    const moveChannelUp = async (channelId: string, categoryId: string, currentIndex: number) => {
        if (currentIndex === 0) return;
        
        console.log('Moving channel up:', { channelId, categoryId, currentIndex });
        console.log('Is in fallback category?', categoryId.startsWith('fallback-'));
        
        // Don't allow moving channels in fallback categories
        if (categoryId.startsWith('fallback-')) {
            console.log('Cannot move channels in fallback categories');
            return;
        }
        
        try {
            const response = await fetch(`/api/channels/${channelId}/move`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    direction: 'up',
                    categoryId: categoryId === 'uncategorized' ? null : categoryId
                }),
            });
            
            if (response.ok) {
                console.log('Channel moved up successfully');
                router.refresh();
            } else {
                const errorText = await response.text();
                console.error('Failed to move channel up:', response.status, errorText);
            }
        } catch (error) {
            console.error('Error moving channel up:', error);
        }
    };

    const moveChannelDown = async (channelId: string, categoryId: string, currentIndex: number) => {
        console.log('Moving channel down:', { channelId, categoryId, currentIndex });
        console.log('Is in fallback category?', categoryId.startsWith('fallback-'));
        
        // Don't allow moving channels in fallback categories
        if (categoryId.startsWith('fallback-')) {
            console.log('Cannot move channels in fallback categories');
            return;
        }
        
        try {
            console.log('Moving channel down:', { channelId, categoryId, currentIndex });
            const response = await fetch(`/api/channels/${channelId}/move`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    direction: 'down',
                    categoryId: categoryId === 'uncategorized' ? null : categoryId
                }),
            });
            
            if (response.ok) {
                console.log('Channel moved down successfully');
                router.refresh();
            } else {
                const errorText = await response.text();
                console.error('Failed to move channel down:', response.status, errorText);
            }
        } catch (error) {
            console.error('Error moving channel down:', error);
        }
    };

    // Show loading state while permissions are being fetched
    if (loading) {
        return <div className="text-center text-muted-foreground">Loading channels...</div>;
    }

    const handleMoveCategoryUp = async (categoryId: string) => {
        try {
            console.log('Moving category up:', categoryId);
            console.log('Is fallback category?', categoryId.startsWith('fallback-'));
            
            // Don't allow moving fallback categories
            if (categoryId.startsWith('fallback-')) {
                console.log('Cannot move fallback category');
                return;
            }
            
            const response = await fetch(`/api/categories/${categoryId}/move`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ direction: 'up' }),
            });
            
            if (response.ok) {
                console.log('Category moved up successfully');
                router.refresh();
            } else {
                const errorText = await response.text();
                console.error('Failed to move category up:', response.status, errorText);
            }
        } catch (error) {
            console.error('Error moving category up:', error);
        }
    };

    const handleMoveCategoryDown = async (categoryId: string) => {
        try {
            console.log('Moving category down:', categoryId);
            console.log('Is fallback category?', categoryId.startsWith('fallback-'));
            
            // Don't allow moving fallback categories
            if (categoryId.startsWith('fallback-')) {
                console.log('Cannot move fallback category');
                return;
            }
            
            const response = await fetch(`/api/categories/${categoryId}/move`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ direction: 'down' }),
            });
            
            if (response.ok) {
                console.log('Category moved down successfully');
                router.refresh();
            } else {
                const errorText = await response.text();
                console.error('Failed to move category down:', response.status, errorText);
            }
        } catch (error) {
            console.error('Error moving category down:', error);
        }
    };

    return (
        <div className="space-y-3">
            {categories.map((category, index) => (
                <SimpleCategory
                    key={category.id}
                    category={category}
                    index={index}
                    member={member}
                    server={server}
                    canManageChannels={canManageChannels}
                    totalCategories={categories.length}
                    onMoveUp={handleMoveCategoryUp}
                    onMoveDown={handleMoveCategoryDown}
                    onMoveChannelUp={moveChannelUp}
                    onMoveChannelDown={moveChannelDown}
                />
            ))}
        </div>
    );
};
