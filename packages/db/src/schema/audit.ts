import { pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { servers } from './servers.js';

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  serverId: text('server_id').notNull().references(() => servers.id),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type'),
  targetId: text('target_id'),
  details: jsonb('details'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  serverId: text('server_id').notNull().references(() => servers.id),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(),
  permissions: text('permissions').array(),
  createdBy: text('created_by'),
  expiresAt: timestamp('expires_at'),
  isActive: text('is_active').default('true').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
