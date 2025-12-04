'use client';

/**
 * TerminalTabs Component
 *
 * Tab bar for managing multiple terminal instances.
 */

import { Plus, X } from 'lucide-react';
import { useTerminalStore, type TerminalTab } from '@/store/terminal.store';
import { cn } from '@/lib/utils';

export interface TerminalTabsProps {
  className?: string;
}

export function TerminalTabs({ className }: TerminalTabsProps) {
  const { tabs, activeTabId, createTab, closeTab, setActiveTab } = useTerminalStore();

  const handleNewTab = () => {
    createTab();
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1 bg-[#252526] px-2 border-b border-[#3c3c3c]',
        className,
      )}
    >
      {/* Tab list */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSelect={() => handleSelectTab(tab.id)}
            onClose={(e) => handleCloseTab(e, tab.id)}
          />
        ))}
      </div>

      {/* New tab button */}
      <button
        onClick={handleNewTab}
        className="flex h-7 w-7 items-center justify-center rounded hover:bg-[#3c3c3c] text-[#cccccc] transition-colors"
        title="New Terminal"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

interface TabItemProps {
  tab: TerminalTab;
  isActive: boolean;
  onSelect: () => void;
  onClose: (e: React.MouseEvent) => void;
}

function TabItem({ tab, isActive, onSelect, onClose }: TabItemProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'group flex h-8 items-center gap-2 px-3 cursor-pointer border-b-2 transition-colors',
        isActive
          ? 'bg-[#1e1e1e] border-[#007acc] text-white'
          : 'border-transparent text-[#969696] hover:text-[#cccccc] hover:bg-[#2d2d2d]',
      )}
    >
      <span className="text-sm whitespace-nowrap">{tab.title}</span>
      <button
        onClick={onClose}
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded transition-opacity',
          isActive
            ? 'opacity-100 hover:bg-[#3c3c3c]'
            : 'opacity-0 group-hover:opacity-100 hover:bg-[#3c3c3c]',
        )}
        title="Close Terminal"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
