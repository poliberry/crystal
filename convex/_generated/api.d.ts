/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as channels from "../channels.js";
import type * as conversations from "../conversations.js";
import type * as directMessages from "../directMessages.js";
import type * as friends from "../friends.js";
import type * as lib_helpers from "../lib/helpers.js";
import type * as livekit from "../livekit.js";
import type * as members from "../members.js";
import type * as messages from "../messages.js";
import type * as mutedChannels from "../mutedChannels.js";
import type * as mutedServers from "../mutedServers.js";
import type * as notificationFilters from "../notificationFilters.js";
import type * as notificationSettings from "../notificationSettings.js";
import type * as notifications from "../notifications.js";
import type * as profiles from "../profiles.js";
import type * as roles from "../roles.js";
import type * as servers from "../servers.js";
import type * as typingIndicators from "../typingIndicators.js";
import type * as userCustomisation from "../userCustomisation.js";
import type * as userStatus from "../userStatus.js";
import type * as voiceParticipants from "../voiceParticipants.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  categories: typeof categories;
  channels: typeof channels;
  conversations: typeof conversations;
  directMessages: typeof directMessages;
  friends: typeof friends;
  "lib/helpers": typeof lib_helpers;
  livekit: typeof livekit;
  members: typeof members;
  messages: typeof messages;
  mutedChannels: typeof mutedChannels;
  mutedServers: typeof mutedServers;
  notificationFilters: typeof notificationFilters;
  notificationSettings: typeof notificationSettings;
  notifications: typeof notifications;
  profiles: typeof profiles;
  roles: typeof roles;
  servers: typeof servers;
  typingIndicators: typeof typingIndicators;
  userCustomisation: typeof userCustomisation;
  userStatus: typeof userStatus;
  voiceParticipants: typeof voiceParticipants;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
