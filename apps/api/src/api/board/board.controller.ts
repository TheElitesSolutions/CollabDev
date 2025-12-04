import { AuthGuard } from '@/auth/auth.guard';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BoardService } from './board.service';
import {
  CreateColumnDto,
  CreateTaskDto,
  MoveTaskDto,
  UpdateTaskDto,
} from './dto';

@Controller()
@UseGuards(AuthGuard)
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  /**
   * GET /projects/:projectId/board
   * Get board with columns and tasks for a project
   */
  @Get('project/:projectId/board')
  async getBoard(
    @Param('projectId') projectId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.boardService.getOrCreateBoard(projectId, session.user.id);
  }

  /**
   * POST /projects/:projectId/columns
   * Create a new column in the project's board
   */
  @Post('project/:projectId/columns')
  async createColumn(
    @Param('projectId') projectId: string,
    @Body() dto: CreateColumnDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.boardService.createColumn(projectId, dto, session.user.id);
  }

  /**
   * PATCH /columns/:columnId
   * Update column name
   */
  @Patch('columns/:columnId')
  async updateColumn(
    @Param('columnId') columnId: string,
    @Body('name') name: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.boardService.updateColumn(columnId, name, session.user.id);
  }

  /**
   * DELETE /columns/:columnId
   * Delete a column (and all tasks in it)
   */
  @Delete('columns/:columnId')
  async deleteColumn(
    @Param('columnId') columnId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.boardService.deleteColumn(columnId, session.user.id);
  }

  /**
   * POST /projects/:projectId/tasks
   * Create a new task
   */
  @Post('project/:projectId/tasks')
  async createTask(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.boardService.createTask(projectId, dto, session.user.id);
  }

  /**
   * GET /tasks/:taskId
   * Get a single task
   */
  @Get('tasks/:taskId')
  async getTask(
    @Param('taskId') taskId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.boardService.getTask(taskId, session.user.id);
  }

  /**
   * PATCH /tasks/:taskId
   * Update a task
   */
  @Patch('tasks/:taskId')
  async updateTask(
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.boardService.updateTask(taskId, dto, session.user.id);
  }

  /**
   * PATCH /tasks/:taskId/move
   * Move a task to a different column/position
   */
  @Patch('tasks/:taskId/move')
  async moveTask(
    @Param('taskId') taskId: string,
    @Body() dto: MoveTaskDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.boardService.moveTask(taskId, dto, session.user.id);
  }

  /**
   * DELETE /tasks/:taskId
   * Delete a task (soft delete)
   */
  @Delete('tasks/:taskId')
  async deleteTask(
    @Param('taskId') taskId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.boardService.deleteTask(taskId, session.user.id);
  }
}
