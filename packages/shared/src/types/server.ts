export interface ServerConfig {
  id: string;
  name: string;
  iconUrl: string | null;
  ownerId: string;
  memberCount: number;
  isActive: boolean;
}

export interface ServerSettings {
  serverId: string;
  welcomeChannel: string | null;
  logChannel: string | null;
  modRoleId: string | null;
  blueprintRoleId: string | null;
  boardroomRoleId: string | null;
  ogRoleId: string | null;
  trialDays: number;
  fanbasisWebhookSecret: string | null;
  aiEnabled: boolean;
}
