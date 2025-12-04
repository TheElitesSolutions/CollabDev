import { PrismaService } from '@/database/prisma.service';
import { SocketGateway } from '@/shared/socket/socket.gateway';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectRole } from '@prisma/client';
import { CreatePageDto, UpdatePageDto } from './dto';
import { CodeGeneratorService } from './generator';

@Injectable()
export class BuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socketGateway: SocketGateway,
    private readonly codeGenerator: CodeGeneratorService,
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
   * Get all pages for a project
   */
  async getPages(projectId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId);

    return this.prisma.page.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        position: true,
        isPublished: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Get a single page by ID with full content
   */
  async getPage(projectId: string, pageId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId);

    const page = await this.prisma.page.findFirst({
      where: {
        id: pageId,
        projectId,
        deletedAt: null,
      },
      include: {
        generatedFile: {
          select: {
            id: true,
            path: true,
            name: true,
          },
        },
      },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    return page;
  }

  /**
   * Create a new page
   */
  async createPage(projectId: string, dto: CreatePageDto, userId: string) {
    await this.verifyProjectAccess(projectId, userId);

    // Check for duplicate slug
    const existingPage = await this.prisma.page.findFirst({
      where: {
        projectId,
        slug: dto.slug,
        deletedAt: null,
      },
    });

    if (existingPage) {
      throw new ConflictException('A page with this slug already exists');
    }

    // Get max position for ordering
    const maxPositionPage = await this.prisma.page.findFirst({
      where: { projectId, deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const nextPosition = (maxPositionPage?.position ?? -1) + 1;

    const page = await this.prisma.page.create({
      data: {
        projectId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        isPublished: dto.isPublished ?? false,
        position: nextPosition,
        content: { content: [], root: {} }, // Empty Puck structure
      },
    });

    // Broadcast page created event
    this.socketGateway.broadcastPageCreated(projectId, page);

    return page;
  }

  /**
   * Update a page
   */
  async updatePage(
    projectId: string,
    pageId: string,
    dto: UpdatePageDto,
    userId: string,
  ) {
    await this.verifyProjectAccess(projectId, userId);

    const page = await this.prisma.page.findFirst({
      where: {
        id: pageId,
        projectId,
        deletedAt: null,
      },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    // Check for duplicate slug if changing
    if (dto.slug && dto.slug !== page.slug) {
      const existingPage = await this.prisma.page.findFirst({
        where: {
          projectId,
          slug: dto.slug,
          deletedAt: null,
          id: { not: pageId },
        },
      });

      if (existingPage) {
        throw new ConflictException('A page with this slug already exists');
      }
    }

    const updatedPage = await this.prisma.page.update({
      where: { id: pageId },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        content: dto.content as Prisma.InputJsonValue,
        position: dto.position,
        isPublished: dto.isPublished,
      },
    });

    // Broadcast page updated event
    this.socketGateway.broadcastPageUpdated(projectId, updatedPage);

    return updatedPage;
  }

  /**
   * Delete a page (soft delete)
   */
  async deletePage(projectId: string, pageId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId, ProjectRole.MAINTAINER);

    const page = await this.prisma.page.findFirst({
      where: {
        id: pageId,
        projectId,
        deletedAt: null,
      },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    await this.prisma.page.update({
      where: { id: pageId },
      data: { deletedAt: new Date() },
    });

    // Broadcast page deleted event
    this.socketGateway.broadcastPageDeleted(projectId, pageId);

    return { success: true };
  }

  /**
   * Reorder pages
   */
  async reorderPages(
    projectId: string,
    pageIds: string[],
    userId: string,
  ) {
    await this.verifyProjectAccess(projectId, userId);

    // Update positions in a transaction
    await this.prisma.$transaction(
      pageIds.map((id, index) =>
        this.prisma.page.update({
          where: { id },
          data: { position: index },
        }),
      ),
    );

    // Broadcast reorder event
    this.socketGateway.broadcastPagesReordered(projectId, pageIds);

    return { success: true };
  }

  /**
   * Duplicate a page
   */
  async duplicatePage(projectId: string, pageId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId);

    const page = await this.prisma.page.findFirst({
      where: {
        id: pageId,
        projectId,
        deletedAt: null,
      },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    // Generate unique slug
    let newSlug = `${page.slug}-copy`;
    let counter = 1;
    while (
      await this.prisma.page.findFirst({
        where: { projectId, slug: newSlug, deletedAt: null },
      })
    ) {
      newSlug = `${page.slug}-copy-${counter}`;
      counter++;
    }

    // Get max position
    const maxPositionPage = await this.prisma.page.findFirst({
      where: { projectId, deletedAt: null },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const nextPosition = (maxPositionPage?.position ?? -1) + 1;

    const newPage = await this.prisma.page.create({
      data: {
        projectId,
        name: `${page.name} (Copy)`,
        slug: newSlug,
        description: page.description,
        content: page.content as Prisma.InputJsonValue,
        position: nextPosition,
        isPublished: false, // Always start unpublished
      },
    });

    // Broadcast page created event
    this.socketGateway.broadcastPageCreated(projectId, newPage);

    return newPage;
  }

  /**
   * Generate React code from page content
   */
  async generateCode(
    projectId: string,
    pageId: string,
    userId: string,
    format: 'react' | 'html' = 'react',
  ) {
    await this.verifyProjectAccess(projectId, userId);

    const page = await this.prisma.page.findFirst({
      where: {
        id: pageId,
        projectId,
        deletedAt: null,
      },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const puckData = page.content as {
      content: Array<{ type: string; props: Record<string, unknown> }>;
      root: Record<string, unknown>;
    };

    let code: string;
    let filePath: string;

    if (format === 'html') {
      code = this.codeGenerator.generateHtmlCode(page.name, puckData);
      filePath = `pages/${page.slug}.html`;
    } else {
      code = this.codeGenerator.generateReactCode(page.name, puckData);
      filePath = `pages/${page.slug}.tsx`;
    }

    // Optionally save to project files
    // This could create or update a ProjectFile entry
    const existingFile = await this.prisma.projectFile.findFirst({
      where: {
        projectId,
        path: filePath,
      },
    });

    if (existingFile) {
      // Update existing file
      await this.prisma.projectFile.update({
        where: { id: existingFile.id },
        data: { content: code },
      });

      // Link to page if not already linked
      if (!page.generatedFileId) {
        await this.prisma.page.update({
          where: { id: pageId },
          data: { generatedFileId: existingFile.id },
        });
      }

      // Broadcast file update
      this.socketGateway.broadcastFileContentUpdated(projectId, {
        ...existingFile,
        content: code,
      });
    } else {
      // Create new file
      const newFile = await this.prisma.projectFile.create({
        data: {
          projectId,
          name: `${page.slug}.${format === 'html' ? 'html' : 'tsx'}`,
          path: filePath,
          content: code,
          isFolder: false,
        },
      });

      // Link to page
      await this.prisma.page.update({
        where: { id: pageId },
        data: { generatedFileId: newFile.id },
      });

      // Broadcast file creation
      this.socketGateway.broadcastFileCreated(projectId, newFile);
    }

    return {
      code,
      filePath,
      format,
    };
  }

  /**
   * Get preview HTML for a page
   */
  async getPreviewHtml(projectId: string, pageId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId);

    const page = await this.prisma.page.findFirst({
      where: {
        id: pageId,
        projectId,
        deletedAt: null,
      },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const puckData = page.content as {
      content: Array<{ type: string; props: Record<string, unknown> }>;
      root: Record<string, unknown>;
    };

    return this.codeGenerator.generateHtmlCode(page.name, puckData);
  }
}
