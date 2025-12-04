'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import React from 'react';

// Loading component for the editor
const EditorLoading = () =>
  React.createElement(
    'div',
    { className: 'flex items-center justify-center h-full bg-[#1e1e1e]' },
    React.createElement(
      'div',
      { className: 'flex flex-col items-center gap-2' },
      React.createElement(Loader2, { className: 'h-6 w-6 animate-spin text-gray-400' }),
      React.createElement('span', { className: 'text-sm text-gray-400' }, 'Loading editor...')
    )
  );

// Dynamically import the CodeEditor with SSR disabled
// This is necessary because Monaco Editor and y-monaco have window/document references
export const CodeEditor = dynamic(
  () => import('./code-editor').then((mod) => mod.CodeEditor),
  {
    ssr: false,
    loading: EditorLoading,
  }
);

// Export EditorTabs component
export { EditorTabs, type EditorTab } from './EditorTabs';
