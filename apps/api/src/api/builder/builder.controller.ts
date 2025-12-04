import { AuthGuard } from '@/auth/auth.guard';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BuilderService } from './builder.service';
import { CreatePageDto, UpdatePageDto } from './dto';

@ApiTags('builder')
@Controller()
@UseGuards(AuthGuard)
export class BuilderController {
  constructor(private readonly builderService: BuilderService) {}

  /**
   * GET /projects/:projectId/pages
   * Get all pages for a project
   */
  @Get('projects/:projectId/pages')
  async getPages(
    @Param('projectId') projectId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.builderService.getPages(projectId, session.user.id);
  }

  /**
   * GET /projects/:projectId/pages/:pageId
   * Get a single page with full content
   */
  @Get('projects/:projectId/pages/:pageId')
  async getPage(
    @Param('projectId') projectId: string,
    @Param('pageId') pageId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.builderService.getPage(projectId, pageId, session.user.id);
  }

  /**
   * POST /projects/:projectId/pages
   * Create a new page
   */
  @Post('projects/:projectId/pages')
  async createPage(
    @Param('projectId') projectId: string,
    @Body() dto: CreatePageDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.builderService.createPage(projectId, dto, session.user.id);
  }

  /**
   * PATCH /projects/:projectId/pages/:pageId
   * Update a page
   */
  @Patch('projects/:projectId/pages/:pageId')
  async updatePage(
    @Param('projectId') projectId: string,
    @Param('pageId') pageId: string,
    @Body() dto: UpdatePageDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.builderService.updatePage(
      projectId,
      pageId,
      dto,
      session.user.id,
    );
  }

  /**
   * DELETE /projects/:projectId/pages/:pageId
   * Delete a page
   */
  @Delete('projects/:projectId/pages/:pageId')
  async deletePage(
    @Param('projectId') projectId: string,
    @Param('pageId') pageId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.builderService.deletePage(projectId, pageId, session.user.id);
  }

  /**
   * POST /projects/:projectId/pages/reorder
   * Reorder pages
   */
  @Post('projects/:projectId/pages/reorder')
  async reorderPages(
    @Param('projectId') projectId: string,
    @Body() body: { pageIds: string[] },
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.builderService.reorderPages(
      projectId,
      body.pageIds,
      session.user.id,
    );
  }

  /**
   * POST /projects/:projectId/pages/:pageId/duplicate
   * Duplicate a page
   */
  @Post('projects/:projectId/pages/:pageId/duplicate')
  async duplicatePage(
    @Param('projectId') projectId: string,
    @Param('pageId') pageId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.builderService.duplicatePage(projectId, pageId, session.user.id);
  }

  /**
   * POST /projects/:projectId/pages/:pageId/generate
   * Generate code from page content
   */
  @Post('projects/:projectId/pages/:pageId/generate')
  async generateCode(
    @Param('projectId') projectId: string,
    @Param('pageId') pageId: string,
    @Query('format') format: 'react' | 'html' = 'react',
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.builderService.generateCode(
      projectId,
      pageId,
      session.user.id,
      format,
    );
  }

  /**
   * GET /projects/:projectId/pages/:pageId/preview
   * Get preview HTML for a page
   */
  @Get('projects/:projectId/pages/:pageId/preview')
  @Header('Content-Type', 'text/html')
  async getPreview(
    @Param('projectId') projectId: string,
    @Param('pageId') pageId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.builderService.getPreviewHtml(projectId, pageId, session.user.id);
  }
}
