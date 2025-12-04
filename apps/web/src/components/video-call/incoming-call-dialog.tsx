'use client';

import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSocketStore } from '@/store/socket.store';

interface IncomingCallDialogProps {
  onAccept: (callId: string, type: 'VOICE' | 'VIDEO') => void;
}

export function IncomingCallDialog({ onAccept }: IncomingCallDialogProps) {
  const incomingCall = useSocketStore((state) => state.incomingCall);
  const clearIncomingCall = useSocketStore((state) => state.clearIncomingCall);
  const declineCall = useSocketStore((state) => state.declineCall);

  if (!incomingCall) return null;

  const handleAccept = () => {
    onAccept(incomingCall.callId, incomingCall.type);
    // Just clear the UI state - don't emit decline event
    clearIncomingCall();
  };

  const handleDecline = () => {
    // Emit decline to socket server and clear state
    declineCall();
  };

  const initiatorName = incomingCall.initiator?.firstName
    || incomingCall.initiator?.username
    || incomingCall.initiator?.email
    || 'Someone';

  const initiatorInitial = initiatorName[0]?.toUpperCase() || 'U';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80">
      <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 text-center">
        <Avatar className="h-20 w-20 mx-auto mb-4 ring-4 ring-primary/20 animate-pulse">
          <AvatarImage src={incomingCall.initiator?.image || undefined} />
          <AvatarFallback className="text-2xl bg-primary/10">
            {initiatorInitial}
          </AvatarFallback>
        </Avatar>

        <h2 className="text-xl font-semibold">{initiatorName}</h2>
        <p className="text-muted-foreground mb-6">
          Incoming {incomingCall.type === 'VIDEO' ? 'Video' : 'Voice'} Call
        </p>

        <div className="flex justify-center gap-6">
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-16 h-16"
            onClick={handleDecline}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>

          <Button
            size="lg"
            className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700"
            onClick={handleAccept}
          >
            {incomingCall.type === 'VIDEO' ? (
              <Video className="h-6 w-6" />
            ) : (
              <Phone className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
