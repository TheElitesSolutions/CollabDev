import { Neo4jService } from '@/database/neo4j/neo4j.service';
import { PrismaService } from '@/database/prisma.service';
import { CacheService } from '@/shared/cache/cache.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectRole } from '@prisma/client';
import { ProjectService } from './project.service';

describe('ProjectService', () => {
  let service: ProjectService;

  const mockPrismaService = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    projectMember: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    projectFile: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(mockPrismaService)),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delete: jest.fn(),
    delByPattern: jest.fn(),
  };

  const mockNeo4jService = {
    read: jest.fn(),
    write: jest.fn(),
    close: jest.fn(),
    getDriver: jest.fn(),
    createProjectNode: jest.fn(),
    updateProjectNode: jest.fn(),
    deleteProjectNode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: Neo4jService,
          useValue: mockNeo4jService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProject', () => {
    const userId = 'user-123';
    const createDto = { name: 'Test Project', description: 'Test description' };

    it('should create a project with owner membership', async () => {
      const mockProject = {
        id: 'project-123',
        name: createDto.name,
        description: createDto.description,
        ownerId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        members: [
          {
            id: 'member-123',
            userId,
            role: ProjectRole.OWNER,
            user: { id: userId, email: 'test@test.com' },
          },
        ],
      };

      mockPrismaService.project.create.mockResolvedValue(mockProject);
      mockNeo4jService.createProjectNode.mockResolvedValue(undefined);
      mockCacheService.delete.mockResolvedValue(true);

      const result = await service.createProject(createDto, userId);

      expect(result).toEqual(mockProject);
      expect(mockPrismaService.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: createDto.name,
          description: createDto.description,
          createdByUserId: userId,
        }),
        include: expect.any(Object),
      });
    });
  });

  describe('findMyProjects', () => {
    const userId = 'user-123';

    it('should return cached projects if available', async () => {
      const cachedProjects = [{ id: 'project-1', name: 'Cached Project' }];
      mockCacheService.get.mockResolvedValue(cachedProjects);

      const result = await service.findMyProjects(userId);

      expect(result).toEqual(cachedProjects);
      expect(mockPrismaService.projectMember.findMany).not.toHaveBeenCalled();
    });

    it('should fetch and cache projects if not cached', async () => {
      const mockMemberships = [
        {
          id: 'member-1',
          role: ProjectRole.OWNER,
          project: {
            id: 'project-1',
            name: 'Test Project',
            _count: { members: 2 },
          },
        },
      ];
      mockCacheService.get.mockResolvedValue(null);
      mockPrismaService.projectMember.findMany.mockResolvedValue(
        mockMemberships,
      );
      mockCacheService.set.mockResolvedValue(true);

      const result = await service.findMyProjects(userId);

      expect(result).toEqual([
        {
          id: 'project-1',
          name: 'Test Project',
          _count: { members: 2 },
          myRole: ProjectRole.OWNER,
          memberCount: 2,
        },
      ]);
      expect(mockPrismaService.projectMember.findMany).toHaveBeenCalled();
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe('inviteProjectMember', () => {
    const projectId = 'project-123';
    const inviterId = 'inviter-123';
    const inviteeEmail = 'invitee@test.com';
    const inviteeRole = ProjectRole.MEMBER;

    it('should throw NotFoundException if user not found by email', async () => {
      mockPrismaService.projectMember.findFirst.mockResolvedValue({
        role: ProjectRole.OWNER,
      });
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.inviteProjectMember(
          projectId,
          inviteeEmail,
          inviteeRole,
          inviterId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is already a member', async () => {
      const existingUser = { id: 'invitee-123', email: inviteeEmail };
      mockPrismaService.projectMember.findFirst
        .mockResolvedValueOnce({ role: ProjectRole.OWNER }) // For access check
        .mockResolvedValueOnce({ id: 'existing-member' }); // For existing membership check
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);

      await expect(
        service.inviteProjectMember(
          projectId,
          inviteeEmail,
          inviteeRole,
          inviterId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create project member when valid', async () => {
      const existingUser = { id: 'invitee-123', email: inviteeEmail };
      const newMember = {
        id: 'member-123',
        userId: existingUser.id,
        projectId,
        role: inviteeRole,
        user: existingUser,
      };

      mockPrismaService.projectMember.findFirst
        .mockResolvedValueOnce({ role: ProjectRole.OWNER }) // For access check
        .mockResolvedValueOnce(null); // No existing membership
      mockPrismaService.user.findUnique.mockResolvedValue(existingUser);
      mockPrismaService.projectMember.create.mockResolvedValue(newMember);
      mockCacheService.delete.mockResolvedValue(true);

      const result = await service.inviteProjectMember(
        projectId,
        inviteeEmail,
        inviteeRole,
        inviterId,
      );

      expect(result).toEqual(newMember);
      expect(mockPrismaService.projectMember.create).toHaveBeenCalledWith({
        data: {
          projectId,
          userId: existingUser.id,
          role: inviteeRole,
        },
        include: expect.any(Object),
      });
    });
  });

  describe('verifyProjectAccess', () => {
    const projectId = 'project-123';
    const userId = 'user-123';

    it('should throw ForbiddenException if user is not a member', async () => {
      mockPrismaService.projectMember.findFirst.mockResolvedValue(null);

      await expect(service.findProject(projectId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if user role is insufficient', async () => {
      mockPrismaService.projectMember.findFirst.mockResolvedValue({
        role: ProjectRole.MEMBER,
      });

      // Try to add a member as a regular MEMBER (should fail)
      await expect(
        service.addProjectMember(
          projectId,
          { userId: 'new-user', role: ProjectRole.MEMBER },
          userId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
