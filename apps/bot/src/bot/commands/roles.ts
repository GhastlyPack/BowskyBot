import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import type { BotCommand } from '../client.js';
import {
  tagOGMembers,
  ensureTierRoles,
  bulkAssignRole,
  bulkRemoveRole,
  assignRole,
  removeRole,
  listRoles,
  createRole,
} from '../services/role-manager.js';
import { logger } from '../../lib/logger.js';

export const roles: BotCommand = {
  data: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Manage server roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub =>
      sub.setName('tag-og')
        .setDescription('Tag all current human members with the OG Member role'),
    )
    .addSubcommand(sub =>
      sub.setName('setup-tiers')
        .setDescription('Create Blueprint, Boardroom, and OG Member roles if they don\'t exist'),
    )
    .addSubcommand(sub =>
      sub.setName('assign')
        .setDescription('Assign a role to a member')
        .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true)),
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a role from a member')
        .addUserOption(opt => opt.setName('user').setDescription('Target member').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true)),
    )
    .addSubcommand(sub =>
      sub.setName('bulk-assign')
        .setDescription('Assign a role to all members who have another role')
        .addRoleOption(opt => opt.setName('target-role').setDescription('Role to assign').setRequired(true))
        .addRoleOption(opt => opt.setName('filter-role').setDescription('Only members with this role (optional)').setRequired(false)),
    )
    .addSubcommand(sub =>
      sub.setName('bulk-remove')
        .setDescription('Remove a role from all members who have it')
        .addRoleOption(opt => opt.setName('target-role').setDescription('Role to remove').setRequired(true)),
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all roles and their member counts'),
    )
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a new role')
        .addStringOption(opt => opt.setName('name').setDescription('Role name').setRequired(true))
        .addStringOption(opt => opt.setName('color').setDescription('Hex color (e.g. #ff0000)').setRequired(false))
        .addBooleanOption(opt => opt.setName('hoist').setDescription('Show separately in member list').setRequired(false)),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: 'This command can only be used in a server.', flags: 64 });
      return;
    }

    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'tag-og':
        await handleTagOG(interaction);
        break;
      case 'setup-tiers':
        await handleSetupTiers(interaction);
        break;
      case 'assign':
        await handleAssign(interaction);
        break;
      case 'remove':
        await handleRemove(interaction);
        break;
      case 'bulk-assign':
        await handleBulkAssign(interaction);
        break;
      case 'bulk-remove':
        await handleBulkRemove(interaction);
        break;
      case 'list':
        await handleList(interaction);
        break;
      case 'create':
        await handleCreate(interaction);
        break;
    }
  },
};

async function handleTagOG(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const guild = interaction.guild!;

  try {
    let lastUpdate = Date.now();
    const { role, result } = await tagOGMembers(guild, (done, total) => {
      // Update progress every 5 seconds
      if (Date.now() - lastUpdate > 5000) {
        lastUpdate = Date.now();
        const pct = Math.round((done / total) * 100);
        interaction.editReply(`Tagging OG members... ${done}/${total} (${pct}%)`).catch(() => {});
      }
    });

    const embed = new EmbedBuilder()
      .setTitle('OG Member Tagging Complete')
      .setColor(0xffd700)
      .addFields(
        { name: 'Role', value: `<@&${role.id}>`, inline: true },
        { name: 'Assigned', value: `${result.success}`, inline: true },
        { name: 'Already Had', value: `${result.skipped}`, inline: true },
        { name: 'Failed', value: `${result.failed}`, inline: true },
        { name: 'Total Processed', value: `${result.total}`, inline: true },
      );

    if (result.errors.length > 0) {
      embed.addFields({ name: 'Errors (first 5)', value: result.errors.slice(0, 5).join('\n') });
    }

    await interaction.editReply({ content: '', embeds: [embed] });
  } catch (error) {
    logger.error(error, 'Failed to tag OG members');
    await interaction.editReply('Failed to tag OG members. Check bot logs.');
  }
}

async function handleSetupTiers(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const guild = interaction.guild!;

  try {
    const { blueprint, boardroom, og } = await ensureTierRoles(guild);

    const embed = new EmbedBuilder()
      .setTitle('Tier Roles Ready')
      .setColor(0x2ecc71)
      .addFields(
        { name: 'Blueprint', value: `<@&${blueprint.id}>`, inline: true },
        { name: 'Boardroom', value: `<@&${boardroom.id}>`, inline: true },
        { name: 'OG Member', value: `<@&${og.id}>`, inline: true },
      );

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error(error, 'Failed to setup tier roles');
    await interaction.editReply('Failed to setup tier roles. Check bot logs.');
  }
}

async function handleAssign(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild!;
  const user = interaction.options.getUser('user', true);
  const role = interaction.options.getRole('role', true);

  try {
    await assignRole(guild, user.id, role.id);
    await interaction.reply({ content: `Assigned <@&${role.id}> to <@${user.id}>`, flags: 64 });
  } catch (error: any) {
    await interaction.reply({ content: `Failed: ${error.message}`, flags: 64 });
  }
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild!;
  const user = interaction.options.getUser('user', true);
  const role = interaction.options.getRole('role', true);

  try {
    await removeRole(guild, user.id, role.id);
    await interaction.reply({ content: `Removed <@&${role.id}> from <@${user.id}>`, flags: 64 });
  } catch (error: any) {
    await interaction.reply({ content: `Failed: ${error.message}`, flags: 64 });
  }
}

