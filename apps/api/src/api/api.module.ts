import { PrismaModule } from '@/database/prisma.module';
import { Module } from '@nestjs/common';
import { BoardModule } from './board/board.module';
import { BuilderModule } from './builder/builder.module';
import { ChatModule } from './chat/chat.module';
import { FileModule } from './file/file.module';
import { HealthModule } from './health/health.module';
import { ProjectModule } from './project/project.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    HealthModule,
    UserModule,
    FileModule,
    ProjectModule,
    BoardModule,
    BuilderModule,
    ChatModule,
    PrismaModule,
  ],
})
export class ApiModule {}
