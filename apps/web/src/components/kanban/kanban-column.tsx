'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { MoreHorizontal, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Column, Task } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { TaskCard } from './task-card';

interface KanbanColumnProps {
  column: Column;
  onAddTask: (columnId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onTaskClick: (task: Task) => void;
  onDeleteColumn?: (columnId: string) => void;
}

const columnColors: Record<string, string> = {
  'To Do': 'border-t-gray-500',
  'In Progress': 'border-t-blue-500',
  Done: 'border-t-green-500',
};

export function KanbanColumn({
  column,
  onAddTask,
  onDeleteTask,
  onTaskClick,
  onDeleteColumn,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  });

  const taskIds = column.tasks.map((task) => task.id);

  return (
    <Card
      className={cn(
        'w-72 shrink-0 flex flex-col max-h-full border-t-4',
        columnColors[column.name] || 'border-t-primary',
        isOver && 'ring-2 ring-primary ring-offset-2'
      )}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {column.name}
            <span className="text-xs text-muted-foreground font-normal bg-muted px-1.5 py-0.5 rounded">
              {column.tasks.length}
            </span>
          </CardTitle>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onAddTask(column.id)}
            >
              <Plus className="h-4 w-4" />
            </Button>

            {onDeleteColumn && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDeleteColumn(column.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Column
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-2 pt-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-2">
          <div
            ref={setNodeRef}
            className="space-y-2 min-h-[100px] py-1"
          >
            <SortableContext
              items={taskIds}
              strategy={verticalListSortingStrategy}
            >
              {column.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDelete={onDeleteTask}
                  onClick={onTaskClick}
                />
              ))}
            </SortableContext>

            {column.tasks.length === 0 && (
              <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                No tasks yet
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
