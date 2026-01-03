# Updated Components and Handlers

## ✅ Components Updated to Use Convex

### 1. **hooks/use-dnd-status.ts**
   - ✅ Replaced `axios` API calls with Convex `useQuery` and `useMutation`
   - ✅ Uses `api.profiles.getCurrent` and `api.profiles.updateStatus`
   - ✅ Updated utility functions to work with Convex profile data

### 2. **components/navigation/user-card.tsx**
   - ✅ Removed Clerk `useUser` hook
   - ✅ Uses Convex `useQuery` for profile data
   - ✅ Uses Convex `useMutation` for status updates
   - ✅ Updated to use profile from Convex instead of Clerk user

### 3. **components/user-dialog.tsx**
   - ✅ Removed Clerk `useUser` hook
   - ✅ Uses Convex `useQuery` for current profile and target profile
   - ✅ Uses Convex `useMutation` for creating conversations
   - ✅ Updated all API calls to use Convex mutations
   - ✅ Fixed type references (removed Prisma types)

### 4. **components/modals/create-server-modal.tsx**
   - ✅ Replaced `axios.post` with Convex `useMutation`
   - ✅ Uses `api.servers.create`

### 5. **components/navigation/navigation-sidebar.tsx**
   - ✅ Converted from server component to client component
   - ✅ Uses Convex `useQuery` for profile and servers
   - ✅ Removed Prisma database queries

### 6. **app/(main)/layout.tsx**
   - ✅ Converted from server component to client component
   - ✅ Removed `currentProfile()` server-side call

### 7. **app/(main)/(routes)/conversations/layout.tsx**
   - ✅ Converted from server component to client component
   - ✅ Uses Convex `useQuery` for profile

## ✅ Convex Functions Created

### Profiles (`convex/profiles.ts`)
- `getCurrent` - Get current user's profile
- `getById` - Get profile by ID
- `getByUserId` - Get profile by userId (auth provider ID)
- `getByIdWithServer` - Get profile with server context (for user dialog)
- `createOrUpdate` - Create or update profile
- `update` - Update profile fields
- `updateStatus` - Update user status

### User Status (`convex/userStatus.ts`)
- `getStatus` - Get current user status

## ✅ Auth Handlers Updated

### 1. **app/api/uploadthing/core.ts**
   - ⚠️ Updated to remove Clerk auth
   - ⚠️ TODO: Add proper Convex auth verification
   - Currently has placeholder - needs implementation based on your auth setup

## ⚠️ Remaining Work

### High Priority

1. **Socket Handlers** (`pages/api/socket/**`)
   - Still use Prisma
   - Need to be updated to use Convex or removed if using Convex real-time

2. **API Routes** (`app/api/**`)
   - Many still use Prisma and Clerk
   - Should be replaced with Convex function calls from client components
   - Or converted to Convex HTTP actions if needed

3. **Uploadthing Auth**
   - Needs proper Convex auth verification
   - May need to use Convex HTTP actions or pass auth token from client

### Medium Priority

4. **Other Components Using API Calls**
   - Search for `axios`, `fetch("/api/`, etc.
   - Update to use Convex hooks

5. **Server Components**
   - Any remaining server components using `currentProfile()`
   - Convert to client components or create server-side wrapper

## Notes

- All updated components now use Convex hooks (`useQuery`, `useMutation`)
- Type safety is maintained through `api` imports from `@/convex/_generated/api`
- Profile IDs are now `_id` (Convex format) instead of `id` (Prisma format)
- Status values are strings, not Prisma enums

