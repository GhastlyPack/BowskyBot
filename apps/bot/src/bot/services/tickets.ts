import {
  Guild,
  GuildMember,
  TextChannel,
  DMChannel,
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
import { verifyPurchase } from './purchases.js';

// Track active verify tickets: discordId -> channelId (server channel or 'dm')
const activeTickets: Map<string, { type: 'channel' | 'dm'; channelId?: string }> = new Map();

// Track active support tickets: discordId -> channelId
const activeSupportTickets: Map<string, string> = new Map();

// TODO: Replace with actual checkout URL once FanBasis is set up
const CHECKOUT_URL = 'https://bowskysbusiness.club';

/**
 * Post the join message with two buttons in the #join channel.
 */
export async function postVerifyMessage(guild: Guild, channelId: string) {
  const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
  if (!channel) throw new Error('Channel not found');

  const embed = new EmbedBuilder()
    .setTitle("Bowsky's Community")
    .setColor(0x3498db)
    .setDescription(
      "An exclusive membership community for entrepreneurs and operators building real businesses.\n\n" +
      "**Ready to join?**\n" +
      "Click **Gain Access** to learn about membership options and get your checkout link.\n\n" +
      "**Already purchased?**\n" +
      "Click **Verify Purchase** to unlock your access."
    )
    .setFooter({ text: 'BowskyBot' });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('gain_access')
      .setLabel('Gain Access')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('verify_ticket')
      .setLabel('Verify Purchase')
      .setStyle(ButtonStyle.Primary),
  );

  await channel.send({ embeds: [embed], components: [row] });
  logger.info(`Posted join message in #${channel.name}`);
}

/**
 * Handle "Gain Access" button — DM the user membership info + checkout link.
 */
export async function handleGainAccess(member: GuildMember): Promise<string> {
  const blueprintEmbed = new EmbedBuilder()
    .setTitle("Bowsky's Blueprint — $99/month")
    .setColor(0x3498db)
    .setDescription(
      "**The system. The playbook.**\n\n" +
      "For aspiring entrepreneurs and early-stage operators who need structure, frameworks, and direction.\n\n" +
      "**What you get:**\n" +
      "- Private community access with other builders\n" +
      "- Monthly group call with Q&A\n" +
      "- Content vault: frameworks, templates, SOPs, scripts\n" +
      "- Monthly actionable drops — one implementable system per month\n" +
      "- Resources library"
    );

  const boardroomEmbed = new EmbedBuilder()
    .setTitle("Bowsky's Boardroom — $999+/month")
    .setColor(0x9b59b6)
    .setDescription(
      "**The room. The strategy. The access.**\n\n" +
      "For 7-8 figure operators who want networking, tactical depth, and proximity.\n\n" +
      "**What you get:**\n" +
      "- Everything in Blueprint\n" +
      "- 4 weekly calls (hot seats + lessons)\n" +
      "- Networking, events, meetups, member directory\n" +
      "- Deal flow and opportunity channel\n" +
      "- Discounted access to in-person events and mastermind dinners"
    );

  const ctaEmbed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setDescription(
      `**Ready to join?**\n[Click here to get started](${CHECKOUT_URL})\n\n` +
      "Once you've purchased, come back to the server and click **Verify Purchase** to unlock your access."
    );

  try {
    await member.user.send({ embeds: [blueprintEmbed, boardroomEmbed, ctaEmbed] });
    logger.info(`Sent membership info DM to ${member.user.tag}`);
    return "Check your DMs! I've sent you the membership details and checkout link.";
  } catch {
    logger.warn(`Could not DM ${member.user.tag} — DMs likely disabled`);
    return "I couldn't send you a DM. Please make sure your DMs are open, or visit " + CHECKOUT_URL + " to get started.";
  }
}

/**
 * Handle "Verify Purchase" button — try DM first, fall back to server ticket channel.
 */
