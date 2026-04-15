import { Router } from 'express';
import { client } from '../../bot/client.js';
import { logger } from '../../lib/logger.js';

const router = Router();

// PATCH /api/v1/servers/:serverId/channels/:channelId/move
router.patch('/:serverId/channels/:channelId/move', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) { res.status(404).json({ success: false, error: 'Server not found' }); return; }

  const channel = guild.channels.cache.get(req.params.channelId);
  if (!channel) { res.status(404).json({ success: false, error: 'Channel not found' }); return; }

  const { parentId } = req.body;

  try {
    await (channel as any).setParent(parentId || null, { lockPermissions: false, reason: 'Moved by BowskyBot' });
    logger.info(`Moved #${channel.name} to category ${parentId || '(none)'}`);
    res.json({ success: true, message: `Moved #${channel.name}` });
  } catch (error: any) {
    logger.error(error, `Failed to move #${channel.name}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/v1/servers/:serverId/channels/:channelId/rename
router.patch('/:serverId/channels/:channelId/rename', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) { res.status(404).json({ success: false, error: 'Server not found' }); return; }

  const channel = guild.channels.cache.get(req.params.channelId);
  if (!channel) { res.status(404).json({ success: false, error: 'Channel not found' }); return; }

  const { name } = req.body;
  if (!name) { res.status(400).json({ success: false, error: 'name is required' }); return; }

  try {
    await (channel as any).setName(name, 'Renamed by BowskyBot');
    logger.info(`Renamed channel to #${name}`);
    res.json({ success: true, message: `Renamed to #${name}` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as channelsMoveRouter };
