'use client';

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Awareness } from 'y-protocols/awareness';
import { appConfig } from '@/config/app';

// Types for Puck data structure
export interface PuckComponent {
  type: string;
  props: Record<string, unknown>;
}

export interface PuckData {
  content: PuckComponent[];
  root: Record<string, unknown>;
}

export interface BuilderCollabUser {
  id: string;
  name: string;
  color: string;
  colorLight: string;
  cursor?: {
    componentId?: string;
    section?: 'canvas' | 'sidebar' | 'properties';
  };
}

export interface BuilderCollabOptions {
  projectId: string;
  pageId: string;
  user: {
    id: string;
    name: string;
    email?: string;
  };
  onSync?: (isSynced: boolean) => void;
  onConnectionChange?: (status: 'connecting' | 'connected' | 'disconnected') => void;
  onContentChange?: (data: PuckData) => void;
  onUsersChange?: (users: BuilderCollabUser[]) => void;
}

// Generate consistent color for user
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

export class BuilderCollab {
  private ydoc: Y.Doc;
  private provider: WebsocketProvider;
  private yContent: Y.Map<unknown>;
  private awareness: Awareness;
  private options: BuilderCollabOptions;
  private isInitialSync = true;

  constructor(options: BuilderCollabOptions) {
    this.options = options;

    // Build WebSocket URL
    const baseUrl = appConfig.apiUrl.replace(/^http/, 'ws');
    const wsUrl = `${baseUrl}/yjs`;
    const roomName = `page:${options.projectId}:${options.pageId}`;

    // Create Yjs document
    this.ydoc = new Y.Doc();
    this.yContent = this.ydoc.getMap('puck-content');

    // Create WebSocket provider
    this.provider = new WebsocketProvider(wsUrl, roomName, this.ydoc, {
      connect: true,
      maxBackoffTime: 2500,
    });

    this.awareness = this.provider.awareness;

    // Set up user info
    const colors = getUserColor(options.user.id);
    this.awareness.setLocalStateField('user', {
      id: options.user.id,
      name: options.user.name || options.user.email || 'Anonymous',
      ...colors,
    });

    // Set up event handlers
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Connection status
    this.provider.on('status', (event: { status: string }) => {
      const status = event.status === 'connected'
        ? 'connected'
        : event.status === 'disconnected'
          ? 'disconnected'
          : 'connecting';
      this.options.onConnectionChange?.(status);
    });

    // Sync status
    this.provider.on('sync', (isSynced: boolean) => {
      this.options.onSync?.(isSynced);

      if (isSynced && this.isInitialSync) {
        this.isInitialSync = false;
      }
    });

    // Content changes
    this.yContent.observe(() => {
      const data = this.getData();
      if (data) {
        this.options.onContentChange?.(data);
      }
    });

    // Awareness changes (user presence)
    this.awareness.on('change', () => {
      const users = this.getUsers();
      this.options.onUsersChange?.(users);
    });
  }

  /**
   * Get current Puck data from Yjs
   */
  getData(): PuckData | null {
    const content = this.yContent.get('content') as PuckComponent[] | undefined;
    const root = this.yContent.get('root') as Record<string, unknown> | undefined;

    if (!content && !root) {
      return null;
    }

    return {
      content: content || [],
      root: root || {},
    };
  }

  /**
   * Set Puck data (will sync to other users)
   */
  setData(data: PuckData) {
    this.ydoc.transact(() => {
      this.yContent.set('content', data.content);
      this.yContent.set('root', data.root);
    });
  }

  /**
   * Initialize with data if empty or if Yjs has no content
   * This ensures database content takes precedence over empty Yjs state
   */
  initializeIfEmpty(data: PuckData) {
    const existingContent = this.yContent.get('content') as PuckComponent[] | undefined;

    // Initialize if:
    // 1. Yjs map is empty (no keys)
    // 2. OR content array doesn't exist or is empty, but database has content
    const yjsIsEmpty = this.yContent.size === 0;
    const yjsHasNoContent = !existingContent || !Array.isArray(existingContent) || existingContent.length === 0;
    const databaseHasContent = data.content && Array.isArray(data.content) && data.content.length > 0;

    if (yjsIsEmpty || (yjsHasNoContent && databaseHasContent)) {
      this.setData(data);
    }
  }

  /**
   * Get connected users
   */
  getUsers(): BuilderCollabUser[] {
    const users: BuilderCollabUser[] = [];

    this.awareness.getStates().forEach((state, clientId) => {
      if (state.user && clientId !== this.ydoc.clientID) {
        users.push({
          id: state.user.id,
          name: state.user.name,
          color: state.user.color,
          colorLight: state.user.colorLight,
          cursor: state.cursor,
        });
      }
    });

    return users;
  }

  /**
   * Update cursor position for local user
   */
  updateCursor(cursor: { componentId?: string; section?: 'canvas' | 'sidebar' | 'properties' }) {
    this.awareness.setLocalStateField('cursor', cursor);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.provider.wsconnected;
  }

  /**
   * Disconnect and cleanup
   */
  destroy() {
    this.provider.disconnect();
    this.provider.destroy();
    this.ydoc.destroy();
  }
}

/**
 * Create a builder collaboration instance
 */
export function createBuilderCollab(options: BuilderCollabOptions): BuilderCollab {
  return new BuilderCollab(options);
}
