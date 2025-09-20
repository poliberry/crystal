import {
  ProfileQueries,
  ServerQueries,
  MemberQueries,
  ChannelQueries,
  MessageQueries,
  RoleQueries,
  CategoryQueries,
  RolePermissionQueries,
  ScyllaProfile,
  ScyllaServer,
  ScyllaMember,
  ScyllaChannel,
  ScyllaMessage,
  ScyllaRole,
  ScyllaCategory,
  ScyllaRolePermission,
  generateUuid,
  fromUuidString,
  toUuidString,
  toInt32,
  fromInt32
} from './scylla-queries';
import { types } from 'cassandra-driver';

// Adapter classes to maintain compatibility with existing Prisma-based code
// These classes provide the same interface as Prisma models but use ScyllaDB underneath

class ProfileAdapter {
  async create(createOptions: {
    data: {
      userId: string;
      name: string;
      globalName?: string;
      imageUrl: string;
      email: string;
      customCss?: string;
      status?: string;
      prevStatus?: string;
      bio?: string;
      presenceStatus?: string;
      pronouns?: string;
      bannerUrl?: string;
      allowNonFriendDMs?: boolean;
      friendRequestPrivacy?: string;
    }
  } | {
    userId: string;
    name: string;
    globalName?: string;
    imageUrl: string;
    email: string;
    customCss?: string;
    status?: string;
    prevStatus?: string;
    bio?: string;
    presenceStatus?: string;
    pronouns?: string;
    bannerUrl?: string;
    allowNonFriendDMs?: boolean;
    friendRequestPrivacy?: string;
  }) {
    // Handle both Prisma format ({ data: ... }) and direct format
    const data = 'data' in createOptions ? createOptions.data : createOptions;
    
    const scyllaData = {
      user_id: data.userId,
      name: data.name,
      global_name: data.globalName,
      image_url: data.imageUrl,
      email: data.email,
      custom_css: data.customCss,
      status: data.status || 'OFFLINE',
      prev_status: data.prevStatus,
      bio: data.bio,
      presence_status: data.presenceStatus,
      pronouns: data.pronouns,
      banner_url: data.bannerUrl,
      allow_non_friend_dms: data.allowNonFriendDMs ?? true,
      friend_request_privacy: data.friendRequestPrivacy || 'everyone'
    };
    
    const result = await ProfileQueries.create(scyllaData);
    return this.mapToCompatibleFormat(result);
  }
  
  async findFirst(where: { userId?: string; id?: string } | { [key: string]: any }) {
    // Handle both direct parameter format and wrapped 'where' format
    const actualWhere = 'where' in where ? where.where : where;
    
    if (actualWhere.userId) {
      const result = await ProfileQueries.findByUserId(actualWhere.userId);
      return result ? this.mapToCompatibleFormat(result) : null;
    }
    
    if (actualWhere.id) {
      const result = await ProfileQueries.findById(actualWhere.id);
      return result ? this.mapToCompatibleFormat(result) : null;
    }
    
    return null;
  }
  
  async findUnique(options: { where: { userId?: string; id?: string } }) {
    return this.findFirst(options.where);
  }
  
  async update(options: {
    where: { id?: string; userId?: string };
    data: Partial<{
      name?: string;
      imageUrl?: string;
      email?: string;
      status?: string;
      prevStatus?: string;
      presenceStatus?: string;
      bio?: string;
      customCss?: string;
    }>;
  }) {
    const { where, data } = options;
    
    // Safety check for valid ID or userId
    if (!where.id && !where.userId) {
      console.error('ProfileAdapter.update: No valid identifier provided:', where);
      return null;
    }
    
    console.log('ProfileAdapter.update called with:', { where, data });
    
    // If we have userId, need to find the profile first to get the id
    let profileId = where.id;
    if (!profileId && where.userId) {
      const profile = await this.findFirst({ userId: where.userId });
      if (!profile) {
        console.error('ProfileAdapter.update: Profile not found for userId:', where.userId);
        return null;
      }
      profileId = profile.id;
    }
    
    const scyllaData: any = {};
    
    if (data.name) scyllaData.name = data.name;
    if (data.imageUrl) scyllaData.image_url = data.imageUrl;
    if (data.email) scyllaData.email = data.email;
    if (data.status) scyllaData.status = data.status;
    if (data.prevStatus) scyllaData.prev_status = data.prevStatus;
    if (data.presenceStatus) scyllaData.presence_status = data.presenceStatus;
    if (data.bio) scyllaData.bio = data.bio;
    if (data.customCss) scyllaData.custom_css = data.customCss;
    
    const result = await ProfileQueries.update(profileId!, scyllaData);
    return result ? this.mapToCompatibleFormat(result) : null;
  }
  
