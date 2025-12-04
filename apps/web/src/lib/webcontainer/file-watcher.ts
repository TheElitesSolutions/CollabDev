/**
 * WebContainer Filesystem Watcher
 *
 * Monitors the WebContainer filesystem for changes and detects new files.
 * Excludes common directories that shouldn't be synced (node_modules, .git, etc).
 */

import type { WebContainer } from '@webcontainer/api';

export interface FileChange {
  path: string;
  type: 'added' | 'modified' | 'deleted';
  isDirectory: boolean;
}

export interface WatcherOptions {
  /**
   * Polling interval in milliseconds
   * @default 2000
   */
  pollInterval?: number;

  /**
   * Paths to exclude from watching (glob patterns)
   * @default ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.next/**']
   */
  excludePaths?: string[];

  /**
   * Callback when changes are detected
   */
  onChange?: (changes: FileChange[]) => void;

  /**
   * Callback when an error occurs
   */
  onError?: (error: Error) => void;
}

interface FileEntry {
  path: string;
  isDirectory: boolean;
  mtime?: number;
}

const DEFAULT_EXCLUDE_PATHS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.cache',
  'coverage',
  '.turbo',
  '.vercel',
];

export class WebContainerFileWatcher {
  private webcontainer: WebContainer;
  private options: Required<Omit<WatcherOptions, 'onChange' | 'onError'>> & Pick<WatcherOptions, 'onChange' | 'onError'>;
  private intervalId: NodeJS.Timeout | null = null;
  private fileMap: Map<string, FileEntry> = new Map();
  private isRunning = false;

  constructor(webcontainer: WebContainer, options: WatcherOptions = {}) {
    this.webcontainer = webcontainer;
    this.options = {
      pollInterval: options.pollInterval ?? 2000,
      excludePaths: options.excludePaths ?? DEFAULT_EXCLUDE_PATHS,
      onChange: options.onChange,
      onError: options.onError,
    };
  }

  /**
   * Start watching for filesystem changes
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('File watcher is already running');
      return;
    }

    this.isRunning = true;

    // Initial scan
    try {
      await this.scanFilesystem();
    } catch (error) {
      this.options.onError?.(error instanceof Error ? error : new Error(String(error)));
    }

    // Start polling
    this.intervalId = setInterval(async () => {
      try {
        await this.checkForChanges();
      } catch (error) {
        this.options.onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    }, this.options.pollInterval);
  }

  /**
   * Stop watching for changes
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Check if watcher is currently running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Scan the entire filesystem and build file map
   */
  private async scanFilesystem(): Promise<void> {
    this.fileMap.clear();
    await this.scanDirectory('/');
  }

  /**
   * Recursively scan a directory
   */
  private async scanDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await this.webcontainer.fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = dirPath === '/' ? `/${entry.name}` : `${dirPath}/${entry.name}`;

        // Skip excluded paths
        if (this.isExcluded(fullPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          this.fileMap.set(fullPath, {
            path: fullPath,
            isDirectory: true,
          });
          // Recursively scan subdirectories
          await this.scanDirectory(fullPath);
        } else if (entry.isFile()) {
          // WebContainer doesn't support fs.stat, use file size as change indicator
          try {
            const content = await this.webcontainer.fs.readFile(fullPath, 'utf-8');
            this.fileMap.set(fullPath, {
              path: fullPath,
              isDirectory: false,
              mtime: content.length, // Use content length as change indicator
            });
          } catch {
            // If we can't read the file, track it without mtime
            this.fileMap.set(fullPath, {
              path: fullPath,
              isDirectory: false,
            });
          }
        }
      }
    } catch (error) {
      // Directory might not exist or be readable, skip it
      if ((error as any).code !== 'ENOENT') {
        console.error(`Error scanning directory ${dirPath}:`, error);
      }
    }
  }

  /**
   * Check for changes since last scan
   */
  private async checkForChanges(): Promise<void> {
    const changes: FileChange[] = [];
    const currentFiles = new Map<string, FileEntry>();

    // Scan current state
    await this.scanDirectoryForChanges('/', currentFiles);

    // Detect new and modified files
    for (const [path, entry] of currentFiles) {
      const oldEntry = this.fileMap.get(path);

      if (!oldEntry) {
        // New file
        changes.push({
          path,
          type: 'added',
          isDirectory: entry.isDirectory,
        });
      } else if (!entry.isDirectory && oldEntry.mtime !== entry.mtime) {
        // Modified file
        changes.push({
          path,
          type: 'modified',
          isDirectory: false,
        });
      }
    }

    // Detect deleted files
    for (const [path, entry] of this.fileMap) {
      if (!currentFiles.has(path)) {
        changes.push({
          path,
          type: 'deleted',
          isDirectory: entry.isDirectory,
        });
      }
    }

    // Update file map
    this.fileMap = currentFiles;

    // Notify changes
    if (changes.length > 0) {
      this.options.onChange?.(changes);
    }
  }

  /**
   * Scan directory for changes (non-recursive initial call)
   */
  private async scanDirectoryForChanges(
    dirPath: string,
    fileMap: Map<string, FileEntry>,
  ): Promise<void> {
    try {
      const entries = await this.webcontainer.fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = dirPath === '/' ? `/${entry.name}` : `${dirPath}/${entry.name}`;

        // Skip excluded paths
        if (this.isExcluded(fullPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          fileMap.set(fullPath, {
            path: fullPath,
            isDirectory: true,
          });
          // Recursively scan subdirectories
          await this.scanDirectoryForChanges(fullPath, fileMap);
        } else if (entry.isFile()) {
          // WebContainer doesn't support fs.stat, use file size as change indicator
          try {
            const content = await this.webcontainer.fs.readFile(fullPath, 'utf-8');
            fileMap.set(fullPath, {
              path: fullPath,
              isDirectory: false,
              mtime: content.length, // Use content length as change indicator
            });
          } catch {
            // If we can't read the file, track it without mtime
            fileMap.set(fullPath, {
              path: fullPath,
              isDirectory: false,
            });
          }
        }
      }
    } catch (error) {
      // Directory might not exist or be readable, skip it
      if ((error as any).code !== 'ENOENT') {
        console.error(`Error scanning directory ${dirPath}:`, error);
      }
    }
  }

  /**
   * Check if a path should be excluded from watching
   */
  private isExcluded(path: string): boolean {
    const pathParts = path.split('/').filter(Boolean);

    for (const part of pathParts) {
      if (this.options.excludePaths.includes(part)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all currently tracked files
   */
  getTrackedFiles(): FileEntry[] {
    return Array.from(this.fileMap.values());
  }
}
