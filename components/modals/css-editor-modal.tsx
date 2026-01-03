// components/CssEditorModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import Editor from "@monaco-editor/react";
import { toast } from "sonner";
import { useModal } from "@/hooks/use-modal-store";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthStore } from "@/lib/auth-store";

export function CssEditorModal({ initialCss }: { initialCss: string }) {
  const [css, setCss] = useState(initialCss);
  const { isOpen, onClose, type } = useModal();
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);

  // Get current profile to get profileId
  const currentProfile = useQuery(
    api.profiles.getCurrent,
    user?.userId ? { userId: user.userId } : "skip"
  );
  const updateProfile = useMutation(api.profiles.update);

  // Update CSS when profile loads
  useEffect(() => {
    if (currentProfile?.customCss) {
      setCss(currentProfile.customCss);
    }
  }, [currentProfile?.customCss]);

  async function saveCss() {
    if (!currentProfile?._id || !user?.userId) {
      toast.error("Profile not found");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        profileId: currentProfile._id,
        customCss: css,
        userId: user.userId,
      });

      toast.success("CSS saved!");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save CSS");
    } finally {
      setSaving(false);
    }
  }

  const isModalOpen = isOpen && type === "cssEditor";

  const handleClose = () => {
    onClose();
  };

  return (
    <Drawer open={isModalOpen} onOpenChange={handleClose} direction="bottom">
      <DrawerContent className="max-w-4xl max-h-[90vh] overflow-hidden mx-auto">
        <DrawerHeader>
          <DrawerTitle>Custom CSS Editor</DrawerTitle>
        </DrawerHeader>

        <div className="h-[60vh] w-full border border-zinc-800 rounded overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="css"
            value={css}
            onChange={(value) => setCss(value || "")}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "monospace",
            }}
          />
        </div>

        <DrawerFooter>
          <Button variant="ghost" onClick={() => handleClose()}>Close</Button>
          <Button onClick={saveCss} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
