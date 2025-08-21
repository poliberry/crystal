"use client";

import {
    DndContext,
    closestCenter,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    DragOverEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
    Active,
    useDroppable,
    rectIntersection,
    getFirstCollision,
    pointerWithin,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove,
    sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ServerChannel } from "./server-channel";
import { ServerSection } from "./server-section";
import { useRouter } from "next/navigation";
import { useState, ReactNode, useCallback, useMemo, memo, useEffect } from "react";
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

interface DraggableCategoryProps {
    category: Category;
    role?: MemberRole;
    server: ServerWithMembersWithProfiles;
    children: ReactNode;
}

interface ServerChannelListProps {
    categories: Category[];
    role?: MemberRole;
    server: ServerWithMembersWithProfiles;
}

// Drag overlay animation - much smoother
const dropAnimationConfig: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: "0.5",
            },
        },
    }),
    duration: 200,
    easing: "ease-out",
};

// Drop Zone Component for Categories
const CategoryDropZone = ({ categoryId, isActive }: { categoryId: string; isActive: boolean }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `category-drop-${categoryId}`,
        data: {
            type: "category-drop-zone",
            categoryId,
        },
    });

    if (!isActive) return null;

    return (
        <div
            ref={setNodeRef}
            className={`h-8 mx-4 mb-2 border-2 border-dashed rounded-md flex items-center justify-center transition-all duration-200 ${
                isOver 
                ? 'border-primary bg-primary/20 scale-105' 
                : 'border-primary/50 bg-primary/10 hover:border-primary/70 hover:bg-primary/15'
            }`}
        >
            <span className={`text-xs transition-all duration-200 ${
                isOver ? 'text-primary font-medium' : 'text-primary/70'
            }`}>
                {isOver ? 'Release to drop here' : 'Drop channel here'}
            </span>
        </div>
    );
};

