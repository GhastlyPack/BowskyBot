import {
  Guild,
  GuildMember,
  TextChannel,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Message,
} from 'discord.js';
import { client } from '../client.js';
import { logger } from '../../lib/logger.js';
import { verifyPurchase, findPurchaseByEmail } from './purchases.js';

// Track active tickets: discordId -> channelId
const activeTickets: Map<string, string> = new Map();

/**
 * Post the verification message with a button in the #join channel.
 */
export async function postVerifyMessage(guild: Guild, channelId: string) {
  const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
  if (!channel) throw new Error('Channel not found');

  const embed = new EmbedBuilder()
    .setTitle('Welcome to Bowsky\'s Community')
    .setColor(0x3498db)
    .setDescription(
      'This is an exclusive membership community for entrepreneurs and operators.\n\n' +
      '**Already purchased?**\n' +
      'Click the button below to verify your purchase and unlock all channels.\n\n' +
      '**Ready to join?**\n' +
      'Visit our site to get started with a Blueprint or Boardroom membership.'
    )
    .setFooter({ text: 'BowskyBot' });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('verify_ticket')
      .setLabel('Verify Purchase')
      .setStyle(ButtonStyle.Primary),
  );

  await channel.send({ embeds: [embed], components: [row] });
  logger.info(`Posted verify message in #${channel.name}`);
}

/**
 * Handle the "Verify Purchase" button click.
 * Creates a private ticket channel for the user.
 */
export async function handleVerifyButton(member: GuildMember): Promise<string> {
  const guild = member.guild;

  // Check if user already has a ticket open
  const existingTicketId = activeTickets.get(member.id);
  if (existingTicketId) {
    const existing = guild.channels.cache.get(existingTicketId);
    if (existing) {
      return `You already have a ticket open: <#${existingTicketId}>`;
    }
    // Channel was deleted, clean up
    activeTickets.delete(member.id);
  }

  // Find the SUPPORT category
  const supportCategory = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name.includes('SUPPORT')
  );

  // Create private ticket channel
  const ticketChannel = await guild.channels.create({
    name: `verify-${member.user.username}`.slice(0, 100),
    type: ChannelType.GuildText,
    parent: supportCategory?.id,
    permissionOverwrites: [
      {
        id: guild.id, // @everyone
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: member.id, // The user
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        // Management role
        id: '1055588570435424316',
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ManageChannels,
        ],
      },
      {
        // Bot
        id: client.user!.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ],
    reason: `Verification ticket for ${member.user.tag}`,
  });

  activeTickets.set(member.id, ticketChannel.id);

  // Send intro message in the ticket
  const embed = new EmbedBuilder()
    .setTitle('Purchase Verification')
    .setColor(0x3498db)
    .setDescription(
      `Hey <@${member.id}>, let's get you verified!\n\n` +
      `**Please type the email address you used to make your purchase.**\n\n` +
      `I'll match it to our records and unlock your access.`
    )
    .setFooter({ text: 'This channel is private — only you and management can see it.' });

  const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger),
  );

  await ticketChannel.send({ embeds: [embed], components: [closeRow] });

  logger.info(`Created verify ticket for ${member.user.tag}: #${ticketChannel.name}`);
  return `Ticket created! Head to <#${ticketChannel.id}> to verify your purchase.`;
}

/**
 * Handle messages in ticket channels — check if it's an email for verification.
 */
export async function handleTicketMessage(message: Message) {
  if (message.author.bot) return;
  if (!message.guild) return;

  // Check if this channel is an active ticket
  const ticketUserId = Array.from(activeTickets.entries()).find(
    ([, channelId]) => channelId === message.channelId
  )?.[0];

  if (!ticketUserId) return;
  if (message.author.id !== ticketUserId) return; // Only the ticket owner's messages

  const content = message.content.trim();

  // Check if it looks like an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(content)) {
    // Not an email — ignore or prompt
    if (content.toLowerCase() !== 'close') {
      await message.reply({
        content: 'Please type the email address you used to make your purchase.',
      });
    }
    return;
  }

  // Try to verify
  const member = await message.guild.members.fetch(message.author.id);
  const result = await verifyPurchase(message.guild, member, content);

  if (result.success) {
    const embed = new EmbedBuilder()
      .setTitle('Verified!')
      .setColor(0x2ecc71)
      .setDescription(result.message)
      .addFields(
        { name: 'Tier', value: result.tier || 'Unknown', inline: true },
      );

    await message.reply({ embeds: [embed] });

    // Log to mod-logs
    const logChannel = message.guild.channels.cache.find(
      c => c.name === 'mod-logs' || c.name === 'auto-mod-logs'
    );
    if (logChannel?.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setTitle('Purchase Verified via Ticket')
        .setColor(0x2ecc71)
        .addFields(
          { name: 'User', value: `<@${member.id}>`, inline: true },
          { name: 'Email', value: content, inline: true },
          { name: 'Tier', value: result.tier || 'Unknown', inline: true },
        )
        .setTimestamp();
      await (logChannel as any).send({ embeds: [logEmbed] });
    }

    // Auto-close after 10 seconds
    await (message.channel as TextChannel).send('This ticket will close in 10 seconds...');
    setTimeout(async () => {
      try {
        activeTickets.delete(ticketUserId);
        await (message.channel as TextChannel).delete('Verification complete');
      } catch { /* channel might already be deleted */ }
    }, 10000);
  } else {
    await message.reply({
      content: result.message + '\n\nTry again with a different email, or contact management for help.',
    });
  }
}

/**
 * Handle the "Close Ticket" button click.
 */
export async function handleCloseTicket(channelId: string, userId: string) {
  const ticketUserId = Array.from(activeTickets.entries()).find(
    ([, id]) => id === channelId
  )?.[0];

  if (ticketUserId) {
    activeTickets.delete(ticketUserId);
  }

  const guild = client.guilds.cache.first();
  if (!guild) return;

  const channel = guild.channels.cache.get(channelId);
  if (channel) {
    await channel.delete('Ticket closed');
    logger.info(`Ticket closed by ${userId}`);
  }
}