  private mapToCompatibleFormat(profile: ScyllaProfile) {
    return {
      id: toUuidString(profile.id),
      userId: profile.user_id,
      name: profile.name,
      globalName: profile.global_name || null,
      imageUrl: profile.image_url,
      email: profile.email,
      customCss: profile.custom_css || null,
      status: profile.status,
      prevStatus: profile.prev_status || null,
      bio: profile.bio || null,
      presenceStatus: profile.presence_status || null,
      pronouns: profile.pronouns || null,
      bannerUrl: profile.banner_url || null,
      allowNonFriendDMs: profile.allow_non_friend_dms,
      friendRequestPrivacy: profile.friend_request_privacy,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    };
  }
}

class ServerAdapter {
  async create(createOptions: {
    data: {
      profileId: string;
      name: string;
      imageUrl: string;
      inviteCode: string;
    }
  } | {
    profileId: string;
    name: string;
    imageUrl: string;
    inviteCode: string;
  }) {
    const data = 'data' in createOptions ? createOptions.data : createOptions;
    
    const scyllaData = {
      profile_id: fromUuidString(data.profileId),
      name: data.name,
      image_url: data.imageUrl,
      invite_code: data.inviteCode
    };
    
    const result = await ServerQueries.create(scyllaData);
    return this.mapToCompatibleFormat(result);
  }
  
  async findFirst(where: { id?: string; inviteCode?: string }) {
    if (where.id) {
      const result = await ServerQueries.findById(where.id);
      return result ? this.mapToCompatibleFormat(result) : null;
    }
    
    if (where.inviteCode) {
      const result = await ServerQueries.findByInviteCode(where.inviteCode);
      return result ? this.mapToCompatibleFormat(result) : null;
    }
    
    return null;
  }
  
  async findMany(where: { profileId?: string }) {
    if (where.profileId) {
      const results = await ServerQueries.findByProfileId(where.profileId);
      return results.map(result => this.mapToCompatibleFormat(result));
    }

    return [];
  }

  async update(options: {
    where: { id: string; profileId?: string };
    data: { inviteCode?: string; name?: string; imageUrl?: string };
  }) {
    const { where, data } = options;
    const scyllaData: any = {};
    
    if (data.inviteCode) scyllaData.invite_code = data.inviteCode;
    if (data.name) scyllaData.name = data.name;
    if (data.imageUrl) scyllaData.image_url = data.imageUrl;
    
    const result = await ServerQueries.update(where.id, scyllaData);
    return result ? this.mapToCompatibleFormat(result) : null;
  }

  private mapToCompatibleFormat(server: ScyllaServer) {
    return {
      id: toUuidString(server.id),
      name: server.name,
      imageUrl: server.image_url,
      inviteCode: server.invite_code,
      profileId: toUuidString(server.profile_id),
      createdAt: server.created_at,
      updatedAt: server.updated_at
    };
  }
}

class MemberAdapter {
  async create(createOptions: {
    data: {
      serverId: string;
      profileId: string;
      role?: string;
    }
  } | {
    serverId: string;
    profileId: string;
    role?: string;
  }) {
    const data = 'data' in createOptions ? createOptions.data : createOptions;
    
    console.log('MemberAdapter.create called with:', data);
    
    const scyllaData = {
      server_id: fromUuidString(data.serverId),
      profile_id: fromUuidString(data.profileId),
      role: data.role || 'GUEST'
    };
    
    console.log('MemberAdapter.create - scyllaData:', scyllaData);
    
    const result = await MemberQueries.create(scyllaData);
    return this.mapToCompatibleFormat(result);
  }
  
  async findFirst(where: { serverId: string; profileId: string }) {
    console.log('MemberAdapter.findFirst called with:', where);
    const result = await MemberQueries.findByServerAndProfile(where.serverId, where.profileId);
    console.log('MemberAdapter.findFirst - query result:', result);
    const mapped = result ? this.mapToCompatibleFormat(result) : null;
    console.log('MemberAdapter.findFirst - mapped result:', mapped);
    return mapped;
  }
  
