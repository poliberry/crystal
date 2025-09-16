# Field Name Mapping Guide

This document provides a comprehensive mapping between old Prisma field names and new ScyllaDB field names.

## Profile Fields

| Old Prisma Field | New ScyllaDB Field | Type | Notes |
|------------------|-------------------|------|-------|
| `userId` | `user_id` | string | External user identifier |
| `imageUrl` | `image_url` | string | Profile image URL |
| `presenceStatus` | `presence_status` | string \| undefined | Custom presence message |
| `prevStatus` | `prev_status` | UserStatus \| undefined | Previous status for transitions |
| `globalName` | `global_name` | string \| undefined | Display name |
| `bannerUrl` | `banner_url` | string \| undefined | Profile banner image |
| `createdAt` | `created_at` | Date | Creation timestamp |
| `updatedAt` | `updated_at` | Date | Last update timestamp |

## Server Fields

| Old Prisma Field | New ScyllaDB Field | Type | Notes |
|------------------|-------------------|------|-------|
| `profileId` | `profile_id` | string | Owner profile ID |
| `inviteCode` | `invite_code` | string | Server invite code |
| `imageUrl` | `image_url` | string | Server icon URL |
| `createdAt` | `created_at` | Date | Creation timestamp |
| `updatedAt` | `updated_at` | Date | Last update timestamp |

## Member Fields

| Old Prisma Field | New ScyllaDB Field | Type | Notes |
|------------------|-------------------|------|-------|
| `serverId` | `server_id` | string | Server identifier |
| `profileId` | `profile_id` | string | Member profile ID |
| `createdAt` | `created_at` | Date | Join timestamp |
| `updatedAt` | `updated_at` | Date | Last update timestamp |

## Channel Fields

| Old Prisma Field | New ScyllaDB Field | Type | Notes |
|------------------|-------------------|------|-------|
| `serverId` | `server_id` | string | Parent server ID |
| `categoryId` | `category_id` | string \| undefined | Category ID if applicable |
| `profileId` | `profile_id` | string | Creator profile ID |
| `createdAt` | `created_at` | Date | Creation timestamp |
| `updatedAt` | `updated_at` | Date | Last update timestamp |

## Message Fields

| Old Prisma Field | New ScyllaDB Field | Type | Notes |
|------------------|-------------------|------|-------|
| `channelId` | `channel_id` | string | Parent channel ID |
| `memberId` | `member_id` | string | Author member ID |
| `createdAt` | `created_at` | Date | Message timestamp |
| `updatedAt` | `updated_at` | Date | Last edit timestamp |

## Role Fields

| Old Prisma Field | New ScyllaDB Field | Type | Notes |
|------------------|-------------------|------|-------|
| `serverId` | `server_id` | string | Parent server ID |
| `createdAt` | `created_at` | Date | Creation timestamp |
| `updatedAt` | `updated_at` | Date | Last update timestamp |

## Database Query Changes

### Before (Prisma)
```typescript
// Find profile by user ID
const profile = await db.profile.findUnique({
  where: { userId: user.id }
});

// Update with nested relations
const server = await db.server.update({
  where: { id: serverId },
  data: {
    members: {
      create: [{ profileId: profile.id, role: MemberRole.ADMIN }]
    }
  }
});
```

### After (ScyllaDB)
```typescript
// Find profile by user ID
const profile = await db.profile.findByUserId(user.id);

// Create server and member separately
const server = await db.server.create({
  profile_id: profile.id,
  name,
  image_url: imageUrl,
  invite_code: uuid(),
});

const member = await db.member.create({
  server_id: server.id,
  profile_id: profile.id,
  role: MemberRole.ADMIN,
});
```

## Component Updates

### React Components
When accessing data in React components, update field references:

```tsx
// Before
<img src={profile.imageUrl} />
<span>{profile.presenceStatus}</span>
<time>{dayjs(profile.createdAt).format("MMM YYYY")}</time>

// After
<img src={profile.image_url} />
<span>{profile.presence_status}</span>
<time>{dayjs(profile.created_at).format("MMM YYYY")}</time>
```

### Pusher Event Data
Update Pusher event payloads:

```typescript
// Before
await pusherServer.trigger("presence", "user:status:update", {
  userId: profile.userId,
  presenceStatus: profile.presenceStatus,
});

// After  
await pusherServer.trigger("presence", "user:status:update", {
  userId: profile.user_id,
  presenceStatus: profile.presence_status,
});
```

## Migration Checklist

### API Endpoints ✅
- [x] `/api/profile/route.ts` - Updated findUnique to findById
- [x] `/api/servers/route.ts` - Updated server creation
- [x] `/api/servers/[serverId]/leave/route.ts` - Updated member management
- [x] `/api/servers/[serverId]/members/route.ts` - Updated member queries
- [x] `/pages/api/user/status.ts` - Updated status management
- [x] `/pages/api/user/discord-status.ts` - Updated presence management

### Core Libraries ✅
- [x] `lib/db.ts` - ScyllaDB client and repositories
- [x] `lib/current-profile.ts` - Updated profile queries
- [x] `lib/current-profile-pages.ts` - Updated profile queries
- [x] `lib/initial-profile.ts` - Updated profile creation

### Components ✅
- [x] `components/user-dialog.tsx` - Updated field references
- [x] `components/server/enhanced-member-sidebar-pusher.tsx` - Updated field references

### Remaining Files to Update
- [ ] Socket handlers in `/pages/api/socket/`
- [ ] Notification system in `lib/notifications.ts`
- [ ] Permission system in `lib/permissions.ts`
- [ ] Conversation system in `lib/conversation.ts`

## Search and Replace Patterns

Use these patterns to find remaining field references:

```bash
# Find camelCase field references
grep -r "\.userId\|\.imageUrl\|\.profileId\|\.serverId\|\.channelId\|\.createdAt\|\.updatedAt\|\.presenceStatus\|\.globalName\|\.bannerUrl" .

# Find Prisma imports
grep -r "@prisma/client" .

# Find database queries that need updating
grep -r "findUnique\|findMany\|findFirst" .
```

## Type Definitions

Ensure TypeScript interfaces match the new field names:

```typescript
// Updated Profile interface example
interface ProfileData {
  id: string;
  user_id: string;
  name: string;
  image_url: string;
  presence_status?: string;
  created_at: Date;
  updated_at: Date;
}
```
