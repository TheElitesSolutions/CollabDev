import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  connectSocket,
  disconnectSocket,
  joinProject,
  leaveProject,
  onPresenceUpdate,
  onCursorMove,
  onChatMessage,
  sendChatMessage,
  type PresenceUser,
  type CursorPosition,
  type ChatMessage,
} from '@/lib/socket';

type SocketState = {
  isConnected: boolean;
  currentProjectId: string | null;
  presentUsers: PresenceUser[];
  cursors: Map<string, CursorPosition>;
  messages: ChatMessage[];

  // Actions
  connect: () => void;
  disconnect: () => void;
  joinWorkspace: (projectId: string) => void;
  leaveWorkspace: () => void;
  sendMessage: (content: string) => void;
  clearMessages: () => void;
};

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
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

export const useSocketStore = create<SocketState>()(
  devtools(
    (set, get) => ({
      isConnected: false,
      currentProjectId: null,
      presentUsers: [],
      cursors: new Map(),
      messages: [],

      connect: () => {
        const socket = connectSocket();

        socket.on('connect', () => {
          set({ isConnected: true });
        });

        socket.on('disconnect', () => {
          set({ isConnected: false });
        });

        // Set up presence listener
        onPresenceUpdate((data) => {
          set({ presentUsers: data.users });
        });

        // Set up cursor listener
        onCursorMove((data) => {
          const cursors = new Map(get().cursors);
          cursors.set(data.userId, {
            ...data,
            userColor: getUserColor(data.userId),
          });
          set({ cursors });
        });

        // Set up chat listener
        onChatMessage((data) => {
          set({ messages: [...get().messages, data] });
        });
      },

      disconnect: () => {
        const { currentProjectId } = get();
        if (currentProjectId) {
          leaveProject(currentProjectId);
        }
        disconnectSocket();
        set({
          isConnected: false,
          currentProjectId: null,
          presentUsers: [],
          cursors: new Map(),
        });
      },

      joinWorkspace: (projectId: string) => {
        const { currentProjectId, isConnected } = get();

        // Leave current project if different
        if (currentProjectId && currentProjectId !== projectId) {
          leaveProject(currentProjectId);
        }

        // Connect if not connected
        if (!isConnected) {
          get().connect();
        }

        // Join the new project
        joinProject(projectId);
        set({ currentProjectId: projectId, messages: [] });
      },

      leaveWorkspace: () => {
        const { currentProjectId } = get();
        if (currentProjectId) {
          leaveProject(currentProjectId);
        }
        set({
          currentProjectId: null,
          presentUsers: [],
          cursors: new Map(),
          messages: [],
        });
      },

      sendMessage: (content: string) => {
        const { currentProjectId } = get();
        if (currentProjectId && content.trim()) {
          sendChatMessage(currentProjectId, content);
        }
      },

      clearMessages: () => {
        set({ messages: [] });
      },
    }),
    { name: 'SocketStore' }
  )
);
