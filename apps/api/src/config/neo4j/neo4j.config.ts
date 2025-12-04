import validateConfig from '@/utils/config/validate-config';
import { registerAs } from '@nestjs/config';
import { IsNotEmpty, IsString } from 'class-validator';
import { Neo4jConfig } from './neo4j-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  NEO4J_URI: string;

  @IsString()
  @IsNotEmpty()
  NEO4J_USERNAME: string;

  @IsString()
  @IsNotEmpty()
  NEO4J_PASSWORD: string;
}

export function getConfig(): Neo4jConfig {
  return {
    uri: process.env.NEO4J_URI,
    username: process.env.NEO4J_USERNAME,
    password: process.env.NEO4J_PASSWORD,
  };
}

export default registerAs<Neo4jConfig>('neo4j', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  return getConfig();
});
