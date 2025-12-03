'use client';

import { useState } from 'react';
import {
  BookOpen,
  Code,
  Users,
  FolderTree,
  Keyboard,
  Zap,
  Shield,
  MessageSquare,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface DocSection {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

const docSections: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Zap,
    content: (
      <div className="space-y-4">
        <p>
          Welcome to CollabDev+! This guide will help you get started with our collaborative
          development platform.
        </p>
        <div className="space-y-3">
          <h4 className="font-medium">Quick Start</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Create a new project from the Projects page</li>
            <li>Open your project workspace</li>
            <li>Create files and folders using the file tree</li>
            <li>Start coding with real-time collaboration</li>
            <li>Invite team members to collaborate</li>
          </ol>
        </div>
      </div>
    ),
  },
  {
    id: 'projects',
    title: 'Managing Projects',
    icon: FolderTree,
    content: (
      <div className="space-y-4">
        <p>Projects are the core organizational unit in CollabDev+.</p>
        <div className="space-y-3">
          <h4 className="font-medium">Creating a Project</h4>
          <p className="text-sm text-muted-foreground">
            Click the &quot;New Project&quot; button on the Projects page. Give your project a name
            and optional description.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="font-medium">Project Settings</h4>
          <p className="text-sm text-muted-foreground">
            Access project settings from the workspace sidebar to manage project details,
            visibility, and danger zone operations like project deletion.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="font-medium">File Structure</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Create files and folders from the workspace file tree</li>
            <li>Organize code with nested folder structures</li>
            <li>Click on any file to open it in the editor</li>
            <li>Right-click for context menu options</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: 'editor',
    title: 'Code Editor',
    icon: Code,
    content: (
      <div className="space-y-4">
        <p>
          The CollabDev+ editor provides a powerful coding environment with real-time
          collaboration features.
        </p>
        <div className="space-y-3">
          <h4 className="font-medium">Features</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Syntax highlighting for 50+ languages</li>
            <li>Real-time collaborative editing</li>
            <li>Auto-save functionality</li>
            <li>Multiple file tabs</li>
            <li>Line numbers and code folding</li>
          </ul>
        </div>
        <div className="space-y-3">
          <h4 className="font-medium">Saving Files</h4>
          <p className="text-sm text-muted-foreground">
            Files are saved automatically as you type. You can also manually save using{' '}
            <Badge variant="outline" className="font-mono">Ctrl+S</Badge> (or{' '}
            <Badge variant="outline" className="font-mono">Cmd+S</Badge> on Mac).
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    icon: Keyboard,
    content: (
      <div className="space-y-4">
        <p>Speed up your workflow with these keyboard shortcuts:</p>
        <div className="grid gap-2">
          {[
            { keys: 'Ctrl/Cmd + S', action: 'Save current file' },
            { keys: 'Ctrl/Cmd + N', action: 'Create new file' },
            { keys: 'Ctrl/Cmd + P', action: 'Quick file search' },
            { keys: 'Ctrl/Cmd + /', action: 'Toggle comment' },
            { keys: 'Ctrl/Cmd + Z', action: 'Undo' },
            { keys: 'Ctrl/Cmd + Shift + Z', action: 'Redo' },
            { keys: 'Ctrl/Cmd + F', action: 'Find in file' },
            { keys: 'Ctrl/Cmd + H', action: 'Find and replace' },
          ].map(({ keys, action }) => (
            <div key={keys} className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">{action}</span>
              <Badge variant="secondary" className="font-mono text-xs">
                {keys}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 'collaboration',
    title: 'Real-time Collaboration',
    icon: Users,
    content: (
      <div className="space-y-4">
        <p>
          CollabDev+ enables real-time collaboration, allowing multiple team members to work
          together seamlessly.
        </p>
        <div className="space-y-3">
          <h4 className="font-medium">Live Editing</h4>
          <p className="text-sm text-muted-foreground">
            See changes from other team members instantly as they type. Each collaborator has a
            unique cursor color for easy identification.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="font-medium">Presence Indicators</h4>
          <p className="text-sm text-muted-foreground">
            The collaboration panel shows who&apos;s currently online and which files they&apos;re
            working on.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="font-medium">Inviting Team Members</h4>
          <p className="text-sm text-muted-foreground">
            Invite collaborators from the project settings. You can assign different roles:
            Owner, Maintainer, or Member.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'chat',
    title: 'Team Chat',
    icon: MessageSquare,
    content: (
      <div className="space-y-4">
        <p>
          Built-in team chat keeps communication centralized within your workspace.
        </p>
        <div className="space-y-3">
          <h4 className="font-medium">Features</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Real-time messaging</li>
            <li>Code snippet sharing</li>
            <li>@mentions for team members</li>
            <li>Message history preserved</li>
          </ul>
        </div>
        <div className="space-y-3">
          <h4 className="font-medium">Usage</h4>
          <p className="text-sm text-muted-foreground">
            Access the chat panel from the right sidebar in your workspace. Messages are
            visible to all project members.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'security',
    title: 'Security',
    icon: Shield,
    content: (
      <div className="space-y-4">
        <p>
          We take security seriously. Here&apos;s how we protect your code and data.
        </p>
        <div className="space-y-3">
          <h4 className="font-medium">Authentication</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Secure email/password authentication</li>
            <li>Session management with automatic expiry</li>
            <li>Password hashing using industry standards</li>
          </ul>
        </div>
        <div className="space-y-3">
          <h4 className="font-medium">Data Protection</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>HTTPS encryption for all data in transit</li>
            <li>Encrypted database storage</li>
            <li>Regular security audits</li>
            <li>Role-based access control</li>
          </ul>
        </div>
      </div>
    ),
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-6">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6" />
            <div>
              <h1 className="text-xl font-semibold">Documentation</h1>
              <p className="text-sm text-muted-foreground">
                Learn how to use CollabDev+
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r bg-muted/30 overflow-auto">
          <nav className="p-4 space-y-1">
            {docSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-left',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{section.title}</span>
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                </button>
              );
            })}
          </nav>

          <Separator className="my-4" />

          <div className="px-4 pb-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Resources
            </h4>
            <div className="space-y-1">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="#"
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                API Reference
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl">
            {docSections.map((section) => {
              if (section.id !== activeSection) return null;
              const Icon = section.icon;

              return (
                <Card key={section.id}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <CardTitle>{section.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>{section.content}</CardContent>
                </Card>
              );
            })}

            {/* Help Section */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Need Help?</CardTitle>
                <CardDescription>
                  Can&apos;t find what you&apos;re looking for?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Check out our community resources or reach out to our support team.
                  We&apos;re here to help you make the most of CollabDev+.
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
