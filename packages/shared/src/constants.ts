export const TIERS = {
  OG_BLUEPRINT: 'og_blueprint',
  BLUEPRINT: 'blueprint',
  BOARDROOM: 'boardroom',
  NONE: 'none',
} as const;

export const TIER_LABELS: Record<string, string> = {
  og_blueprint: 'OG Blueprint',
  blueprint: 'Blueprint',
  boardroom: 'Boardroom',
  none: 'Free',
};

export const TIER_COLORS: Record<string, number> = {
  og_blueprint: 0xffd700,  // Gold
  blueprint: 0x3498db,     // Blue
  boardroom: 0x9b59b6,     // Purple
};

export const ROLE_NAMES = {
  OG: 'OG',
  BLUEPRINT: 'Blueprint',
  BOARDROOM: 'Boardroom',
  ADMIN: 'Admin',
  MOD: 'Moderator',
} as const;

export const API_VERSION = 'v1';
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
