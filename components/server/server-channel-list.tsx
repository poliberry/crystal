"use client";

import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ServerChannel } from "./server-channel";
import { ServerSection } from "./server-section";
import { useRouter } from "next/navigation";

export const ServerChannelList = ({ categories, role, server }) => {
    const sensors = useSensors(useSensor(PointerSensor));
    const router = useRouter();

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const sourceCategoryId = active.data.current?.sortable.containerId;
        const targetCategoryId = over.data.current?.sortable.containerId;

        const channelId = active.id;
        const newPosition = over.data.current?.sortable.index;

        const payload: any = {
            position: Number(newPosition),
        };

        if (sourceCategoryId !== targetCategoryId) {
            payload.categoryId = targetCategoryId;
        }

        await fetch(`/api/channels/reorder?channelId=${channelId}&serverId=${server?._id || server?.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        // Refresh the page to reflect changes
        router.refresh();
    };

    // Handle undefined categories
    const safeCategories = categories || [];

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            {safeCategories.map((category) => (
                <div key={category.id}>
                    <ServerSection
                        sectionType="category"
                        server={server}
                        role={role}
                        label={category.name}
                        categoryId={category.id}
                    />
                    <SortableContext
                        items={category.channels.map((c) => c.id || c._id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-[2px]">
                            {category.channels.map((channel) => (
                                <ServerChannel
                                    key={channel.id || channel._id}
                                    channel={channel}
                                    role={role}
                                    server={server}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </div>
            ))}
        </DndContext>
    );
}