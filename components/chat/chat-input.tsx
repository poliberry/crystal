"use client";

import { useForm, FormProvider, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UploadButton, uploadFiles } from "@/lib/uploadthing";
import Image from "next/image";
import { X, FileIcon, Plus, Send } from "lucide-react";
import { useRef, useState } from "react";
import clsx from "clsx";

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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!values.content && (!values.attachments || values.attachments.length === 0)) return;
    try {
      await axios.post(`${apiUrl}?serverId=${query.serverId}&channelId=${query.channelId}`, values);
      reset();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);

    try {
      const uploaded = await uploadFiles("messageFile", {
        files: droppedFiles,
      });

      const newAttachments = uploaded.map(file => ({
        url: file.url,
        name: file.name,
        utId: file.key,
      }));

      setValue("attachments", [...fileUrls, ...newAttachments]);
      // Optionally, emit a socket event here to notify other users of the new upload
      // Example:
      // socket.emit("newAttachment", { attachments: newAttachments, channelId: query.channelId });
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  return (
    <FormProvider {...methods}>
      <div
        onDrop={handleDrop}
        onDragOver={e => {
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
            <p className="text-white text-sm font-medium">Drop image to upload</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2 p-4">
          {/* Uploaded files */}
          {fileUrls.length > 0 && (
            <div className="mb-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {fileUrls.map((att, idx) => {
                const fileType = att.url.split(".").pop();
                const isPdf = fileType === "pdf";

                return (
                  <div
                    key={att.url}
                    className="relative flex flex-col items-center p-2 rounded-md bg-zinc-100 dark:bg-zinc-900 shadow"
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
                    <span className="text-xs truncate max-w-[80px]">{att.name}</span>
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
          <div className="relative flex items-center bg-background shadow-md p-1 rounded-xl">
            {/* Upload button inside input, left side */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2">
              <UploadButton
                endpoint="messageFile"
                onClientUploadComplete={res => {
                  if (res && res.length > 0) {
                    setValue("attachments", [
                      ...fileUrls,
                      {
                        url: res[0].url,
                        name: res[0].name,
                        utId: res[0].key,
                      },
                    ]);
                  }
                }}
                onUploadError={error => {
                  console.error("Upload Error:", error);
                }}
                appearance={{
                  button: "p-1 h-8 w-8 bg-transparent hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full shadow-none",
                  allowedContent: "hidden",
                }}
                content={{
                  button({ ready }) {
                    return <Plus className="h-6 w-6 text-zinc-500" />;
                  },
                }}
              />
            </div>
            {/* Send button inside input, right side */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <Button type="submit" variant="ghost" disabled={isSubmitting} size="icon" className="p-2">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <Controller
              control={control}
              name="content"
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder={`Message ${type === "channel" ? `#${name}` : name}`}
                  disabled={isSubmitting}
                  className="flex-1 pl-12 pr-12 bg-transparent border-none focus:ring-0 focus:border-transparent"
                  autoComplete="off"
                />
              )}
            />
          </div>
        </form>
      </div>
    </FormProvider>
  );
};
