'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  X,
  Maximize2,
  Minimize2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useWebRTC, Participant } from '@/hooks/use-webrtc';
import { CallType } from '@/lib/api-client';

interface VideoCallProps {
  projectId: string;
  acceptedCallInfo?: { callId: string; type: 'VOICE' | 'VIDEO' } | null;
  onClose: () => void;
}

function VideoTile({
  stream,
  participant,
  isLocal = false,
  isMuted,
  isVideoOff,
  isScreenSharing,
  isExpanded = false,
}: {
  stream?: MediaStream | null;
  participant?: Participant;
  isLocal?: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isExpanded?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div
      className={cn(
        'relative bg-muted rounded-lg overflow-hidden',
        isExpanded ? 'w-full h-full' : 'aspect-video',
        isLocal && !isExpanded && 'absolute bottom-4 right-4 w-32 h-24 z-10 shadow-lg'
      )}
    >
      {stream && !isVideoOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <Avatar className={isExpanded ? 'h-24 w-24' : 'h-12 w-12'}>
            <AvatarImage src={participant?.userImage || undefined} />
            <AvatarFallback className={isExpanded ? 'text-3xl' : 'text-lg'}>
              {participant?.username?.[0]?.toUpperCase() || (isLocal ? 'You' : 'U')}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Status indicators */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1">
        <span className="text-xs text-white bg-black/50 px-2 py-0.5 rounded">
          {isLocal ? 'You' : participant?.username || 'Participant'}
        </span>
        {isMuted && (
          <span className="bg-red-500 p-1 rounded">
            <MicOff className="h-3 w-3 text-white" />
          </span>
        )}
        {isVideoOff && (
          <span className="bg-red-500 p-1 rounded">
            <VideoOff className="h-3 w-3 text-white" />
          </span>
        )}
        {isScreenSharing && (
          <span className="bg-blue-500 p-1 rounded">
            <Monitor className="h-3 w-3 text-white" />
          </span>
        )}
      </div>
    </div>
  );
}

export function VideoCall({ projectId, acceptedCallInfo, onClose }: VideoCallProps) {
  const {
    localStream,
    screenStream,
    callState,
    isMuted,
    isVideoOff,
    isScreenSharing,
    error,
    initiateCall,
    joinCall,
    leaveCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
  } = useWebRTC(projectId);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasJoinedRef = useRef(false);

  // Auto-join call when acceptedCallInfo is provided (accepting an incoming call)
  useEffect(() => {
    if (acceptedCallInfo && !callState.callId && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      joinCall(acceptedCallInfo.callId, acceptedCallInfo.type);
    }
  }, [acceptedCallInfo, callState.callId, joinCall]);

  // Reset the hasJoinedRef when component unmounts
  useEffect(() => {
    return () => {
      hasJoinedRef.current = false;
    };
  }, []);

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Render based on call state
  if (!callState.status) {
    // No active call - show call options
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Start a Call</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose the type of call you want to start with your team members.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => initiateCall('VOICE')}
              >
                <Phone className="h-8 w-8" />
                <span>Voice Call</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => initiateCall('VIDEO')}
              >
                <Video className="h-8 w-8" />
                <span>Video Call</span>
              </Button>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (callState.status === 'RINGING' && !callState.isInitiator) {
    // Incoming call
    const caller = callState.participants[0];
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 text-center">
          <div className="mb-6">
            <Avatar className="h-20 w-20 mx-auto mb-4">
              <AvatarImage src={caller?.userImage || undefined} />
              <AvatarFallback className="text-2xl">
                {caller?.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-semibold">{caller?.username || 'Someone'}</h2>
            <p className="text-muted-foreground">
              is calling you ({callState.type === 'VIDEO' ? 'Video' : 'Voice'})
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-16 h-16"
              onClick={() => callState.callId && declineCall(callState.callId)}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>

            <Button
              variant="default"
              size="lg"
              className="rounded-full w-16 h-16 bg-green-600 hover:bg-green-700"
              onClick={() => callState.callId && callState.type && joinCall(callState.callId, callState.type)}
            >
              <Phone className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (callState.status === 'RINGING' && callState.isInitiator) {
    // Outgoing call - waiting for answer
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4 text-center">
          <div className="mb-6">
            <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
              {callState.type === 'VIDEO' ? (
                <Video className="h-10 w-10 text-primary" />
              ) : (
                <Phone className="h-10 w-10 text-primary" />
              )}
            </div>
            <h2 className="text-xl font-semibold">Calling...</h2>
            <p className="text-muted-foreground">
              Waiting for someone to answer
            </p>
          </div>

          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-16 h-16"
            onClick={endCall}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    );
  }

  // Active call
  return (
    <div
      ref={containerRef}
      className={cn(
        'fixed z-50 bg-black',
        isFullscreen ? 'inset-0' : 'bottom-4 right-4 w-[800px] h-[500px] rounded-lg shadow-2xl'
      )}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2 text-white">
          <Users className="h-5 w-5" />
          <span>{callState.participants.length + 1} participants</span>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white" onClick={toggleFullscreen}>
                {isFullscreen ? (
                  <Minimize2 className="h-5 w-5" />
                ) : (
                  <Maximize2 className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Minimize</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Video Grid */}
      <div className="relative h-full p-4 pt-16 pb-24">
        {callState.participants.length === 0 ? (
          // Only local video
          <VideoTile
            stream={isScreenSharing ? screenStream : localStream}
            isLocal
            isMuted={isMuted}
            isVideoOff={isVideoOff}
            isScreenSharing={isScreenSharing}
            isExpanded
          />
        ) : callState.participants.length === 1 ? (
          // 1:1 call - main participant with local PIP
          <div className="relative h-full">
            <VideoTile
              stream={callState.participants[0].stream}
              participant={callState.participants[0]}
              isMuted={callState.participants[0].isMuted}
              isVideoOff={callState.participants[0].isVideoOff}
              isScreenSharing={callState.participants[0].isScreenSharing}
              isExpanded
            />
            <VideoTile
              stream={isScreenSharing ? screenStream : localStream}
              isLocal
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              isScreenSharing={isScreenSharing}
            />
          </div>
        ) : (
          // Group call - grid layout
          <div className="grid grid-cols-2 gap-2 h-full">
            <VideoTile
              stream={isScreenSharing ? screenStream : localStream}
              isLocal
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              isScreenSharing={isScreenSharing}
            />
            {callState.participants.map((participant) => (
              <VideoTile
                key={participant.peerId}
                stream={participant.stream}
                participant={participant}
                isMuted={participant.isMuted}
                isVideoOff={participant.isVideoOff}
                isScreenSharing={participant.isScreenSharing}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-4 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isMuted ? 'destructive' : 'secondary'}
              size="lg"
              className="rounded-full w-12 h-12"
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isMuted ? 'Unmute' : 'Mute'}</TooltipContent>
        </Tooltip>

        {callState.type === 'VIDEO' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isVideoOff ? 'destructive' : 'secondary'}
                size="lg"
                className="rounded-full w-12 h-12"
                onClick={toggleVideo}
              >
                {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{isVideoOff ? 'Turn on camera' : 'Turn off camera'}</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isScreenSharing ? 'default' : 'secondary'}
              size="lg"
              className={cn('rounded-full w-12 h-12', isScreenSharing && 'bg-blue-600 hover:bg-blue-700')}
              onClick={toggleScreenShare}
            >
              {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isScreenSharing ? 'Stop sharing' : 'Share screen'}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-14 h-14"
              onClick={callState.isInitiator ? endCall : leaveCall}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{callState.isInitiator ? 'End call' : 'Leave call'}</TooltipContent>
        </Tooltip>
      </div>

      {error && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
