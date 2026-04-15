import { Router } from 'express';
import { client } from '../../bot/client.js';
import {
  listRoles,
  createRole,
  deleteRole,
  assignRole,
  removeRole,
  bulkAssignRole,
  bulkRemoveRole,
  tagOGMembers,
  ensureTierRoles,
} from '../../bot/services/role-manager.js';
import { logger } from '../../lib/logger.js';

const router = Router();

// GET /api/v1/servers/:serverId/roles
router.get('/:serverId/roles', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) { res.status(404).json({ success: false, error: 'Server not found' }); return; }

  const roles = await listRoles(guild);
  res.json({ success: true, data: roles });
});

// POST /api/v1/servers/:serverId/roles
router.post('/:serverId/roles', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) { res.status(404).json({ success: false, error: 'Server not found' }); return; }

  const { name, color, hoist, mentionable } = req.body;
  if (!name) { res.status(400).json({ success: false, error: 'name is required' }); return; }

  try {
    const role = await createRole(guild, { name, color, hoist, mentionable });
    res.json({ success: true, data: { id: role.id, name: role.name, color: role.hexColor } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/servers/:serverId/roles/:roleId
router.delete('/:serverId/roles/:roleId', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) { res.status(404).json({ success: false, error: 'Server not found' }); return; }

  try {
    await deleteRole(guild, req.params.roleId);
    res.json({ success: true, message: 'Role deleted' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PATCH /api/v1/servers/:serverId/members/:memberId/roles — assign or remove a role
router.patch('/:serverId/members/:memberId/roles', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) { res.status(404).json({ success: false, error: 'Server not found' }); return; }

  const { roleId, action } = req.body;
  if (!roleId || !action) {
    res.status(400).json({ success: false, error: 'roleId and action (add/remove) are required' });
    return;
  }

  try {
    if (action === 'add') {
      await assignRole(guild, req.params.memberId, roleId);
    } else if (action === 'remove') {
      await removeRole(guild, req.params.memberId, roleId);
    } else {
      res.status(400).json({ success: false, error: 'action must be "add" or "remove"' });
      return;
    }
    res.json({ success: true, message: `Role ${action === 'add' ? 'assigned' : 'removed'}` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/servers/:serverId/members/bulk-role
router.post('/:serverId/members/bulk-role', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) { res.status(404).json({ success: false, error: 'Server not found' }); return; }

  const { memberIds, roleId, action } = req.body;
  if (!roleId || !action) {
    res.status(400).json({ success: false, error: 'roleId and action (add/remove) are required' });
    return;
  }

  try {
    // If no memberIds provided, use all humans or all with the role
    let ids: string[] = memberIds;
    if (!ids || ids.length === 0) {
      if (guild.members.cache.size < guild.memberCount * 0.9) {
        try { await guild.members.fetch(); } catch { /* use cache */ }
      }
      if (action === 'add') {
        ids = guild.members.cache.filter(m => !m.user.bot).map(m => m.id);
      } else {
        ids = guild.members.cache.filter(m => m.roles.cache.has(roleId)).map(m => m.id);
      }
    }

    logger.info(`API: Bulk ${action} role ${roleId} for ${ids.length} members`);

    let result;
    if (action === 'add') {
      result = await bulkAssignRole(guild, ids, roleId);
    } else if (action === 'remove') {
      result = await bulkRemoveRole(guild, ids, roleId);
    } else {
      res.status(400).json({ success: false, error: 'action must be "add" or "remove"' });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error(error, 'Bulk role operation failed');
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/servers/:serverId/members/tag-og
router.post('/:serverId/members/tag-og', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) { res.status(404).json({ success: false, error: 'Server not found' }); return; }

  try {
    logger.info(`API: Tagging OG members in ${guild.name}`);
    const { role, result } = await tagOGMembers(guild);
    res.json({
      success: true,
      data: {
        roleId: role.id,
        roleName: role.name,
        ...result,
      },
    });
  } catch (error: any) {
    logger.error(error, 'Failed to tag OG members');
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/servers/:serverId/roles/setup-tiers
router.post('/:serverId/roles/setup-tiers', async (req, res) => {
  const guild = client.guilds.cache.get(req.params.serverId);
  if (!guild) { res.status(404).json({ success: false, error: 'Server not found' }); return; }

  try {
    const { blueprint, boardroom, og } = await ensureTierRoles(guild);
    res.json({
      success: true,
      data: {
        blueprint: { id: blueprint.id, name: blueprint.name },
        boardroom: { id: boardroom.id, name: boardroom.name },
        og: { id: og.id, name: og.name },
      },
    });
  } catch (error: any) {
    logger.error(error, 'Failed to setup tier roles');
    res.status(500).json({ success: false, error: error.message });
  }
});

export { router as rolesRouter };
