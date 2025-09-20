import { types } from 'cassandra-driver';
import { scylla, executeQuery, executeBatch } from './scylla';

// Type definitions for ScyllaDB models
export interface ScyllaProfile {
  id: types.Uuid;
  user_id: string;
  name: string;
  global_name?: string;
  image_url: string;
  email: string;
  custom_css?: string;
  status: string;
  prev_status?: string;
  bio?: string;
  presence_status?: string;
  pronouns?: string;
  banner_url?: string;
  allow_non_friend_dms: boolean;
  friend_request_privacy: string;
  created_at: Date;
  updated_at: Date;
}

export interface ScyllaServer {
  id: types.Uuid;
  name: string;
  image_url: string;
  invite_code: string;
  profile_id: types.Uuid;
  created_at: Date;
  updated_at: Date;
}

export interface ScyllaMember {
  server_id: types.Uuid;
  profile_id: types.Uuid;
  id: types.Uuid;
  role: string;
  created_at: Date;
  updated_at: Date;
}

export interface ScyllaChannel {
  server_id: types.Uuid;
  id: types.Uuid;
  name: string;
  type: string;
  profile_id: types.Uuid;
  category_id?: types.Uuid;
  position: number;
  created_at: Date;
  updated_at: Date;
}

export interface ScyllaMessage {
  channel_id: types.Uuid;
  created_at: Date;
  id: types.Uuid;
  content: string;
  member_id: types.Uuid;
  deleted: boolean;
  updated_at: Date;
}

export interface ScyllaDirectMessage {
  conversation_id: types.Uuid;
  created_at: Date;
  id: types.Uuid;
  content: string;
  profile_id: types.Uuid;
  member_id?: types.Uuid;
  deleted: boolean;
  reply_to_id?: types.Uuid;
  updated_at: Date;
}

export interface ScyllaConversation {
  id: types.Uuid;
  name?: string;
  type: string;
  creator_id?: types.Uuid;
  created_at: Date;
  updated_at: Date;
}

// Row mapping functions
function mapRowToProfile(row: any): ScyllaProfile {
  return {
    id: row.get('id'),
    user_id: row.get('user_id'),
    name: row.get('name'),
    global_name: row.get('global_name'),
    image_url: row.get('image_url'),
    email: row.get('email'),
    custom_css: row.get('custom_css'),
    status: row.get('status'),
    prev_status: row.get('prev_status'),
    bio: row.get('bio'),
    presence_status: row.get('presence_status'),
    pronouns: row.get('pronouns'),
    banner_url: row.get('banner_url'),
    allow_non_friend_dms: row.get('allow_non_friend_dms'),
    friend_request_privacy: row.get('friend_request_privacy'),
    created_at: row.get('created_at'),
    updated_at: row.get('updated_at')
  };
}

function mapRowToServer(row: any): ScyllaServer {
  return {
    id: row.get('id'),
    name: row.get('name'),
    image_url: row.get('image_url'),
    invite_code: row.get('invite_code'),
    profile_id: row.get('profile_id'),
    created_at: row.get('created_at'),
    updated_at: row.get('updated_at')
  };
}

function mapRowToMember(row: any): ScyllaMember {
  return {
    server_id: row.get('server_id'),
    profile_id: row.get('profile_id'),
    id: row.get('id'),
    role: row.get('role'),
    created_at: row.get('created_at'),
    updated_at: row.get('updated_at')
  };
}

function mapRowToChannel(row: any): ScyllaChannel {
  return {
    server_id: row.get('server_id'),
    id: row.get('id'),
    name: row.get('name'),
    type: row.get('type'),
    profile_id: row.get('profile_id'),
    category_id: row.get('category_id'),
    position: row.get('position'),
    created_at: row.get('created_at'),
    updated_at: row.get('updated_at')
  };
}

function mapRowToMessage(row: any): ScyllaMessage {
  return {
    channel_id: row.get('channel_id'),
    created_at: row.get('created_at'),
    id: row.get('id'),
    content: row.get('content'),
    member_id: row.get('member_id'),
    deleted: row.get('deleted'),
    updated_at: row.get('updated_at')
  };
}