async function handleBulkAssign(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const guild = interaction.guild!;
  const targetRole = interaction.options.getRole('target-role', true);
  const filterRole = interaction.options.getRole('filter-role', false);

  // Ensure members are cached
  if (guild.members.cache.size < guild.memberCount * 0.9) {
    try { await guild.members.fetch(); } catch { /* use cache */ }
  }

  let memberIds: string[];
  if (filterRole) {
    memberIds = guild.members.cache
      .filter(m => !m.user.bot && m.roles.cache.has(filterRole.id))
      .map(m => m.id);
  } else {
    memberIds = guild.members.cache
      .filter(m => !m.user.bot)
      .map(m => m.id);
  }

  const filterText = filterRole ? ` (filtered by <@&${filterRole.id}>)` : ' (all humans)';
  await interaction.editReply(`Bulk assigning <@&${targetRole.id}> to ${memberIds.length} members${filterText}...`);

  try {
    let lastUpdate = Date.now();
    const result = await bulkAssignRole(guild, memberIds, targetRole.id, (done, total) => {
      if (Date.now() - lastUpdate > 5000) {
        lastUpdate = Date.now();
        const pct = Math.round((done / total) * 100);
        interaction.editReply(`Assigning <@&${targetRole.id}>... ${done}/${total} (${pct}%)`).catch(() => {});
      }
    });

    const embed = new EmbedBuilder()
      .setTitle('Bulk Role Assignment Complete')
      .setColor(0x3498db)
      .addFields(
        { name: 'Role', value: `<@&${targetRole.id}>`, inline: true },
        { name: 'Assigned', value: `${result.success}`, inline: true },
        { name: 'Already Had', value: `${result.skipped}`, inline: true },
        { name: 'Failed', value: `${result.failed}`, inline: true },
      );

    await interaction.editReply({ content: '', embeds: [embed] });
  } catch (error) {
    logger.error(error, 'Bulk assign failed');
    await interaction.editReply('Bulk assign failed. Check bot logs.');
  }
}

async function handleBulkRemove(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const guild = interaction.guild!;
  const targetRole = interaction.options.getRole('target-role', true);

  const memberIds = guild.members.cache
    .filter(m => m.roles.cache.has(targetRole.id))
    .map(m => m.id);

  await interaction.editReply(`Bulk removing <@&${targetRole.id}> from ${memberIds.length} members...`);

  try {
    let lastUpdate = Date.now();
    const result = await bulkRemoveRole(guild, memberIds, targetRole.id, (done, total) => {
      if (Date.now() - lastUpdate > 5000) {
        lastUpdate = Date.now();
        const pct = Math.round((done / total) * 100);
        interaction.editReply(`Removing <@&${targetRole.id}>... ${done}/${total} (${pct}%)`).catch(() => {});
      }
    });

    const embed = new EmbedBuilder()
      .setTitle('Bulk Role Removal Complete')
      .setColor(0xe74c3c)
      .addFields(
        { name: 'Role', value: `<@&${targetRole.id}>`, inline: true },
        { name: 'Removed', value: `${result.success}`, inline: true },
        { name: 'Didn\'t Have', value: `${result.skipped}`, inline: true },
        { name: 'Failed', value: `${result.failed}`, inline: true },
      );

    await interaction.editReply({ content: '', embeds: [embed] });
  } catch (error) {
    logger.error(error, 'Bulk remove failed');
    await interaction.editReply('Bulk remove failed. Check bot logs.');
  }
}

async function handleList(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ flags: 64 });
  const guild = interaction.guild!;

  const roleList = await listRoles(guild);
  const lines = roleList.map(r => {
    const managed = r.isManaged ? ' 🤖' : '';
    return `<@&${r.id}>${managed} — **${r.memberCount}** members`;
  });

  // Split into chunks if too long
  const chunks: string[] = [];
  let current = '';
  for (const line of lines) {
    if (current.length + line.length + 1 > 4000) {
      chunks.push(current);
      current = '';
    }
    current += (current ? '\n' : '') + line;
  }
  if (current) chunks.push(current);

  for (let i = 0; i < chunks.length; i++) {
    const embed = new EmbedBuilder()
      .setTitle(i === 0 ? `Roles (${roleList.length})` : `Roles (cont.)`)
      .setColor(0x9b59b6)
      .setDescription(chunks[i]);

    if (i === 0) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.followUp({ embeds: [embed], flags: 64 });
    }
  }
}

async function handleCreate(interaction: ChatInputCommandInteraction) {
  const guild = interaction.guild!;
  const name = interaction.options.getString('name', true);
  const colorStr = interaction.options.getString('color', false);
  const hoist = interaction.options.getBoolean('hoist', false) ?? false;

  let color: number | undefined;
  if (colorStr) {
    const hex = colorStr.replace('#', '');
    color = parseInt(hex, 16);
    if (isNaN(color)) {
      await interaction.reply({ content: `Invalid color: ${colorStr}. Use hex format like #ff0000`, flags: 64 });
      return;
    }
  }

  try {
    const role = await createRole(guild, { name, color, hoist });
    await interaction.reply({ content: `Created role <@&${role.id}>`, flags: 64 });
  } catch (error: any) {
    await interaction.reply({ content: `Failed: ${error.message}`, flags: 64 });
  }
}
