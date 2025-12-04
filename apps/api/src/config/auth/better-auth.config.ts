import { AuthService } from '@/auth/auth.service';
import { GlobalConfig } from '@/config/config.type';
import { PrismaService } from '@/database/prisma.service';
import { CacheService } from '@/shared/cache/cache.service';
import { validateUsername } from '@/utils/validators/username';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { magicLink, openAPI, twoFactor, username } from 'better-auth/plugins';
import { passkey } from 'better-auth/plugins/passkey';
import { BetterAuthOptions, BetterAuthPlugin } from 'better-auth/types';
import { v4 as uuid } from 'uuid';

const logger = new Logger('BetterAuthConfig');

/**
 * Better Auth Configuration
 * Visit https://www.better-auth.com/docs/reference/options to see full options
 * Visit `/api/auth/reference` to see all the API references integrated in this better auth instance
 */
export function getConfig({
  configService,
  cacheService,
  authService,
  prismaService,
}: {
  configService: ConfigService<GlobalConfig>;
  cacheService: CacheService;
  authService: AuthService;
  prismaService: PrismaService;
}): BetterAuthOptions {
  const appConfig = configService.getOrThrow('app', { infer: true });
  const authConfig = configService.getOrThrow('auth', { infer: true });

  // Core plugins
  const plugins: BetterAuthPlugin[] = [
    username({ usernameValidator: validateUsername }),
    magicLink({
      disableSignUp: true,
      async sendMagicLink({ email, url }) {
        // Fire-and-forget: email sends in background, handler returns immediately
        void authService.sendSigninMagicLink({ email, url }).catch((error) => {
          logger.error(`Magic link email failed: ${error.message}`);
        });
      },
    }),
    twoFactor(),
    passkey({
      rpName: appConfig.name,
    }),
  ];

  // Plugins for development only
  const nonProdPlugins = [openAPI()];
  if (appConfig.nodeEnv !== 'production') {
    plugins.push(...nonProdPlugins);
  }

  return {
    appName: appConfig.name,
    secret: authConfig.authSecret,
    baseURL: appConfig.url,
    plugins,
    database: prismaAdapter(prismaService, {
      provider: 'postgresql',
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      requireEmailVerification: false, // Disabled for development
      sendResetPassword: async ({ url, user }) => {
        // Fire-and-forget: email sends in background, handler returns immediately
        void authService
          .resetPassword({ url, userId: user.id })
          .catch((error) => {
            logger.error(`Password reset email failed: ${error.message}`);
          });
      },
    },
    session: {
      freshAge: 0, // We perform every sensitive operation via our own API so this is irrelevant.
    },
    user: {
      fields: {
        name: 'firstName',
        emailVerified: 'isEmailVerified',
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        // Fire-and-forget: email sends in background, handler returns immediately
        void authService
          .verifyEmail({ url, userId: user.id })
          .catch((error) => {
            logger.error(`Email verification failed: ${error.message}`);
          });
      },
    },
    trustedOrigins: appConfig.corsOrigin as string[],
    socialProviders: {
      ...(authConfig.oAuth.github?.clientId &&
      authConfig.oAuth.github?.clientSecret
        ? {
            github: {
              clientId: authConfig.oAuth.github?.clientId,
              clientSecret: authConfig.oAuth.github?.clientSecret,
              mapProfileToUser(profile) {
                return {
                  email: profile.email,
                  name: profile.login,
                  username: profile.login,
                  emailVerified: true,
                  image: profile.avatar_url,
                };
              },
            },
          }
        : {}),
    },
    advanced: {
      database: {
        generateId() {
          return uuid();
        },
      },
      cookiePrefix: 'TmVzdEpTIEJvaWxlcnBsYXRl',
    },
    // Use Redis for storing sessions
    secondaryStorage: {
      get: async (key) => {
        try {
          return (
            (await cacheService.get({ key: 'AccessToken', args: [key] })) ??
            null
          );
        } catch (error) {
          logger.warn(`Secondary storage get failed: ${error.message}`);
          return null; // Graceful fallback - auth uses primary DB
        }
      },
      set: async (key, value, ttl) => {
        try {
          await cacheService.set(
            { key: 'AccessToken', args: [key] },
            value,
            ttl
              ? {
                  ttl: ttl * 1000,
                }
              : {},
          );
        } catch (error) {
          logger.warn(`Secondary storage set failed: ${error.message}`);
          // Non-critical failure - session still stored in primary DB
        }
      },
      delete: async (key) => {
        try {
          await cacheService.delete({ key: 'AccessToken', args: [key] });
        } catch (error) {
          logger.warn(`Secondary storage delete failed: ${error.message}`);
          // Non-critical failure
        }
      },
    },
  };
}