// Draggable Category Component - Memoized for performance
const DraggableCategory = memo(({ category, role, server, children }: DraggableCategoryProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
        isOver,
    } = useSortable({
        id: `category-${category.id}`,
        data: {
            type: "category",
            category,
        },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: transition || "transform 200ms ease",
        opacity: isDragging ? 0.6 : 1,
        scale: isDragging ? 1.02 : 1,
        zIndex: isDragging ? 1000 : 1,
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`mb-2 transition-all duration-200 ${isDragging ? 'shadow-lg' : ''} ${isOver ? 'ring-2 ring-primary/30' : ''}`}
        >
            <div className="flex items-center group">
                {role !== MemberRole.GUEST && (
                    <div
                        {...attributes}
                        {...listeners}
                        className="opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted/80 active:scale-95"
                    >
                        <GripVertical className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
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
            {children}
        </div>
    );
});

DraggableCategory.displayName = "DraggableCategory";

export const ServerChannelList = ({ categories, role, server }: ServerChannelListProps) => {
    const router = useRouter();
    const [activeItem, setActiveItem] = useState<Active | null>(null);
    
    // Simple sensor configuration
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveItem(event.active);
    }, []);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveItem(null);

        if (!over || active.id === over.id) {
            return;
        }

        // Handle category reordering
        if (active.data.current?.type === "category" && over.data.current?.type === "category") {
            const activeIndex = categories.findIndex((cat: Category) => `category-${cat.id}` === active.id);
            const overIndex = categories.findIndex((cat: Category) => `category-${cat.id}` === over.id);

            if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
                const reorderedCategories = arrayMove(categories, activeIndex, overIndex);
                
                // Create position updates
                const updates = reorderedCategories.map((cat: Category, index: number) => ({
                    id: cat.id,
                    position: index,
                }));

                try {
                    const response = await fetch(`/api/categories/reorder`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ serverId: server.id, updates }),
                    });

                    if (!response.ok) {
                        throw new Error("Failed to reorder categories");
                    }

                    router.refresh();
                } catch (error) {
                    console.error("Error reordering categories:", error);
                }
            }
            return;
        }

        // Handle channel reordering
        if (active.data.current?.type === "channel") {
            const activeChannelId = active.id as string;
            const activeChannel = categories
                .flatMap(cat => cat.channels)
                .find(ch => ch.id === activeChannelId);

            if (!activeChannel) return;

            let targetCategoryId: string;
            let targetPosition: number = 0;

            // Determine target category and position
            if (over.data.current?.type === "category") {
                targetCategoryId = over.data.current.category.id;
                const targetCategory = categories.find(cat => cat.id === targetCategoryId);
                targetPosition = targetCategory?.channels.length || 0;
            } else if (over.data.current?.type === "channel") {
                const overChannelId = over.id as string;
                const overChannel = categories
                    .flatMap(cat => cat.channels)
                    .find(ch => ch.id === overChannelId);

                if (!overChannel) return;

                targetCategoryId = overChannel.categoryId || "";
                const targetCategory = categories.find(cat => cat.id === targetCategoryId);
                if (targetCategory) {
                    targetPosition = targetCategory.channels.findIndex(ch => ch.id === overChannelId);
                }
            } else {
                return;
            }

            // Only update if there's an actual change
            if (targetCategoryId !== activeChannel.categoryId || 
                activeChannel.position !== targetPosition) {
                
                try {
                    const response = await fetch(`/api/channels/${activeChannelId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            categoryId: targetCategoryId,
                            position: targetPosition,
                        }),
                    });

                    if (!response.ok) {
                        throw new Error("Failed to reorder channel");
                    }

                    router.refresh();
                } catch (error) {
                    console.error("Error reordering channel:", error);
                }
            }
        }
    }, [categories, server.id, router]);

                    // Only refresh if API call succeeds
                    router.refresh();
                } catch (error) {
                    console.error("Failed to reorder categories:", error);
                    // Revert optimistic update on error
                    setOptimisticCategories(categories);
                }
            }
        } else {
            // Handle channel reordering with optimistic update
            const activeChannelId = active.id as string;
            
            // Find source category and channel
            let sourceCategory: Category | null = null;
            let activeChannel: Channel | null = null;
            let activeChannelIndex = -1;

            for (const category of optimisticCategories) {
                const channelIndex = category.channels.findIndex((ch: Channel) => ch.id === activeChannelId);
                if (channelIndex !== -1) {
                    sourceCategory = category;
                    activeChannel = category.channels[channelIndex];
                    activeChannelIndex = channelIndex;
                    break;
                }
            }

            if (!activeChannel || !sourceCategory) return;

            // Determine target category and position
            let targetCategory: Category | null = null;
            let targetIndex = 0;

            const overType = over.data.current?.type;
            if (overType === "category") {
                const targetCategoryId = over.data.current?.category?.id;
                targetCategory = optimisticCategories.find((cat: Category) => cat.id === targetCategoryId) || null;
                targetIndex = targetCategory?.channels.length || 0;
            } else {
                for (const category of optimisticCategories) {
                    const overChannelIndex = category.channels.findIndex((ch: Channel) => ch.id === over.id);
                    if (overChannelIndex !== -1) {
                        targetCategory = category;
                        targetIndex = overChannelIndex;
                        break;
                    }
                }
            }

            if (!targetCategory) return;

            // If moving within the same category, adjust for removal
            if (sourceCategory.id === targetCategory.id && activeChannelIndex < targetIndex) {
                targetIndex--;
            }

            // Create optimistic update
            const updatedCategories = optimisticCategories.map((cat: Category) => {
                if (cat.id === sourceCategory!.id) {
                    return {
                        ...cat,
                        channels: cat.channels.filter((ch: Channel) => ch.id !== activeChannelId)
                    };
                }
                if (cat.id === targetCategory!.id) {
                    const newChannels = [...cat.channels];
                    newChannels.splice(targetIndex, 0, { ...activeChannel!, categoryId: cat.id });
                    return {
                        ...cat,
                        channels: newChannels
                    };
                }
                return cat;
            });

            setOptimisticCategories(updatedCategories);

            // Calculate new positions for all affected channels
            const updates: Array<{ id: string; position: number; categoryId: string }> = [];

            if (sourceCategory.id === targetCategory.id) {
                // Moving within same category
                const channels = [...sourceCategory.channels];
                const [movedChannel] = channels.splice(activeChannelIndex, 1);
                channels.splice(targetIndex, 0, movedChannel);

                updates.push(...channels.map((channel: Channel, index: number) => ({
                    id: channel.id,
                    position: index,
                    categoryId: targetCategory!.id,
                })));
            } else {
                // Moving between categories
                const sourceChannels = sourceCategory.channels.filter((ch: Channel) => ch.id !== activeChannelId);
                const targetChannels = [...targetCategory.channels];
                targetChannels.splice(targetIndex, 0, activeChannel);

                // Update source category channels
                updates.push(...sourceChannels.map((channel: Channel, index: number) => ({
                    id: channel.id,
                    position: index,
                    categoryId: sourceCategory!.id,
                })));

                // Update target category channels
                updates.push(...targetChannels.map((channel: Channel, index: number) => ({
                    id: channel.id,
                    position: index,
                    categoryId: targetCategory!.id,
                })));
            }

            try {
                await fetch(`/api/channels/reorder?serverId=${server.id}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ items: updates }),
                });

                router.refresh();
            } catch (error) {
                console.error("Failed to reorder channels:", error);
                // Revert optimistic update on error
                setOptimisticCategories(categories);
            }
        }
    }, [optimisticCategories, categories, server.id, router]);

    // Get all draggable IDs
    const allIds = useMemo(() => {
        const categoryIds = optimisticCategories.map((cat: Category) => `category-${cat.id}`);
        const allChannelIds = optimisticCategories.flatMap((cat: Category) => cat.channels.map((ch: Channel) => ch.id));
        return [...categoryIds, ...allChannelIds];
    }, [optimisticCategories]);

    return (
        <DndContext 
            sensors={sensors} 
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={allIds} strategy={verticalListSortingStrategy}>
                {optimisticCategories.map((category: Category, index: number) => (
                    <div key={category.id}>
                        {/* Drop zone above category */}
                        {isDraggingChannel && index === 0 && (
                            <CategoryDropZone 
                                categoryId={category.id} 
                                isActive={overId === category.id} 
                            />
                        )}
                        
                        <DraggableCategory
                            category={category}
                            role={role}
                            server={server}
                        >
                            <SortableContext
                                items={category.channels.map((c: Channel) => c.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-[2px] ml-4 transition-all duration-200">
                                    {category.channels.map((channel: Channel) => (
                                        <div 
                                            key={channel.id}
                                            className={`transition-all duration-200 ${
                                                isDraggingChannel && overId === channel.id 
                                                ? 'transform scale-105 shadow-md' 
                                                : ''
                                            }`}
                                        >
                                            <ServerChannel
                                                channel={channel}
                                                role={role}
                                                server={server}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </SortableContext>
                        </DraggableCategory>

                        {/* Drop zone below category */}
                        {isDraggingChannel && (
                            <CategoryDropZone 
                                categoryId={category.id} 
                                isActive={overId === category.id} 
                            />
                        )}
                    </div>
                ))}
            </SortableContext>

            <DragOverlay dropAnimation={dropAnimationConfig}>
                {activeItem ? (
                    activeItem.data.current?.type === "category" ? (
                        <div className="bg-background/95 backdrop-blur-sm border rounded-md p-3 shadow-xl ring-2 ring-primary/20">
                            <div className="text-xs uppercase font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                                <GripVertical className="h-3 w-3" />
                                {activeItem.data.current?.category?.name}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-background/95 backdrop-blur-sm border rounded-md p-3 shadow-xl ring-2 ring-primary/20">
                            <div className="text-sm font-medium flex items-center gap-2">
                                <GripVertical className="h-3 w-3 text-muted-foreground" />
                                {optimisticCategories
                                    .flatMap((cat: Category) => cat.channels)
                                    .find((ch: Channel) => ch.id === activeItem.id)?.name}
                            </div>
                        </div>
                    )
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};