import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { apiClient, Page, PuckData } from '@/lib/api-client';
import {
  onPageCreated,
  onPageUpdated,
  onPageDeleted,
  onPagesReordered,
  onBuilderPresence,
  onBuilderCursor,
  joinBuilderPage,
  leaveBuilderPage,
  sendBuilderCursor,
  BuilderCollaborator,
  BuilderCursorEvent,
} from '@/lib/socket';

type BuilderState = {
  pages: Page[];
  currentPageId: string | null;
  currentPage: Page | null;
  isLoading: boolean;
  error: string | null;
  socketSubscribed: boolean;
  collaborators: BuilderCollaborator[];
  cursors: Record<string, BuilderCursorEvent>;

  // Actions
  fetchPages: (projectId: string) => Promise<void>;
  fetchPage: (projectId: string, pageId: string) => Promise<void>;
  createPage: (
    projectId: string,
    data: { name: string; slug: string; description?: string }
  ) => Promise<Page>;
  updatePage: (
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
  ) => Promise<Page>;
  deletePage: (projectId: string, pageId: string) => Promise<void>;
  duplicatePage: (projectId: string, pageId: string) => Promise<Page>;
  reorderPages: (projectId: string, pageIds: string[]) => Promise<void>;
  setCurrentPage: (pageId: string | null) => void;
  generateCode: (projectId: string, pageId: string) => Promise<{ code: string; filePath: string }>;

  // Real-time handlers
  handlePageCreated: (page: Page) => void;
  handlePageUpdated: (page: Page) => void;
  handlePageDeleted: (pageId: string) => void;
  handlePagesReordered: (pages: Page[]) => void;

  // Collaboration
  joinPage: (projectId: string, pageId: string) => void;
  leavePage: (projectId: string, pageId: string) => void;
  updateCursor: (projectId: string, pageId: string, cursor: { x: number; y: number }) => void;

  // Socket subscription
  subscribeToSocketEvents: (projectId: string) => () => void;

  // Reset
  reset: () => void;
};

export const useBuilderStore = create<BuilderState>()(
  devtools(
    (set, get) => ({
      pages: [],
      currentPageId: null,
      currentPage: null,
      isLoading: false,
      error: null,
      socketSubscribed: false,
      collaborators: [],
      cursors: {},

      fetchPages: async (projectId: string) => {
        set({ isLoading: true, error: null });
        try {
          const pages = await apiClient.builder.getPages(projectId);
          set({ pages, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to fetch pages',
            isLoading: false,
          });
        }
      },

      fetchPage: async (projectId: string, pageId: string) => {
        set({ isLoading: true, error: null });
        try {
          const page = await apiClient.builder.getPage(projectId, pageId);
          set({ currentPage: page, currentPageId: pageId, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to fetch page',
            isLoading: false,
          });
        }
      },

      createPage: async (projectId, data) => {
        const page = await apiClient.builder.createPage(projectId, data);
        // Let socket event handle the update to avoid duplicates
        return page;
      },

      updatePage: async (projectId, pageId, data) => {
        const page = await apiClient.builder.updatePage(projectId, pageId, data);
        get().handlePageUpdated(page);
        return page;
      },

      deletePage: async (projectId, pageId) => {
        const { pages, currentPageId } = get();

        // Optimistic update
        set({ pages: pages.filter((p) => p.id !== pageId) });

        // If the deleted page was the current page, clear it
        if (currentPageId === pageId) {
          set({ currentPageId: null, currentPage: null });
        }

        try {
          await apiClient.builder.deletePage(projectId, pageId);
        } catch (err) {
          // Revert on error
          get().fetchPages(projectId);
        }
      },

      duplicatePage: async (projectId, pageId) => {
        const page = await apiClient.builder.duplicatePage(projectId, pageId);
        // Let socket event handle the update
        return page;
      },

      reorderPages: async (projectId, pageIds) => {
        try {
          await apiClient.builder.reorderPages(projectId, pageIds);
        } catch (err) {
          // Revert on error
          get().fetchPages(projectId);
        }
      },

      setCurrentPage: (pageId: string | null) => {
        const { pages } = get();
        const page = pageId ? pages.find((p) => p.id === pageId) || null : null;
        set({ currentPageId: pageId, currentPage: page });
      },

      generateCode: async (projectId, pageId) => {
        return apiClient.builder.generateCode(projectId, pageId);
      },

      // Real-time handlers
      handlePageCreated: (page: Page) => {
        const { pages } = get();
        // Avoid duplicates
        if (pages.some((p) => p.id === page.id)) return;
        set({ pages: [...pages, page].sort((a, b) => a.position - b.position) });
      },

      handlePageUpdated: (page: Page) => {
        const { pages, currentPageId } = get();
        const updatedPages = pages.map((p) => (p.id === page.id ? page : p));
        set({ pages: updatedPages.sort((a, b) => a.position - b.position) });

        // Update current page if it's the one being updated
        if (currentPageId === page.id) {
          set({ currentPage: page });
        }
      },

      handlePageDeleted: (pageId: string) => {
        const { pages, currentPageId } = get();
        set({ pages: pages.filter((p) => p.id !== pageId) });

        // Clear current page if it was deleted
        if (currentPageId === pageId) {
          set({ currentPageId: null, currentPage: null });
        }
      },

      handlePagesReordered: (pages: Page[]) => {
        set({ pages: pages.sort((a, b) => a.position - b.position) });
      },

      // Collaboration
      joinPage: (projectId: string, pageId: string) => {
        joinBuilderPage(projectId, pageId);
      },

      leavePage: (projectId: string, pageId: string) => {
        leaveBuilderPage(projectId, pageId);
        set({ collaborators: [], cursors: {} });
      },

      updateCursor: (projectId: string, pageId: string, cursor: { x: number; y: number }) => {
        sendBuilderCursor(projectId, pageId, cursor);
      },

      subscribeToSocketEvents: (projectId: string) => {
        // Prevent duplicate subscriptions
        if (get().socketSubscribed) {
          return () => {};
        }

        set({ socketSubscribed: true });

        const {
          handlePageCreated,
          handlePageUpdated,
          handlePageDeleted,
          handlePagesReordered,
        } = get();

        const unsubPageCreated = onPageCreated((data) => {
          if (data.projectId === projectId) {
            handlePageCreated(data.page);
          }
        });

        const unsubPageUpdated = onPageUpdated((data) => {
          if (data.projectId === projectId) {
            handlePageUpdated(data.page);
          }
        });

        const unsubPageDeleted = onPageDeleted((data) => {
          if (data.projectId === projectId) {
            handlePageDeleted(data.pageId);
          }
        });

        const unsubPagesReordered = onPagesReordered((data) => {
          if (data.projectId === projectId) {
            handlePagesReordered(data.pages);
          }
        });

        const unsubPresence = onBuilderPresence((data) => {
          if (data.projectId === projectId) {
            set({ collaborators: data.users });
          }
        });

        const unsubCursor = onBuilderCursor((data) => {
          if (data.projectId === projectId) {
            set((state) => ({
              cursors: {
                ...state.cursors,
                [data.userId]: data,
              },
            }));
          }
        });

        return () => {
          unsubPageCreated();
          unsubPageUpdated();
          unsubPageDeleted();
          unsubPagesReordered();
          unsubPresence();
          unsubCursor();
          set({ socketSubscribed: false });
        };
      },

      reset: () => {
        set({
          pages: [],
          currentPageId: null,
          currentPage: null,
          isLoading: false,
          error: null,
          socketSubscribed: false,
          collaborators: [],
          cursors: {},
        });
      },
    }),
    { name: 'BuilderStore' }
  )
);
