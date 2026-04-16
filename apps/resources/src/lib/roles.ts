const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001';
const BOT_API_KEY = process.env.BOT_API_KEY || 'bowsky-prod-key-change-later';
const GUILD_ID = process.env.DISCORD_GUILD_ID || '1055579007107727441';

const ROLE_IDS = {
  MANAGEMENT: '1055588570435424316',
  BLUEPRINT: '1494089896954957837',
  BOARDROOM: '1494089898976608418',
  OG_MEMBER: '1055591252688638032',
};

export type UserTier = 'management' | 'boardroom' | 'blueprint' | 'og' | 'none';

export async function getUserTier(discordId: string): Promise<UserTier> {
  try {
    const res = await fetch(`${BOT_API_URL}/api/v1/servers/${GUILD_ID}/members/${discordId}`, {
      headers: { 'X-API-Key': BOT_API_KEY },
      cache: 'no-store',
    });
    const data = await res.json();
    if (!data.success) return 'none';

    const roleIds = data.data.roles.map((r: any) => r.id);

    if (roleIds.includes(ROLE_IDS.MANAGEMENT)) return 'management';
    if (roleIds.includes(ROLE_IDS.BOARDROOM)) return 'boardroom';
    if (roleIds.includes(ROLE_IDS.BLUEPRINT)) return 'blueprint';
    if (roleIds.includes(ROLE_IDS.OG_MEMBER)) return 'og';
    return 'none';
  } catch {
    return 'none';
  }
}

export function canAccessTier(userTier: UserTier, requiredTier: string): boolean {
  if (userTier === 'management') return true;
  if (userTier === 'boardroom') return true; // Boardroom sees everything
  if (userTier === 'blueprint' || userTier === 'og') {
    return requiredTier === 'blueprint' || requiredTier === 'all';
  }
  return false;
}
