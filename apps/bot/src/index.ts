import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { startBot } from './bot/client.js';
import { registerCommands } from './bot/commands/index.js';
import { registerEvents } from './bot/events/index.js';

async function main() {
  logger.info('BowskyBot starting up...');
  logger.info(`Environment: ${config.NODE_ENV}`);

  // Register slash commands in memory
  registerCommands();

  // Register event handlers
  registerEvents();

  // Connect to Discord
  await startBot();

  logger.info('BowskyBot is fully operational.');
}

main().catch((err) => {
  logger.error(err, 'Fatal error during startup');
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down...');
  process.exit(0);
});
