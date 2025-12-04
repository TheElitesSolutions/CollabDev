import { BullModule } from '@nestjs/bullmq';
import type {
  MiddlewareConsumer,
  NestModule,
  OnModuleInit,
} from '@nestjs/common';
import { Global, Inject, Logger, Module } from '@nestjs/common';
import {
  DiscoveryModule,
  DiscoveryService,
  MetadataScanner,
} from '@nestjs/core';
import { betterAuth, type Auth } from 'better-auth';

import { getConfig as getBetterAuthConfig } from '@/config/auth/better-auth.config';
import { GlobalConfig } from '@/config/config.type';
import {
  AFTER_HOOK_KEY,
  AUTH_INSTANCE_KEY,
  BEFORE_HOOK_KEY,
  HOOK_KEY,
} from '@/constants/auth.constant';
import { Queue } from '@/constants/job.constant';
import { PrismaModule } from '@/database/prisma.module';
import { PrismaService } from '@/database/prisma.service';
import { CacheModule } from '@/shared/cache/cache.module';
import { CacheService } from '@/shared/cache/cache.service';
import { ConfigService } from '@nestjs/config';
import { createAuthMiddleware } from 'better-auth/plugins';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BetterAuthService } from './better-auth.service';

const HOOKS = [
  { metadataKey: BEFORE_HOOK_KEY, hookType: 'before' as const },
  { metadataKey: AFTER_HOOK_KEY, hookType: 'after' as const },
];

@Global()
@Module({
  imports: [
    DiscoveryModule,
    BullModule.registerQueue({
      name: Queue.Email,
    }),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule implements NestModule, OnModuleInit {
  private logger = new Logger(this.constructor.name);

  constructor(
    @Inject(AUTH_INSTANCE_KEY) private readonly auth: Auth,
    @Inject(DiscoveryService)
    private discoveryService: DiscoveryService,
    @Inject(MetadataScanner)
    private metadataScanner: MetadataScanner,
  ) {}

  onModuleInit() {
    if (!this.auth.options.hooks) return;

    const providers = this.discoveryService
      .getProviders()
      .filter(
        ({ metatype }) => metatype && Reflect.getMetadata(HOOK_KEY, metatype),
      );

    for (const provider of providers) {
      const providerPrototype = Object.getPrototypeOf(provider.instance);
      const methods = this.metadataScanner.getAllMethodNames(providerPrototype);

      for (const method of methods) {
        const providerMethod = providerPrototype[method];
        this.setupHooks(providerMethod);
      }
    }
  }

  configure(_: MiddlewareConsumer) {
    // Middleware configuration if needed
  }

  private setupHooks(providerMethod: (ctx: any) => Promise<void>) {
    if (!this.auth.options.hooks) return;

    for (const { metadataKey, hookType } of HOOKS) {
      const hookPath = Reflect.getMetadata(metadataKey, providerMethod);
      if (!hookPath) continue;

      const originalHook = this.auth.options.hooks[hookType];
      this.auth.options.hooks[hookType] = createAuthMiddleware(async (ctx) => {
        if (originalHook) {
          await originalHook(ctx);
        }

        if (hookPath === ctx.path) {
          await providerMethod(ctx);
        }
      });
    }
  }

  static forRootAsync() {
    return {
      global: true,
      module: AuthModule,
      imports: [CacheModule],
      providers: [
        {
          provide: AUTH_INSTANCE_KEY,
          useFactory: async (
            cacheService: CacheService,
            configService: ConfigService<GlobalConfig>,
            authService: AuthService,
            prismaService: PrismaService,
          ) => {
            const config = getBetterAuthConfig({
              cacheService,
              configService,
              authService,
              prismaService,
            });
            return betterAuth(config);
          },
          inject: [CacheService, ConfigService, AuthService, PrismaService],
        },
        BetterAuthService,
      ],
      exports: [AUTH_INSTANCE_KEY, BetterAuthService],
    };
  }
}
