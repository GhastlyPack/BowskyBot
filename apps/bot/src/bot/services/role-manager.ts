import { Guild, Role, GuildMember, PermissionFlagsBits, ColorResolvable } from 'discord.js';
import { logger } from '../../lib/logger.js';

export interface RoleCreateOptions {
  name: string;
  color?: ColorResolvable;
  hoist?: boolean;
  mentionable?: boolean;
  reason?: string;
}

export interface BulkRoleResult {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export interface RoleInfo {
  id: string;
  name: string;
  color: string;
  memberCount: number;
  position: number;
  isManaged: boolean;
}

// Rate-limit aware delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function createRole(guild: Guild, options: RoleCreateOptions): Promise<Role> {
  const role = await guild.roles.create({
    name: options.name,
    color: options.color,
    hoist: options.hoist ?? false,
    mentionable: options.mentionable ?? false,
    reason: options.reason ?? 'Created by BowskyBot',
  });
  logger.info(`Created role: ${role.name} (${role.id}) in ${guild.name}`);
  return role;
}

export async function deleteRole(guild: Guild, roleId: string): Promise<void> {
  const role = guild.roles.cache.get(roleId);
  if (!role) throw new Error(`Role ${roleId} not found`);
  if (role.managed) throw new Error(`Cannot delete managed role: ${role.name}`);
  if (role.id === guild.id) throw new Error('Cannot delete @everyone role');

  await role.delete('Deleted by BowskyBot');
  logger.info(`Deleted role: ${role.name} (${role.id}) in ${guild.name}`);
}

export async function listRoles(guild: Guild): Promise<RoleInfo[]> {
  return guild.roles.cache
    .sort((a, b) => b.position - a.position)
    .filter(r => r.id !== guild.id)
    .map(role => ({
      id: role.id,
      name: role.name,
      color: role.hexColor,
      memberCount: role.members.size,
      position: role.position,
      isManaged: role.managed,
    }));
}

export async function assignRole(guild: Guild, memberId: string, roleId: string): Promise<void> {
  const member = await guild.members.fetch(memberId);
  if (member.roles.cache.has(roleId)) return; // already has it
  await member.roles.add(roleId, 'Assigned by BowskyBot');
  logger.info(`Assigned role ${roleId} to ${member.user.tag} in ${guild.name}`);
}

export async function removeRole(guild: Guild, memberId: string, roleId: string): Promise<void> {
  const member = await guild.members.fetch(memberId);
  if (!member.roles.cache.has(roleId)) return; // doesn't have it
  await member.roles.remove(roleId, 'Removed by BowskyBot');
  logger.info(`Removed role ${roleId} from ${member.user.tag} in ${guild.name}`);
}

