import { appConfig } from '@/config/app';
import { User } from '@/store/auth.store';
import { Project, ProjectMember } from '@/store/project.store';

export interface ProjectFile {
  id: string;
  createdAt: string;
  updatedAt: string;
  path: string;
  name: string;
  isFolder: boolean;
  content: string | null;
  mimeType: string | null;
  parentId: string | null;
  projectId: string;
  lastEditedByUserId: string | null;
  children?: ProjectFile[];
}

// Kanban Board Types
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskUser {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
}

export interface Task {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  dueDate: string | null;
  columnId: string;
  projectId: string;
  assigneeId: string | null;
  assignee: TaskUser | null;
  createdById: string;
  createdBy: TaskUser;
}

export interface Column {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  position: number;
  boardId: string;
  tasks: Task[];
}

export interface Board {
  id: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  columns: Column[];
}

// Chat Types
export type ConversationType = 'DIRECT' | 'PROJECT' | 'GROUP';

export interface ChatUser {
  id: string;
  email: string;
  username: string | null;
  displayUsername: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
}

export interface ConversationParticipant {
  id: string;
  userId: string;
  lastReadAt: string | null;
  user: ChatUser;
}

export interface Message {
  id: string;
  createdAt: string;
  updatedAt: string;
  content: string;
  attachments: string | null;
  isEdited: boolean;
  editedAt: string | null;
  conversationId: string;
  senderId: string;
  sender: ChatUser;
  replyToId: string | null;
  replyTo?: Message | null;
}

export interface Conversation {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string | null;
  type: ConversationType;
  projectId: string | null;
  participants: ConversationParticipant[];
  lastMessage?: Message | null;
  project?: { id: string; name: string } | null;
}

export interface UnreadCount {
  total: number;
  byConversation: Record<string, number>;
}

// Website Builder Types
export interface Page {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  slug: string;
  description: string | null;
  content: PuckData;
  position: number;
  isPublished: boolean;
  projectId: string;
  generatedFileId: string | null;
}

export interface PuckData {
  content: PuckComponent[];
  root: Record<string, unknown>;
}

export interface PuckComponent {
  type: string;
  props: Record<string, unknown>;
}

export interface BuilderCollaborator {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  image?: string | null;
  cursor?: { x: number; y: number };
}

// Call Types
export type CallType = 'VOICE' | 'VIDEO';
export type CallStatus = 'RINGING' | 'ONGOING' | 'ENDED' | 'MISSED' | 'DECLINED';

export interface CallParticipant {
  id: string;
  joinedAt: string | null;
  leftAt: string | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  user: ChatUser;
}

export interface Call {
  id: string;
  createdAt: string;
  type: CallType;
  status: CallStatus;
  startedAt: string | null;
  endedAt: string | null;
  conversationId: string | null;
  projectId: string | null;
  initiator: ChatUser;
  participants: CallParticipant[];
}

const API_URL = appConfig.apiUrl;

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.message || data || 'An error occurred',
      data
    );
  }

  return data;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
  });

  return handleResponse<T>(response);
}

