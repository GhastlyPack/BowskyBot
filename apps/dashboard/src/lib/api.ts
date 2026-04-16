const API_BASE = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:3001';
const API_KEY = process.env.BOT_API_KEY || 'bowsky-prod-key-change-later';

interface ApiOptions {
  method?: string;
  body?: any;
  server?: boolean; // true = server-side call (uses API key)
}

export async function botApi<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, server = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (server) {
    headers['X-API-Key'] = API_KEY;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error || 'API request failed');
  }
  return data;
}

// Convenience wrappers
export const api = {
  servers: {
    list: () => botApi('/api/v1/servers'),
    get: (id: string) => botApi(`/api/v1/servers/${id}`),
    analysis: (id: string) => botApi(`/api/v1/servers/${id}/analysis`),
  },
  members: {
    list: (serverId: string, page = 1, pageSize = 50, search = '') =>
      botApi(`/api/v1/servers/${serverId}/members?page=${page}&pageSize=${pageSize}&search=${search}`),
    get: (serverId: string, memberId: string) =>
      botApi(`/api/v1/servers/${serverId}/members/${memberId}`),
  },
  roles: {
    list: (serverId: string) => botApi(`/api/v1/servers/${serverId}/roles`),
    create: (serverId: string, data: any) =>
      botApi(`/api/v1/servers/${serverId}/roles`, { method: 'POST', body: data }),
    delete: (serverId: string, roleId: string) =>
      botApi(`/api/v1/servers/${serverId}/roles/${roleId}`, { method: 'DELETE' }),
    bulkAssign: (serverId: string, data: any) =>
      botApi(`/api/v1/servers/${serverId}/members/bulk-role`, { method: 'POST', body: data }),
    setupTiers: (serverId: string) =>
      botApi(`/api/v1/servers/${serverId}/roles/setup-tiers`, { method: 'POST' }),
  },
  channels: {
    list: (serverId: string) => botApi(`/api/v1/servers/${serverId}/channels`),
    create: (serverId: string, data: any) =>
      botApi(`/api/v1/servers/${serverId}/channels`, { method: 'POST', body: data }),
    delete: (serverId: string, channelId: string) =>
      botApi(`/api/v1/servers/${serverId}/channels/${channelId}`, { method: 'DELETE' }),
  },
  schedules: {
    list: (serverId: string) => botApi(`/api/v1/servers/${serverId}/schedules`),
    create: (serverId: string, data: any) =>
      botApi(`/api/v1/servers/${serverId}/schedules`, { method: 'POST', body: data }),
    delete: (serverId: string, scheduleId: string) =>
      botApi(`/api/v1/servers/${serverId}/schedules/${scheduleId}`, { method: 'DELETE' }),
    upcoming: (serverId: string) => botApi(`/api/v1/servers/${serverId}/upcoming`),
  },
  messages: {
    send: (serverId: string, data: any) =>
      botApi(`/api/v1/servers/${serverId}/messages`, { method: 'POST', body: data }),
    announce: (serverId: string, data: any) =>
      botApi(`/api/v1/servers/${serverId}/announce`, { method: 'POST', body: data }),
  },
};
