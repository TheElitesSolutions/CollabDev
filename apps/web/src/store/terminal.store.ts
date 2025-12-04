/**
 * Terminal Store
 *
 * Zustand store for managing terminal state including:
 * - Panel visibility
 * - Multiple terminal tabs
 * - Active terminal selection
 * - Dev server preview URL
 */

import { create } from 'zustand';

export interface TerminalTab {
  id: string;
  title: string;
  isActive: boolean;
  createdAt: Date;
}

export interface TerminalState {
  // Panel state
  isPanelOpen: boolean;
  panelHeight: number;

  // Terminal tabs
  tabs: TerminalTab[];
  activeTabId: string | null;

  // Preview state
  previewUrl: string | null;
  isPreviewOpen: boolean;

  // WebContainer state
  isBooting: boolean;
  isBooted: boolean;
  bootError: string | null;

  // Actions
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  setPanelHeight: (height: number) => void;

  createTab: (title?: string) => string;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  renameTab: (tabId: string, title: string) => void;

  setPreviewUrl: (url: string | null) => void;
  togglePreview: () => void;
  openPreview: () => void;
  closePreview: () => void;

  setBootingState: (isBooting: boolean) => void;
  setBootedState: (isBooted: boolean) => void;
  setBootError: (error: string | null) => void;

  reset: () => void;
}

const generateTabId = () => `terminal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const DEFAULT_PANEL_HEIGHT = 300;
const MIN_PANEL_HEIGHT = 150;
const MAX_PANEL_HEIGHT = 600;

export const useTerminalStore = create<TerminalState>((set, get) => ({
  // Initial state
  isPanelOpen: false,
  panelHeight: DEFAULT_PANEL_HEIGHT,
  tabs: [],
  activeTabId: null,
  previewUrl: null,
  isPreviewOpen: false,
  isBooting: false,
  isBooted: false,
  bootError: null,

  // Panel actions
  togglePanel: () => {
    const { isPanelOpen, tabs, createTab } = get();
    if (!isPanelOpen && tabs.length === 0) {
      // Auto-create first tab when opening
      createTab('Terminal 1');
    }
    set({ isPanelOpen: !isPanelOpen });
  },

  openPanel: () => {
    const { tabs, createTab } = get();
    if (tabs.length === 0) {
      createTab('Terminal 1');
    }
    set({ isPanelOpen: true });
  },

  closePanel: () => {
    set({ isPanelOpen: false });
  },

  setPanelHeight: (height: number) => {
    const clampedHeight = Math.min(Math.max(height, MIN_PANEL_HEIGHT), MAX_PANEL_HEIGHT);
    set({ panelHeight: clampedHeight });
  },

  // Tab actions
  createTab: (title?: string) => {
    const { tabs } = get();
    const tabNumber = tabs.length + 1;
    const newTab: TerminalTab = {
      id: generateTabId(),
      title: title || `Terminal ${tabNumber}`,
      isActive: true,
      createdAt: new Date(),
    };

    // Mark all other tabs as inactive
    const updatedTabs = tabs.map((tab) => ({ ...tab, isActive: false }));

    set({
      tabs: [...updatedTabs, newTab],
      activeTabId: newTab.id,
    });

    return newTab.id;
  },

  closeTab: (tabId: string) => {
    const { tabs, activeTabId } = get();
    const tabIndex = tabs.findIndex((t) => t.id === tabId);
    const newTabs = tabs.filter((t) => t.id !== tabId);

    let newActiveTabId = activeTabId;
    if (activeTabId === tabId && newTabs.length > 0) {
      // Activate adjacent tab
      const newIndex = Math.min(tabIndex, newTabs.length - 1);
      newActiveTabId = newTabs[newIndex].id;
      newTabs[newIndex] = { ...newTabs[newIndex], isActive: true };
    } else if (newTabs.length === 0) {
      newActiveTabId = null;
    }

    set({
      tabs: newTabs,
      activeTabId: newActiveTabId,
      // Close panel if no tabs remain
      isPanelOpen: newTabs.length > 0 ? get().isPanelOpen : false,
    });
  },

  setActiveTab: (tabId: string) => {
    const { tabs } = get();
    const updatedTabs = tabs.map((tab) => ({
      ...tab,
      isActive: tab.id === tabId,
    }));

    set({
      tabs: updatedTabs,
      activeTabId: tabId,
    });
  },

  renameTab: (tabId: string, title: string) => {
    const { tabs } = get();
    const updatedTabs = tabs.map((tab) =>
      tab.id === tabId ? { ...tab, title } : tab,
    );
    set({ tabs: updatedTabs });
  },

  // Preview actions
  setPreviewUrl: (url: string | null) => {
    set({
      previewUrl: url,
      isPreviewOpen: url !== null,
    });
  },

  togglePreview: () => {
    set((state) => ({ isPreviewOpen: !state.isPreviewOpen }));
  },

  openPreview: () => {
    set({ isPreviewOpen: true });
  },

  closePreview: () => {
    set({ isPreviewOpen: false });
  },

  // WebContainer state actions
  setBootingState: (isBooting: boolean) => {
    set({ isBooting });
  },

  setBootedState: (isBooted: boolean) => {
    set({ isBooted, isBooting: false });
  },

  setBootError: (error: string | null) => {
    set({ bootError: error, isBooting: false });
  },

  // Reset
  reset: () => {
    set({
      isPanelOpen: false,
      panelHeight: DEFAULT_PANEL_HEIGHT,
      tabs: [],
      activeTabId: null,
      previewUrl: null,
      isPreviewOpen: false,
      isBooting: false,
      isBooted: false,
      bootError: null,
    });
  },
}));
