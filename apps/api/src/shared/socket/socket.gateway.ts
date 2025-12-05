import { ChatService } from '@/api/chat/chat.service';
import { AuthGuard } from '@/auth/auth.guard';
import { BetterAuthService } from '@/auth/better-auth.service';
import { getConfig as getAppConfig } from '@/config/app/app.config';
import { PrismaService } from '@/database/prisma.service';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { Logger, UnauthorizedException, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { CallStatus, CallType, ConversationType } from '@prisma/client';
import { fromNodeHeaders } from 'better-auth/node';
import 'dotenv/config';
import ms from 'ms';
import { Server, Socket } from 'socket.io';
import { CacheService } from '../cache/cache.service';

// WebRTC types for signaling (these are just passed through, not processed)
interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

interface RTCIceCandidateInit {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

const appConfig = getAppConfig();

type SocketWithUserSession = Socket & { session: CurrentUserSession };

@WebSocketGateway(0, {
  cors: {
    origin: appConfig.corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept,Authorization,X-Requested-With',
    credentials: true,
  },
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  readonly logger = new Logger(this.constructor.name);

  @WebSocketServer()
  private server: Server;

  private readonly clients: Map<string, Socket>;

  constructor(
    private readonly cacheService: CacheService,
    private readonly betterAuthService: BetterAuthService,
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
  ) {
    this.clients = new Map();
  }

  afterInit(): void {
    this.logger.log(`Websocket gateway initialized.`);
    this.server.use(async (socket: Socket, next) => {
      try {
        const session = await this.betterAuthService.api.getSession({
          headers: fromNodeHeaders(socket?.handshake?.headers),
        });
        if (!session) {
          throw new Error();
        }
        socket['session'] = session;
        return next();
      } catch {
        return next(
          new UnauthorizedException({
            code: 'UNAUTHORIZED',
          }),
        );
      }
    });
  }

  async handleConnection(socket: SocketWithUserSession) {
    // console.log('New client connected: ', socket?.id);
    const userId = socket?.session?.user?.id as string;
    if (!userId) {
      return;
    }
    this.clients.set(socket?.id, socket);
    const userClients = await this.cacheService.get<string[]>({
      key: 'UserSocketClients',
      args: [userId],
    });
    const clients = new Set<string>(Array.from(userClients ?? []));
    clients.add(socket?.id);
    await this.cacheService.set(
      { key: 'UserSocketClients', args: [userId] },
      Array.from(clients),
      { ttl: ms('1h') },
    );
  }

  async handleDisconnect(socket: SocketWithUserSession) {
    // console.log('Client disconnected: ', socket?.id);

    this.clients.delete(socket?.id);
    const userId = socket?.session?.user?.id as string;
    if (!userId) {
      return;
    }
    const userClients = await this.cacheService.get<string[]>({
      key: 'UserSocketClients',
      args: [userId],
    });
    const clients = new Set<string>(Array.from(userClients ?? []));
    if (clients.has(socket?.id)) {
      clients.delete(socket?.id);
      await this.cacheService.set(
        { key: 'UserSocketClients', args: [userId] },
        Array.from(clients),
        { ttl: ms('1h') },
      );
    }
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('message')
  handleMessage(
    @ConnectedSocket() socket: SocketWithUserSession,
    @MessageBody() _message: any,
    @CurrentUserSession('user') _user: CurrentUserSession['user'],
  ) {
    // console.log(
    //   `Received message from client: ${socket?.id}.`,
    //   JSON.stringify(_message, null, 2),
    //   _user,
    // );
    socket.send('hello world');
  }

  @SubscribeMessage('ping')
  async handlePing(socket: SocketWithUserSession) {
    socket.send('pong');
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('chat:message')
  async handleChatMessage(
    @MessageBody()
    data: { projectId: string; content: string; replyToId?: string },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { projectId, content, replyToId } = data;

    try {
      // Get or create project conversation
      const conversation = await this.chatService.getOrCreateProjectConversation(
        projectId,
        user.id,
      );

      // Persist message to database
      const message = await this.chatService.sendMessage(
        conversation.id,
        user.id,
        { content, replyToId },
      );

      // Broadcast message to all users in the project room
      this.server.to(`project:${projectId}`).emit('chat:message', {
        ...message,
        projectId,
      });

      this.logger.log(`Chat message from ${user.id} in project ${projectId}`);
    } catch (error) {
      this.logger.error(`Failed to send chat message: ${error.message}`);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  // ============================================
  // Conversation-based Chat Events
  // ============================================

  @UseGuards(AuthGuard)
  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { conversationId } = data;

    try {
      // Verify access
      await this.chatService.getConversation(conversationId, user.id);

      // Join conversation room
      socket.join(`conversation:${conversationId}`);

      this.logger.log(`User ${user.id} joined conversation ${conversationId}`);
    } catch (error) {
      socket.emit('error', { message: 'Access denied to conversation' });
    }
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { conversationId } = data;

    socket.leave(`conversation:${conversationId}`);
    this.logger.log(`User ${user.id} left conversation ${conversationId}`);
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('conversation:message')
  async handleConversationMessage(
    @MessageBody()
    data: { conversationId: string; content: string; replyToId?: string },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { conversationId, content, replyToId } = data;

    try {
      // Persist message
      const message = await this.chatService.sendMessage(conversationId, user.id, {
        content,
        replyToId,
      });

      // Broadcast to conversation room
      this.server.to(`conversation:${conversationId}`).emit('conversation:message', message);

      // Also notify participants who aren't in the room
      const conversation = await this.chatService.getConversation(conversationId, user.id);
      for (const participant of conversation.participants) {
        if (participant.userId !== user.id) {
          const userClients = await this.cacheService.get<string[]>({
            key: 'UserSocketClients',
            args: [participant.userId],
          });
          if (userClients) {
            for (const clientId of userClients) {
              const clientSocket = this.clients.get(clientId);
              if (clientSocket) {
                clientSocket.emit('conversation:notification', {
                  conversationId,
                  message,
                });
              }
            }
          }
        }
      }

      this.logger.log(`Message sent to conversation ${conversationId}`);
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('conversation:typing')
  async handleTyping(
    @MessageBody() data: { conversationId: string; isTyping: boolean },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { conversationId, isTyping } = data;

    socket.to(`conversation:${conversationId}`).emit('conversation:typing', {
      conversationId,
      userId: user.id,
      userName: user.email?.split('@')[0] || 'User',
      isTyping,
    });
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('conversation:read')
  async handleMarkRead(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { conversationId } = data;

    try {
      await this.chatService.markAsRead(conversationId, user.id);
      socket.to(`conversation:${conversationId}`).emit('conversation:read', {
        conversationId,
        userId: user.id,
        readAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Failed to mark as read: ${error.message}`);
    }
  }

  // ============================================
  // WebRTC Signaling for Video/Voice Calls
  // ============================================

  @UseGuards(AuthGuard)
  @SubscribeMessage('call:initiate')
  async handleCallInitiate(
    @MessageBody()
    data: {
      conversationId?: string;
      projectId?: string;
      targetUserIds?: string[];
      type: 'VOICE' | 'VIDEO';
    },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { conversationId, projectId, targetUserIds, type } = data;

    try {
      // Create call record in database
      const call = await this.prisma.call.create({
        data: {
          type: type === 'VIDEO' ? CallType.VIDEO : CallType.VOICE,
          status: CallStatus.RINGING,
          initiatorId: user.id,
          conversationId,
          projectId,
          participants: {
            create: [{ userId: user.id, joinedAt: new Date() }],
          },
        },
        include: {
          initiator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              image: true,
            },
          },
        },
      });

      // Determine target users
      let targets: string[] = [];

      if (targetUserIds && targetUserIds.length > 0) {
        targets = targetUserIds;
      } else if (conversationId) {
        const conversation = await this.chatService.getConversation(
          conversationId,
          user.id,
        );
        targets = conversation.participants
          .map((p) => p.userId)
          .filter((id) => id !== user.id);
      } else if (projectId) {
        const members = await this.prisma.projectMember.findMany({
          where: { projectId, deletedAt: null, userId: { not: user.id } },
          select: { userId: true },
        });
        targets = members.map((m) => m.userId);
      }

      // Join call room
      socket.join(`call:${call.id}`);

      // Notify target users about incoming call
      for (const targetUserId of targets) {
        const userClients = await this.cacheService.get<string[]>({
          key: 'UserSocketClients',
          args: [targetUserId],
        });
        if (userClients) {
          for (const clientId of userClients) {
            const clientSocket = this.clients.get(clientId);
            if (clientSocket) {
              clientSocket.emit('call:incoming', {
                callId: call.id,
                type: call.type,
                initiator: call.initiator,
                conversationId,
                projectId,
              });
            }
          }
        }
      }

      // Join call room so initiator receives user-joined events
      socket.join(`call:${call.id}`);

      // Send call initiated confirmation to initiator
      socket.emit('call:initiated', {
        callId: call.id,
        type: call.type,
        status: call.status,
      });

      this.logger.log(`Call ${call.id} initiated by ${user.id}`);
    } catch (error) {
      this.logger.error(`Failed to initiate call: ${error.message}`);
      socket.emit('error', { message: 'Failed to initiate call' });
    }
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('call:join')
  async handleCallJoin(
    @MessageBody() data: { callId: string },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { callId } = data;

    try {
      // Check call exists and is active
      const call = await this.prisma.call.findUnique({
        where: { id: callId },
        include: { participants: true },
      });

      if (!call || call.status === CallStatus.ENDED) {
        socket.emit('error', { message: 'Call not found or ended' });
        return;
      }

      // Add participant if not already in call
      const existingParticipant = call.participants.find(
        (p) => p.userId === user.id,
      );
      if (!existingParticipant) {
        await this.prisma.callParticipant.create({
          data: {
            callId,
            userId: user.id,
            joinedAt: new Date(),
          },
        });
      } else if (!existingParticipant.joinedAt) {
        await this.prisma.callParticipant.update({
          where: { id: existingParticipant.id },
          data: { joinedAt: new Date(), leftAt: null },
        });
      }

      // Update call status if first participant joins
      if (call.status === CallStatus.RINGING) {
        await this.prisma.call.update({
          where: { id: callId },
          data: { status: CallStatus.ONGOING, startedAt: new Date() },
        });
      }

      // Join call room
      socket.join(`call:${callId}`);

      // Notify other participants (use userId as peerId for consistency)
      socket.to(`call:${callId}`).emit('call:user-joined', {
        callId,
        peerId: user.id,
        userId: user.id,
        username: user.email?.split('@')[0] || 'User',
        userImage: user.image || undefined,
      });

      // Send current participants to new joiner
      const updatedCall = await this.prisma.call.findUnique({
        where: { id: callId },
        include: {
          participants: {
            where: { leftAt: null },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      socket.emit('call:joined', {
        callId,
        participants: updatedCall?.participants || [],
      });

      this.logger.log(`User ${user.id} joined call ${callId}`);
    } catch (error) {
      this.logger.error(`Failed to join call: ${error.message}`);
      socket.emit('error', { message: 'Failed to join call' });
    }
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('call:offer')
  async handleCallOffer(
    @MessageBody()
    data: { callId: string; targetPeerId?: string; targetUserId?: string; offer: RTCSessionDescriptionInit },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    // Support both targetPeerId (new) and targetUserId (legacy)
    const targetId = data.targetPeerId || data.targetUserId;
    const { callId, offer } = data;

    if (!targetId) {
      this.logger.error('call:offer missing target identifier');
      return;
    }

    // Find target user's sockets
    const userClients = await this.cacheService.get<string[]>({
      key: 'UserSocketClients',
      args: [targetId],
    });

    if (userClients) {
      for (const clientId of userClients) {
        const clientSocket = this.clients.get(clientId);
        if (clientSocket) {
          clientSocket.emit('call:offer', {
            callId,
            fromPeerId: user.id,
            fromUserId: user.id,
            fromUsername: user.email?.split('@')[0] || 'User',
            fromUserImage: user.image || undefined,
            offer,
          });
        }
      }
    }
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('call:answer')
  async handleCallAnswer(
    @MessageBody()
    data: { callId: string; targetPeerId?: string; targetUserId?: string; answer: RTCSessionDescriptionInit },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    // Support both targetPeerId (new) and targetUserId (legacy)
    const targetId = data.targetPeerId || data.targetUserId;
    const { callId, answer } = data;

    if (!targetId) {
      this.logger.error('call:answer missing target identifier');
      return;
    }

    const userClients = await this.cacheService.get<string[]>({
      key: 'UserSocketClients',
      args: [targetId],
    });

    if (userClients) {
      for (const clientId of userClients) {
        const clientSocket = this.clients.get(clientId);
        if (clientSocket) {
          clientSocket.emit('call:answer', {
            callId,
            fromPeerId: user.id,
            answer,
          });
        }
      }
    }
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('call:renegotiate')
  async handleCallRenegotiate(
    @MessageBody()
    data: { callId: string; targetPeerId: string; offer: RTCSessionDescriptionInit },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { callId, targetPeerId, offer } = data;

    if (!targetPeerId) {
      this.logger.error('call:renegotiate missing targetPeerId');
      return;
    }

    this.logger.log(`ICE restart from ${user.id} to ${targetPeerId}`);

    const userClients = await this.cacheService.get<string[]>({
      key: 'UserSocketClients',
      args: [targetPeerId],
    });

    if (userClients) {
      for (const clientId of userClients) {
        const clientSocket = this.clients.get(clientId);
        if (clientSocket) {
          clientSocket.emit('call:renegotiate', {
            callId,
            fromPeerId: user.id,
            offer,
          });
        }
      }
    }
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('call:renegotiate-answer')
  async handleCallRenegotiateAnswer(
    @MessageBody()
    data: { callId: string; targetPeerId: string; answer: RTCSessionDescriptionInit },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { callId, targetPeerId, answer } = data;

    if (!targetPeerId) {
      this.logger.error('call:renegotiate-answer missing targetPeerId');
      return;
    }

    this.logger.log(`ICE restart answer from ${user.id} to ${targetPeerId}`);

    const userClients = await this.cacheService.get<string[]>({
      key: 'UserSocketClients',
      args: [targetPeerId],
    });

    if (userClients) {
      for (const clientId of userClients) {
        const clientSocket = this.clients.get(clientId);
        if (clientSocket) {
          clientSocket.emit('call:renegotiate-answer', {
            callId,
            fromPeerId: user.id,
            answer,
          });
        }
      }
    }
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('call:ice-candidate')
  async handleIceCandidate(
    @MessageBody()
    data: { callId: string; targetPeerId?: string; targetUserId?: string; candidate: RTCIceCandidateInit },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    // Support both targetPeerId (new) and targetUserId (legacy)
    const targetId = data.targetPeerId || data.targetUserId;
    const { callId, candidate } = data;

    if (!targetId) {
      this.logger.error('call:ice-candidate missing target identifier');
      return;
    }

    const userClients = await this.cacheService.get<string[]>({
      key: 'UserSocketClients',
      args: [targetId],
    });

    if (userClients) {
      for (const clientId of userClients) {
        const clientSocket = this.clients.get(clientId);
        if (clientSocket) {
          clientSocket.emit('call:ice-candidate', {
            callId,
            fromPeerId: user.id,
            candidate,
          });
        }
      }
    }
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('call:leave')
  async handleCallLeave(
    @MessageBody() data: { callId: string },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { callId } = data;

    try {
      // Update participant record
      await this.prisma.callParticipant.updateMany({
        where: { callId, userId: user.id },
        data: { leftAt: new Date() },
      });

      // Leave call room
      socket.leave(`call:${callId}`);

      // Notify other participants
      socket.to(`call:${callId}`).emit('call:user-left', {
        callId,
        peerId: user.id,
      });

      // Check if any participants remain
      const remainingParticipants = await this.prisma.callParticipant.count({
        where: { callId, leftAt: null },
      });

      if (remainingParticipants === 0) {
        // End the call
        await this.prisma.call.update({
          where: { id: callId },
          data: { status: CallStatus.ENDED, endedAt: new Date() },
        });

        this.server.to(`call:${callId}`).emit('call:ended', { callId });
      }

      this.logger.log(`User ${user.id} left call ${callId}`);
    } catch (error) {
      this.logger.error(`Failed to leave call: ${error.message}`);
    }
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('call:join-failed')
  async handleCallJoinFailed(
    @MessageBody() data: { callId: string; reason: string },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { callId, reason } = data;

    try {
      const call = await this.prisma.call.findUnique({
        where: { id: callId },
      });

      if (!call) return;

      // Notify call initiator that user couldn't join
      const userClients = await this.cacheService.get<string[]>({
        key: 'UserSocketClients',
        args: [call.initiatorId],
      });

      if (userClients) {
        for (const clientId of userClients) {
          const clientSocket = this.clients.get(clientId);
          if (clientSocket) {
            clientSocket.emit('call:join-failed', {
              callId,
              userId: user.id,
              username: user.email?.split('@')[0] || 'User',
              reason,
            });
          }
        }
      }

      this.logger.log(`User ${user.id} failed to join call ${callId}: ${reason}`);
    } catch (error) {
      this.logger.error(`Failed to handle call join failure: ${error.message}`);
    }
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('call:decline')
  async handleCallDecline(
    @MessageBody() data: { callId: string },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { callId } = data;

    try {
      const call = await this.prisma.call.findUnique({
        where: { id: callId },
        include: { participants: true },
      });

      if (!call) return;

      // If this is a 1:1 call and it's being declined, mark as declined
      if (call.participants.length <= 2 && call.status === CallStatus.RINGING) {
        await this.prisma.call.update({
          where: { id: callId },
          data: { status: CallStatus.DECLINED, endedAt: new Date() },
        });
      }

      // Notify call initiator
      const userClients = await this.cacheService.get<string[]>({
        key: 'UserSocketClients',
        args: [call.initiatorId],
      });

      if (userClients) {
        for (const clientId of userClients) {
          const clientSocket = this.clients.get(clientId);
          if (clientSocket) {
            clientSocket.emit('call:declined', {
              callId,
              declinedBy: user.id,
            });
          }
        }
      }

      this.logger.log(`User ${user.id} declined call ${callId}`);
    } catch (error) {
      this.logger.error(`Failed to decline call: ${error.message}`);
    }
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('call:end')
  async handleCallEnd(
    @MessageBody() data: { callId: string },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { callId } = data;

    try {
      // End the call
      await this.prisma.call.update({
        where: { id: callId },
        data: { status: CallStatus.ENDED, endedAt: new Date() },
      });

      // Mark all participants as left
      await this.prisma.callParticipant.updateMany({
        where: { callId, leftAt: null },
        data: { leftAt: new Date() },
      });

      // Notify all participants
      this.server.to(`call:${callId}`).emit('call:ended', {
        callId,
        endedBy: user.id,
      });

      this.logger.log(`Call ${callId} ended by ${user.id}`);
    } catch (error) {
      this.logger.error(`Failed to end call: ${error.message}`);
    }
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('call:toggle-media')
  async handleToggleMedia(
    @MessageBody()
    data: {
      callId: string;
      isMuted?: boolean;
      isVideoOff?: boolean;
      isScreenSharing?: boolean;
    },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { callId, isMuted, isVideoOff, isScreenSharing } = data;

    try {
      const updateData: any = {};
      if (isMuted !== undefined) updateData.isMuted = isMuted;
      if (isVideoOff !== undefined) updateData.isVideoOff = isVideoOff;
      if (isScreenSharing !== undefined) updateData.isScreenSharing = isScreenSharing;

      await this.prisma.callParticipant.updateMany({
        where: { callId, userId: user.id },
        data: updateData,
      });

      // Notify other participants
      socket.to(`call:${callId}`).emit('call:media-toggle', {
        callId,
        peerId: user.id,
        ...updateData,
      });
    } catch (error) {
      this.logger.error(`Failed to toggle media: ${error.message}`);
    }
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('cursor:move')
  async handleCursorMove(
    @MessageBody()
    data: { projectId: string; file: string; line: number; column: number },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { projectId, file, line, column } = data;

    // Broadcast cursor position to other users in the project room
    socket.to(`project:${projectId}`).emit('cursor:move', {
      userId: user.id,
      userName: user.email?.split('@')[0] || 'User',
      file,
      line,
      column,
    });
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('join_project')
  async handleJoinProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { projectId } = data;

    // Verify user has access to project
    const membership = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: user.id,
        deletedAt: null,
      },
    });

    if (!membership) {
      socket.emit('error', { message: 'Access denied to project' });
      return;
    }

    // Join Socket.io room
    socket.join(`project:${projectId}`);

    // Add to Redis presence set
    const presenceKey = `presence:project:${projectId}`;
    const presentUsers = await this.cacheService.get<string[]>({
      key: 'UserSocketClients', // Using existing cache key pattern
      args: [presenceKey],
    });
    const userSet = new Set<string>(presentUsers || []);
    userSet.add(user.id);
    await this.cacheService.set(
      { key: 'UserSocketClients', args: [presenceKey] },
      Array.from(userSet),
      { ttl: ms('1h') },
    );

    // Get all present users
    const users = await this.getPresentUsers(projectId);

    // Broadcast presence update to room
    this.server.to(`project:${projectId}`).emit('presence:update', {
      projectId,
      users,
      action: 'join',
      user: {
        id: user.id,
        email: user.email,
      },
    });

    this.logger.log(`User ${user.id} joined project ${projectId}`);
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('leave_project')
  async handleLeaveProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { projectId } = data;

    // Leave Socket.io room
    socket.leave(`project:${projectId}`);

    // Remove from Redis presence set
    const presenceKey = `presence:project:${projectId}`;
    const presentUsers = await this.cacheService.get<string[]>({
      key: 'UserSocketClients',
      args: [presenceKey],
    });
    const userSet = new Set<string>(presentUsers || []);
    userSet.delete(user.id);
    await this.cacheService.set(
      { key: 'UserSocketClients', args: [presenceKey] },
      Array.from(userSet),
      { ttl: ms('1h') },
    );

    // Get remaining present users
    const users = await this.getPresentUsers(projectId);

    // Broadcast presence update
    this.server.to(`project:${projectId}`).emit('presence:update', {
      projectId,
      users,
      action: 'leave',
      user: {
        id: user.id,
        email: user.email,
      },
    });

    this.logger.log(`User ${user.id} left project ${projectId}`);
  }

  /**
   * Get all users present in a project workspace
   */
  private async getPresentUsers(projectId: string): Promise<any[]> {
    const presenceKey = `presence:project:${projectId}`;
    const userIds = await this.cacheService.get<string[]>({
      key: 'UserSocketClients',
      args: [presenceKey],
    });

    if (!userIds || userIds.length === 0) {
      return [];
    }

    // Fetch user details from database
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        image: true,
      },
    });

    return users;
  }

  getClient(clientId: string): Socket | undefined {
    return this.clients?.get(clientId);
  }

  getAllClients() {
    return this.clients;
  }

  // ============================================
  // Task/Board Events - Server-side broadcasting
  // ============================================

  /**
   * Broadcast task created event to project room
   */
  broadcastTaskCreated(projectId: string, task: any) {
    this.server.to(`project:${projectId}`).emit('task:created', {
      projectId,
      task,
      timestamp: new Date(),
    });
    this.logger.log(`Task ${task.id} created in project ${projectId}`);
  }

  /**
   * Broadcast task updated event to project room
   */
  broadcastTaskUpdated(projectId: string, task: any) {
    this.server.to(`project:${projectId}`).emit('task:updated', {
      projectId,
      task,
      timestamp: new Date(),
    });
    this.logger.log(`Task ${task.id} updated in project ${projectId}`);
  }

  /**
   * Broadcast task deleted event to project room
   */
  broadcastTaskDeleted(projectId: string, taskId: string) {
    this.server.to(`project:${projectId}`).emit('task:deleted', {
      projectId,
      taskId,
      timestamp: new Date(),
    });
    this.logger.log(`Task ${taskId} deleted in project ${projectId}`);
  }

  /**
   * Broadcast column created event to project room
   */
  broadcastColumnCreated(projectId: string, column: any) {
    this.server.to(`project:${projectId}`).emit('column:created', {
      projectId,
      column,
      timestamp: new Date(),
    });
    this.logger.log(`Column ${column.id} created in project ${projectId}`);
  }

  /**
   * Broadcast column updated event to project room
   */
  broadcastColumnUpdated(projectId: string, column: any) {
    this.server.to(`project:${projectId}`).emit('column:updated', {
      projectId,
      column,
      timestamp: new Date(),
    });
    this.logger.log(`Column ${column.id} updated in project ${projectId}`);
  }

  /**
   * Broadcast column deleted event to project room
   */
  broadcastColumnDeleted(projectId: string, columnId: string) {
    this.server.to(`project:${projectId}`).emit('column:deleted', {
      projectId,
      columnId,
      timestamp: new Date(),
    });
    this.logger.log(`Column ${columnId} deleted in project ${projectId}`);
  }

  // ============================================
  // File Collaboration Events
  // ============================================

  @UseGuards(AuthGuard)
  @SubscribeMessage('join_file')
  async handleJoinFile(
    @MessageBody() data: { projectId: string; fileId: string },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { projectId, fileId } = data;

    // Verify user has access to project
    const membership = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: user.id,
        deletedAt: null,
      },
    });

    if (!membership) {
      socket.emit('error', { message: 'Access denied to project' });
      return;
    }

    // Verify file exists and belongs to project
    const file = await this.prisma.projectFile.findFirst({
      where: {
        id: fileId,
        projectId,
        isFolder: false,
      },
    });

    if (!file) {
      socket.emit('error', { message: 'File not found' });
      return;
    }

    // Join file-specific room
    const fileRoom = `file:${projectId}:${fileId}`;
    socket.join(fileRoom);

    // Track file presence in Redis
    const presenceKey = `presence:file:${fileId}`;
    const presentUsers = await this.cacheService.get<string[]>({
      key: 'UserSocketClients',
      args: [presenceKey],
    });
    const userSet = new Set<string>(presentUsers || []);
    userSet.add(user.id);
    await this.cacheService.set(
      { key: 'UserSocketClients', args: [presenceKey] },
      Array.from(userSet),
      { ttl: ms('1h') },
    );

    // Get all users in this file
    const users = await this.getFileCollaborators(fileId);

    // Broadcast presence update to file room
    this.server.to(fileRoom).emit('file:presence', {
      fileId,
      projectId,
      users,
      action: 'join',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

    this.logger.log(`User ${user.id} joined file ${fileId}`);
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('leave_file')
  async handleLeaveFile(
    @MessageBody() data: { projectId: string; fileId: string },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { projectId, fileId } = data;

    const fileRoom = `file:${projectId}:${fileId}`;
    socket.leave(fileRoom);

    // Remove from Redis presence
    const presenceKey = `presence:file:${fileId}`;
    const presentUsers = await this.cacheService.get<string[]>({
      key: 'UserSocketClients',
      args: [presenceKey],
    });
    const userSet = new Set<string>(presentUsers || []);
    userSet.delete(user.id);
    await this.cacheService.set(
      { key: 'UserSocketClients', args: [presenceKey] },
      Array.from(userSet),
      { ttl: ms('1h') },
    );

    // Get remaining users
    const users = await this.getFileCollaborators(fileId);

    // Broadcast presence update
    this.server.to(fileRoom).emit('file:presence', {
      fileId,
      projectId,
      users,
      action: 'leave',
      user: {
        id: user.id,
        email: user.email,
      },
    });

    this.logger.log(`User ${user.id} left file ${fileId}`);
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('file:edit')
  async handleFileEdit(
    @MessageBody()
    data: {
      projectId: string;
      fileId: string;
      changes: {
        range: {
          startLineNumber: number;
          startColumn: number;
          endLineNumber: number;
          endColumn: number;
        };
        text: string;
      }[];
      version: number;
    },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { projectId, fileId, changes, version } = data;

    // Broadcast to all other users in the file room
    const fileRoom = `file:${projectId}:${fileId}`;
    socket.to(fileRoom).emit('file:edit', {
      fileId,
      projectId,
      userId: user.id,
      userName: user.email?.split('@')[0] || 'User',
      changes,
      version,
      timestamp: new Date(),
    });
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('file:cursor')
  async handleFileCursor(
    @MessageBody()
    data: {
      projectId: string;
      fileId: string;
      cursor: {
        lineNumber: number;
        column: number;
      };
      selection?: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
      };
    },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { projectId, fileId, cursor, selection } = data;

    // Broadcast to other users in the file room
    const fileRoom = `file:${projectId}:${fileId}`;
    socket.to(fileRoom).emit('file:cursor', {
      fileId,
      projectId,
      userId: user.id,
      userName: user.email?.split('@')[0] || 'User',
      cursor,
      selection,
    });
  }

  /**
   * Get all users currently editing a file
   */
  private async getFileCollaborators(fileId: string): Promise<any[]> {
    const presenceKey = `presence:file:${fileId}`;
    const userIds = await this.cacheService.get<string[]>({
      key: 'UserSocketClients',
      args: [presenceKey],
    });

    if (!userIds || userIds.length === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        image: true,
      },
    });

    return users;
  }

  /**
   * Broadcast file content update to project room (called after HTTP save)
   */
  broadcastFileUpdated(
    projectId: string,
    fileId: string,
    updatedBy: { id: string; email?: string },
  ) {
    const fileRoom = `file:${projectId}:${fileId}`;
    this.server.to(fileRoom).emit('file:saved', {
      fileId,
      projectId,
      savedBy: updatedBy,
      timestamp: new Date(),
    });
    this.logger.log(`File ${fileId} saved by ${updatedBy.id}`);
  }

  // ============================================
  // Website Builder Page Events
  // ============================================

  /**
   * Broadcast page created event to project room
   */
  broadcastPageCreated(projectId: string, page: any) {
    this.server.to(`project:${projectId}`).emit('page:created', {
      projectId,
      page,
      timestamp: new Date(),
    });
    this.logger.log(`Page ${page.id} created in project ${projectId}`);
  }

  /**
   * Broadcast page updated event to project room
   */
  broadcastPageUpdated(projectId: string, page: any) {
    this.server.to(`project:${projectId}`).emit('page:updated', {
      projectId,
      page,
      timestamp: new Date(),
    });
    this.logger.log(`Page ${page.id} updated in project ${projectId}`);
  }

  /**
   * Broadcast page deleted event to project room
   */
  broadcastPageDeleted(projectId: string, pageId: string) {
    this.server.to(`project:${projectId}`).emit('page:deleted', {
      projectId,
      pageId,
      timestamp: new Date(),
    });
    this.logger.log(`Page ${pageId} deleted in project ${projectId}`);
  }

  /**
   * Broadcast pages reordered event to project room
   */
  broadcastPagesReordered(projectId: string, pageIds: string[]) {
    this.server.to(`project:${projectId}`).emit('pages:reordered', {
      projectId,
      pageIds,
      timestamp: new Date(),
    });
    this.logger.log(`Pages reordered in project ${projectId}`);
  }

  /**
   * Broadcast file created event to project room
   */
  broadcastFileCreated(projectId: string, file: any) {
    this.server.to(`project:${projectId}`).emit('file:created', {
      projectId,
      file,
      timestamp: new Date(),
    });
    this.logger.log(`File created in project ${projectId}: ${file.path}`);
  }

  /**
   * Broadcast file content updated event to project room
   */
  broadcastFileContentUpdated(projectId: string, file: any) {
    this.server.to(`project:${projectId}`).emit('file:updated', {
      projectId,
      file,
      timestamp: new Date(),
    });
    this.logger.log(`File updated in project ${projectId}: ${file.path}`);
  }

  // ============================================
  // Website Builder Collaboration Events
  // ============================================

  @UseGuards(AuthGuard)
  @SubscribeMessage('builder:join')
  async handleJoinBuilder(
    @MessageBody() data: { projectId: string; pageId: string },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { projectId, pageId } = data;

    // Verify user has access to project
    const membership = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: user.id,
        deletedAt: null,
      },
    });

    if (!membership) {
      socket.emit('error', { message: 'Access denied to project' });
      return;
    }

    // Verify page exists
    const page = await this.prisma.page.findFirst({
      where: {
        id: pageId,
        projectId,
        deletedAt: null,
      },
    });

    if (!page) {
      socket.emit('error', { message: 'Page not found' });
      return;
    }

    // Join page-specific room
    const builderRoom = `builder:${projectId}:${pageId}`;
    socket.join(builderRoom);

    // Track builder presence in Redis
    const presenceKey = `presence:builder:${pageId}`;
    const presentUsers = await this.cacheService.get<string[]>({
      key: 'UserSocketClients',
      args: [presenceKey],
    });
    const userSet = new Set<string>(presentUsers || []);
    userSet.add(user.id);
    await this.cacheService.set(
      { key: 'UserSocketClients', args: [presenceKey] },
      Array.from(userSet),
      { ttl: ms('1h') },
    );

    // Get all users editing this page
    const users = await this.getBuilderCollaborators(pageId);

    // Broadcast presence update to builder room
    this.server.to(builderRoom).emit('builder:presence', {
      pageId,
      projectId,
      users,
      action: 'join',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

    this.logger.log(`User ${user.id} joined builder for page ${pageId}`);
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('builder:leave')
  async handleLeaveBuilder(
    @MessageBody() data: { projectId: string; pageId: string },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { projectId, pageId } = data;

    const builderRoom = `builder:${projectId}:${pageId}`;
    socket.leave(builderRoom);

    // Remove from Redis presence
    const presenceKey = `presence:builder:${pageId}`;
    const presentUsers = await this.cacheService.get<string[]>({
      key: 'UserSocketClients',
      args: [presenceKey],
    });
    const userSet = new Set<string>(presentUsers || []);
    userSet.delete(user.id);
    await this.cacheService.set(
      { key: 'UserSocketClients', args: [presenceKey] },
      Array.from(userSet),
      { ttl: ms('1h') },
    );

    // Get remaining users
    const users = await this.getBuilderCollaborators(pageId);

    // Broadcast presence update
    this.server.to(builderRoom).emit('builder:presence', {
      pageId,
      projectId,
      users,
      action: 'leave',
      user: {
        id: user.id,
        email: user.email,
      },
    });

    this.logger.log(`User ${user.id} left builder for page ${pageId}`);
  }

  @UseGuards(AuthGuard)
  @SubscribeMessage('builder:cursor')
  async handleBuilderCursor(
    @MessageBody()
    data: {
      projectId: string;
      pageId: string;
      selectedComponentId?: string;
      cursor?: { x: number; y: number };
    },
    @ConnectedSocket() socket: SocketWithUserSession,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    const { projectId, pageId, selectedComponentId, cursor } = data;

    // Broadcast to other users in the builder room
    const builderRoom = `builder:${projectId}:${pageId}`;
    socket.to(builderRoom).emit('builder:cursor', {
      pageId,
      projectId,
      userId: user.id,
      userName: user.email?.split('@')[0] || 'User',
      selectedComponentId,
      cursor,
    });
  }

  /**
   * Get all users currently editing a page in the builder
   */
  private async getBuilderCollaborators(pageId: string): Promise<any[]> {
    const presenceKey = `presence:builder:${pageId}`;
    const userIds = await this.cacheService.get<string[]>({
      key: 'UserSocketClients',
      args: [presenceKey],
    });

    if (!userIds || userIds.length === 0) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        image: true,
      },
    });

    return users;
  }
}
