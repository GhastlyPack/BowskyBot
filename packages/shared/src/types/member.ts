export type Tier = 'og_blueprint' | 'blueprint' | 'boardroom' | 'none';

export interface Member {
  id: number;
  serverId: string;
  discordId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  tier: Tier;
  isOg: boolean;
  joinedServerAt: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  isActive: boolean;
}

export interface MemberRole {
  memberId: number;
  roleId: string;
  assignedAt: Date;
  assignedBy: string;
}
