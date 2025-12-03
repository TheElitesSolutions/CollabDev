'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  joinFile,
  leaveFile,
  sendFileEdit,
  sendFileCursor,
  onFilePresence,
  onFileEdit,
  onFileCursor,
  onFileSaved,
  type FileCollaborator,
  type FileEditChange,
  type FileEditEvent,
  type FileCursorEvent,
} from '@/lib/socket';

// Generate a consistent color for a user based on their ID
function getUserColor(userId: string): string {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

export type RemoteCursor = {
  userId: string;
  userName: string;
  userColor: string;
  cursor: {
    lineNumber: number;
    column: number;
  };
  selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  lastUpdated: number;
};

type FileCollabState = {
  currentFileId: string | null;
  currentProjectId: string | null;
  collaborators: FileCollaborator[];
  remoteCursors: Map<string, RemoteCursor>;
  pendingEdits: FileEditEvent[];
  isListening: boolean;
  version: number;

  // Actions
  joinFileRoom: (projectId: string, fileId: string) => void;
  leaveFileRoom: () => void;
  broadcastEdit: (changes: FileEditChange[], version: number) => void;
  broadcastCursor: (
    cursor: { lineNumber: number; column: number },
    selection?: {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    }
  ) => void;
  applyRemoteEdit: (edit: FileEditEvent) => void;
  clearPendingEdits: () => void;
  incrementVersion: () => void;
};

export const useFileCollabStore = create<FileCollabState>()(
  devtools(
    (set, get) => ({
      currentFileId: null,
      currentProjectId: null,
      collaborators: [],
      remoteCursors: new Map(),
      pendingEdits: [],
      isListening: false,
      version: 0,

      joinFileRoom: (projectId: string, fileId: string) => {
        const { currentFileId, currentProjectId, isListening } = get();

        // Leave current file if different
        if (currentFileId && currentFileId !== fileId) {
          leaveFile(currentProjectId!, currentFileId);
        }

        // Join new file room
        joinFile(projectId, fileId);

        // Set up listeners if not already listening
        if (!isListening) {
          // Listen for file presence updates
          onFilePresence((data) => {
            if (data.fileId === get().currentFileId) {
              set({ collaborators: data.users });
            }
          });

          // Listen for remote edits
          onFileEdit((data) => {
            if (data.fileId === get().currentFileId) {
              get().applyRemoteEdit(data);
            }
          });

          // Listen for remote cursor updates
          onFileCursor((data) => {
            if (data.fileId === get().currentFileId) {
              const cursors = new Map(get().remoteCursors);
              cursors.set(data.userId, {
                userId: data.userId,
                userName: data.userName,
                userColor: getUserColor(data.userId),
                cursor: data.cursor,
                selection: data.selection,
                lastUpdated: Date.now(),
              });
              set({ remoteCursors: cursors });
            }
          });

          // Listen for file save events
          onFileSaved((data) => {
            if (data.fileId === get().currentFileId) {
              console.log(`File saved by ${data.savedBy.email || data.savedBy.id}`);
            }
          });

          set({ isListening: true });
        }

        set({
          currentFileId: fileId,
          currentProjectId: projectId,
          remoteCursors: new Map(),
          pendingEdits: [],
          version: 0,
        });
      },

      leaveFileRoom: () => {
        const { currentFileId, currentProjectId } = get();
        if (currentFileId && currentProjectId) {
          leaveFile(currentProjectId, currentFileId);
        }

        set({
          currentFileId: null,
          currentProjectId: null,
          collaborators: [],
          remoteCursors: new Map(),
          pendingEdits: [],
        });
      },

      broadcastEdit: (changes: FileEditChange[], version: number) => {
        const { currentProjectId, currentFileId } = get();
        if (currentProjectId && currentFileId) {
          sendFileEdit(currentProjectId, currentFileId, changes, version);
        }
      },

      broadcastCursor: (cursor, selection) => {
        const { currentProjectId, currentFileId } = get();
        if (currentProjectId && currentFileId) {
          sendFileCursor(currentProjectId, currentFileId, cursor, selection);
        }
      },

      applyRemoteEdit: (edit: FileEditEvent) => {
        set((state) => ({
          pendingEdits: [...state.pendingEdits, edit],
        }));
      },

      clearPendingEdits: () => {
        set({ pendingEdits: [] });
      },

      incrementVersion: () => {
        set((state) => ({ version: state.version + 1 }));
      },
    }),
    { name: 'FileCollabStore' }
  )
);
