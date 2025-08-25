# New Simple Permissions System

## Overview
I've created a completely new, simplified permissions system to replace the existing one. This system is more reliable, easier to understand, and handles the ADMINISTRATOR permission correctly.

## Files Created/Modified

### Core System
- `lib/simple-permissions.ts` - New permissions manager class
- `hooks/use-simple-permissions.ts` - React hooks for permissions
- `app/api/simple-permissions/check/route.ts` - Single permission check API
- `app/api/simple-permissions/batch/route.ts` - Batch permission check API
- `app/api/simple-permissions/admin/route.ts` - Admin permission management API

### Testing & Management
- `components/admin-manager.tsx` - Component to grant/revoke admin permissions
- `app/test-permissions/page.tsx` - Test dashboard for permissions
- `app/api/current-member/route.ts` - Get current member ID for testing

### Updated Components
- `components/chat/chat-input.tsx` - Now uses the new permissions system

## How It Works

### Priority Order (Highest to Lowest)
1. **Legacy Admin Role** - If `member.role === 'ADMIN'`, grants all permissions
2. **Administrator Permission** - If user has `ADMINISTRATOR` permission, grants all permissions  
3. **User Overrides** - Direct permission grants/denies for specific users
4. **Role Permissions** - Permissions from roles (DENY > ALLOW, highest role wins)
5. **Default Deny** - If nothing matches, permission is denied

### Key Features
- **Always grants all permissions to ADMINISTRATORs and legacy admins**
- **Proper priority handling** - User overrides beat role permissions
- **DENY beats ALLOW** within the same priority level
- **Simplified API** with clear results
- **Better error handling** and logging

## Usage Examples

### Basic Permission Check
```typescript
import { useSimplePermission } from "@/hooks/use-simple-permissions";

const { granted, reason, loading } = useSimplePermission({
  memberId: "member_123",
  permission: PermissionType.SEND_MESSAGES,
  scope: PermissionScope.CHANNEL,
  targetId: "channel_456"
});
```

### Multiple Permissions
```typescript
import { useSimplePermissions } from "@/hooks/use-simple-permissions";

const permissions = useSimplePermissions({
  memberId: "member_123",
  permissions: [
    { permission: PermissionType.SEND_MESSAGES },
    { permission: PermissionType.ATTACH_FILES },
    { permission: PermissionType.ADMINISTRATOR }
  ]
});

// Check permissions
const canSend = permissions.hasPermission(PermissionType.SEND_MESSAGES).granted;
const isAdmin = permissions.isAdmin;
```

### Server Permissions (Convenience Hook)
```typescript
import { useServerPermissions } from "@/hooks/use-simple-permissions";

const permissions = useServerPermissions("member_123");

// Pre-computed common permissions
const {
  isAdmin,
  canSendMessages,
  canManageChannels,
  canManageRoles,
  canManageServer
} = permissions;
```

### Channel Permissions (Convenience Hook)
```typescript
import { useChannelPermissions } from "@/hooks/use-simple-permissions";

const permissions = useChannelPermissions("member_123", "channel_456");
const canSend = permissions.canSendMessages;
```

## Testing the System

1. **Visit `/test-permissions`** to access the test dashboard
2. **Use the Admin Manager** to grant yourself admin permissions
3. **Check permission status** in real-time
4. **Test chat input** - should now work properly with admin permissions

## API Endpoints

### Check Single Permission
```bash
POST /api/simple-permissions/check
{
  "memberId": "member_123",
  "permission": "SEND_MESSAGES",
  "scope": "CHANNEL",
  "targetId": "channel_456"
}
```

### Check Multiple Permissions
```bash
POST /api/simple-permissions/batch
{
  "memberId": "member_123",
  "permissions": [
    { "permission": "SEND_MESSAGES", "scope": "CHANNEL", "targetId": "channel_456" },
    { "permission": "ADMINISTRATOR" }
  ]
}
```

### Grant/Revoke Admin
```bash
POST /api/simple-permissions/admin
{
  "memberId": "member_123",
  "action": "grant" // or "revoke"
}
```

## Migration Notes

- **The old permissions system** in `lib/permissions.ts` is still there but no longer used by chat-input
- **Legacy admin roles** (`member.role === 'ADMIN'`) are still supported
- **Database schema** remains unchanged - this works with existing data
- **Gradual migration** - you can update components one by one to use the new system

## Why This Fixes Your Issue

The old system had several problems:
1. Complex logic that could miss edge cases
2. Inconsistent handling of ADMINISTRATOR permissions
3. Frontend not properly checking for admin status
4. Race conditions in permission loading

The new system:
1. **Always grants permissions to administrators first**
2. **Clear, simple logic** that's easy to debug
3. **Proper frontend integration** with computed permission properties
4. **Better error handling** and fallbacks

Your ADMINISTRATOR permission issue should now be completely resolved!