  async findMany(where: { serverId?: string; profileId?: string }) {
    if (where.serverId) {
      const results = await MemberQueries.findByServerId(where.serverId);
      return results.map(result => this.mapToCompatibleFormat(result));
    }
    
    if (where.profileId) {
      const results = await MemberQueries.findByProfileId(where.profileId);
      return results.map(result => this.mapToCompatibleFormat(result));
    }
    
    return [];
  }
  
  private mapToCompatibleFormat(member: ScyllaMember) {
    return {
      id: toUuidString(member.id),
      serverId: toUuidString(member.server_id),
      profileId: toUuidString(member.profile_id),
      role: member.role,
      createdAt: member.created_at,
      updatedAt: member.updated_at
    };
  }
}

class ChannelAdapter {
  async create(createOptions: {
    data: {
      serverId: string;
      profileId: string;
      name: string;
      type?: string;
      position?: number;
      categoryId?: string;
    }
  } | {
    serverId: string;
    profileId: string;
    name: string;
    type?: string;
    position?: number;
    categoryId?: string;
  }) {
    const data = 'data' in createOptions ? createOptions.data : createOptions;
    
    const scyllaData = {
      server_id: fromUuidString(data.serverId),
      profile_id: fromUuidString(data.profileId),
      name: data.name,
      type: data.type || 'TEXT',
      position: data.position || 0,
      category_id: data.categoryId ? fromUuidString(data.categoryId) : undefined
    };
    
    const result = await ChannelQueries.create(scyllaData);
    return this.mapToCompatibleFormat(result);
  }
  
  async findFirst(where: { id: string }) {
    const result = await ChannelQueries.findById(where.id);
    return result ? this.mapToCompatibleFormat(result) : null;
  }
  
  async findMany(where: { serverId: string }) {
    const results = await ChannelQueries.findByServerId(where.serverId);
    return results.map(result => this.mapToCompatibleFormat(result));
  }
  
  private mapToCompatibleFormat(channel: ScyllaChannel) {
    return {
      id: toUuidString(channel.id),
      serverId: toUuidString(channel.server_id),
      profileId: toUuidString(channel.profile_id),
      name: channel.name,
      type: channel.type,
      position: channel.position,
      categoryId: channel.category_id ? toUuidString(channel.category_id) : null,
      createdAt: channel.created_at,
      updatedAt: channel.updated_at
    };
  }
}

class MessageAdapter {
  async create(data: {
    channelId: string;
    memberId: string;
    content: string;
  }) {
    const scyllaData = {
      channel_id: fromUuidString(data.channelId),
      member_id: fromUuidString(data.memberId),
      content: data.content
    };
    
    const result = await MessageQueries.create(scyllaData);
    return this.mapToCompatibleFormat(result);
  }
  
  async findMany(where: { channelId: string }, options?: { take?: number; orderBy?: any }) {
    const limit = options?.take || 50;
    const results = await MessageQueries.findByChannelId(where.channelId, limit);
    return results.map(result => this.mapToCompatibleFormat(result));
  }
  
  private mapToCompatibleFormat(message: ScyllaMessage) {
    return {
      id: toUuidString(message.id),
      channelId: toUuidString(message.channel_id),
      memberId: toUuidString(message.member_id),
      content: message.content,
      deleted: message.deleted,
      createdAt: message.created_at,
      updatedAt: message.updated_at
    };
  }
}

// ============================================================================
// ROLE ADAPTER
// ============================================================================

class RoleAdapter {
  async create(createOptions: {
    data: {
      serverId: string;
      name: string;
      color?: string;
      position?: number;
      hoisted?: boolean;
      mentionable?: boolean;
    }
  } | {
    serverId: string;
    name: string;
    color?: string;
    position?: number;
    hoisted?: boolean;
    mentionable?: boolean;
  }) {
    const data = 'data' in createOptions ? createOptions.data : createOptions;
    
    const scyllaData = {
      server_id: fromUuidString(data.serverId),
      name: data.name,
      color: data.color || '#99aab5',
      position: data.position || 0,
      hoisted: data.hoisted || false,
      mentionable: data.mentionable || false
    };
    
    const result = await RoleQueries.create(scyllaData);
    return this.mapToCompatibleFormat(result);
  }
  
  async findMany(where: { serverId: string }) {
    const results = await RoleQueries.findByServerId(where.serverId);
    return results.map(result => this.mapToCompatibleFormat(result));
  }
  
  private mapToCompatibleFormat(role: ScyllaRole) {
    return {
      id: toUuidString(role.id),
      serverId: toUuidString(role.server_id),
      name: role.name,
      color: role.color,
      position: role.position,
      hoisted: role.hoisted,
      mentionable: role.mentionable,
      createdAt: role.created_at,
      updatedAt: role.updated_at
    };
  }
}

