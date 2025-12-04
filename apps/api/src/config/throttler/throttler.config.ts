import validateConfig from '@/utils/config/validate-config';
import { registerAs } from '@nestjs/config';
import { seconds } from '@nestjs/throttler';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import process from 'node:process';
import { ThrottlerConfig } from './throttler-config.type';

class ThrottlerValidator {
  @IsBoolean()
  @IsOptional()
  THROTTLER_ENABLED: boolean;

  @IsNumber()
  @IsOptional()
  THROTTLER_LIMIT: number;

  @IsNumber()
  @IsOptional()
  THROTTLER_TTL: number;
}

export function getConfig(): ThrottlerConfig {
  const enabled = process.env.THROTTLER_ENABLED === 'true';
  return {
    enabled: enabled,
    limit: Number.parseInt(process.env.THROTTLER_LIMIT),
    ttl: enabled ? seconds(Number.parseInt(process.env.THROTTLER_TTL)) : 0,
  };
}

export default registerAs<ThrottlerConfig>('throttler', () => {
  validateConfig(process.env, ThrottlerValidator);
  return getConfig();
});
