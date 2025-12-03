'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Loader2, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Task, TaskPriority } from '@/lib/api-client';
import { useBoardStore } from '@/store/board.store';
import { useToast } from '@/hooks/use-toast';
import { KanbanColumn } from './kanban-column';
import { TaskCard } from './task-card';
import { CreateTaskDialog } from './create-task-dialog';

interface KanbanBoardProps {
  projectId: string;
  members?: Array<{
    userId: string;
    user?: {
      id: string;
      name?: string;
      email?: string;
    };
  }>;
}

export function KanbanBoard({ projectId, members = [] }: KanbanBoardProps) {
  const { toast } = useToast();

  const {
    board,
    isLoading,
    error,
    fetchBoard,
    createTask,
    moveTask,
    deleteTask,
    subscribeToSocketEvents,
  } = useBoardStore();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);

  // Fetch board on mount
  useEffect(() => {
    fetchBoard(projectId);
  }, [projectId, fetchBoard]);

  // Subscribe to real-time events
  useEffect(() => {
    const unsubscribe = subscribeToSocketEvents(projectId);
    return unsubscribe;
  }, [projectId, subscribeToSocketEvents]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = findTaskById(active.id as string);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over for visual feedback
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !board) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the task being dragged
    const task = findTaskById(activeId);
    if (!task) return;

    // Determine target column
    let targetColumnId: string;
    let targetPosition: number;

    // Check if dropped on a column directly
    const overColumn = board.columns.find((col) => col.id === overId);
    if (overColumn) {
      targetColumnId = overColumn.id;
      targetPosition = overColumn.tasks.length;
    } else {
      // Dropped on another task
      const overTask = findTaskById(overId);
      if (!overTask) return;

      targetColumnId = overTask.columnId;
      const targetColumn = board.columns.find((col) => col.id === targetColumnId);
      if (!targetColumn) return;

      const overIndex = targetColumn.tasks.findIndex((t) => t.id === overId);
      targetPosition = overIndex;
    }

    // Only move if position changed
    if (task.columnId === targetColumnId) {
      const column = board.columns.find((col) => col.id === targetColumnId);
      if (!column) return;

      const oldIndex = column.tasks.findIndex((t) => t.id === activeId);
      if (oldIndex === targetPosition) return;
    }

    await moveTask(activeId, targetColumnId, targetPosition);
  };

  const findTaskById = (id: string): Task | null => {
    if (!board) return null;
    for (const column of board.columns) {
      const task = column.tasks.find((t) => t.id === id);
      if (task) return task;
    }
    return null;
  };

  const handleAddTask = (columnId: string) => {
    setSelectedColumnId(columnId);
    setCreateDialogOpen(true);
  };

  const handleCreateTask = async (data: {
    title: string;
    description?: string;
    priority?: TaskPriority;
    assigneeId?: string;
    dueDate?: string;
  }) => {
    if (!selectedColumnId) return;

    try {
      await createTask(projectId, {
        columnId: selectedColumnId,
        ...data,
      });
      toast({
        title: 'Task created',
        description: 'Your task has been created successfully.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create task.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirm = window.confirm('Are you sure you want to delete this task?');
    if (!confirm) return;

    try {
      await deleteTask(taskId);
      toast({
        title: 'Task deleted',
        description: 'The task has been deleted.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete task.',
        variant: 'destructive',
      });
    }
  };

  const handleTaskClick = (task: Task) => {
    // Could open task detail dialog here
    console.log('Task clicked:', task);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading board...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => fetchBoard(projectId)}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No board found</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col">
        <ScrollArea className="flex-1">
          <div className="flex gap-4 p-4 h-full">
            {board.columns
              .sort((a, b) => a.position - b.position)
              .map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  onAddTask={handleAddTask}
                  onDeleteTask={handleDeleteTask}
                  onTaskClick={handleTaskClick}
                />
              ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="rotate-3 w-72">
            <TaskCard task={activeTask} />
          </div>
        )}
      </DragOverlay>

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateTask}
        members={members}
      />
    </DndContext>
  );
}
