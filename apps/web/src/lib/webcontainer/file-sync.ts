/**
 * WebContainer File Sync Service
 *
 * Syncs files from WebContainer filesystem to backend API.
 * Handles batch operations and prevents duplicate syncs.
 */

import type { WebContainer } from '@webcontainer/api';
import { apiClient, ProjectFile } from '@/lib/api-client';
import type { FileChange } from './file-watcher';

export interface FileSyncOptions {
  /**
   * Project ID to sync files to
   */
  projectId: string;

  /**
   * Callback when sync starts
   */
  onSyncStart?: () => void;

  /**
   * Callback when sync completes
   */
  onSyncComplete?: (syncedFiles: number) => void;

  /**
   * Callback when sync fails
   */
  onSyncError?: (error: Error) => void;

  /**
   * Debounce delay in milliseconds before syncing
   * @default 1000
   */
  debounceDelay?: number;
}

export class WebContainerFileSync {
  private webcontainer: WebContainer;
  private options: Required<Omit<FileSyncOptions, 'onSyncStart' | 'onSyncComplete' | 'onSyncError'>> &
    Pick<FileSyncOptions, 'onSyncStart' | 'onSyncComplete' | 'onSyncError'>;
  private pendingChanges: FileChange[] = [];
  private syncTimeout: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private backendFileMap: Map<string, ProjectFile> = new Map();

  constructor(webcontainer: WebContainer, options: FileSyncOptions) {
    this.webcontainer = webcontainer;
    this.options = {
      projectId: options.projectId,
      debounceDelay: options.debounceDelay ?? 1000,
      onSyncStart: options.onSyncStart,
      onSyncComplete: options.onSyncComplete,
      onSyncError: options.onSyncError,
    };
  }

