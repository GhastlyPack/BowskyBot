import { Guild, TextChannel, EmbedBuilder, VoiceState, GuildScheduledEventEntityType, GuildScheduledEventPrivacyLevel } from 'discord.js';
import { client } from '../client.js';
import { logger } from '../../lib/logger.js';

export interface CallScheduleData {
  id?: string;
  serverId: string;
  title: string;
  description?: string;
  tier: 'blueprint' | 'boardroom' | 'all';
  channelId: string;       // Text channel for reminders
  voiceChannelId?: string;  // VC for the actual call
  recurrence: 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek: number;        // 0=Sunday, 1=Monday, etc.
  hour: number;             // 0-23 UTC
  minute: number;           // 0-59
  durationMin: number;
  isActive: boolean;
}

// In-memory store for schedules (will move to DB later)
const schedules: Map<string, CallScheduleData> = new Map();
let nextId = 1;

// Active call attendance tracking: eventKey -> Set of member IDs
const activeAttendance: Map<string, Map<string, { joinedAt: Date; leftAt?: Date }>> = new Map();

export function createSchedule(data: Omit<CallScheduleData, 'id' | 'isActive'>): CallScheduleData {
  const id = `sched_${nextId++}`;
  const schedule: CallScheduleData = { ...data, id, isActive: true };
  schedules.set(id, schedule);
  logger.info(`Created schedule "${schedule.title}" (${id}) — ${schedule.recurrence} on day ${schedule.dayOfWeek} at ${schedule.hour}:${String(schedule.minute).padStart(2, '0')} UTC`);

  // Create a Discord Scheduled Event for the next occurrence
  createDiscordEvent(schedule).catch(err => {
    logger.warn(err, `Could not create Discord event for "${schedule.title}"`);
  });

  return schedule;
}

/**
 * Create a native Discord Scheduled Event for a call schedule.
 * These show up in the server's event bar and members can mark "Interested".
 */
export async function createDiscordEvent(schedule: CallScheduleData) {
  const guild = client.guilds.cache.get(schedule.serverId);
  if (!guild) return;

  const nextAt = getNextOccurrence(schedule);
  const endAt = new Date(nextAt.getTime() + schedule.durationMin * 60 * 1000);

  const eventData: any = {
    name: schedule.title,
    description: schedule.description || `${schedule.tier.charAt(0).toUpperCase() + schedule.tier.slice(1)} ${schedule.recurrence} call`,
    scheduledStartTime: nextAt.toISOString(),
    scheduledEndTime: endAt.toISOString(),
    privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
  };

  if (schedule.voiceChannelId) {
    eventData.entityType = GuildScheduledEventEntityType.Voice;
    eventData.channel = schedule.voiceChannelId;
  } else {
    eventData.entityType = GuildScheduledEventEntityType.External;
    eventData.entityMetadata = { location: `#${schedule.channelId}` };
  }

  const event = await guild.scheduledEvents.create(eventData);
  logger.info(`Created Discord event "${event.name}" for ${nextAt.toISOString()}`);
  return event;
}

export function getSchedules(serverId: string): CallScheduleData[] {
  return Array.from(schedules.values()).filter(s => s.serverId === serverId);
}

export function getSchedule(id: string): CallScheduleData | undefined {
  return schedules.get(id);
}

export function deleteSchedule(id: string): boolean {
  return schedules.delete(id);
}

export function updateSchedule(id: string, updates: Partial<CallScheduleData>): CallScheduleData | undefined {
  const schedule = schedules.get(id);
  if (!schedule) return undefined;
  Object.assign(schedule, updates);
  return schedule;
}

function getNextOccurrence(schedule: CallScheduleData): Date {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(schedule.hour, schedule.minute, 0, 0);

  // Find the next matching day of week
  const currentDay = now.getUTCDay();
  let daysAhead = schedule.dayOfWeek - currentDay;
  if (daysAhead < 0 || (daysAhead === 0 && now > next)) {
    daysAhead += 7;
  }
  next.setUTCDate(next.getUTCDate() + daysAhead);

  if (schedule.recurrence === 'biweekly') {
    // Simple: if this week's occurrence is within 3 days, use it; otherwise skip a week
    // (In production, you'd track which weeks are "on")
  }

  if (schedule.recurrence === 'monthly') {
    // Find the next occurrence of this day-of-week in the current/next month
    next.setUTCDate(1);
    while (next.getUTCDay() !== schedule.dayOfWeek || next <= now) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
  }

  return next;
}

export function getUpcoming(serverId: string, days: number = 7): { schedule: CallScheduleData; nextAt: Date }[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const results: { schedule: CallScheduleData; nextAt: Date }[] = [];

  for (const schedule of schedules.values()) {
    if (schedule.serverId !== serverId || !schedule.isActive) continue;
    const nextAt = getNextOccurrence(schedule);
    if (nextAt <= cutoff) {
      results.push({ schedule, nextAt });
    }
  }

  return results.sort((a, b) => a.nextAt.getTime() - b.nextAt.getTime());
}

