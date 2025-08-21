"use client";

import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
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

// Draggable Category Component - Memoized for performance
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
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="space-y-2">
            <div className="flex items-center gap-2">
                {role !== "GUEST" && (
                    <div
                        {...attributes}
                        {...listeners}
                        className="p-1 hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 rounded cursor-grab active:cursor-grabbing"
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

    const itemIds = useMemo(() => {
        const categoryIds = categories.map((cat: Category) => `category-${cat.id}`);
        const allChannelIds = categories.flatMap((cat: Category) => cat.channels.map((ch: Channel) => ch.id));
        return [...categoryIds, ...allChannelIds];
    }, [categories]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="space-y-2">
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                    {categories.map((category: Category) => (
                        <DraggableCategory
                            key={category.id}
                            category={category}
                            role={role}
                            server={server}
                        >
                            <div className="space-y-[2px]">
                                {category.channels.map((channel: Channel) => (
                                    <ServerChannel
                                        key={channel.id}
                                        channel={channel}
                                        role={role}
                                        server={server}
                                    />
                                ))}
                            </div>
                        </DraggableCategory>
                    ))}
                </SortableContext>
            </div>
            <DragOverlay dropAnimation={null}>
                {activeItem ? (
                    <div className="bg-background border rounded-md p-2 shadow-md">
                        {activeItem.data.current?.type === "category" ? (
                            <div className="font-semibold text-sm">
                                {activeItem.data.current.category?.name}
                            </div>
                        ) : (
                            <div className="text-sm">
                                # {activeItem.data.current?.channel?.name}
                            </div>
                        )}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
