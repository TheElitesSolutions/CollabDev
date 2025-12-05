'use client';

/**
 * TerminalPanel Component
 *
 * The main terminal panel that integrates:
 * - Resizable bottom panel
 * - Tab management
 * - WebContainer terminal
 * - Preview frame (side-by-side when dev server runs)
 */

import { useRef, useCallback, useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Terminal as TerminalIcon,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useTerminalStore } from '@/store/terminal.store';
import { useWebContainer } from '@/hooks/use-webcontainer';
import { TerminalTabs } from './TerminalTabs';
import { PreviewFrame } from './PreviewFrame';
import { cn } from '@/lib/utils';
import type { WebContainerTerminalRef } from './WebContainerTerminal';
import { WebContainerFileWatcher } from '@/lib/webcontainer/file-watcher';
import { WebContainerFileSync } from '@/lib/webcontainer/file-sync';

// Dynamically import terminal to avoid SSR issues
const WebContainerTerminal = dynamic(
  () => import('./WebContainerTerminal'),
  { ssr: false },
);

export interface TerminalPanelProps {
  projectId: string;
  className?: string;
  /**
   * Callback when terminal operations modify files
   * Should trigger file list refresh in parent component
   */
  onFilesChanged?: () => void;
}

const MIN_HEIGHT = 150;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 300;

