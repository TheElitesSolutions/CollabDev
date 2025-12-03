'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Code2,
  FileCode,
  FolderTree,
  MessageSquare,
  Settings,
  Users,
  Video,
  PanelLeftClose,
  PanelLeft,
  Save,
  Play,
  RefreshCw,
  MoreVertical,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuthStore } from '@/store/auth.store';
import { useProjectStore, type Project } from '@/store/project.store';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// Mock file tree structure
const mockFileTree = [
  {
    name: 'src',
    type: 'folder' as const,
    children: [
      { name: 'index.ts', type: 'file' as const },
      { name: 'App.tsx', type: 'file' as const },
      {
        name: 'components',
        type: 'folder' as const,
        children: [
          { name: 'Button.tsx', type: 'file' as const },
          { name: 'Input.tsx', type: 'file' as const },
        ],
      },
    ],
  },
  { name: 'package.json', type: 'file' as const },
  { name: 'README.md', type: 'file' as const },
];

type FileItem = {
  name: string;
  type: 'file' | 'folder';
  children?: FileItem[];
};

function FileTreeItem({ item, depth = 0 }: { item: FileItem; depth?: number }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div>
      <button
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1 text-sm hover:bg-accent rounded text-left',
          depth > 0 && 'ml-4'
        )}
        onClick={() => item.type === 'folder' && setIsOpen(!isOpen)}
      >
        {item.type === 'folder' ? (
          <FolderTree className="h-4 w-4 text-yellow-500" />
        ) : (
          <FileCode className="h-4 w-4 text-blue-500" />
        )}
        <span className="truncate">{item.name}</span>
      </button>
      {item.type === 'folder' && isOpen && item.children && (
        <div className="ml-2">
          {item.children.map((child, i) => (
            <FileTreeItem key={i} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const { user } = useAuthStore();
  const { currentProject, setCurrentProject } = useProjectStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'files' | 'chat' | 'users'>('files');

  // Fetch project details
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const project = await apiClient.projects.getById(projectId);
        setCurrentProject(project);
      } catch (err) {
        console.error('Failed to fetch project:', err);
        setError('Project not found or you do not have access.');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    }

    return () => {
      setCurrentProject(null);
    };
  }, [projectId, setCurrentProject]);

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="flex h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading workspace...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !currentProject) {
    return (
      <AuthGuard>
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <Code2 className="h-16 w-16 text-muted-foreground" />
          <h1 className="text-2xl font-semibold">Project Not Found</h1>
          <p className="text-muted-foreground">{error || 'The project you are looking for does not exist.'}</p>
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <TooltipProvider>
        <div className="flex h-screen flex-col overflow-hidden bg-background">
          {/* Top Bar */}
          <header className="flex h-12 items-center justify-between border-b px-4">
            <div className="flex items-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard">
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Back to Dashboard</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6" />

              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                  <Code2 className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-semibold">{currentProject.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {currentProject.members?.length || 0} members
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Online Users */}
              <div className="flex -space-x-2 mr-2">
                <Avatar className="h-7 w-7 border-2 border-background">
                  <AvatarFallback className="text-xs">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>

              <Separator orientation="vertical" className="h-6" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save (Ctrl+S)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Play className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Run</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Video className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Start Video Call</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Project Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div
              className={cn(
                'flex flex-col border-r bg-muted/30 transition-all duration-300',
                isSidebarOpen ? 'w-64' : 'w-12'
              )}
            >
              {/* Sidebar Toggle & Tabs */}
              <div className="flex h-10 items-center justify-between border-b px-2">
                {isSidebarOpen && (
                  <div className="flex gap-1">
                    <Button
                      variant={activeTab === 'files' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setActiveTab('files')}
                    >
                      <FolderTree className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={activeTab === 'chat' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setActiveTab('chat')}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={activeTab === 'users' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setActiveTab('users')}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                >
                  {isSidebarOpen ? (
                    <PanelLeftClose className="h-4 w-4" />
                  ) : (
                    <PanelLeft className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Sidebar Content */}
              {isSidebarOpen && (
                <div className="flex-1 overflow-auto p-2">
                  {activeTab === 'files' && (
                    <div className="space-y-1">
                      <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Files
                      </h3>
                      {mockFileTree.map((item, i) => (
                        <FileTreeItem key={i} item={item} />
                      ))}
                    </div>
                  )}

                  {activeTab === 'chat' && (
                    <div className="flex flex-col h-full">
                      <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Team Chat
                      </h3>
                      <div className="flex-1 flex items-center justify-center text-center p-4">
                        <div>
                          <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Chat feature coming soon
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'users' && (
                    <div>
                      <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Team Members
                      </h3>
                      <div className="space-y-2">
                        {currentProject.members?.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent"
                          >
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-xs">
                                {member.user?.name?.[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">{member.user?.name}</p>
                              <p className="text-xs text-muted-foreground">{member.role}</p>
                            </div>
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Editor Tabs */}
              <div className="flex h-9 items-center border-b bg-muted/30 px-2 gap-1">
                <div className="flex items-center gap-1 px-3 py-1 bg-background rounded-t border border-b-0 text-sm">
                  <FileCode className="h-3.5 w-3.5 text-blue-500" />
                  <span>index.ts</span>
                </div>
              </div>

              {/* Editor Content - Placeholder */}
              <div className="flex-1 overflow-auto bg-[#1e1e1e] p-4 font-mono text-sm">
                <pre className="text-gray-300">
                  <code>
{`// Welcome to CollabDev+ Workspace
// Project: ${currentProject.name}

// This is a placeholder for the code editor.
// The full Monaco Editor integration is coming soon!

import { useState, useEffect } from 'react';

export function App() {
  const [message, setMessage] = useState('Hello, CollabDev+!');

  useEffect(() => {
    console.log('Welcome to collaborative development!');
  }, []);

  return (
    <div className="app">
      <h1>{message}</h1>
      <p>Start building something amazing together!</p>
    </div>
  );
}

export default App;`}
                  </code>
                </pre>
              </div>

              {/* Status Bar */}
              <div className="flex h-6 items-center justify-between border-t bg-muted/50 px-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>TypeScript</span>
                  <span>UTF-8</span>
                  <span>LF</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>Ln 1, Col 1</span>
                  <span className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    Connected
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </AuthGuard>
  );
}
