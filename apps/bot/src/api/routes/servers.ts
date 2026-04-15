import { Router } from 'express';
import { client } from '../../bot/client.js';
import { analyzeServer } from '../../bot/services/server-analysis.js';
import { logger } from '../../lib/logger.js';

const router = Router();

// GET /api/v1/servers — list all servers the bot is in
router.get('/', (_req, res) => {
  const guilds = client.guilds.cache.map(guild => ({
    id: guild.id,
    name: guild.name,
    memberCount: guild.memberCount,
    iconUrl: guild.iconURL({ size: 256 }),
  }));

  res.json({ success: true, data: guilds });
});

// GET /api/v1/servers/:serverId — server overview
router.get('/:serverId', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) {
    res.status(404).json({ success: false, error: 'Server not found' });
    return;
  }

  res.json({
    success: true,
    data: {
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
      iconUrl: guild.iconURL({ size: 256 }),
      ownerId: guild.ownerId,
      createdAt: guild.createdAt.toISOString(),
      boostLevel: guild.premiumTier,
      boostCount: guild.premiumSubscriptionCount ?? 0,
    },
  });
});

// GET /api/v1/servers/:serverId/analysis — full server analysis
router.get('/:serverId/analysis', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) {
    res.status(404).json({ success: false, error: 'Server not found' });
    return;
  }

  try {
    logger.info(`API: Running analysis for ${guild.name}`);
    const analysis = await analyzeServer(guild);
    res.json({ success: true, data: analysis });
  } catch (error) {
    logger.error(error, 'API: Failed to analyze server');
    res.status(500).json({ success: false, error: 'Failed to analyze server' });
  }
});

export { router as serversRouter };
