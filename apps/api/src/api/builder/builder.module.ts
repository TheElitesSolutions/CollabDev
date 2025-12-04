import { SocketModule } from '@/shared/socket/socket.module';
import { Module } from '@nestjs/common';
import { BuilderController } from './builder.controller';
import { BuilderService } from './builder.service';
import { CodeGeneratorService } from './generator';

@Module({
  imports: [SocketModule],
  controllers: [BuilderController],
  providers: [BuilderService, CodeGeneratorService],
  exports: [BuilderService, CodeGeneratorService],
})
export class BuilderModule {}
