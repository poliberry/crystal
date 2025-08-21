"use client";

import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragStartEvent,
    DragOverEvent,
    Active,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ServerChannel } from "./server-channel";
import { ServerSection } from "./server-section";
import { useRouter } from "next/navigation";
import { useState, ReactNode, useCallback, useMemo, memo } from "react";
import { GripVertical } from "lucide-react";
import { Channel, MemberRole, Server } from "@prisma/client";
import type { ServerWithMembersWithProfiles } from "@/types";

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

interface DraggableCategoryProps {
    category: Category;
    role?: MemberRole;
    server: ServerWithMembersWithProfiles;
    children: ReactNode;
}

// Simple drop divider component
const DropDivider = ({ isVisible }: { isVisible: boolean }) => {
    if (!isVisible) return null;
    
    return (
        <div className="flex items-center gap-2 my-2">
            <div className="w-full h-0.5 bg-blue-500 rounded-full" />
            <div className="text-xs text-blue-500 whitespace-nowrap">Drop here</div>
            <div className="w-full h-0.5 bg-blue-500 rounded-full" />
        </div>
    );
};

// Draggable Category Component - Simplified
const DraggableCategory = memo(({ category, role, server, children }: DraggableCategoryProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: `category-${category.id}`,
        data: {
            type: "category",
            category,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 1000 : 1,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className="space-y-2"
        >
            <div className="flex items-center gap-1 group">
                {role !== "GUEST" && (
                    <div
                        {...attributes}
                        {...listeners}
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
            <div className="space-y-[2px] ml-4">
                {children}
            </div>
        </div>
    );
});

DraggableCategory.displayName = "DraggableCategory";

export const ServerChannelList = ({ categories, role, server }: ServerChannelListProps) => {
    const router = useRouter();
    const [activeItem, setActiveItem] = useState<Active | null>(null);
    const [overId, setOverId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Create sortable items array - separate categories and channels
    const categoryItems = useMemo(() => {
        return categories.map(category => `category-${category.id}`);
    }, [categories]);

    const channelItems = useMemo(() => {
        const items: string[] = [];
        categories.forEach(category => {
            category.channels.forEach(channel => {
                items.push(channel.id);
            });
        });
        return items;
    }, [categories]);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        console.log('Drag start:', event.active.id, event.active.data.current);
        setActiveItem(event.active);
    }, []);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { active, over } = event;
        
        if (!over || !active) {
            setOverId(null);
            return;
        }

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;

        // Only handle category-to-category drag over events
        if (activeType === "category" && overType === "category") {
            const activeCategoryId = active.data.current?.category?.id;
            const overCategoryId = over.data.current?.category?.id;
            
            if (activeCategoryId && overCategoryId && activeCategoryId !== overCategoryId) {
                setOverId(`category-${overCategoryId}`);
            } else {
                setOverId(null);
            }
        } else {
            // Clear indicator for channel drags to prevent interference
            setOverId(null);
        }
    }, []);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        
        setActiveItem(null);
        setOverId(null);

        if (!over || active.id === over.id) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;

        console.log('Drag end:', { activeType, overType, activeId: active.id, overId: over.id });

        try {
            if (activeType === "category" && overType === "category") {
                const activeCategory = active.data.current?.category;
                const overCategory = over.data.current?.category;

                if (!activeCategory || !overCategory) return;

                const oldIndex = categories.findIndex(cat => cat.id === activeCategory.id);
                const newIndex = categories.findIndex(cat => cat.id === overCategory.id);

                if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                    // Use the reorder API with proper format
                    const newCategories = arrayMove(categories, oldIndex, newIndex);
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
                        throw new Error('Failed to update category position');
                    }

                    router.refresh();
                }
            } else if (activeType === "channel" && overType === "category") {
                const activeChannel = active.data.current?.channel;
                const overCategory = over.data.current?.category;

                if (!activeChannel || !overCategory) return;

                if (activeChannel.categoryId !== overCategory.id) {
                    // Move channel to new category
                    const targetCategory = categories.find(cat => cat.id === overCategory.id);
                    const newPosition = targetCategory?.channels.length || 0;

                    console.log('Moving channel to category:', { channelId: activeChannel.id, categoryId: overCategory.id, position: newPosition });

                    const response = await fetch(`/api/channels/${activeChannel.id}?serverId=${server.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            categoryId: overCategory.id,
                            position: newPosition,
                        }),
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Channel move failed:', response.status, errorText);
                        throw new Error('Failed to update channel category');
                    }

                    router.refresh();
                }
            } else if (activeType === "channel" && overType === "channel") {
                const activeChannel = active.data.current?.channel;
                const overChannel = over.data.current?.channel;

                if (!activeChannel || !overChannel) return;

                if (activeChannel.categoryId === overChannel.categoryId) {
                    const category = categories.find(cat => cat.id === activeChannel.categoryId);
                    if (!category) return;

                    const oldIndex = category.channels.findIndex(ch => ch.id === activeChannel.id);
                    const newIndex = category.channels.findIndex(ch => ch.id === overChannel.id);

                    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                        // Reorder channels within the same category
                        const newChannels = arrayMove(category.channels, oldIndex, newIndex);
                        const items = newChannels.map((ch, index) => ({
                            id: ch.id,
                            position: index,
                            categoryId: ch.categoryId
                        }));

                        console.log('Reordering channels:', items);

                        const response = await fetch(`/api/channels/reorder?serverId=${server.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ items }),
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            console.error('Channel reorder failed:', response.status, errorText);
                            throw new Error('Failed to update channel position');
                        }

                        router.refresh();
                    }
                }
            }
        } catch (error) {
            console.error('Error updating position:', error);
        }
    }, [categories, server.id, router]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            {/* Debug info - remove in production */}
            <div className="text-xs text-gray-500 mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                Categories: {categories.length} | Role: {role} | Active: {activeItem?.id || 'none'}
            </div>
            
            {/* Separate context for categories only */}
            <SortableContext items={categoryItems} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                    {categories.map((category, index) => {
                        const isDropTarget = overId === `category-${category.id}`;
                        const isBeingDragged = activeItem?.id === `category-${category.id}`;
                        
                        // Only show indicator for category drags
                        const showIndicatorAbove = isDropTarget && 
                            activeItem?.data.current?.type === "category" && 
                            !isBeingDragged;
                        
                        return (
                            <div key={category.id} className="relative">
                                {showIndicatorAbove && (
                                    <DropDivider isVisible={true} />
                                )}
                                
                                <DraggableCategory
                                    category={category}
                                    role={role}
                                    server={server}
                                >
                                    {/* Separate context for channels within this category */}
                                    <SortableContext 
                                        items={category.channels.map(ch => ch.id)} 
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {category.channels.map((channel) => (
                                            <ServerChannel
                                                key={channel.id}
                                                channel={channel}
                                                role={role}
                                                server={server}
                                            />
                                        ))}
                                    </SortableContext>
                                </DraggableCategory>
                            </div>
                        );
                    })}
                </div>
            </SortableContext>
        </DndContext>
    );
};
