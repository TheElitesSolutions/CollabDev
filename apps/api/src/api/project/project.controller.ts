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
import { AddMemberDto } from './dto/add-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import {
  CreateProjectFileDto,
  UpdateProjectFileDto,
} from './dto/project-file.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectService } from './project.service';

@Controller('project')
@UseGuards(AuthGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Get()
  async findMyProjects(@CurrentUserSession() session: CurrentUserSession) {
    return this.projectService.findMyProjects(session.user.id);
  }

  @Post()
  async createProject(
    @Body() dto: CreateProjectDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.projectService.createProject(dto, session.user.id);
  }

  @Get(':id')
  async findProject(
    @Param('id') id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.projectService.findProject(id, session.user.id);
  }

  @Patch(':id')
  async updateProject(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.projectService.updateProject(id, dto, session.user.id);
  }

  @Delete(':id')
  async deleteProject(
    @Param('id') id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.projectService.deleteProject(id, session.user.id);
  }

  @Get(':id/members')
  async getProjectMembers(
    @Param('id') id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.projectService.getProjectMembers(id, session.user.id);
  }

  @Post(':id/members')
  async addProjectMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.projectService.addProjectMember(id, dto, session.user.id);
  }

  @Post(':id/invite')
  async inviteProjectMember(
    @Param('id') id: string,
    @Body() dto: InviteMemberDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.projectService.inviteProjectMember(
      id,
      dto.email,
      dto.role,
      session.user.id,
    );
  }

  @Delete(':id/members/:userId')
  async removeProjectMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.projectService.removeProjectMember(id, userId, session.user.id);
  }

  // ============================================
  // Project File Endpoints
  // ============================================

  @Get(':id/files')
  async getProjectFiles(
    @Param('id') id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.projectService.getProjectFiles(id, session.user.id);
  }

  @Get(':id/files/:fileId')
  async getProjectFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.projectService.getProjectFile(id, fileId, session.user.id);
  }

  @Post(':id/files')
  async createProjectFile(
    @Param('id') id: string,
    @Body() dto: CreateProjectFileDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.projectService.createProjectFile(id, dto, session.user.id);
  }

  @Patch(':id/files/:fileId')
  async updateProjectFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @Body() dto: UpdateProjectFileDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.projectService.updateProjectFile(
      id,
      fileId,
      dto,
      session.user.id,
    );
  }

  @Delete(':id/files/:fileId')
  async deleteProjectFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.projectService.deleteProjectFile(id, fileId, session.user.id);
  }

  @Post(':id/files/:fileId/save-yjs')
  async saveYjsContent(
    @Param('id') projectId: string,
    @Param('fileId') fileId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.projectService.saveYjsContent(projectId, fileId);
    return {
      success: true,
      message: 'Yjs content saved successfully',
    };
  }

  @Post(':id/files/initialize')
  async initializeProjectFiles(
    @Param('id') id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.projectService.initializeProjectFiles(id, session.user.id);
  }
}
