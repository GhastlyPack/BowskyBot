import { pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { servers } from './servers.js';

export const scheduledMessages = pgTable('scheduled_messages', {
  id: serial('id').primaryKey(),
  serverId: text('server_id').notNull().references(() => servers.id),
  channelId: text('channel_id').notNull(),
  content: text('content').notNull(),
  embedJson: jsonb('embed_json'),
  scheduledFor: timestamp('scheduled_for').notNull(),
  postedAt: timestamp('posted_at'),
  status: text('status').default('pending').notNull(),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const channelTemplates = pgTable('channel_templates', {
  id: serial('id').primaryKey(),
  serverId: text('server_id').notNull().references(() => servers.id),
  name: text('name').notNull(),
  templateJson: jsonb('template_json').notNull(),
  isActive: text('is_active').default('true').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
