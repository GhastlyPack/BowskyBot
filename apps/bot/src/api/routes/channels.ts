import { Router } from 'express';
import { ChannelType } from 'discord.js';
import { client } from '../../bot/client.js';
import {
  createCategory,
  createChannel,
  deleteChannel,
  applyTemplate,
  reorderChannels,
  type ServerTemplate,
} from '../../bot/services/channel-manager.js';
import { sendMessage, sendAnnouncement } from '../../bot/services/content-delivery.js';
import { logger } from '../../lib/logger.js';

const router = Router();

// GET /api/v1/servers/:serverId/channels
router.get('/:serverId/channels', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) { res.status(404).json({ success: false, error: 'Server not found' }); return; }

  const channels = guild.channels.cache
    .filter(c => !c.isThread())
    .sort((a, b) => {
      const posA = 'position' in a ? (a as any).position : 0;
      const posB = 'position' in b ? (b as any).position : 0;
      return posA - posB;
    })
    .map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      parentId: c.parentId,
      position: 'position' in c ? (c as any).position : 0,
    }));

  res.json({ success: true, data: Array.from(channels.values()) });
});

// POST /api/v1/servers/:serverId/channels
router.post('/:serverId/channels', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) { res.status(404).json({ success: false, error: 'Server not found' }); return; }

  const { name, type, parentId, topic, tier } = req.body;
  if (!name || !type) {
    res.status(400).json({ success: false, error: 'name and type are required' });
    return;
  }

  try {
    if (type === 'category') {
      const cat = await createCategory(guild, { name, tier });
      res.json({ success: true, data: { id: cat.id, name: cat.name, type: 'category' } });
    } else {
      const ch = await createChannel(guild, { name, type, parentId, topic, tier });
      res.json({ success: true, data: { id: ch.id, name: ch.name, type } });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/servers/:serverId/channels/:channelId
router.delete('/:serverId/channels/:channelId', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) { res.status(404).json({ success: false, error: 'Server not found' }); return; }

  try {
    await deleteChannel(guild, req.params.channelId);
    res.json({ success: true, message: 'Channel deleted' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/v1/servers/:serverId/channels/reorder
router.post('/:serverId/channels/reorder', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) { res.status(404).json({ success: false, error: 'Server not found' }); return; }

  const { ordering } = req.body;
  if (!ordering || !Array.isArray(ordering)) {
    res.status(400).json({ success: false, error: 'ordering array is required' });
    return;
  }

  try {
    await reorderChannels(guild, ordering);
    res.json({ success: true, message: 'Channels reordered' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/servers/:serverId/channels/apply-template
router.post('/:serverId/channels/apply-template', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) { res.status(404).json({ success: false, error: 'Server not found' }); return; }

  const template = req.body as ServerTemplate;
  if (!template?.name || !template?.categories) {
    res.status(400).json({ success: false, error: 'Template must have name and categories' });
    return;
  }

  try {
    logger.info(`API: Applying template "${template.name}" to ${guild.name}`);
    const result = await applyTemplate(guild, template);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error(error, 'Failed to apply template');
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/servers/:serverId/messages
router.post('/:serverId/messages', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) { res.status(404).json({ success: false, error: 'Server not found' }); return; }

  const { channelId, content, embed } = req.body;
  if (!channelId) {
    res.status(400).json({ success: false, error: 'channelId is required' });
    return;
  }

  try {
    const msgId = await sendMessage(guild, { channelId, content, embed });
    res.json({ success: true, data: { messageId: msgId } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/servers/:serverId/announce
router.post('/:serverId/announce', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) { res.status(404).json({ success: false, error: 'Server not found' }); return; }

  const { channelId, title, body, color } = req.body;
  if (!channelId || !title || !body) {
    res.status(400).json({ success: false, error: 'channelId, title, and body are required' });
    return;
  }

  try {
    const msgId = await sendAnnouncement(guild, channelId, title, body, color);
    res.json({ success: true, data: { messageId: msgId } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as channelsRouter };