export async function handleVerifyButton(member: GuildMember): Promise<string> {
  const guild = member.guild;

  // Check if user already has a ticket open
  const existing = activeTickets.get(member.id);
  if (existing) {
    if (existing.type === 'dm') {
      return "You already have a verification in progress in your DMs with me. Check your DMs!";
    }
    if (existing.channelId) {
      const ch = guild.channels.cache.get(existing.channelId);
      if (ch) return `You already have a ticket open: <#${existing.channelId}>`;
    }
    activeTickets.delete(member.id);
  }

  // Try DM first
  try {
    const verifyEmbed = new EmbedBuilder()
      .setTitle('Purchase Verification')
      .setColor(0x3498db)
      .setDescription(
        "Let's get you verified!\n\n" +
        "**Please reply with the email address you used to make your purchase.**\n\n" +
        "I'll match it to our records and unlock your access in the server."
      )
      .setFooter({ text: 'This is a private conversation between you and BowskyBot.' });

    await member.user.send({ embeds: [verifyEmbed] });
    activeTickets.set(member.id, { type: 'dm' });
    logger.info(`Started DM verification for ${member.user.tag}`);
    return "Check your DMs! I've sent you a message to verify your purchase.";
  } catch {
    // DMs disabled — fall back to server ticket channel
    logger.info(`DMs disabled for ${member.user.tag}, creating server ticket`);
    return await createServerTicket(member);
  }
}

/**
 * Create a private ticket channel in the server (fallback when DMs are disabled).
 */
async function createServerTicket(member: GuildMember): Promise<string> {
  const guild = member.guild;

  const supportCategory = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name.includes('SUPPORT')
  );

  const ticketChannel = await guild.channels.create({
    name: `verify-${member.user.username}`.slice(0, 100),
    type: ChannelType.GuildText,
    parent: supportCategory?.id,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: '1055588570435424316', // Management
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ManageChannels,
        ],
      },
      {
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

  activeTickets.set(member.id, { type: 'channel', channelId: ticketChannel.id });

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

  logger.info(`Created server verify ticket for ${member.user.tag}: #${ticketChannel.name}`);
  return `Ticket created! Head to <#${ticketChannel.id}> to verify your purchase.`;
}

/**
 * Handle messages — works for both DM verification and server ticket channels.
 */
export async function handleTicketMessage(message: Message) {
  if (message.author.bot) return;

  const ticket = activeTickets.get(message.author.id);
  if (!ticket) return;

  // Verify this is the right context
  if (ticket.type === 'dm' && message.channel.type !== ChannelType.DM) return;
  if (ticket.type === 'channel' && message.channelId !== ticket.channelId) return;

  const content = message.content.trim();

  // Check if it looks like an email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(content)) {
    await message.reply({
      content: 'Please type the email address you used to make your purchase.',
    });
    return;
  }

  // Need guild context for role assignment
  const guild = client.guilds.cache.get('1055579007107727441');
  if (!guild) {
    await message.reply({ content: 'Something went wrong. Please try again later.' });
    return;
  }

  const member = await guild.members.fetch(message.author.id).catch(() => null);
  if (!member) {
    await message.reply({ content: "I couldn't find you in the server. Make sure you've joined first." });
    return;
  }

  const result = await verifyPurchase(guild, member, content);

  if (result.success) {
    const embed = new EmbedBuilder()
      .setTitle('Verified!')
      .setColor(0x2ecc71)
      .setDescription(result.message)
      .addFields({ name: 'Tier', value: result.tier || 'Unknown', inline: true });

    await message.reply({ embeds: [embed] });

    // Log to mod-logs
    const logChannel = guild.channels.cache.find(
      c => c.name === 'mod-logs' || c.name === 'auto-mod-logs'
    );
    if (logChannel?.isTextBased()) {
      const logEmbed = new EmbedBuilder()
        .setTitle('Purchase Verified')
        .setColor(0x2ecc71)
        .addFields(
          { name: 'User', value: `<@${member.id}>`, inline: true },
          { name: 'Email', value: content, inline: true },
          { name: 'Tier', value: result.tier || 'Unknown', inline: true },
          { name: 'Via', value: ticket.type === 'dm' ? 'DM' : 'Server Ticket', inline: true },
        )
        .setTimestamp();
      await (logChannel as any).send({ embeds: [logEmbed] });
    }

    // Clean up
    activeTickets.delete(message.author.id);

    // If server ticket, auto-close
    if (ticket.type === 'channel' && ticket.channelId) {
      await (message.channel as TextChannel).send('This ticket will close in 10 seconds...');
      setTimeout(async () => {
        try {
          const ch = guild.channels.cache.get(ticket.channelId!);
          if (ch) await ch.delete('Verification complete');
        } catch { /* already deleted */ }
      }, 10000);
    }
  } else {
    await message.reply({
      content: result.message + '\n\nTry again with a different email, or contact management for help.',
    });
  }
}

