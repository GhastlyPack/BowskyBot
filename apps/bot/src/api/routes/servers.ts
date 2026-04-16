import { Router } from 'express';
import { client } from '../../bot/client.js';
import { analyzeServer, type FullServerAnalysis } from '../../bot/services/server-analysis.js';
import { logger } from '../../lib/logger.js';

const router = Router();

// Analysis cache — refreshes every 5 minutes
const analysisCache: Map<string, { data: FullServerAnalysis; cachedAt: number }> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getCachedAnalysis(guildId: string, forceRefresh = false): Promise<FullServerAnalysis> {
  const cached = analysisCache.get(guildId);
  if (cached && !forceRefresh && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const guild = client.guilds.cache.get(guildId);
  if (!guild) throw new Error('Server not found');

  logger.info(`Running fresh analysis for ${guild.name} (cache ${cached ? 'expired' : 'miss'})`);
  const analysis = await analyzeServer(guild);
  analysisCache.set(guildId, { data: analysis, cachedAt: Date.now() });
  return analysis;
}

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

// GET /api/v1/servers/:serverId — server overview (fast, no analysis)
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

// GET /api/v1/servers/:serverId/analysis — cached server analysis
router.get('/:serverId/analysis', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) {
    res.status(404).json({ success: false, error: 'Server not found' });
    return;
  }

  try {
    const forceRefresh = req.query.refresh === 'true';
    const analysis = await getCachedAnalysis(req.params.serverId, forceRefresh);
    res.json({ success: true, data: analysis });
  } catch (error) {
    logger.error(error, 'API: Failed to analyze server');
    res.status(500).json({ success: false, error: 'Failed to analyze server' });
  }
});

export { router as serversRouter };
