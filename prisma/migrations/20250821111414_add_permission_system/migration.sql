-- CreateEnum
CREATE TYPE "PermissionType" AS ENUM ('ADMINISTRATOR', 'MANAGE_SERVER', 'MANAGE_CHANNELS', 'MANAGE_ROLES', 'MANAGE_EMOJIS', 'VIEW_AUDIT_LOG', 'VIEW_GUILD_INSIGHTS', 'MANAGE_WEBHOOKS', 'MANAGE_GUILD', 'KICK_MEMBERS', 'BAN_MEMBERS', 'TIMEOUT_MEMBERS', 'MANAGE_NICKNAMES', 'CHANGE_NICKNAME', 'VIEW_CHANNELS', 'SEND_MESSAGES', 'SEND_TTS_MESSAGES', 'MANAGE_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'READ_MESSAGE_HISTORY', 'MENTION_EVERYONE', 'USE_EXTERNAL_EMOJIS', 'ADD_REACTIONS', 'CONNECT', 'SPEAK', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS', 'MOVE_MEMBERS', 'USE_VAD', 'PRIORITY_SPEAKER', 'REQUEST_TO_SPEAK', 'MANAGE_STAGE', 'CREATE_INSTANT_INVITE', 'USE_SLASH_COMMANDS', 'USE_APPLICATION_COMMANDS', 'SEND_MESSAGES_IN_THREADS', 'CREATE_PUBLIC_THREADS', 'CREATE_PRIVATE_THREADS', 'MANAGE_THREADS', 'USE_EXTERNAL_STICKERS', 'SEND_VOICE_MESSAGES');

-- CreateEnum
CREATE TYPE "PermissionGrantType" AS ENUM ('ALLOW', 'DENY', 'INHERIT');

-- CreateEnum
CREATE TYPE "PermissionScope" AS ENUM ('SERVER', 'CHANNEL', 'CATEGORY', 'THREAD');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ChannelType" ADD VALUE 'STAGE';
ALTER TYPE "ChannelType" ADD VALUE 'ANNOUNCEMENT';

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "hoisted" BOOLEAN NOT NULL DEFAULT false,
    "mentionable" BOOLEAN NOT NULL DEFAULT false,
    "serverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permission" "PermissionType" NOT NULL,
    "scope" "PermissionScope" NOT NULL,
    "grant" "PermissionGrantType" NOT NULL DEFAULT 'ALLOW',
    "targetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberRoleAssignment" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "MemberRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "permission" "PermissionType" NOT NULL,
    "scope" "PermissionScope" NOT NULL,
    "grant" "PermissionGrantType" NOT NULL,
    "targetId" TEXT,
    "reason" TEXT,
    "assignedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelPermission" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "roleId" TEXT,
    "memberId" TEXT,
    "permission" "PermissionType" NOT NULL,
    "grant" "PermissionGrantType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryPermission" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "roleId" TEXT,
    "memberId" TEXT,
    "permission" "PermissionType" NOT NULL,
    "grant" "PermissionGrantType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionAuditLog" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "permission" "PermissionType",
    "oldValue" TEXT,
    "newValue" TEXT,
    "performedBy" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Role_serverId_idx" ON "Role"("serverId");

-- CreateIndex
CREATE INDEX "Role_position_idx" ON "Role"("position");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permission_idx" ON "RolePermission"("permission");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permission_scope_targetId_key" ON "RolePermission"("roleId", "permission", "scope", "targetId");

-- CreateIndex
CREATE INDEX "MemberRoleAssignment_memberId_idx" ON "MemberRoleAssignment"("memberId");

-- CreateIndex
CREATE INDEX "MemberRoleAssignment_roleId_idx" ON "MemberRoleAssignment"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberRoleAssignment_memberId_roleId_key" ON "MemberRoleAssignment"("memberId", "roleId");

-- CreateIndex
CREATE INDEX "UserPermission_memberId_idx" ON "UserPermission"("memberId");

-- CreateIndex
CREATE INDEX "UserPermission_permission_idx" ON "UserPermission"("permission");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_memberId_permission_scope_targetId_key" ON "UserPermission"("memberId", "permission", "scope", "targetId");

-- CreateIndex
CREATE INDEX "ChannelPermission_channelId_idx" ON "ChannelPermission"("channelId");

-- CreateIndex
CREATE INDEX "ChannelPermission_roleId_idx" ON "ChannelPermission"("roleId");

-- CreateIndex
CREATE INDEX "ChannelPermission_memberId_idx" ON "ChannelPermission"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelPermission_channelId_roleId_memberId_permission_key" ON "ChannelPermission"("channelId", "roleId", "memberId", "permission");

-- CreateIndex
CREATE INDEX "CategoryPermission_categoryId_idx" ON "CategoryPermission"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryPermission_roleId_idx" ON "CategoryPermission"("roleId");

-- CreateIndex
CREATE INDEX "CategoryPermission_memberId_idx" ON "CategoryPermission"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryPermission_categoryId_roleId_memberId_permission_key" ON "CategoryPermission"("categoryId", "roleId", "memberId", "permission");

-- CreateIndex
CREATE INDEX "PermissionAuditLog_serverId_idx" ON "PermissionAuditLog"("serverId");

-- CreateIndex
CREATE INDEX "PermissionAuditLog_targetType_targetId_idx" ON "PermissionAuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "PermissionAuditLog_performedBy_idx" ON "PermissionAuditLog"("performedBy");

-- CreateIndex
CREATE INDEX "PermissionAuditLog_createdAt_idx" ON "PermissionAuditLog"("createdAt");
