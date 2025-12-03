import { io, Socket } from 'socket.io-client';
import { appConfig } from '@/config/app';

let socket: Socket | null = null;

export type PresenceUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  image?: string | null;
};

export type PresenceUpdate = {
  projectId: string;
  users: PresenceUser[];
  action: 'join' | 'leave';
  user: {
    id: string;
    email: string;
  };
};

export type CursorPosition = {
  userId: string;
  userName: string;
  userColor: string;
  file: string;
  line: number;
  column: number;
};

export type ChatMessage = {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  projectId: string;
};

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(appConfig.apiUrl, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinProject(projectId: string): void {
  if (socket?.connected) {
    socket.emit('join_project', { projectId });
  }
}

export function leaveProject(projectId: string): void {
  if (socket?.connected) {
    socket.emit('leave_project', { projectId });
  }
}

export function sendCursorPosition(data: Omit<CursorPosition, 'userId' | 'userName' | 'userColor'>): void {
  if (socket?.connected) {
    socket.emit('cursor:move', data);
  }
}

export function sendChatMessage(projectId: string, content: string): void {
  if (socket?.connected) {
    socket.emit('chat:message', { projectId, content });
  }
}

export function onPresenceUpdate(callback: (data: PresenceUpdate) => void): () => void {
  socket?.on('presence:update', callback);
  return () => {
    socket?.off('presence:update', callback);
  };
}

export function onCursorMove(callback: (data: CursorPosition) => void): () => void {
  socket?.on('cursor:move', callback);
  return () => {
    socket?.off('cursor:move', callback);
  };
}

export function onChatMessage(callback: (data: ChatMessage) => void): () => void {
  socket?.on('chat:message', callback);
  return () => {
    socket?.off('chat:message', callback);
  };
}
