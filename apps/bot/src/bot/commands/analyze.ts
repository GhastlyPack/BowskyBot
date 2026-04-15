import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import type { BotCommand } from '../client.js';
import { analyzeServer, type FullServerAnalysis } from '../services/server-analysis.js';
import { logger } from '../../lib/logger.js';

function buildOverviewEmbed(analysis: FullServerAnalysis): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`Server Analysis: ${analysis.server.name}`)
    .setColor(0x3498db)
    .setThumbnail(analysis.server.iconUrl)
    .addFields(
      {
        name: 'Members',
        value: [
          `Total: **${analysis.members.total}**`,
          `Humans: **${analysis.members.humans}**`,
          `Bots: **${analysis.members.bots}**`,
        ].join('\n'),
        inline: true,
      },
      {
        name: 'Channels',
        value: [
          `Total: **${analysis.channelStats.totalChannels}**`,
          `Text: **${analysis.channelStats.textChannels}**`,
          `Voice: **${analysis.channelStats.voiceChannels}**`,
          `Categories: **${analysis.channelStats.categories}**`,
        ].join('\n'),
        inline: true,
      },
      {
        name: 'Roles',
        value: `Total: **${analysis.roles.length}**`,
        inline: true,
      },
      {
        name: 'Channel Recommendations',
        value: [
          `Keep: **${analysis.channelStats.keepCount}**`,
          `Review: **${analysis.channelStats.reviewCount}**`,
          `Delete: **${analysis.channelStats.deleteCount}**`,
        ].join('\n'),
        inline: true,
      },
      {
        name: 'Server Info',
        value: [
          `Boost Level: **${analysis.server.boostLevel}**`,
          `Boosts: **${analysis.server.boostCount}**`,
          `Created: <t:${Math.floor(new Date(analysis.server.createdAt).getTime() / 1000)}:R>`,
        ].join('\n'),
        inline: true,
      },
    )
    .setTimestamp();
}

function buildChannelEmbeds(analysis: FullServerAnalysis): EmbedBuilder[] {
  const embeds: EmbedBuilder[] = [];

  for (const category of analysis.categories) {
    if (category.channels.length === 0) continue;

    const lines = category.channels.map(ch => {
      const icon = ch.recommendation === 'keep' ? '✅' : ch.recommendation === 'delete' ? '❌' : '⚠️';
      const msgInfo = ch.messageCount > 0 ? ` (${ch.messageCount}+ msgs)` : '';
      return `${icon} **#${ch.name}** [${ch.type}]${msgInfo}\n  └ ${ch.reason}`;
    });

    // Discord embed field value limit is 1024 chars, split if needed
    let currentLines: string[] = [];
    let currentLen = 0;
    let partNum = 1;

    for (const line of lines) {
      if (currentLen + line.length + 1 > 1000 && currentLines.length > 0) {
        const embed = new EmbedBuilder()
          .setTitle(`📁 ${category.name}${partNum > 1 ? ` (pt ${partNum})` : ''}`)
          .setColor(0x2c3e50)
          .setDescription(currentLines.join('\n'));
        embeds.push(embed);
        currentLines = [];
        currentLen = 0;
        partNum++;
      }
      currentLines.push(line);
      currentLen += line.length + 1;
    }

    if (currentLines.length > 0) {
      const embed = new EmbedBuilder()
        .setTitle(`📁 ${category.name}${partNum > 1 ? ` (pt ${partNum})` : ''}`)
        .setColor(0x2c3e50)
        .setDescription(currentLines.join('\n'));
      embeds.push(embed);
    }
  }

  return embeds;
}

function buildRolesEmbed(analysis: FullServerAnalysis): EmbedBuilder {
  const roleLines = analysis.roles
    .filter(r => !r.isEveryone)
    .slice(0, 25)
    .map(r => {
      const managed = r.isManaged ? ' 🤖' : '';
      return `**${r.name}**${managed} — ${r.memberCount} members`;
    });

  return new EmbedBuilder()
    .setTitle('Roles')
    .setColor(0x9b59b6)
    .setDescription(roleLines.join('\n') || 'No roles found');
}

export const analyze: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('analyze')
    .setDescription('Full analysis of the server — channels, roles, members, and recommendations'),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    try {
      const analysis = await analyzeServer(interaction.guild);

      // Send overview embed first
      const overviewEmbed = buildOverviewEmbed(analysis);
      await interaction.editReply({ embeds: [overviewEmbed] });

      // Send channel analysis embeds as follow-ups
      const channelEmbeds = buildChannelEmbeds(analysis);
      // Discord allows max 10 embeds per message, send in batches
      for (let i = 0; i < channelEmbeds.length; i += 10) {
        const batch = channelEmbeds.slice(i, i + 10);
        await interaction.followUp({ embeds: batch });
      }

      // Send roles embed
      const rolesEmbed = buildRolesEmbed(analysis);
      await interaction.followUp({ embeds: [rolesEmbed] });

      logger.info(`Server analysis completed for ${interaction.guild.name}`);
    } catch (error) {
      logger.error(error, 'Failed to analyze server');
      await interaction.editReply({ content: 'Failed to analyze the server. Check bot logs.' });
    }
  },
};
