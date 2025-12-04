'use client';

import { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { Loader2, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { CursorPresence, getUserColor } from './cursor-presence';
import { appConfig } from '@/config/app';

// Dynamically import Monaco Editor to avoid SSR issues
const Editor = dynamic(
  () => import('@monaco-editor/react').then(mod => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          <span className="text-sm text-gray-400">Loading editor...</span>
        </div>
      </div>
    )
  }
);

// All types defined inline to avoid importing monaco/yjs modules at SSR time
// Using 'any' to avoid type conflicts with dynamically imported modules
/* eslint-disable @typescript-eslint/no-explicit-any */
type MonacoEditorType = any;
type MonacoType = any;
type YDocType = any;
type YTextType = any;
type WebsocketProviderType = any;
type MonacoBindingType = any;
type AwarenessType = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

// Map file extensions to Monaco language identifiers
const getLanguageFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    md: 'markdown',
    markdown: 'markdown',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    go: 'go',
    rs: 'rust',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    dockerfile: 'dockerfile',
    txt: 'plaintext',
    gitignore: 'plaintext',
    env: 'plaintext',
    prisma: 'graphql',
  };
  return languageMap[ext || ''] || 'plaintext';
};

// Connection status type
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

interface CodeEditorProps {
  filename: string;
  fileId?: string;
  projectId?: string;
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
  className?: string;
  collaborative?: boolean;
  currentUser?: {
    id: string;
    name: string;
    email?: string;
  };
}

