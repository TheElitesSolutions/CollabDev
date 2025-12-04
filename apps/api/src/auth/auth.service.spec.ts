import { Queue } from '@/constants/job.constant';
import { PrismaService } from '@/database/prisma.service';
import { CacheService } from '@/shared/cache/cache.service';
import { getQueueToken } from '@nestjs/bullmq';
import { HttpException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  const mockEmailQueue = {
    add: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    getTtl: jest.fn(),
    del: jest.fn(),
    delete: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getQueueToken(Queue.Email),
          useValue: mockEmailQueue,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendSigninMagicLink', () => {
    const email = 'test@test.com';
    const url = 'http://localhost:3000/magic-link/verify?token=abc123';

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.sendSigninMagicLink({ email, url })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw HttpException if rate limited', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-123' });
      mockCacheService.getTtl.mockResolvedValue(15000); // 15 seconds remaining

      await expect(service.sendSigninMagicLink({ email, url })).rejects.toThrow(
        HttpException,
      );
    });

    it('should queue email and set cache if not rate limited', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-123' });
      mockCacheService.getTtl.mockResolvedValue(null);
      mockEmailQueue.add.mockResolvedValue({});
      mockCacheService.set.mockResolvedValue(true);

      await service.sendSigninMagicLink({ email, url });

      expect(mockEmailQueue.add).toHaveBeenCalledWith('signin-magic-link', {
        email,
        url,
      });
      expect(mockCacheService.set).toHaveBeenCalled();
    });

    it('should allow sending if TTL is 0', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'user-123' });
      mockCacheService.getTtl.mockResolvedValue(0);
      mockEmailQueue.add.mockResolvedValue({});
      mockCacheService.set.mockResolvedValue(true);

      await service.sendSigninMagicLink({ email, url });

      expect(mockEmailQueue.add).toHaveBeenCalled();
    });
  });

  describe('verifyEmail', () => {
    const userId = 'user-123';
    const url = 'http://localhost:3000/verify-email?token=abc123';

    it('should throw HttpException if rate limited', async () => {
      mockCacheService.getTtl.mockResolvedValue(20000); // 20 seconds remaining

      await expect(service.verifyEmail({ url, userId })).rejects.toThrow(
        HttpException,
      );
    });

    it('should queue email verification and set cache if not rate limited', async () => {
      mockCacheService.getTtl.mockResolvedValue(null);
      mockEmailQueue.add.mockResolvedValue({});
      mockCacheService.set.mockResolvedValue(true);

      await service.verifyEmail({ url, userId });

      expect(mockEmailQueue.add).toHaveBeenCalledWith('email-verification', {
        url,
        userId,
      });
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    const userId = 'user-123';
    const url = 'http://localhost:3000/reset-password?token=abc123';

    it('should throw HttpException if rate limited', async () => {
      mockCacheService.getTtl.mockResolvedValue(25000); // 25 seconds remaining

      await expect(service.resetPassword({ url, userId })).rejects.toThrow(
        HttpException,
      );
    });

    it('should queue reset password email and set cache if not rate limited', async () => {
      mockCacheService.getTtl.mockResolvedValue(null);
      mockEmailQueue.add.mockResolvedValue({});
      mockCacheService.set.mockResolvedValue(true);

      await service.resetPassword({ url, userId });

      expect(mockEmailQueue.add).toHaveBeenCalledWith('reset-password', {
        url,
        userId,
      });
      expect(mockCacheService.set).toHaveBeenCalled();
    });
  });

  describe('createBasicAuthHeaders', () => {
    it('should create valid basic auth headers', () => {
      mockConfigService.getOrThrow
        .mockReturnValueOnce('admin')
        .mockReturnValueOnce('secret123');

      const result = service.createBasicAuthHeaders();

      const expectedBase64 = Buffer.from('admin:secret123').toString('base64');
      expect(result).toEqual({
        Authorization: `Basic ${expectedBase64}`,
      });
    });

    it('should throw if username is missing', () => {
      mockConfigService.getOrThrow.mockImplementation(() => {
        throw new Error('Config not found');
      });

      expect(() => service.createBasicAuthHeaders()).toThrow();
    });
  });
});
