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
        <div className="w-full h-0.5 bg-indigo-500 rounded-full mx-2 shadow-sm" />
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
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`space-y-2 ${isDragging ? 'opacity-50' : 'opacity-100'}`}
        >
            <div className="flex items-center gap-2 group">
                {role !== "GUEST" && (
                    <div
                        {...attributes}
                        {...listeners}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 rounded cursor-grab active:cursor-grabbing transition-opacity"
                    >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
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
            <div className="space-y-[2px]">
                {children}
            </div>
        </div>
    );
});

DraggableCategory.displayName = "DraggableCategory";

// Main Component
export const ServerChannelList = ({ categories, role, server }: ServerChannelListProps) => {
    const router = useRouter();
    const [activeItem, setActiveItem] = useState<Active | null>(null);
    const [dropIndicator, setDropIndicator] = useState<{categoryId: string, position: 'before' | 'after'} | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Create sortable items array
    const sortableItems = useMemo(() => {
        const items: string[] = [];
        categories.forEach(category => {
            items.push(`category-${category.id}`);
            category.channels.forEach(channel => {
                items.push(`channel-${channel.id}`);
            });
        });
        return items;
    }, [categories]);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveItem(event.active);
    }, []);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        const { active, over } = event;
        
        if (!over || !active) {
            setDropIndicator(null);
            return;
        }

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;

        // Only show drop indicator for category over category
        if (activeType === "category" && overType === "category") {
            const activeCategoryId = active.data.current?.category?.id;
            const overCategoryId = over.data.current?.category?.id;
            
            if (activeCategoryId && overCategoryId && activeCategoryId !== overCategoryId) {
                // Get the index positions to determine if we should show before or after
                const activeIndex = categories.findIndex(cat => cat.id === activeCategoryId);
                const overIndex = categories.findIndex(cat => cat.id === overCategoryId);
                
                setDropIndicator({
                    categoryId: overCategoryId,
                    position: activeIndex < overIndex ? 'after' : 'before'
                });
            } else {
                setDropIndicator(null);
            }
        } else {
            setDropIndicator(null);
        }
    }, [categories]);

    const handleDragEnd = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        
        setActiveItem(null);
        setDropIndicator(null);

        if (!over || active.id === over.id) return;

        const activeType = active.data.current?.type;
        const overType = over.data.current?.type;

        try {
            if (activeType === "category" && overType === "category") {
                const activeCategory = active.data.current?.category;
                const overCategory = over.data.current?.category;

                if (!activeCategory || !overCategory) return;

                const oldIndex = categories.findIndex(cat => cat.id === activeCategory.id);
                const newIndex = categories.findIndex(cat => cat.id === overCategory.id);

                if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                    const response = await fetch(`/api/categories/${activeCategory.id}/position?serverId=${server.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ position: newIndex }),
                    });

                    if (!response.ok) {
                        throw new Error('Failed to update category position');
                    }

                    router.refresh();
                }
            } else if (activeType === "channel" && overType === "category") {
                const activeChannel = active.data.current?.channel;
                const overCategory = over.data.current?.category;

                if (!activeChannel || !overCategory) return;

                if (activeChannel.categoryId !== overCategory.id) {
                    const response = await fetch(`/api/channels/${activeChannel.id}?serverId=${server.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            categoryId: overCategory.id,
                        }),
                    });

                    if (!response.ok) {
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
                        const response = await fetch(`/api/channels/${activeChannel.id}/position?serverId=${server.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ position: newIndex }),
                        });

                        if (!response.ok) {
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
            <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                <div className="space-y-4">
                    {categories.map((category, index) => (
                        <div key={category.id} className="relative">
                            {/* Drop indicator before this category */}
                            {dropIndicator?.categoryId === category.id && dropIndicator.position === 'before' && (
                                <div className="mb-2">
                                    <DropDivider isVisible={true} />
                                </div>
                            )}
                            
                            <DraggableCategory
                                category={category}
                                role={role}
                                server={server}
                            >
                                {category.channels.map((channel) => (
                                    <ServerChannel
                                        key={channel.id}
                                        channel={channel}
                                        role={role}
                                        server={server}
                                    />
                                ))}
                            </DraggableCategory>
                            
                            {/* Drop indicator after this category */}
                            {dropIndicator?.categoryId === category.id && dropIndicator.position === 'after' && (
                                <div className="mt-2">
                                    <DropDivider isVisible={true} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
};
