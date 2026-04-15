export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AiChatRequest {
  message: string;
  conversationId?: string;
}

export interface AiChatResponse {
  response: string;
  actions: AiAction[];
  conversationId: string;
}

export interface AiAction {
  type: string;
  description: string;
  target?: string;
  result: 'success' | 'error';
  details?: string;
}

export interface BulkRoleRequest {
  memberIds: string[];
  roleId: string;
  action: 'add' | 'remove';
}

export interface ServerAnalysis {
  server: {
    id: string;
    name: string;
    memberCount: number;
    onlineCount: number;
    createdAt: string;
    ownerId: string;
  };
  roles: {
    id: string;
    name: string;
    color: string;
    memberCount: number;
    position: number;
    isManaged: boolean;
  }[];
  channels: {
    categories: {
      id: string | null;
      name: string;
      channels: {
        id: string;
        name: string;
        type: string;
        topic: string | null;
      }[];
    }[];
    totalCount: number;
  };
  members: {
    total: number;
    online: number;
    bots: number;
    humans: number;
  };
}
