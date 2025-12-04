'use client';

import { X, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ProjectFile } from '@/lib/api-client';

export interface EditorTab {
  file: ProjectFile;
  isDirty?: boolean;
}

interface EditorTabsProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onTabClick: (fileId: string) => void;
  onTabClose: (fileId: string) => void;
  className?: string;
}

export function EditorTabs({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  className,
}: EditorTabsProps) {
  if (tabs.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 bg-[#252526] border-b border-[#3c3c3c] overflow-x-auto',
        className
      )}
      style={{ scrollbarWidth: 'thin' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.file.id === activeTabId;

        return (
          <div
            key={tab.file.id}
            className={cn(
              'group relative flex items-center gap-2 px-3 py-1.5 min-w-[120px] max-w-[200px] cursor-pointer transition-colors border-r border-[#3c3c3c]',
              isActive
                ? 'bg-[#1e1e1e] text-white'
                : 'bg-[#2d2d30] text-[#969696] hover:bg-[#1e1e1e]'
            )}
            onClick={() => onTabClick(tab.file.id)}
          >
            {/* File name */}
            <span className="truncate text-sm flex-1">
              {tab.file.name}
            </span>

            {/* Dirty indicator or close button */}
            <div className="shrink-0 flex items-center">
              {tab.isDirty ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center w-4 h-4">
                      <Circle className="h-2 w-2 fill-current text-white" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Unsaved changes</TooltipContent>
                </Tooltip>
              ) : null}

              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-4 w-4 p-0 hover:bg-[#3c3c3c] rounded-sm transition-opacity',
                  tab.isDirty ? 'opacity-0 group-hover:opacity-100' : ''
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.file.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Active tab indicator */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007acc]" />
            )}
          </div>
        );
      })}
    </div>
  );
}
