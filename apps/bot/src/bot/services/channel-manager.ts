import {
  Guild,
  ChannelType,
  PermissionFlagsBits,
  CategoryChannel,
  TextChannel,
  VoiceChannel,
  ForumChannel,
  StageChannel,
  type GuildChannelCreateOptions,
  type OverwriteResolvable,
} from 'discord.js';
import { logger } from '../../lib/logger.js';

export interface ChannelCreateOptions {
  name: string;
  type: 'text' | 'voice' | 'forum' | 'stage' | 'announcement';
  parentId?: string;
  topic?: string;
  tier?: 'blueprint' | 'boardroom' | 'all' | null;
  position?: number;
}

export interface CategoryCreateOptions {
  name: string;
  tier?: 'blueprint' | 'boardroom' | 'all' | null;
  position?: number;
}

export interface TemplateChannel {
  name: string;
  type: 'text' | 'voice' | 'forum' | 'stage' | 'announcement';
  topic?: string;
  tier?: 'blueprint' | 'boardroom' | 'all';
}

export interface TemplateCategory {
  name: string;
  tier?: 'blueprint' | 'boardroom' | 'all' | null;
  channels: TemplateChannel[];
}

export interface ServerTemplate {
  name: string;
  categories: TemplateCategory[];
}

export interface ApplyTemplateResult {
  categoriesCreated: number;
  channelsCreated: number;
  errors: string[];
}

const CHANNEL_TYPE_MAP: Record<string, ChannelType> = {
  text: ChannelType.GuildText,
  voice: ChannelType.GuildVoice,
  forum: ChannelType.GuildForum,
  stage: ChannelType.GuildStageVoice,
  announcement: ChannelType.GuildAnnouncement,
};

function buildTierPermissions(
  guild: Guild,
  tier: 'blueprint' | 'boardroom' | 'all' | null | undefined,
): OverwriteResolvable[] {
  if (!tier) return [];

  const overwrites: OverwriteResolvable[] = [];

  // Deny @everyone by default
  overwrites.push({
    id: guild.id,
    deny: [PermissionFlagsBits.ViewChannel],
  });

  // Find tier roles
  const blueprintRole = guild.roles.cache.find(r => r.name === 'Blueprint');
  const boardroomRole = guild.roles.cache.find(r => r.name === 'Boardroom');
  const ogRole = guild.roles.cache.find(r => r.name === 'OG' || r.name === 'OG Member');
  const managementRole = guild.roles.cache.find(r => r.name === 'Management');

  // Management always sees everything
  if (managementRole) {
    overwrites.push({
      id: managementRole.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageMessages],
    });
  }

  if (tier === 'all' || tier === 'blueprint') {
    if (blueprintRole) {
      overwrites.push({ id: blueprintRole.id, allow: [PermissionFlagsBits.ViewChannel] });
    }
    if (ogRole) {
      overwrites.push({ id: ogRole.id, allow: [PermissionFlagsBits.ViewChannel] });
    }
  }

  if (tier === 'all' || tier === 'boardroom') {
    if (boardroomRole) {
      overwrites.push({ id: boardroomRole.id, allow: [PermissionFlagsBits.ViewChannel] });
    }
  }

  // Boardroom always sees blueprint channels too (higher tier)
  if (tier === 'blueprint' && boardroomRole) {
    overwrites.push({ id: boardroomRole.id, allow: [PermissionFlagsBits.ViewChannel] });
  }

  return overwrites;
}

export async function createCategory(
  guild: Guild,
  options: CategoryCreateOptions,
): Promise<CategoryChannel> {
  const permissionOverwrites = buildTierPermissions(guild, options.tier);

  const category = await guild.channels.create({
    name: options.name,
    type: ChannelType.GuildCategory,
    permissionOverwrites: permissionOverwrites.length > 0 ? permissionOverwrites : undefined,
    position: options.position,
    reason: 'Created by BowskyBot',
  });

  logger.info(`Created category: ${category.name} (${category.id})${options.tier ? ` [${options.tier}]` : ''}`);
  return category as CategoryChannel;
}

