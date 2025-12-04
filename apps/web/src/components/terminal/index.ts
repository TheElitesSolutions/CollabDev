/**
 * Terminal Components
 *
 * Barrel exports for terminal-related components.
 * Uses dynamic imports to avoid SSR issues with xterm.js and WebContainers.
 */

export { TerminalPanel } from './TerminalPanel';
export { TerminalTabs } from './TerminalTabs';
export { PreviewFrame } from './PreviewFrame';

// Dynamic import for the main terminal component
export { default as WebContainerTerminal } from './WebContainerTerminal';
export type { WebContainerTerminalRef, WebContainerTerminalProps } from './WebContainerTerminal';
