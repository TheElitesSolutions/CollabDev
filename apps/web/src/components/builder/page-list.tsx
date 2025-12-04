'use client';

import { useState } from 'react';
import { useBuilderStore } from '@/store/builder.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
  Plus,
  FileText,
  MoreVertical,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Page } from '@/lib/api-client';

interface PageListProps {
  projectId: string;
}

export function PageList({ projectId }: PageListProps) {
  const {
    pages,
    currentPageId,
    setCurrentPage,
    createPage,
    deletePage,
    duplicatePage,
    updatePage,
  } = useBuilderStore();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreatePage = async () => {
    if (!newPageName.trim() || !newPageSlug.trim()) return;

    setIsCreating(true);
    try {
      const page = await createPage(projectId, {
        name: newPageName.trim(),
        slug: newPageSlug.trim().toLowerCase().replace(/\s+/g, '-'),
      });
      setCurrentPage(page.id);
      setNewPageName('');
      setNewPageSlug('');
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create page:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;
    await deletePage(projectId, pageId);
  };

  const handleDuplicatePage = async (pageId: string) => {
    const page = await duplicatePage(projectId, pageId);
    setCurrentPage(page.id);
  };

  const handleTogglePublish = async (page: Page) => {
    await updatePage(projectId, page.id, { isPublished: !page.isPublished });
  };

  const generateSlugFromName = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
  };

  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm">Pages</h3>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Page</DialogTitle>
                <DialogDescription>
                  Add a new page to your website
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="pageName">Page Name</Label>
                  <Input
                    id="pageName"
                    placeholder="e.g., About Us"
                    value={newPageName}
                    onChange={(e) => {
                      setNewPageName(e.target.value);
                      setNewPageSlug(generateSlugFromName(e.target.value));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pageSlug">URL Slug</Label>
                  <Input
                    id="pageSlug"
                    placeholder="e.g., about-us"
                    value={newPageSlug}
                    onChange={(e) => setNewPageSlug(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The URL will be: /pages/{newPageSlug || 'slug'}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePage}
                  disabled={!newPageName.trim() || !newPageSlug.trim() || isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create Page'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-xs text-muted-foreground">
          {pages.length} page{pages.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {pages.length === 0 ? (
            <div className="text-center py-8 px-4">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No pages yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first page to get started
              </p>
            </div>
          ) : (
            pages.map((page) => (
              <div
                key={page.id}
                className={cn(
                  'group flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors',
                  currentPageId === page.id && 'bg-accent'
                )}
                onClick={() => setCurrentPage(page.id)}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{page.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    /{page.slug}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {page.isPublished ? (
                    <Eye className="h-3 w-3 text-green-500" />
                  ) : (
                    <EyeOff className="h-3 w-3 text-muted-foreground" />
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleTogglePublish(page)}>
                        {page.isPublished ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Unpublish
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            Publish
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicatePage(page.id)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeletePage(page.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
