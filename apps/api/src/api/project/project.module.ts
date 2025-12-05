import { Neo4jModule } from '@/database/neo4j/neo4j.module';
import { CacheModule } from '@/shared/cache/cache.module';
import { Module, forwardRef } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { ChatModule } from '../chat/chat.module';
import { SocketModule } from '@/shared/socket/socket.module';

@Module({
  imports: [
    Neo4jModule,
    CacheModule,
    forwardRef(() => ChatModule),
    forwardRef(() => SocketModule),
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService],
})
export class ProjectModule {}
