import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { BotCommand } from '../client.js';

export const ping: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check if BowskyBot is alive'),

  async execute(interaction: ChatInputCommandInteraction) {
    const latency = Date.now() - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);
    await interaction.reply({
      content: `Pong! Latency: ${latency}ms | API: ${apiLatency}ms`,
      ephemeral: true,
    });
  },
};
