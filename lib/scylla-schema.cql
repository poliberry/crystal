-- ScyllaDB Schema for Crystal Discord Clone
-- This file contains the CQL schema for all tables optimized for ScyllaDB

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    user_id TEXT,
    name TEXT,
    global_name TEXT,
    image_url TEXT,
    email TEXT,
    custom_css TEXT,
    status TEXT,
    prev_status TEXT,
    bio TEXT,
    presence_status TEXT,
    pronouns TEXT,
    banner_url TEXT,
    allow_non_friend_dms BOOLEAN,
    friend_request_privacy TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Index for user_id lookups (Clerk integration)
CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles (user_id);

-- ============================================================================
-- SERVERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS servers (
    id UUID PRIMARY KEY,
    name TEXT,
    image_url TEXT,
    invite_code TEXT,
    profile_id UUID,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Index for invite code lookups
CREATE INDEX IF NOT EXISTS servers_invite_code_idx ON servers (invite_code);

-- Index for profile_id (owner) lookups
CREATE INDEX IF NOT EXISTS servers_profile_id_idx ON servers (profile_id);

-- ============================================================================
-- MEMBERS TABLE
-- Optimized for server-based queries with composite partition key
-- ============================================================================
CREATE TABLE IF NOT EXISTS members (
    server_id UUID,
    profile_id UUID,
    id UUID,
    role TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    PRIMARY KEY (server_id, profile_id)
);

-- Secondary index for profile-based lookups
CREATE INDEX IF NOT EXISTS members_profile_id_idx ON members (profile_id);

-- ============================================================================
-- CHANNELS TABLE
-- Partitioned by server for optimal server-channel queries
-- ============================================================================
CREATE TABLE IF NOT EXISTS channels (
    server_id UUID,
    id UUID,
    name TEXT,
    type TEXT,
    profile_id UUID,
    category_id UUID,
    position INT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    PRIMARY KEY (server_id, position, id)
) WITH CLUSTERING ORDER BY (position ASC, id ASC);

-- Index for channel ID lookups
CREATE INDEX IF NOT EXISTS channels_id_idx ON channels (id);

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY,
    name TEXT,
    position INT,
    server_id UUID,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Index for server-based category lookups
CREATE INDEX IF NOT EXISTS categories_server_id_idx ON categories (server_id);

-- ============================================================================
-- MESSAGES TABLE
-- Heavily optimized for channel-based queries with time-series clustering
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
    channel_id UUID,
    created_at TIMESTAMP,
    id UUID,
    content TEXT,
    member_id UUID,
    deleted BOOLEAN,
    updated_at TIMESTAMP,
    PRIMARY KEY (channel_id, created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC, id DESC);

-- Index for member message lookups
CREATE INDEX IF NOT EXISTS messages_member_id_idx ON messages (member_id);

-- ============================================================================
-- DIRECT MESSAGES TABLE
-- Optimized for conversation-based queries
-- ============================================================================
CREATE TABLE IF NOT EXISTS direct_messages (
    conversation_id UUID,
    created_at TIMESTAMP,
    id UUID,
    content TEXT,
    profile_id UUID,
    member_id UUID,
    deleted BOOLEAN,
    reply_to_id UUID,
    updated_at TIMESTAMP,
    PRIMARY KEY (conversation_id, created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC, id DESC);

-- Index for profile message lookups
CREATE INDEX IF NOT EXISTS direct_messages_profile_id_idx ON direct_messages (profile_id);

-- ============================================================================
-- CONVERSATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY,
    name TEXT,
    type TEXT,
    creator_id UUID,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Index for creator lookups
CREATE INDEX IF NOT EXISTS conversations_creator_id_idx ON conversations (creator_id);

-- ============================================================================
-- CONVERSATION MEMBERS TABLE
-- Junction table for conversation participants
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id UUID,
    profile_id UUID,
    id UUID,
    member_id UUID,
    joined_at TIMESTAMP,
    left_at TIMESTAMP,
    last_read_at TIMESTAMP,
    PRIMARY KEY (conversation_id, profile_id)
);

-- Index for profile-based conversation lookups
CREATE INDEX IF NOT EXISTS conversation_members_profile_id_idx ON conversation_members (profile_id);

-- ============================================================================
-- ATTACHMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS attachments (
    id UUID PRIMARY KEY,
    ut_id TEXT,
    name TEXT,
    url TEXT,
    size INT,
    type TEXT,
    message_id UUID,
    direct_message_id UUID,
    created_at TIMESTAMP
);

-- Indexes for parent message lookups
CREATE INDEX IF NOT EXISTS attachments_message_id_idx ON attachments (message_id);
CREATE INDEX IF NOT EXISTS attachments_direct_message_id_idx ON attachments (direct_message_id);

-- ============================================================================
-- FRIENDSHIPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS friendships (
    requester_id UUID,
    receiver_id UUID,
    id UUID,
    status TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    PRIMARY KEY (requester_id, receiver_id)
);

-- Index for receiver-based lookups
CREATE INDEX IF NOT EXISTS friendships_receiver_id_idx ON friendships (receiver_id);

-- Index for status-based queries
CREATE INDEX IF NOT EXISTS friendships_status_idx ON friendships (status);

-- ============================================================================
-- BLOCKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS blocks (
    blocker_id UUID,
    blocked_id UUID,
    id UUID,
    reason TEXT,
    created_at TIMESTAMP,
    PRIMARY KEY (blocker_id, blocked_id)
);

-- Index for blocked user lookups
CREATE INDEX IF NOT EXISTS blocks_blocked_id_idx ON blocks (blocked_id);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- Partitioned by profile for efficient user notification queries
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    profile_id UUID,
    created_at TIMESTAMP,
    id UUID,
    type TEXT,
    title TEXT,
    content TEXT,
    triggered_by_id UUID,
    server_id UUID,
    channel_id UUID,
    conversation_id UUID,
    message_id UUID,
    direct_message_id UUID,
    read BOOLEAN,
    read_at TIMESTAMP,
    group_key TEXT,
    updated_at TIMESTAMP,
    PRIMARY KEY (profile_id, created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC, id DESC);

-- ============================================================================
-- ROLES TABLE
-- Server-based partitioning for role management
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
    server_id UUID,
    position INT,
    id UUID,
    name TEXT,
    color TEXT,
    hoisted BOOLEAN,
    mentionable BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    PRIMARY KEY (server_id, position, id)
) WITH CLUSTERING ORDER BY (position ASC, id ASC);