// Authentication APIs
export const apiClient = {
  auth: {
    async login(email: string, password: string): Promise<{ user: User; session: any }> {
      return request('/api/auth/sign-in/email', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },

    async signup(email: string, password: string, name: string, username: string): Promise<{ user: User }> {
      return request('/api/auth/sign-up/email', {
        method: 'POST',
        body: JSON.stringify({ email, password, name, username }),
      });
    },

    async logout(): Promise<void> {
      return request('/api/auth/sign-out', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },

    async getCurrentUser(): Promise<User> {
      return request('/api/v1/user/whoami', {
        method: 'GET',
      });
    },

    async verifyEmail(token: string): Promise<void> {
      return request('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
    },

    async resetPassword(email: string): Promise<void> {
      return request('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    },
  },

  // Project APIs
  projects: {
    async getAll(): Promise<Project[]> {
      return request('/api/project', {
        method: 'GET',
      });
    },

    async getById(id: string): Promise<Project> {
      return request(`/api/project/${id}`, {
        method: 'GET',
      });
    },

    async create(data: {
      name: string;
      description?: string;
    }): Promise<Project> {
      return request('/api/project', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(
      id: string,
      data: {
        name?: string;
        description?: string;
      }
    ): Promise<Project> {
      return request(`/api/project/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    async delete(id: string): Promise<void> {
      return request(`/api/project/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({}),
      });
    },

    async getMembers(projectId: string): Promise<ProjectMember[]> {
      return request(`/api/project/${projectId}/members`, {
        method: 'GET',
      });
    },

    async addMember(
      projectId: string,
      data: {
        userId: string;
        role: 'OWNER' | 'MAINTAINER' | 'MEMBER';
      }
    ): Promise<ProjectMember> {
      return request(`/api/project/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async inviteMember(
      projectId: string,
      data: {
        email: string;
        role: 'OWNER' | 'MAINTAINER' | 'MEMBER';
      }
    ): Promise<ProjectMember> {
      return request(`/api/project/${projectId}/invite`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async removeMember(projectId: string, userId: string): Promise<void> {
      return request(`/api/project/${projectId}/members/${userId}`, {
        method: 'DELETE',
        body: JSON.stringify({}),
      });
    },
  },

  // Project Files APIs
  files: {
    async getAll(projectId: string): Promise<ProjectFile[]> {
      return request(`/api/project/${projectId}/files`, {
        method: 'GET',
      });
    },

    async getById(projectId: string, fileId: string): Promise<ProjectFile> {
      return request(`/api/project/${projectId}/files/${fileId}`, {
        method: 'GET',
      });
    },

    async create(
      projectId: string,
      data: {
        path: string;
        name: string;
        isFolder?: boolean;
        content?: string;
        mimeType?: string;
        parentId?: string;
      }
    ): Promise<ProjectFile> {
      return request(`/api/project/${projectId}/files`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async update(
      projectId: string,
      fileId: string,
      data: {
        name?: string;
        content?: string;
        path?: string;
        parentId?: string | null;
      }
    ): Promise<ProjectFile> {
      return request(`/api/project/${projectId}/files/${fileId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    async delete(projectId: string, fileId: string): Promise<void> {
      return request(`/api/project/${projectId}/files/${fileId}`, {
        method: 'DELETE',
        body: JSON.stringify({}),
      });
    },

    async initialize(projectId: string): Promise<ProjectFile[]> {
      return request(`/api/project/${projectId}/files/initialize`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },

    async saveYjs(
      projectId: string,
      fileId: string
    ): Promise<{ success: boolean; message: string }> {
      return request(`/api/project/${projectId}/files/${fileId}/save-yjs`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
  },

  // User APIs
  user: {
    async getProfile(): Promise<User> {
      return request('/api/v1/user/profile', {
        method: 'GET',
      });
    },

    async updateProfile(data: {
      name?: string;
      email?: string;
    }): Promise<User> {
      return request('/api/v1/user/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
  },

  // Board/Kanban APIs
  board: {
    async getBoard(projectId: string): Promise<Board> {
      return request(`/api/project/${projectId}/board`, {
        method: 'GET',
      });
    },

    async createColumn(
      projectId: string,
      data: { name: string; position?: number }
    ): Promise<Column> {
      return request(`/api/project/${projectId}/columns`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async updateColumn(columnId: string, name: string): Promise<Column> {
      return request(`/api/columns/${columnId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
    },

    async deleteColumn(columnId: string): Promise<void> {
      return request(`/api/columns/${columnId}`, {
        method: 'DELETE',
        body: JSON.stringify({}),
      });
    },

    async createTask(
      projectId: string,
      data: {
        columnId: string;
        title: string;
        description?: string;
        assigneeId?: string;
        dueDate?: string;
        priority?: TaskPriority;
        position?: number;
      }
    ): Promise<Task> {
      return request(`/api/project/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async getTask(taskId: string): Promise<Task> {
      return request(`/api/tasks/${taskId}`, {
        method: 'GET',
      });
    },

    async updateTask(
      taskId: string,
      data: {
        columnId?: string;
        title?: string;
        description?: string;
        status?: TaskStatus;
        priority?: TaskPriority;
        assigneeId?: string | null;
        dueDate?: string | null;
        position?: number;
      }
    ): Promise<Task> {
      return request(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    async moveTask(
      taskId: string,
      data: { columnId: string; position: number }
    ): Promise<Task> {
      return request(`/api/tasks/${taskId}/move`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    async deleteTask(taskId: string): Promise<void> {
      return request(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        body: JSON.stringify({}),
      });
    },
  },

  // Chat APIs
  chat: {
    async getConversations(): Promise<Conversation[]> {
      return request('/api/chat/conversations', {
        method: 'GET',
      });
    },

    async getConversation(conversationId: string): Promise<Conversation> {
      return request(`/api/chat/conversations/${conversationId}`, {
        method: 'GET',
      });
    },

    async getOrCreateDirectConversation(targetUserId: string): Promise<Conversation> {
      return request('/api/chat/conversations/direct', {
        method: 'POST',
        body: JSON.stringify({ targetUserId }),
      });
    },

    async createGroupConversation(data: {
      name: string;
      participantIds: string[];
    }): Promise<Conversation> {
      return request('/api/chat/conversations', {
        method: 'POST',
        body: JSON.stringify({ ...data, type: 'GROUP' }),
      });
    },

    async getProjectConversation(projectId: string): Promise<Conversation> {
      return request(`/api/chat/project/${projectId}`, {
        method: 'GET',
      });
    },

    async getMessages(
      conversationId: string,
      options?: { limit?: number; before?: string }
    ): Promise<Message[]> {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.before) params.append('before', options.before);
      const queryString = params.toString();
      return request(
        `/api/chat/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`,
        { method: 'GET' }
      );
    },

    async sendMessage(
      conversationId: string,
      data: { content: string; replyToId?: string }
    ): Promise<Message> {
      return request(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async updateMessage(
      messageId: string,
      data: { content: string }
    ): Promise<Message> {
      return request(`/api/chat/messages/${messageId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    async deleteMessage(messageId: string): Promise<void> {
      return request(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
      });
    },

    async markAsRead(conversationId: string): Promise<void> {
      return request(`/api/chat/conversations/${conversationId}/read`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },

    async getUnreadCount(): Promise<UnreadCount> {
      return request('/api/chat/unread', {
        method: 'GET',
      });
    },
  },

  // Website Builder APIs
  builder: {
    async getPages(projectId: string): Promise<Page[]> {
      return request(`/api/projects/${projectId}/pages`, {
        method: 'GET',
      });
    },

    async getPage(projectId: string, pageId: string): Promise<Page> {
      return request(`/api/projects/${projectId}/pages/${pageId}`, {
        method: 'GET',
      });
    },

    async createPage(
      projectId: string,
      data: { name: string; slug: string; description?: string; isPublished?: boolean }
    ): Promise<Page> {
      return request(`/api/projects/${projectId}/pages`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async updatePage(
      projectId: string,
      pageId: string,
      data: {
        name?: string;
        slug?: string;
        description?: string;
        content?: PuckData;
        position?: number;
        isPublished?: boolean;
      }
    ): Promise<Page> {
      return request(`/api/projects/${projectId}/pages/${pageId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    async deletePage(projectId: string, pageId: string): Promise<void> {
      return request(`/api/projects/${projectId}/pages/${pageId}`, {
        method: 'DELETE',
        body: JSON.stringify({}),
      });
    },

    async reorderPages(
      projectId: string,
      pageIds: string[]
    ): Promise<Page[]> {
      return request(`/api/projects/${projectId}/pages/reorder`, {
        method: 'POST',
        body: JSON.stringify({ pageIds }),
      });
    },

    async duplicatePage(projectId: string, pageId: string): Promise<Page> {
      return request(`/api/projects/${projectId}/pages/${pageId}/duplicate`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },

    async generateCode(projectId: string, pageId: string): Promise<{ code: string; filePath: string }> {
      return request(`/api/projects/${projectId}/pages/${pageId}/generate`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
    },
  },
};
