import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  connectSocket,
  disconnectSocket,
  joinProject,
  leaveProject,
  joinConversation,
  leaveConversation,
  onPresenceUpdate,
  onCursorMove,
  onChatMessage,
  onConversationMessage,
  onConversationNotification,
  sendChatMessage,
  sendConversationMessage,
  initiateCall,
  joinCall,
  declineCall as socketDeclineCall,
  onCallIncoming,
  onCallCreated,
  onCallJoined,
  onCallEnded,
  type PresenceUser,
  type CursorPosition,
  type ChatMessage,
} from '@/lib/socket';
import { apiClient, Message, Conversation, ChatUser } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';

type SocketState = {
  isConnected: boolean;
  listenersInitialized: boolean;
  currentProjectId: string | null;

  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;
  currentConversation: Conversation | null;
  unreadCounts: Record<string, number>;

  // Presence & Cursors
  presentUsers: PresenceUser[];
  cursors: Map<string, CursorPosition>;

  // Messages
  messages: ChatMessage[];
  isLoadingHistory: boolean;
  hasMoreMessages: boolean;

  // Calls
  activeCall: {
    callId: string;
    type: 'VOICE' | 'VIDEO';
    participants: any[];
  } | null;
  incomingCall: {
    callId: string;
    type: 'VOICE' | 'VIDEO';
    initiator: ChatUser;
    conversationId?: string;
    projectId?: string;
  } | null;

  // Actions
  connect: () => void;
  disconnect: () => void;
  joinWorkspace: (projectId: string) => void;
  leaveWorkspace: () => void;

  // Conversation actions
  fetchConversations: () => Promise<void>;
  openConversation: (conversationId: string) => void;
  startDM: (targetUserId: string) => Promise<void>;
  switchConversation: (conversationId: string) => void;

  // Message actions
  sendMessage: (content: string, replyToId?: string) => void;
  clearMessages: () => void;
  loadMoreMessages: () => Promise<void>;

  // Call actions
  startCall: (targetUserId: string, type: 'VOICE' | 'VIDEO') => void;
  acceptCall: () => void;
  declineCall: () => void;
  clearIncomingCall: () => void; // Just clears state without emitting decline
  endCall: () => void;
};

