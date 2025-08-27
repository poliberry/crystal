import { UserStatus } from "@prisma/client";

export interface DiscordPresence {
  status: UserStatus;
  customStatus?: string;
  isOnline: boolean;
  displayText: string;
}

/**
 * Discord-like presence logic
 * - INVISIBLE users appear as OFFLINE to others but maintain their actual status internally
 * - Custom status is separate from online status
 * - Users are "online" if their status is not OFFLINE or INVISIBLE
 */
export function getDiscordPresence(
  currentStatus: UserStatus | null,
  customStatus: string | null = null
): DiscordPresence {
  const status = currentStatus || UserStatus.OFFLINE;
  
  // Determine if user appears online to others
  const isOnline = status !== UserStatus.OFFLINE && status !== UserStatus.INVISIBLE;
  
  // Get status display text
  const statusText = getStatusDisplayText(status);
  
  // Clean up custom status - handle null, undefined, empty strings, and the string "undefined"
  const cleanCustomStatus = customStatus && 
    customStatus.trim() && 
    customStatus.trim() !== '' && 
    customStatus.trim() !== 'undefined' && 
    customStatus.trim() !== 'null' 
    ? customStatus.trim() 
    : undefined;
  
  // Use custom status if available, otherwise use status text
  const displayText = cleanCustomStatus || statusText;
  
  return {
    status: status === UserStatus.INVISIBLE ? UserStatus.OFFLINE : status, // INVISIBLE appears as OFFLINE to others
    customStatus: cleanCustomStatus,
    isOnline,
    displayText
  };
}

/**
 * Get the display text for a status
 */
export function getStatusDisplayText(status: UserStatus): string {
  switch (status) {
    case UserStatus.ONLINE:
      return "Online";
    case UserStatus.IDLE:
      return "Away";
    case UserStatus.DND:
      return "Do Not Disturb";
    case UserStatus.OFFLINE:
      return "Offline";
    case UserStatus.INVISIBLE:
      return "Offline"; // INVISIBLE appears as offline to others
    default:
      return "Offline";
  }
}

/**
 * Get the color for a status (for status indicators)
 */
export function getStatusColor(status: UserStatus): string {
  switch (status) {
    case UserStatus.ONLINE:
      return "bg-green-500";
    case UserStatus.IDLE:
      return "bg-yellow-500";
    case UserStatus.DND:
      return "bg-red-500";
    case UserStatus.OFFLINE:
    case UserStatus.INVISIBLE:
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
}

/**
 * Check if a user should appear in online member lists
 */
export function shouldShowInOnlineList(
  status: UserStatus | null,
  customStatus: string | null = null
): boolean {
  const presence = getDiscordPresence(status, customStatus);
  return presence.isOnline;
}
