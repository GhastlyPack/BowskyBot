import { GuildMember, EmbedBuilder, TextChannel } from 'discord.js';
import { client } from '../client.js';
import { logger } from '../../lib/logger.js';

/**
 * Handle new member joining the server.
 *
 * Flow:
 * 1. Send welcome DM explaining the community and how to get access
 * 2. Log the join in the staff log channel
 *
 * They land in the server seeing ONLY the #join channel (GET ACCESS category).
 * Everything else is paywalled behind Blueprint/OG/Boardroom roles.
 * FanBasis handles payment → webhook → role assignment.
 */
export async function handleMemberJoin(member: GuildMember) {
  if (member.user.bot) return;

  logger.info(`New member joined: ${member.user.tag} (${member.id})`);

  // Send welcome DM
  try {
    const embed = new EmbedBuilder()
      .setTitle(`Welcome to ${member.guild.name}!`)
      .setColor(0x3498db)
      .setDescription(
        `Hey ${member.displayName}, welcome to the community.\n\n` +
        `This is an exclusive membership community for entrepreneurs and operators.\n\n` +
        `**To get full access:**\n` +
        `Check out the **#join** channel in the server to see membership options.\n\n` +
        `Once you're a member, you'll unlock all the channels, resources, calls, and community access.`
      )
      .setFooter({ text: 'BowskyBot' })
      .setTimestamp();

    await member.user.send({ embeds: [embed] });
    logger.info(`Sent welcome DM to ${member.user.tag}`);
  } catch (err) {
    // DMs might be disabled — that's fine
    logger.warn(`Could not DM ${member.user.tag} — DMs likely disabled`);
  }

  // Log to staff channel
  try {
    const logChannel = member.guild.channels.cache.find(
      c => c.name === 'mod-logs' || c.name === 'auto-mod-logs'
    ) as TextChannel | undefined;

    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle('Member Joined')
        .setColor(0x2ecc71)
        .setThumbnail(member.user.displayAvatarURL({ size: 64 }))
        .addFields(
          { name: 'User', value: `<@${member.id}> (${member.user.tag})`, inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'Member #', value: `${member.guild.memberCount}`, inline: true },
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    }
  } catch (err) {
    logger.warn(err, 'Failed to log member join');
  }
}

/**
 * Handle member leaving the server.
 */
export async function handleMemberLeave(member: GuildMember) {
  if (member.user.bot) return;

  logger.info(`Member left: ${member.user.tag} (${member.id})`);

  try {
    const logChannel = member.guild.channels.cache.find(
      c => c.name === 'mod-logs' || c.name === 'auto-mod-logs'
    ) as TextChannel | undefined;

    if (logChannel) {
      const roles = member.roles.cache
        .filter(r => r.id !== member.guild.id)
        .map(r => r.name)
        .join(', ') || 'None';

      const embed = new EmbedBuilder()
        .setTitle('Member Left')
        .setColor(0xe74c3c)
        .setThumbnail(member.user.displayAvatarURL({ size: 64 }))
        .addFields(
          { name: 'User', value: `${member.user.tag} (${member.id})`, inline: true },
          { name: 'Roles', value: roles, inline: true },
          { name: 'Joined', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>` : 'Unknown', inline: true },
        )
        .setTimestamp();

      await logChannel.send({ embeds: [embed] });
    }
  } catch (err) {
    logger.warn(err, 'Failed to log member leave');
  }
}
