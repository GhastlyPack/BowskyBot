import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const servers = pgTable('servers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  iconUrl: text('icon_url'),
  ownerId: text('owner_id').notNull(),
  joinedAt: timestamp('joined_at'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const serverSettings = pgTable('server_settings', {
  serverId: text('server_id').primaryKey().references(() => servers.id),
  welcomeChannel: text('welcome_channel'),
  logChannel: text('log_channel'),
  modRoleId: text('mod_role_id'),
  blueprintRoleId: text('blueprint_role_id'),
  boardroomRoleId: text('boardroom_role_id'),
  ogRoleId: text('og_role_id'),
  trialDays: text('trial_days').default('7'),
  fanbasisWebhookSecret: text('fanbasis_webhook_secret'),
  aiEnabled: boolean('ai_enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
