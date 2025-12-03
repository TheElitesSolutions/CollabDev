import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { apiClient, Board, Column, Task, TaskPriority, TaskStatus } from '@/lib/api-client';
import {
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
  onColumnCreated,
  onColumnUpdated,
  onColumnDeleted,
} from '@/lib/socket';

// Type for updateTask that matches API expectations
type UpdateTaskData = {
  columnId?: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  position?: number;
};

type BoardState = {
  board: Board | null;
  isLoading: boolean;
  error: string | null;
  socketSubscribed: boolean;

  // Actions
  fetchBoard: (projectId: string) => Promise<void>;
  createTask: (
    projectId: string,
    data: {
      columnId: string;
      title: string;
      description?: string;
      assigneeId?: string;
      dueDate?: string;
      priority?: TaskPriority;
    }
  ) => Promise<Task>;
  updateTask: (
    taskId: string,
    data: UpdateTaskData
  ) => Promise<Task>;
  moveTask: (
    taskId: string,
    columnId: string,
    position: number
  ) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  createColumn: (projectId: string, name: string) => Promise<Column>;
  updateColumn: (columnId: string, name: string) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;

  // Real-time handlers
  handleTaskCreated: (task: Task) => void;
  handleTaskUpdated: (task: Task) => void;
  handleTaskDeleted: (taskId: string) => void;
  handleColumnCreated: (column: Column) => void;
  handleColumnUpdated: (column: Column) => void;
  handleColumnDeleted: (columnId: string) => void;

  // Socket subscription
  subscribeToSocketEvents: (projectId: string) => () => void;

  // Reset
  reset: () => void;
};

