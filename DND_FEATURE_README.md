# Do Not Disturb (DND) Mode Implementation

## Overview
The DND mode is now implemented to provide users with a distraction-free experience when they set their status to "Do Not Disturb".

## Features

### 🔕 Notification Suppression
- **Toast Notifications**: Native browser notifications are completely suppressed when in DND mode
- **Notification Dropdown**: Notifications still appear in the notification dropdown for later viewing
- **Real-time Updates**: Notification badges and counts still update in real-time

### 📞 Call Alert Suppression  
- **DM Call Modals**: Incoming call modals are completely suppressed when in DND mode
- **Ringtone**: No ringtone sound plays for incoming calls when in DND mode
- **Call Still Works**: Calls can still be initiated and received if the user manually navigates to conversations

### 🎨 Visual Indicators
- **User Card Banner**: A red banner appears at the top of the user card showing DND status
- **Status Badge**: The red status badge clearly indicates "Do Not Disturb" mode
- **Emoji Indicator**: 🔕 emoji is used throughout the UI to indicate muted state

## How It Works

### Status Detection
```typescript
// The system checks user status from multiple sources:
1. Clerk user metadata (user?.publicMetadata?.presence)
2. localStorage backup (user-presence-status)
3. Real-time socket updates
```

### Components Affected
- `SocketProvider`: Filters out call modals when in DND
- `DMCallModal`: Suppresses ringtone when in DND  
- `TopNavigation`: Suppresses toast notifications when in DND
- `TopNavigationBar`: Suppresses toast notifications when in DND
- `UserCard`: Shows visual DND indicator banner

### API Integration
- Status changes are handled by existing user status API
- No additional backend changes required
- Works with existing notification system

## Usage

### Setting DND Mode
1. Click on your user avatar in the bottom-right corner
2. Right-click or use the dropdown to access status options
3. Select "Do Not Disturb" from the status menu
4. The red banner will appear and notifications/calls will be suppressed

### Exiting DND Mode
1. Access the same status menu
2. Select any other status (Online, Idle, Offline)
3. Notifications and calls will resume normal behavior

## Technical Details

### File Structure
```
hooks/
  ├── use-dnd-status.ts          # DND status detection hook
components/
  ├── providers/
  │   └── dnd-provider.tsx       # DND context provider
  ├── modals/
  │   └── dm-call-modal.tsx      # Modified to respect DND
  ├── navigation/
  │   ├── user-card.tsx          # Shows DND indicator
  │   ├── top-navigation.tsx     # Suppresses notifications
  │   └── top-navigation-bar.tsx # Suppresses notifications
  └── providers/
      └── socket-provider.tsx    # Filters call modals
```

### Key Functions
- `shouldReceiveNotifications()`: Determines if toast notifications should show
- `shouldReceiveCallAlerts()`: Determines if call modals/sounds should play
- `useDNDStatus()`: Hook for checking current DND state
- `useDND()`: Context hook for accessing DND state globally

## Future Enhancements
- Custom notification schedules
- Partial DND (calls only, notifications only)
- Auto-DND based on time/calendar
- DND status sync across devices
