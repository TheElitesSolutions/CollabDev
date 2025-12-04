/**
 * WebContainer Singleton
 *
 * Manages the WebContainer instance lifecycle.
 * WebContainer can only be booted once per page, so we use a singleton pattern.
 */

import type { WebContainer, FileSystemTree } from '@webcontainer/api';

let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

/**
 * Check if WebContainers are supported in the current browser
 */
export function isWebContainerSupported(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for SharedArrayBuffer support (required for WebContainers)
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

  // Check for cross-origin isolation
  const isCrossOriginIsolated =
    typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated;

  return hasSharedArrayBuffer && isCrossOriginIsolated;
}

/**
 * Boot or retrieve the WebContainer instance
 * Only one instance can exist per page
 */
export async function getWebContainer(): Promise<WebContainer> {
  // Return existing instance if available
  if (webcontainerInstance) {
    return webcontainerInstance;
  }

  // Return existing boot promise if in progress
  if (bootPromise) {
    return bootPromise;
  }

  // Check browser support before attempting to boot
  if (!isWebContainerSupported()) {
    throw new Error(
      'WebContainers are not supported in this browser. ' +
        'Please ensure you are using a modern browser with cross-origin isolation enabled.',
    );
  }

  // Boot new instance
  bootPromise = (async () => {
    const { WebContainer } = await import('@webcontainer/api');
    webcontainerInstance = await WebContainer.boot();
    return webcontainerInstance;
  })();

  return bootPromise;
}

/**
 * Get the current WebContainer instance without booting
 * Returns null if not yet booted
 */
export function getWebContainerInstance(): WebContainer | null {
  return webcontainerInstance;
}

/**
 * Check if WebContainer is currently booted
 */
export function isWebContainerBooted(): boolean {
  return webcontainerInstance !== null;
}

/**
 * Teardown the WebContainer instance
 * Note: WebContainer doesn't have a destroy method, but we can clear our reference
 */
export function teardownWebContainer(): void {
  webcontainerInstance = null;
  bootPromise = null;
}

// Re-export types for convenience
export type { WebContainer, FileSystemTree };