// Generate a consistent color for a user based on their ID
function getUserColor(userId: string): string {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

// Helper to convert API Message to ChatMessage format
function messageToChat(msg: Message, conversationId: string): ChatMessage {
  return {
    id: msg.id,
    projectId: conversationId, // Use conversationId as projectId for compatibility
    userId: msg.senderId,
    username: msg.sender.displayUsername || msg.sender.username || msg.sender.email,
    userImage: msg.sender.image,
    content: msg.content,
    timestamp: msg.createdAt,
    replyToId: msg.replyToId,
  };
}

export const useSocketStore = create<SocketState>()(
  devtools(
    (set, get) => ({
      isConnected: false,
      listenersInitialized: false,
      currentProjectId: null,

      // Conversations
      conversations: [],
      activeConversationId: null,
      currentConversation: null,
      unreadCounts: {},

      presentUsers: [],
      cursors: new Map(),
      messages: [],
      isLoadingHistory: false,
      hasMoreMessages: true,

      activeCall: null,
      incomingCall: null,

      connect: () => {
        // Prevent duplicate listeners
        if (get().listenersInitialized) {
          return;
        }

        const socket = connectSocket();

        socket.on('connect', () => {
          set({ isConnected: true });
        });

        socket.on('disconnect', () => {
          set({ isConnected: false });
        });

        // Set up presence listener
        onPresenceUpdate((data) => {
          set({ presentUsers: data.users });
        });

        // Set up cursor listener
        onCursorMove((data) => {
          const cursors = new Map(get().cursors);
          cursors.set(data.userId, {
            ...data,
            userColor: getUserColor(data.userId),
          });
          set({ cursors });
        });

        // Set up chat listener (for project chat)
        onChatMessage((data) => {
          const { activeConversationId, currentConversation } = get();
          // Only add to messages if we're viewing the project conversation
          if (currentConversation?.type === 'PROJECT' && currentConversation.projectId === data.projectId) {
            set({ messages: [...get().messages, data] });
          }
        });

        // Set up conversation message listener
        onConversationMessage((data: any) => {
          const { activeConversationId, conversations } = get();
          const msg: ChatMessage = {
            id: data.id,
            projectId: data.conversationId,
            userId: data.senderId,
            username: data.sender?.displayUsername || data.sender?.username || data.sender?.email || 'User',
            userImage: data.sender?.image,
            content: data.content,
            timestamp: data.createdAt,
            replyToId: data.replyToId,
          };

          // Only add to messages if we're viewing this conversation
          if (activeConversationId === data.conversationId) {
            set({ messages: [...get().messages, msg] });
          }

          // Update unread count and show toast if not viewing
          if (activeConversationId !== data.conversationId) {
            const unreadCounts = { ...get().unreadCounts };
            unreadCounts[data.conversationId] = (unreadCounts[data.conversationId] || 0) + 1;
            set({ unreadCounts });

            // Show toast notification
            const conversation = conversations.find(c => c.id === data.conversationId);
            const conversationName = conversation?.name ||
              conversation?.participants?.map(p => p.displayUsername || p.username).join(', ') ||
              'Unknown';
            const senderName = data.sender?.displayUsername || data.sender?.username || 'User';
            const preview = data.content.length > 60 ? data.content.substring(0, 60) + '...' : data.content;

            toast({
              title: `${senderName} in ${conversationName}`,
              description: preview,
              duration: 5000,
            });
          }
        });

        // Set up conversation notification listener
        onConversationNotification((data) => {
          const { activeConversationId } = get();
          if (activeConversationId !== data.conversationId) {
            const unreadCounts = { ...get().unreadCounts };
            unreadCounts[data.conversationId] = (unreadCounts[data.conversationId] || 0) + 1;
            set({ unreadCounts });
          }
        });

        // Set up call listeners
        onCallIncoming((data) => {
          set({
            incomingCall: {
              callId: data.callId,
              type: data.type,
              initiator: data.initiator,
              conversationId: data.conversationId,
              projectId: data.projectId,
            }
          });
        });

        onCallCreated((data) => {
          set({
            activeCall: {
              callId: data.callId,
              type: data.type,
              participants: [],
            }
          });
        });

        onCallJoined((data) => {
          set({
            activeCall: {
              callId: data.callId,
              type: get().activeCall?.type || 'VIDEO',
              participants: data.participants || [],
            },
            incomingCall: null,
          });
        });

        onCallEnded(() => {
          set({ activeCall: null, incomingCall: null });
        });

        // Mark listeners as initialized
        set({ listenersInitialized: true });
      },

      disconnect: () => {
        const { currentProjectId } = get();
        if (currentProjectId) {
          leaveProject(currentProjectId);
        }
        disconnectSocket();
        set({
          isConnected: false,
          listenersInitialized: false,
          currentProjectId: null,
          presentUsers: [],
          cursors: new Map(),
        });
      },

      joinWorkspace: async (projectId: string) => {
        const { currentProjectId, isConnected } = get();

        // Leave current project if different
        if (currentProjectId && currentProjectId !== projectId) {
          leaveProject(currentProjectId);
        }

        // Set project ID first to track what we're joining
        set({
          currentProjectId: projectId,
          messages: [],
          currentConversation: null,
          activeConversationId: null,
          isLoadingHistory: true,
          hasMoreMessages: true,
        });

        // Load all conversations
        await get().fetchConversations();

        // Load project chat history from database
        try {
          const conversation = await apiClient.chat.getProjectConversation(projectId);
          set({ currentConversation: conversation, activeConversationId: conversation.id });

          if (conversation) {
            const messages = await apiClient.chat.getMessages(conversation.id, { limit: 50 });
            const chatMessages = messages
              .map((msg) => messageToChat(msg, conversation.id))
              .reverse(); // Reverse to show oldest first
            set({
              messages: chatMessages,
              hasMoreMessages: messages.length === 50,
            });
          }
        } catch (error) {
          console.error('Failed to load chat history:', error);
        } finally {
          set({ isLoadingHistory: false });
        }

        // Connect if not connected
        if (!isConnected) {
          const socket = connectSocket();
          // Wait for connection before joining project
          socket.once('connect', () => {
            set({ isConnected: true });
            joinProject(projectId);
          });
          // Set up listeners for this connection
          get().connect();
        } else {
          // Already connected, join immediately
          joinProject(projectId);
        }
      },

      leaveWorkspace: () => {
        const { currentProjectId, activeConversationId } = get();
        if (currentProjectId) {
          leaveProject(currentProjectId);
        }
        if (activeConversationId) {
          leaveConversation(activeConversationId);
        }
        set({
          currentProjectId: null,
          currentConversation: null,
          activeConversationId: null,
          presentUsers: [],
          cursors: new Map(),
          messages: [],
          hasMoreMessages: true,
        });
      },

      fetchConversations: async () => {
        try {
          const conversations = await apiClient.chat.getConversations();
          const unreadCount = await apiClient.chat.getUnreadCount();
          set({
            conversations,
            unreadCounts: unreadCount.byConversation,
          });
        } catch (error) {
          console.error('Failed to fetch conversations:', error);
        }
      },

      openConversation: (conversationId: string) => {
        const conversation = get().conversations.find(c => c.id === conversationId);
        if (conversation) {
          get().switchConversation(conversationId);
        }
      },

      startDM: async (targetUserId: string) => {
        try {
          const conversation = await apiClient.chat.getOrCreateDirectConversation(targetUserId);
          await get().fetchConversations(); // Refresh list
          get().switchConversation(conversation.id);
        } catch (error) {
          console.error('Failed to start DM:', error);
        }
      },

      switchConversation: async (conversationId: string) => {
        const { activeConversationId } = get();

        // Leave current conversation
        if (activeConversationId && activeConversationId !== conversationId) {
          leaveConversation(activeConversationId);
        }

        // Join new conversation
        joinConversation(conversationId);

        set({
          activeConversationId: conversationId,
          messages: [],
          isLoadingHistory: true,
          hasMoreMessages: true,
        });

        // Clear unread count for this conversation
        const unreadCounts = { ...get().unreadCounts };
        delete unreadCounts[conversationId];
        set({ unreadCounts });

        // Load conversation and messages
        try {
          const conversation = await apiClient.chat.getConversation(conversationId);
          set({ currentConversation: conversation });

          const messages = await apiClient.chat.getMessages(conversationId, { limit: 50 });
          const chatMessages = messages
            .map((msg) => messageToChat(msg, conversationId))
            .reverse();
          set({
            messages: chatMessages,
            hasMoreMessages: messages.length === 50,
          });

          // Mark as read
          await apiClient.chat.markAsRead(conversationId);
        } catch (error) {
          console.error('Failed to load conversation:', error);
        } finally {
          set({ isLoadingHistory: false });
        }
      },

      sendMessage: (content: string, replyToId?: string) => {
        const { activeConversationId, currentConversation, currentProjectId } = get();
        if (!content.trim()) return;

        // Send to appropriate endpoint based on conversation type
        if (currentConversation?.type === 'PROJECT' && currentProjectId) {
          sendChatMessage(currentProjectId, content, replyToId);
        } else if (activeConversationId) {
          sendConversationMessage(activeConversationId, content, replyToId);
        }
      },

      clearMessages: () => {
        set({ messages: [] });
      },

      loadMoreMessages: async () => {
        const { currentConversation, activeConversationId, messages, hasMoreMessages, isLoadingHistory } = get();

        if (!currentConversation || !activeConversationId || !hasMoreMessages || isLoadingHistory) {
          return;
        }

        const oldestMessage = messages[0];
        if (!oldestMessage) return;

        set({ isLoadingHistory: true });

        try {
          const olderMessages = await apiClient.chat.getMessages(activeConversationId, {
            limit: 50,
            before: oldestMessage.id,
          });

          if (olderMessages.length === 0) {
            set({ hasMoreMessages: false });
            return;
          }

          const chatMessages = olderMessages
            .map((msg) => messageToChat(msg, activeConversationId))
            .reverse();

          set({
            messages: [...chatMessages, ...messages],
            hasMoreMessages: olderMessages.length === 50,
          });
        } catch (error) {
          console.error('Failed to load more messages:', error);
        } finally {
          set({ isLoadingHistory: false });
        }
      },

      startCall: async (targetUserId: string, type: 'VOICE' | 'VIDEO') => {
        try {
          initiateCall({
            targetUserIds: [targetUserId],
            type,
          });
        } catch (error) {
          console.error('Failed to start call:', error);
        }
      },

      acceptCall: () => {
        const { incomingCall } = get();
        if (incomingCall) {
          joinCall(incomingCall.callId);
        }
      },

      declineCall: () => {
        const { incomingCall } = get();
        if (incomingCall) {
          // Emit decline event to socket server
          socketDeclineCall(incomingCall.callId);
          // Clear local state
          set({ incomingCall: null });
        }
      },

      clearIncomingCall: () => {
        // Just clear the incoming call state without emitting decline event
        // Used when accepting a call (the join handles the acceptance)
        set({ incomingCall: null });
      },

      endCall: () => {
        set({ activeCall: null });
      },
    }),
    { name: 'SocketStore' }
  )
);
