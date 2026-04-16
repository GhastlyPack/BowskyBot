import { GuildMember, EmbedBuilder, TextChannel } from 'discord.js';
import { logger } from '../../lib/logger.js';

/**
 * Handle new member joining the server.
 * No DM on join — they see the #join channel with Gain Access / Verify Purchase buttons.
 * Just log to staff.
 */
export async function handleMemberJoin(member: GuildMember) {
  if (member.user.bot) return;

  logger.info(`New member joined: ${member.user.tag} (${member.id})`);

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
