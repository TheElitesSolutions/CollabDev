'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MoreVertical, Users, Calendar, Trash2, ExternalLink } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Project } from '@/store/project.store';

interface ProjectCardProps {
  project: Project;
  onDelete?: (id: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const memberCount = project.members?.length || 0;
  const createdAt = new Date(project.createdAt);
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(project.id);
    }
  };

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
      <Link href={`/workspace/${project.id}`} className="block">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
                {project.name}
              </CardTitle>
              <CardDescription className="line-clamp-2">
                {project.description || 'No description provided'}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/workspace/${project.id}`} className="flex items-center">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Workspace
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{timeAgo}</span>
              </div>
            </div>

            {/* Member Avatars */}
            {project.members && project.members.length > 0 && (
              <div className="flex -space-x-2">
                {project.members.slice(0, 3).map((member) => (
                  <Avatar key={member.id} className="h-7 w-7 border-2 border-background">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="text-xs">
                      {member.user?.firstName?.[0]?.toUpperCase() || member.user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {project.members.length > 3 && (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                    +{project.members.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
