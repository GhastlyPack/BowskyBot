import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import type { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';

export interface BotCommand {
  data: SlashCommandBuilder | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
  ],
  partials: [
    Partials.GuildMember,
    Partials.Channel,
  ],
});

export const commands = new Collection<string, BotCommand>();

export async function startBot() {
  logger.info('Starting Discord bot...');
  await client.login(config.DISCORD_TOKEN);
}
