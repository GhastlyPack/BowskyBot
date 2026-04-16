import Anthropic from '@anthropic-ai/sdk';
import { client } from '../bot/client.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { analyzeServer } from '../bot/services/server-analysis.js';
import { listRoles, assignRole, removeRole, bulkAssignRole, tagOGMembers, ensureTierRoles, createRole } from '../bot/services/role-manager.js';
import { createChannel, createCategory, deleteChannel } from '../bot/services/channel-manager.js';
import { sendMessage, sendAnnouncement } from '../bot/services/content-delivery.js';
import { createSchedule, getSchedules, deleteSchedule, getUpcoming } from '../bot/services/scheduler.js';

const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

// Conversation history per session
const conversations: Map<string, Anthropic.MessageParam[]> = new Map();

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'list_roles',
    description: 'List all roles in the server with member counts',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'create_role',
    description: 'Create a new role in the server',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Role name' },
        color: { type: 'number', description: 'Hex color as integer (e.g. 0x3498db)' },
        hoist: { type: 'boolean', description: 'Show separately in member list' },
      },
      required: ['name'],
    },
  },
  {
    name: 'assign_role',
    description: 'Assign a role to a specific member',
    input_schema: {
      type: 'object' as const,
      properties: {
        memberId: { type: 'string', description: 'Discord user ID' },
        roleId: { type: 'string', description: 'Discord role ID' },
      },
      required: ['memberId', 'roleId'],
    },
  },
  {
    name: 'remove_role',
    description: 'Remove a role from a specific member',
    input_schema: {
      type: 'object' as const,
      properties: {
        memberId: { type: 'string', description: 'Discord user ID' },
        roleId: { type: 'string', description: 'Discord role ID' },
      },
      required: ['memberId', 'roleId'],
    },
  },
  {
    name: 'tag_og_members',
    description: 'Tag all current human members with the OG Member role',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'setup_tier_roles',
    description: 'Ensure Blueprint, Boardroom, and OG Member roles exist',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'list_channels',
    description: 'List all channels in the server grouped by category',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'create_channel',
    description: 'Create a new channel in the server',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Channel name' },
        type: { type: 'string', enum: ['text', 'voice', 'forum', 'announcement'], description: 'Channel type' },
        parentId: { type: 'string', description: 'Category ID to put the channel in' },
        topic: { type: 'string', description: 'Channel topic' },
        tier: { type: 'string', enum: ['blueprint', 'boardroom', 'all'], description: 'Lock channel to a tier' },
      },
      required: ['name', 'type'],
    },
  },
  {
    name: 'create_category',
    description: 'Create a new channel category',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Category name' },
        tier: { type: 'string', enum: ['blueprint', 'boardroom', 'all'], description: 'Lock category to a tier' },
      },
      required: ['name'],
    },
  },
  {
    name: 'delete_channel',
    description: 'Delete a channel or category',
    input_schema: {
      type: 'object' as const,
      properties: {
        channelId: { type: 'string', description: 'Channel ID to delete' },
      },
      required: ['channelId'],
    },
  },
  {
    name: 'send_message',
    description: 'Send a text message to a channel',
    input_schema: {
      type: 'object' as const,
      properties: {
        channelId: { type: 'string', description: 'Channel ID' },
        content: { type: 'string', description: 'Message content' },
      },
      required: ['channelId', 'content'],
    },
  },
  {
    name: 'send_announcement',
    description: 'Send a rich embed announcement to a channel',
    input_schema: {
      type: 'object' as const,
      properties: {
        channelId: { type: 'string', description: 'Channel ID' },
        title: { type: 'string', description: 'Announcement title' },
        body: { type: 'string', description: 'Announcement body text' },
      },
      required: ['channelId', 'title', 'body'],
    },
  },
  {
    name: 'list_schedules',
    description: 'List all call schedules',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'create_schedule',
    description: 'Create a recurring call schedule',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Call title' },
        tier: { type: 'string', enum: ['blueprint', 'boardroom', 'all'], description: 'Which tier' },
        channelId: { type: 'string', description: 'Text channel ID for reminders' },
        voiceChannelId: { type: 'string', description: 'Voice channel ID for the call' },
        recurrence: { type: 'string', enum: ['weekly', 'biweekly', 'monthly'], description: 'How often' },
        dayOfWeek: { type: 'number', description: '0=Sunday through 6=Saturday' },
        hour: { type: 'number', description: 'Hour in UTC (0-23)' },
        minute: { type: 'number', description: 'Minute (0-59)' },
        durationMin: { type: 'number', description: 'Duration in minutes' },
      },
      required: ['title', 'tier', 'channelId', 'recurrence', 'dayOfWeek', 'hour'],
    },
  },
  {
    name: 'delete_schedule',
    description: 'Delete a call schedule',
    input_schema: {
      type: 'object' as const,
      properties: {
        scheduleId: { type: 'string', description: 'Schedule ID' },
      },
      required: ['scheduleId'],
    },
  },
  {
    name: 'get_upcoming_calls',
    description: 'Get upcoming calls in the next 7 days',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_server_stats',
    description: 'Get server statistics — member count, online count, channel count, roles, boost info',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'search_members',
    description: 'Search for members by username or display name',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  },
];

