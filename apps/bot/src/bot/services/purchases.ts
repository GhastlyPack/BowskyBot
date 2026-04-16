import { Guild, GuildMember } from 'discord.js';
import { logger } from '../../lib/logger.js';

/**
 * In-memory purchase store.
 * Will move to PostgreSQL once we wire up the DB.
 *
 * Flow:
 * 1. Zapier sends purchase data → stored here
 * 2. User runs /verify <email> in Discord
 * 3. Bot checks this store, assigns role if found
 */

export interface Purchase {
  id: string;
  email: string;
  tier: 'blueprint' | 'boardroom';
  amount?: number;
  purchasedAt: string;
  discordId?: string;    // Set once verified
  verified: boolean;
  verifiedAt?: string;
  fanbasisId?: string;   // FanBasis transaction/subscription ID
  metadata?: Record<string, any>;
}

const purchases: Map<string, Purchase> = new Map();
let nextId = 1;

export const ROLE_IDS = {
  BLUEPRINT: '1494089896954957837',
  BOARDROOM: '1494089898976608418',
  OG_MEMBER: '1055591252688638032',
};

/**
 * Record a new purchase from Zapier webhook.
 */
export function recordPurchase(data: {
  email: string;
  tier: 'blueprint' | 'boardroom';
  amount?: number;
  fanbasisId?: string;
  metadata?: Record<string, any>;
}): Purchase {
  const id = `pur_${nextId++}`;
  const purchase: Purchase = {
    id,
    email: data.email.toLowerCase().trim(),
    tier: data.tier,
    amount: data.amount,
    purchasedAt: new Date().toISOString(),
    verified: false,
    fanbasisId: data.fanbasisId,
    metadata: data.metadata,
  };
  purchases.set(id, purchase);
  logger.info(`Purchase recorded: ${purchase.email} → ${purchase.tier} (${id})`);
  return purchase;
}

/**
 * Find an unverified purchase by email.
 */
export function findPurchaseByEmail(email: string): Purchase | undefined {
  const normalizedEmail = email.toLowerCase().trim();
  return Array.from(purchases.values()).find(
    p => p.email === normalizedEmail && !p.verified
  );
}

/**
 * Verify a purchase — assign the tier role to the Discord member.
 */
export async function verifyPurchase(
  guild: Guild,
  member: GuildMember,
  email: string,
): Promise<{ success: boolean; message: string; tier?: string }> {
  const purchase = findPurchaseByEmail(email);

  if (!purchase) {
    return {
      success: false,
      message: 'No purchase found for that email. Make sure you used the same email you purchased with.',
    };
  }

  if (purchase.verified) {
    return {
      success: false,
      message: 'This purchase has already been verified.',
    };
  }

  // Assign the tier role
  const roleId = purchase.tier === 'boardroom' ? ROLE_IDS.BOARDROOM : ROLE_IDS.BLUEPRINT;
  const roleName = purchase.tier === 'boardroom' ? 'Boardroom' : 'Blueprint';

  try {
    await member.roles.add(roleId, `Verified purchase: ${purchase.email}`);

    // Mark as verified
    purchase.verified = true;
    purchase.verifiedAt = new Date().toISOString();
    purchase.discordId = member.id;

    logger.info(`Purchase verified: ${member.user.tag} → ${roleName} (${purchase.id})`);

    return {
      success: true,
      message: `Welcome! You've been verified as a **${roleName}** member. All channels are now unlocked.`,
      tier: roleName,
    };
  } catch (err: any) {
    logger.error(err, `Failed to verify purchase for ${member.user.tag}`);
    return {
      success: false,
      message: `Something went wrong assigning your role. Please contact support.`,
    };
  }
}

/**
 * List all purchases (for admin/API use).
 */
export function listPurchases(opts?: { verified?: boolean }): Purchase[] {
  let result = Array.from(purchases.values());
  if (opts?.verified !== undefined) {
    result = result.filter(p => p.verified === opts.verified);
  }
  return result.sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
}

/**
 * Get purchase stats.
 */
export function getPurchaseStats() {
  const all = Array.from(purchases.values());
  return {
    total: all.length,
    verified: all.filter(p => p.verified).length,
    pending: all.filter(p => !p.verified).length,
    blueprint: all.filter(p => p.tier === 'blueprint').length,
    boardroom: all.filter(p => p.tier === 'boardroom').length,
  };
}
