'use client';

import { useRef, useCallback, useEffect, useMemo } from 'react';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { Loader2 } from 'lucide-react';
import { useFileCollabStore, type RemoteCursor } from '@/store/file-collab.store';

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
    prisma: 'graphql', // Close approximation
  };
  return languageMap[ext || ''] || 'plaintext';
};

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
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const isApplyingRemoteEdit = useRef(false);
  const cursorThrottleRef = useRef<NodeJS.Timeout | null>(null);

  const {
    remoteCursors,
    pendingEdits,
    clearPendingEdits,
    broadcastCursor,
    broadcastEdit,
    incrementVersion,
    version,
    joinFileRoom,
    leaveFileRoom,
  } = useFileCollabStore();

  const language = getLanguageFromFilename(filename);

  // Convert Map to array for rendering
  const remoteCursorArray = useMemo(() => {
    return Array.from(remoteCursors.values());
  }, [remoteCursors]);

  // Join/leave file room for collaboration
  useEffect(() => {
    if (collaborative && projectId && fileId) {
      joinFileRoom(projectId, fileId);
      return () => {
        leaveFileRoom();
      };
    }
  }, [collaborative, projectId, fileId, joinFileRoom, leaveFileRoom]);

  // Apply remote edits
  useEffect(() => {
    if (pendingEdits.length > 0 && editorRef.current) {
      const editor = editorRef.current;
      const model = editor.getModel();

      if (model) {
        isApplyingRemoteEdit.current = true;

        pendingEdits.forEach((edit) => {
          const operations = edit.changes.map((change) => ({
            range: {
              startLineNumber: change.range.startLineNumber,
              startColumn: change.range.startColumn,
              endLineNumber: change.range.endLineNumber,
              endColumn: change.range.endColumn,
            },
            text: change.text,
          }));

          model.pushEditOperations([], operations, () => null);
        });

        isApplyingRemoteEdit.current = false;
        clearPendingEdits();
      }
    }
  }, [pendingEdits, clearPendingEdits]);

  // Update remote cursor decorations
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    // Create decorations for remote cursors
    const newDecorations = remoteCursorArray.flatMap((cursor: RemoteCursor) => {
      const decorations: editor.IModelDeltaDecoration[] = [];

      // Cursor line decoration (colored bar)
      decorations.push({
        range: new monaco.Range(
          cursor.cursor.lineNumber,
          cursor.cursor.column,
          cursor.cursor.lineNumber,
          cursor.cursor.column
        ),
        options: {
          className: `remote-cursor-${cursor.userId.slice(0, 8)}`,
          stickiness:
            monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          beforeContentClassName: 'remote-cursor-decoration',
          after: {
            content: ` ${cursor.userName}`,
            inlineClassName: 'remote-cursor-label',
          },
        },
      });

      // Selection highlight if present
      if (cursor.selection) {
        decorations.push({
          range: new monaco.Range(
            cursor.selection.startLineNumber,
            cursor.selection.startColumn,
            cursor.selection.endLineNumber,
            cursor.selection.endColumn
          ),
          options: {
            className: `remote-selection-${cursor.userId.slice(0, 8)}`,
            stickiness:
              monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
          },
        });
      }

      return decorations;
    });

    // Update decorations
    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );

    // Inject dynamic CSS for cursor colors
    let styleEl = document.getElementById('remote-cursor-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'remote-cursor-styles';
      document.head.appendChild(styleEl);
    }

    const styles = remoteCursorArray
      .map(
        (cursor: RemoteCursor) => `
      .remote-cursor-${cursor.userId.slice(0, 8)}::before {
        content: '';
        position: absolute;
        width: 2px;
        height: 18px;
        background-color: ${cursor.userColor};
        margin-left: -1px;
        animation: cursor-blink 1s ease-in-out infinite;
      }
      .remote-selection-${cursor.userId.slice(0, 8)} {
        background-color: ${cursor.userColor}33;
      }
      .remote-cursor-label {
        font-size: 10px;
        color: white;
        background-color: ${cursor.userColor};
        padding: 0 4px;
        border-radius: 2px;
        margin-left: 4px;
        white-space: nowrap;
      }
      @keyframes cursor-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
    `
      )
      .join('\n');

    styleEl.textContent = styles;
  }, [remoteCursorArray]);

  const handleEditorDidMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Configure editor settings
      editor.updateOptions({
        fontSize: 14,
        fontFamily:
          '"JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace',
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
      });

      // Add save keyboard shortcut
      if (onSave) {
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          onSave();
        });
      }

      // Track cursor position for collaboration
      if (collaborative) {
        editor.onDidChangeCursorPosition((e) => {
          // Throttle cursor updates
          if (cursorThrottleRef.current) {
            clearTimeout(cursorThrottleRef.current);
          }

          cursorThrottleRef.current = setTimeout(() => {
            const selection = editor.getSelection();
            broadcastCursor(
              { lineNumber: e.position.lineNumber, column: e.position.column },
              selection && !selection.isEmpty()
                ? {
                    startLineNumber: selection.startLineNumber,
                    startColumn: selection.startColumn,
                    endLineNumber: selection.endLineNumber,
                    endColumn: selection.endColumn,
                  }
                : undefined
            );
          }, 50);
        });

        // Track content changes for collaboration
        editor.onDidChangeModelContent((e) => {
          // Don't broadcast if this was a remote edit
          if (isApplyingRemoteEdit.current) return;

          const changes = e.changes.map((change) => ({
            range: {
              startLineNumber: change.range.startLineNumber,
              startColumn: change.range.startColumn,
              endLineNumber: change.range.endLineNumber,
              endColumn: change.range.endColumn,
            },
            text: change.text,
          }));

          broadcastEdit(changes, version);
          incrementVersion();
        });
      }

      // Focus the editor
      editor.focus();
    },
    [onSave, collaborative, broadcastCursor, broadcastEdit, version, incrementVersion]
  );

  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      // Only call onChange if not applying remote edit
      if (!isApplyingRemoteEdit.current) {
        onChange(value || '');
      }
    },
    [onChange]
  );

  // Update editor when filename changes (for language detection)
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        monacoRef.current.editor.setModelLanguage(model, language);
      }
    }
  }, [filename, language]);

  // Cleanup cursor throttle on unmount
  useEffect(() => {
    return () => {
      if (cursorThrottleRef.current) {
        clearTimeout(cursorThrottleRef.current);
      }
    };
  }, []);

  return (
    <div className={className}>
      {/* Collaborators indicator */}
      {collaborative && remoteCursorArray.length > 0 && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          {remoteCursorArray.slice(0, 3).map((cursor: RemoteCursor) => (
            <div
              key={cursor.userId}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white"
              style={{ backgroundColor: cursor.userColor }}
              title={cursor.userName}
            >
              <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" />
              {cursor.userName}
            </div>
          ))}
          {remoteCursorArray.length > 3 && (
            <div className="px-2 py-1 rounded-full text-xs bg-gray-600 text-white">
              +{remoteCursorArray.length - 3}
            </div>
          )}
        </div>
      )}

      <Editor
        height="100%"
        language={language}
        value={value}
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
  );
}
