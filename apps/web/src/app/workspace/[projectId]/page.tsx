'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  Send,
  Circle,
  Plus,
  File,
  Folder,
  Trash2,
  Loader2,
  X,
  LayoutGrid,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AuthGuard } from '@/components/auth/auth-guard';
import { KanbanBoard } from '@/components/kanban';
import { CodeEditor } from '@/components/editor';
import { useAuthStore } from '@/store/auth.store';
import { useProjectStore } from '@/store/project.store';
import { useSocketStore } from '@/store/socket.store';
import { apiClient, ProjectFile } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Build tree structure from flat file list
function buildFileTree(files: ProjectFile[]): ProjectFile[] {
  const fileMap = new Map<string, ProjectFile>();
  const roots: ProjectFile[] = [];

  // Create a map of all files
  files.forEach((file) => {
    fileMap.set(file.id, { ...file, children: [] });
  });

  // Build the tree
  files.forEach((file) => {
    const node = fileMap.get(file.id)!;
    if (file.parentId && fileMap.has(file.parentId)) {
      const parent = fileMap.get(file.parentId)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort: folders first, then alphabetically
  const sortNodes = (nodes: ProjectFile[]): ProjectFile[] => {
    return nodes.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).map((node) => ({
      ...node,
      children: node.children ? sortNodes(node.children) : undefined,
    }));
  };

  return sortNodes(roots);
}

interface FileTreeItemProps {
  file: ProjectFile;
  depth?: number;
  selectedFileId: string | null;
  onSelect: (file: ProjectFile) => void;
  onDelete: (file: ProjectFile) => void;
}

function FileTreeItem({
  file,
  depth = 0,
  selectedFileId,
  onSelect,
  onDelete,
}: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleClick = () => {
    if (file.isFolder) {
      setIsOpen(!isOpen);
    } else {
      onSelect(file);
    }
  };

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-2 px-2 py-1 text-sm hover:bg-accent rounded cursor-pointer',
          depth > 0 && 'ml-4',
          selectedFileId === file.id && 'bg-accent'
        )}
        onClick={handleClick}
      >
        {file.isFolder ? (
          <FolderTree className="h-4 w-4 text-yellow-500 shrink-0" />
        ) : (
          <FileCode className="h-4 w-4 text-blue-500 shrink-0" />
        )}
        <span className="truncate flex-1">{file.name}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(file);
          }}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      </div>
      {file.isFolder && isOpen && file.children && (
        <div>
          {file.children.map((child) => (
            <FileTreeItem
              key={child.id}
              file={child}
              depth={depth + 1}
              selectedFileId={selectedFileId}
              onSelect={onSelect}
              onDelete={onDelete}
            />
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
  const { toast } = useToast();

  const { user } = useAuthStore();
  const { currentProject, setCurrentProject } = useProjectStore();
  const {
    isConnected,
    presentUsers,
    messages,
    connect,
    joinWorkspace,
    leaveWorkspace,
    sendMessage,
  } = useSocketStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'files' | 'board' | 'chat' | 'users'>('files');
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // File state
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [fileTree, setFileTree] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isFilesLoading, setIsFilesLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Dialog state
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false);
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

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

  // Fetch project files
  const fetchFiles = useCallback(async () => {
    if (!projectId) return;

    try {
      setIsFilesLoading(true);
      let projectFiles = await apiClient.files.getAll(projectId);

      // If no files exist, initialize with starter files
      if (projectFiles.length === 0) {
        projectFiles = await apiClient.files.initialize(projectId);
        toast({
          title: 'Project initialized',
          description: 'Starter files have been created for your project.',
        });
      }

      setFiles(projectFiles);
      setFileTree(buildFileTree(projectFiles));
    } catch (err) {
      console.error('Failed to fetch files:', err);
      toast({
        title: 'Error',
        description: 'Failed to load project files.',
        variant: 'destructive',
      });
    } finally {
      setIsFilesLoading(false);
    }
  }, [projectId, toast]);

  useEffect(() => {
    if (currentProject) {
      fetchFiles();
    }
  }, [currentProject, fetchFiles]);

  // Connect to WebSocket and join workspace
  useEffect(() => {
    if (currentProject && projectId) {
      connect();
      joinWorkspace(projectId);
    }

    return () => {
      leaveWorkspace();
    };
  }, [currentProject, projectId, connect, joinWorkspace, leaveWorkspace]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle file selection
  const handleFileSelect = async (file: ProjectFile) => {
    if (file.isFolder) return;

    // Check for unsaved changes
    if (hasUnsavedChanges && selectedFile) {
      const confirm = window.confirm('You have unsaved changes. Do you want to discard them?');
      if (!confirm) return;
    }

    setSelectedFile(file);
    setFileContent(file.content || '');
    setHasUnsavedChanges(false);
  };

  // Handle content change (for Monaco Editor)
  const handleContentChange = useCallback((value: string) => {
    setFileContent(value);
    setHasUnsavedChanges(true);
  }, []);

  // Save file
  const handleSave = useCallback(async () => {
    if (!selectedFile || !projectId) return;

    try {
      setIsSaving(true);
      await apiClient.files.update(projectId, selectedFile.id, {
        content: fileContent,
      });
      setHasUnsavedChanges(false);
      toast({
        title: 'Saved',
        description: `${selectedFile.name} has been saved.`,
      });

      // Update local file state
      setFiles((prev) =>
        prev.map((f) =>
          f.id === selectedFile.id ? { ...f, content: fileContent } : f
        )
      );
    } catch (err) {
      console.error('Failed to save file:', err);
      toast({
        title: 'Error',
        description: 'Failed to save file.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedFile, projectId, fileContent, toast]);

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (selectedFile && hasUnsavedChanges) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFile, hasUnsavedChanges, handleSave]);

  // Create new file
  const handleCreateFile = async () => {
    if (!newItemName.trim() || !projectId) return;

    try {
      setIsCreating(true);
      const newFile = await apiClient.files.create(projectId, {
        path: newItemName,
        name: newItemName,
        isFolder: false,
        content: '',
        mimeType: getMimeType(newItemName),
      });

      setFiles((prev) => [...prev, newFile]);
      setFileTree(buildFileTree([...files, newFile]));
      setIsNewFileDialogOpen(false);
      setNewItemName('');

      // Select the new file
      handleFileSelect(newFile);

      toast({
        title: 'File created',
        description: `${newFile.name} has been created.`,
      });
    } catch (err) {
      console.error('Failed to create file:', err);
      toast({
        title: 'Error',
        description: 'Failed to create file.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newItemName.trim() || !projectId) return;

    try {
      setIsCreating(true);
      const newFolder = await apiClient.files.create(projectId, {
        path: newItemName,
        name: newItemName,
        isFolder: true,
      });

      setFiles((prev) => [...prev, newFolder]);
      setFileTree(buildFileTree([...files, newFolder]));
      setIsNewFolderDialogOpen(false);
      setNewItemName('');

      toast({
        title: 'Folder created',
        description: `${newFolder.name} has been created.`,
      });
    } catch (err) {
      console.error('Failed to create folder:', err);
      toast({
        title: 'Error',
        description: 'Failed to create folder.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Delete file/folder
  const handleDelete = async (file: ProjectFile) => {
    const confirm = window.confirm(
      `Are you sure you want to delete "${file.name}"?${
        file.isFolder ? ' This will also delete all files inside.' : ''
      }`
    );
    if (!confirm) return;

    try {
      await apiClient.files.delete(projectId, file.id);

      // Remove from local state
      const newFiles = files.filter((f) => f.id !== file.id && f.parentId !== file.id);
      setFiles(newFiles);
      setFileTree(buildFileTree(newFiles));

      // Clear selection if deleted file was selected
      if (selectedFile?.id === file.id) {
        setSelectedFile(null);
        setFileContent('');
        setHasUnsavedChanges(false);
      }

      toast({
        title: 'Deleted',
        description: `${file.name} has been deleted.`,
      });
    } catch (err) {
      console.error('Failed to delete file:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete file.',
        variant: 'destructive',
      });
    }
  };

  // Get MIME type from filename
  const getMimeType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      ts: 'text/typescript',
      tsx: 'text/typescript',
      js: 'text/javascript',
      jsx: 'text/javascript',
      json: 'application/json',
      html: 'text/html',
      css: 'text/css',
      md: 'text/markdown',
      txt: 'text/plain',
    };
    return mimeTypes[ext || ''] || 'text/plain';
  };

  // Chat handlers
  const handleSendMessage = () => {
    if (chatInput.trim()) {
      sendMessage(chatInput);
      setChatInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="flex h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              {/* Connection Status */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Circle
                      className={cn(
                        'h-2 w-2 fill-current',
                        isConnected ? 'text-green-500' : 'text-red-500'
                      )}
                    />
                    <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {isConnected
                    ? `${presentUsers.length} user(s) online`
                    : 'Connecting to workspace...'}
                </TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6" />

              {/* Online Users */}
              <div className="flex -space-x-2 mr-2">
                {presentUsers.length > 0 ? (
                  presentUsers.slice(0, 5).map((pUser) => (
                    <Tooltip key={pUser.id}>
                      <TooltipTrigger asChild>
                        <Avatar className="h-7 w-7 border-2 border-background">
                          <AvatarImage src={pUser.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {pUser.firstName?.[0]?.toUpperCase() ||
                              pUser.email?.[0]?.toUpperCase() ||
                              'U'}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        {pUser.firstName || pUser.email}
                      </TooltipContent>
                    </Tooltip>
                  ))
                ) : (
                  <Avatar className="h-7 w-7 border-2 border-background">
                    <AvatarFallback className="text-xs">
                      {user?.name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
                {presentUsers.length > 5 && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                    +{presentUsers.length - 5}
                  </div>
                )}
              </div>

              <Separator orientation="vertical" className="h-6" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSave}
                    disabled={!selectedFile || !hasUnsavedChanges || isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className={cn('h-4 w-4', hasUnsavedChanges && 'text-yellow-500')} />
                    )}
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
                  <DropdownMenuItem asChild>
                    <Link href={`/workspace/${projectId}/settings`}>
                      <Settings className="mr-2 h-4 w-4" />
                      Project Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={fetchFiles}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Files
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
                      variant={activeTab === 'board' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => setActiveTab('board')}
                    >
                      <LayoutGrid className="h-4 w-4" />
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
                      <div className="flex items-center justify-between px-2 mb-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Files
                        </h3>
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setIsNewFileDialogOpen(true)}
                              >
                                <File className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>New File</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setIsNewFolderDialogOpen(true)}
                              >
                                <Folder className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>New Folder</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {isFilesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : fileTree.length === 0 ? (
                        <div className="text-center py-8">
                          <FolderTree className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">No files yet</p>
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() => setIsNewFileDialogOpen(true)}
                          >
                            Create your first file
                          </Button>
                        </div>
                      ) : (
                        fileTree.map((file) => (
                          <FileTreeItem
                            key={file.id}
                            file={file}
                            selectedFileId={selectedFile?.id || null}
                            onSelect={handleFileSelect}
                            onDelete={handleDelete}
                          />
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'chat' && (
                    <div className="flex flex-col h-full">
                      <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Team Chat
                      </h3>
                      {/* Chat Messages */}
                      <div
                        ref={chatContainerRef}
                        className="flex-1 overflow-auto space-y-2 px-2"
                      >
                        {messages.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center text-center p-4">
                            <div>
                              <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">
                                No messages yet. Start the conversation!
                              </p>
                            </div>
                          </div>
                        ) : (
                          messages.map((msg) => (
                            <div
                              key={msg.id}
                              className={cn(
                                'p-2 rounded-lg text-sm',
                                msg.userId === user?.id
                                  ? 'bg-primary text-primary-foreground ml-4'
                                  : 'bg-muted mr-4'
                              )}
                            >
                              <div className="font-medium text-xs opacity-70 mb-1">
                                {msg.userName}
                              </div>
                              <div>{msg.content}</div>
                            </div>
                          ))
                        )}
                      </div>
                      {/* Chat Input */}
                      <div className="p-2 border-t">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Type a message..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            className="text-sm"
                            disabled={!isConnected}
                          />
                          <Button
                            size="icon"
                            onClick={handleSendMessage}
                            disabled={!isConnected || !chatInput.trim()}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'board' && (
                    <div>
                      <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Kanban Board
                      </h3>
                      <p className="px-2 text-xs text-muted-foreground">
                        Manage tasks and track progress using the board view in the main area.
                      </p>
                    </div>
                  )}

                  {activeTab === 'users' && (
                    <div>
                      <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Online Now ({presentUsers.length})
                      </h3>
                      <div className="space-y-2 mb-4">
                        {presentUsers.map((pUser) => (
                          <div
                            key={pUser.id}
                            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent"
                          >
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={pUser.image || undefined} />
                              <AvatarFallback className="text-xs">
                                {pUser.firstName?.[0]?.toUpperCase() ||
                                  pUser.email?.[0]?.toUpperCase() ||
                                  'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm truncate">
                                {pUser.firstName
                                  ? `${pUser.firstName} ${pUser.lastName || ''}`
                                  : pUser.email}
                              </p>
                              <p className="text-xs text-muted-foreground">Online</p>
                            </div>
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                          </div>
                        ))}
                        {presentUsers.length === 0 && (
                          <p className="text-xs text-muted-foreground px-2">
                            {isConnected ? 'No other users online' : 'Connecting...'}
                          </p>
                        )}
                      </div>
                      <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Team Members
                      </h3>
                      <div className="space-y-2">
                        {currentProject.members?.map((member) => {
                          const isOnline = presentUsers.some((p) => p.id === member.userId);
                          const displayName = member.user?.firstName
                            ? `${member.user.firstName} ${member.user.lastName || ''}`.trim()
                            : member.user?.username || member.user?.email || 'Unknown';
                          return (
                            <div
                              key={member.id}
                              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent"
                            >
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={member.user?.image || undefined} />
                                <AvatarFallback className="text-xs">
                                  {member.user?.firstName?.[0]?.toUpperCase() ||
                                    member.user?.email?.[0]?.toUpperCase() ||
                                    'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm truncate">{displayName}</p>
                                <p className="text-xs text-muted-foreground">{member.role}</p>
                              </div>
                              <div
                                className={cn(
                                  'h-2 w-2 rounded-full',
                                  isOnline ? 'bg-green-500' : 'bg-gray-400'
                                )}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {activeTab === 'board' ? (
                /* Kanban Board View */
                <KanbanBoard
                  projectId={projectId}
                  members={currentProject.members || []}
                />
              ) : (
                /* Editor View */
                <>
                  {/* Editor Tabs */}
                  <div className="flex h-9 items-center border-b bg-muted/30 px-2 gap-1">
                    {selectedFile ? (
                      <div className="flex items-center gap-1 px-3 py-1 bg-background rounded-t border border-b-0 text-sm">
                        <FileCode className="h-3.5 w-3.5 text-blue-500" />
                        <span>{selectedFile.name}</span>
                        {hasUnsavedChanges && <span className="text-yellow-500">●</span>}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-1"
                          onClick={() => {
                            setSelectedFile(null);
                            setFileContent('');
                            setHasUnsavedChanges(false);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground px-3">No file selected</span>
                    )}
                  </div>

                  {/* Editor Content */}
                  <div className="flex-1 overflow-hidden bg-[#1e1e1e]">
                    {selectedFile ? (
                      <CodeEditor
                        filename={selectedFile.name}
                        value={fileContent}
                        onChange={handleContentChange}
                        onSave={handleSave}
                        className="h-full"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Code2 className="h-16 w-16 mb-4 opacity-50" />
                        <p className="text-lg font-medium">Welcome to {currentProject.name}</p>
                        <p className="text-sm mt-2">Select a file from the sidebar to start editing</p>
                        <div className="flex gap-2 mt-4">
                          <Button variant="outline" size="sm" onClick={() => setIsNewFileDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            New File
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Status Bar */}
              <div className="flex h-6 items-center justify-between border-t bg-muted/50 px-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  {selectedFile && (
                    <>
                      <span>{selectedFile.mimeType || 'text/plain'}</span>
                      <span>UTF-8</span>
                      <span>LF</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {selectedFile && <span>{fileContent.split('\n').length} lines</span>}
                  <span className="flex items-center gap-1">
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full',
                        isConnected ? 'bg-green-500' : 'bg-red-500'
                      )}
                    />
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* New File Dialog */}
        <Dialog open={isNewFileDialogOpen} onOpenChange={setIsNewFileDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New File</DialogTitle>
              <DialogDescription>
                Enter a name for your new file. Include the extension (e.g., index.ts)
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="filename.ts"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFile()}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewFileDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFile} disabled={isCreating || !newItemName.trim()}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Folder Dialog */}
        <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
              <DialogDescription>
                Enter a name for your new folder.
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="folder-name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewFolderDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFolder} disabled={isCreating || !newItemName.trim()}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </AuthGuard>
  );
}
