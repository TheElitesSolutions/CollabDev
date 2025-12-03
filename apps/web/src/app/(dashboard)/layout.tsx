'use client';

import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Sidebar } from '@/components/dashboard/sidebar';
import { useProjectStore } from '@/store/project.store';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { setProjects, setLoading, setError } = useProjectStore();

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const projects = await apiClient.projects.getAll();
        setProjects(projects);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
        setError('Failed to load projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [setProjects, setLoading, setError]);

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
        />
        <main
          className={cn(
            'flex-1 overflow-auto bg-muted/30 transition-all duration-300'
          )}
        >
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
