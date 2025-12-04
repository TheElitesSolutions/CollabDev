'use client';

/**
 * PreviewFrame Component
 *
 * Displays the running dev server in an iframe.
 */

import { useRef } from 'react';
import { ExternalLink, RefreshCw, X } from 'lucide-react';
import { useTerminalStore } from '@/store/terminal.store';
import { cn } from '@/lib/utils';

export interface PreviewFrameProps {
  className?: string;
}

export function PreviewFrame({ className }: PreviewFrameProps) {
  const { previewUrl, isPreviewOpen, closePreview } = useTerminalStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!previewUrl || !isPreviewOpen) {
    return null;
  }

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = previewUrl;
    }
  };

  const handleOpenExternal = () => {
    window.open(previewUrl, '_blank');
  };

  return (
    <div className={cn('flex flex-col border-l border-[#3c3c3c]', className)}>
      {/* Preview header */}
      <div className="flex h-8 items-center justify-between bg-[#252526] px-2 border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#969696]">Preview</span>
          <span className="text-xs text-[#007acc] font-mono truncate max-w-[150px]">
            {previewUrl}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-[#3c3c3c] text-[#cccccc] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleOpenExternal}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-[#3c3c3c] text-[#cccccc] transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={closePreview}
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-[#3c3c3c] text-[#cccccc] transition-colors"
            title="Close preview"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Preview iframe */}
      <div className="flex-1 bg-white">
        <iframe
          ref={iframeRef}
          src={previewUrl}
          className="h-full w-full border-0"
          title="Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        />
      </div>
    </div>
  );
}
