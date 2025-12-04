import { Neo4jService } from '@/database/neo4j/neo4j.service';
import { PrismaService } from '@/database/prisma.service';
import { CacheService } from '@/shared/cache/cache.service';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ProjectRole, ConversationType } from '@prisma/client';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import {
  CreateProjectFileDto,
  UpdateProjectFileDto,
} from './dto/project-file.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly neo4jService: Neo4jService,
    private readonly cacheService: CacheService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
  ) {}

  /**
   * Authorization helper: Verify user has access to project with required role
   * Role hierarchy: OWNER > MAINTAINER > MEMBER
   */
  async verifyProjectAccess(
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

    // Check role hierarchy if required role specified
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
   * Get all projects for a user (with Redis caching)
   */
  async findMyProjects(userId: string) {
    // Check cache first
    const cached = await this.cacheService.get<any[]>({
      key: 'ProjectUserList',
      args: [userId],
    });

    if (cached) {
      return cached;
    }

    // Query database if not cached
    const memberships = await this.prisma.projectMember.findMany({
      where: {
        userId,
        deletedAt: null,
        project: {
          deletedAt: null,
        },
      },
      include: {
        project: {
          include: {
            createdBy: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true,
                image: true,
              },
            },
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
      orderBy: {
        project: {
          updatedAt: 'desc',
        },
      },
    });

    const projects = memberships.map((m) => ({
      ...m.project,
      myRole: m.role,
      memberCount: m.project._count.members,
    }));

    // Cache for 5 minutes (300000ms)
    await this.cacheService.set(
      { key: 'ProjectUserList', args: [userId] },
      projects,
      { ttl: 300000 },
    );

    return projects;
  }

  /**
   * Cache invalidation helper: Clear project list cache for multiple users
   */
  private async invalidateUserProjectsCache(userIds: string[]) {
    for (const userId of userIds) {
      await this.cacheService.delete({
        key: 'ProjectUserList',
        args: [userId],
      });
    }
  }

  /**
   * Create a new project and add creator as OWNER
   */
  async createProject(dto: CreateProjectDto, userId: string) {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        createdByUserId: userId,
        members: {
          create: {
            userId,
            role: ProjectRole.OWNER,
          },
        },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        members: {
          where: { deletedAt: null },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    // Create Neo4j node
    await this.neo4jService.createProjectNode(
      project.id,
      project.name,
      project.description,
    );

    // Create PROJECT conversation with creator as first participant
    await this.prisma.conversation.create({
      data: {
        type: ConversationType.PROJECT,
        name: `${project.name} Team Chat`,
        projectId: project.id,
        participants: {
          create: {
            userId,
          },
        },
      },
    });

    // Invalidate cache for creator
    await this.invalidateUserProjectsCache([userId]);

    return project;
  }

  /**
   * Get project details (requires MEMBER access)
   */
  async findProject(id: string, userId: string) {
    await this.verifyProjectAccess(id, userId, ProjectRole.MEMBER);

    const project = await this.prisma.project.findUnique({
      where: { id, deletedAt: null },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        members: {
          where: { deletedAt: null },
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  /**
   * Update project (requires MAINTAINER access)
   */
  async updateProject(id: string, dto: UpdateProjectDto, userId: string) {
    await this.verifyProjectAccess(id, userId, ProjectRole.MAINTAINER);

    const project = await this.prisma.project.update({
      where: { id, deletedAt: null },
      data: {
        name: dto.name,
        description: dto.description,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Update Neo4j node
    await this.neo4jService.updateProjectNode(id, dto.name, dto.description);

    // Invalidate cache for all project members
    const members = await this.prisma.projectMember.findMany({
      where: { projectId: id, deletedAt: null },
      select: { userId: true },
    });
    await this.invalidateUserProjectsCache(members.map((m) => m.userId));

    return project;
  }

  /**
   * Delete project (soft delete, requires OWNER access)
   */
  async deleteProject(id: string, userId: string) {
    await this.verifyProjectAccess(id, userId, ProjectRole.OWNER);

    // Get all project members before deletion
    const members = await this.prisma.projectMember.findMany({
      where: { projectId: id, deletedAt: null },
      select: { userId: true },
    });

    await this.prisma.project.update({
      where: { id, deletedAt: null },
      data: {
        deletedAt: new Date(),
      },
    });

    // Soft delete Neo4j node
    await this.neo4jService.deleteProjectNode(id);

    // Invalidate cache for all project members
    await this.invalidateUserProjectsCache(members.map((m) => m.userId));

    return { message: 'Project deleted successfully' };
  }

  /**
   * Get project members (requires MEMBER access)
   */
  async getProjectMembers(projectId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId, ProjectRole.MEMBER);

    const members = await this.prisma.projectMember.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: [
        {
          role: 'desc', // OWNER first, then MAINTAINER, then MEMBER
        },
        {
          createdAt: 'asc',
        },
      ],
    });

    return members;
  }

  /**
   * Add member to project (requires MAINTAINER access)
   */
  async addProjectMember(projectId: string, dto: AddMemberDto, userId: string) {
    await this.verifyProjectAccess(projectId, userId, ProjectRole.MAINTAINER);

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if already a member
    const existingMembership = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: dto.userId,
        deletedAt: null,
      },
    });

    if (existingMembership) {
      throw new ForbiddenException('User is already a project member');
    }

    const member = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: dto.userId,
        role: dto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Add new member to project conversation
    const projectConversation = await this.prisma.conversation.findFirst({
      where: {
        projectId,
        type: ConversationType.PROJECT,
        deletedAt: null,
      },
    });

    if (projectConversation) {
      // Check if already a participant
      const existingParticipant =
        await this.prisma.conversationParticipant.findFirst({
          where: {
            conversationId: projectConversation.id,
            userId: dto.userId,
          },
        });

      if (!existingParticipant) {
        await this.prisma.conversationParticipant.create({
          data: {
            conversationId: projectConversation.id,
            userId: dto.userId,
          },
        });
      }
    }

    // Invalidate cache for requester and new member
    await this.invalidateUserProjectsCache([userId, dto.userId]);

    return member;
  }

  async inviteProjectMember(
    projectId: string,
    email: string,
    role: ProjectRole,
    inviterId: string,
  ) {
    await this.verifyProjectAccess(
      projectId,
      inviterId,
      ProjectRole.MAINTAINER,
    );

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException('No user found with this email address');
    }

    // Check if already a member
    const existingMembership = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: user.id,
        deletedAt: null,
      },
    });

    if (existingMembership) {
      throw new ForbiddenException('This user is already a project member');
    }

    const member = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: user.id,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Add new member to project conversation
    const projectConversation = await this.prisma.conversation.findFirst({
      where: {
        projectId,
        type: ConversationType.PROJECT,
        deletedAt: null,
      },
    });

    if (projectConversation) {
      // Check if already a participant
      const existingParticipant =
        await this.prisma.conversationParticipant.findFirst({
          where: {
            conversationId: projectConversation.id,
            userId: user.id,
          },
        });

      if (!existingParticipant) {
        await this.prisma.conversationParticipant.create({
          data: {
            conversationId: projectConversation.id,
            userId: user.id,
          },
        });
      }
    }

    // Invalidate cache for inviter and new member
    await this.invalidateUserProjectsCache([inviterId, user.id]);

    return member;
  }

  /**
   * Remove member from project (requires OWNER access)
   */
  async removeProjectMember(
    projectId: string,
    targetUserId: string,
    userId: string,
  ) {
    await this.verifyProjectAccess(projectId, userId, ProjectRole.OWNER);

    // Cannot remove yourself if you're the only owner
    const ownerCount = await this.prisma.projectMember.count({
      where: {
        projectId,
        role: ProjectRole.OWNER,
        deletedAt: null,
      },
    });

    if (ownerCount === 1 && targetUserId === userId) {
      throw new ForbiddenException(
        'Cannot remove the only owner from the project',
      );
    }

    const membership = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: targetUserId,
        deletedAt: null,
      },
    });

    if (!membership) {
      throw new NotFoundException('Member not found in project');
    }

    await this.prisma.projectMember.update({
      where: { id: membership.id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Remove member from project conversation
    const projectConversation = await this.prisma.conversation.findFirst({
      where: {
        projectId,
        type: ConversationType.PROJECT,
        deletedAt: null,
      },
    });

    if (projectConversation) {
      await this.prisma.conversationParticipant.deleteMany({
        where: {
          conversationId: projectConversation.id,
          userId: targetUserId,
        },
      });
    }

    // Invalidate cache for requester and removed member
    await this.invalidateUserProjectsCache([userId, targetUserId]);

    return { message: 'Member removed successfully' };
  }

  // ============================================
  // PROJECT FILE OPERATIONS
  // ============================================

  /**
   * Get all files for a project (tree structure)
   */
  async getProjectFiles(projectId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId, ProjectRole.MEMBER);

    const files = await this.prisma.projectFile.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      orderBy: [{ isFolder: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        path: true,
        name: true,
        isFolder: true,
        mimeType: true,
        parentId: true,
        updatedAt: true,
        lastEditedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return files;
  }

  /**
   * Get file content by ID
   */
  async getProjectFile(projectId: string, fileId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId, ProjectRole.MEMBER);

    const file = await this.prisma.projectFile.findFirst({
      where: {
        id: fileId,
        projectId,
        deletedAt: null,
      },
      include: {
        lastEditedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  /**
   * Get file content by path
   */
  async getProjectFileByPath(projectId: string, path: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId, ProjectRole.MEMBER);

    const file = await this.prisma.projectFile.findFirst({
      where: {
        projectId,
        path,
        deletedAt: null,
      },
      include: {
        lastEditedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  /**
   * Create a new file or folder
   */
  async createProjectFile(
    projectId: string,
    dto: CreateProjectFileDto,
    userId: string,
  ) {
    await this.verifyProjectAccess(projectId, userId, ProjectRole.MEMBER);

    // Check if file already exists at this path
    const existing = await this.prisma.projectFile.findFirst({
      where: {
        projectId,
        path: dto.path,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ForbiddenException('File already exists at this path');
    }

    // If parentId provided, verify it exists and is a folder
    if (dto.parentId) {
      const parent = await this.prisma.projectFile.findFirst({
        where: {
          id: dto.parentId,
          projectId,
          isFolder: true,
          deletedAt: null,
        },
      });

      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }
    }

    const file = await this.prisma.projectFile.create({
      data: {
        projectId,
        path: dto.path,
        name: dto.name,
        isFolder: dto.isFolder || false,
        content: dto.isFolder ? null : dto.content || '',
        mimeType: dto.mimeType,
        parentId: dto.parentId,
        lastEditedByUserId: userId,
      },
      include: {
        lastEditedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return file;
  }

  /**
   * Update file content
   */
  async updateProjectFile(
    projectId: string,
    fileId: string,
    dto: UpdateProjectFileDto,
    userId: string,
  ) {
    await this.verifyProjectAccess(projectId, userId, ProjectRole.MEMBER);

    const file = await this.prisma.projectFile.findFirst({
      where: {
        id: fileId,
        projectId,
        deletedAt: null,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // If renaming, check new path doesn't conflict
    if (dto.path && dto.path !== file.path) {
      const existing = await this.prisma.projectFile.findFirst({
        where: {
          projectId,
          path: dto.path,
          deletedAt: null,
          id: { not: fileId },
        },
      });

      if (existing) {
        throw new ForbiddenException('File already exists at this path');
      }
    }

    const updated = await this.prisma.projectFile.update({
      where: { id: fileId },
      data: {
        name: dto.name,
        content: dto.content,
        path: dto.path,
        parentId: dto.parentId,
        lastEditedByUserId: userId,
      },
      include: {
        lastEditedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Delete a file or folder (soft delete)
   */
  async deleteProjectFile(projectId: string, fileId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId, ProjectRole.MEMBER);

    const file = await this.prisma.projectFile.findFirst({
      where: {
        id: fileId,
        projectId,
        deletedAt: null,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // If folder, also delete all children
    if (file.isFolder) {
      await this.prisma.projectFile.updateMany({
        where: {
          projectId,
          path: { startsWith: file.path + '/' },
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });
    }

    await this.prisma.projectFile.update({
      where: { id: fileId },
      data: {
        deletedAt: new Date(),
      },
    });

    return { message: 'File deleted successfully' };
  }

  /**
   * Initialize default project files (called on project creation)
   */
  async initializeProjectFiles(projectId: string, userId: string) {
    const defaultFiles = [
      {
        path: 'src',
        name: 'src',
        isFolder: true,
        content: null,
      },
      {
        path: 'src/index.ts',
        name: 'index.ts',
        isFolder: false,
        mimeType: 'text/typescript',
        content: `// Welcome to CollabDev+
// Start coding here!

export function main() {
  console.log('Hello, CollabDev+!');
}

main();
`,
      },
      {
        path: 'src/App.tsx',
        name: 'App.tsx',
        isFolder: false,
        mimeType: 'text/typescript',
        content: `import { useState, useEffect } from 'react';

export function App() {
  const [message, setMessage] = useState('Hello, CollabDev+!');

  useEffect(() => {
    console.log('Welcome to collaborative development!');
  }, []);

  return (
    <div className="app">
      <h1>{message}</h1>
      <p>Start building something amazing together!</p>
    </div>
  );
}

export default App;
`,
      },
      {
        path: 'package.json',
        name: 'package.json',
        isFolder: false,
        mimeType: 'application/json',
        content: JSON.stringify(
          {
            name: 'my-project',
            version: '1.0.0',
            description: 'A collaborative project',
            main: 'src/index.ts',
            scripts: {
              start: 'node src/index.ts',
              build: 'tsc',
              test: 'jest',
            },
            dependencies: {},
            devDependencies: {},
          },
          null,
          2,
        ),
      },
      {
        path: 'README.md',
        name: 'README.md',
        isFolder: false,
        mimeType: 'text/markdown',
        content: `# My Project

A collaborative project built with CollabDev+.

## Getting Started

1. Edit files in the workspace
2. Collaborate with your team in real-time
3. Build something amazing!
`,
      },
    ];

    // Get the src folder ID after creation
    let srcFolderId: string | null = null;

    for (const file of defaultFiles) {
      const created = await this.prisma.projectFile.create({
        data: {
          projectId,
          path: file.path,
          name: file.name,
          isFolder: file.isFolder,
          content: file.content,
          mimeType: file.mimeType,
          parentId: file.path.startsWith('src/') ? srcFolderId : null,
          lastEditedByUserId: userId,
        },
      });

      if (file.path === 'src') {
        srcFolderId = created.id;
      }
    }

    return { message: 'Project files initialized' };
  }
}