// Utility functions for UUID generation and conversion
export function generateUuid(): types.Uuid {
  return types.Uuid.random();
}

export function fromUuidString(uuidString: string): types.Uuid {
  if (!uuidString) {
    throw new Error(`Invalid UUID string: ${uuidString}`);
  }
  try {
    return types.Uuid.fromString(uuidString);
  } catch (error) {
    console.error(`Error converting UUID string '${uuidString}':`, error);
    throw error;
  }
}

export function toUuidString(uuid: types.Uuid): string {
  const result = uuid.toString();
  console.log('toUuidString - input:', uuid, 'output:', result, 'output type:', typeof result);
  return result;
}

// Utility to ensure integers are 32-bit for ScyllaDB compatibility
export function toInt32(value: number | null | undefined): number {
  if (value == null) return 0;
  const num = Math.floor(Number(value));
  // Ensure it's within 32-bit signed integer range and return as integer
  const clampedNum = Math.max(-2147483648, Math.min(2147483647, num));
  return clampedNum | 0; // Bitwise OR with 0 ensures 32-bit integer
}

// Helper to get the number value from types.Integer
export function fromInt32(value: types.Integer | number): number {
  if (typeof value === 'number') return value;
  return value.toNumber();
}

// Profile queries
export class ProfileQueries {
  static async create(data: Partial<ScyllaProfile>): Promise<ScyllaProfile> {
    const id = data.id || generateUuid();
    const now = new Date();
    
    const query = `
      INSERT INTO profiles (
        id, user_id, name, global_name, image_url, email, custom_css,
        status, prev_status, bio, presence_status, pronouns, banner_url,
        allow_non_friend_dms, friend_request_privacy, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Convert UUIDs to strings for INSERT
    const params = [
      id instanceof types.Uuid ? toUuidString(id) : id,
      data.user_id,
      data.name,
      data.global_name || null,
      data.image_url,
      data.email,
      data.custom_css || null,
      data.status || 'OFFLINE',
      data.prev_status || null,
      data.bio || null,
      data.presence_status || null,
      data.pronouns || null,
      data.banner_url || null,
      data.allow_non_friend_dms ?? true,
      data.friend_request_privacy || 'everyone',
      data.created_at || now,
      data.updated_at || now
    ];
    
    await executeQuery(query, params);
    
    return {
      id: id instanceof types.Uuid ? id : fromUuidString(id),
      user_id: data.user_id!,
      name: data.name!,
      global_name: data.global_name,
      image_url: data.image_url!,
      email: data.email!,
      custom_css: data.custom_css,
      status: data.status || 'OFFLINE',
      prev_status: data.prev_status,
      bio: data.bio,
      presence_status: data.presence_status,
      pronouns: data.pronouns,
      banner_url: data.banner_url,
      allow_non_friend_dms: data.allow_non_friend_dms ?? true,
      friend_request_privacy: data.friend_request_privacy || 'everyone',
      created_at: data.created_at || now,
      updated_at: data.updated_at || now
    };
  }
  
  static async findByUserId(userId: string): Promise<ScyllaProfile | null> {
    const query = 'SELECT * FROM profiles WHERE user_id = ? LIMIT 1';
    const result = await executeQuery(query, [userId]);
    
    return result.rows.length > 0 ? mapRowToProfile(result.rows[0]) : null;
  }
  
  static async findById(id: string | types.Uuid): Promise<ScyllaProfile | null> {
    const uuid = typeof id === 'string' ? fromUuidString(id) : id;
    const query = 'SELECT * FROM profiles WHERE id = ? LIMIT 1';
    const result = await executeQuery(query, [uuid]);
    
    return result.rows.length > 0 ? mapRowToProfile(result.rows[0]) : null;
  }
  
  static async update(id: string | types.Uuid, data: Partial<ScyllaProfile>): Promise<ScyllaProfile | null> {
    console.log('ProfileQueries.update called with ID:', id, 'type:', typeof id);
    
    if (!id) {
      console.error('ProfileQueries.update: No ID provided');
      return null;
    }
    
    let uuid: types.Uuid;
    try {
      uuid = typeof id === 'string' ? fromUuidString(id) : id;
      console.log('Converted UUID:', uuid);
    } catch (error) {
      console.error('Failed to convert ID to UUID:', error);
      return null;
    }
    
    const now = new Date();
    
    const setClauses: string[] = [];
    const params: any[] = [];
    
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id' && value !== undefined) {
        setClauses.push(`${key} = ?`);
        params.push(value);
      }
    });
    
    if (setClauses.length === 0) {
      return this.findById(uuid);
    }
    
    setClauses.push('updated_at = ?');
    params.push(now);
    params.push(uuid);
    
    const query = `UPDATE profiles SET ${setClauses.join(', ')} WHERE id = ?`;
    console.log('About to execute query:', query);
    console.log('With parameters:', params);
    console.log('Parameter types:', params.map(p => typeof p));
    
    await executeQuery(query, params);
    
    return this.findById(uuid);
  }
}

// Server queries
export class ServerQueries {
  static async create(data: Partial<ScyllaServer>): Promise<ScyllaServer> {
    const id = data.id || generateUuid();
    const now = new Date();
    
    const query = `
      INSERT INTO servers (id, name, image_url, invite_code, profile_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Convert ALL parameters to ensure no UUID objects are passed
    const idString = id instanceof types.Uuid ? id.toString() : (typeof id === 'string' ? id : String(id));
    const profileIdString = data.profile_id instanceof types.Uuid ? data.profile_id.toString() : 
                            (typeof data.profile_id === 'string' ? data.profile_id : String(data.profile_id));
    
    const params = [
      idString,
      data.name,
      data.image_url,
      data.invite_code,
      profileIdString,
      data.created_at || now,
      data.updated_at || now
    ];
    
    console.log('ServerQueries.create - Final params:', params);
    console.log('ServerQueries.create - Final param types:', params.map(p => typeof p));
    console.log('ServerQueries.create - Param 0 (id):', params[0], 'type:', typeof params[0]);
    console.log('ServerQueries.create - Param 4 (profile_id):', params[4], 'type:', typeof params[4]);
    
    console.log('ServerQueries.create - params:', params);
    console.log('ServerQueries.create - param types:', params.map(p => typeof p));
    
    await executeQuery(query, params);
    
    return {
      id: id instanceof types.Uuid ? id : fromUuidString(id),
      name: data.name!,
      image_url: data.image_url!,
      invite_code: data.invite_code!,
      profile_id: data.profile_id!,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now
    };
  }
  
  static async findById(id: string | types.Uuid): Promise<ScyllaServer | null> {
    const uuid = typeof id === 'string' ? fromUuidString(id) : id;
    const query = 'SELECT * FROM servers WHERE id = ? LIMIT 1';
    const result = await executeQuery(query, [uuid]);
    
    return result.rows.length > 0 ? mapRowToServer(result.rows[0]) : null;
  }
  
  static async findByInviteCode(inviteCode: string): Promise<ScyllaServer | null> {
    const query = 'SELECT * FROM servers WHERE invite_code = ? LIMIT 1';
    const result = await executeQuery(query, [inviteCode]);
    
    return result.rows.length > 0 ? mapRowToServer(result.rows[0]) : null;
  }
  
  static async findByProfileId(profileId: string | types.Uuid): Promise<ScyllaServer[]> {
    const uuid = typeof profileId === 'string' ? fromUuidString(profileId) : profileId;
    const query = 'SELECT * FROM servers WHERE profile_id = ?';
    const result = await executeQuery(query, [uuid]);
    
    return result.rows.map(mapRowToServer);
  }

  static async update(id: string | types.Uuid, data: Partial<ScyllaServer>): Promise<ScyllaServer | null> {
    const uuid = typeof id === 'string' ? fromUuidString(id) : id;
    const now = new Date();
    
    // Build dynamic UPDATE query based on provided data
    const setClauses: string[] = [];
    const params: any[] = [];
    
    if (data.name !== undefined) {
      setClauses.push('name = ?');
      params.push(data.name);
    }
    if (data.image_url !== undefined) {
      setClauses.push('image_url = ?');
      params.push(data.image_url);
    }
    if (data.invite_code !== undefined) {
      setClauses.push('invite_code = ?');
      params.push(data.invite_code);
    }
    
    // Always update the updated_at timestamp
    setClauses.push('updated_at = ?');
    params.push(now);
    
    // Add the WHERE clause parameter
    params.push(uuid);
    
    if (setClauses.length === 1) {
      // Only updated_at was provided, nothing to update
      return await ServerQueries.findById(id);
    }
    
    const query = `UPDATE servers SET ${setClauses.join(', ')} WHERE id = ?`;
    await executeQuery(query, params);
    
    // Return the updated server
    return await ServerQueries.findById(id);
  }
}

// Member queries
export class MemberQueries {
  static async create(data: Partial<ScyllaMember>): Promise<ScyllaMember> {
    console.log('MemberQueries.create called with data:', data);
    
    const id = data.id || generateUuid();
    const now = new Date();
    
    const query = `
      INSERT INTO members (server_id, profile_id, id, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    // Convert UUIDs to strings for INSERT
    const params = [
      data.server_id instanceof types.Uuid ? toUuidString(data.server_id) : data.server_id,
      data.profile_id instanceof types.Uuid ? toUuidString(data.profile_id) : data.profile_id,
      id instanceof types.Uuid ? toUuidString(id) : id,
      data.role || 'GUEST',
      data.created_at || now,
      data.updated_at || now
    ];
    
    console.log('MemberQueries.create - params:', params);
    
    await executeQuery(query, params);
    
    const createdMember = {
      server_id: data.server_id!,
      profile_id: data.profile_id!,
      id: id instanceof types.Uuid ? id : fromUuidString(id),
      role: data.role || 'GUEST',
      created_at: data.created_at || now,
      updated_at: data.updated_at || now
    };
    
    console.log('MemberQueries.create - returning:', createdMember);
    return createdMember;
  }
  
  static async findByServerAndProfile(serverId: string | types.Uuid, profileId: string | types.Uuid): Promise<ScyllaMember | null> {
    console.log('MemberQueries.findByServerAndProfile called with:', { serverId, profileId });
    
    const serverUuid = typeof serverId === 'string' ? fromUuidString(serverId) : serverId;
    const profileUuid = typeof profileId === 'string' ? fromUuidString(profileId) : profileId;
    
    console.log('MemberQueries.findByServerAndProfile - converted UUIDs:', { serverUuid, profileUuid });
    
    const query = 'SELECT * FROM members WHERE server_id = ? AND profile_id = ? LIMIT 1';
    const result = await executeQuery(query, [serverUuid, profileUuid]);
    
    console.log('MemberQueries.findByServerAndProfile - query result:', result);
    
    const mapped = result.rows.length > 0 ? mapRowToMember(result.rows[0]) : null;
    console.log('MemberQueries.findByServerAndProfile - mapped result:', mapped);
    
    return mapped;
  }
  
  static async findByServerId(serverId: string | types.Uuid): Promise<ScyllaMember[]> {
    const uuid = typeof serverId === 'string' ? fromUuidString(serverId) : serverId;
    const query = 'SELECT * FROM members WHERE server_id = ?';
    const result = await executeQuery(query, [uuid]);
    
    return result.rows.map(mapRowToMember);
  }
  
  static async findByProfileId(profileId: string | types.Uuid): Promise<ScyllaMember[]> {
    const uuid = typeof profileId === 'string' ? fromUuidString(profileId) : profileId;
    const query = 'SELECT * FROM members WHERE profile_id = ?';
    const result = await executeQuery(query, [uuid]);
    
    return result.rows.map(mapRowToMember);
  }
}

// Channel queries
export class ChannelQueries {
  static async create(data: Partial<ScyllaChannel>): Promise<ScyllaChannel> {
    const id = data.id || generateUuid();
    const now = new Date();
    
    const query = `
      INSERT INTO channels (server_id, id, name, type, profile_id, category_id, position, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const position = toInt32(data.position);
    
    const params = [
      data.server_id,
      id,
      data.name,
      data.type || 'TEXT',
      data.profile_id,
      data.category_id || null,
      position,
      data.created_at || now,
      data.updated_at || now
    ];
    
    // Use explicit hints to ensure correct type marshalling for int32
    const options = {
      hints: [
        null, // server_id UUID
        null, // id UUID
        null, // name TEXT
        null, // type TEXT
        null, // profile_id UUID
        null, // category_id UUID
        'int', // position INT
        null, // created_at TIMESTAMP
        null  // updated_at TIMESTAMP
      ]
    };
    
    await executeQuery(query, params, options);
    
    return {
      server_id: data.server_id!,
      id,
      name: data.name!,
      type: data.type || 'TEXT',
      profile_id: data.profile_id!,
      category_id: data.category_id,
      position: position,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now
    };
  }
  
  static async findById(id: string | types.Uuid): Promise<ScyllaChannel | null> {
    const uuid = typeof id === 'string' ? fromUuidString(id) : id;
    const query = 'SELECT * FROM channels WHERE id = ? LIMIT 1';
    const result = await executeQuery(query, [uuid]);
    
    return result.rows.length > 0 ? mapRowToChannel(result.rows[0]) : null;
  }
  
  static async findByServerId(serverId: string | types.Uuid): Promise<ScyllaChannel[]> {
    const uuid = typeof serverId === 'string' ? fromUuidString(serverId) : serverId;
    const query = 'SELECT * FROM channels WHERE server_id = ?';
    const result = await executeQuery(query, [uuid]);
    
    return result.rows.map(mapRowToChannel);
  }
  
  static async update(id: string | types.Uuid, data: Partial<ScyllaChannel>): Promise<ScyllaChannel | null> {
    const uuid = typeof id === 'string' ? fromUuidString(id) : id;
    const now = new Date();
    
    const setParts: string[] = [];
    const params: any[] = [];
    const hints: string[] = [];
    
    if (data.name !== undefined) {
      setParts.push('name = ?');
      params.push(data.name);
      hints.push('text');
    }
    
    if (data.position !== undefined) {
      setParts.push('position = ?');
      params.push(toInt32(data.position));
      hints.push('int');
    }
    
    if (data.category_id !== undefined) {
      setParts.push('category_id = ?');
      params.push(data.category_id);
      hints.push('uuid');
    }
    
    if (setParts.length === 0) {
      return this.findById(id);
    }
    
    setParts.push('updated_at = ?');
    params.push(now);
    hints.push('timestamp');
    
    params.push(uuid);
    hints.push('uuid');
    
    const query = `UPDATE channels SET ${setParts.join(', ')} WHERE id = ?`;
    await executeQuery(query, params, { hints });
    
    return this.findById(id);
  }
}

// Message queries
export class MessageQueries {
  static async create(data: Partial<ScyllaMessage>): Promise<ScyllaMessage> {
    const id = data.id || generateUuid();
    const now = new Date();
    
    const query = `
      INSERT INTO messages (channel_id, created_at, id, content, member_id, deleted, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      data.channel_id,
      data.created_at || now,
      id,
      data.content,
      data.member_id,
      data.deleted || false,
      data.updated_at || now
    ];
    
    await executeQuery(query, params);
    
    return {
      channel_id: data.channel_id!,
      created_at: data.created_at || now,
      id,
      content: data.content!,
      member_id: data.member_id!,
      deleted: data.deleted || false,
      updated_at: data.updated_at || now
    };
  }
  
  static async findByChannelId(channelId: string | types.Uuid, limit: number = 50): Promise<ScyllaMessage[]> {
    console.log('MessageQueries.findByChannelId called with:', { channelId, limit });
    
    if (!channelId) {
      console.error('MessageQueries.findByChannelId: channelId is null/undefined');
      return [];
    }
    
    const uuid = typeof channelId === 'string' ? fromUuidString(channelId) : channelId;
    console.log('MessageQueries.findByChannelId converted UUID:', uuid);
    
    const query = 'SELECT * FROM messages WHERE channel_id = ? ORDER BY created_at DESC, id DESC LIMIT ?';
    const params = [uuid, limit];
    
    console.log('MessageQueries.findByChannelId executing query:', query, 'with params:', params);
    
    const result = await executeQuery(query, params);
    
    console.log('MessageQueries.findByChannelId result rows:', result.rows.length);
    
    return result.rows.map(mapRowToMessage);
  }
  
  static async findById(channelId: string | types.Uuid, messageId: string | types.Uuid): Promise<ScyllaMessage | null> {
    const channelUuid = typeof channelId === 'string' ? fromUuidString(channelId) : channelId;
    const messageUuid = typeof messageId === 'string' ? fromUuidString(messageId) : messageId;
    
    const query = 'SELECT * FROM messages WHERE channel_id = ? AND id = ? LIMIT 1';
    const result = await executeQuery(query, [channelUuid, messageUuid]);
    
    return result.rows.length > 0 ? mapRowToMessage(result.rows[0]) : null;
  }
}

// ============================================================================
// ROLE TYPES AND QUERIES
// ============================================================================

export interface ScyllaRole {
  server_id: types.Uuid;
  position: number;
  id: types.Uuid;
  name: string;
  color: string;
  hoisted: boolean;
  mentionable: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapRowToRole(row: any): ScyllaRole {
  return {
    server_id: row.server_id,
    position: row.position,
    id: row.id,
    name: row.name,
    color: row.color,
    hoisted: row.hoisted,
    mentionable: row.mentionable,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export class RoleQueries {
  static async create(data: Partial<ScyllaRole>): Promise<ScyllaRole> {
    const id = data.id || generateUuid();
    const now = new Date();
    
    const query = `
      INSERT INTO roles (server_id, position, id, name, color, hoisted, mentionable, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      data.server_id instanceof types.Uuid ? toUuidString(data.server_id) : data.server_id,
      data.position || 0,
      id instanceof types.Uuid ? toUuidString(id) : id,
      data.name || 'New Role',
      data.color || '#99aab5',
      data.hoisted || false,
      data.mentionable || false,
      data.created_at || now,
      data.updated_at || now
    ];
    
    const hints = ['uuid', 'int', 'uuid', 'text', 'text', 'boolean', 'boolean', 'timestamp', 'timestamp'];
    
    await executeQuery(query, params, { hints });
    
    return {
      server_id: data.server_id!,
      position: data.position || 0,
      id: id instanceof types.Uuid ? id : fromUuidString(id),
      name: data.name || 'New Role',
      color: data.color || '#99aab5',
      hoisted: data.hoisted || false,
      mentionable: data.mentionable || false,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now
    };
  }
  
