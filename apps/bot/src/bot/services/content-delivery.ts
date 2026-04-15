import { Guild, TextChannel, EmbedBuilder, type ColorResolvable } from 'discord.js';
import { logger } from '../../lib/logger.js';

export interface SendMessageOptions {
  channelId: string;
  content?: string;
  embed?: {
    title?: string;
    description?: string;
    color?: number;
    fields?: { name: string; value: string; inline?: boolean }[];
    footer?: string;
    thumbnail?: string;
    image?: string;
  };
}

export async function sendMessage(guild: Guild, options: SendMessageOptions): Promise<string> {
  const channel = guild.channels.cache.get(options.channelId);
  if (!channel) throw new Error(`Channel ${options.channelId} not found`);
  if (!channel.isTextBased()) throw new Error('Channel is not text-based');

  const textChannel = channel as TextChannel;
  const payload: any = {};

  if (options.content) {
    payload.content = options.content;
  }

  if (options.embed) {
    const embed = new EmbedBuilder();
    if (options.embed.title) embed.setTitle(options.embed.title);
    if (options.embed.description) embed.setDescription(options.embed.description);
    if (options.embed.color) embed.setColor(options.embed.color as ColorResolvable);
    if (options.embed.fields) {
      for (const field of options.embed.fields) {
        embed.addFields({ name: field.name, value: field.value, inline: field.inline });
      }
    }
    if (options.embed.footer) embed.setFooter({ text: options.embed.footer });
    if (options.embed.thumbnail) embed.setThumbnail(options.embed.thumbnail);
    if (options.embed.image) embed.setImage(options.embed.image);
    embed.setTimestamp();
    payload.embeds = [embed];
  }

  const msg = await textChannel.send(payload);
  logger.info(`Sent message to #${textChannel.name} (${msg.id})`);
  return msg.id;
}

export async function sendAnnouncement(
  guild: Guild,
  channelId: string,
  title: string,
  body: string,
  color: number = 0x3498db,
): Promise<string> {
  return sendMessage(guild, {
    channelId,
    embed: {
      title,
      description: body,
      color,
      footer: 'BowskyBot',
    },
  });
}
