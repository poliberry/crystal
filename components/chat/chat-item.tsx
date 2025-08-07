"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Attachment, MemberRole, type Member, type Profile } from "@prisma/client";
import axios from "axios";
import { Edit, FileIcon, ShieldAlert, ShieldCheck, Trash } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import qs from "query-string";
import { type ElementRef, useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";

import { ActionTooltip } from "../action-tooltip";
import { UserAvatar } from "../user-avatar";
import { MediaEmbed, isSocialEmbed } from "./media-embed";
import { utapi } from "@/app/api/uploadthing/route";
import { useSocket } from "../providers/socket-provider";

type ChatItemProps = {
  id: string;
  content: string;
  member: Member & {
    profile: Profile;
  };
  timestamp: string;
  attachments: Attachment[] | null; // <-- now an array
  deleted: boolean;
  currentMember: Member;
  isUpdated: boolean;
  socketUrl: string;
  socketQuery: Record<string, string>;
};

const roleIconMap = {
  GUEST: null,
  MODERATOR: <ShieldCheck className="h-4 w-4 ml-2 text-indigo-500" />,
  ADMIN: <ShieldAlert className="h-4 w-4 ml-2 text-rose-500" />,
};

const formSchema = z.object({
  content: z.string().min(1),
});

function isValidUrl(str: string) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export const ChatItem = ({
  id,
  content,
  member,
  timestamp,
  attachments,
  deleted,
  currentMember,
  isUpdated,
  socketUrl,
  socketQuery,
}: ChatItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [presenceStatus, setPresenceStatus] = useState<string | null>(member.profile.presenceStatus);
  const inputRef = useRef<ElementRef<"input">>(null);
  const { onOpen } = useModal();
  const params = useParams();
  const router = useRouter();
  const { socket } = useSocket();

  // Listen for presence status updates
  useEffect(() => {
    if (!member.profile.userId) return;

    const presenceHandler = (payload: { userId: string; presenceStatus: string | null }) => {
      if (payload.userId === member.profile.userId) {
        setPresenceStatus(payload.presenceStatus);
      }
    };

    // @ts-ignore
    socket.on("user:presence:update", presenceHandler);
    
    return () => {
      // @ts-ignore
      socket.off("user:presence:update", presenceHandler);
    };
  }, [member.profile.userId, socket]);

  const onMemberClick = () => {
    if (member.id === currentMember.id) return;

    router.push(`/servers/${params?.serverId}/conversations/${member.id}`);
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content,
    },
  });

  useEffect(() => form.reset({ content }), [content]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.keyCode === 27) {
        setIsEditing(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isAdmin = currentMember.role === MemberRole.ADMIN;
  const isModerator = currentMember.role === MemberRole.MODERATOR;
  const isOwner = currentMember.id === member.id;

  const canDeleteMessage = !deleted && (isAdmin || isModerator || isOwner);
  // Allow editing if owner and not deleted (even if there are attachments)
  const canEditMessage = !deleted && isOwner;

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const url = qs.stringifyUrl({
        url: `${socketUrl}/${id}`,
        query: socketQuery,
      });

      await axios.patch(url, values);

      form.reset();
      setIsEditing(false);
    } catch (error: unknown) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (isEditing) {
      form.setFocus("content");
    }
  }, [isEditing, form.setFocus]);

  return (
    <div className="relative group flex items-center hover:bg-black/5 p-4 transition w-full">
      <div className="group flex gap-x-2 items-start w-full">
        <button
          onClick={onMemberClick}
          className="cursor-pointer hover:drop-shadow-md transition rounded-full"
        >
          <UserAvatar src={member.profile.imageUrl} alt={member.profile.name} />
        </button>

        <div className="flex flex-col w-full">
          <div className="flex items-center gap-x-2">
            <div className="flex items-center">
              <button
                onClick={onMemberClick}
                className="font-semibold text-sm hover:underline cursor-pointer"
              >
                {member.profile.name}
              </button>

              <ActionTooltip label={member.role}>
                {roleIconMap[member.role]}
              </ActionTooltip>
            </div>

            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {timestamp}
            </span>
          </div>

          {/* Content and editing logic */}
          {isSocialEmbed(content) && <MediaEmbed url={content} />}

          {!isEditing && !isSocialEmbed(content) && !isValidUrl(content) && content && (
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {content}
              {isUpdated && !deleted && (
                <span className="text-[10px] mx-2 text-zinc-500 dark:text-zinc-400">
                  (edited)
                </span>
              )}
            </p>
          )}

          {isEditing && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex items-center w-full gap-x-2 pt-2"
              >
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <div className="relative w-full">
                          <Input
                            disabled={isLoading}
                            aria-disabled={isLoading}
                            className="p-2 bg-zinc-200/90 dark:bg-zinc-700/75 border-none border-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200"
                            placeholder="Edited message"
                            {...field}
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button
                  disabled={isLoading}
                  aria-disabled={isLoading}
                  size="sm"
                  variant="primary"
                >
                  Save
                </Button>
              </form>
              <span className="text-[10px] mt-1 text-zinc-400">
                Press escape to cancel, enter to save
              </span>
            </Form>
          )}

          {/* Attachments grid - always rendered below content */}
          {attachments && attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {attachments.map((att) => {
                const fileType = att.url.split(".").pop();
                const isPdf = fileType === "pdf";
                return (
                  <div
                    key={att.id || att.url}
                    className="relative flex flex-col items-start"
                  >
                    {isPdf ? (
                      <div className="flex items-center">
                        <FileIcon className="h-10 w-10 fill-indigo-200 stroke-indigo-400 mb-1" />
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="ml-2 text-sm text-indigo-500 dark:text-indigo-400 hover:underline"
                        >
                          {att.name || "PDF File"}
                        </a>
                      </div>
                    ) : (
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="relative aspect-square rounded-md mt-2 overflow-hidden border flex items-center bg-secondary h-48 w-48"
                      >
                        <Image
                          src={att.url}
                          alt={att.name || content}
                          fill
                          className="object-cover"
                        />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {canDeleteMessage && (
        <div className="md:hidden md:group-hover:flex items-center gap-x-2 absolute p-1 -top-2 right-5 bg-white dark:bg-zinc-800 border rounded-sm">
          {canEditMessage && (
            <ActionTooltip label="Edit">
              <Edit
                onClick={() => setIsEditing((prevIsEditing) => !prevIsEditing)}
                className="cursor-pointer ml-auto mb-2 md:mb-auto w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
              />
            </ActionTooltip>
          )}
          <ActionTooltip label="Delete">
            <Trash
              onClick={() =>
                onOpen("deleteMessage", {
                  apiUrl: `${socketUrl}/${id}`,
                  query: socketQuery,
                })
              }
              className="cursor-pointer ml-auto w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
            />
          </ActionTooltip>
        </div>
      )}
    </div>
  );
};
