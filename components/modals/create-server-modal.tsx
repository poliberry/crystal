"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useModal } from "@/hooks/use-modal-store";

const formSchema = z.object({
  name: z.string().min(1, {
    message: "Server name is required.",
  }),
  imageUrl: z.string().min(1, {
    message: "Server image is required.",
  }),
});

export const CreateServerModal = () => {
  const { isOpen, onClose, type } = useModal();
  const router = useRouter();

  const isModalOpen = isOpen && type === "createServer";

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      imageUrl: "",
    },
  });

  const isLoading = form.formState.isSubmitting;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await axios.post("/api/servers", values);

      form.reset();
      router.refresh();
      onClose();
    } catch (error) {
      console.error(error);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="p-0 bg-gradient-to-br from-white dark:from-black to-blue-300 dark:to-[#000226] overflow-hidden max-w-full border-none rounded-none h-full flex flex-row">
        <div className="w-1/2 h-full">
          <DialogHeader className="pt-8 px-6">
            <DialogTitle className="text-2xl text-left font-bold uppercase headerFont">
              Create your community
            </DialogTitle>

            <DialogDescription className="text-left text-zinc-500">
              Give your community a personality with a name and an image. You
              can always change it later.
            </DialogDescription>
          </DialogHeader>
              <br />
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-8 h-full p-4 pt-8 bg-white dark:bg-black rounded-tr-3xl"
              autoCapitalize="off"
              autoComplete="off"
            >
              <div className="space-y-8 px-6">
                <div className="flex flex-col items-left justify-left text-left">
                  <FormLabel className="uppercase text-xs font-bold text-zinc-500">
                    Server name
                  </FormLabel>
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <FileUpload
                            endpoint="serverImage"
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="uppercase text-xs font-bold text-zinc-500">
                        Server name
                      </FormLabel>

                      <FormControl>
                        <Input
                          disabled={isLoading}
                          aria-disabled={isLoading}
                          className="dark:bg-zinc-300/10 bg-zinc-300/50 border-0 dark:text-white text-black"
                          placeholder="Enter server name"
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="px-6 py-4 relative bottom-1">
                <Button
                  disabled={isLoading}
                  aria-disabled={isLoading}
                  variant="primary"
                >
                  Create
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
        <span className="w-1/2 h-full" />
      </DialogContent>
    </Dialog>
  );
};