export function CodeEditor({
  filename,
  fileId,
  projectId,
  value,
  onChange,
  onSave,
  readOnly = false,
  className,
  collaborative = false,
  currentUser,
}: CodeEditorProps) {
  const editorRef = useRef<MonacoEditorType | null>(null);
  const monacoRef = useRef<MonacoType | null>(null);
  const yDocRef = useRef<YDocType | null>(null);
  const providerRef = useRef<WebsocketProviderType | null>(null);
  const bindingRef = useRef<MonacoBindingType | null>(null);
  const isInitialSyncRef = useRef(true);

  // Use refs to avoid re-triggering useEffect on every change
  // These hold the latest values without causing re-renders
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  // Keep refs updated with latest values
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [awareness, setAwareness] = useState<AwarenessType | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);

  const language = getLanguageFromFilename(filename);

  // Build WebSocket URL for y-websocket
  const wsUrl = useMemo(() => {
    // Convert HTTP URL to WebSocket URL and add /yjs path
    const baseUrl = appConfig.apiUrl.replace(/^http/, 'ws');
    return `${baseUrl}/yjs`;
  }, []);

  // Room name for this file
  const roomName = useMemo(() => {
    if (!projectId || !fileId) return null;
    return `file:${projectId}:${fileId}`;
  }, [projectId, fileId]);

  // Stable anonymous ID - only generated once per component instance
  const anonymousIdRef = useRef<string | null>(null);
  if (!anonymousIdRef.current) {
    anonymousIdRef.current = 'anonymous-' + Math.random().toString(36).slice(2);
  }

  // User info for awareness - stable reference
  const userInfo = useMemo(() => {
    if (!currentUser) {
      return {
        name: 'Anonymous',
        ...getUserColor(anonymousIdRef.current!),
      };
    }
    const colors = getUserColor(currentUser.id);
    return {
      name: currentUser.name || currentUser.email || 'Anonymous',
      ...colors,
    };
  }, [currentUser?.id, currentUser?.name, currentUser?.email]);

  // Set up Yjs collaboration when editor is ready and collaborative mode is enabled
  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Wait for editor to be ready (isEditorReady is set in handleEditorDidMount)
    if (!collaborative || !roomName || !isEditorReady || !editorRef.current || !monacoRef.current) {
      console.log('[Yjs] Waiting for editor...', { collaborative, roomName, isEditorReady });
      return;
    }

    console.log('[Yjs] Setting up collaboration for room:', roomName);

    const editorInstance = editorRef.current;
    const model = editorInstance.getModel();

    if (!model) {
      console.log('[Yjs] No model found');
      return;
    }

    let yDoc: YDocType | null = null;
    let provider: WebsocketProviderType | null = null;
    let binding: MonacoBindingType | null = null;
    let yText: YTextType | null = null;
    let observer: (() => void) | null = null;

    // Dynamically import Yjs libraries (browser-only)
    const setupYjs = async () => {
      try {
        // Dynamic imports to avoid SSR issues
        const [YModule, YWebsocketModule, YMonacoModule] = await Promise.all([
          import('yjs'),
          import('y-websocket'),
          import('y-monaco'),
        ]);

        const Y = YModule;
        const { WebsocketProvider: WSProvider } = YWebsocketModule;
        const { MonacoBinding: MBinding } = YMonacoModule;

        // Clean up previous instances
        if (bindingRef.current) {
          bindingRef.current.destroy();
          bindingRef.current = null;
        }
        if (providerRef.current) {
          providerRef.current.destroy();
          providerRef.current = null;
        }
        if (yDocRef.current) {
          yDocRef.current.destroy();
          yDocRef.current = null;
        }

        // Create new Yjs document
        yDoc = new Y.Doc();
        yDocRef.current = yDoc;

        // Get the shared text type
        yText = yDoc.getText('monaco');

        // Create WebSocket provider
        provider = new WSProvider(wsUrl, roomName!, yDoc, {
          connect: true,
          maxBackoffTime: 2500,
        });
        providerRef.current = provider;

        // Set up connection status tracking
        provider.on('status', (event: { status: string }) => {
          console.log('[Yjs] Connection status:', event.status);
          if (event.status === 'connected') {
            setConnectionStatus('connected');
            setSyncError(null);
          } else if (event.status === 'disconnected') {
            setConnectionStatus('disconnected');
          } else {
            setConnectionStatus('connecting');
          }
        });

        provider.on('connection-error', (event: Event) => {
          console.error('[Yjs] Connection error:', event);
          setSyncError('Connection failed. Retrying...');
        });

        provider.on('sync', (isSynced: boolean) => {
          if (isSynced && isInitialSyncRef.current && yText) {
            isInitialSyncRef.current = false;
            // If the doc is empty after sync, initialize with current value from ref
            const currentValue = valueRef.current;
            if (yText.length === 0 && currentValue && yDoc) {
              yDoc.transact(() => {
                yText!.insert(0, currentValue);
              });
            }
          }
        });

        // Set user info in awareness
        provider.awareness.setLocalStateField('user', userInfo);
        setAwareness(provider.awareness);

        // Create Monaco binding
        binding = new MBinding(
          yText,
          model,
          new Set([editorInstance]),
          provider.awareness
        );
        bindingRef.current = binding;

        // Listen for text changes to call onChange via ref
        observer = () => {
          if (yText) {
            const newValue = yText.toString();
            onChangeRef.current(newValue);
          }
        };
        yText.observe(observer);

        // Connect if not already connected
        if (!provider.wsconnected) {
          provider.connect();
        }

        setConnectionStatus('connecting');
      } catch (error) {
        console.error('[Yjs] Failed to setup collaboration:', error);
        setSyncError('Failed to initialize collaboration');
      }
    };

    setupYjs();

    // Cleanup on unmount or when dependencies change
    return () => {
      if (observer && yText) {
        yText.unobserve(observer);
      }

      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
      if (providerRef.current) {
        providerRef.current.disconnect();
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (yDocRef.current) {
        yDocRef.current.destroy();
        yDocRef.current = null;
      }

      isInitialSyncRef.current = true;
      setConnectionStatus('disconnected');
      setAwareness(null);
    };
  // Dependencies: Only include values that should trigger a full Yjs reconnection
  // value and onChange are accessed via refs to avoid reconnection on every keystroke
  }, [collaborative, roomName, wsUrl, userInfo, isEditorReady]);

  // Handle non-collaborative changes
  const handleEditorChange = useCallback(
    (newValue: string | undefined) => {
      // In collaborative mode, changes are handled by Yjs observer
      if (!collaborative) {
        onChange(newValue || '');
      }
    },
    [collaborative, onChange]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditorDidMount = useCallback(
    (editor: any, monaco: any) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Configure editor settings for optimal experience
      editor.updateOptions({
        fontSize: 14,
        fontFamily: '"JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace',
        fontLigatures: true,
        minimap: { enabled: true, maxColumn: 80 },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        formatOnPaste: true,
        formatOnType: true,
        tabSize: 2,
        wordWrap: 'on',
        lineNumbers: 'on',
        renderLineHighlight: 'all',
        bracketPairColorization: { enabled: true },
        automaticLayout: true,
        padding: { top: 10, bottom: 10 },
        scrollbar: {
          useShadows: false,
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
        suggest: {
          showWords: true,
          showSnippets: true,
        },
      });

      // Add keyboard shortcut for save
      if (onSave) {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          onSave();
        });
      }

      // Focus the editor
      editor.focus();

      // Mark editor as ready to trigger Yjs setup
      setIsEditorReady(true);
    },
    [onSave]
  );

  // Update language when filename changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, language);
      }
    }
  }, [filename, language]);

  // Connection status bar height (only shown in collaborative mode)
  const statusBarHeight = collaborative ? 32 : 0;

  // Render connection status indicator
  const renderConnectionStatus = () => {
    if (!collaborative) return null;

    const statusConfig = {
      connected: {
        icon: <Wifi className="w-3 h-3" />,
        text: 'Connected',
        className: 'connection-status connected',
      },
      connecting: {
        icon: <RefreshCw className="w-3 h-3 animate-spin" />,
        text: 'Connecting...',
        className: 'connection-status connecting',
      },
      disconnected: {
        icon: <WifiOff className="w-3 h-3" />,
        text: 'Disconnected',
        className: 'connection-status disconnected',
      },
    };

    const config = statusConfig[connectionStatus];

    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-[#252526] border-b border-[#3c3c3c]" style={{ height: statusBarHeight }}>
        <div className={config.className}>
          {config.icon}
          <span>{config.text}</span>
        </div>
        {syncError && (
          <span className="text-xs text-red-400">{syncError}</span>
        )}
      </div>
    );
  };

  return (
    <div className={`relative flex flex-col ${className || ''}`}>
      {/* Connection status bar */}
      {renderConnectionStatus()}

      {/* Cursor presence for collaborators */}
      {collaborative && awareness && (
        <CursorPresence awareness={awareness} />
      )}

      {/* Monaco Editor - takes remaining height */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          value={collaborative ? undefined : value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          loading={
            <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="text-sm text-gray-400">Loading editor...</span>
              </div>
            </div>
          }
          options={{
            readOnly,
            domReadOnly: readOnly,
          }}
        />
      </div>
    </div>
  );
}

export default CodeEditor;
