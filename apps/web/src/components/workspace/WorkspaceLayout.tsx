'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface WorkspaceLayoutProps {
    children: ReactNode;
    leftSidebar: ReactNode;
    rightSidebar: ReactNode;
    topBar: ReactNode;
    statusBar?: ReactNode;
}

export function WorkspaceLayout({
    children,
    leftSidebar,
    rightSidebar,
    topBar,
    statusBar,
}: WorkspaceLayoutProps) {
    return (
        <div className="flex h-screen flex-col overflow-hidden bg-background">
            {/* Top Bar */}
            {topBar}

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Project Zone */}
                {leftSidebar}

                {/* Center - Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {children}
                </div>

                {/* Right Sidebar - Collaboration Zone */}
                {rightSidebar}
            </div>

            {/* Status Bar */}
            {statusBar}
        </div>
    );
}
