"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useAuthStore } from "@/lib/auth-store";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, {
    message: "Server name is required.",
  }),
  imageUrl: z.string().min(1, {
    message: "Server image is required.",
  }),
});

export const InitialModal = () => {
  const router = useRouter();
  const { user } = useAuthStore();
  const createServer = useMutation(api.servers.create);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      imageUrl: "",
    },
  });

  const imageUrl = watch("imageUrl");

  const isLoading = isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await createServer({
        name: values.name,
        imageUrl: values.imageUrl,
        userId: user?.userId,
      });

      reset();
      router.refresh();
      window.location.reload();
    } catch (error: unknown) {
      console.error(error);
    }
  };

  if (!isMounted) return null;

  return (
    <Drawer open direction="bottom">
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-2xl text-center font-bold">
            Create your server
          </DrawerTitle>

          <DrawerDescription className="text-center text-zinc-500">
            Give your server a personality with a name and an image. You can
            always change it later.
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
                  endpoint="serverImage"
                  value={imageUrl}
                  onChange={(value) => setValue("imageUrl", value || "")}
                />
                {errors.imageUrl && (
                  <p className="text-sm text-red-500">{errors.imageUrl.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="uppercase text-xs font-bold text-zinc-500">
                Server name
              </Label>
              <Input
                disabled={isLoading}
                aria-disabled={isLoading}
                className={cn(
                  "dark:bg-zinc-300/10 bg-zinc-300/50 border-0 dark:text-white text-black",
                  errors.name && "border-red-500"
                )}
                placeholder="Enter server name"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
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
