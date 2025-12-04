'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    MessageSquare,
    Users,
    PanelRightClose,
    PanelRight,
    Phone,
    Video,
    Send,
    Hash,
    Plus,
    Circle,
    Loader2,
} from 'lucide-react';
import { Conversation, ConversationType } from '@/lib/api-client';
import { useSocketStore } from '@/store/socket.store';
import { useAuthStore } from '@/store/auth.store';
import { PresenceUser } from '@/lib/socket';

interface RightSidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    projectMembers: any[];
    presentUsers: PresenceUser[];
    onStartVideoCall?: () => void;
}

type Tab = 'chat' | 'members';

export function RightSidebar({
    isOpen,
    onToggle,
    projectMembers,
    presentUsers,
    onStartVideoCall,
}: RightSidebarProps) {
    const [activeTab, setActiveTab] = useState<Tab>('chat');
    const { user } = useAuthStore();
    const {
        conversations,
        activeConversationId,
        currentConversation,
        messages,
        unreadCounts,
        isLoadingHistory,
        hasMoreMessages,
        switchConversation,
        startDM,
        sendMessage,
        loadMoreMessages,
        startCall,
    } = useSocketStore();

    const [chatInput, setChatInput] = useState('');

    // Separate conversations into channels and DMs
    const channels = useMemo(
        () => conversations.filter((c) => c.type === 'PROJECT' || c.type === 'GROUP'),
        [conversations]
    );

    const directMessages = useMemo(
        () => conversations.filter((c) => c.type === 'DIRECT'),
        [conversations]
    );

    const handleSendMessage = () => {
        if (chatInput.trim()) {
            sendMessage(chatInput);
            setChatInput('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const getConversationName = (conv: Conversation) => {
        if (conv.type === 'PROJECT') {
            return conv.project?.name || 'Team Chat';
        }
        if (conv.type === 'GROUP') {
            return conv.name || 'Group Chat';
        }
        // For DM, get the other participant
        const otherParticipant = conv.participants.find((p) => p.userId !== user?.id);
        return otherParticipant?.user.displayUsername || otherParticipant?.user.username || otherParticipant?.user.email || 'Unknown';
    };

    const getOtherParticipant = (conv: Conversation) => {
        return conv.participants.find((p) => p.userId !== user?.id)?.user;
    };

    return (
        <div
            className={cn(
                'flex flex-col border-l bg-muted/30 transition-all duration-300',
                isOpen ? 'w-80' : 'w-12'
            )}
        >
            {/* Sidebar Header */}
            <div className="flex h-10 items-center justify-between border-b px-2">
                {isOpen && (
                    <div className="flex gap-1">
                        <Button
                            variant={activeTab === 'chat' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setActiveTab('chat')}
                        >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Chat
                        </Button>
                        <Button
                            variant={activeTab === 'members' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => setActiveTab('members')}
                        >
                            <Users className="h-4 w-4 mr-1" />
                            Members
                        </Button>
                    </div>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onToggle}
                >
                    {isOpen ? (
                        <PanelRightClose className="h-4 w-4" />
                    ) : (
                        <PanelRight className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {/* Sidebar Content */}
            {isOpen && (
                <>
                    {activeTab === 'chat' && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Conversation List - Only show if no active conversation */}
                            {!activeConversationId && (
                                <ScrollArea className="flex-1">
                                    <div className="p-2 space-y-2">
                                        {/* Channels Section */}
                                        <div>
                                            <div className="flex items-center justify-between px-2 py-1">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase">
                                                    Channels
                                                </span>
                                            </div>
                                            {channels.map((conv) => (
                                                <button
                                                    key={conv.id}
                                                    onClick={() => switchConversation(conv.id)}
                                                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-accent text-left transition-colors"
                                                >
                                                    <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                                                    <span className="flex-1 truncate text-sm">
                                                        {getConversationName(conv)}
                                                    </span>
                                                    {unreadCounts[conv.id] > 0 && (
                                                        <Badge variant="default" className="h-5 min-w-5 px-1 text-xs">
                                                            {unreadCounts[conv.id]}
                                                        </Badge>
                                                    )}
                                                </button>
                                            ))}
                                        </div>

                                        <Separator />

                                        {/* Direct Messages Section */}
                                        <div>
                                            <div className="flex items-center justify-between px-2 py-1">
                                                <span className="text-xs font-semibold text-muted-foreground uppercase">
                                                    Direct Messages
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5"
                                                    onClick={() => {
                                                        // Show member list to start a new DM
                                                        setActiveTab('members');
                                                    }}
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            {directMessages.length === 0 ? (
                                                <p className="text-xs text-muted-foreground px-2 py-2">
                                                    No direct messages yet
                                                </p>
                                            ) : (
                                                directMessages.map((conv) => {
                                                    const otherUser = getOtherParticipant(conv);
                                                    return (
                                                        <button
                                                            key={conv.id}
                                                            onClick={() => switchConversation(conv.id)}
                                                            className="w-full flex items-center gap-2 p-2 rounded hover:bg-accent text-left transition-colors"
                                                        >
                                                            <Avatar className="h-6 w-6">
                                                                <AvatarImage src={otherUser?.image || undefined} />
                                                                <AvatarFallback className="text-xs">
                                                                    {otherUser?.firstName?.[0]?.toUpperCase() ||
                                                                        otherUser?.email?.[0]?.toUpperCase() ||
                                                                        'U'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="flex-1 truncate text-sm">
                                                                {getConversationName(conv)}
                                                            </span>
                                                            {unreadCounts[conv.id] > 0 && (
                                                                <Badge variant="default" className="h-5 min-w-5 px-1 text-xs">
                                                                    {unreadCounts[conv.id]}
                                                                </Badge>
                                                            )}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                </ScrollArea>
                            )}

                            {/* Active Conversation View */}
                            {activeConversationId && currentConversation && (
                                <>
                                    {/* Conversation Header */}
                                    <div className="flex items-center gap-2 px-3 py-2 border-b">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2"
                                            onClick={() => switchConversation('')}
                                        >
                                            ← Back
                                        </Button>
                                        <span className="flex-1 font-semibold text-sm truncate">
                                            {getConversationName(currentConversation)}
                                        </span>
                                    </div>

                                    {/* Messages */}
                                    <ScrollArea className="flex-1 px-2 py-2">
                                        <div className="space-y-2">
                                            {/* Load More Button */}
                                            {hasMoreMessages && messages.length > 0 && (
                                                <div className="text-center py-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={loadMoreMessages}
                                                        disabled={isLoadingHistory}
                                                        className="text-xs"
                                                    >
                                                        {isLoadingHistory ? (
                                                            <>
                                                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                                Loading...
                                                            </>
                                                        ) : (
                                                            'Load older messages'
                                                        )}
                                                    </Button>
                                                </div>
                                            )}
                                            {isLoadingHistory && messages.length === 0 ? (
                                                <div className="flex-1 flex items-center justify-center text-center p-4">
                                                    <div>
                                                        <Loader2 className="h-8 w-8 mx-auto text-muted-foreground mb-2 animate-spin" />
                                                        <p className="text-sm text-muted-foreground">
                                                            Loading messages...
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : messages.length === 0 ? (
                                                <div className="flex-1 flex items-center justify-center text-center p-4">
                                                    <div>
                                                        <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                                        <p className="text-sm text-muted-foreground">
                                                            No messages yet. Start the conversation!
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                messages.map((msg) => (
                                                    <div
                                                        key={msg.id}
                                                        className={cn(
                                                            'p-2 rounded-lg text-sm max-w-[85%]',
                                                            msg.userId === user?.id
                                                                ? 'bg-primary text-primary-foreground ml-auto'
                                                                : 'bg-muted mr-auto'
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {msg.userImage && (
                                                                <Avatar className="h-4 w-4">
                                                                    <AvatarImage src={msg.userImage} />
                                                                    <AvatarFallback className="text-[8px]">
                                                                        {msg.username?.[0]?.toUpperCase() || 'U'}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                            )}
                                                            <span className="font-medium text-xs opacity-70">
                                                                {msg.username}
                                                            </span>
                                                            <span className="text-[10px] opacity-50">
                                                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                                            </span>
                                                        </div>
                                                        <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>

                                    {/* Message Input */}
                                    <div className="p-2 border-t">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="Type a message..."
                                                value={chatInput}
                                                onChange={(e) => setChatInput(e.target.value)}
                                                onKeyDown={handleKeyPress}
                                                className="text-sm"
                                            />
                                            <Button
                                                size="icon"
                                                onClick={handleSendMessage}
                                                disabled={!chatInput.trim()}
                                            >
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'members' && (
                        <ScrollArea className="flex-1">
                            <div className="p-2 space-y-4">
                                {/* Online Now */}
                                <div>
                                    <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        Online Now ({presentUsers.length})
                                    </h3>
                                    <div className="space-y-1">
                                        {presentUsers.map((pUser) => (
                                            <div
                                                key={pUser.id}
                                                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent"
                                            >
                                                <Avatar className="h-7 w-7">
                                                    <AvatarImage src={pUser.image || undefined} />
                                                    <AvatarFallback className="text-xs">
                                                        {pUser.firstName?.[0]?.toUpperCase() ||
                                                            pUser.email?.[0]?.toUpperCase() ||
                                                            'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm truncate">
                                                        {pUser.firstName
                                                            ? `${pUser.firstName} ${pUser.lastName || ''}`
                                                            : pUser.email}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">Online</p>
                                                </div>
                                                {pUser.id !== user?.id && (
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => {
                                                                startDM(pUser.id);
                                                                setActiveTab('chat');
                                                            }}
                                                            title="Send message"
                                                        >
                                                            <MessageSquare className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => {
                                                                startCall(pUser.id, 'VIDEO');
                                                                onStartVideoCall?.();
                                                            }}
                                                            title="Start video call"
                                                        >
                                                            <Video className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                )}
                                                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                            </div>
                                        ))}
                                        {presentUsers.length === 0 && (
                                            <p className="text-xs text-muted-foreground px-2">
                                                No other users online
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <Separator />

                                {/* All Team Members */}
                                <div>
                                    <h3 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        Team Members
                                    </h3>
                                    <div className="space-y-1">
                                        {projectMembers.map((member) => {
                                            const isOnline = presentUsers.some((p) => p.id === member.userId);
                                            const displayName = member.user?.firstName
                                                ? `${member.user.firstName} ${member.user.lastName || ''}`.trim()
                                                : member.user?.username || member.user?.email || 'Unknown';
                                            return (
                                                <div
                                                    key={member.id}
                                                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent"
                                                >
                                                    <Avatar className="h-7 w-7">
                                                        <AvatarImage src={member.user?.image || undefined} />
                                                        <AvatarFallback className="text-xs">
                                                            {member.user?.firstName?.[0]?.toUpperCase() ||
                                                                member.user?.email?.[0]?.toUpperCase() ||
                                                                'U'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm truncate">{displayName}</p>
                                                        <p className="text-xs text-muted-foreground">{member.role}</p>
                                                    </div>
                                                    {member.userId !== user?.id && (
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => {
                                                                    startDM(member.userId);
                                                                    setActiveTab('chat');
                                                                }}
                                                                title="Send message"
                                                            >
                                                                <MessageSquare className="h-3 w-3" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                onClick={() => {
                                                                    startCall(member.userId, 'VIDEO');
                                                                    onStartVideoCall?.();
                                                                }}
                                                                title="Start video call"
                                                            >
                                                                <Video className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                    <div
                                                        className={cn(
                                                            'h-2 w-2 rounded-full',
                                                            isOnline ? 'bg-green-500' : 'bg-gray-400'
                                                        )}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    )}
                </>
            )}
        </div>
    );
}
