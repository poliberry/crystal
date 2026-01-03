# Convex Migration Guide

This document outlines the migration from Prisma + Clerk to Convex.

## What Has Been Changed

### 1. Database Schema
- **Before**: Prisma schema (`prisma/schema.prisma`)
- **After**: Convex schema (`convex/schema.ts`)
- All tables have been converted to Convex tables with proper indexes

### 2. Authentication
- **Before**: Clerk authentication (`@clerk/nextjs`)
- **After**: Convex authentication (configured via Convex dashboard)
- Authentication is now handled at the function level in Convex

### 3. API Routes
- **Before**: Next.js API routes (`app/api/**`)
- **After**: Convex functions (`convex/**/*.ts`)
- All CRUD operations have been converted to Convex queries and mutations

### 4. Client-Side Code
- **Before**: `axios`/`fetch` calls to API routes
- **After**: Convex hooks (`useQuery`, `useMutation`)

## Setup Instructions

### 1. Install Convex Auth Package
```bash
npm install @convex-dev/auth
```

### 2. Configure Convex Authentication
1. Go to your Convex dashboard
2. Navigate to Settings > Authentication
3. Configure your auth provider (Google, GitHub, etc.)
4. Copy the deployment URL and add it to your `.env.local`:
   ```
   NEXT_PUBLIC_CONVEX_URL=your-convex-deployment-url
   ```

### 3. Update Environment Variables
Remove Clerk-related environment variables and add:
```
NEXT_PUBLIC_CONVEX_URL=your-convex-deployment-url
```

### 4. Deploy Convex Schema
```bash
npx convex dev
```
This will push your schema and functions to Convex.

### 5. Update Client Components

Replace API calls with Convex hooks:

**Before:**
```tsx
const response = await axios.post("/api/servers", { name, imageUrl });
```

**After:**
```tsx
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const createServer = useMutation(api.servers.create);
await createServer({ name, imageUrl });
```

### 6. Update Server Components

For server components that need the current profile, you'll need to use Convex's server-side API or convert them to client components using hooks.

## Key Files Changed

### Convex Functions Created
- `convex/schema.ts` - Database schema
- `convex/profiles.ts` - Profile operations
- `convex/servers.ts` - Server operations
- `convex/channels.ts` - Channel operations
- `convex/messages.ts` - Message operations
- `convex/conversations.ts` - Conversation operations
- `convex/directMessages.ts` - Direct message operations
- `convex/members.ts` - Member operations
- `convex/lib/helpers.ts` - Helper functions for auth

### Updated Files
- `components/providers/providers.tsx` - Replaced ClerkProvider with ConvexProvider
- `middleware.ts` - Simplified to work with Convex
- `app/page.tsx` - Updated to use Convex auth
- `app/(auth)/(routes)/sign-in/[[...sign-in]]/page.tsx` - Updated for Convex auth

## Remaining Tasks

1. **Update all client components** to use Convex hooks instead of API calls
2. **Update server components** that use `currentProfile()` - these need to be converted to client components or use Convex's server API
3. **Remove Clerk dependencies** from `package.json`:
   ```bash
   npm uninstall @clerk/nextjs @clerk/themes
   ```
4. **Remove Prisma dependencies**:
   ```bash
   npm uninstall @prisma/client prisma
   ```
5. **Update uploadthing auth** - The `app/api/uploadthing/core.ts` file still uses Clerk and needs to be updated
6. **Update socket.io handlers** - These may still reference Prisma and need updating
7. **Test all functionality** - Ensure all features work with the new Convex backend

## Important Notes

- Convex uses real-time subscriptions, so you may want to replace some polling with `useQuery` hooks
- Convex functions are automatically typed - use `api.functionName` for type safety
- Authentication state is available via `useConvexAuth()` hook
- All database operations are now handled by Convex functions

## Migration Checklist

- [x] Create Convex schema
- [x] Create Convex functions for core operations
- [x] Update providers to use Convex
- [x] Update middleware
- [x] Update auth pages
- [ ] Update all client components to use Convex hooks
- [ ] Update server components
- [ ] Update uploadthing auth
- [ ] Update socket.io handlers
- [ ] Remove old dependencies
- [ ] Test all features
- [ ] Deploy to production

