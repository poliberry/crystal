"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
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
import { useModal } from "@/hooks/use-modal-store";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";
import { Id } from "@/convex/_generated/dataModel";

const formSchema = z.object({
  name: z
    .string()
    .min(1, {
      message: "Category name is required.",
    })
});

export const CreateCategoryModal = () => {
  const { isOpen, onClose, type } = useModal();
  const params = useParams();
  const { user } = useAuthStore();
  const createCategory = useMutation(api.categories.create);

  const isModalOpen = isOpen && type === "createCategory";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const isLoading = isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (!params?.serverId || !user?.userId) return;

      await createCategory({
        name: values.name,
        serverId: params.serverId as Id<"servers">,
        userId: user.userId,
      });

      reset();
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
            Create category
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
                Category name
              </Label>
              <Input
                disabled={isLoading}
                aria-disabled={isLoading}
                className={cn(
                  "dark:bg-zinc-300/10 bg-zinc-300/50 border-0 dark:text-white text-black",
                  errors.name && "border-red-500"
                )}
                placeholder="Enter category name"
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
