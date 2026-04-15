import { Guild, ChannelType, TextChannel, NewsChannel } from 'discord.js';
import { logger } from '../../lib/logger.js';

export interface ChannelAnalysis {
  id: string;
  name: string;
  type: string;
  topic: string | null;
  messageCount: number;
  lastMessageAt: string | null;
  position: number;
  recommendation: 'keep' | 'delete' | 'review';
  reason: string;
}

export interface CategoryAnalysis {
  id: string | null;
  name: string;
  channels: ChannelAnalysis[];
}

export interface RoleAnalysis {
  id: string;
  name: string;
  color: string;
  memberCount: number;
  position: number;
  isManaged: boolean;
  isEveryone: boolean;
  permissions: string[];
}

export interface MemberSummary {
  total: number;
  humans: number;
  bots: number;
  online: number;
  idle: number;
  dnd: number;
  offline: number;
}

export interface FullServerAnalysis {
  server: {
    id: string;
    name: string;
    memberCount: number;
    createdAt: string;
    ownerId: string;
    iconUrl: string | null;
    boostLevel: number;
    boostCount: number;
  };
  members: MemberSummary;
  roles: RoleAnalysis[];
  categories: CategoryAnalysis[];
  channelStats: {
    totalChannels: number;
    textChannels: number;
    voiceChannels: number;
    categories: number;
    forumChannels: number;
    stageChannels: number;
    keepCount: number;
    deleteCount: number;
    reviewCount: number;
  };
}

const CHANNEL_TYPE_NAMES: Record<number, string> = {
  [ChannelType.GuildText]: 'text',
  [ChannelType.GuildVoice]: 'voice',
  [ChannelType.GuildCategory]: 'category',
  [ChannelType.GuildAnnouncement]: 'announcement',
  [ChannelType.GuildForum]: 'forum',
  [ChannelType.GuildStageVoice]: 'stage',
  [ChannelType.GuildMedia]: 'media',
};

async function getChannelMessageCount(channel: TextChannel | NewsChannel): Promise<{ count: number; lastMessageAt: string | null }> {
  try {
    // Fetch the most recent messages to estimate activity
    const messages = await channel.messages.fetch({ limit: 100 });
    const lastMsg = messages.first();
    return {
      count: messages.size,
      lastMessageAt: lastMsg ? lastMsg.createdAt.toISOString() : null,
    };
  } catch {
    return { count: 0, lastMessageAt: null };
  }
}

