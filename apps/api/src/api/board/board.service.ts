import { PrismaService } from '@/database/prisma.service';
import { SocketGateway } from '@/shared/socket/socket.gateway';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProjectRole, TaskStatus } from '@prisma/client';
import {
  CreateColumnDto,
  CreateTaskDto,
  MoveTaskDto,
  UpdateTaskDto,
} from './dto';

@Injectable()
export class BoardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socketGateway: SocketGateway,
  ) {}

  /**
   * Authorization helper: Verify user has access to project with required role
   */
  private async verifyProjectAccess(
    projectId: string,
    userId: string,
    requiredRole?: ProjectRole,
  ) {
    const membership = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
        deletedAt: null,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied: Not a project member');
    }

    if (requiredRole) {
      const roleHierarchy = {
        [ProjectRole.OWNER]: 3,
        [ProjectRole.MAINTAINER]: 2,
        [ProjectRole.MEMBER]: 1,
      };

      if (roleHierarchy[membership.role] < roleHierarchy[requiredRole]) {
        throw new ForbiddenException(
          `Access denied: Requires ${requiredRole} role`,
        );
      }
    }

    return membership;
  }

  /**
   * Get or create board for a project
   */
  async getOrCreateBoard(projectId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId);

    let board = await this.prisma.board.findUnique({
      where: { projectId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            tasks: {
              where: { deletedAt: null },
              orderBy: { position: 'asc' },
              include: {
                assignee: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    image: true,
                  },
                },
                createdBy: {
                  select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Create board with default columns if it doesn't exist
    if (!board) {
      board = await this.prisma.board.create({
        data: {
          projectId,
          columns: {
            create: [
              { name: 'To Do', position: 0 },
              { name: 'In Progress', position: 1 },
              { name: 'Done', position: 2 },
            ],
          },
        },
        include: {
          columns: {
            orderBy: { position: 'asc' },
            include: {
              tasks: {
                where: { deletedAt: null },
                orderBy: { position: 'asc' },
                include: {
                  assignee: {
                    select: {
                      id: true,
                      username: true,
                      firstName: true,
                      lastName: true,
                      image: true,
                    },
                  },
                  createdBy: {
                    select: {
                      id: true,
                      username: true,
                      firstName: true,
                      lastName: true,
                      image: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    return board;
  }

  /**
   * Create a new column
   */
  async createColumn(projectId: string, dto: CreateColumnDto, userId: string) {
    await this.verifyProjectAccess(projectId, userId, ProjectRole.MAINTAINER);

    const board = await this.prisma.board.findUnique({
      where: { projectId },
      include: { columns: true },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    // Calculate position if not provided
    const position = dto.position ?? board.columns.length;

    const column = await this.prisma.column.create({
      data: {
        boardId: board.id,
        name: dto.name,
        position,
      },
      include: {
        tasks: true,
      },
    });

    // Broadcast column created event
    this.socketGateway.broadcastColumnCreated(projectId, column);

    return column;
  }

  /**
   * Update column (rename)
   */
  async updateColumn(columnId: string, name: string, userId: string) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { board: { include: { project: true } } },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    await this.verifyProjectAccess(
      column.board.projectId,
      userId,
      ProjectRole.MAINTAINER,
    );

    const updatedColumn = await this.prisma.column.update({
      where: { id: columnId },
      data: { name },
    });

    // Broadcast column updated event
    this.socketGateway.broadcastColumnUpdated(
      column.board.projectId,
      updatedColumn,
    );

    return updatedColumn;
  }

  /**
   * Delete column (and all tasks in it)
   */
  async deleteColumn(columnId: string, userId: string) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { board: true },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    await this.verifyProjectAccess(
      column.board.projectId,
      userId,
      ProjectRole.OWNER,
    );

    const projectId = column.board.projectId;

    // Soft delete all tasks in the column
    await this.prisma.task.updateMany({
      where: { columnId },
      data: { deletedAt: new Date() },
    });

    // Delete the column
    await this.prisma.column.delete({
      where: { id: columnId },
    });

    // Broadcast column deleted event
    this.socketGateway.broadcastColumnDeleted(projectId, columnId);

    return { success: true };
  }

  /**
   * Create a new task
   */
  async createTask(projectId: string, dto: CreateTaskDto, userId: string) {
    await this.verifyProjectAccess(projectId, userId);

    const column = await this.prisma.column.findUnique({
      where: { id: dto.columnId },
      include: { board: true, tasks: { where: { deletedAt: null } } },
    });

    if (!column || column.board.projectId !== projectId) {
      throw new NotFoundException('Column not found in this project');
    }

    // Calculate position if not provided
    const position = dto.position ?? column.tasks.length;

    // Determine status based on column
    const statusMap: Record<string, TaskStatus> = {
      'To Do': TaskStatus.TODO,
      'In Progress': TaskStatus.IN_PROGRESS,
      Done: TaskStatus.DONE,
    };
    const status = statusMap[column.name] || TaskStatus.TODO;

    const task = await this.prisma.task.create({
      data: {
        columnId: dto.columnId,
        projectId,
        title: dto.title,
        description: dto.description,
        assigneeId: dto.assigneeId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        priority: dto.priority,
        position,
        status,
        createdById: userId,
      },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
      },
    });

    // Broadcast task created event
    this.socketGateway.broadcastTaskCreated(projectId, task);

    return task;
  }

  /**
   * Update a task
   */
  async updateTask(taskId: string, dto: UpdateTaskDto, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { column: { include: { board: true } } },
    });

    if (!task || task.deletedAt) {
      throw new NotFoundException('Task not found');
    }

    await this.verifyProjectAccess(task.projectId, userId);

    // If moving to a different column, update status
    let status = dto.status;
    if (dto.columnId && dto.columnId !== task.columnId) {
      const newColumn = await this.prisma.column.findUnique({
        where: { id: dto.columnId },
      });
      if (!newColumn) {
        throw new NotFoundException('Target column not found');
      }

      const statusMap: Record<string, TaskStatus> = {
        'To Do': TaskStatus.TODO,
        'In Progress': TaskStatus.IN_PROGRESS,
        Done: TaskStatus.DONE,
      };
      status = statusMap[newColumn.name] || status;
    }

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        columnId: dto.columnId,
        title: dto.title,
        description: dto.description,
        status,
        priority: dto.priority,
        assigneeId: dto.assigneeId,
        dueDate:
          dto.dueDate !== undefined
            ? dto.dueDate
              ? new Date(dto.dueDate)
              : null
            : undefined,
        position: dto.position,
      },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
      },
    });

    // Broadcast task updated event
    this.socketGateway.broadcastTaskUpdated(task.projectId, updatedTask);

    return updatedTask;
  }

  /**
   * Move a task to a different column/position
   */
  async moveTask(taskId: string, dto: MoveTaskDto, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { column: { include: { board: true } } },
    });

    if (!task || task.deletedAt) {
      throw new NotFoundException('Task not found');
    }

    await this.verifyProjectAccess(task.projectId, userId);

    const targetColumn = await this.prisma.column.findUnique({
      where: { id: dto.columnId },
      include: { board: true },
    });

    if (!targetColumn || targetColumn.board.projectId !== task.projectId) {
      throw new NotFoundException('Target column not found in this project');
    }

    // Update status based on column
    const statusMap: Record<string, TaskStatus> = {
      'To Do': TaskStatus.TODO,
      'In Progress': TaskStatus.IN_PROGRESS,
      Done: TaskStatus.DONE,
    };
    const status = statusMap[targetColumn.name] || task.status;

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        columnId: dto.columnId,
        position: dto.position,
        status,
      },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
      },
    });

    // Broadcast task moved event (uses update event for consistency)
    this.socketGateway.broadcastTaskUpdated(task.projectId, updatedTask);

    return updatedTask;
  }

  /**
   * Delete a task (soft delete)
   */
  async deleteTask(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task || task.deletedAt) {
      throw new NotFoundException('Task not found');
    }

    const projectId = task.projectId;

    await this.verifyProjectAccess(projectId, userId);

    await this.prisma.task.update({
      where: { id: taskId },
      data: { deletedAt: new Date() },
    });

    // Broadcast task deleted event
    this.socketGateway.broadcastTaskDeleted(projectId, taskId);

    return { success: true };
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
        column: true,
      },
    });

    if (!task || task.deletedAt) {
      throw new NotFoundException('Task not found');
    }

    await this.verifyProjectAccess(task.projectId, userId);

    return task;
  }
}
