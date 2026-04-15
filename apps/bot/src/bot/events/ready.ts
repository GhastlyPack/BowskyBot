import type { Client } from 'discord.js';
import { logger } from '../../lib/logger.js';

export function onReady(client: Client<true>) {
  logger.info(`Bot online as ${client.user.tag}`);
  logger.info(`Serving ${client.guilds.cache.size} guild(s)`);

  client.user.setPresence({
    status: 'online',
    activities: [{ name: 'Managing the community', type: 3 }],
  });
}