async function executeTool(guildId: string, toolName: string, input: any): Promise<{ result: string; action?: { type: string; description: string; result: 'success' | 'error' } }> {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) throw new Error('Guild not found');

  switch (toolName) {
    case 'list_roles': {
      const roles = await listRoles(guild);
      const text = roles.map(r => `${r.name}: ${r.memberCount} members (${r.color})${r.isManaged ? ' [bot]' : ''}`).join('\n');
      return { result: text || 'No roles found' };
    }

    case 'create_role': {
      const role = await createRole(guild, input);
      return {
        result: `Created role "${role.name}" (${role.id})`,
        action: { type: 'create_role', description: `Created role "${role.name}"`, result: 'success' },
      };
    }

    case 'assign_role': {
      await assignRole(guild, input.memberId, input.roleId);
      return {
        result: `Assigned role ${input.roleId} to member ${input.memberId}`,
        action: { type: 'assign_role', description: `Assigned role to member`, result: 'success' },
      };
    }

    case 'remove_role': {
      await removeRole(guild, input.memberId, input.roleId);
      return {
        result: `Removed role ${input.roleId} from member ${input.memberId}`,
        action: { type: 'remove_role', description: `Removed role from member`, result: 'success' },
      };
    }

    case 'tag_og_members': {
      const { role, result } = await tagOGMembers(guild);
      return {
        result: `Tagged OG members with "${role.name}": ${result.success} assigned, ${result.skipped} already had it, ${result.failed} failed`,
        action: { type: 'tag_og', description: `Tagged ${result.success} OG members`, result: 'success' },
      };
    }

    case 'setup_tier_roles': {
      const tiers = await ensureTierRoles(guild);
      return {
        result: `Tier roles ready: Blueprint (${tiers.blueprint.id}), Boardroom (${tiers.boardroom.id}), OG (${tiers.og.id})`,
        action: { type: 'setup_tiers', description: 'Ensured tier roles exist', result: 'success' },
      };
    }

    case 'list_channels': {
      const channels: string[] = [];
      for (const [, ch] of guild.channels.cache.filter(c => !c.isThread())) {
        if (ch.type === 4) {
          channels.push(`\nCategory: ${ch.name} (${ch.id})`);
        } else {
          const parent = ch.parentId ? '' : ' [uncategorized]';
          channels.push(`  #${ch.name} (${ch.id}) [${ch.type}]${parent}`);
        }
      }
      return { result: channels.join('\n') || 'No channels found' };
    }

    case 'create_channel': {
      const ch = await createChannel(guild, input);
      return {
        result: `Created channel #${ch.name} (${ch.id})`,
        action: { type: 'create_channel', description: `Created #${ch.name}`, result: 'success' },
      };
    }

    case 'create_category': {
      const cat = await createCategory(guild, input);
      return {
        result: `Created category "${cat.name}" (${cat.id})`,
        action: { type: 'create_category', description: `Created category "${cat.name}"`, result: 'success' },
      };
    }

    case 'delete_channel': {
      await deleteChannel(guild, input.channelId);
      return {
        result: `Deleted channel ${input.channelId}`,
        action: { type: 'delete_channel', description: 'Deleted channel', result: 'success' },
      };
    }

    case 'send_message': {
      const msgId = await sendMessage(guild, { channelId: input.channelId, content: input.content });
      return {
        result: `Sent message (${msgId})`,
        action: { type: 'send_message', description: 'Sent message', result: 'success' },
      };
    }

    case 'send_announcement': {
      const msgId = await sendAnnouncement(guild, input.channelId, input.title, input.body);
      return {
        result: `Sent announcement (${msgId})`,
        action: { type: 'send_announcement', description: `Announced: ${input.title}`, result: 'success' },
      };
    }

    case 'list_schedules': {
      const scheds = getSchedules(guildId);
      if (scheds.length === 0) return { result: 'No schedules configured' };
      const text = scheds.map(s => `${s.title} (${s.id}) — ${s.recurrence} ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][s.dayOfWeek]} at ${s.hour}:${String(s.minute).padStart(2,'0')} UTC [${s.tier}]`).join('\n');
      return { result: text };
    }

    case 'create_schedule': {
      const sched = createSchedule({ ...input, serverId: guildId });
      return {
        result: `Created schedule "${sched.title}" (${sched.id})`,
        action: { type: 'create_schedule', description: `Created schedule "${sched.title}"`, result: 'success' },
      };
    }

    case 'delete_schedule': {
      deleteSchedule(input.scheduleId);
      return {
        result: `Deleted schedule ${input.scheduleId}`,
        action: { type: 'delete_schedule', description: 'Deleted schedule', result: 'success' },
      };
    }

    case 'get_upcoming_calls': {
      const upcoming = getUpcoming(guildId);
      if (upcoming.length === 0) return { result: 'No upcoming calls in the next 7 days' };
      const text = upcoming.map(u => `${u.schedule.title} — ${u.nextAt.toISOString()}`).join('\n');
      return { result: text };
    }

    case 'get_server_stats': {
      return {
        result: `Server: ${guild.name}\nMembers: ${guild.memberCount}\nOnline: ${guild.members.cache.filter(m => m.presence?.status === 'online').size}\nChannels: ${guild.channels.cache.size}\nRoles: ${guild.roles.cache.size}\nBoost Level: ${guild.premiumTier}\nBoosts: ${guild.premiumSubscriptionCount ?? 0}`,
      };
    }

    case 'search_members': {
      const query = input.query.toLowerCase();
      const matches = guild.members.cache
        .filter(m => !m.user.bot && (m.user.username.toLowerCase().includes(query) || (m.nickname?.toLowerCase().includes(query) ?? false)))
        .first(10);
      if (matches.length === 0) return { result: 'No members found' };
      const text = matches.map(m => `${m.displayName} (@${m.user.username}) — ID: ${m.id} — Roles: ${m.roles.cache.filter(r => r.id !== guild.id).map(r => r.name).join(', ')}`).join('\n');
      return { result: text };
    }

    default:
      return { result: `Unknown tool: ${toolName}` };
  }
}