  /**
   * Initialize sync service by loading existing backend files
   */
  async initialize(): Promise<void> {
    try {
      const files = await apiClient.files.getAll(this.options.projectId);
      this.backendFileMap.clear();
      files.forEach((file) => {
        // Normalize path by ensuring it starts with /
        const normalizedPath = file.path.startsWith('/') ? file.path : `/${file.path}`;
        this.backendFileMap.set(normalizedPath, file);
      });
    } catch (error) {
      console.error('Failed to load backend files:', error);
      this.options.onSyncError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Queue changes for syncing
   */
  queueChanges(changes: FileChange[]): void {
    // Add new changes to pending queue
    this.pendingChanges.push(...changes);

    // Clear existing timeout
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    // Schedule sync after debounce delay
    this.syncTimeout = setTimeout(() => {
      this.syncChanges();
    }, this.options.debounceDelay);
  }

  /**
   * Sync pending changes to backend
   */
  private async syncChanges(): Promise<void> {
    if (this.isSyncing || this.pendingChanges.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.options.onSyncStart?.();

    const changesToSync = [...this.pendingChanges];
    this.pendingChanges = [];

    let syncedCount = 0;

    try {
      // Process changes in order: directories first, then files
      const directories = changesToSync.filter((c) => c.isDirectory);
      const files = changesToSync.filter((c) => !c.isDirectory);

      // Handle directory changes
      for (const change of directories) {
        try {
          if (change.type === 'added') {
            await this.syncDirectory(change.path);
            syncedCount++;
          } else if (change.type === 'deleted') {
            await this.deleteFromBackend(change.path);
            syncedCount++;
          }
        } catch (error) {
          console.error(`Failed to sync directory ${change.path}:`, error);
        }
      }

      // Handle file changes
      for (const change of files) {
        try {
          if (change.type === 'added' || change.type === 'modified') {
            await this.syncFile(change.path);
            syncedCount++;
          } else if (change.type === 'deleted') {
            await this.deleteFromBackend(change.path);
            syncedCount++;
          }
        } catch (error) {
          console.error(`Failed to sync file ${change.path}:`, error);
        }
      }

      this.options.onSyncComplete?.(syncedCount);
    } catch (error) {
      this.options.onSyncError?.(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.isSyncing = false;

      // If new changes arrived during sync, schedule another sync
      if (this.pendingChanges.length > 0) {
        this.syncTimeout = setTimeout(() => {
          this.syncChanges();
        }, this.options.debounceDelay);
      }
    }
  }

  /**
   * Sync a single file to backend
   */
  private async syncFile(path: string): Promise<void> {
    try {
      // Read file content from WebContainer
      const content = await this.webcontainer.fs.readFile(path, 'utf-8');

      // Determine parent folder
      const pathParts = path.split('/').filter(Boolean);
      const fileName = pathParts[pathParts.length - 1];
      const parentPath = pathParts.slice(0, -1).join('/');

      // Find or create parent folder
      let parentId: string | null = null;
      if (parentPath) {
        const parentFile = this.backendFileMap.get(`/${parentPath}`);
        if (parentFile) {
          parentId = parentFile.id;
        } else {
          // Parent doesn't exist, create it first
          await this.syncDirectory(`/${parentPath}`);
          const newParent = this.backendFileMap.get(`/${parentPath}`);
          if (newParent) {
            parentId = newParent.id;
          }
        }
      }

      // Check if file already exists in backend
      const existingFile = this.backendFileMap.get(path);

      if (existingFile) {
        // Update existing file
        const updated = await apiClient.files.update(this.options.projectId, existingFile.id, {
          content,
        });
        this.backendFileMap.set(path, updated);
      } else {
        // Create new file
        try {
          const created = await apiClient.files.create(this.options.projectId, {
            name: fileName,
            path: path.startsWith('/') ? path.slice(1) : path,
            isFolder: false,
            content,
            parentId: parentId || undefined,
          });
          this.backendFileMap.set(path, created);
        } catch (createError: any) {
          // Handle 409 Conflict - file exists but not in our map
          if (createError?.status === 409) {
            console.log(`File ${path} already exists, fetching and updating...`);
            // Fetch all files to update our map
            await this.initialize();
            // Retry update
            const existingFile = this.backendFileMap.get(path);
            if (existingFile) {
              const updated = await apiClient.files.update(this.options.projectId, existingFile.id, {
                content,
              });
              this.backendFileMap.set(path, updated);
            }
            // 409 was handled successfully, don't throw
            return;
          } else {
            throw createError;
          }
        }
      }
    } catch (error) {
      console.error(`Failed to sync file ${path}:`, error);
      throw error;
    }
  }

  /**
   * Sync a directory to backend
   */
  private async syncDirectory(path: string): Promise<void> {
    try {
      // Check if directory already exists
      const existingDir = this.backendFileMap.get(path);
      if (existingDir) {
        return; // Directory already exists
      }

      // Determine parent folder
      const pathParts = path.split('/').filter(Boolean);
      const dirName = pathParts[pathParts.length - 1];
      const parentPath = pathParts.slice(0, -1).join('/');

      let parentId: string | null = null;
      if (parentPath) {
        const parentFile = this.backendFileMap.get(`/${parentPath}`);
        if (parentFile) {
          parentId = parentFile.id;
        } else {
          // Parent doesn't exist, create it first (recursive)
          await this.syncDirectory(`/${parentPath}`);
          const newParent = this.backendFileMap.get(`/${parentPath}`);
          if (newParent) {
            parentId = newParent.id;
          }
        }
      }

      // Create directory
      const created = await apiClient.files.create(this.options.projectId, {
        name: dirName,
        path: path.startsWith('/') ? path.slice(1) : path,
        isFolder: true,
        parentId: parentId || undefined,
      });

      this.backendFileMap.set(path, created);
    } catch (error) {
      console.error(`Failed to sync directory ${path}:`, error);
      throw error;
    }
  }

  /**
   * Delete a file or directory from backend
   */
  private async deleteFromBackend(path: string): Promise<void> {
    try {
      const existingFile = this.backendFileMap.get(path);
      if (!existingFile) {
        return; // File doesn't exist in backend
      }

      await apiClient.files.delete(this.options.projectId, existingFile.id);
      this.backendFileMap.delete(path);
    } catch (error) {
      console.error(`Failed to delete ${path} from backend:`, error);
      throw error;
    }
  }

  /**
   * Force immediate sync of all pending changes
   */
  async forceSyncNow(): Promise<void> {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
    await this.syncChanges();
  }

  /**
   * Check if sync is currently in progress
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Get number of pending changes
   */
  getPendingChangesCount(): number {
    return this.pendingChanges.length;
  }

  /**
   * Clear all pending changes
   */
  clearPendingChanges(): void {
    this.pendingChanges = [];
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }
  }
}