// ===== Reminder System =====

const sentReminders: Set<string> = new Set();

export async function checkAndSendReminders() {
  const now = new Date();

  for (const schedule of schedules.values()) {
    if (!schedule.isActive) continue;

    const nextAt = getNextOccurrence(schedule);
    const minutesUntil = (nextAt.getTime() - now.getTime()) / (1000 * 60);

    // 15-minute reminder
    const key15 = `${schedule.id}-15-${nextAt.toISOString()}`;
    if (minutesUntil > 0 && minutesUntil <= 15 && !sentReminders.has(key15)) {
      sentReminders.add(key15);
      await sendReminder(schedule, 15, nextAt);
    }

    // 5-minute reminder
    const key5 = `${schedule.id}-5-${nextAt.toISOString()}`;
    if (minutesUntil > 0 && minutesUntil <= 5 && !sentReminders.has(key5)) {
      sentReminders.add(key5);
      await sendReminder(schedule, 5, nextAt);
    }

    // Clean up old reminder keys (older than 1 day)
    if (minutesUntil < -1440) {
      sentReminders.delete(key15);
      sentReminders.delete(key5);
    }
  }
}

async function sendReminder(schedule: CallScheduleData, minutesBefore: number, startsAt: Date) {
  try {
    const guild = client.guilds.cache.get(schedule.serverId);
    if (!guild) return;

    const channel = guild.channels.cache.get(schedule.channelId) as TextChannel | undefined;
    if (!channel) return;

    const timestamp = Math.floor(startsAt.getTime() / 1000);
    const vcMention = schedule.voiceChannelId ? `\nJoin: <#${schedule.voiceChannelId}>` : '';

    const embed = new EmbedBuilder()
      .setTitle(`${minutesBefore === 15 ? '15 minutes' : '5 minutes'} until: ${schedule.title}`)
      .setDescription(`Starting <t:${timestamp}:R>${vcMention}`)
      .setColor(minutesBefore === 5 ? 0xe74c3c : 0xf39c12)
      .setTimestamp();

    // Mention the tier role
    const tierRole = schedule.tier === 'blueprint'
      ? guild.roles.cache.find(r => r.name === 'Blueprint')
      : schedule.tier === 'boardroom'
        ? guild.roles.cache.find(r => r.name === 'Boardroom')
        : null;

    const mention = tierRole ? `<@&${tierRole.id}> ` : '';

    await channel.send({ content: `${mention}`, embeds: [embed] });
    logger.info(`Sent ${minutesBefore}min reminder for "${schedule.title}"`);
  } catch (err) {
    logger.error(err, `Failed to send reminder for "${schedule.title}"`);
  }
}

// ===== Attendance Tracking =====

export function trackVoiceJoin(state: VoiceState) {
  if (!state.member || state.member.user.bot) return;
  if (!state.channelId) return;

  // Check if this VC is associated with any schedule
  for (const schedule of schedules.values()) {
    if (schedule.voiceChannelId === state.channelId && schedule.isActive) {
      const eventKey = `${schedule.id}-${new Date().toISOString().split('T')[0]}`;

      if (!activeAttendance.has(eventKey)) {
        activeAttendance.set(eventKey, new Map());
      }

      const attendees = activeAttendance.get(eventKey)!;
      if (!attendees.has(state.member.id)) {
        attendees.set(state.member.id, { joinedAt: new Date() });
        logger.info(`Attendance: ${state.member.user.tag} joined "${schedule.title}"`);
      }
    }
  }
}

export function trackVoiceLeave(state: VoiceState) {
  if (!state.member || state.member.user.bot) return;
  if (!state.channelId) return;

  for (const schedule of schedules.values()) {
    if (schedule.voiceChannelId === state.channelId) {
      const eventKey = `${schedule.id}-${new Date().toISOString().split('T')[0]}`;
      const attendees = activeAttendance.get(eventKey);
      if (attendees) {
        const record = attendees.get(state.member.id);
        if (record && !record.leftAt) {
          record.leftAt = new Date();
          logger.info(`Attendance: ${state.member.user.tag} left "${schedule.title}"`);
        }
      }
    }
  }
}

export function getAttendance(scheduleId: string, date?: string): { memberId: string; joinedAt: Date; leftAt?: Date }[] {
  const dateStr = date || new Date().toISOString().split('T')[0];
  const eventKey = `${scheduleId}-${dateStr}`;
  const attendees = activeAttendance.get(eventKey);
  if (!attendees) return [];

  return Array.from(attendees.entries()).map(([memberId, record]) => ({
    memberId,
    ...record,
  }));
}

// ===== Start the reminder check interval =====

let reminderInterval: ReturnType<typeof setInterval> | null = null;

export function startReminderLoop() {
  if (reminderInterval) return;
  reminderInterval = setInterval(() => {
    checkAndSendReminders().catch(err => {
      logger.error(err, 'Reminder loop error');
    });
  }, 30_000); // Check every 30 seconds
  logger.info('Reminder loop started (30s interval)');
}

export function stopReminderLoop() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
}