export const useBoardStore = create<BoardState>()(
  devtools(
    (set, get) => ({
      board: null,
      isLoading: false,
      error: null,
      socketSubscribed: false,

      fetchBoard: async (projectId: string) => {
        set({ isLoading: true, error: null });
        try {
          const board = await apiClient.board.getBoard(projectId);
          set({ board, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Failed to fetch board',
            isLoading: false,
          });
        }
      },

      createTask: async (projectId, data) => {
        const task = await apiClient.board.createTask(projectId, data);
        // Don't update local state here - let the socket event handle it
        // This prevents duplicates from both optimistic update and socket event
        return task;
      },

      updateTask: async (taskId, data) => {
        const task = await apiClient.board.updateTask(taskId, data);
        get().handleTaskUpdated(task);
        return task;
      },

      moveTask: async (taskId, columnId, position) => {
        const { board } = get();
        if (!board) return;

        // Find the task
        let task: Task | null = null;
        let sourceColumnId: string | null = null;

        for (const col of board.columns) {
          const found = col.tasks.find((t) => t.id === taskId);
          if (found) {
            task = found;
            sourceColumnId = col.id;
            break;
          }
        }

        if (!task || !sourceColumnId) return;

        // Optimistic update
        const updatedColumns = board.columns.map((col) => {
          if (col.id === sourceColumnId) {
            return {
              ...col,
              tasks: col.tasks.filter((t) => t.id !== taskId),
            };
          }
          if (col.id === columnId) {
            const newTasks = [...col.tasks];
            const movedTask = { ...task!, columnId, position };
            newTasks.splice(position, 0, movedTask);
            // Update positions
            return {
              ...col,
              tasks: newTasks.map((t, idx) => ({ ...t, position: idx })),
            };
          }
          return col;
        });

        set({ board: { ...board, columns: updatedColumns } });

        try {
          await apiClient.board.moveTask(taskId, { columnId, position });
        } catch (err) {
          // Revert on error
          get().fetchBoard(board.projectId);
        }
      },

      deleteTask: async (taskId) => {
        const { board } = get();
        if (!board) return;

        // Optimistic update
        const updatedColumns = board.columns.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => t.id !== taskId),
        }));
        set({ board: { ...board, columns: updatedColumns } });

        try {
          await apiClient.board.deleteTask(taskId);
        } catch (err) {
          // Revert on error
          get().fetchBoard(board.projectId);
        }
      },

      createColumn: async (projectId, name) => {
        const column = await apiClient.board.createColumn(projectId, { name });
        const { board } = get();
        if (board) {
          set({ board: { ...board, columns: [...board.columns, column] } });
        }
        return column;
      },

      updateColumn: async (columnId, name) => {
        await apiClient.board.updateColumn(columnId, name);
        const { board } = get();
        if (board) {
          const updatedColumns = board.columns.map((col) =>
            col.id === columnId ? { ...col, name } : col
          );
          set({ board: { ...board, columns: updatedColumns } });
        }
      },

      deleteColumn: async (columnId) => {
        const { board } = get();
        if (!board) return;

        await apiClient.board.deleteColumn(columnId);
        const updatedColumns = board.columns.filter((col) => col.id !== columnId);
        set({ board: { ...board, columns: updatedColumns } });
      },

      // Real-time handlers
      handleTaskCreated: (task: Task) => {
        const { board } = get();
        if (!board) return;

        const updatedColumns = board.columns.map((col) => {
          if (col.id === task.columnId) {
            // Avoid duplicates
            if (col.tasks.some((t) => t.id === task.id)) return col;
            return { ...col, tasks: [...col.tasks, task] };
          }
          return col;
        });
        set({ board: { ...board, columns: updatedColumns } });
      },

      handleTaskUpdated: (task: Task) => {
        const { board } = get();
        if (!board) return;

        const updatedColumns = board.columns.map((col) => {
          // Remove from old column if moved
          const filteredTasks = col.tasks.filter((t) => t.id !== task.id);

          if (col.id === task.columnId) {
            // Add to new column
            const newTasks = [...filteredTasks, task].sort(
              (a, b) => a.position - b.position
            );
            return { ...col, tasks: newTasks };
          }

          return { ...col, tasks: filteredTasks };
        });
        set({ board: { ...board, columns: updatedColumns } });
      },

      handleTaskDeleted: (taskId: string) => {
        const { board } = get();
        if (!board) return;

        const updatedColumns = board.columns.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => t.id !== taskId),
        }));
        set({ board: { ...board, columns: updatedColumns } });
      },

      handleColumnCreated: (column: Column) => {
        const { board } = get();
        if (!board) return;

        // Avoid duplicates
        if (board.columns.some((c) => c.id === column.id)) return;

        set({ board: { ...board, columns: [...board.columns, column] } });
      },

      handleColumnUpdated: (column: Column) => {
        const { board } = get();
        if (!board) return;

        const updatedColumns = board.columns.map((col) =>
          col.id === column.id ? { ...col, ...column } : col
        );
        set({ board: { ...board, columns: updatedColumns } });
      },

      handleColumnDeleted: (columnId: string) => {
        const { board } = get();
        if (!board) return;

        const updatedColumns = board.columns.filter((col) => col.id !== columnId);
        set({ board: { ...board, columns: updatedColumns } });
      },

      subscribeToSocketEvents: (projectId: string) => {
        // Prevent duplicate subscriptions
        if (get().socketSubscribed) {
          return () => {}; // Return no-op unsubscribe
        }

        set({ socketSubscribed: true });

        const {
          handleTaskCreated,
          handleTaskUpdated,
          handleTaskDeleted,
          handleColumnCreated,
          handleColumnUpdated,
          handleColumnDeleted,
        } = get();

        const unsubTaskCreated = onTaskCreated((data) => {
          if (data.projectId === projectId) {
            handleTaskCreated(data.task);
          }
        });

        const unsubTaskUpdated = onTaskUpdated((data) => {
          if (data.projectId === projectId) {
            handleTaskUpdated(data.task);
          }
        });

        const unsubTaskDeleted = onTaskDeleted((data) => {
          if (data.projectId === projectId) {
            handleTaskDeleted(data.taskId);
          }
        });

        const unsubColumnCreated = onColumnCreated((data) => {
          if (data.projectId === projectId) {
            handleColumnCreated(data.column);
          }
        });

        const unsubColumnUpdated = onColumnUpdated((data) => {
          if (data.projectId === projectId) {
            handleColumnUpdated(data.column);
          }
        });

        const unsubColumnDeleted = onColumnDeleted((data) => {
          if (data.projectId === projectId) {
            handleColumnDeleted(data.columnId);
          }
        });

        return () => {
          unsubTaskCreated();
          unsubTaskUpdated();
          unsubTaskDeleted();
          unsubColumnCreated();
          unsubColumnUpdated();
          unsubColumnDeleted();
          set({ socketSubscribed: false });
        };
      },

      reset: () => {
        set({ board: null, isLoading: false, error: null, socketSubscribed: false });
      },
    }),
    { name: 'BoardStore' }
  )
);
