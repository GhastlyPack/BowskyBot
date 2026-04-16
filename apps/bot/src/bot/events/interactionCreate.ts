import { Interaction } from 'discord.js';
import { commands } from '../client.js';
import { logger } from '../../lib/logger.js';
import { handleGainAccess, handleVerifyButton, handleCloseTicket, handleOpenSupport } from '../services/tickets.js';

export async function onInteractionCreate(interaction: Interaction) {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`Unknown command: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error(error, `Error executing command: ${interaction.commandName}`);
      const reply = { content: 'Something went wrong executing that command.', flags: 64 as const };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
    return;
  }

  // Handle button clicks
  if (interaction.isButton()) {
    try {
      if (interaction.customId === 'gain_access') {
        if (!interaction.guild || !interaction.member) return;
        await interaction.deferReply({ flags: 64 });
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const message = await handleGainAccess(member);
        await interaction.editReply({ content: message });
      }

      if (interaction.customId === 'verify_ticket') {
        if (!interaction.guild || !interaction.member) return;
        await interaction.deferReply({ flags: 64 });
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const message = await handleVerifyButton(member);
        await interaction.editReply({ content: message });
      }

      if (interaction.customId === 'open_support') {
        if (!interaction.guild || !interaction.member) return;
        await interaction.deferReply({ flags: 64 });
        const member = await interaction.guild.members.fetch(interaction.user.id);
        const message = await handleOpenSupport(member);
        await interaction.editReply({ content: message });
      }

      if (interaction.customId === 'close_ticket') {
        await interaction.deferUpdate();
        await handleCloseTicket(interaction.channelId!, interaction.user.id);
      }
    } catch (error) {
      logger.error(error, `Error handling button: ${interaction.customId}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'Something went wrong.', flags: 64 });
      }
    }
    return;
  }
}
