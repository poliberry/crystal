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
            <div className="flex-1 h-0.5 bg-blue-500 rounded-full" />
            <span className="text-xs text-blue-500 font-medium">Drop here</span>
            <div className="flex-1 h-0.5 bg-blue-500 rounded-full" />
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
                    
                    {/* Channels - not draggable in this version, can be added later */}
                    <div className="space-y-[2px] ml-4">
                        {category.channels.map((channel) => (
                            <ServerChannel
                                key={channel.id}
                                channel={channel}
                                role={role}
                                server={server}
                            />
                        ))}
                    </div>
                </div>
            )}
        </Draggable>
    );
};

// Main Component
export const ServerChannelList = ({ categories, role, server }: ServerChannelListProps) => {
    const router = useRouter();

    const handleDragEnd = useCallback(async (result: DropResult) => {
        const { destination, source, type } = result;

        // Check if dropped outside droppable area
        if (!destination) return;

        // Check if position changed
        if (destination.droppableId === source.droppableId && destination.index === source.index) {
            return;
        }

        // Only handle category reordering for now
        if (type === 'CATEGORY') {
            const newCategories = Array.from(categories);
            const [reorderedCategory] = newCategories.splice(source.index, 1);
            newCategories.splice(destination.index, 0, reorderedCategory);

            // Create reorder payload
            const items = newCategories.map((cat, index) => ({
                id: cat.id,
                position: index
            }));

            try {
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
            } catch (error) {
                console.error('Error reordering categories:', error);
                // Could add toast notification here
            }
        }
    }, [categories, server.id, router]);

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            {/* Debug info */}
            <div className="text-xs text-gray-500 mb-3 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                Categories: {categories.length} | Role: {role || 'none'} | Library: @hello-pangea/dnd
            </div>

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
