// components/CssEditorModal.tsx
"use client";

import { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Editor from "@monaco-editor/react";
import { toast } from "sonner";
import { useModal } from "@/hooks/use-modal-store";

export function CssEditorModal({ initialCss }: { initialCss: string }) {
  const [css, setCss] = useState(initialCss);
  const { isOpen, onClose, type, data } = useModal();
  const [saving, setSaving] = useState(false);

  async function saveCss() {
    setSaving(true);
    const res = await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ css }),
    });

    if (res.ok) {
      toast.success("CSS saved!");
      onClose();
    } else {
      toast.error("Failed to save CSS");
    }

    setSaving(false);
  }

  const isModalOpen = isOpen && type === "cssEditor";

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Custom CSS Editor</DialogTitle>
        </DialogHeader>

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

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleClose()}>Close</Button>
          <Button onClick={saveCss} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
