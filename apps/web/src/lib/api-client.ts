import { appConfig } from '@/config/app';
import { User } from '@/store/auth.store';
import { Project, ProjectMember } from '@/store/project.store';

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

    async removeMember(projectId: string, userId: string): Promise<void> {
      return request(`/api/project/${projectId}/members/${userId}`, {
        method: 'DELETE',
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
};
