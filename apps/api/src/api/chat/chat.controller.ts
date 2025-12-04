import { AuthGuard } from '@/auth/auth.guard';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import {
  CreateConversationDto,
  CreateDirectConversationDto,
  SendMessageDto,
  UpdateMessageDto,
} from './dto';

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Get all conversations for the current user
   */
  @Get('conversations')
  async getConversations(@CurrentUserSession() session: CurrentUserSession) {
    return this.chatService.getUserConversations(session.user.id);
  }

  /**
   * Get or create a direct conversation with another user
   */
  @Post('conversations/direct')
  async getOrCreateDirectConversation(
    @Body() dto: CreateDirectConversationDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.chatService.getOrCreateDirectConversation(session.user.id, dto);
  }

  /**
   * Create a new conversation (group or project)
   */
  @Post('conversations')
  async createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.chatService.createConversation(session.user.id, dto);
  }

  /**
   * Get a specific conversation
   */
  @Get('conversations/:id')
  async getConversation(
    @Param('id') id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.chatService.getConversation(id, session.user.id);
  }

  /**
   * Get messages for a conversation
   */
  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
    @CurrentUserSession() session?: CurrentUserSession,
  ) {
    return this.chatService.getMessages(id, session.user.id, {
      limit: limit ? parseInt(limit, 10) : 50,
      before,
    });
  }

  /**
   * Send a message to a conversation
   */
  @Post('conversations/:id/messages')
  async sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.chatService.sendMessage(id, session.user.id, dto);
  }

  /**
   * Mark a conversation as read
   */
  @Post('conversations/:id/read')
  async markAsRead(
    @Param('id') id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.chatService.markAsRead(id, session.user.id);
  }

  /**
   * Update a message
   */
  @Patch('messages/:id')
  async updateMessage(
    @Param('id') id: string,
    @Body() dto: UpdateMessageDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.chatService.updateMessage(id, session.user.id, dto);
  }

  /**
   * Delete a message
   */
  @Delete('messages/:id')
  async deleteMessage(
    @Param('id') id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.chatService.deleteMessage(id, session.user.id);
  }

  /**
   * Get unread message count
   */
  @Get('unread')
  async getUnreadCount(@CurrentUserSession() session: CurrentUserSession) {
    return this.chatService.getUnreadCount(session.user.id);
  }

  /**
   * Get or create project conversation
   */
  @Get('project/:projectId')
  async getProjectConversation(
    @Param('projectId') projectId: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.chatService.getOrCreateProjectConversation(
      projectId,
      session.user.id,
    );
  }
}
