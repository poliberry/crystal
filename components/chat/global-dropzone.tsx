import { useEffect, useState } from "react";
import { UploadDropzone } from "@/lib/uploadthing";
import { toast } from "sonner";

export function GlobalDropzone({ onUpload }: { onUpload: (file: any) => void }) {
  const [isDragging, setIsDragging] = useState(false);

  // Listen for drag events globally
  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) setIsDragging(true);
    };
    const onDragLeave = () => setIsDragging(false);
    const onDrop = () => setIsDragging(false);

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);

    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition pointer-events-none ${
        isDragging ? "bg-black/40 pointer-events-auto" : "bg-transparent"
      }`}
      style={{ display: isDragging ? "flex" : "none" }}
    >
      <div className="bg-white rounded-lg p-8 shadow-lg flex flex-col items-center">
        <span className="text-lg font-semibold mb-2">Drop image to upload</span>
        <UploadDropzone
          endpoint="messageFile"
          onClientUploadComplete={res => {
            if (res && res.length > 0) {
              onUpload({
                url: res[0].url,
                name: res[0].name,
                utId: res[0].key,
              });
              toast.success("Image uploaded!");
            }
          }}
          onUploadError={error => {
            toast.error("Upload failed: " + error.message);
          }}
        />
      </div>
    </div>
  );
}