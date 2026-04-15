import { pgTable, serial, text, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { servers } from './servers.js';

export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  serverId: text('server_id').notNull().references(() => servers.id),
  discordId: text('discord_id').notNull(),
  username: text('username'),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  tier: text('tier').default('none').notNull(),
  isOg: boolean('is_og').default(false).notNull(),
  joinedServerAt: timestamp('joined_server_at'),
  trialStart: timestamp('trial_start'),
  trialEnd: timestamp('trial_end'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  unique('members_server_discord_unique').on(table.serverId, table.discordId),
]);

export const memberRoles = pgTable('member_roles', {
  id: serial('id').primaryKey(),
  memberId: serial('member_id').references(() => members.id),
  roleId: text('role_id').notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  assignedBy: text('assigned_by'),
});
