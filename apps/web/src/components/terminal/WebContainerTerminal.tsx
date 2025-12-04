'use client';

/**
 * WebContainerTerminal Component
 *
 * A terminal component that integrates xterm.js with WebContainer.
 * Provides an interactive shell for running npm commands and more.
 */

import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { WebContainer, WebContainerProcess } from '@webcontainer/api';

// These will be dynamically imported to avoid SSR issues
let Terminal: typeof import('@xterm/xterm').Terminal;
let FitAddon: typeof import('@xterm/addon-fit').FitAddon;
let WebLinksAddon: typeof import('@xterm/addon-web-links').WebLinksAddon;

export interface WebContainerTerminalRef {
  write: (data: string) => void;
  clear: () => void;
  focus: () => void;
  fit: () => void;
}

export interface WebContainerTerminalProps {
  webcontainer: WebContainer | null;
  isBooting?: boolean;
  className?: string;
  onData?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
}

const WebContainerTerminal = forwardRef<WebContainerTerminalRef, WebContainerTerminalProps>(
  function WebContainerTerminal(
    { webcontainer, isBooting = false, className = '', onData, onResize },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<InstanceType<typeof Terminal> | null>(null);
    const fitAddonRef = useRef<InstanceType<typeof FitAddon> | null>(null);
    const shellProcessRef = useRef<WebContainerProcess | null>(null);
    const inputWriterRef = useRef<WritableStreamDefaultWriter<string> | null>(null);
    const isInitializedRef = useRef(false);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      write: (data: string) => {
        terminalRef.current?.write(data);
      },
      clear: () => {
        terminalRef.current?.clear();
      },
      focus: () => {
        terminalRef.current?.focus();
      },
      fit: () => {
        fitAddonRef.current?.fit();
      },
    }));

    // Initialize terminal
    const initTerminal = useCallback(async () => {
      if (!containerRef.current || isInitializedRef.current) return;
      isInitializedRef.current = true;

      // Dynamically import xterm modules
      const [xtermModule, fitModule, webLinksModule] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-web-links'),
      ]);

      Terminal = xtermModule.Terminal;
      FitAddon = fitModule.FitAddon;
      WebLinksAddon = webLinksModule.WebLinksAddon;

      // CSS is imported via globals.css

      // Create terminal instance with VS Code-like dark theme
      const terminal = new Terminal({
        cursorBlink: true,
        convertEol: true,
        fontFamily: '"Cascadia Code", "Fira Code", Menlo, Monaco, "Courier New", monospace',
        fontSize: 14,
        lineHeight: 1.2,
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
          cursorAccent: '#1e1e1e',
          selectionBackground: '#264f78',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#ffffff',
        },
      });

      // Add addons
      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(webLinksAddon);

      // Open terminal in container
      terminal.open(containerRef.current);

      // Fit to container
      fitAddon.fit();

      // Store refs
      terminalRef.current = terminal;
      fitAddonRef.current = fitAddon;

      // Welcome message
      terminal.writeln('\x1b[1;34m┌──────────────────────────────────────────┐\x1b[0m');
      terminal.writeln('\x1b[1;34m│\x1b[0m  \x1b[1;32mCollabDev+ Terminal\x1b[0m                     \x1b[1;34m│\x1b[0m');
      terminal.writeln('\x1b[1;34m│\x1b[0m  Powered by WebContainers               \x1b[1;34m│\x1b[0m');
      terminal.writeln('\x1b[1;34m└──────────────────────────────────────────┘\x1b[0m');
      terminal.writeln('');

      if (isBooting) {
        terminal.writeln('\x1b[33mBooting WebContainer...\x1b[0m');
      }

      // Handle user input
      terminal.onData((data) => {
        onData?.(data);
        // Send to shell if connected
        if (inputWriterRef.current) {
          inputWriterRef.current.write(data);
        }
      });

      // Handle resize
      const resizeObserver = new ResizeObserver(() => {
        if (fitAddonRef.current && terminalRef.current) {
          fitAddonRef.current.fit();
          onResize?.(terminalRef.current.cols, terminalRef.current.rows);

          // Notify shell of resize
          shellProcessRef.current?.resize?.({
            cols: terminalRef.current.cols,
            rows: terminalRef.current.rows,
          });
        }
      });

      resizeObserver.observe(containerRef.current);

      // Cleanup
      return () => {
        resizeObserver.disconnect();
        terminal.dispose();
        shellProcessRef.current?.kill();
      };
    }, [isBooting, onData, onResize]);

    // Start shell when WebContainer is ready
    const startShell = useCallback(async () => {
      if (!webcontainer || !terminalRef.current) return;

      try {
        // Clear any existing shell
        if (shellProcessRef.current) {
          shellProcessRef.current.kill();
        }

        terminalRef.current.writeln('\x1b[32mWebContainer ready!\x1b[0m');
        terminalRef.current.writeln('');

        // Start jsh shell (WebContainer's shell)
        const shell = await webcontainer.spawn('jsh', {
          terminal: {
            cols: terminalRef.current.cols,
            rows: terminalRef.current.rows,
          },
        });

        shellProcessRef.current = shell;

        // Pipe output to terminal
        shell.output.pipeTo(
          new WritableStream({
            write(data) {
              terminalRef.current?.write(data);
            },
          }),
        );

        // Get input writer
        inputWriterRef.current = shell.input.getWriter();

        // Handle shell exit
        shell.exit.then((exitCode) => {
          terminalRef.current?.writeln('');
          terminalRef.current?.writeln(
            `\x1b[33mShell exited with code ${exitCode}\x1b[0m`,
          );
          shellProcessRef.current = null;
          inputWriterRef.current = null;
        });
      } catch (error) {
        console.error('Failed to start shell:', error);
        terminalRef.current?.writeln(
          `\x1b[31mFailed to start shell: ${error}\x1b[0m`,
        );
      }
    }, [webcontainer]);

    // Initialize terminal on mount
    useEffect(() => {
      initTerminal();
    }, [initTerminal]);

    // Start shell when WebContainer becomes available
    useEffect(() => {
      if (webcontainer && terminalRef.current && !shellProcessRef.current) {
        startShell();
      }
    }, [webcontainer, startShell]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        shellProcessRef.current?.kill();
        terminalRef.current?.dispose();
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className={`h-full w-full bg-[#1e1e1e] ${className}`}
        style={{ minHeight: '200px' }}
      />
    );
  },
);

export default WebContainerTerminal;