/**
 * Handle DM messages — route to ticket handler if user has active DM verification.
 */
export async function handleDmMessage(message: Message) {
  if (message.author.bot) return;
  if (message.channel.type !== ChannelType.DM) return;

  const ticket = activeTickets.get(message.author.id);
  if (ticket?.type === 'dm') {
    await handleTicketMessage(message);
  }
}

/**
 * Handle the "Close Ticket" button click.
 */
export async function handleCloseTicket(channelId: string, userId: string) {
  const ticket = activeTickets.get(userId);
  if (ticket) {
    activeTickets.delete(userId);
  }

  // Also check by channelId in case someone else (management) closes it
  for (const [uid, t] of activeTickets.entries()) {
    if (t.channelId === channelId) {
      activeTickets.delete(uid);
      break;
    }
  }

  // Also clean up support tickets
  for (const [uid, chId] of activeSupportTickets.entries()) {
    if (chId === channelId) {
      activeSupportTickets.delete(uid);
      break;
    }
  }

  const guild = client.guilds.cache.first();
  if (!guild) return;

  const channel = guild.channels.cache.get(channelId);
  if (channel) {
    await channel.delete('Ticket closed');
    logger.info(`Ticket closed by ${userId}`);
  }
}

// ===== SUPPORT TICKETS =====

/**
 * Post the support message with a button in #support.
 */
export async function postSupportMessage(guild: Guild, channelId: string) {
  const channel = guild.channels.cache.get(channelId) as TextChannel | undefined;
  if (!channel) throw new Error('Channel not found');

  const embed = new EmbedBuilder()
    .setTitle('Need Help?')
    .setColor(0x3498db)
    .setDescription(
      "Click the button below to open a private support ticket. " +
      "A management team member will be with you shortly.\n\n" +
      "**Common issues we can help with:**\n" +
      "- Purchase verification problems\n" +
      "- Cannot access channels\n" +
      "- Call links not working\n" +
      "- Account or billing questions\n" +
      "- General questions about the community"
    )
    .setFooter({ text: 'BowskyBot' });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('open_support')
      .setLabel('Open Support Ticket')
      .setStyle(ButtonStyle.Primary),
  );

  await channel.send({ embeds: [embed], components: [row] });
  logger.info(`Posted support message in #${channel.name}`);
}

/**
 * Handle "Open Support Ticket" button — creates a private support channel.
 */
export async function handleOpenSupport(member: GuildMember): Promise<string> {
  const guild = member.guild;

  // Check for existing ticket
  const existingId = activeSupportTickets.get(member.id);
  if (existingId) {
    const existing = guild.channels.cache.get(existingId);
    if (existing) {
      return `You already have a support ticket open: <#${existingId}>`;
    }
    activeSupportTickets.delete(member.id);
  }

  const supportCategory = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name.includes('SUPPORT')
  );

  const ticketChannel = await guild.channels.create({
    name: `support-${member.user.username}`.slice(0, 100),
    type: ChannelType.GuildText,
    parent: supportCategory?.id,
    permissionOverwrites: [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: member.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: '1055588570435424316', // Management
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ManageChannels,
        ],
      },
      {
        id: client.user!.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ],
    reason: `Support ticket for ${member.user.tag}`,
  });

  activeSupportTickets.set(member.id, ticketChannel.id);

  const embed = new EmbedBuilder()
    .setTitle('Support Ticket')
    .setColor(0x3498db)
    .setDescription(
      `Hey <@${member.id}>, a management team member will be with you shortly.\n\n` +
      `In the meantime, please describe your issue here so we can help you faster.`
    )
    .setFooter({ text: 'This channel is private — only you and management can see it.' });

  const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger),
  );

  await ticketChannel.send({ embeds: [embed], components: [closeRow] });

  // Notify in mod-logs
  const logChannel = guild.channels.cache.find(
    c => c.name === 'mod-logs' || c.name === 'auto-mod-logs'
  );
  if (logChannel?.isTextBased()) {
    await (logChannel as any).send({
      content: `New support ticket opened by <@${member.id}> — <#${ticketChannel.id}>`,
    });
  }

  logger.info(`Created support ticket for ${member.user.tag}: #${ticketChannel.name}`);
  return `Ticket created! Head to <#${ticketChannel.id}>`;
}
