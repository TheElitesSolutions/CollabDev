'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
    FileCode,
    File as FileIcon,
    Folder as FolderIcon,
    FolderTree,
    Trash2,
    Loader2,
    PanelLeftClose,
    PanelLeft,
    ChevronRight,
    ChevronDown,
} from 'lucide-react';
import { ProjectFile } from '@/lib/api-client';
import { Tree, Folder, File, TreeViewElement } from '@/components/ui/file-tree';

interface LeftSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    files: ProjectFile[];
    fileTree: ProjectFile[];
    selectedFileId: string | null;
    selectedFolderId: string | null;
    isFilesLoading: boolean;
    onFileSelect: (file: ProjectFile) => void;
    onFolderSelect: (folderId: string | null) => void;
    onFileDelete: (file: ProjectFile) => void;
    onMoveFile: (fileId: string, targetFolderId: string | null) => void;
    onNewFile: () => void;
    onNewFolder: () => void;
}

// Convert ProjectFile to TreeViewElement format
function convertToTreeViewElements(
    files: ProjectFile[],
    fileMap: Map<string, ProjectFile>
): TreeViewElement[] {
    return files.map((file) => ({
        id: file.id,
        name: file.name,
        isSelectable: true,
        children: file.children
            ? convertToTreeViewElements(file.children, fileMap)
            : undefined,
    }));
}

// Recursive tree renderer that works with ProjectFile structure
function renderTreeNodes(
    files: ProjectFile[],
    fileMap: Map<string, ProjectFile>,
    selectedFileId: string | null,
    onFileSelect: (file: ProjectFile) => void,
    onFileDelete: (file: ProjectFile) => void
): React.ReactNode {
    return files.map((file) => {
        if (file.isFolder) {
            return (
                <Folder
                    key={file.id}
                    value={file.id}
                    element={file.name}
                    className="group relative px-2 hover:bg-accent rounded-md"
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-0.5 h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0 z-10"
                        onClick={(e) => {
                            e.stopPropagation();
                            onFileDelete(file);
                        }}
                    >
                        <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                    {file.children &&
                        renderTreeNodes(
                            file.children,
                            fileMap,
                            selectedFileId,
                            onFileSelect,
                            onFileDelete
                        )}
                </Folder>
            );
        }

        return (
            <div key={file.id} className="group relative">
                <File
                    value={file.id}
                    isSelect={selectedFileId === file.id}
                    fileIcon={<FileCode className="h-4 w-4 text-blue-500" />}
                    className="px-2 hover:bg-accent rounded-md w-full"
                    onClick={() => onFileSelect(file)}
                >
                    <span className="truncate flex-1">{file.name}</span>
                </File>
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-0.5 h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        onFileDelete(file);
                    }}
                >
                    <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
            </div>
        );
    });
}

export function LeftSidebar({
    isOpen,
    onToggle,
    files,
    fileTree,
    selectedFileId,
    selectedFolderId,
    isFilesLoading,
    onFileSelect,
    onFolderSelect,
    onFileDelete,
    onMoveFile,
    onNewFile,
    onNewFolder,
}: LeftSidebarProps) {
    // Create a map for quick file lookups
    const fileMap = useMemo(() => {
        const map = new Map<string, ProjectFile>();
        const addToMap = (file: ProjectFile) => {
            map.set(file.id, file);
            file.children?.forEach(addToMap);
        };
        fileTree.forEach(addToMap);
        return map;
    }, [fileTree]);

    return (
        <div
            className={cn(
                'flex flex-col border-r bg-muted/30 transition-all duration-300',
                isOpen ? 'w-64' : 'w-12'
            )}
        >
            {/* Sidebar Header */}
            <div className="flex h-10 items-center justify-between border-b px-2">
                {isOpen && (
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
                        Files
                    </h3>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onToggle}
                >
                    {isOpen ? (
                        <PanelLeftClose className="h-4 w-4" />
                    ) : (
                        <PanelLeft className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {/* Sidebar Content */}
            {isOpen && (
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-2 py-2 border-b">
                        <div className="flex gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={onNewFile}
                                    >
                                        <FileIcon className="h-3 w-3" />
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
                                        onClick={onNewFolder}
                                    >
                                        <FolderIcon className="h-3 w-3" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>New Folder</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {isFilesLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : fileTree.length === 0 ? (
                            <div className="text-center py-8 px-4">
                                <FolderTree className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">No files yet</p>
                                <Button
                                    variant="link"
                                    size="sm"
                                    onClick={onNewFile}
                                >
                                    Create your first file
                                </Button>
                            </div>
                        ) : (
                            <Tree
                                className="h-full overflow-auto"
                                initialSelectedId={selectedFileId || undefined}
                                initialExpandedItems={
                                    selectedFolderId ? [selectedFolderId] : undefined
                                }
                                openIcon={<ChevronDown className="h-4 w-4" />}
                                closeIcon={<ChevronRight className="h-4 w-4" />}
                            >
                                {renderTreeNodes(
                                    fileTree,
                                    fileMap,
                                    selectedFileId,
                                    onFileSelect,
                                    onFileDelete
                                )}
                            </Tree>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
