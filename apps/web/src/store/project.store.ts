import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type ProjectMember = {
  id: string;
  role: 'OWNER' | 'MAINTAINER' | 'MEMBER';
  userId: string;
  user: {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    image?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  createdByUserId: string;
  createdBy: {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    image?: string;
  };
  members: ProjectMember[];
  createdAt: string;
  updatedAt: string;
};

type ProjectState = {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  removeProject: (id: string) => void;
  setCurrentProject: (project: Project | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
};

const initialState = {
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
};

export const useProjectStore = create<ProjectState>()(
  devtools(
    (set) => ({
      ...initialState,

      setProjects: (projects) =>
        set({ projects, error: null }),

      addProject: (project) =>
        set((state) => ({
          projects: [project, ...state.projects],
          error: null,
        })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
          currentProject:
            state.currentProject?.id === id
              ? { ...state.currentProject, ...updates }
              : state.currentProject,
          error: null,
        })),

      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject:
            state.currentProject?.id === id ? null : state.currentProject,
          error: null,
        })),

      setCurrentProject: (project) =>
        set({ currentProject: project }),

      setLoading: (isLoading) =>
        set({ isLoading }),

      setError: (error) =>
        set({ error }),

      reset: () => set(initialState),
    }),
    { name: 'ProjectStore' },
  ),
);