export function TerminalPanel({ projectId, className, onFilesChanged }: TerminalPanelProps) {
  const {
    isPanelOpen,
    panelHeight,
    tabs,
    activeTabId,
    previewUrl,
    isPreviewOpen,
    setPanelHeight,
    closePanel,
    setPreviewUrl,
  } = useTerminalStore();

  const [isMaximized, setIsMaximized] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const terminalRefs = useRef<Map<string, WebContainerTerminalRef>>(new Map());
  const fileWatcherRef = useRef<WebContainerFileWatcher | null>(null);
  const fileSyncRef = useRef<WebContainerFileSync | null>(null);

  // Initialize WebContainer
  const {
    instance: webcontainer,
    isBooting,
    isBooted,
    isSupported,
    error: bootError,
  } = useWebContainer({
    autoboot: isPanelOpen,
    onServerReady: (port, url) => {
      setPreviewUrl(url);
    },
  });

  // Calculate effective height
  const effectiveHeight = isMaximized ? MAX_HEIGHT : panelHeight;

  // Handle resize drag
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (isMaximized) return;

      e.preventDefault();
      setIsResizing(true);

      const startY = e.clientY;
      const startHeight = panelHeight;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = startY - moveEvent.clientY;
        const newHeight = Math.min(Math.max(startHeight + deltaY, MIN_HEIGHT), MAX_HEIGHT);
        setPanelHeight(newHeight);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [isMaximized, panelHeight, setPanelHeight],
  );

  // Toggle maximize
  const handleToggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  // Focus active terminal when tab changes
  useEffect(() => {
    if (activeTabId) {
      const terminalRef = terminalRefs.current.get(activeTabId);
      terminalRef?.focus();
    }
  }, [activeTabId]);

  // Initialize file watcher and sync when WebContainer is ready
  useEffect(() => {
    if (!webcontainer || !isBooted) {
      return;
    }

    // Create file sync service
    const fileSync = new WebContainerFileSync(webcontainer, {
      projectId,
      onSyncStart: () => {
        setIsSyncing(true);
      },
      onSyncComplete: (syncedCount) => {
        setIsSyncing(false);
        if (syncedCount > 0) {
          console.log(`✓ Synced ${syncedCount} files to backend`);
          // Trigger file list refresh in parent
          onFilesChanged?.();
        }
      },
      onSyncError: (error) => {
        setIsSyncing(false);
        console.error('File sync error:', error);
      },
    });

    // Initialize sync service
    fileSync.initialize().then(() => {
      fileSyncRef.current = fileSync;

      // Create file watcher
      const fileWatcher = new WebContainerFileWatcher(webcontainer, {
        pollInterval: 2000, // Check every 2 seconds
        onChange: (changes) => {
          console.log(`📁 Detected ${changes.length} file changes:`, changes);
          // Queue changes for sync
          fileSync.queueChanges(changes);
        },
        onError: (error) => {
          console.error('File watcher error:', error);
        },
      });

      // Start watching
      fileWatcher.start();
      fileWatcherRef.current = fileWatcher;

      console.log('✓ File sync initialized - terminal files will sync to file explorer');
    });

    // Cleanup
    return () => {
      fileWatcherRef.current?.stop();
      fileWatcherRef.current = null;
      fileSyncRef.current = null;
    };
  }, [webcontainer, isBooted, projectId, onFilesChanged]);

  // Browser compatibility warning
  if (!isSupported) {
    return (
      <div
        className={cn(
          'flex flex-col border-t border-[#3c3c3c] bg-[#1e1e1e]',
          className,
        )}
        style={{ height: effectiveHeight }}
      >
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center p-6 max-w-md">
            <AlertCircle className="h-12 w-12 text-yellow-500" />
            <h3 className="text-lg font-medium text-white">
              WebContainers Not Supported
            </h3>
            <p className="text-sm text-[#969696]">
              Your browser doesn&apos;t support WebContainers. Please use a modern browser
              like Chrome, Edge, or Firefox with cross-origin isolation enabled.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Boot error
  if (bootError) {
    return (
      <div
        className={cn(
          'flex flex-col border-t border-[#3c3c3c] bg-[#1e1e1e]',
          className,
        )}
        style={{ height: effectiveHeight }}
      >
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-center p-6 max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h3 className="text-lg font-medium text-white">Boot Error</h3>
            <p className="text-sm text-[#969696]">{bootError.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        'flex flex-col border-t border-[#3c3c3c] bg-[#1e1e1e]',
        isResizing && 'select-none',
        !isPanelOpen && 'hidden',
        className,
      )}
      style={{ height: effectiveHeight }}
    >
      {/* Resize handle */}
      <div
        className={cn(
          'h-1 cursor-ns-resize hover:bg-[#007acc] transition-colors',
          isResizing && 'bg-[#007acc]',
        )}
        onMouseDown={handleResizeStart}
      />

      {/* Header */}
      <div className="flex items-center justify-between bg-[#252526] border-b border-[#3c3c3c]">
        {/* Tabs */}
        <div className="flex-1 overflow-hidden">
          <TerminalTabs />
        </div>

        {/* Sync indicator */}
        {isSyncing && (
          <div className="flex items-center gap-1 px-2 text-xs text-[#cccccc]">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Syncing files...</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-1 px-2">
          <button
            onClick={handleToggleMaximize}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-[#3c3c3c] text-[#cccccc] transition-colors"
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            {isMaximized ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={closePanel}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-[#3c3c3c] text-[#cccccc] transition-colors"
            title="Close Panel"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 min-h-0">
        {/* Terminal area */}
        <div
          className={cn(
            'flex-1 min-w-0',
            isPreviewOpen && previewUrl && 'w-1/2',
          )}
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                'h-full',
                tab.id === activeTabId ? 'block' : 'hidden',
              )}
            >
              <WebContainerTerminal
                webcontainer={webcontainer}
                isBooting={isBooting}
                ref={(ref) => {
                  if (ref) {
                    terminalRefs.current.set(tab.id, ref);
                  } else {
                    terminalRefs.current.delete(tab.id);
                  }
                }}
              />
            </div>
          ))}

          {/* Empty state */}
          {tabs.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-[#969696]">
                <TerminalIcon className="h-8 w-8" />
                <p className="text-sm">No terminal open</p>
              </div>
            </div>
          )}
        </div>

        {/* Preview area */}
        {isPreviewOpen && previewUrl && (
          <PreviewFrame className="w-1/2" />
        )}
      </div>
    </div>
  );
}
