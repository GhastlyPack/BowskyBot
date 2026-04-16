import { type Guild } from 'discord.js';
import { client } from '../client.js';
import { logger } from '../../lib/logger.js';
import { config } from '../../lib/config.js';
import crypto from 'crypto';

/**
 * FanBasis Webhook Handler — Shell
 *
 * This is the integration point for FanBasis payment events.
 * When FanBasis is set up, it will POST webhook events here.
 *
 * Expected flow:
 * 1. User pays on FanBasis (linked to their Discord account)
 * 2. FanBasis sends a webhook with payment event + Discord user ID
 * 3. We verify the signature, parse the event, assign/remove the tier role
 *
 * The exact payload format depends on FanBasis's API docs.
 * Below is a generic structure that we'll adapt once we have the account.
 */

// Tier mapping — maps FanBasis product/plan IDs to Discord role IDs
// Fill these in once FanBasis products are created
export const FANBASIS_TIER_MAP: Record<string, { roleId: string; tierName: string }> = {
  // 'fanbasis_product_id_for_blueprint': { roleId: 'BLUEPRINT_ROLE_ID', tierName: 'Blueprint' },
  // 'fanbasis_product_id_for_boardroom': { roleId: 'BOARDROOM_ROLE_ID', tierName: 'Boardroom' },
};

// Known role IDs — will be used in the mapping above
export const ROLE_IDS = {
  BLUEPRINT: '1494089896954957837',
  BOARDROOM: '1494089898976608418',
  OG_MEMBER: '1055591252688638032',
};

export interface FanBasisWebhookPayload {
  event: string;           // e.g. 'payment.success', 'subscription.cancelled', 'subscription.renewed'
  timestamp: string;
  data: {
    userId?: string;       // FanBasis user ID
    discordId?: string;    // Discord user ID (if linked)
    email?: string;
    productId?: string;    // Which product they bought
    planId?: string;       // Which plan/tier
    amount?: number;
    currency?: string;
    subscriptionId?: string;
    status?: string;       // 'active', 'cancelled', 'past_due', etc.
    [key: string]: any;    // Additional fields TBD
  };
}

/**
 * Verify webhook signature from FanBasis.
 * Exact implementation depends on FanBasis's signing method.
 * Common patterns: HMAC-SHA256 of the raw body with a shared secret.
 */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;

  // HMAC-SHA256 verification (most common pattern)
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Process a FanBasis webhook event.
 * This is the main handler — routes events to the right action.
 */
export async function processFanBasisEvent(
  guildId: string,
  payload: FanBasisWebhookPayload,
): Promise<{ action: string; success: boolean; details: string }> {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) {
    return { action: 'error', success: false, details: 'Guild not found' };
  }

  const { event, data } = payload;
  const discordId = data.discordId;

  if (!discordId) {
    logger.warn(`FanBasis event ${event} has no discordId — cannot assign role`);
    return { action: event, success: false, details: 'No Discord ID in payload' };
  }

  logger.info(`FanBasis event: ${event} for Discord user ${discordId}`);

  switch (event) {
    case 'payment.success':
    case 'subscription.created':
    case 'subscription.renewed':
      return await handleSubscriptionActive(guild, discordId, data);

    case 'subscription.cancelled':
    case 'subscription.expired':
    case 'payment.failed':
    case 'payment.refunded':
      return await handleSubscriptionEnded(guild, discordId, data);

    default:
      logger.info(`Unhandled FanBasis event: ${event}`);
      return { action: event, success: true, details: 'Event acknowledged but no action taken' };
  }
}

/**
 * Handle an active subscription — assign the appropriate tier role.
 */
async function handleSubscriptionActive(
  guild: Guild,
  discordId: string,
  data: FanBasisWebhookPayload['data'],
): Promise<{ action: string; success: boolean; details: string }> {
  try {
    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) {
      return { action: 'assign_role', success: false, details: `Member ${discordId} not found in server` };
    }

    // Determine which role to assign based on product/plan
    let roleId = ROLE_IDS.BLUEPRINT; // Default to Blueprint
    let tierName = 'Blueprint';

    if (data.productId && FANBASIS_TIER_MAP[data.productId]) {
      roleId = FANBASIS_TIER_MAP[data.productId].roleId;
      tierName = FANBASIS_TIER_MAP[data.productId].tierName;
    } else if (data.planId && FANBASIS_TIER_MAP[data.planId]) {
      roleId = FANBASIS_TIER_MAP[data.planId].roleId;
      tierName = FANBASIS_TIER_MAP[data.planId].tierName;
    }

    // Assign role if they don't already have it
    if (!member.roles.cache.has(roleId)) {
      await member.roles.add(roleId, `FanBasis: ${tierName} subscription active`);
      logger.info(`Assigned ${tierName} role to ${member.user.tag}`);
    }

    return {
      action: 'assign_role',
      success: true,
      details: `Assigned ${tierName} to ${member.user.tag}`,
    };
  } catch (err: any) {
    logger.error(err, `Failed to assign role for ${discordId}`);
    return { action: 'assign_role', success: false, details: err.message };
  }
}

/**
 * Handle a cancelled/expired subscription — remove the tier role.
 */
async function handleSubscriptionEnded(
  guild: Guild,
  discordId: string,
  data: FanBasisWebhookPayload['data'],
): Promise<{ action: string; success: boolean; details: string }> {
  try {
    const member = await guild.members.fetch(discordId).catch(() => null);
    if (!member) {
      return { action: 'remove_role', success: false, details: `Member ${discordId} not found in server` };
    }

    // Remove both tier roles (in case they had one)
    const rolesToRemove = [ROLE_IDS.BLUEPRINT, ROLE_IDS.BOARDROOM];

    for (const roleId of rolesToRemove) {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId, 'FanBasis: subscription ended');
        logger.info(`Removed role ${roleId} from ${member.user.tag}`);
      }
    }

    // Log to staff channel
    const logChannel = guild.channels.cache.find(
      c => c.name === 'mod-logs' || c.name === 'auto-mod-logs'
    );
    if (logChannel?.isTextBased()) {
      await (logChannel as any).send({
        content: `Subscription ended for <@${discordId}> — tier roles removed.`,
      });
    }

    return {
      action: 'remove_role',
      success: true,
      details: `Removed tier roles from ${member.user.tag}`,
    };
  } catch (err: any) {
    logger.error(err, `Failed to remove role for ${discordId}`);
    return { action: 'remove_role', success: false, details: err.message };
  }
}
