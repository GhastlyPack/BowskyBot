import { REST, Routes } from 'discord.js';
import { config } from '../../lib/config.js';
import { logger } from '../../lib/logger.js';
import { registerCommands } from './index.js';

async function deployCommands() {
  const allCommands = registerCommands();
  const commandData = allCommands.map((cmd) => cmd.data.toJSON());

  const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

  logger.info(`Deploying ${commandData.length} commands to guild ${config.DISCORD_GUILD_ID}...`);

  await rest.put(
    Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.DISCORD_GUILD_ID),
    { body: commandData },
  );

  logger.info('Commands deployed successfully.');
}

deployCommands().catch((err) => {
  logger.error(err, 'Failed to deploy commands');
  process.exit(1);
});
