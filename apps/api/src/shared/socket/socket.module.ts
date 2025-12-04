import { ChatModule } from '@/api/chat/chat.module';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheModule } from '../cache/cache.module';
import { SocketGateway } from './socket.gateway';
import { SocketService } from './socket.service';
import { YjsServerService } from './yjs-server.service';

@Module({
  imports: [CacheModule, ChatModule],
  providers: [SocketGateway, ConfigService, SocketService, YjsServerService],
  exports: [SocketService, SocketGateway, YjsServerService],
})
export class SocketModule {}
