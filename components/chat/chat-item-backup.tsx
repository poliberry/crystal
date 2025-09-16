"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Attachment, type Member, type Profile } from "@prisma/client";
import axios from "axios";
import { Edit, FileIcon, ShieldAlert, ShieldCheck, Trash } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import qs from "query-string";
import { type ElementRef, useCallback, useEffect, useRef, useState, KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";
import { PermissionManager } from "@/lib/permissions";
import { PermissionType, PermissionScope } from "@/types/permissions";

import { ActionTooltip } from "../action-tooltip";
import { UserAvatar } from "../user-avatar";
import { MediaEmbed, isSocialEmbed } from "./media-embed";
import { utapi } from "@/app/api/uploadthing/route";
import { useSocket } from "../providers/pusher-provider";

type ChatItemProps = {
  id: string;
  content: string;
  member?: (Member & {
    profile: Profile;
  }) | null;
  profile?: Profile; // For direct messages where member might be null
  timestamp: string;
  attachments: Attachment[] | null;
  deleted: boolean;
  currentMember: Member | any; // Allow conversation member type
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
  profile: directProfile,
  timestamp,
  attachments,
  deleted,
  currentMember,
  isUpdated,
  socketUrl,
  socketQuery,
}: ChatItemProps) => {
  // Use member's profile if available, otherwise use direct profile
  const messageProfile = member?.profile || directProfile;
  
  if (!messageProfile) {
    console.error("ChatItem: No profile available for message", { id, member, directProfile });
    return null;
  }

  const [isEditing, setIsEditing] = useState(false);
  const [presenceStatus, setPresenceStatus] = useState<string | null>(messageProfile.presenceStatus);
  const [permissions, setPermissions] = useState({
    canDeleteMessage: false,
    canEditMessage: false,
    isAdmin: false,
    isModerator: false
  });
  
  const inputRef = useRef<ElementRef<"input">>(null);
  const { onOpen } = useModal();
  const params = useParams();
  const router = useRouter();
  const { socket } = useSocket();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      content,
    },
  });

  useEffect(() => form.reset({ content }), [content, form]);

  // Check if current user is the owner of the message
  let isOwner = false;
  if (member) {
    isOwner = currentMember.id === member.id;
  } else if (directProfile) {
    isOwner = currentMember.profileId === directProfile.id || currentMember.id === directProfile.id;
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const url = qs.stringifyUrl({
        url: `${socketUrl}/${id}`,
        query: socketQuery,
      });

      await axios.patch(url, values);

      form.reset();
      setIsEditing(false);
    } catch (error) {
      console.log(error);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsEditing(false);
    }
  };

  return (
    <div className="relative group flex items-center hover:bg-black/5 p-4 transition w-full">
      <div className="group flex gap-x-2 items-start w-full">
        <div className="cursor-pointer hover:drop-shadow-md transition rounded-full">
          <UserAvatar src={messageProfile.imageUrl} alt={messageProfile.name} />
        </div>

        <div className="flex flex-col w-full">
          <div className="flex items-center gap-x-2">
            <div className="flex items-center">
              <p className="font-semibold text-sm hover:underline cursor-pointer">
                {messageProfile.name}
              </p>
              {member && (
                <ActionTooltip label={member.role}>
                  {roleIconMap[member.role]}
                </ActionTooltip>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{timestamp}</span>
          </div>

          {isEditing ? (
            <Form {...form}>
              <form
                className="flex items-center w-full gap-x-2 pt-2"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative w-full">
                            <Input
                              disabled={form.formState.isSubmitting}
                              className="p-2 bg-zinc-200/90 dark:bg-zinc-700/75 border-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-zinc-600 dark:text-zinc-200"
                              placeholder="Edited message"
                              {...field}
                              onKeyDown={onKeyDown}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <Button disabled={form.formState.isSubmitting} size="sm" variant="primary">
                  Save
                </Button>
              </form>
              <span className="text-[10px] mt-1 text-muted-foreground">
                Press escape to cancel, enter to save
              </span>
            </Form>
          ) : (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              {!deleted && (
                <>
                  {content}
                  {isUpdated && !deleted && (
                    <span className="text-[10px] mx-2 text-muted-foreground">
                      (edited)
                    </span>
                  )}
                </>
              )}
              {deleted && (
                <span className="italic text-muted-foreground text-xs">
                  This message has been deleted.
                </span>
              )}

              {/* Render attachments */}
              {attachments && attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {attachments.map((attachment) => {
                    if (attachment.url.includes("image")) {
                      return (
                        <div key={attachment.id} className="relative aspect-square rounded-md mt-2 overflow-hidden border flex items-center bg-secondary h-48 w-48">
                          <Image
                            src={attachment.url}
                            alt={attachment.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      );
                    }

                    return (
                      <div key={attachment.id} className="relative flex items-center p-2 mt-2 rounded-md bg-background/10">
                        <FileIcon className="h-10 w-10 fill-indigo-200 stroke-indigo-400" />
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-sm text-indigo-500 dark:text-indigo-400 hover:underline"
                        >
                          {attachment.name}
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons for message owner */}
        {isOwner && !deleted && (
          <div className="hidden group-hover:flex items-center gap-x-2 absolute p-1 -top-2 right-5 bg-white dark:bg-zinc-800 border rounded-sm">
            <ActionTooltip label="Edit">
              <Edit
                onClick={() => setIsEditing(true)}
                className="cursor-pointer ml-auto w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
              />
            </ActionTooltip>
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
    </div>
  );
};
