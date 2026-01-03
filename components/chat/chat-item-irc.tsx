"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Edit, FileIcon, ShieldAlert, ShieldCheck, Trash } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import qs from "query-string";
import {
  type ElementRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";

import { ActionTooltip } from "../action-tooltip";
import { UserAvatar } from "../user-avatar";
import { MediaEmbed, isSocialEmbed } from "./media-embed";
import { utapi } from "@/app/api/uploadthing/route";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { UserDialog } from "../user-dialog";

type ChatItemIRCProps = {
  id: string;
  content: string;
  member: any & {
    profile: any;
  };
  timestamp: string;
  attachments: any[] | null; // <-- now an array
  deleted: boolean;
  currentMember: any;
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

export const ChatItemIRC = ({
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
}: ChatItemIRCProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<ElementRef<"input">>(null);
  const { onOpen } = useModal();
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();

  // Get real-time presence status from Convex
  const memberProfile = useQuery(
    api.profiles.getByUserId,
    member?.profile?.userId && user?.userId
      ? { userId: member.profile.userId }
      : "skip"
  );

  const presenceStatus = memberProfile?.presenceStatus;

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

  const isAdmin = currentMember.role === ("ADMIN" as string);
  const isModerator = currentMember.role === ("MODERATOR" as string);
  // Check if message is from current user by comparing IDs
  const currentMemberId = currentMember.id || currentMember._id || currentMember.profileId;
  const memberId = member.id || member._id || member.profileId;
  const isOwner = currentMemberId === memberId;

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
    <div className="relative group flex flex-row items-start hover:bg-foreground/5 px-4 py-2 transition w-full max-w-full justify-start min-w-0">
      <div className="group flex flex-row gap-x-2 items-start w-full max-w-full justify-start min-w-0">
        <div className="flex flex-row items-center gap-x-2 flex-shrink-0">
          <UserDialog profileId={memberProfile?._id as string}>
            <UserAvatar
              src={memberProfile?.imageUrl}
              alt={memberProfile?.globalName || "User Avatar"}
              className="cursor-pointer rounded-none"
            />
          </UserDialog>
        </div>

        <div className="flex flex-row w-full max-w-full gap-2 items-start justify-start min-w-0">
          <button
            onClick={onMemberClick}
            className="font-semibold text-sm hover:underline cursor-pointer whitespace-nowrap flex-shrink-0"
          >
            {memberProfile?.globalName}
          </button>
          <span className="text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap flex-shrink-0">
            {"<"}
            {memberProfile?.name}
            {">"}
          </span>

          <div className="flex-1 min-w-0 self-start justify-start">
            {/* Content and editing logic */}
            {isSocialEmbed(content) && <MediaEmbed url={content} />}

            {!isEditing &&
              !isSocialEmbed(content) &&
              !isValidUrl(content) &&
              content && (
                <p className="text-sm text-zinc-600 dark:text-zinc-300 break-words overflow-wrap-anywhere">
                  {content}
                  {isUpdated && !deleted && (
                    <span className="text-[10px] mx-2 text-zinc-500 dark:text-zinc-400">
                      (edited)
                    </span>
                  )}
                </p>
              )}

            {isEditing && (
              <>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="flex items-start w-full gap-x-2 pt-2"
                >
                  <div className="relative w-full">
                    <Input
                      disabled={isLoading}
                      aria-disabled={isLoading}
                      className="p-2 bg-zinc-200/90 dark:bg-zinc-700/75 border-none border-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200"
                      placeholder="Edited message"
                      value={form.getValues("content")}
                      onChange={(e) => form.setValue("content", e.target.value)}
                    />
                  </div>
                  <Button
                    disabled={isLoading}
                    aria-disabled={isLoading}
                    size="sm"
                    variant="default"
                  >
                    Save
                  </Button>
                </form>
                <span className="text-[10px] mt-1 text-zinc-400">
                  Press escape to cancel, enter to save
                </span>
              </>
            )}

            {/* Attachments grid - always rendered below content */}
            {attachments && attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap items-start self-start gap-2">
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
                        <button
                          onClick={() => {
                            onOpen("viewImage", {
                              imageUrl: att.url,
                              imageName: att.name || "image",
                              sender: {
                                name: memberProfile?.name,
                                globalName: memberProfile?.globalName,
                                imageUrl: memberProfile?.imageUrl,
                                _id: memberProfile?._id,
                              },
                              timestamp: timestamp,
                            });
                          }}
                          className="relative aspect-square rounded-md mt-2 overflow-hidden border flex items-center bg-secondary h-48 w-48 cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          <Image
                            src={att.url}
                            alt={att.name || content}
                            fill
                            className="object-cover"
                          />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400 flex-shrink-0 self-start whitespace-nowrap">
            {timestamp}
          </span>
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
