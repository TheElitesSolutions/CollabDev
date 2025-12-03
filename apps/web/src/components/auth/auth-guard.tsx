'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { apiClient } from '@/lib/api-client';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, setUser, setLoading, isLoading } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // If already authenticated with user data, skip check
      if (isAuthenticated && user) {
        setIsChecking(false);
        return;
      }

      try {
        setLoading(true);
        const currentUser = await apiClient.auth.getCurrentUser();
        setUser(currentUser);
        setIsChecking(false);
      } catch (error) {
        // Not authenticated, redirect to login
        console.log('Not authenticated, redirecting to login');
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [isAuthenticated, user, router, setUser, setLoading]);

  // Show loading state while checking authentication
  if (isChecking || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated after check, don't render children
  if (!isAuthenticated || !user) {
    return null;
  }

  return <>{children}</>;
}
