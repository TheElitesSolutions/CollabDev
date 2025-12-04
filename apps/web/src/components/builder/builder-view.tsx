'use client';

import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { Puck, Data } from '@measured/puck';
import '@measured/puck/puck.css';
import { puckConfig } from './puck-config';
import { useBuilderStore } from '@/store/builder.store';
import { PageList } from './page-list';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Code, Eye, Loader2, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BuilderCollab, createBuilderCollab, BuilderCollabUser, PuckData } from '@/lib/builder-collab';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/hooks/use-toast';

interface BuilderViewProps {
  projectId: string;
  onGenerateComplete?: (result: { code: string; filePath: string }) => void;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export function BuilderView({ projectId, onGenerateComplete }: BuilderViewProps) {
  const {
    pages,
    currentPage,
    currentPageId,
    isLoading,
    fetchPages,
    fetchPage,
    updatePage,
    generateCode,
    subscribeToSocketEvents,
    joinPage,
    leavePage,
    reset,
  } = useBuilderStore();

  const { user } = useAuthStore();
  const { toast } = useToast();
  const collabRef = useRef<BuilderCollab | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [collabUsers, setCollabUsers] = useState<BuilderCollabUser[]>([]);
  const [syncedData, setSyncedData] = useState<PuckData | null>(null);

  // Ref to track latest editor data for auto-save
  const latestDataRef = useRef<PuckData | null>(null);
  const hasUnsavedChangesRef = useRef(false);

  // Fetch pages on mount
  useEffect(() => {
    fetchPages(projectId);
    const unsubscribe = subscribeToSocketEvents(projectId);

    return () => {
      unsubscribe();
      reset();
    };
  }, [projectId, fetchPages, subscribeToSocketEvents, reset]);

  // Join/leave page room for collaboration
  useEffect(() => {
    if (currentPageId) {
      joinPage(projectId, currentPageId);
      fetchPage(projectId, currentPageId);

      return () => {
        leavePage(projectId, currentPageId);
      };
    }
  }, [currentPageId, projectId, joinPage, leavePage, fetchPage]);

  // Set up Yjs collaboration for current page
  useEffect(() => {
    if (!currentPageId || !user) return;

    // Clean up previous collaboration
    if (collabRef.current) {
      collabRef.current.destroy();
      collabRef.current = null;
    }

    // Create new collaboration instance
    const collab = createBuilderCollab({
      projectId,
      pageId: currentPageId,
      user: {
        id: user.id,
        name: user.firstName || user.email,
        email: user.email,
      },
      onConnectionChange: setConnectionStatus,
      onContentChange: (data) => {
        setSyncedData(data);
      },
      onUsersChange: setCollabUsers,
      onSync: (isSynced) => {
        if (isSynced && currentPage?.content) {
          // Initialize with existing content if Yjs doc is empty
          collab.initializeIfEmpty(currentPage.content as PuckData);
        }
      },
    });

    collabRef.current = collab;

    return () => {
      collab.destroy();
      collabRef.current = null;
      setConnectionStatus('disconnected');
      setCollabUsers([]);
      setSyncedData(null);
    };
  }, [currentPageId, projectId, user]);

  // Initialize synced data when current page loads
  // This handles the race condition where page data loads after Yjs connects
  useEffect(() => {
    if (currentPage?.content && collabRef.current) {
      // Always try to initialize - the initializeIfEmpty function
      // will check if Yjs actually has content before overwriting
      collabRef.current.initializeIfEmpty(currentPage.content as PuckData);
    }
  }, [currentPage]);

  // Auto-select first page if none selected
  useEffect(() => {
    if (pages.length > 0 && !currentPageId) {
      useBuilderStore.getState().setCurrentPage(pages[0].id);
    }
  }, [pages, currentPageId]);

  const handleSave = useCallback(async (data: Data) => {
    if (!currentPageId) return;

    setIsSaving(true);
    try {
      // Update in Yjs (syncs to other users)
      if (collabRef.current) {
        collabRef.current.setData(data as PuckData);
      }

      // Persist to database
      await updatePage(projectId, currentPageId, {
        content: data as PuckData,
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save page:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentPageId, projectId, updatePage]);

  const handleGenerateCode = useCallback(async () => {
    if (!currentPageId) return;

    setIsGenerating(true);
    try {
      // Auto-save before generating code using ref to get latest data
      if (hasUnsavedChangesRef.current && latestDataRef.current) {
        await updatePage(projectId, currentPageId, {
          content: latestDataRef.current,
        });
        setHasUnsavedChanges(false);
        hasUnsavedChangesRef.current = false;
      }

      const result = await generateCode(projectId, currentPageId);

      // Show success toast
      toast({
        title: 'Code Generated',
        description: `Generated: ${result.filePath}`,
      });

      // Call the callback to switch view and select file
      if (onGenerateComplete) {
        onGenerateComplete(result);
      }
    } catch (error) {
      console.error('Failed to generate code:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [currentPageId, projectId, generateCode, toast, onGenerateComplete, updatePage]);

  const handleChange = useCallback((data: Data) => {
    setHasUnsavedChanges(true);
    hasUnsavedChangesRef.current = true;
    latestDataRef.current = data as PuckData;
    // Sync changes to other users
    if (collabRef.current) {
      collabRef.current.setData(data as PuckData);
    }
  }, []);

  // Auto-save on visibility change (tab switch, window blur)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && currentPageId && hasUnsavedChangesRef.current && latestDataRef.current) {
        try {
          await updatePage(projectId, currentPageId, {
            content: latestDataRef.current,
          });
          setHasUnsavedChanges(false);
          hasUnsavedChangesRef.current = false;
        } catch (error) {
          console.error('Auto-save failed:', error);
        }
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChangesRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentPageId, projectId, updatePage]);

  // Determine which data to use for the editor
  const editorData = useMemo(() => {
    if (syncedData) return syncedData;
    if (currentPage?.content) return currentPage.content as PuckData;
    return { content: [], root: {} } as PuckData;
  }, [syncedData, currentPage]);

  if (isLoading && pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <PageList projectId={projectId} />

      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-12 border-b flex items-center justify-between px-4 bg-background">
          <div className="flex items-center gap-2">
            {currentPage && (
              <>
                <span className="font-medium">{currentPage.name}</span>
                <span className="text-xs text-muted-foreground">
                  /{currentPage.slug}
                </span>
                {hasUnsavedChanges && (
                  <span className="text-xs text-amber-500">• Unsaved changes</span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded text-xs",
                    connectionStatus === 'connected' && "text-green-600 bg-green-50 dark:bg-green-950/30",
                    connectionStatus === 'connecting' && "text-amber-600 bg-amber-50 dark:bg-amber-950/30",
                    connectionStatus === 'disconnected' && "text-red-600 bg-red-50 dark:bg-red-950/30"
                  )}>
                    {connectionStatus === 'connected' && <Wifi className="h-3 w-3" />}
                    {connectionStatus === 'connecting' && <RefreshCw className="h-3 w-3 animate-spin" />}
                    {connectionStatus === 'disconnected' && <WifiOff className="h-3 w-3" />}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {connectionStatus === 'connected' && 'Real-time sync active'}
                  {connectionStatus === 'connecting' && 'Connecting...'}
                  {connectionStatus === 'disconnected' && 'Offline - changes will sync when reconnected'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Collaborators */}
            {collabUsers.length > 0 && (
              <TooltipProvider>
                <div className="flex -space-x-2 mr-2">
                  {collabUsers.slice(0, 3).map((collabUser) => (
                    <Tooltip key={collabUser.id}>
                      <TooltipTrigger>
                        <Avatar
                          className="h-7 w-7 border-2"
                          style={{ borderColor: collabUser.color }}
                        >
                          <AvatarFallback
                            className="text-xs text-white"
                            style={{ backgroundColor: collabUser.color }}
                          >
                            {collabUser.name[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        {collabUser.name}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  {collabUsers.length > 3 && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Avatar className="h-7 w-7 border-2 border-background">
                          <AvatarFallback className="text-xs">
                            +{collabUsers.length - 3}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>
                        {collabUsers.length - 3} more collaborators
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateCode}
              disabled={!currentPageId || isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Code className="h-4 w-4 mr-2" />
              )}
              Generate Code
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={!currentPageId}
              onClick={() => window.open(`/workspace/${projectId}/preview/${currentPageId}`, '_blank')}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </div>
        </div>

        {/* Puck Editor */}
        <div className="flex-1 overflow-hidden">
          {currentPage ? (
            <Puck
              key={`${currentPageId}-${syncedData ? 'synced' : 'initial'}`}
              config={puckConfig}
              data={editorData}
              onPublish={handleSave}
              onChange={handleChange}
              headerTitle={currentPage.name}
              headerPath={`/${currentPage.slug}`}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-muted/30">
              <div className="text-center">
                <p className="text-muted-foreground mb-2">
                  {pages.length === 0
                    ? 'Create a page to start building'
                    : 'Select a page to edit'}
                </p>
                {pages.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Click the + button in the pages panel
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
