import { PrismaService } from '@/database/prisma.service';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationType, Prisma } from '@prisma/client';
import {
  CreateConversationDto,
  CreateDirectConversationDto,
  SendMessageDto,
  UpdateMessageDto,
} from './dto';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        deletedAt: null,
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                displayUsername: true,
                firstName: true,
                lastName: true,
                image: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map((conv) => ({
      ...conv,
      lastMessage: conv.messages[0] || null,
      messages: undefined,
    }));
  }

  /**
   * Get or create a direct conversation between two users
   */
  async getOrCreateDirectConversation(
    userId: string,
    dto: CreateDirectConversationDto,
  ) {
    const { targetUserId } = dto;

    if (userId === targetUserId) {
      throw new ForbiddenException('Cannot create conversation with yourself');
    }

    // Check if target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check if direct conversation already exists between these users
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.DIRECT,
        deletedAt: null,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                displayUsername: true,
                firstName: true,
                lastName: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (existingConversation) {
      return existingConversation;
    }

    // Create new direct conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        type: ConversationType.DIRECT,
        participants: {
          create: [{ userId }, { userId: targetUserId }],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                displayUsername: true,
                firstName: true,
                lastName: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return conversation;
  }

  /**
   * Create a project or group conversation
   */
  async createConversation(userId: string, dto: CreateConversationDto) {
    const { type, name, projectId, participantIds = [] } = dto;

    // For PROJECT type, verify user has access to project
    if (type === ConversationType.PROJECT && projectId) {
      const membership = await this.prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
          deletedAt: null,
        },
      });

      if (!membership) {
        throw new ForbiddenException('Access denied to project');
      }

      // Check if project conversation already exists
      const existingConversation = await this.prisma.conversation.findFirst({
        where: {
          projectId,
          type: ConversationType.PROJECT,
          deletedAt: null,
        },
      });

      if (existingConversation) {
        return existingConversation;
      }

      // Get all project members
      const projectMembers = await this.prisma.projectMember.findMany({
        where: { projectId, deletedAt: null },
        select: { userId: true },
      });

      // Create project conversation with all members
      return this.prisma.conversation.create({
        data: {
          type: ConversationType.PROJECT,
          name,
          projectId,
          participants: {
            create: projectMembers.map((m) => ({ userId: m.userId })),
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  image: true,
                },
              },
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    }

    // For GROUP type, create with specified participants
    const allParticipants = [...new Set([userId, ...participantIds])];

    return this.prisma.conversation.create({
      data: {
        type,
        name,
        participants: {
          create: allParticipants.map((id) => ({ userId: id })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                image: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get or create project conversation
   * Also ensures the requesting user is a participant (handles new members)
   */
  async getOrCreateProjectConversation(projectId: string, userId: string) {
    // Verify user has access to project
    const membership = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
        deletedAt: null,
      },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied to project');
    }

    // Check for existing project conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        projectId,
        type: ConversationType.PROJECT,
        deletedAt: null,
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
                image: true,
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!conversation) {
      // Get all project members
      const projectMembers = await this.prisma.projectMember.findMany({
        where: { projectId, deletedAt: null },
        select: { userId: true },
      });

      // Get project name
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true },
      });

      // Create project conversation
      conversation = await this.prisma.conversation.create({
        data: {
          type: ConversationType.PROJECT,
          name: project?.name || 'Project Chat',
          projectId,
          participants: {
            create: projectMembers.map((m) => ({ userId: m.userId })),
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  username: true,
                  firstName: true,
                  lastName: true,
                  image: true,
                },
              },
            },
          },
          project: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } else {
      // Conversation exists - ensure the current user is a participant
      // This handles the case where a user joined the project after the conversation was created
      const isParticipant = conversation.participants.some(
        (p) => p.userId === userId,
      );

      if (!isParticipant) {
        // Add user to conversation participants
        await this.prisma.conversationParticipant.create({
          data: {
            conversationId: conversation.id,
            userId,
          },
        });

        // Refresh conversation to include new participant
        conversation = await this.prisma.conversation.findFirst({
          where: {
            id: conversation.id,
          },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    username: true,
                    firstName: true,
                    lastName: true,
                    image: true,
                  },
                },
              },
            },
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      }
    }

    return conversation;
  }

  /**
   * Get conversation by ID with access check
   */
  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        deletedAt: null,
        participants: {
          some: { userId },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                displayUsername: true,
                firstName: true,
                lastName: true,
                image: true,
              },
            },
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getMessages(
    conversationId: string,
    userId: string,
    options: { limit?: number; before?: string } = {},
  ) {
    const { limit = 50, before } = options;

    // Verify user has access to conversation
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new ForbiddenException('Access denied to conversation');
    }

    const where: Prisma.MessageWhereInput = {
      conversationId,
      deletedAt: null,
    };

    if (before) {
      const beforeMessage = await this.prisma.message.findUnique({
        where: { id: before },
        select: { createdAt: true },
      });
      if (beforeMessage) {
        where.createdAt = { lt: beforeMessage.createdAt };
      }
    }

    const messages = await this.prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            username: true,
            displayUsername: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Return in chronological order
    return messages.reverse();
  }

  /**
   * Send a message to a conversation
   */
  async sendMessage(
    conversationId: string,
    userId: string,
    dto: SendMessageDto,
  ) {
    // Verify user has access to conversation
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId },
    });

    if (!participant) {
      throw new ForbiddenException('Access denied to conversation');
    }

    const { content, replyToId, attachments } = dto;

    // Create message
    const message = await this.prisma.message.create({
      data: {
        content,
        conversationId,
        senderId: userId,
        replyToId,
        attachments,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            username: true,
            displayUsername: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                email: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        conversation: {
          select: {
            id: true,
            type: true,
            projectId: true,
          },
        },
      },
    });

    // Update conversation's updatedAt
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  /**
   * Update a message (only by sender)
   */
  async updateMessage(
    messageId: string,
    userId: string,
    dto: UpdateMessageDto,
  ) {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: userId,
        deletedAt: null,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: dto.content,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            image: true,
          },
        },
      },
    });
  }

  /**
   * Delete a message (soft delete, only by sender)
   */
  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: userId,
        deletedAt: null,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string, userId: string) {
    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });

    return { success: true };
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(userId: string) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      select: {
        conversationId: true,
        lastReadAt: true,
      },
    });

    let totalUnread = 0;
    const unreadByConversation: Record<string, number> = {};

    for (const participant of participants) {
      const count = await this.prisma.message.count({
        where: {
          conversationId: participant.conversationId,
          deletedAt: null,
          senderId: { not: userId },
          createdAt: participant.lastReadAt
            ? { gt: participant.lastReadAt }
            : undefined,
        },
      });

      unreadByConversation[participant.conversationId] = count;
      totalUnread += count;
    }

    return {
      total: totalUnread,
      byConversation: unreadByConversation,
    };
  }
}
