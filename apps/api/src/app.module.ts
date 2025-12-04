import appConfig from '@/config/app/app.config';
import authConfig from '@/config/auth/auth.config';
import databaseConfig from '@/config/database/database.config';
import mailConfig from '@/config/mail/mail.config';
import neo4jConfig from '@/config/neo4j/neo4j.config';
import redisConfig from '@/config/redis/redis.config';
import { BullModule } from '@nestjs/bullmq';
import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { LoggerModule } from 'nestjs-pino';

import { GracefulShutdownModule } from 'nestjs-graceful-shutdown';
import { ApiModule } from './api/api.module';
import { AuthModule } from './auth/auth.module';
import { default as awsConfig } from './config/aws/aws.config';
import { default as bullConfig } from './config/bull/bull.config';
import { default as useBullFactory } from './config/bull/bull.factory';
import grafanaConfig from './config/grafana/grafana.config';
import { default as sentryConfig } from './config/sentry/sentry.config';
import { default as throttlerConfig } from './config/throttler/throttler.config';
import { default as useThrottlerFactory } from './config/throttler/throttler.factory';
import { AppThrottlerGuard } from './config/throttler/throttler.guard';
import { Neo4jModule } from './database/neo4j/neo4j.module';
import { PrismaModule } from './database/prisma.module';
import { default as useI18nFactory } from './i18n/i18n.factory';
import { CacheModule as CacheManagerModule } from './shared/cache/cache.module';
import { MailModule } from './shared/mail/mail.module';
import { SocketModule } from './shared/socket/socket.module';
import { default as useLoggerFactory } from './tools/logger/logger-factory';
import { WorkerModule } from './worker/worker.module';

@Module({})
export class AppModule {
  private static common(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            appConfig,
            databaseConfig,
            redisConfig,
            neo4jConfig,
            authConfig,
            mailConfig,
            bullConfig,
            sentryConfig,
            throttlerConfig,
            awsConfig,
            grafanaConfig,
          ],
          envFilePath: ['.env'],
        }),
        GracefulShutdownModule.forRoot({
          cleanup: (...args) => {
            // eslint-disable-next-line no-console
            console.log('App shutting down...', args);
          },
        }),
        LoggerModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: useLoggerFactory,
        }),
        PrismaModule,
        Neo4jModule,
        BullModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: useBullFactory,
        }),
        PrometheusModule.register(),
        CacheManagerModule,
        MailModule,
      ],
    };
  }
  static main(): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ...AppModule.common().imports,
        I18nModule.forRootAsync({
          resolvers: [
            { use: QueryResolver, options: ['lang'] },
            AcceptLanguageResolver,
            new HeaderResolver(['x-lang']),
          ],
          inject: [ConfigService],
          useFactory: useI18nFactory,
        }),
        ThrottlerModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: useThrottlerFactory,
        }),
        ApiModule,
        AuthModule.forRootAsync(),
        SocketModule,
      ],
      providers: [
        {
          provide: APP_GUARD,
          useClass: AppThrottlerGuard,
        },
      ],
    };
  }

  static worker(): DynamicModule {
    return {
      module: AppModule,
      imports: [...AppModule.common().imports, WorkerModule],
    };
  }
}
