export interface CallSchedule {
  id: number;
  serverId: string;
  title: string;
  description: string | null;
  tier: 'blueprint' | 'boardroom' | 'all';
  channelId: string | null;
  recurrence: string;
  timeUtc: string;
  durationMin: number;
  nextOccurrence: Date | null;
  isActive: boolean;
}

export interface CallEvent {
  id: number;
  scheduleId: number;
  serverId: string;
  startsAt: Date;
  endsAt: Date | null;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  recordingUrl: string | null;
  notes: string | null;
}

export interface CallAttendance {
  eventId: number;
  memberId: number;
  rsvpStatus: 'yes' | 'no' | 'maybe' | 'none';
  attended: boolean;
  joinedAt: Date | null;
  leftAt: Date | null;
}
