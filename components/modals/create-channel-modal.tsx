"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChannelType } from "@/types/conversation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useModal } from "@/hooks/use-modal-store";
import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z
    .string()
    .min(1, {
      message: "Channel name is required.",
    })
    .refine((name) => name !== "general", {
      message: 'Channel name cannot be "general".',
    }),
  type: z.nativeEnum(ChannelType),
});

export const CreateChannelModal = () => {
  const { isOpen, onClose, type, data } = useModal();
  const { channelType } = data;
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const createChannel = useMutation(api.channels.create);

  const isModalOpen = isOpen && type === "createChannel";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: channelType || ChannelType.TEXT,
    },
  });

  const channelTypeValue = watch("type");

  useEffect(() => {
    if (channelType) setValue("type", channelType);
    else setValue("type", ChannelType.TEXT);
  }, [channelType, setValue]);

  const isLoading = isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await createChannel({
        name: values.name,
        type: values.type as "TEXT" | "AUDIO" | "VIDEO",
        serverId: params?.serverId as any,
        categoryId: data.categoryId as any,
        userId: user?.userId,
      });

      reset();
      router.refresh();
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Drawer open={isModalOpen} onOpenChange={handleClose} direction="bottom">
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-2xl text-center font-bold">
            Create channel
          </DrawerTitle>
        </DrawerHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-8"
          autoCapitalize="off"
          autoComplete="off"
        >
          <div className="space-y-8 px-6">
            <div className="space-y-2">
              <Label className="uppercase text-xs font-bold text-zinc-500">
                Channel name
              </Label>
              <Input
                disabled={isLoading}
                aria-disabled={isLoading}
                className={cn(
                  "dark:bg-zinc-300/10 bg-zinc-300/50 border-0 dark:text-white text-black",
                  errors.name && "border-red-500"
                )}
                placeholder="Enter channel name"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Channel Type</Label>
              <Select
                disabled={isLoading}
                value={channelTypeValue}
                onValueChange={(value) => setValue("type", value as ChannelType)}
              >
                <SelectTrigger className="dark:bg-zinc-300/10 bg-zinc-300/50 capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ChannelType).map((type) => (
                    <SelectItem
                      key={type}
                      value={type}
                      className="capitalize"
                    >
                      {type.toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-500">{errors.type.message}</p>
              )}
            </div>
          </div>

          <DrawerFooter>
            <Button
              disabled={isLoading}
              aria-disabled={isLoading}
              variant="default"
              type="submit"
            >
              Create
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
};
