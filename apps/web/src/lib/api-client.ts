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

    async signup(email: string, password: string, name: string): Promise<{ user: User }> {
      return request('/api/auth/sign-up/email', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
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
};
