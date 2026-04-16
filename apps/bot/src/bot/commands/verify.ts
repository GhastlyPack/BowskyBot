import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';
import type { BotCommand } from '../client.js';
import { verifyPurchase } from '../services/purchases.js';
import { logger } from '../../lib/logger.js';

export const verify: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify your purchase to unlock member access')
    .addStringOption(opt =>
      opt.setName('email')
        .setDescription('The email you used to purchase')
        .setRequired(true),
    ) as unknown as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: 64 });
      return;
    }

    const email = interaction.options.getString('email', true);
    await interaction.deferReply({ flags: 64 }); // Ephemeral — only the user sees this

    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const result = await verifyPurchase(interaction.guild, member, email);

      const embed = new EmbedBuilder()
        .setColor(result.success ? 0x2ecc71 : 0xe74c3c)
        .setTitle(result.success ? 'Verification Successful' : 'Verification Failed')
        .setDescription(result.message);

      if (result.success && result.tier) {
        embed.addFields({ name: 'Tier', value: result.tier, inline: true });
      }

      await interaction.editReply({ embeds: [embed] });

      // Log successful verifications to staff
      if (result.success) {
        const logChannel = interaction.guild.channels.cache.find(
          c => c.name === 'mod-logs' || c.name === 'auto-mod-logs'
        );
        if (logChannel?.isTextBased()) {
          const logEmbed = new EmbedBuilder()
            .setTitle('Purchase Verified')
            .setColor(0x2ecc71)
            .addFields(
              { name: 'User', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Email', value: email, inline: true },
              { name: 'Tier', value: result.tier || 'Unknown', inline: true },
            )
            .setTimestamp();
          await (logChannel as any).send({ embeds: [logEmbed] });
        }
      }
    } catch (error) {
      logger.error(error, 'Verify command failed');
      await interaction.editReply({ content: 'Something went wrong. Please try again or contact support.' });
    }
  },
};
