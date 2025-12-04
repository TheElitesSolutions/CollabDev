import { GlobalConfig } from '@/config/config.type';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private driver: Driver;
  private readonly logger = new Logger(Neo4jService.name);

  constructor(private readonly configService: ConfigService<GlobalConfig>) {}

  async onModuleInit() {
    const uri = this.configService.get('neo4j.uri', { infer: true });
    const username = this.configService.get('neo4j.username', { infer: true });
    const password = this.configService.get('neo4j.password', { infer: true });

    try {
      this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
      await this.driver.verifyConnectivity();
      this.logger.log('Neo4j connection established successfully');
    } catch (error) {
      this.logger.error('Failed to connect to Neo4j', error.message);
      this.logger.warn('Application will continue without Neo4j');
    }
  }

  async onModuleDestroy() {
    if (this.driver) {
      await this.driver.close();
      this.logger.log('Neo4j connection closed');
    }
  }

  private getSession(): Session | null {
    if (!this.driver) {
      this.logger.warn('Neo4j driver not initialized');
      return null;
    }
    return this.driver.session();
  }

  async createProjectNode(
    id: string,
    name: string,
    description?: string,
  ): Promise<void> {
    const session = this.getSession();
    if (!session) return;

    try {
      await session.run(
        'CREATE (p:Project {id: $id, name: $name, description: $description, createdAt: datetime()})',
        { id, name, description: description || '' },
      );
      this.logger.log(`Created Neo4j node for project ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to create Neo4j node for project ${id}`,
        error.message,
      );
    } finally {
      await session.close();
    }
  }

  async updateProjectNode(
    id: string,
    name?: string,
    description?: string,
  ): Promise<void> {
    const session = this.getSession();
    if (!session) return;

    try {
      const updates = [];
      if (name !== undefined) updates.push('p.name = $name');
      if (description !== undefined)
        updates.push('p.description = $description');

      if (updates.length > 0) {
        await session.run(
          `MATCH (p:Project {id: $id}) SET ${updates.join(', ')}, p.updatedAt = datetime()`,
          { id, name, description },
        );
        this.logger.log(`Updated Neo4j node for project ${id}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to update Neo4j node for project ${id}`,
        error.message,
      );
    } finally {
      await session.close();
    }
  }

  async deleteProjectNode(id: string): Promise<void> {
    const session = this.getSession();
    if (!session) return;

    try {
      await session.run(
        'MATCH (p:Project {id: $id}) SET p.deletedAt = datetime()',
        { id },
      );
      this.logger.log(`Soft-deleted Neo4j node for project ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete Neo4j node for project ${id}`,
        error.message,
      );
    } finally {
      await session.close();
    }
  }
}
