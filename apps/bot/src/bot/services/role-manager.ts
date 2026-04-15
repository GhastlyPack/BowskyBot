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

// Timeout wrapper — rejects if the promise doesn't resolve in time
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${label} after ${ms}ms`)), ms)),
  ]);
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
  const DELAY_MS = 250; // delay between each assignment
  const TIMEOUT_MS = 10000; // 10s timeout per operation

  for (let i = 0; i < memberIds.length; i++) {
    const id = memberIds[i];
    try {
      const member = guild.members.cache.get(id);
      if (!member) {
        result.failed++;
        if (result.errors.length < 20) result.errors.push(`Member ${id} not found in cache`);
        continue;
      }
      if (member.roles.cache.has(roleId)) {
        result.skipped++;
        // No delay needed for skips
      } else {
        await withTimeout(
          member.roles.add(roleId, 'Bulk assigned by BowskyBot'),
          TIMEOUT_MS,
          `assign role to ${id}`,
        );
        result.success++;
        await delay(DELAY_MS);
      }
    } catch (err: any) {
      result.failed++;
      if (result.errors.length < 20) result.errors.push(`${id}: ${err.message}`);
      // Back off on errors (likely rate limit)
      await delay(2000);
    }

    if ((i + 1) % 50 === 0 || i === memberIds.length - 1) {
      onProgress?.(i + 1, memberIds.length);
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
  const DELAY_MS = 250;
  const TIMEOUT_MS = 10000;

  for (let i = 0; i < memberIds.length; i++) {
    const id = memberIds[i];
    try {
      const member = guild.members.cache.get(id);
      if (!member) {
        result.failed++;
        continue;
      }
      if (!member.roles.cache.has(roleId)) {
        result.skipped++;
      } else {
        await withTimeout(
          member.roles.remove(roleId, 'Bulk removed by BowskyBot'),
          TIMEOUT_MS,
          `remove role from ${id}`,
        );
        result.success++;
        await delay(DELAY_MS);
      }
    } catch (err: any) {
      result.failed++;
      if (result.errors.length < 20) result.errors.push(`${id}: ${err.message}`);
      await delay(2000);
    }

    if ((i + 1) % 50 === 0 || i === memberIds.length - 1) {
      onProgress?.(i + 1, memberIds.length);
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