function recommendChannel(messageCount: number, lastMessageAt: string | null, channelName: string): { recommendation: 'keep' | 'delete' | 'review'; reason: string } {
  // Channels with chat history are social validation — default to keep
  if (messageCount > 0) {
    const daysSinceLastMessage = lastMessageAt
      ? (Date.now() - new Date(lastMessageAt).getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    if (messageCount >= 50 || daysSinceLastMessage < 30) {
      return { recommendation: 'keep', reason: `${messageCount}+ messages, active history — social validation` };
    }
    if (messageCount >= 10) {
      return { recommendation: 'keep', reason: `${messageCount} messages with existing conversation` };
    }
    return { recommendation: 'review', reason: `${messageCount} messages — low activity, review if needed` };
  }

  // Common structural channels worth keeping even if empty
  const keepNames = ['general', 'welcome', 'rules', 'announcements', 'introductions'];
  if (keepNames.some(n => channelName.toLowerCase().includes(n))) {
    return { recommendation: 'review', reason: 'Standard community channel — review for repurpose' };
  }

  return { recommendation: 'delete', reason: 'No messages — safe to remove' };
}

export async function analyzeServer(guild: Guild): Promise<FullServerAnalysis> {
  logger.info(`Analyzing server: ${guild.name} (${guild.id})`);

  // Fetch all members
  await guild.members.fetch();
  const members = guild.members.cache;
  const humans = members.filter(m => !m.user.bot);
  const bots = members.filter(m => m.user.bot);

  const memberSummary: MemberSummary = {
    total: members.size,
    humans: humans.size,
    bots: bots.size,
    online: members.filter(m => m.presence?.status === 'online').size,
    idle: members.filter(m => m.presence?.status === 'idle').size,
    dnd: members.filter(m => m.presence?.status === 'dnd').size,
    offline: members.filter(m => !m.presence || m.presence.status === 'offline').size,
  };

  // Analyze roles
  const roles: RoleAnalysis[] = guild.roles.cache
    .sort((a, b) => b.position - a.position)
    .map(role => ({
      id: role.id,
      name: role.name,
      color: role.hexColor,
      memberCount: role.members.size,
      position: role.position,
      isManaged: role.managed,
      isEveryone: role.id === guild.id,
      permissions: role.permissions.toArray(),
    }));

  // Build a list of non-thread channels with position info
  // We use a plain array to avoid discord.js Collection type issues
  interface SimpleChannel {
    id: string;
    name: string;
    type: number;
    parentId: string | null;
    position: number;
    topic: string | null;
    raw: TextChannel | NewsChannel | null;
  }

  const allChannels: SimpleChannel[] = [];
  for (const [, ch] of guild.channels.cache) {
    if (ch.isThread()) continue;
    allChannels.push({
      id: ch.id,
      name: ch.name,
      type: ch.type,
      parentId: ch.parentId,
      position: 'position' in ch ? (ch as any).position : 0,
      topic: 'topic' in ch ? (ch as any).topic ?? null : null,
      raw: (ch.type === ChannelType.GuildText || ch.type === ChannelType.GuildAnnouncement) ? ch as TextChannel : null,
    });
  }

  const categoryChs = allChannels.filter(c => c.type === ChannelType.GuildCategory);
  const uncategorized = allChannels.filter(c => c.type !== ChannelType.GuildCategory && !c.parentId);

  const categoryAnalyses: CategoryAnalysis[] = [];

  async function analyzeChannel(ch: SimpleChannel): Promise<ChannelAnalysis> {
    const typeName = CHANNEL_TYPE_NAMES[ch.type] || 'unknown';
    let messageInfo = { count: 0, lastMessageAt: null as string | null };

    if (ch.raw) {
      messageInfo = await getChannelMessageCount(ch.raw);
    }

    const { recommendation, reason } = recommendChannel(messageInfo.count, messageInfo.lastMessageAt, ch.name);

    return {
      id: ch.id,
      name: ch.name,
      type: typeName,
      topic: ch.topic,
      messageCount: messageInfo.count,
      lastMessageAt: messageInfo.lastMessageAt,
      position: ch.position,
      recommendation,
      reason,
    };
  }

  // Uncategorized channels first
  if (uncategorized.length > 0) {
    const channels: ChannelAnalysis[] = [];
    for (const ch of uncategorized.sort((a, b) => a.position - b.position)) {
      channels.push(await analyzeChannel(ch));
    }
    categoryAnalyses.push({ id: null, name: '(No Category)', channels });
  }

  // Categorized channels
  for (const cat of categoryChs.sort((a, b) => a.position - b.position)) {
    const children = allChannels
      .filter(c => c.parentId === cat.id)
      .sort((a, b) => a.position - b.position);

    const channels: ChannelAnalysis[] = [];
    for (const ch of children) {
      channels.push(await analyzeChannel(ch));
    }

    categoryAnalyses.push({ id: cat.id, name: cat.name, channels });
  }

  // Channel stats
  const analyzedChannels = categoryAnalyses.flatMap(c => c.channels);
  const channelStats = {
    totalChannels: analyzedChannels.length,
    textChannels: analyzedChannels.filter(c => c.type === 'text').length,
    voiceChannels: analyzedChannels.filter(c => c.type === 'voice').length,
    categories: categoryChs.length,
    forumChannels: analyzedChannels.filter(c => c.type === 'forum').length,
    stageChannels: analyzedChannels.filter(c => c.type === 'stage').length,
    keepCount: analyzedChannels.filter(c => c.recommendation === 'keep').length,
    deleteCount: analyzedChannels.filter(c => c.recommendation === 'delete').length,
    reviewCount: analyzedChannels.filter(c => c.recommendation === 'review').length,
  };

  return {
    server: {
      id: guild.id,
      name: guild.name,
      memberCount: guild.memberCount,
      createdAt: guild.createdAt.toISOString(),
      ownerId: guild.ownerId,
      iconUrl: guild.iconURL({ size: 256 }),
      boostLevel: guild.premiumTier,
      boostCount: guild.premiumSubscriptionCount ?? 0,
    },
    members: memberSummary,
    roles,
    categories: categoryAnalyses,
    channelStats,
  };
}
