export interface ChannelInfo {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
  position: number;
  tier: 'blueprint' | 'boardroom' | 'all' | null;
}

export interface ChannelTemplate {
  id: number;
  serverId: string;
  name: string;
  template: CategoryTemplate[];
  isActive: boolean;
}

export interface CategoryTemplate {
  name: string;
  tier: 'blueprint' | 'boardroom' | 'all' | null;
  channels: ChannelTemplateEntry[];
}

export interface ChannelTemplateEntry {
  name: string;
  type: 'text' | 'voice' | 'forum' | 'stage' | 'announcement';
  topic?: string;
  tier?: 'blueprint' | 'boardroom' | 'all';
}
