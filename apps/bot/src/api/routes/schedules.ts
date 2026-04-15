import { Router } from 'express';
import {
  createSchedule,
  getSchedules,
  getSchedule,
  deleteSchedule,
  updateSchedule,
  getUpcoming,
  getAttendance,
} from '../../bot/services/scheduler.js';
import { logger } from '../../lib/logger.js';

const router = Router();

// GET /api/v1/servers/:serverId/schedules
router.get('/:serverId/schedules', (req, res) => {
  const schedules = getSchedules(req.params.serverId);
  res.json({ success: true, data: schedules });
});

// POST /api/v1/servers/:serverId/schedules
router.post('/:serverId/schedules', (req, res) => {
  const { title, tier, channelId, voiceChannelId, recurrence, dayOfWeek, hour, minute, durationMin } = req.body;

  if (!title || !tier || !channelId || !recurrence || dayOfWeek === undefined || hour === undefined) {
    res.status(400).json({ success: false, error: 'title, tier, channelId, recurrence, dayOfWeek, and hour are required' });
    return;
  }

  const schedule = createSchedule({
    serverId: req.params.serverId,
    title,
    tier,
    channelId,
    voiceChannelId,
    recurrence,
    dayOfWeek,
    hour,
    minute: minute ?? 0,
    durationMin: durationMin ?? 60,
  });

  res.json({ success: true, data: schedule });
});

// GET /api/v1/servers/:serverId/schedules/:id
router.get('/:serverId/schedules/:id', (req, res) => {
  const schedule = getSchedule(req.params.id);
  if (!schedule || schedule.serverId !== req.params.serverId) {
    res.status(404).json({ success: false, error: 'Schedule not found' });
    return;
  }
  res.json({ success: true, data: schedule });
});

// PATCH /api/v1/servers/:serverId/schedules/:id
router.patch('/:serverId/schedules/:id', (req, res) => {
  const updated = updateSchedule(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ success: false, error: 'Schedule not found' });
    return;
  }
  res.json({ success: true, data: updated });
});

// DELETE /api/v1/servers/:serverId/schedules/:id
router.delete('/:serverId/schedules/:id', (req, res) => {
  if (deleteSchedule(req.params.id)) {
    res.json({ success: true, message: 'Schedule deleted' });
  } else {
    res.status(404).json({ success: false, error: 'Schedule not found' });
  }
});

// GET /api/v1/servers/:serverId/schedules/upcoming
router.get('/:serverId/upcoming', (req, res) => {
  const days = parseInt(req.query.days as string) || 7;
  const upcoming = getUpcoming(req.params.serverId, days);
  res.json({
    success: true,
    data: upcoming.map(u => ({
      ...u.schedule,
      nextAt: u.nextAt.toISOString(),
    })),
  });
});

// GET /api/v1/servers/:serverId/schedules/:id/attendance
router.get('/:serverId/schedules/:id/attendance', (req, res) => {
  const date = req.query.date as string | undefined;
  const records = getAttendance(req.params.id, date);
  res.json({ success: true, data: records });
});

export { router as schedulesRouter };
