import { AuthGuard } from '@/auth/auth.guard';
import { BetterAuthService } from '@/auth/better-auth.service';
import { PrismaService } from '@/database/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { CacheService } from '../cache/cache.service';
import { SocketGateway } from './socket.gateway';

describe('SocketGateway', () => {
  let gateway: SocketGateway;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delete: jest.fn(),
    getTtl: jest.fn(),
  };

  const mockBetterAuthService = {
    api: {
      getSession: jest.fn(),
    },
  };

  const mockPrismaService = {
    projectMember: {
      findFirst: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const createMockSocket = (id: string, userId?: string) =>
    ({
      id,
      session: userId ? { user: { id: userId, email: 'test@test.com' } } : null,
      emit: jest.fn(),
      send: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      to: jest.fn().mockReturnThis(),
      handshake: {
        headers: {},
      },
    }) as unknown as Socket;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocketGateway,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: BetterAuthService,
          useValue: mockBetterAuthService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    gateway = module.get<SocketGateway>(SocketGateway);

    // Set up mock server
    const mockServer = {
      use: jest.fn(),
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    } as unknown as Server;
    (gateway as any).server = mockServer;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should add client to cache on connection', async () => {
      const socket = createMockSocket('socket-123', 'user-123');
      mockCacheService.get.mockResolvedValue([]);
      mockCacheService.set.mockResolvedValue(true);

      await gateway.handleConnection(socket as any);

      expect(mockCacheService.get).toHaveBeenCalledWith({
        key: 'UserSocketClients',
        args: ['user-123'],
      });
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should not add client if no user session', async () => {
      const socket = createMockSocket('socket-123');

      await gateway.handleConnection(socket as any);

      expect(mockCacheService.get).not.toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove client from cache on disconnect', async () => {
      const socket = createMockSocket('socket-123', 'user-123');
      mockCacheService.get.mockResolvedValue(['socket-123', 'socket-456']);
      mockCacheService.set.mockResolvedValue(true);

      await gateway.handleDisconnect(socket as any);

      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should not remove client if not in cache', async () => {
      const socket = createMockSocket('socket-123', 'user-123');
      mockCacheService.get.mockResolvedValue(['socket-456']);
      mockCacheService.set.mockResolvedValue(true);

      await gateway.handleDisconnect(socket as any);

      // Should not have been called since socket-123 isn't in the set
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('handlePing', () => {
    it('should respond with pong', async () => {
      const socket = createMockSocket('socket-123', 'user-123');

      await gateway.handlePing(socket as any);

      expect(socket.send).toHaveBeenCalledWith('pong');
    });
  });

  describe('handleMessage', () => {
    it('should send hello world response', () => {
      const socket = createMockSocket('socket-123', 'user-123');
      const message = { text: 'test' };
      const user = { id: 'user-123', email: 'test@test.com' };

      gateway.handleMessage(socket as any, message, user as any);

      expect(socket.send).toHaveBeenCalledWith('hello world');
    });
  });

  describe('handleChatMessage', () => {
    it('should emit error if user is not a project member', async () => {
      const socket = createMockSocket('socket-123', 'user-123');
      const data = { projectId: 'project-123', content: 'Hello!' };
      const user = { id: 'user-123', email: 'test@test.com' };

      mockPrismaService.projectMember.findFirst.mockResolvedValue(null);

      await gateway.handleChatMessage(data, socket as any, user as any);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        message: 'Access denied to project',
      });
    });

    it('should broadcast message if user is a project member', async () => {
      const socket = createMockSocket('socket-123', 'user-123');
      const data = { projectId: 'project-123', content: 'Hello!' };
      const user = { id: 'user-123', email: 'test@test.com' };
      const mockServer = (gateway as any).server;

      mockPrismaService.projectMember.findFirst.mockResolvedValue({
        id: 'member-123',
        userId: 'user-123',
        projectId: 'project-123',
      });

      await gateway.handleChatMessage(data, socket as any, user as any);

      expect(mockServer.to).toHaveBeenCalledWith('project:project-123');
    });
  });

  describe('handleJoinProject', () => {
    it('should emit error if user is not a project member', async () => {
      const socket = createMockSocket('socket-123', 'user-123');
      const data = { projectId: 'project-123' };
      const user = { id: 'user-123', email: 'test@test.com' };

      mockPrismaService.projectMember.findFirst.mockResolvedValue(null);

      await gateway.handleJoinProject(data, socket as any, user as any);

      expect(socket.emit).toHaveBeenCalledWith('error', {
        message: 'Access denied to project',
      });
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('should join project room if user is a member', async () => {
      const socket = createMockSocket('socket-123', 'user-123');
      const data = { projectId: 'project-123' };
      const user = { id: 'user-123', email: 'test@test.com' };

      mockPrismaService.projectMember.findFirst.mockResolvedValue({
        id: 'member-123',
        userId: 'user-123',
        projectId: 'project-123',
      });
      mockCacheService.get.mockResolvedValue([]);
      mockCacheService.set.mockResolvedValue(true);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await gateway.handleJoinProject(data, socket as any, user as any);

      expect(socket.join).toHaveBeenCalledWith('project:project-123');
    });
  });

  describe('handleLeaveProject', () => {
    it('should leave project room', async () => {
      const socket = createMockSocket('socket-123', 'user-123');
      const data = { projectId: 'project-123' };
      const user = { id: 'user-123', email: 'test@test.com' };

      mockCacheService.get.mockResolvedValue(['user-123']);
      mockCacheService.set.mockResolvedValue(true);
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await gateway.handleLeaveProject(data, socket as any, user as any);

      expect(socket.leave).toHaveBeenCalledWith('project:project-123');
    });
  });

  describe('getClient', () => {
    it('should return undefined for unknown client', () => {
      const result = gateway.getClient('unknown-id');

      expect(result).toBeUndefined();
    });
  });

  describe('getAllClients', () => {
    it('should return clients map', () => {
      const clients = gateway.getAllClients();

      expect(clients).toBeDefined();
      expect(clients instanceof Map).toBe(true);
    });
  });
});
