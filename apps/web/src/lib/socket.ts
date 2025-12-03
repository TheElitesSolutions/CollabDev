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

// Board event types
export type BoardTaskEvent = {
  projectId: string;
  task: any;
};

export type BoardTaskDeletedEvent = {
  projectId: string;
  taskId: string;
};

export type BoardColumnEvent = {
  projectId: string;
  column: any;
};

export type BoardColumnDeletedEvent = {
  projectId: string;
  columnId: string;
};

// File collaboration types
export type FileCollaborator = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  image?: string | null;
};

export type FilePresenceUpdate = {
  fileId: string;
  projectId: string;
  users: FileCollaborator[];
  action: 'join' | 'leave';
  user: {
    id: string;
    email: string;
    name?: string;
  };
};

export type FileEditChange = {
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
  text: string;
};

export type FileEditEvent = {
  fileId: string;
  projectId: string;
  userId: string;
  userName: string;
  changes: FileEditChange[];
  version: number;
  timestamp: Date;
};

export type FileCursorEvent = {
  fileId: string;
  projectId: string;
  userId: string;
  userName: string;
  userColor?: string;
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
};

export type FileSavedEvent = {
  fileId: string;
  projectId: string;
  savedBy: {
    id: string;
    email?: string;
  };
  timestamp: Date;
};

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket {
  // Return existing socket if it exists (even if not connected yet)
  // to avoid creating multiple sockets during async connection
  if (socket) {
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

// Board event listeners
export function onTaskCreated(callback: (data: BoardTaskEvent) => void): () => void {
  socket?.on('task:created', callback);
  return () => {
    socket?.off('task:created', callback);
  };
}

export function onTaskUpdated(callback: (data: BoardTaskEvent) => void): () => void {
  socket?.on('task:updated', callback);
  return () => {
    socket?.off('task:updated', callback);
  };
}

export function onTaskDeleted(callback: (data: BoardTaskDeletedEvent) => void): () => void {
  socket?.on('task:deleted', callback);
  return () => {
    socket?.off('task:deleted', callback);
  };
}

export function onColumnCreated(callback: (data: BoardColumnEvent) => void): () => void {
  socket?.on('column:created', callback);
  return () => {
    socket?.off('column:created', callback);
  };
}

export function onColumnUpdated(callback: (data: BoardColumnEvent) => void): () => void {
  socket?.on('column:updated', callback);
  return () => {
    socket?.off('column:updated', callback);
  };
}

export function onColumnDeleted(callback: (data: BoardColumnDeletedEvent) => void): () => void {
  socket?.on('column:deleted', callback);
  return () => {
    socket?.off('column:deleted', callback);
  };
}

// File collaboration functions
export function joinFile(projectId: string, fileId: string): void {
  if (socket?.connected) {
    socket.emit('join_file', { projectId, fileId });
  }
}

export function leaveFile(projectId: string, fileId: string): void {
  if (socket?.connected) {
    socket.emit('leave_file', { projectId, fileId });
  }
}

export function sendFileEdit(
  projectId: string,
  fileId: string,
  changes: FileEditChange[],
  version: number
): void {
  if (socket?.connected) {
    socket.emit('file:edit', { projectId, fileId, changes, version });
  }
}

export function sendFileCursor(
  projectId: string,
  fileId: string,
  cursor: { lineNumber: number; column: number },
  selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  }
): void {
  if (socket?.connected) {
    socket.emit('file:cursor', { projectId, fileId, cursor, selection });
  }
}

export function onFilePresence(callback: (data: FilePresenceUpdate) => void): () => void {
  socket?.on('file:presence', callback);
  return () => {
    socket?.off('file:presence', callback);
  };
}

export function onFileEdit(callback: (data: FileEditEvent) => void): () => void {
  socket?.on('file:edit', callback);
  return () => {
    socket?.off('file:edit', callback);
  };
}

export function onFileCursor(callback: (data: FileCursorEvent) => void): () => void {
  socket?.on('file:cursor', callback);
  return () => {
    socket?.off('file:cursor', callback);
  };
}

export function onFileSaved(callback: (data: FileSavedEvent) => void): () => void {
  socket?.on('file:saved', callback);
  return () => {
    socket?.off('file:saved', callback);
  };
}
