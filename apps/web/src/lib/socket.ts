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
  username: string;
  userImage?: string | null;
  content: string;
  timestamp: string;
  projectId: string;
  replyToId?: string | null;
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

export function sendChatMessage(projectId: string, content: string, replyToId?: string): void {
  if (socket?.connected) {
    socket.emit('chat:message', { projectId, content, replyToId });
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

// Conversation events
export function joinConversation(conversationId: string): void {
  if (socket?.connected) {
    socket.emit('conversation:join', { conversationId });
  }
}

export function leaveConversation(conversationId: string): void {
  if (socket?.connected) {
    socket.emit('conversation:leave', { conversationId });
  }
}

export function sendConversationMessage(conversationId: string, content: string, replyToId?: string): void {
  if (socket?.connected) {
    socket.emit('conversation:message', { conversationId, content, replyToId });
  }
}

export function markConversationRead(conversationId: string): void {
  if (socket?.connected) {
    socket.emit('conversation:read', { conversationId });
  }
}

export function setConversationTyping(conversationId: string, isTyping: boolean): void {
  if (socket?.connected) {
    socket.emit('conversation:typing', { conversationId, isTyping });
  }
}

export function onConversationMessage(callback: (data: ChatMessage & { conversationId: string }) => void): () => void {
  socket?.on('conversation:message', callback);
  return () => {
    socket?.off('conversation:message', callback);
  };
}

export function onConversationNotification(callback: (data: { conversationId: string; message: ChatMessage }) => void): () => void {
  socket?.on('conversation:notification', callback);
  return () => {
    socket?.off('conversation:notification', callback);
  };
}

export function onConversationTyping(callback: (data: { conversationId: string; userId: string; userName: string; isTyping: boolean }) => void): () => void {
  socket?.on('conversation:typing', callback);
  return () => {
    socket?.off('conversation:typing', callback);
  };
}

export function onConversationRead(callback: (data: { conversationId: string; userId: string; readAt: string }) => void): () => void {
  socket?.on('conversation:read', callback);
  return () => {
    socket?.off('conversation:read', callback);
  };
}

// Call events
export function initiateCall(data: { conversationId?: string; projectId?: string; targetUserIds?: string[]; type: 'VOICE' | 'VIDEO' }): void {
  if (socket?.connected) {
    socket.emit('call:initiate', data);
  }
}

export function joinCall(callId: string): void {
  if (socket?.connected) {
    socket.emit('call:join', { callId });
  }
}

export function leaveCall(callId: string): void {
  if (socket?.connected) {
    socket.emit('call:leave', { callId });
  }
}

export function declineCall(callId: string): void {
  if (socket?.connected) {
    socket.emit('call:decline', { callId });
  }
}

export function endCall(callId: string): void {
  if (socket?.connected) {
    socket.emit('call:end', { callId });
  }
}

export function toggleCallMedia(callId: string, data: { isMuted?: boolean; isVideoOff?: boolean; isScreenSharing?: boolean }): void {
  if (socket?.connected) {
    socket.emit('call:toggle-media', { callId, ...data });
  }
}

export function sendCallSignal(type: 'offer' | 'answer' | 'ice-candidate', data: any): void {
  if (socket?.connected) {
    socket.emit(`call:${type}`, data);
  }
}

export function onCallIncoming(callback: (data: any) => void): () => void {
  socket?.on('call:incoming', callback);
  return () => {
    socket?.off('call:incoming', callback);
  };
}

export function onCallCreated(callback: (data: any) => void): () => void {
  socket?.on('call:created', callback);
  return () => {
    socket?.off('call:created', callback);
  };
}

export function onCallJoined(callback: (data: any) => void): () => void {
  socket?.on('call:joined', callback);
  return () => {
    socket?.off('call:joined', callback);
  };
}

export function onCallParticipantJoined(callback: (data: any) => void): () => void {
  socket?.on('call:participant-joined', callback);
  return () => {
    socket?.off('call:participant-joined', callback);
  };
}

export function onCallParticipantLeft(callback: (data: any) => void): () => void {
  socket?.on('call:participant-left', callback);
  return () => {
    socket?.off('call:participant-left', callback);
  };
}

export function onCallEnded(callback: (data: any) => void): () => void {
  socket?.on('call:ended', callback);
  return () => {
    socket?.off('call:ended', callback);
  };
}

export function onCallDeclined(callback: (data: any) => void): () => void {
  socket?.on('call:declined', callback);
  return () => {
    socket?.off('call:declined', callback);
  };
}

export function onCallMediaToggled(callback: (data: any) => void): () => void {
  socket?.on('call:media-toggled', callback);
  return () => {
    socket?.off('call:media-toggled', callback);
  };
}

export function onCallSignal(type: 'offer' | 'answer' | 'ice-candidate', callback: (data: any) => void): () => void {
  socket?.on(`call:${type}`, callback);
  return () => {
    socket?.off(`call:${type}`, callback);
  };
}

// Website Builder types
export type BuilderCollaborator = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  image?: string | null;
  cursor?: { x: number; y: number };
};

export type BuilderPresenceUpdate = {
  pageId: string;
  projectId: string;
  users: BuilderCollaborator[];
  action: 'join' | 'leave';
  user: {
    id: string;
    email: string;
    name?: string;
  };
};

export type BuilderCursorEvent = {
  pageId: string;
  projectId: string;
  userId: string;
  userName: string;
  userColor?: string;
  cursor: { x: number; y: number };
};

export type BuilderPageEvent = {
  projectId: string;
  page: any;
};

export type BuilderPageDeletedEvent = {
  projectId: string;
  pageId: string;
};

export type BuilderPagesReorderedEvent = {
  projectId: string;
  pages: any[];
};

// Website Builder functions
export function joinBuilderPage(projectId: string, pageId: string): void {
  if (socket?.connected) {
    socket.emit('builder:join', { projectId, pageId });
  }
}

export function leaveBuilderPage(projectId: string, pageId: string): void {
  if (socket?.connected) {
    socket.emit('builder:leave', { projectId, pageId });
  }
}

export function sendBuilderCursor(
  projectId: string,
  pageId: string,
  cursor: { x: number; y: number }
): void {
  if (socket?.connected) {
    socket.emit('builder:cursor', { projectId, pageId, cursor });
  }
}

export function onBuilderPresence(callback: (data: BuilderPresenceUpdate) => void): () => void {
  socket?.on('builder:presence', callback);
  return () => {
    socket?.off('builder:presence', callback);
  };
}

export function onBuilderCursor(callback: (data: BuilderCursorEvent) => void): () => void {
  socket?.on('builder:cursor', callback);
  return () => {
    socket?.off('builder:cursor', callback);
  };
}

export function onPageCreated(callback: (data: BuilderPageEvent) => void): () => void {
  socket?.on('page:created', callback);
  return () => {
    socket?.off('page:created', callback);
  };
}

export function onPageUpdated(callback: (data: BuilderPageEvent) => void): () => void {
  socket?.on('page:updated', callback);
  return () => {
    socket?.off('page:updated', callback);
  };
}

export function onPageDeleted(callback: (data: BuilderPageDeletedEvent) => void): () => void {
  socket?.on('page:deleted', callback);
  return () => {
    socket?.off('page:deleted', callback);
  };
}

export function onPagesReordered(callback: (data: BuilderPagesReorderedEvent) => void): () => void {
  socket?.on('pages:reordered', callback);
  return () => {
    socket?.off('pages:reordered', callback);
  };
}
