import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

const handleAuth = () => {
  // For Convex, authentication is handled client-side
  // This middleware will be called from the client where auth is already verified
  // You may need to pass auth token from client or use a different approach
  // For now, we'll allow uploads - you should add proper auth verification
  // based on your Convex auth setup
  
  // TODO: Add proper Convex auth verification here
  // This might require using Convex HTTP actions or passing auth token from client
  
  return { userId: "authenticated" }; // Placeholder - update with actual auth
};

export const appFileRouter = {
  serverImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(() => handleAuth())
    .onUploadComplete(() => {}),
  messageFile: f(["image", "pdf", "image/jpeg", "image/png"])
    .middleware(() => handleAuth())
    .onUploadComplete(() => {}),
} satisfies FileRouter;

export type AppFileRouter = typeof appFileRouter;
