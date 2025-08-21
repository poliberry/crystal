import { UserStatus } from "@prisma/client";

export interface PresenceStatus {
  status: UserStatus;
  displayStatus: string;
  isOnline: boolean;
}

/**
 * Determine the correct presence status for a user
 */
export function getPresenceStatus(
  currentStatus: UserStatus | null,
  prevStatus: UserStatus | null,
  presenceStatus: string | null
): PresenceStatus {
  // If user has a custom presence status, use that
  if (presenceStatus) {
    return {
      status: currentStatus || UserStatus.ONLINE,
      displayStatus: presenceStatus,
      isOnline: currentStatus !== UserStatus.OFFLINE && currentStatus !== UserStatus.INVISIBLE
    };
  }

  // If no prevStatus is set and current status is OFFLINE, default to ONLINE
  if (!prevStatus && currentStatus === UserStatus.OFFLINE) {
    return {
      status: UserStatus.ONLINE,
      displayStatus: 'Online',
      isOnline: true
    };
  }

  // If prevStatus exists and current status is OFFLINE, use prevStatus
  if (prevStatus && currentStatus === UserStatus.OFFLINE) {
    return {
      status: prevStatus,
      displayStatus: getStatusDisplayName(prevStatus),
      isOnline: prevStatus !== UserStatus.OFFLINE && prevStatus !== UserStatus.INVISIBLE
    };
  }

  // Use current status
  return {
    status: currentStatus || UserStatus.ONLINE,
    displayStatus: getStatusDisplayName(currentStatus || UserStatus.ONLINE),
    isOnline: (currentStatus || UserStatus.ONLINE) !== UserStatus.OFFLINE && 
              (currentStatus || UserStatus.ONLINE) !== UserStatus.INVISIBLE
  };
}

/**
 * Get display name for status
 */
export function getStatusDisplayName(status: UserStatus): string {
  switch (status) {
    case UserStatus.ONLINE:
      return 'Online';
    case UserStatus.IDLE:
      return 'Away';
    case UserStatus.DND:
      return 'Do Not Disturb';
    case UserStatus.OFFLINE:
      return 'Offline';
    case UserStatus.INVISIBLE:
      return 'Invisible';
    default:
      return 'Online';
  }
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: UserStatus): string {
  switch (status) {
    case UserStatus.ONLINE:
      return 'bg-green-500';
    case UserStatus.IDLE:
      return 'bg-yellow-500';
    case UserStatus.DND:
      return 'bg-red-500';
    case UserStatus.OFFLINE:
    case UserStatus.INVISIBLE:
      return 'bg-gray-500';
    default:
      return 'bg-green-500';
  }
}
