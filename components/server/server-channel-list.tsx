"use client";

import React, { useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useRouter } from "next/navigation";
import { GripVertical } from "lucide-react";
import { Channel, MemberRole } from "@prisma/client";
import type { ServerWithMembersWithProfiles } from "@/types";
import { ServerChannel } from "./server-channel";
import { ServerSection } from "./server-section";

// Types
interface Category {
    id: string;
    name: string;
    position: number;
    channels: Channel[];
}

interface ServerChannelListProps {
    categories: Category[];
    role?: MemberRole;
    server: ServerWithMembersWithProfiles;
}

// Drop indicator component
const DropIndicator = ({ isDraggingOver }: { isDraggingOver: boolean }) => {
    if (!isDraggingOver) return null;
    
    return (
        <div className="flex items-center gap-2 my-2 px-2">
            <div className="flex-1 h-full bg-blue-500 rounded-full" />
        </div>
    );
};

// Draggable Category Component
const DraggableCategory = ({ 
    category, 
    index, 
    role, 
    server 
}: { 
    category: Category; 
    index: number; 
    role?: MemberRole; 
    server: ServerWithMembersWithProfiles; 
}) => {
    return (
        <Draggable 
            draggableId={`category-${category.id}`} 
            index={index}
            isDragDisabled={role === "GUEST"}
        >
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`space-y-2 transition-all duration-200 ${
                        snapshot.isDragging ? 'opacity-80 shadow-lg z-50' : 'opacity-100'
                    }`}
                >
                    <div className="flex items-center gap-1 group">
                        {role !== "GUEST" && (
                            <div
                                {...provided.dragHandleProps}
                                className="p-1 hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 rounded cursor-grab active:cursor-grabbing transition-all duration-200 opacity-60 hover:opacity-100"
                                title="Drag to reorder category"
                            >
                                <GripVertical className="h-3 w-3 text-muted-foreground" />
                            </div>
                        )}
                        <div className="flex-1">
                            <ServerSection
                                sectionType="category"
                                server={server}
                                role={role}
                                label={category.name}
                                categoryId={category.id}
                            />
                        </div>
                    </div>
    <Droppable droppableId={`category-${category.id}-channels`} type="CHANNEL">
        {(provided, snapshot) => (
            <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`space-y-[2px] ml-4 min-h-[20px]`}
            >
                {category.channels.map((channel, channelIndex) => (
                    <Draggable
                        key={channel.id}
                        draggableId={`channel-${channel.id}`}
                        index={channelIndex}
                        isDragDisabled={role === "GUEST"}
                    >
                        {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`transition-all duration-200 ${
                                    snapshot.isDragging ? 'opacity-80 shadow-md z-40' : 'opacity-100'
                                }`}
                            >
                                <div className="flex items-center gap-1 group">
                                    {role !== "GUEST" && (
                                        <div
                                            {...provided.dragHandleProps}
                                            className="p-0.5 hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 rounded cursor-grab active:cursor-grabbing transition-all duration-200 opacity-40 hover:opacity-100"
                                            title="Drag to reorder channel"
                                        >
                                            <GripVertical className="h-2 w-2 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <ServerChannel
                                            channel={channel}
                                            role={role}
                                            server={server}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </Draggable>
                ))}
                {provided.placeholder}
            </div>
        )}
    </Droppable>
                </div>
            )}
        </Draggable>
    );
};

// Main Component
export const ServerChannelList = ({ categories, role, server }: ServerChannelListProps) => {
    const router = useRouter();

    const handleDragEnd = useCallback(async (result: DropResult) => {
        const { destination, source, type, draggableId } = result;

        // Check if dropped outside droppable area
        if (!destination) return;

        // Check if position changed
        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return;
        }

        console.log('Drag end:', { type, draggableId, source, destination });

        try {
            if (type === 'CATEGORY') {
                // Handle category reordering
                const newCategories = Array.from(categories);
                const [reorderedCategory] = newCategories.splice(source.index, 1);
                newCategories.splice(destination.index, 0, reorderedCategory);

                // Create reorder payload
                const items = newCategories.map((cat, index) => ({
                    id: cat.id,
                    position: index
                }));

                console.log('Reordering categories:', items);
                
                const response = await fetch(`/api/categories/reorder?serverId=${server.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Category reorder failed:', response.status, errorText);
                    throw new Error('Failed to reorder categories');
                }

                router.refresh();
                
            } else if (type === 'CHANNEL') {
                // Handle channel reordering/moving
                const channelId = draggableId.replace('channel-', '');
                
                // Extract category ID from droppable ID
                const sourceCategoryId = source.droppableId.replace('category-', '').replace('-channels', '');
                const destCategoryId = destination.droppableId.replace('category-', '').replace('-channels', '');
                
                console.log('Moving channel:', { channelId, from: sourceCategoryId, to: destCategoryId });

                if (sourceCategoryId === destCategoryId) {
                    // Reordering within same category
                    const category = categories.find(cat => cat.id === sourceCategoryId);
                    if (!category) return;

                    const newChannels = Array.from(category.channels);
                    const [reorderedChannel] = newChannels.splice(source.index, 1);
                    newChannels.splice(destination.index, 0, reorderedChannel);

                    const items = newChannels.map((ch, index) => ({
                        id: ch.id,
                        position: index,
                        categoryId: ch.categoryId
                    }));

                    console.log('Reordering channels within category:', items);

                    const response = await fetch(`/api/channels/reorder?serverId=${server.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ items }),
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Channel reorder failed:', response.status, errorText);
                        throw new Error('Failed to reorder channels');
                    }
                } else {
                    // Moving channel to different category
                    console.log('Moving channel to different category:', { channelId, destCategoryId, position: destination.index });

                    const response = await fetch(`/api/channels/${channelId}?serverId=${server.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            categoryId: destCategoryId,
                            position: destination.index,
                        }),
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Channel move failed:', response.status, errorText);
                        throw new Error('Failed to move channel');
                    }
                }

                router.refresh();
            }
        } catch (error) {
            console.error('Error in drag operation:', error);
        }
    }, [categories, server.id, router]);

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="categories" type="CATEGORY">
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="space-y-3"
                    >
                        <DropIndicator isDraggingOver={snapshot.isDraggingOver} />
                        
                        {categories.map((category, index) => (
                            <DraggableCategory
                                key={category.id}
                                category={category}
                                index={index}
                                role={role}
                                server={server}
                            />
                        ))}
                        
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
};
