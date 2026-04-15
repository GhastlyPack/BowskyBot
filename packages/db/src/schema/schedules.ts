import { pgTable, serial, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { servers } from './servers.js';
import { members } from './members.js';

export const callSchedules = pgTable('call_schedules', {
  id: serial('id').primaryKey(),
  serverId: text('server_id').notNull().references(() => servers.id),
  title: text('title').notNull(),
  description: text('description'),
  tier: text('tier').notNull().default('all'),
  channelId: text('channel_id'),
  recurrence: text('recurrence').notNull(),
  timeUtc: text('time_utc').notNull(),
  durationMin: integer('duration_min').default(60).notNull(),
  nextOccurrence: timestamp('next_occurrence'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const callEvents = pgTable('call_events', {
  id: serial('id').primaryKey(),
  scheduleId: integer('schedule_id').references(() => callSchedules.id),
  serverId: text('server_id').notNull().references(() => servers.id),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at'),
  status: text('status').default('scheduled').notNull(),
  recordingUrl: text('recording_url'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const callAttendance = pgTable('call_attendance', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').references(() => callEvents.id),
  memberId: integer('member_id').references(() => members.id),
  rsvpStatus: text('rsvp_status').default('none').notNull(),
  attended: boolean('attended').default(false).notNull(),
  joinedAt: timestamp('joined_at'),
  leftAt: timestamp('left_at'),
});
