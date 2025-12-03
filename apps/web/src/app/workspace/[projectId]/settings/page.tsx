'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Settings,
  ArrowLeft,
  Save,
  Trash2,
  Users,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiClient, ApiError } from '@/lib/api-client';
import { useProjectStore, Project, ProjectMember } from '@/store/project.store';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuthStore } from '@/store/auth.store';

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.projectId as string;

  const { user } = useAuthStore();
  const { projects, setProjects } = useProjectStore();

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Fetch project data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [projectData, membersData] = await Promise.all([
          apiClient.projects.getById(projectId),
          apiClient.projects.getMembers(projectId),
        ]);
        setProject(projectData);
        setMembers(membersData);
        setName(projectData.name);
        setDescription(projectData.description || '');
      } catch (err) {
        console.error('Failed to fetch project:', err);
        toast({
          title: 'Error',
          description: 'Failed to load project settings.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId, toast]);

  // Check if current user is owner
  const isOwner = members.some(
    (m) => m.userId === user?.id && m.role === 'OWNER'
  );

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Project name is required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      const updated = await apiClient.projects.update(projectId, {
        name: name.trim(),
        description: description.trim() || undefined,
      });

      setProject(updated);
      setProjects(
        projects.map((p) => (p.id === projectId ? updated : p))
      );

      toast({
        title: 'Saved',
        description: 'Project settings have been updated.',
      });
    } catch (err) {
      const apiError = err as ApiError;
      toast({
        title: 'Error',
        description: apiError.message || 'Failed to update project.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation !== project?.name) {
      toast({
        title: 'Error',
        description: 'Please type the project name to confirm deletion.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsDeleting(true);
      await apiClient.projects.delete(projectId);

      setProjects(projects.filter((p) => p.id !== projectId));

      toast({
        title: 'Deleted',
        description: 'Project has been permanently deleted.',
      });

      router.push('/dashboard/projects');
    } catch (err) {
      const apiError = err as ApiError;
      toast({
        title: 'Error',
        description: apiError.message || 'Failed to delete project.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AuthGuard>
    );
  }

  if (!project) {
    return (
      <AuthGuard>
        <div className="flex h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Project not found</h2>
            <p className="text-muted-foreground mt-2">
              The project you&apos;re looking for doesn&apos;t exist.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/projects">Go to Projects</Link>
            </Button>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-6 gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/workspace/${projectId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Workspace
              </Link>
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5" />
              <div>
                <h1 className="text-lg font-semibold">Project Settings</h1>
                <p className="text-xs text-muted-foreground">{project.name}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* General Settings */}
            <Card>
              <CardHeader>
                <CardTitle>General</CardTitle>
                <CardDescription>
                  Basic project information and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Project"
                    disabled={isSaving}
                    maxLength={100}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="A brief description of your project..."
                    disabled={isSaving}
                    maxLength={500}
                    rows={3}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Project ID</Label>
                  <Input value={projectId} disabled className="bg-muted font-mono text-xs" />
                  <p className="text-xs text-muted-foreground">
                    Use this ID for API integrations
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>

            {/* Team Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
                <CardDescription>
                  People with access to this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">
                            {member.user?.name?.[0]?.toUpperCase() ||
                              member.user?.email?.[0]?.toUpperCase() ||
                              '?'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {member.user?.name || member.user?.email || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.user?.email}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 bg-muted rounded">
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            {isOwner && (
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Irreversible and destructive actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Delete Project</AlertTitle>
                    <AlertDescription>
                      Once you delete a project, there is no going back. All files,
                      settings, and collaborator access will be permanently removed.
                    </AlertDescription>
                  </Alert>
                </CardContent>
                <CardFooter>
                  <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Project
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete Project</DialogTitle>
                        <DialogDescription>
                          This action cannot be undone. This will permanently delete the
                          project <strong>{project.name}</strong> and remove all
                          associated data.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="grid gap-2 py-4">
                        <Label htmlFor="confirm">
                          Type <strong>{project.name}</strong> to confirm
                        </Label>
                        <Input
                          id="confirm"
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          placeholder="Enter project name"
                          disabled={isDeleting}
                        />
                      </div>

                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setDeleteDialogOpen(false)}
                          disabled={isDeleting}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleDelete}
                          disabled={isDeleting || deleteConfirmation !== project.name}
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            'Delete Project'
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