export async function createChannel(
  guild: Guild,
  options: ChannelCreateOptions,
): Promise<TextChannel | VoiceChannel | ForumChannel | StageChannel> {
  const channelType = CHANNEL_TYPE_MAP[options.type];
  if (channelType === undefined) throw new Error(`Invalid channel type: ${options.type}`);

  const permissionOverwrites = buildTierPermissions(guild, options.tier);

  const createOptions: GuildChannelCreateOptions = {
    name: options.name,
    type: channelType as any,
    parent: options.parentId,
    topic: options.topic,
    permissionOverwrites: permissionOverwrites.length > 0 ? permissionOverwrites : undefined,
    position: options.position,
    reason: 'Created by BowskyBot',
  };

  const channel = await guild.channels.create(createOptions);
  logger.info(`Created channel: #${channel.name} (${channel.id}) type=${options.type}${options.tier ? ` [${options.tier}]` : ''}`);
  return channel as TextChannel | VoiceChannel | ForumChannel | StageChannel;
}

export async function deleteChannel(guild: Guild, channelId: string): Promise<void> {
  const channel = guild.channels.cache.get(channelId);
  if (!channel) throw new Error(`Channel ${channelId} not found`);
  const name = channel.name;
  await channel.delete('Deleted by BowskyBot');
  logger.info(`Deleted channel: #${name} (${channelId})`);
}

export async function lockChannelToTier(
  guild: Guild,
  channelId: string,
  tier: 'blueprint' | 'boardroom' | 'all',
): Promise<void> {
  const channel = guild.channels.cache.get(channelId);
  if (!channel) throw new Error(`Channel ${channelId} not found`);
  if (!('permissionOverwrites' in channel)) throw new Error('Channel does not support permission overwrites');

  const overwrites = buildTierPermissions(guild, tier);
  for (const ow of overwrites) {
    await (channel as TextChannel).permissionOverwrites.create(ow.id as string, {
      ViewChannel: ow.allow ? true : undefined,
      ManageMessages: undefined,
    } as any);
  }

  logger.info(`Locked #${channel.name} to tier: ${tier}`);
}

export async function applyTemplate(
  guild: Guild,
  template: ServerTemplate,
  onProgress?: (step: string) => void,
): Promise<ApplyTemplateResult> {
  const result: ApplyTemplateResult = { categoriesCreated: 0, channelsCreated: 0, errors: [] };

  for (const catTemplate of template.categories) {
    try {
      onProgress?.(`Creating category: ${catTemplate.name}`);

      // Check if category already exists
      let category = guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === catTemplate.name.toLowerCase()
      ) as CategoryChannel | undefined;

      if (!category) {
        category = await createCategory(guild, {
          name: catTemplate.name,
          tier: catTemplate.tier,
        });
        result.categoriesCreated++;
      } else {
        logger.info(`Category "${catTemplate.name}" already exists, reusing`);
      }

      // Create channels inside the category
      for (const chTemplate of catTemplate.channels) {
        try {
          // Check if channel already exists in this category
          const existing = guild.channels.cache.find(
            c => c.parentId === category!.id && c.name.toLowerCase() === chTemplate.name.toLowerCase()
          );

          if (existing) {
            logger.info(`Channel #${chTemplate.name} already exists in ${catTemplate.name}, skipping`);
            continue;
          }

          await createChannel(guild, {
            name: chTemplate.name,
            type: chTemplate.type,
            parentId: category.id,
            topic: chTemplate.topic,
            tier: chTemplate.tier || catTemplate.tier || undefined,
          });
          result.channelsCreated++;

          // Small delay to avoid rate limits
          await new Promise(r => setTimeout(r, 500));
        } catch (err: any) {
          result.errors.push(`#${chTemplate.name}: ${err.message}`);
          logger.error(err, `Failed to create channel #${chTemplate.name}`);
        }
      }
    } catch (err: any) {
      result.errors.push(`Category ${catTemplate.name}: ${err.message}`);
      logger.error(err, `Failed to create category ${catTemplate.name}`);
    }
  }

  logger.info(`Template "${template.name}" applied: ${result.categoriesCreated} categories, ${result.channelsCreated} channels created`);
  return result;
}

/**
 * Reorder channels within a category or at the top level.
 */
export async function reorderChannels(
  guild: Guild,
  ordering: { id: string; position: number }[],
): Promise<void> {
  await guild.channels.setPositions(ordering.map(o => ({ channel: o.id, position: o.position })));
  logger.info(`Reordered ${ordering.length} channels`);
}
