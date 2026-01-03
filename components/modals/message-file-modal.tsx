"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useModal } from "@/hooks/use-modal-store";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { Id } from "@/convex/_generated/dataModel";

const formSchema = z.object({
  fileUrl: z.string().min(1, {
    message: "Attachment is required.",
  }),
});

export const MessageFileModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const { user } = useAuthStore();
  const createMessage = useMutation(api.messages.create);
  const createDirectMessage = useMutation(api.directMessages.create);

  const isModalOpen = isOpen && type === "messageFile";
  const { channelId, conversationId } = data;

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fileUrl: "",
    },
  });

  const fileUrl = watch("fileUrl");

  const handleClose = () => {
    reset();
    onClose();
  };

  const isLoading = isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user?.userId) return;
    
    try {
      // Determine if it's a channel message or direct message
      if (conversationId) {
        // Direct message
        await createDirectMessage({
          content: values.fileUrl,
          conversationId: conversationId as Id<"conversations">,
          userId: user.userId,
          attachments: [{
            utId: values.fileUrl,
            name: "File",
            url: values.fileUrl,
          }],
        });
      } else if (channelId) {
        // Channel message
        await createMessage({
          content: values.fileUrl,
          channelId: channelId as Id<"channels">,
          userId: user.userId,
          attachments: [{
            utId: values.fileUrl,
            name: "File",
            url: values.fileUrl,
          }],
        });
      }

      reset();
      handleClose();
    } catch (error: unknown) {
      console.error(error);
    }
  };

  return (
    <Drawer open={isModalOpen} onOpenChange={handleClose} direction="bottom">
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-2xl text-center font-bold">
            Add an attachment
          </DrawerTitle>

          <DrawerDescription className="text-center text-zinc-500">
            Send a file as a message.
          </DrawerDescription>
        </DrawerHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-8"
          autoCapitalize="off"
          autoComplete="off"
        >
          <div className="space-y-8 px-6">
            <div className="flex items-center justify-center text-center">
              <div className="space-y-2">
                <FileUpload
                  endpoint="messageFile"
                  value={fileUrl}
                  onChange={(value) => setValue("fileUrl", value)}
                />
                {errors.fileUrl && (
                  <p className="text-sm text-red-500">{errors.fileUrl.message}</p>
                )}
              </div>
            </div>
          </div>

          <DrawerFooter>
            <Button
              disabled={isLoading}
              aria-disabled={isLoading}
              variant="default"
              type="submit"
            >
              Send
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
};