function buildSystemPrompt(guildId: string): string {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return 'You are BowskyBot, a Discord server management assistant.';

  const roleList = guild.roles.cache
    .filter(r => r.id !== guild.id && !r.managed)
    .sort((a, b) => b.position - a.position)
    .first(15)
    .map(r => `${r.name} (${r.id}): ${r.members.size} members`);

  const channelList = guild.channels.cache
    .filter(c => !c.isThread() && c.type !== 4)
    .first(30)
    .map(c => `#${c.name} (${c.id}) [${c.type === 0 ? 'text' : c.type === 2 ? 'voice' : c.type}] in ${c.parentId ? guild.channels.cache.get(c.parentId)?.name || 'unknown' : 'no category'}`);

  return `You are BowskyBot, an AI assistant for managing the "${guild.name}" Discord server.

Server Info:
- Members: ${guild.memberCount}
- Boost Level: ${guild.premiumTier}

Top Roles:
${roleList.join('\n')}

Channels:
${channelList.join('\n')}

You can manage roles, channels, schedules, and send messages using the available tools. Be concise and action-oriented. When the user asks you to do something, use the appropriate tool. When listing information, format it clearly.`;
}

export interface AiChatResult {
  response: string;
  actions: { type: string; description: string; result: 'success' | 'error' }[];
  conversationId: string;
}

export async function handleAiChat(guildId: string, message: string, conversationId?: string): Promise<AiChatResult> {
  const convId = conversationId || `conv_${Date.now()}`;

  // Get or create conversation history
  if (!conversations.has(convId)) {
    conversations.set(convId, []);
  }
  const history = conversations.get(convId)!;

  // Add user message
  history.push({ role: 'user', content: message });

  const actions: AiChatResult['actions'] = [];

  // Call Claude with tools
  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: buildSystemPrompt(guildId),
    tools: TOOLS,
    messages: history,
  });

  // Handle tool use loop
  while (response.stop_reason === 'tool_use') {
    const assistantContent = response.content;
    history.push({ role: 'assistant', content: assistantContent });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of assistantContent) {
      if (block.type === 'tool_use') {
        logger.info(`AI tool call: ${block.name}(${JSON.stringify(block.input)})`);
        try {
          const { result, action } = await executeTool(guildId, block.name, block.input);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
          if (action) actions.push(action);
        } catch (err: any) {
          logger.error(err, `AI tool error: ${block.name}`);
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: `Error: ${err.message}`, is_error: true });
          actions.push({ type: block.name, description: err.message, result: 'error' });
        }
      }
    }

    history.push({ role: 'user', content: toolResults });

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: buildSystemPrompt(guildId),
      tools: TOOLS,
      messages: history,
    });
  }

  // Extract text response
  const textBlocks = response.content.filter(b => b.type === 'text');
  const responseText = textBlocks.map(b => b.type === 'text' ? b.text : '').join('\n');

  history.push({ role: 'assistant', content: response.content });

  // Trim conversation if too long
  if (history.length > 40) {
    conversations.set(convId, history.slice(-20));
  }

  return { response: responseText, actions, conversationId: convId };
}