-- ============================================================================
-- ROLE PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID,
    permission TEXT,
    scope TEXT,
    id UUID,
    grant_type TEXT,
    target_id UUID,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    PRIMARY KEY (role_id, permission, scope, target_id)
);

-- ============================================================================
-- MEMBER ROLE ASSIGNMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS member_role_assignments (
    member_id UUID,
    role_id UUID,
    id UUID,
    assigned_at TIMESTAMP,
    assigned_by UUID,
    PRIMARY KEY (member_id, role_id)
);

-- Index for role-based member lookups
CREATE INDEX IF NOT EXISTS member_role_assignments_role_id_idx ON member_role_assignments (role_id);

-- ============================================================================
-- USER PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_permissions (
    member_id UUID,
    permission TEXT,
    scope TEXT,
    target_id UUID,
    id UUID,
    grant_type TEXT,
    reason TEXT,
    assigned_by UUID,
    expires_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    PRIMARY KEY (member_id, permission, scope, target_id)
);

-- ============================================================================
-- CHANNEL PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS channel_permissions (
    channel_id UUID,
    permission TEXT,
    id UUID,
    role_id UUID,
    member_id UUID,
    grant_type TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    PRIMARY KEY (channel_id, permission, role_id, member_id)
);

-- ============================================================================
-- CATEGORY PERMISSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS category_permissions (
    category_id UUID,
    permission TEXT,
    id UUID,
    role_id UUID,
    member_id UUID,
    grant_type TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    PRIMARY KEY (category_id, permission, role_id, member_id)
);

-- ============================================================================
-- PERMISSION AUDIT LOG TABLE
-- Time-series table for audit logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS permission_audit_logs (
    server_id UUID,
    created_at TIMESTAMP,
    id UUID,
    action TEXT,
    target_type TEXT,
    target_id UUID,
    permission TEXT,
    old_value TEXT,
    new_value TEXT,
    performed_by UUID,
    reason TEXT,
    PRIMARY KEY (server_id, created_at, id)
) WITH CLUSTERING ORDER BY (created_at DESC, id DESC);

-- ============================================================================
-- BANS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bans (
    server_id UUID,
    profile_id UUID,
    id UUID,
    banned_by_id UUID,
    reason TEXT,
    created_at TIMESTAMP,
    PRIMARY KEY (server_id, profile_id)
);

-- Index for profile-based ban lookups
CREATE INDEX IF NOT EXISTS bans_profile_id_idx ON bans (profile_id);