export async function bulkAssignRole(
  guild: Guild,
  memberIds: string[],
  roleId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<BulkRoleResult> {
  const role = guild.roles.cache.get(roleId);
  if (!role) throw new Error(`Role ${roleId} not found`);

  const result: BulkRoleResult = { total: memberIds.length, success: 0, failed: 0, skipped: 0, errors: [] };
  const BATCH_SIZE = 10;
  const BATCH_DELAY_MS = 1500; // stay under rate limits

  for (let i = 0; i < memberIds.length; i += BATCH_SIZE) {
    const batch = memberIds.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (id) => {
        try {
          const member = guild.members.cache.get(id);
          if (!member) {
            result.failed++;
            result.errors.push(`Member ${id} not found in cache`);
            return;
          }
          if (member.roles.cache.has(roleId)) {
            result.skipped++;
            return;
          }
          await member.roles.add(roleId, 'Bulk assigned by BowskyBot');
          result.success++;
        } catch (err: any) {
          result.failed++;
          result.errors.push(`${id}: ${err.message}`);
        }
      }),
    );

    onProgress?.(Math.min(i + BATCH_SIZE, memberIds.length), memberIds.length);

    if (i + BATCH_SIZE < memberIds.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  logger.info(`Bulk assign complete for role ${role.name}: ${result.success} assigned, ${result.skipped} skipped, ${result.failed} failed`);
  return result;
}

export async function bulkRemoveRole(
  guild: Guild,
  memberIds: string[],
  roleId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<BulkRoleResult> {
  const role = guild.roles.cache.get(roleId);
  if (!role) throw new Error(`Role ${roleId} not found`);

  const result: BulkRoleResult = { total: memberIds.length, success: 0, failed: 0, skipped: 0, errors: [] };
  const BATCH_SIZE = 10;
  const BATCH_DELAY_MS = 1500;

  for (let i = 0; i < memberIds.length; i += BATCH_SIZE) {
    const batch = memberIds.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (id) => {
        try {
          const member = guild.members.cache.get(id);
          if (!member) {
            result.failed++;
            return;
          }
          if (!member.roles.cache.has(roleId)) {
            result.skipped++;
            return;
          }
          await member.roles.remove(roleId, 'Bulk removed by BowskyBot');
          result.success++;
        } catch (err: any) {
          result.failed++;
          result.errors.push(`${id}: ${err.message}`);
        }
      }),
    );

    onProgress?.(Math.min(i + BATCH_SIZE, memberIds.length), memberIds.length);

    if (i + BATCH_SIZE < memberIds.length) {
      await delay(BATCH_DELAY_MS);
    }
  }

  logger.info(`Bulk remove complete for role ${role.name}: ${result.success} removed, ${result.skipped} skipped, ${result.failed} failed`);
  return result;
}

/**
 * Tag all current human members as OG.
 * Finds or creates the OG role, then bulk-assigns it to every human member who doesn't have it.
 */
export async function tagOGMembers(
  guild: Guild,
  onProgress?: (done: number, total: number) => void,
): Promise<{ role: Role; result: BulkRoleResult }> {
  // Find existing OG role or create one
  let ogRole = guild.roles.cache.find(r => r.name === 'OG' || r.name === 'OG Member');
  if (!ogRole) {
    ogRole = await createRole(guild, {
      name: 'OG Member',
      color: 0xffd700, // Gold
      hoist: true,
      reason: 'OG Member role — grandfathered members',
    });
  }

  // Ensure members are cached
  if (guild.members.cache.size < guild.memberCount * 0.9) {
    try {
      await guild.members.fetch();
    } catch (err) {
      logger.warn(err, 'Rate limited fetching members, using cache');
    }
  }

  // Get all human members
  const humanIds = guild.members.cache
    .filter(m => !m.user.bot)
    .map(m => m.id);

  logger.info(`Tagging ${humanIds.length} humans as OG in ${guild.name}`);

  const result = await bulkAssignRole(guild, humanIds, ogRole.id, onProgress);
  return { role: ogRole, result };
}

/**
 * Ensure tier roles exist, creating them if they don't.
 */
export async function ensureTierRoles(guild: Guild): Promise<{
  blueprint: Role;
  boardroom: Role;
  og: Role;
}> {
  let blueprint = guild.roles.cache.find(r => r.name === 'Blueprint');
  if (!blueprint) {
    blueprint = await createRole(guild, {
      name: 'Blueprint',
      color: 0x3498db,
      hoist: true,
      reason: 'Blueprint tier role',
    });
  }

  let boardroom = guild.roles.cache.find(r => r.name === 'Boardroom');
  if (!boardroom) {
    boardroom = await createRole(guild, {
      name: 'Boardroom',
      color: 0x9b59b6,
      hoist: true,
      reason: 'Boardroom tier role',
    });
  }

  let og = guild.roles.cache.find(r => r.name === 'OG' || r.name === 'OG Member');
  if (!og) {
    og = await createRole(guild, {
      name: 'OG Member',
      color: 0xffd700,
      hoist: true,
      reason: 'OG Member role',
    });
  }

  return { blueprint, boardroom, og };
}
