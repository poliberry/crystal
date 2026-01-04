"use client";

import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { uploadFiles } from "@/lib/uploadthing";
import Image from "next/image";
import { X, FileIcon, Plus, Send, Loader2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import clsx from "clsx";
import { EmojiPicker } from "../emoji-picker";
import { Card } from "../ui/card";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import axios from "axios";

const formSchema = z.object({
  content: z.string().optional(),
  attachments: z
    .array(
      z.object({
        utId: z.string(),
        url: z.string().url(),
        name: z.string(),
      })
    )
    .optional(),
});

type ChatInputProps = {
  apiUrl: string;
  query: Record<string, any>;
  name: string;
  type: "conversation" | "channel";
};

export const ChatInput = ({ apiUrl, query, name, type }: ChatInputProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useAuthStore();
  const channel = useQuery(
    api.channels.getById,
    type === "channel" && query.channelId
      ? { channelId: query.channelId as Id<"channels"> }
      : "skip"
  );
  const server = useQuery(
    api.servers.getById,
    channel?.serverId
      ? { serverId: channel.serverId as Id<"servers"> }
      : "skip"
  );
  const category = useQuery(
    api.categories.getById,
    channel?.categoryId
      ? { categoryId: channel.categoryId as Id<"categories"> }
      : "skip"
  );
  const conversation = useQuery(
    api.conversations.getById,
    type === "conversation" && query.conversationId && user?.userId
      ? { conversationId: query.conversationId as Id<"conversations">, userId: user.userId }
      : "skip"
  );
  const createMessage = useMutation(api.messages.create);
  const createDirectMessage = useMutation(api.directMessages.create);
  const setTyping = useMutation(api.typingIndicators.setTyping);
  const clearTyping = useMutation(api.typingIndicators.clearTyping);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const methods = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content: "",
      attachments: [],
    },
  });

  const {
    handleSubmit,
    control,
    setValue,
    reset,
    watch,
    formState: { isSubmitting },
  } = methods;

  const fileUrls = watch("attachments") || [];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const content = watch("content") || "";

  // Handle typing indicator
  useEffect(() => {
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // If user is typing, set typing indicator
    if (content.trim().length > 0) {
      const setTypingIndicator = async () => {
        try {
          if (type === "conversation" && query.conversationId) {
            await setTyping({
              conversationId: query.conversationId as any,
              userId: user?.userId,
            });
          } else if (type === "channel" && query.channelId) {
            await setTyping({
              channelId: query.channelId as any,
              userId: user?.userId,
            });
          }
        } catch (err) {
          console.error("Failed to set typing indicator:", err);
        }
      };

      setTypingIndicator();

      // Clear typing indicator after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(async () => {
        try {
          if (type === "conversation" && query.conversationId) {
            await clearTyping({
              conversationId: query.conversationId as any,
              userId: user?.userId,
            });
          } else if (type === "channel" && query.channelId) {
            await clearTyping({
              channelId: query.channelId as any,
              userId: user?.userId,
            });
          }
        } catch (err) {
          console.error("Failed to clear typing indicator:", err);
        }
      }, 3000);
    } else {
      // If content is empty, clear typing indicator immediately
      const clearTypingIndicator = async () => {
        try {
          if (type === "conversation" && query.conversationId) {
            await clearTyping({
              conversationId: query.conversationId as any,
              userId: user?.userId,
            });
          } else if (type === "channel" && query.channelId) {
            await clearTyping({
              channelId: query.channelId as any,
              userId: user?.userId,
            });
          }
        } catch (err) {
          console.error("Failed to clear typing indicator:", err);
        }
      };

      clearTypingIndicator();
    }

    // Cleanup on unmount
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Clear typing indicator on unmount
      if (type === "conversation" && query.conversationId) {
        clearTyping({
          conversationId: query.conversationId as any,
          userId: user?.userId,
        }).catch(() => {});
      } else if (type === "channel" && query.channelId) {
        clearTyping({
          channelId: query.channelId as any,
          userId: user?.userId,
        }).catch(() => {});
      }
    };
  }, [content, type, query, user?.userId, setTyping, clearTyping]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (
      !values.content &&
      (!values.attachments || values.attachments.length === 0)
    )
      return;

    // Clear typing indicator when sending message
    try {
      if (type === "conversation" && query.conversationId) {
        await clearTyping({
          conversationId: query.conversationId as any,
          userId: user?.userId,
        });
      } else if (type === "channel" && query.channelId) {
        await clearTyping({
          channelId: query.channelId as any,
          userId: user?.userId,
        });
      }
    } catch (err) {
      console.error("Failed to clear typing indicator:", err);
    }

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    try {
      if (type === "conversation") {
        if (values.content && values.content.length > 255) {
          toast.warning("Message must be less than 255 characters");
          return;
        }

        await createDirectMessage({
          content: values.content || "",
          conversationId: query.conversationId as any,
          userId: user?.userId,
          attachments: values.attachments?.map((att) => ({
            utId: att.utId,
            name: att.name,
            url: att.url,
          })),
        });

        // Collect subscriberIds from conversation members (excluding sender)
        const subscriberIds = conversation?.members
          ?.map((member: any) => member.profile?.userId)
          .filter((userId: string | undefined): userId is string => 
            Boolean(userId) && userId !== user?.userId
          ) || [];

        if(conversation?.type === "GROUP_MESSAGE") {
          await axios.post("/api/notifications/new-group-message", {
            redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/conversations/${query.conversationId}`,
            title: `${user?.globalName} (${conversation?.name})`,
            body: values.content || "",
            imageUrl: conversation?.imageUrl || user?.imageUrl,
            conversationId: query.conversationId,
            senderUserId: user?.userId,
            subscriberIds: subscriberIds,
          });
        } else {
          await axios.post("/api/notifications/new-direct-message", {
            redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/conversations/${query.conversationId}`,
            title: `${user?.globalName}`,
            body: values.content || "",
            imageUrl: user?.imageUrl,
            conversationId: query.conversationId,
            senderUserId: user?.userId,
            subscriberIds: subscriberIds,
          });
        }

        reset();
      } else {
        await createMessage({
          content: values.content || "",
          channelId: query.channelId as any,
          userId: user?.userId,
          attachments: values.attachments?.map((att) => ({
            utId: att.utId,
            name: att.name,
            url: att.url,
          })),
        });
        // Collect subscriberIds from server members (excluding sender)
        const subscriberIds = server?.members
          ?.map((member: any) => member.profile?.userId)
          .filter((userId: string | undefined): userId is string => 
            Boolean(userId) && userId !== user?.userId
          ) || [];

        await axios.post("/api/notifications/new-message", {
          redirectUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/servers/${server?._id}/channels/${channel?._id}`,
          title: `${user?.globalName} (${channel?.name} / ${category?.name}) in ${server?.name}`,
          body: values.content || "",
          imageUrl: user?.imageUrl,
          serverId: server?._id,
          channelId: channel?._id,
          senderUserId: user?.userId,
          subscriberIds: subscriberIds,
        });

        reset();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    
    if (droppedFiles.length === 0) return;

    setIsUploading(true);
    try {
      const uploaded = await uploadFiles("messageFile", {
        files: droppedFiles,
      });

      if (uploaded && Array.isArray(uploaded) && uploaded.length > 0) {
        const newAttachments = uploaded.map((file) => ({
          url: file.url,
          name: file.name,
          utId: file.key || file.name,
        }));

        setValue("attachments", [...fileUrls, ...newAttachments]);
        toast.success(`Uploaded ${newAttachments.length} file(s)`);
      } else {
        toast.error("Upload failed: No files were uploaded");
      }
    } catch (err: any) {
      console.error("Upload failed:", err);
      toast.error(`Upload failed: ${err?.message || "Unknown error"}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const filesArray = Array.from(selectedFiles);

    setIsUploading(true);
    try {
      const uploaded = await uploadFiles("messageFile", {
        files: filesArray,
      });

      if (uploaded && Array.isArray(uploaded) && uploaded.length > 0) {
        const newAttachments = uploaded.map((file) => ({
          url: file.url,
          name: file.name,
          utId: file.key || file.name,
        }));

        setValue("attachments", [...fileUrls, ...newAttachments]);
        toast.success(`Uploaded ${newAttachments.length} file(s)`);
      } else {
        toast.error("Upload failed: No files were uploaded");
      }
    } catch (err: any) {
      console.error("Upload failed:", err);
      toast.error(`Upload failed: ${err?.message || "Unknown error"}`);
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    } else {
      console.error("File input ref is not set");
    }
  };

  return (
    <FormProvider {...methods}>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        className={clsx(
          "relative transition-all rounded-md",
          isDragging && "border-2 border-dashed border-indigo-500"
        )}
      >
        {/* Overlay on drag */}
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-black/40 rounded-md flex items-center justify-center pointer-events-none">
            <p className="text-white text-sm font-medium">
              Drop image to upload
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-2 p-4"
        >
          {/* Uploaded files */}
          {fileUrls.length > 0 && (
            <div className="mb-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {fileUrls.map((att, idx) => {
                const fileType = att.url.split(".").pop();
                const isPdf = fileType === "pdf";

                return (
                  <div
                    key={att.url}
                    className="relative flex flex-col items-center p-2 w-fit bg-zinc-100 dark:bg-zinc-900 shadow"
                  >
                    {isPdf ? (
                      <FileIcon className="h-10 w-10 fill-indigo-200 stroke-indigo-400 mb-1" />
                    ) : (
                      <Image
                        src={att.url}
                        alt="uploaded"
                        width={80}
                        height={80}
                        className="rounded mb-1 object-cover"
                      />
                    )}
                    <span className="text-xs truncate max-w-[80px]">
                      {att.name}
                    </span>
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full shadow-sm"
                      onClick={() => {
                        setValue(
                          "attachments",
                          fileUrls.filter((_, i) => i !== idx)
                        );
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Input with upload and send buttons inside */}
          <Card className="flex flex-row items-center shadow-md p-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileSelect}
              id="file-upload-input"
            />
            <label htmlFor="file-upload-input" className="cursor-pointer">
              <Button
                variant="ghost"
                className="rounded-none"
                size="icon"
                type="button"
                onClick={handleFileButtonClick}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-6 w-6 rounded-none text-zinc-500 animate-spin" />
                ) : (
                  <Plus className="h-6 w-6 rounded-none text-zinc-500" />
                )}
              </Button>
            </label>
            <Input
              value={content}
              onChange={(e) => setValue("content", e.target.value)}
              placeholder={`Message ${type === "channel" ? `#${name}` : name}`}
              disabled={isSubmitting}
              className="flex-1 pr-4 bg-transparent border-none focus:ring-0 focus:border-transparent"
              autoComplete="off"
            />
            <Button
              type="submit"
              variant="default"
              disabled={isSubmitting}
              size="icon"
              className="p-2"
            >
              <Send className="h-4 w-4" />
            </Button>
          </Card>
        </form>
      </div>
    </FormProvider>
  );
};
