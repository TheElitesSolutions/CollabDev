'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { CallType, CallStatus } from '@/lib/api-client';

export interface Participant {
  id: string;
  peerId: string;
  userId: string;
  username: string;
  userImage?: string | null;
  stream?: MediaStream;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
}

export interface CallState {
  callId: string | null;
  status: CallStatus | null;
  type: CallType | null;
  participants: Participant[];
  isInitiator: boolean;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export function useWebRTC(projectId: string | null) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callState, setCallState] = useState<CallState>({
    callId: null,
    status: null,
    type: null,
    participants: [],
    isInitiator: false,
  });
  const [error, setError] = useState<string | null>(null);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  // Refs to track latest state for event handlers (avoids stale closure issues)
  const callStateRef = useRef(callState);
  const localStreamRef = useRef(localStream);
  const screenStreamRef = useRef(screenStream);

  // Keep refs in sync with state
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  // Get user media
  const getMediaStream = useCallback(async (type: CallType): Promise<MediaStream | null> => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: type === 'VIDEO',
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      // CRITICAL: Update ref immediately so createPeerConnection can access it
      // before the useEffect has a chance to run
      localStreamRef.current = stream;
      console.log('[WebRTC] Got media stream:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));
      return stream;
    } catch (err: any) {
      console.error('Failed to get media stream:', err);
      setError(err.message || 'Failed to access camera/microphone');
      return null;
    }
  }, []);

  // Create peer connection for a participant
  const createPeerConnection = useCallback((peerId: string, userId: string, username: string, userImage?: string | null) => {
    if (peerConnections.current.has(peerId)) {
      return peerConnections.current.get(peerId)!;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnections.current.set(peerId, pc);

    // Add local stream tracks - use ref for latest value to avoid stale closure
    const currentLocalStream = localStreamRef.current;
    console.log('[WebRTC] Creating peer connection, localStream:', currentLocalStream ? `${currentLocalStream.getTracks().length} tracks` : 'null');
    if (currentLocalStream) {
      currentLocalStream.getTracks().forEach((track) => {
        pc.addTrack(track, currentLocalStream);
        console.log('[WebRTC] Added track to peer connection:', track.kind);
      });
    } else {
      console.warn('[WebRTC] No local stream available when creating peer connection!');
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setCallState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.peerId === peerId ? { ...p, stream: remoteStream } : p
        ),
      }));
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket();
        socket?.emit('call:ice-candidate', {
          projectId,
          callId: callState.callId,
          targetPeerId: peerId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection state with ${peerId}:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        // Handle reconnection or cleanup
        console.warn(`[WebRTC] Connection ${pc.connectionState} for peer ${peerId}`);
      }
    };

    // Add participant to state
    setCallState((prev) => ({
      ...prev,
      participants: [
        ...prev.participants.filter((p) => p.peerId !== peerId),
        {
          id: peerId,
          peerId,
          userId,
          username,
          userImage,
          isMuted: false,
          isVideoOff: false,
          isScreenSharing: false,
        },
      ],
    }));

    // Process any pending ICE candidates
    const pending = pendingCandidates.current.get(peerId);
    if (pending) {
      pending.forEach(async (candidate) => {
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          console.error('Failed to add pending ICE candidate:', err);
        }
      });
      pendingCandidates.current.delete(peerId);
    }

    return pc;
  }, [localStream, projectId, callState.callId]);

  // Initialize a call
  const initiateCall = useCallback(async (type: CallType, conversationId?: string) => {
    if (!projectId) return;

    const stream = await getMediaStream(type);
    if (!stream) return;

    setCallState({
      callId: null,
      status: 'RINGING',
      type,
      participants: [],
      isInitiator: true,
    });

    const socket = getSocket();
    socket?.emit('call:initiate', {
      projectId,
      type,
      conversationId,
    });
  }, [projectId, getMediaStream]);

  // Join an existing call
  const joinCall = useCallback(async (callId: string, type: CallType) => {
    const stream = await getMediaStream(type);
    if (!stream) {
      // Notify caller that we couldn't join due to media error
      const socket = getSocket();
      const errorMessage = error || 'Could not access camera/microphone';
      socket?.emit('call:join-failed', {
        callId,
        reason: errorMessage,
      });
      console.error('[WebRTC] Failed to join call - could not get media stream');

      // Reset call state for the callee
      setCallState({
        callId: null,
        status: null,
        type: null,
        participants: [],
        isInitiator: false,
      });
      // Error is already set by getMediaStream
      return;
    }

    setCallState((prev) => ({
      ...prev,
      callId,
      status: 'ONGOING',
      type,
      isInitiator: false,
    }));

    const socket = getSocket();
    socket?.emit('call:join', {
      projectId,
      callId,
    });
  }, [projectId, getMediaStream, error]);

  // Leave the current call
  const leaveCall = useCallback(() => {
    const socket = getSocket();
    if (callState.callId) {
      socket?.emit('call:leave', {
        projectId,
        callId: callState.callId,
      });
    }

    // Cleanup
    localStream?.getTracks().forEach((track) => track.stop());
    screenStream?.getTracks().forEach((track) => track.stop());
    peerConnections.current.forEach((pc) => pc.close());
    peerConnections.current.clear();

    setLocalStream(null);
    setScreenStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    setCallState({
      callId: null,
      status: null,
      type: null,
      participants: [],
      isInitiator: false,
    });
  }, [callState.callId, projectId, localStream, screenStream]);

  // Decline an incoming call
  const declineCall = useCallback((callId: string) => {
    const socket = getSocket();
    socket?.emit('call:decline', {
      projectId,
      callId,
    });
  }, [projectId]);

  // End the call (for initiator)
  const endCall = useCallback(() => {
    const socket = getSocket();
    if (callState.callId) {
      socket?.emit('call:end', {
        projectId,
        callId: callState.callId,
      });
    }
    leaveCall();
  }, [callState.callId, projectId, leaveCall]);

  // Toggle audio
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);

        const socket = getSocket();
        socket?.emit('call:toggle-media', {
          projectId,
          callId: callState.callId,
          isMuted: !audioTrack.enabled,
        });
      }
    }
  }, [localStream, projectId, callState.callId]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);

        const socket = getSocket();
        socket?.emit('call:toggle-media', {
          projectId,
          callId: callState.callId,
          isVideoOff: !videoTrack.enabled,
        });
      }
    }
  }, [localStream, projectId, callState.callId]);

  // Toggle screen sharing
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing && screenStream) {
      // Stop screen sharing
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
      setIsScreenSharing(false);

      // Replace screen track with camera track in all peer connections
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });
      }

      const socket = getSocket();
      socket?.emit('call:toggle-media', {
        projectId,
        callId: callState.callId,
        isScreenSharing: false,
      });
    } else {
      // Start screen sharing
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        setScreenStream(stream);
        setIsScreenSharing(true);

        const screenTrack = stream.getVideoTracks()[0];

        // Replace camera track with screen track in all peer connections
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        // Handle screen share ended by user
        screenTrack.onended = () => {
          toggleScreenShare();
        };

        const socket = getSocket();
        socket?.emit('call:toggle-media', {
          projectId,
          callId: callState.callId,
          isScreenSharing: true,
        });
      } catch (err: any) {
        console.error('Failed to start screen sharing:', err);
        setError(err.message || 'Failed to share screen');
      }
    }
  }, [isScreenSharing, screenStream, localStream, projectId, callState.callId]);

  // Socket event handlers
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !projectId) return;

    // Handle call initiated (you are the initiator)
    const handleCallInitiated = async (data: { callId: string; type: CallType }) => {
      console.log('[WebRTC] Call initiated - setting isInitiator to true:', data);

      // CRITICAL: Get media stream NOW before callee joins
      // Without this, no tracks will be added to peer connection
      const stream = await getMediaStream(data.type);
      if (!stream) {
        console.error('[WebRTC] Failed to get media stream for initiated call');
        return;
      }
      console.log('[WebRTC] Got media stream for initiated call:', stream.getTracks().map(t => t.kind));

      setCallState((prev) => ({
        ...prev,
        callId: data.callId,
        status: 'RINGING',
        type: data.type,
        isInitiator: true, // CRITICAL: We initiated this call, so we should create offers
      }));
    };

    // Handle incoming call
    const handleIncomingCall = (data: {
      callId: string;
      type: CallType;
      initiator: { id: string; username: string; image?: string };
    }) => {
      setCallState({
        callId: data.callId,
        status: 'RINGING',
        type: data.type,
        participants: [{
          id: data.initiator.id,
          peerId: data.initiator.id,
          userId: data.initiator.id,
          username: data.initiator.username,
          userImage: data.initiator.image,
          isMuted: false,
          isVideoOff: false,
          isScreenSharing: false,
        }],
        isInitiator: false,
      });
    };

    // Handle user joined call
    const handleUserJoined = async (data: {
      peerId: string;
      userId: string;
      username: string;
      userImage?: string;
    }) => {
      const currentState = callStateRef.current;
      console.log('[WebRTC] User joined:', data);
      console.log('[WebRTC] Current call state:', {
        callId: currentState.callId,
        status: currentState.status,
        type: currentState.type,
        isInitiator: currentState.isInitiator,
        participantCount: currentState.participants.length,
      });

      // Check if we already have a connection with this peer
      const existingPc = peerConnections.current.get(data.peerId);
      if (existingPc && existingPc.connectionState !== 'new' && existingPc.connectionState !== 'connecting') {
        console.log('[WebRTC] Skipping duplicate user-joined event for peer:', data.peerId, 'state:', existingPc.connectionState);
        return;
      }

      // Update call status to ONGOING when someone joins (for initiator)
      setCallState((prev) => ({
        ...prev,
        status: 'ONGOING',
      }));

      const pc = createPeerConnection(data.peerId, data.userId, data.username, data.userImage);

      // Create and send offer if we're the initiator (use ref for latest state)
      const shouldCreateOffer = currentState.isInitiator;
      console.log('[WebRTC] Should create offer:', shouldCreateOffer, '(isInitiator:', currentState.isInitiator, ')');

      if (shouldCreateOffer && currentState.callId) {
        // Only create offer if we haven't already (check signaling state)
        if (pc.signalingState === 'stable' && !pc.remoteDescription) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit('call:offer', {
            projectId,
            callId: currentState.callId,
            targetPeerId: data.peerId,
            offer: pc.localDescription,
          });
          console.log('[WebRTC] Sent offer to:', data.peerId);
        } else {
          console.log('[WebRTC] Skipping offer - already in progress, signalingState:', pc.signalingState);
        }
      }
    };

    // Handle WebRTC offer
    const handleOffer = async (data: {
      fromPeerId: string;
      fromUserId: string;
      fromUsername: string;
      fromUserImage?: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      console.log('[WebRTC] Received offer from:', data.fromPeerId);
      const pc = createPeerConnection(data.fromPeerId, data.fromUserId, data.fromUsername, data.fromUserImage);

      await pc.setRemoteDescription(data.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const currentState = callStateRef.current;
      socket.emit('call:answer', {
        projectId,
        callId: currentState.callId,
        targetPeerId: data.fromPeerId,
        answer: pc.localDescription,
      });
      console.log('[WebRTC] Sent answer to:', data.fromPeerId);
    };

    // Handle WebRTC answer
    const handleAnswer = async (data: {
      fromPeerId: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      const pc = peerConnections.current.get(data.fromPeerId);
      if (pc) {
        await pc.setRemoteDescription(data.answer);
      }
    };

    // Handle ICE candidate
    const handleIceCandidate = async (data: {
      fromPeerId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const pc = peerConnections.current.get(data.fromPeerId);
      if (pc && pc.remoteDescription) {
        try {
          await pc.addIceCandidate(data.candidate);
        } catch (err) {
          console.error('Failed to add ICE candidate:', err);
        }
      } else {
        // Store candidate for later
        const pending = pendingCandidates.current.get(data.fromPeerId) || [];
        pending.push(data.candidate);
        pendingCandidates.current.set(data.fromPeerId, pending);
      }
    };

    // Handle user left call
    const handleUserLeft = (data: { peerId: string }) => {
      const pc = peerConnections.current.get(data.peerId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(data.peerId);
      }

      setCallState((prev) => ({
        ...prev,
        participants: prev.participants.filter((p) => p.peerId !== data.peerId),
      }));
    };

    // Handle call ended
    const handleCallEnded = () => {
      leaveCall();
    };

    // Handle call declined
    const handleCallDeclined = (data: { callId: string; declinedBy: string }) => {
      console.log(`[WebRTC] Call ${data.callId} declined by ${data.declinedBy}`);
      // Reset call state and cleanup (use refs for latest values)
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();

      setLocalStream(null);
      setScreenStream(null);
      setIsMuted(false);
      setIsVideoOff(false);
      setIsScreenSharing(false);
      setCallState({
        callId: null,
        status: null,
        type: null,
        participants: [],
        isInitiator: false,
      });
      setError('Call was declined');
    };

    // Handle call join failed (callee couldn't access media)
    const handleCallJoinFailed = (data: { callId: string; userId: string; username: string; reason: string }) => {
      console.log(`[WebRTC] Call ${data.callId} join failed by ${data.username}: ${data.reason}`);
      // Reset call state and cleanup (use refs for latest values)
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();

      setLocalStream(null);
      setScreenStream(null);
      setIsMuted(false);
      setIsVideoOff(false);
      setIsScreenSharing(false);
      setCallState({
        callId: null,
        status: null,
        type: null,
        participants: [],
        isInitiator: false,
      });
      setError(`${data.username} couldn't join: ${data.reason}`);
    };

    // Handle media toggle
    const handleMediaToggle = (data: {
      peerId: string;
      isMuted?: boolean;
      isVideoOff?: boolean;
      isScreenSharing?: boolean;
    }) => {
      setCallState((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.peerId === data.peerId
            ? {
                ...p,
                isMuted: data.isMuted ?? p.isMuted,
                isVideoOff: data.isVideoOff ?? p.isVideoOff,
                isScreenSharing: data.isScreenSharing ?? p.isScreenSharing,
              }
            : p
        ),
      }));
    };

    socket.on('call:initiated', handleCallInitiated);
    socket.on('call:incoming', handleIncomingCall);
    socket.on('call:user-joined', handleUserJoined);
    socket.on('call:offer', handleOffer);
    socket.on('call:answer', handleAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:user-left', handleUserLeft);
    socket.on('call:ended', handleCallEnded);
    socket.on('call:declined', handleCallDeclined);
    socket.on('call:join-failed', handleCallJoinFailed);
    socket.on('call:media-toggle', handleMediaToggle);

    return () => {
      socket.off('call:initiated', handleCallInitiated);
      socket.off('call:incoming', handleIncomingCall);
      socket.off('call:user-joined', handleUserJoined);
      socket.off('call:offer', handleOffer);
      socket.off('call:answer', handleAnswer);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:user-left', handleUserLeft);
      socket.off('call:ended', handleCallEnded);
      socket.off('call:declined', handleCallDeclined);
      socket.off('call:join-failed', handleCallJoinFailed);
      socket.off('call:media-toggle', handleMediaToggle);
    };
    // Note: We use refs (callStateRef, localStreamRef, screenStreamRef) to access latest state
    // in handlers, so we don't need callState in dependencies - this prevents race conditions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, createPeerConnection, leaveCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach((track) => track.stop());
      screenStream?.getTracks().forEach((track) => track.stop());
      peerConnections.current.forEach((pc) => pc.close());
    };
  }, [localStream, screenStream]);

  return {
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
  };
}