  static async findByServerId(serverId: string | types.Uuid): Promise<ScyllaRole[]> {
    const serverUuid = typeof serverId === 'string' ? fromUuidString(serverId) : serverId;
    
    const query = 'SELECT * FROM roles WHERE server_id = ?';
    const result = await executeQuery(query, [serverUuid]);
    
    return result.rows.map(mapRowToRole);
  }
}

// ============================================================================
// CATEGORY TYPES AND QUERIES
// ============================================================================

export interface ScyllaCategory {
  id: types.Uuid;
  name: string;
  position: number;
  server_id: types.Uuid;
  created_at: Date;
  updated_at: Date;
}

function mapRowToCategory(row: any): ScyllaCategory {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    server_id: row.server_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export class CategoryQueries {
  static async create(data: Partial<ScyllaCategory>): Promise<ScyllaCategory> {
    const id = data.id || generateUuid();
    const now = new Date();
    
    const query = `
      INSERT INTO categories (id, name, position, server_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      id instanceof types.Uuid ? toUuidString(id) : id,
      data.name || 'New Category',
      data.position || 0,
      data.server_id instanceof types.Uuid ? toUuidString(data.server_id) : data.server_id,
      data.created_at || now,
      data.updated_at || now
    ];
    
    const hints = ['uuid', 'text', 'int', 'uuid', 'timestamp', 'timestamp'];
    
    await executeQuery(query, params, { hints });
    
    return {
      id: id instanceof types.Uuid ? id : fromUuidString(id),
      name: data.name || 'New Category',
      position: data.position || 0,
      server_id: data.server_id!,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now
    };
  }
  
  static async findByServerId(serverId: string | types.Uuid): Promise<ScyllaCategory[]> {
    const serverUuid = typeof serverId === 'string' ? fromUuidString(serverId) : serverId;
    
    const query = 'SELECT * FROM categories WHERE server_id = ?';
    const result = await executeQuery(query, [serverUuid]);
    
    return result.rows.map(mapRowToCategory);
  }
  
  static async findById(id: string | types.Uuid): Promise<ScyllaCategory | null> {
    const uuid = typeof id === 'string' ? fromUuidString(id) : id;
    
    const query = 'SELECT * FROM categories WHERE id = ? LIMIT 1';
    const result = await executeQuery(query, [uuid]);
    
    return result.rows.length > 0 ? mapRowToCategory(result.rows[0]) : null;
  }
  
  static async update(id: string | types.Uuid, data: Partial<ScyllaCategory>): Promise<ScyllaCategory | null> {
    const uuid = typeof id === 'string' ? fromUuidString(id) : id;
    const now = new Date();
    
    const setParts: string[] = [];
    const params: any[] = [];
    const hints: string[] = [];
    
    if (data.name !== undefined) {
      setParts.push('name = ?');
      params.push(data.name);
      hints.push('text');
    }
    
    if (data.position !== undefined) {
      setParts.push('position = ?');
      params.push(data.position);
      hints.push('int');
    }
    
    if (setParts.length === 0) {
      return this.findById(id);
    }
    
    setParts.push('updated_at = ?');
    params.push(now);
    hints.push('timestamp');
    
    params.push(uuid);
    hints.push('uuid');
    
    const query = `UPDATE categories SET ${setParts.join(', ')} WHERE id = ?`;
    await executeQuery(query, params, { hints });
    
    return this.findById(id);
  }
}

// ============================================================================
// ROLE PERMISSION TYPES AND QUERIES
// ============================================================================

export interface ScyllaRolePermission {
  role_id: types.Uuid;
  permission: string;
  scope: string;
  id: types.Uuid;
  grant_type: string;
  target_id: types.Uuid | null;
  created_at: Date;
  updated_at: Date;
}

function mapRowToRolePermission(row: any): ScyllaRolePermission {
  return {
    role_id: row.role_id,
    permission: row.permission,
    scope: row.scope,
    id: row.id,
    grant_type: row.grant_type,
    target_id: row.target_id,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export class RolePermissionQueries {
  static async create(data: Partial<ScyllaRolePermission>): Promise<ScyllaRolePermission> {
    const id = data.id || generateUuid();
    const now = new Date();
    
    const query = `
      INSERT INTO role_permissions (role_id, permission, scope, id, grant_type, target_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      data.role_id instanceof types.Uuid ? toUuidString(data.role_id) : data.role_id,
      data.permission || '',
      data.scope || 'server',
      id instanceof types.Uuid ? toUuidString(id) : id,
      data.grant_type || 'allow',
      data.target_id ? (data.target_id instanceof types.Uuid ? toUuidString(data.target_id) : data.target_id) : null,
      data.created_at || now,
      data.updated_at || now
    ];
    
    await executeQuery(query, params);
    
    return {
      role_id: data.role_id!,
      permission: data.permission || '',
      scope: data.scope || 'server',
      id: id instanceof types.Uuid ? id : fromUuidString(id),
      grant_type: data.grant_type || 'allow',
      target_id: data.target_id || null,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now
    };
  }
  
  static async findByRoleId(roleId: string | types.Uuid): Promise<ScyllaRolePermission[]> {
    const roleUuid = typeof roleId === 'string' ? fromUuidString(roleId) : roleId;
    
    const query = 'SELECT * FROM role_permissions WHERE role_id = ?';
    const result = await executeQuery(query, [roleUuid]);
    
    return result.rows.map(mapRowToRolePermission);
  }
}
