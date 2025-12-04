'use client';

/**
 * useWebContainer Hook
 *
 * React hook for managing WebContainer lifecycle.
 * Handles booting, error states, and provides the instance for terminal/filesystem operations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { WebContainer, WebContainerProcess } from '@webcontainer/api';
import {
  getWebContainer,
  isWebContainerSupported,
  isWebContainerBooted,
  getWebContainerInstance,
} from '@/lib/webcontainer';
import type { FileSystemTree } from '@/lib/webcontainer';

export interface UseWebContainerOptions {
  /**
   * Auto-boot the WebContainer when the hook mounts
   * @default true
   */
  autoboot?: boolean;

  /**
   * Initial files to mount after boot
   */
  initialFiles?: FileSystemTree;

  /**
   * Callback when WebContainer boots successfully
   */
  onBoot?: (instance: WebContainer) => void;

  /**
   * Callback when boot fails
   */
  onError?: (error: Error) => void;

  /**
   * Callback when a server is ready (dev server started)
   */
  onServerReady?: (port: number, url: string) => void;
}

export interface UseWebContainerReturn {
  /**
   * The WebContainer instance (null if not booted)
   */
  instance: WebContainer | null;

  /**
   * Whether the WebContainer is currently booting
   */
  isBooting: boolean;

  /**
   * Whether the WebContainer has finished booting
   */
  isBooted: boolean;

  /**
   * Whether WebContainers are supported in this browser
   */
  isSupported: boolean;

  /**
   * Error that occurred during boot (if any)
   */
  error: Error | null;

  /**
   * URL of the running dev server (if any)
   */
  serverUrl: string | null;

  /**
   * Manually trigger boot (if autoboot is false)
   */
  boot: () => Promise<WebContainer | null>;

  /**
   * Mount files to the WebContainer filesystem
   */
  mountFiles: (files: FileSystemTree) => Promise<void>;

  /**
   * Spawn a process in the WebContainer
   */
  spawn: (
    command: string,
    args?: string[],
    options?: { terminal?: { cols: number; rows: number } },
  ) => Promise<WebContainerProcess | null>;

  /**
   * Run npm install
   */
  npmInstall: () => Promise<number>;

  /**
   * Run a dev server (npm run dev)
   */
  startDevServer: () => Promise<WebContainerProcess | null>;
}

export function useWebContainer(
  options: UseWebContainerOptions = {},
): UseWebContainerReturn {
  const { autoboot = true, initialFiles, onBoot, onError, onServerReady } = options;

  const [instance, setInstance] = useState<WebContainer | null>(() =>
    getWebContainerInstance(),
  );
  const [isBooting, setIsBooting] = useState(false);
  const [isBooted, setIsBooted] = useState(() => isWebContainerBooted());
  const [error, setError] = useState<Error | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);

  const isSupported = typeof window !== 'undefined' && isWebContainerSupported();
  const hasBootedRef = useRef(false);

  // Boot the WebContainer
  const boot = useCallback(async (): Promise<WebContainer | null> => {
    if (hasBootedRef.current || isBooted || isBooting) {
      return instance;
    }

    if (!isSupported) {
      const err = new Error(
        'WebContainers are not supported. Please use a modern browser with cross-origin isolation.',
      );
      setError(err);
      onError?.(err);
      return null;
    }

    setIsBooting(true);
    setError(null);
    hasBootedRef.current = true;

    try {
      const webcontainer = await getWebContainer();
      setInstance(webcontainer);
      setIsBooted(true);

      // Listen for server-ready events
      webcontainer.on('server-ready', (port, url) => {
        setServerUrl(url);
        onServerReady?.(port, url);
      });

      // Mount initial files if provided
      if (initialFiles) {
        await webcontainer.mount(initialFiles);
      }

      onBoot?.(webcontainer);
      return webcontainer;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);
      hasBootedRef.current = false;
      return null;
    } finally {
      setIsBooting(false);
    }
  }, [instance, isBooted, isBooting, isSupported, initialFiles, onBoot, onError, onServerReady]);

  // Mount files to filesystem
  const mountFiles = useCallback(
    async (files: FileSystemTree): Promise<void> => {
      if (!instance) {
        throw new Error('WebContainer not booted');
      }
      await instance.mount(files);
    },
    [instance],
  );

  // Spawn a process
  const spawn = useCallback(
    async (
      command: string,
      args: string[] = [],
      options?: { terminal?: { cols: number; rows: number } },
    ): Promise<WebContainerProcess | null> => {
      if (!instance) {
        console.error('WebContainer not booted');
        return null;
      }
      return instance.spawn(command, args, options);
    },
    [instance],
  );

  // Run npm install
  const npmInstall = useCallback(async (): Promise<number> => {
    if (!instance) {
      throw new Error('WebContainer not booted');
    }

    const installProcess = await instance.spawn('npm', ['install']);
    return installProcess.exit;
  }, [instance]);

  // Start dev server
  const startDevServer = useCallback(async (): Promise<WebContainerProcess | null> => {
    if (!instance) {
      console.error('WebContainer not booted');
      return null;
    }

    return instance.spawn('npm', ['run', 'dev']);
  }, [instance]);

  // Auto-boot on mount
  useEffect(() => {
    if (autoboot && !isBooted && !isBooting && !hasBootedRef.current) {
      boot();
    }
  }, [autoboot, isBooted, isBooting, boot]);

  return {
    instance,
    isBooting,
    isBooted,
    isSupported,
    error,
    serverUrl,
    boot,
    mountFiles,
    spawn,
    npmInstall,
    startDevServer,
  };
}
