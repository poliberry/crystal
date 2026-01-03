import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Convex handles authentication differently - it's done at the function level
// This middleware is simplified since auth is handled in Convex functions
export function middleware(request: NextRequest) {
  // Allow public routes - UploadThing webhooks need to be accessible
  const publicRoutes = ["/api/uploadthing", "/api/socket/io", "/sign-in", "/sign-up"];
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname.startsWith(route));
  
  if (isPublicRoute) {
    // Ensure UploadThing webhooks can access the route
    const response = NextResponse.next();
    // Allow CORS for UploadThing webhooks if needed
    if (request.nextUrl.pathname.startsWith("/api/uploadthing")) {
      response.headers.set("Access-Control-Allow-Origin", "*");
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    return response;
  }

  // For other routes, let them through - Convex will handle auth
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/(api|trpc)(.*)"],
};
