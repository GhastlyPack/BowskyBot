import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import type { BotCommand } from '../client.js';
import {
  createCategory,
  createChannel,
  deleteChannel,
  applyTemplate,
  type ServerTemplate,
} from '../services/channel-manager.js';
import { sendMessage } from '../services/content-delivery.js';
import { logger } from '../../lib/logger.js';

export const channels: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('channels')
    .setDescription('Manage server channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(sub =>
      sub.setName('create-category')
        .setDescription('Create a new category')
        .addStringOption(opt => opt.setName('name').setDescription('Category name').setRequired(true))
        .addStringOption(opt =>
          opt.setName('tier').setDescription('Lock to tier')
            .addChoices(
              { name: 'All tiers', value: 'all' },
              { name: 'Blueprint only', value: 'blueprint' },
              { name: 'Boardroom only', value: 'boardroom' },
              { name: 'Public (no lock)', value: 'none' },
            )
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a new channel')
        .addStringOption(opt => opt.setName('name').setDescription('Channel name').setRequired(true))
        .addStringOption(opt =>
          opt.setName('type').setDescription('Channel type')
            .addChoices(
              { name: 'Text', value: 'text' },
              { name: 'Voice', value: 'voice' },
              { name: 'Forum', value: 'forum' },
              { name: 'Stage', value: 'stage' },
              { name: 'Announcement', value: 'announcement' },
            )
            .setRequired(true),
        )
        .addChannelOption(opt => opt.setName('category').setDescription('Parent category').setRequired(false))
        .addStringOption(opt => opt.setName('topic').setDescription('Channel topic').setRequired(false))
        .addStringOption(opt =>
          opt.setName('tier').setDescription('Lock to tier')
            .addChoices(
              { name: 'All tiers', value: 'all' },
              { name: 'Blueprint only', value: 'blueprint' },
              { name: 'Boardroom only', value: 'boardroom' },
              { name: 'Public (no lock)', value: 'none' },
            )
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete a channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to delete').setRequired(true)),
    )
    .addSubcommand(sub =>
      sub.setName('send')
        .setDescription('Send a message to a channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(true))
        .addStringOption(opt => opt.setName('message').setDescription('Message content').setRequired(true)),
    )
    .addSubcommand(sub =>
      sub.setName('announce')
        .setDescription('Send an embed announcement')
        .addChannelOption(opt => opt.setName('channel').setDescription('Target channel').setRequired(true))
        .addStringOption(opt => opt.setName('title').setDescription('Announcement title').setRequired(true))
        .addStringOption(opt => opt.setName('body').setDescription('Announcement body').setRequired(true)),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'Server only.', flags: 64 });
      return;
    }

    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'create-category': {
        const name = interaction.options.getString('name', true);
        const tierStr = interaction.options.getString('tier', false);
        const tier = tierStr === 'none' ? null : tierStr as any;

        try {
          const cat = await createCategory(interaction.guild, { name, tier });
          await interaction.reply({ content: `Created category **${cat.name}**${tier ? ` [${tier}]` : ''}`, flags: 64 });
        } catch (err: any) {
          await interaction.reply({ content: `Failed: ${err.message}`, flags: 64 });
        }
        break;
      }

      case 'create': {
        const name = interaction.options.getString('name', true);
        const type = interaction.options.getString('type', true) as any;
        const category = interaction.options.getChannel('category', false);
        const topic = interaction.options.getString('topic', false) ?? undefined;
        const tierStr = interaction.options.getString('tier', false);
        const tier = tierStr === 'none' ? undefined : tierStr as any;

        try {
          const ch = await createChannel(interaction.guild, {
            name,
            type,
            parentId: category?.id,
            topic,
            tier,
          });
          await interaction.reply({ content: `Created <#${ch.id}>${tier ? ` [${tier}]` : ''}`, flags: 64 });
        } catch (err: any) {
          await interaction.reply({ content: `Failed: ${err.message}`, flags: 64 });
        }
        break;
      }

      case 'delete': {
        const channel = interaction.options.getChannel('channel', true);
        try {
          await deleteChannel(interaction.guild, channel.id);
          await interaction.reply({ content: `Deleted #${channel.name}`, flags: 64 });
        } catch (err: any) {
          await interaction.reply({ content: `Failed: ${err.message}`, flags: 64 });
        }
        break;
      }

      case 'send': {
        const channel = interaction.options.getChannel('channel', true);
        const message = interaction.options.getString('message', true);

        try {
          await sendMessage(interaction.guild, { channelId: channel.id, content: message });
          await interaction.reply({ content: `Sent to <#${channel.id}>`, flags: 64 });
        } catch (err: any) {
          await interaction.reply({ content: `Failed: ${err.message}`, flags: 64 });
        }
        break;
      }

      case 'announce': {
        const channel = interaction.options.getChannel('channel', true);
        const title = interaction.options.getString('title', true);
        const body = interaction.options.getString('body', true);

        try {
          await sendMessage(interaction.guild, {
            channelId: channel.id,
            embed: { title, description: body, color: 0x3498db, footer: 'BowskyBot' },
          });
          await interaction.reply({ content: `Announcement sent to <#${channel.id}>`, flags: 64 });
        } catch (err: any) {
          await interaction.reply({ content: `Failed: ${err.message}`, flags: 64 });
        }
        break;
      }
    }
  },
};
