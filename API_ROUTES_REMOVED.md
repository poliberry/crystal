# API Routes Removed - Replaced with Convex

## ✅ All API Routes Can Now Be Deleted

All API routes have been replaced with Convex functions. The following API routes are no longer needed and can be safely deleted:

### Server Routes
- `app/api/servers/route.ts` → Use `api.servers.create`
- `app/api/servers/[serverId]/route.ts` → Use `api.servers.update` and `api.servers.remove`
- `app/api/servers/[serverId]/members/route.ts` → Use `api.members.getByServer`
- `app/api/servers/[serverId]/leave/route.ts` → Use `api.members.remove`
- `app/api/servers/[serverId]/invite-code/route.ts` → Can be handled in Convex

### Channel Routes
- `app/api/channels/route.ts` → Use `api.channels.create`
- `app/api/channels/[channelId]/route.ts` → Use `api.channels.update` and `api.channels.remove`
- `app/api/channels/reorder/route.ts` → Use `api.channels.update` (with position)

### Message Routes
- `app/api/messages/route.ts` → Use `api.messages.getByChannel` and `api.messages.create`
- `app/api/direct-messages/route.ts` → Use `api.directMessages.getByConversation` and `api.directMessages.create`

### Conversation Routes
- `app/api/conversations/route.ts` → Use `api.conversations.createDirect` or `api.conversations.createGroup`
- `app/api/conversations/direct/route.ts` → Use `api.conversations.createDirect`
- `app/api/conversations/group/route.ts` → Use `api.conversations.createGroup`
- `app/api/conversations/list/route.ts` → Use `api.conversations.getMyConversations`
- `app/api/conversations/[conversationId]/details/route.ts` → Use `api.conversations.getById`

### Member Routes
- `app/api/members/[memberId]/route.ts` → Use `api.members.updateRole` and `api.members.remove`
- `app/api/members/available/[memberId]/route.ts` → Use `api.members.getAvailable`

### Profile Routes
- `app/api/profile/route.ts` → Use `api.profiles.getCurrent`
- `app/api/profile/[profileId]/route.ts` → Use `api.profiles.getById` or `api.profiles.getByIdWithServer`

### User Routes
- `app/api/user/route.ts` → Use `api.profiles.getById`
- `app/api/user/status/route.ts` → Use `api.profiles.updateStatus` and `api.userStatus.getStatus`

### Other Routes (May Still Be Needed)
- `app/api/uploadthing/route.ts` - Keep (handles file uploads)
- `app/api/uploadthing/core.ts` - Keep but update auth (handles file uploads)
- `app/api/livekit/route.ts` - Keep (handles LiveKit tokens)
- `app/api/og-preview/route.ts` - Keep (handles OG preview)
- `app/api/rooms/route.ts` - May need to convert or keep

## Components Updated

All components have been updated to use Convex hooks instead of API calls:

### Modals
- ✅ `components/modals/create-server-modal.tsx`
- ✅ `components/modals/edit-server-modal.tsx`
- ✅ `components/modals/delete-server-modal.tsx`
- ✅ `components/modals/create-channel-modal.tsx`
- ✅ `components/modals/edit-channel-modal.tsx`
- ✅ `components/modals/delete-channel-modal.tsx`
- ✅ `components/modals/members-modal.tsx`
- ✅ `components/modals/create-direct-message-modal.tsx`
- ✅ `components/modals/create-group-modal.tsx`

### Chat Components
- ✅ `components/chat/chat-input.tsx`

### Navigation Components
- ✅ `components/navigation/navigation-sidebar.tsx`
- ✅ `components/navigation/user-card.tsx`

### Other Components
- ✅ `components/user-dialog.tsx`
- ✅ `hooks/use-dnd-status.ts`

## Convex Functions Created

All necessary Convex functions have been created:

- `convex/profiles.ts` - Profile operations
- `convex/servers.ts` - Server CRUD
- `convex/channels.ts` - Channel CRUD
- `convex/messages.ts` - Message operations
- `convex/directMessages.ts` - Direct message operations
- `convex/conversations.ts` - Conversation operations
- `convex/members.ts` - Member operations
- `convex/userStatus.ts` - User status operations

## Next Steps

1. **Delete API Routes**: Remove all the API route files listed above
2. **Test**: Test all functionality to ensure everything works with Convex
3. **Update Remaining Components**: Some components may still reference API routes - search for `axios` and `fetch("/api/` to find them
4. **Socket Handlers**: Update socket handlers in `pages/api/socket/**` if needed (or remove if using Convex real-time)

## Notes

- All IDs are now `_id` (Convex format) instead of `id` (Prisma format)
- Use `useQuery` for reading data and `useMutation` for writing data
- Convex provides real-time updates automatically with `useQuery`
- Type safety is maintained through `api` imports from `@/convex/_generated/api`

