import { Router } from 'express';
import { client } from '../../bot/client.js';
import { logger } from '../../lib/logger.js';

const router = Router();

// GET /api/v1/servers/:serverId/members — paginated member list
router.get('/:serverId/members', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) {
    res.status(404).json({ success: false, error: 'Server not found' });
    return;
  }

  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));
    const search = (req.query.search as string) || '';

    await guild.members.fetch();
    let members = Array.from(guild.members.cache.values());

    // Filter bots out by default unless requested
    if (req.query.includeBots !== 'true') {
      members = members.filter(m => !m.user.bot);
    }

    // Search filter
    if (search) {
      const lower = search.toLowerCase();
      members = members.filter(m =>
        m.user.username.toLowerCase().includes(lower) ||
        (m.nickname?.toLowerCase().includes(lower) ?? false)
      );
    }

    // Sort by join date
    members.sort((a, b) => ((a.joinedTimestamp ?? 0) - (b.joinedTimestamp ?? 0)));

    const total = members.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const paged = members.slice(start, start + pageSize);

    const data = paged.map(m => ({
      id: m.id,
      username: m.user.username,
      displayName: m.displayName,
      avatarUrl: m.user.displayAvatarURL({ size: 64 }),
      joinedAt: m.joinedAt?.toISOString() ?? null,
      roles: m.roles.cache
        .filter(r => r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
      isBot: m.user.bot,
    }));

    res.json({ success: true, data, total, page, pageSize, totalPages });
  } catch (error) {
    logger.error(error, 'Failed to fetch members');
    res.status(500).json({ success: false, error: 'Failed to fetch members' });
  }
});

// GET /api/v1/servers/:serverId/members/:memberId — single member detail
router.get('/:serverId/members/:memberId', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) {
    res.status(404).json({ success: false, error: 'Server not found' });
    return;
  }

  try {
    const member = await guild.members.fetch(req.params.memberId);
    res.json({
      success: true,
      data: {
        id: member.id,
        username: member.user.username,
        displayName: member.displayName,
        avatarUrl: member.user.displayAvatarURL({ size: 256 }),
        joinedAt: member.joinedAt?.toISOString() ?? null,
        createdAt: member.user.createdAt.toISOString(),
        roles: member.roles.cache
          .filter(r => r.id !== guild.id)
          .sort((a, b) => b.position - a.position)
          .map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
        isBot: member.user.bot,
        presence: member.presence?.status ?? 'offline',
      },
    });
  } catch {
    res.status(404).json({ success: false, error: 'Member not found' });
  }
});

export { router as membersRouter };
