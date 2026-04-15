import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import type { BotCommand } from '../client.js';
import { applyTemplate } from '../services/channel-manager.js';
import { bowskyCommunityTemplate } from '../templates/bowsky-community.js';
import { logger } from '../../lib/logger.js';

export const template: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('template')
    .setDescription('Apply a server template')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(sub =>
      sub.setName('apply')
        .setDescription('Apply the Bowsky Community template (creates new categories/channels)')
        .addBooleanOption(opt =>
          opt.setName('confirm')
            .setDescription('Confirm you want to create the new channel structure')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('preview')
        .setDescription('Preview the Bowsky Community template without applying it'),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'Server only.', flags: 64 });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'preview') {
      const lines: string[] = [];
      for (const cat of bowskyCommunityTemplate.categories) {
        const tierLabel = cat.tier ? ` [${cat.tier}]` : ' [public]';
        lines.push(`\n**📁 ${cat.name}**${tierLabel}`);
        for (const ch of cat.channels) {
          const typeIcon = ch.type === 'voice' ? '🔊' : ch.type === 'stage' ? '📡' : ch.type === 'forum' ? '📋' : ch.type === 'announcement' ? '📣' : '#';
          lines.push(`  ${typeIcon} ${ch.name}${ch.topic ? ` — *${ch.topic}*` : ''}`);
        }
      }

      const embed = new EmbedBuilder()
        .setTitle(`Template Preview: ${bowskyCommunityTemplate.name}`)
        .setColor(0x3498db)
        .setDescription(lines.join('\n'))
        .setFooter({ text: 'Use /template apply confirm:True to create this structure' });

      await interaction.reply({ embeds: [embed], flags: 64 });
      return;
    }

    if (sub === 'apply') {
      const confirm = interaction.options.getBoolean('confirm', true);
      if (!confirm) {
        await interaction.reply({ content: 'Set confirm to True to apply the template.', flags: 64 });
        return;
      }

      await interaction.deferReply();

      try {
        const result = await applyTemplate(interaction.guild, bowskyCommunityTemplate, (step) => {
          interaction.editReply(step).catch(() => {});
        });

        const embed = new EmbedBuilder()
          .setTitle('Template Applied')
          .setColor(0x2ecc71)
          .addFields(
            { name: 'Template', value: bowskyCommunityTemplate.name, inline: true },
            { name: 'Categories Created', value: `${result.categoriesCreated}`, inline: true },
            { name: 'Channels Created', value: `${result.channelsCreated}`, inline: true },
          );

        if (result.errors.length > 0) {
          embed.addFields({ name: 'Errors', value: result.errors.slice(0, 5).join('\n') });
        }

        await interaction.editReply({ content: '', embeds: [embed] });
      } catch (error) {
        logger.error(error, 'Failed to apply template');
        await interaction.editReply('Failed to apply template. Check bot logs.');
      }
    }
  },
};
