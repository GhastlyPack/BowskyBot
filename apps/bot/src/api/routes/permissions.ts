import { Router } from 'express';
import { PermissionFlagsBits } from 'discord.js';
import { client } from '../../bot/client.js';
import { logger } from '../../lib/logger.js';

const router = Router();

/**
 * POST /api/v1/servers/:serverId/channels/:channelId/permissions
 * Set permission overwrites on a channel or category.
 * Body: { overwrites: [{ id: roleId, allow?: string[], deny?: string[] }] }
 */
router.post('/:serverId/channels/:channelId/permissions', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) { res.status(404).json({ success: false, error: 'Server not found' }); return; }

  const channel = guild.channels.cache.get(req.params.channelId);
  if (!channel) { res.status(404).json({ success: false, error: 'Channel not found' }); return; }
  if (!('permissionOverwrites' in channel)) {
    res.status(400).json({ success: false, error: 'Channel does not support permissions' });
    return;
  }

  const { overwrites } = req.body;
  if (!overwrites || !Array.isArray(overwrites)) {
    res.status(400).json({ success: false, error: 'overwrites array is required' });
    return;
  }

  const PERM_MAP: Record<string, bigint> = {
    ViewChannel: PermissionFlagsBits.ViewChannel,
    SendMessages: PermissionFlagsBits.SendMessages,
    ManageMessages: PermissionFlagsBits.ManageMessages,
    ManageChannels: PermissionFlagsBits.ManageChannels,
    ReadMessageHistory: PermissionFlagsBits.ReadMessageHistory,
    AddReactions: PermissionFlagsBits.AddReactions,
    Connect: PermissionFlagsBits.Connect,
    Speak: PermissionFlagsBits.Speak,
  };

  try {
    const permChannel = channel as any;

    for (const ow of overwrites) {
      const allow: bigint[] = [];
      const deny: bigint[] = [];

      if (ow.allow) {
        for (const p of ow.allow) {
          if (PERM_MAP[p]) allow.push(PERM_MAP[p]);
        }
      }
      if (ow.deny) {
        for (const p of ow.deny) {
          if (PERM_MAP[p]) deny.push(PERM_MAP[p]);
        }
      }

      await permChannel.permissionOverwrites.edit(ow.id, {
        ...(allow.length > 0 ? Object.fromEntries(allow.map(a => {
          const name = Object.entries(PERM_MAP).find(([, v]) => v === a)?.[0];
          return [name, true];
        })) : {}),
        ...(deny.length > 0 ? Object.fromEntries(deny.map(d => {
          const name = Object.entries(PERM_MAP).find(([, v]) => v === d)?.[0];
          return [name, false];
        })) : {}),
      });
    }

    logger.info(`Set permissions on #${channel.name} (${overwrites.length} overwrites)`);
    res.json({ success: true, message: `Permissions set on #${channel.name}` });
  } catch (error: any) {
    logger.error(error, `Failed to set permissions on #${channel.name}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as permissionsRouter };
