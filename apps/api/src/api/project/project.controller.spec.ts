import { AuthGuard } from '@/auth/auth.guard';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { Test, TestingModule } from '@nestjs/testing';
import { ProjectRole } from '@prisma/client';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

describe('ProjectController', () => {
  let controller: ProjectController;
  let _projectService: ProjectService;

  const mockProjectService = {
    createProject: jest.fn(),
    findMyProjects: jest.fn(),
    findProject: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn(),
    getProjectMembers: jest.fn(),
    addProjectMember: jest.fn(),
    inviteProjectMember: jest.fn(),
    removeProjectMember: jest.fn(),
    getProjectFiles: jest.fn(),
    getProjectFile: jest.fn(),
    createProjectFile: jest.fn(),
    updateProjectFile: jest.fn(),
    deleteProjectFile: jest.fn(),
    initializeProjectFiles: jest.fn(),
  };

  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@test.com',
      name: 'Test User',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      image: null,
    },
    session: {
      id: 'session-123',
      userId: 'user-123',
      token: 'token-123',
      expiresAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
    },
  } as unknown as CurrentUserSession;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [
        {
          provide: ProjectService,
          useValue: mockProjectService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProjectController>(ProjectController);
    _projectService = module.get<ProjectService>(ProjectService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createProject', () => {
    it('should create a project', async () => {
      const createDto = { name: 'Test Project', description: 'Test desc' };
      const mockProject = { id: 'project-123', ...createDto };

      mockProjectService.createProject.mockResolvedValue(mockProject);

      const result = await controller.createProject(createDto, mockSession);

      expect(result).toEqual(mockProject);
      expect(mockProjectService.createProject).toHaveBeenCalledWith(
        createDto,
        mockSession.user.id,
      );
    });
  });

  describe('findMyProjects', () => {
    it('should return user projects', async () => {
      const mockProjects = [
        { id: 'project-1', name: 'Project 1' },
        { id: 'project-2', name: 'Project 2' },
      ];

      mockProjectService.findMyProjects.mockResolvedValue(mockProjects);

      const result = await controller.findMyProjects(mockSession);

      expect(result).toEqual(mockProjects);
      expect(mockProjectService.findMyProjects).toHaveBeenCalledWith(
        mockSession.user.id,
      );
    });
  });

  describe('findProject', () => {
    it('should return a single project', async () => {
      const projectId = 'project-123';
      const mockProject = { id: projectId, name: 'Test Project' };

      mockProjectService.findProject.mockResolvedValue(mockProject);

      const result = await controller.findProject(projectId, mockSession);

      expect(result).toEqual(mockProject);
      expect(mockProjectService.findProject).toHaveBeenCalledWith(
        projectId,
        mockSession.user.id,
      );
    });
  });

  describe('updateProject', () => {
    it('should update a project', async () => {
      const projectId = 'project-123';
      const updateDto = { name: 'Updated Name' };
      const mockProject = { id: projectId, ...updateDto };

      mockProjectService.updateProject.mockResolvedValue(mockProject);

      const result = await controller.updateProject(
        projectId,
        updateDto,
        mockSession,
      );

      expect(result).toEqual(mockProject);
      expect(mockProjectService.updateProject).toHaveBeenCalledWith(
        projectId,
        updateDto,
        mockSession.user.id,
      );
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      const projectId = 'project-123';

      mockProjectService.deleteProject.mockResolvedValue(undefined);

      await controller.deleteProject(projectId, mockSession);

      expect(mockProjectService.deleteProject).toHaveBeenCalledWith(
        projectId,
        mockSession.user.id,
      );
    });
  });

  describe('getProjectMembers', () => {
    it('should return project members', async () => {
      const projectId = 'project-123';
      const mockMembers = [
        { id: 'member-1', userId: 'user-1', role: ProjectRole.OWNER },
        { id: 'member-2', userId: 'user-2', role: ProjectRole.MEMBER },
      ];

      mockProjectService.getProjectMembers.mockResolvedValue(mockMembers);

      const result = await controller.getProjectMembers(projectId, mockSession);

      expect(result).toEqual(mockMembers);
      expect(mockProjectService.getProjectMembers).toHaveBeenCalledWith(
        projectId,
        mockSession.user.id,
      );
    });
  });

  describe('addProjectMember', () => {
    it('should add a member to the project', async () => {
      const projectId = 'project-123';
      const addDto = { userId: 'new-user', role: ProjectRole.MEMBER };
      const mockMember = { id: 'member-123', ...addDto };

      mockProjectService.addProjectMember.mockResolvedValue(mockMember);

      const result = await controller.addProjectMember(
        projectId,
        addDto,
        mockSession,
      );

      expect(result).toEqual(mockMember);
      expect(mockProjectService.addProjectMember).toHaveBeenCalledWith(
        projectId,
        addDto,
        mockSession.user.id,
      );
    });
  });

  describe('inviteProjectMember', () => {
    it('should invite a member by email', async () => {
      const projectId = 'project-123';
      const inviteDto = { email: 'invite@test.com', role: ProjectRole.MEMBER };
      const mockMember = {
        id: 'member-123',
        userId: 'invited-user',
        role: inviteDto.role,
      };

      mockProjectService.inviteProjectMember.mockResolvedValue(mockMember);

      const result = await controller.inviteProjectMember(
        projectId,
        inviteDto,
        mockSession,
      );

      expect(result).toEqual(mockMember);
      expect(mockProjectService.inviteProjectMember).toHaveBeenCalledWith(
        projectId,
        inviteDto.email,
        inviteDto.role,
        mockSession.user.id,
      );
    });
  });

  describe('removeProjectMember', () => {
    it('should remove a member from the project', async () => {
      const projectId = 'project-123';
      const userIdToRemove = 'user-to-remove';

      mockProjectService.removeProjectMember.mockResolvedValue(undefined);

      await controller.removeProjectMember(
        projectId,
        userIdToRemove,
        mockSession,
      );

      expect(mockProjectService.removeProjectMember).toHaveBeenCalledWith(
        projectId,
        userIdToRemove,
        mockSession.user.id,
      );
    });
  });

  describe('getProjectFiles', () => {
    it('should return project files', async () => {
      const projectId = 'project-123';
      const mockFiles = [
        { id: 'file-1', name: 'index.ts' },
        { id: 'file-2', name: 'app.ts' },
      ];

      mockProjectService.getProjectFiles.mockResolvedValue(mockFiles);

      const result = await controller.getProjectFiles(projectId, mockSession);

      expect(result).toEqual(mockFiles);
      expect(mockProjectService.getProjectFiles).toHaveBeenCalledWith(
        projectId,
        mockSession.user.id,
      );
    });
  });

  describe('createProjectFile', () => {
    it('should create a project file', async () => {
      const projectId = 'project-123';
      const createDto = {
        name: 'new-file.ts',
        path: '/new-file.ts',
        content: 'console.log("hi")',
      };
      const mockFile = { id: 'file-123', ...createDto };

      mockProjectService.createProjectFile.mockResolvedValue(mockFile);

      const result = await controller.createProjectFile(
        projectId,
        createDto,
        mockSession,
      );

      expect(result).toEqual(mockFile);
      expect(mockProjectService.createProjectFile).toHaveBeenCalledWith(
        projectId,
        createDto,
        mockSession.user.id,
      );
    });
  });
});
