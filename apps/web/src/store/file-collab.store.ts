'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Simplified File Collaboration Store
 *
 * With Yjs handling all real-time synchronization through y-monaco binding,
 * this store now only manages metadata and UI state for collaboration.
 * The actual document sync, cursor positions, and text changes are handled
 * by the WebsocketProvider and MonacoBinding in the CodeEditor component.
 */

export interface CollaboratorInfo {
  id: string;
  name: string;
  email?: string;
  color: string;
  colorLight: string;
}

interface FileCollabState {
  // Current file context
  currentFileId: string | null;
  currentProjectId: string | null;

  // Connection state (for UI display)
  isConnected: boolean;
  isSynced: boolean;

  // Last saved state
  lastSavedAt: Date | null;
  isDirty: boolean;

  // Actions
  setCurrentFile: (projectId: string, fileId: string) => void;
  clearCurrentFile: () => void;
  setConnectionStatus: (connected: boolean) => void;
  setSyncStatus: (synced: boolean) => void;
  markSaved: () => void;
  markDirty: () => void;
}

export const useFileCollabStore = create<FileCollabState>()(
  devtools(
    (set) => ({
      // Initial state
      currentFileId: null,
      currentProjectId: null,
      isConnected: false,
      isSynced: false,
      lastSavedAt: null,
      isDirty: false,

      // Set current file being edited
      setCurrentFile: (projectId: string, fileId: string) => {
        set({
          currentProjectId: projectId,
          currentFileId: fileId,
          isDirty: false,
        });
      },

      // Clear current file (when leaving editor)
      clearCurrentFile: () => {
        set({
          currentProjectId: null,
          currentFileId: null,
          isConnected: false,
          isSynced: false,
          isDirty: false,
        });
      },

      // Update connection status (called from CodeEditor)
      setConnectionStatus: (connected: boolean) => {
        set({ isConnected: connected });
      },

      // Update sync status (called from CodeEditor)
      setSyncStatus: (synced: boolean) => {
        set({ isSynced: synced });
      },

      // Mark file as saved
      markSaved: () => {
        set({
          lastSavedAt: new Date(),
          isDirty: false,
        });
      },

      // Mark file as having unsaved changes
      markDirty: () => {
        set({ isDirty: true });
      },
    }),
    { name: 'FileCollabStore' }
  )
);

// Generate a consistent color for a user based on their ID
export function getUserColor(userId: string): { color: string; colorLight: string } {
  const colors = [
    { color: '#ef4444', colorLight: '#ef444440' }, // red
    { color: '#f97316', colorLight: '#f9731640' }, // orange
    { color: '#eab308', colorLight: '#eab30840' }, // yellow
    { color: '#22c55e', colorLight: '#22c55e40' }, // green
    { color: '#14b8a6', colorLight: '#14b8a640' }, // teal
    { color: '#3b82f6', colorLight: '#3b82f640' }, // blue
    { color: '#8b5cf6', colorLight: '#8b5cf640' }, // violet
    { color: '#ec4899', colorLight: '#ec489940' }, // pink
    { color: '#06b6d4', colorLight: '#06b6d440' }, // cyan
    { color: '#84cc16', colorLight: '#84cc1640' }, // lime
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

// Legacy exports for backward compatibility (can be removed later)
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
