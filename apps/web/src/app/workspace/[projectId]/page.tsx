'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Code2,
  FileCode,
  Settings,
  Save,
  Play,
  RefreshCw,
  MoreVertical,
  Circle,
  Loader2,
  X,
  LayoutGrid,
  Palette,
  Terminal,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
import { Input } from '@/components/ui/input';
import { AuthGuard } from '@/components/auth/auth-guard';
import { KanbanBoard } from '@/components/kanban';
import { CodeEditor, EditorTabs, EditorTab } from '@/components/editor';
import { VideoCall, IncomingCallDialog } from '@/components/video-call';
import { WorkspaceLayout, LeftSidebar, RightSidebar } from '@/components/workspace';
import { BuilderView } from '@/components/builder';
import { useAuthStore } from '@/store/auth.store';
import { useProjectStore } from '@/store/project.store';
import { useSocketStore } from '@/store/socket.store';
import { apiClient, ProjectFile } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { TerminalPanel } from '@/components/terminal';
import { useTerminalStore } from '@/store/terminal.store';

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
  } = useSocketStore();

  const { isPanelOpen, panelHeight, togglePanel } = useTerminalStore();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [acceptedCallInfo, setAcceptedCallInfo] = useState<{
    callId: string;
    type: 'VOICE' | 'VIDEO';
  } | null>(null);
  const [activeView, setActiveView] = useState<'editor' | 'board' | 'builder'>('editor');

  // File state
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [fileTree, setFileTree] = useState<ProjectFile[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isFilesLoading, setIsFilesLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Tab state
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [tabContents, setTabContents] = useState<Map<string, { content: string; savedContent: string }>>(new Map());

  // Get active tab and file
  const activeTab = useMemo(() =>
    openTabs.find(tab => tab.file.id === activeTabId),
    [openTabs, activeTabId]
  );
  const selectedFile = activeTab?.file || null;

  // Get content for active file
  const fileContent = useMemo(() =>
    tabContents.get(activeTabId || '')?.content || '',
    [tabContents, activeTabId]
  );
  const savedContent = useMemo(() =>
    tabContents.get(activeTabId || '')?.savedContent || '',
    [tabContents, activeTabId]
  );

  // Compute unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!activeTabId) return false;
    const content = tabContents.get(activeTabId);
    return content ? content.content !== content.savedContent : false;
  }, [activeTabId, tabContents]);

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
        const project = await apiClient.projects.getById(projectId);
        setCurrentProject(project);
        setError(null);
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('Failed to load project');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId, setCurrentProject]);

  // Connect to WebSocket and join workspace
  useEffect(() => {
    if (currentProject && projectId) {
      const { connect, joinWorkspace, leaveWorkspace } = useSocketStore.getState();
      connect();
      joinWorkspace(projectId);
    }

    return () => {
      const { leaveWorkspace } = useSocketStore.getState();
      leaveWorkspace();
    };
  }, [currentProject, projectId]);

  // Handle file selection - open in tab or switch to existing tab
  const handleFileSelect = async (file: ProjectFile) => {
    if (file.isFolder) return;

    // Check if file is already open in a tab
    const existingTab = openTabs.find(tab => tab.file.id === file.id);
    if (existingTab) {
      setActiveTabId(file.id);
      return;
    }

    // Open new tab
    setIsFilesLoading(true);
    try {
      const fullFile = await apiClient.files.getById(projectId, file.id);
      const content = fullFile.content || '';

      // Add to tabs
      setOpenTabs(prev => [...prev, { file, isDirty: false }]);
      setActiveTabId(file.id);

      // Store content
      setTabContents(prev => new Map(prev).set(file.id, {
        content,
        savedContent: content,
      }));

      toast({
        title: 'File loaded',
        description: `${file.name} opened successfully`,
      });
    } catch (error) {
      console.error('Failed to load file:', error);
      toast({
        title: 'Error',
        description: 'Failed to load file content',
        variant: 'destructive',
      });
    } finally {
      setIsFilesLoading(false);
    }
  };

  // Handle file content change
  const handleContentChange = useCallback((newContent: string) => {
    if (!activeTabId) return;

    setTabContents(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(activeTabId);
      if (current) {
        newMap.set(activeTabId, { ...current, content: newContent });
      }
      return newMap;
    });

    // Update isDirty status
    setOpenTabs(prev => prev.map(tab => {
      if (tab.file.id === activeTabId) {
        const content = tabContents.get(activeTabId);
        return { ...tab, isDirty: newContent !== content?.savedContent };
      }
      return tab;
    }));
  }, [activeTabId, tabContents]);

  // Handle file save
  const handleSave = useCallback(async () => {
    if (!selectedFile || !hasUnsavedChanges || !activeTabId) return;

    setIsSaving(true);
    try {
      // For collaborative files, use Yjs save endpoint to force immediate persistence
      // This bypasses the 2-second debounce and ensures immediate save feedback
      await apiClient.files.saveYjs(projectId, selectedFile.id);

      // Update saved content
      setTabContents(prev => {
        const newMap = new Map(prev);
        const current = newMap.get(activeTabId);
        if (current) {
          newMap.set(activeTabId, { ...current, savedContent: current.content });
        }
        return newMap;
      });

      // Clear dirty flag
      setOpenTabs(prev => prev.map(tab =>
        tab.file.id === activeTabId ? { ...tab, isDirty: false } : tab
      ));

      toast({
        title: 'File saved',
        description: `${selectedFile.name} saved successfully`,
      });
    } catch (error) {
      console.error('Failed to save file:', error);
      toast({
        title: 'Error',
        description: 'Failed to save file',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedFile, fileContent, hasUnsavedChanges, activeTabId, projectId, toast]);

  // Handle tab close
  const handleTabClose = useCallback(async (fileId: string) => {
    const tab = openTabs.find(t => t.file.id === fileId);
    if (!tab) return;

    // Check for unsaved changes
    if (tab.isDirty) {
      const confirmed = window.confirm(
        `${tab.file.name} has unsaved changes. Close anyway?`
      );
      if (!confirmed) return;
    }

    // Remove tab
    setOpenTabs(prev => prev.filter(t => t.file.id !== fileId));
    setTabContents(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });

    // Switch to another tab if this was active
    if (activeTabId === fileId) {
      const remainingTabs = openTabs.filter(t => t.file.id !== fileId);
      setActiveTabId(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].file.id : null);
    }
  }, [openTabs, activeTabId]);

  // Handle tab click
  const handleTabClick = useCallback((fileId: string) => {
    setActiveTabId(fileId);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save: Ctrl+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Toggle terminal: Ctrl+` or Ctrl+J (VS Code style)
      if ((e.ctrlKey || e.metaKey) && (e.key === '`' || e.key === 'j')) {
        e.preventDefault();
        togglePanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, togglePanel]);

  // Fetch files
  const fetchFiles = useCallback(async () => {
    if (!currentProject) return;

    setIsFilesLoading(true);
    try {
      const projectFiles = await apiClient.files.getAll(projectId);
      setFiles(projectFiles);
      setFileTree(buildFileTree(projectFiles));
    } catch (error) {
      console.error('Failed to load files:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project files',
        variant: 'destructive',
      });
    } finally {
      setIsFilesLoading(false);
    }
  }, [currentProject, projectId, toast]);

  // Load files on mount
  useEffect(() => {
    if (currentProject) {
      fetchFiles();
    }
  }, [currentProject, fetchFiles]);

  // Handle create file
  const handleCreateFile = async () => {
    if (!newItemName.trim()) return;

    setIsCreating(true);
    try {
      await apiClient.files.create(projectId, {
        name: newItemName,
        path: selectedFolderId
          ? `${files.find((f) => f.id === selectedFolderId)?.path}/${newItemName}`
          : newItemName,
        isFolder: false,
        content: '',
        parentId: selectedFolderId || undefined,
      });
      setIsNewFileDialogOpen(false);
      setNewItemName('');
      fetchFiles();
      toast({
        title: 'File created',
        description: `${newItemName} created successfully`,
      });
    } catch (error) {
      console.error('Failed to create file:', error);
      toast({
        title: 'Error',
        description: 'Failed to create file',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Handle create folder
  const handleCreateFolder = async () => {
    if (!newItemName.trim()) return;

    setIsCreating(true);
    try {
      await apiClient.files.create(projectId, {
        name: newItemName,
        path: selectedFolderId
          ? `${files.find((f) => f.id === selectedFolderId)?.path}/${newItemName}`
          : newItemName,
        isFolder: true,
        parentId: selectedFolderId || undefined,
      });
      setIsNewFolderDialogOpen(false);
      setNewItemName('');
      fetchFiles();
      toast({
        title: 'Folder created',
        description: `${newItemName} created successfully`,
      });
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Handle file delete
  const handleDeleteFile = async (file: ProjectFile) => {
    try {
      await apiClient.files.delete(projectId, file.id);

      // Close tab if file is open
      await handleTabClose(file.id);

      fetchFiles();
      toast({
        title: 'Deleted',
        description: `${file.name} deleted successfully`,
      });
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
    }
  };

  // Handle file move
  const handleMoveFile = async (fileId: string, targetFolderId: string | null) => {
    try {
      const file = files.find((f) => f.id === fileId);
      if (!file) return;

      await apiClient.files.update(projectId, fileId, {
        parentId: targetFolderId,
      });
      fetchFiles();
      toast({
        title: 'Moved',
        description: `${file.name} moved successfully`,
      });
    } catch (error) {
      console.error('Failed to move file:', error);
      toast({
        title: 'Error',
        description: 'Failed to move file',
        variant: 'destructive',
      });
    }
  };

  // Select file by path (used by builder code generation)
  const selectFileByPath = useCallback(async (filePath: string) => {
    // First refresh files to get the latest list (including newly generated files)
    const projectFiles = await apiClient.files.getAll(projectId);
    setFiles(projectFiles);
    setFileTree(buildFileTree(projectFiles));

    // Find file by path
    const file = projectFiles.find((f) => f.path === filePath);
    if (file) {
      // Select the file
      await handleFileSelect(file);
    } else {
      toast({
        title: 'File Not Found',
        description: `Could not find file: ${filePath}`,
        variant: 'destructive',
      });
    }
  }, [projectId, toast]);

  // Handle code generation complete from builder
  const handleGenerateComplete = useCallback(async (result: { code: string; filePath: string }) => {
    // Switch to editor view
    setActiveView('editor');

    // Select the generated file after a small delay to allow view switch
    setTimeout(() => {
      selectFileByPath(result.filePath);
    }, 100);
  }, [selectFileByPath]);

  // Handle accepting an incoming call
  const handleAcceptCall = useCallback((callId: string, type: 'VOICE' | 'VIDEO') => {
    setAcceptedCallInfo({ callId, type });
    setShowVideoCall(true);
  }, []);

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
        <WorkspaceLayout
          topBar={
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
                    <Button
                      variant={isPanelOpen ? 'secondary' : 'ghost'}
                      size="icon"
                      onClick={togglePanel}
                    >
                      <Terminal className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Toggle Terminal (Ctrl+`)</TooltipContent>
                </Tooltip>

                {/* View Toggle Buttons */}
                <div className="flex items-center border rounded-md">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activeView === 'editor' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="rounded-r-none h-8 w-8"
                        onClick={() => setActiveView('editor')}
                      >
                        <Code2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Code Editor</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activeView === 'board' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="rounded-none h-8 w-8"
                        onClick={() => setActiveView('board')}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Kanban Board</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={activeView === 'builder' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="rounded-l-none h-8 w-8"
                        onClick={() => setActiveView('builder')}
                      >
                        <Palette className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Website Builder</TooltipContent>
                  </Tooltip>
                </div>

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
          }
          leftSidebar={
            <LeftSidebar
              isOpen={isLeftSidebarOpen}
              onToggle={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
              files={files}
              fileTree={fileTree}
              selectedFileId={selectedFile?.id || null}
              selectedFolderId={selectedFolderId}
              isFilesLoading={isFilesLoading}
              onFileSelect={handleFileSelect}
              onFolderSelect={(folderId) => setSelectedFolderId(folderId)}
              onFileDelete={handleDeleteFile}
              onMoveFile={handleMoveFile}
              onNewFile={() => setIsNewFileDialogOpen(true)}
              onNewFolder={() => setIsNewFolderDialogOpen(true)}
            />
          }
          rightSidebar={
            <RightSidebar
              isOpen={isRightSidebarOpen}
              onToggle={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
              projectMembers={currentProject.members || []}
              presentUsers={presentUsers}
              onStartVideoCall={() => setShowVideoCall(true)}
            />
          }
        >
          {/* Main Content Area with Terminal at Bottom */}
          <div className="relative flex flex-col h-full overflow-hidden">
            {/* Main views - Scrollable content area */}
            <div
              className="flex-1 overflow-auto transition-all duration-200"
              style={{ paddingBottom: isPanelOpen ? `${panelHeight}px` : 0 }}
            >
              {activeView === 'board' ? (
                <KanbanBoard
                  projectId={projectId}
                  members={currentProject.members || []}
                />
              ) : activeView === 'builder' ? (
                <BuilderView
                  projectId={projectId}
                  onGenerateComplete={handleGenerateComplete}
                />
              ) : (
                <div className="flex flex-col h-full">
                  {/* Editor Tabs */}
                  <EditorTabs
                    tabs={openTabs}
                    activeTabId={activeTabId}
                    onTabClick={handleTabClick}
                    onTabClose={handleTabClose}
                  />

                  {/* Editor */}
                  <div className="flex-1 min-h-0">
                    {selectedFile ? (
                      <CodeEditor
                        value={fileContent}
                        onChange={handleContentChange}
                        filename={selectedFile.name}
                        fileId={selectedFile.id}
                        projectId={projectId}
                        onSave={handleSave}
                        className="h-full"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-center p-8">
                        <div>
                          <FileCode className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No File Selected</h3>
                          <p className="text-sm text-muted-foreground">
                            Select a file from the sidebar to start editing
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Terminal Panel - Fixed at bottom */}
            <div className="absolute bottom-0 left-0 right-0 z-10">
              <TerminalPanel
                projectId={projectId}
                onFilesChanged={fetchFiles}
              />
            </div>
          </div>
        </WorkspaceLayout>

        {/* New File Dialog */}
        <Dialog open={isNewFileDialogOpen} onOpenChange={setIsNewFileDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New File</DialogTitle>
              <DialogDescription>
                Enter a name for your new file. Include the extension (e.g., index.ts)
                {selectedFolderId && (
                  <span className="block mt-1 text-primary font-medium">
                    Creating in: {files.find((f) => f.id === selectedFolderId)?.name || 'Unknown folder'}
                  </span>
                )}
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
                {selectedFolderId && (
                  <span className="block mt-1 text-primary font-medium">
                    Creating in: {files.find((f) => f.id === selectedFolderId)?.name || 'Unknown folder'}
                  </span>
                )}
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

        {/* Always-mounted Incoming Call Dialog */}
        <IncomingCallDialog onAccept={handleAcceptCall} />

        {/* Video Call Component */}
        {showVideoCall && (
          <VideoCall
            projectId={projectId}
            acceptedCallInfo={acceptedCallInfo}
            onClose={() => {
              setShowVideoCall(false);
              setAcceptedCallInfo(null);
            }}
          />
        )}
      </TooltipProvider>
    </AuthGuard>
  );
}