// ============================================================================
// CATEGORY ADAPTER
// ============================================================================

class CategoryAdapter {
  async create(createOptions: {
    data: {
      serverId: string;
      name: string;
      position?: number;
    }
  } | {
    serverId: string;
    name: string;
    position?: number;
  }) {
    const data = 'data' in createOptions ? createOptions.data : createOptions;
    
    const scyllaData = {
      server_id: fromUuidString(data.serverId),
      name: data.name,
      position: data.position || 0
    };
    
    const result = await CategoryQueries.create(scyllaData);
    return this.mapToCompatibleFormat(result);
  }
  
  async findMany(where: { serverId: string }) {
    const results = await CategoryQueries.findByServerId(where.serverId);
    return results.map(result => this.mapToCompatibleFormat(result));
  }
  
  async findFirst(where: { id: string }) {
    const result = await CategoryQueries.findById(where.id);
    return result ? this.mapToCompatibleFormat(result) : null;
  }
  
  private mapToCompatibleFormat(category: ScyllaCategory) {
    return {
      id: toUuidString(category.id),
      serverId: toUuidString(category.server_id),
      name: category.name,
      position: category.position,
      createdAt: category.created_at,
      updatedAt: category.updated_at
    };
  }
}

// ============================================================================
// ROLE PERMISSION ADAPTER
// ============================================================================

class RolePermissionAdapter {
  async create(createOptions: {
    data: {
      roleId: string;
      permission: string;
      scope?: string;
      grantType?: string;
      targetId?: string;
    }
  } | {
    roleId: string;
    permission: string;
    scope?: string;
    grantType?: string;
    targetId?: string;
  }) {
    const data = 'data' in createOptions ? createOptions.data : createOptions;
    
    const scyllaData = {
      role_id: fromUuidString(data.roleId),
      permission: data.permission,
      scope: data.scope || 'server',
      grant_type: data.grantType || 'allow',
      target_id: data.targetId ? fromUuidString(data.targetId) : null
    };
    
    const result = await RolePermissionQueries.create(scyllaData);
    return this.mapToCompatibleFormat(result);
  }
  
  async findMany(where: { roleId: string }) {
    const results = await RolePermissionQueries.findByRoleId(where.roleId);
    return results.map(result => this.mapToCompatibleFormat(result));
  }
  
  private mapToCompatibleFormat(permission: ScyllaRolePermission) {
    return {
      id: toUuidString(permission.id),
      roleId: toUuidString(permission.role_id),
      permission: permission.permission,
      scope: permission.scope,
      grantType: permission.grant_type,
      targetId: permission.target_id ? toUuidString(permission.target_id) : null,
      createdAt: permission.created_at,
      updatedAt: permission.updated_at
    };
  }
}

// Main database adapter that mimics Prisma's interface
export class ScyllaDBAdapter {
  profile = new ProfileAdapter();
  server = new ServerAdapter();
  member = new MemberAdapter();
  channel = new ChannelAdapter();
  message = new MessageAdapter();
  role = new RoleAdapter();
  category = new CategoryAdapter();
  rolePermission = new RolePermissionAdapter();
  
  // Temporary conversation adapters (to be implemented)
  conversationMember = {
    findMany: async () => [],
    findFirst: async () => null,
    create: async () => null,
    update: async () => null,
    delete: async () => null
  };
  
  conversation = {
    findMany: async () => [],
    findFirst: async () => null,
    create: async () => null,
    update: async () => null,
    delete: async () => null
  };
  
  directMessage = {
    findMany: async () => [],
    findFirst: async () => null,
    create: async () => null,
    update: async () => null,
    delete: async () => null
  };
  
  // Transaction support (ScyllaDB doesn't have transactions like SQL, but we can use batches)
  async $transaction<T>(operations: T[]): Promise<T[]> {
    // For now, just execute operations sequentially
    // In the future, we could use ScyllaDB batches for some operations
    const results: T[] = [];
    for (const operation of operations) {
      results.push(operation as T);
    }
    return results;
  }
}

// Export individual adapters for direct use
export { 
  ProfileAdapter, 
  ServerAdapter, 
  MemberAdapter, 
  ChannelAdapter, 
  MessageAdapter, 
  RoleAdapter, 
  CategoryAdapter, 
  RolePermissionAdapter 
};

// Create a global instance to replace the Prisma client
export const scyllaDB = new ScyllaDBAdapter();
