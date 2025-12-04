'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Render, Data } from '@measured/puck';
import { puckConfig } from '@/components/builder/puck-config';
import { apiClient, Page } from '@/lib/api-client';
import { Loader2, Monitor, Tablet, Smartphone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

const viewportSizes: Record<ViewportSize, { width: string; icon: React.ReactNode; label: string }> = {
  desktop: { width: '100%', icon: <Monitor className="h-4 w-4" />, label: 'Desktop' },
  tablet: { width: '768px', icon: <Tablet className="h-4 w-4" />, label: 'Tablet' },
  mobile: { width: '375px', icon: <Smartphone className="h-4 w-4" />, label: 'Mobile' },
};

export default function PreviewPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const pageId = params.pageId as string;

  const [page, setPage] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportSize>('desktop');

  const fetchPage = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.builder.getPage(projectId, pageId);
      setPage(data);
    } catch (err) {
      console.error('Failed to fetch page:', err);
      setError('Failed to load preview');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPage();
  }, [projectId, pageId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || 'Page not found'}</p>
          <Button onClick={fetchPage} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const puckData = page.content as Data || { content: [], root: {} };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Preview Toolbar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{page.name}</span>
            <span className="text-xs text-muted-foreground">
              Preview Mode
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Viewport Toggle */}
            <div className="flex items-center border rounded-md">
              {(Object.keys(viewportSizes) as ViewportSize[]).map((size) => (
                <Button
                  key={size}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-8 px-2',
                    viewport === size && 'bg-accent'
                  )}
                  onClick={() => setViewport(size)}
                  title={viewportSizes[size].label}
                >
                  {viewportSizes[size].icon}
                </Button>
              ))}
            </div>

            <Button onClick={fetchPage} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.close()}
            >
              Close Preview
            </Button>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="pt-14 flex justify-center">
        <div
          className={cn(
            'transition-all duration-300 bg-background shadow-lg',
            viewport !== 'desktop' && 'my-4 rounded-lg overflow-hidden'
          )}
          style={{ width: viewportSizes[viewport].width }}
        >
          <Render config={puckConfig} data={puckData} />
        </div>
      </div>
    </div>
  );
}
