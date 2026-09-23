import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Users,
  Maximize2,
  Minimize2,
  ScreenShare,
  ScreenShareOff,
  MessageSquare,
  Settings,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
  VideoTileState
} from 'amazon-chime-sdk-js';

const ActiveCallInterface = ({ 
  call, 
  onEndCall, 
  currentUser,
  isInitiator = false 
}) => {
  // Media state
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Call state
  const [callDuration, setCallDuration] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [error, setError] = useState(null);
  
  // Device state
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [videoInputDevices, setVideoInputDevices] = useState([]);
  const [selectedAudioInput, setSelectedAudioInput] = useState(null);
  const [selectedVideoInput, setSelectedVideoInput] = useState(null);
  
  // Participant state
  const [participants, setParticipants] = useState([]);
  const [remoteVideoTiles, setRemoteVideoTiles] = useState({});
  
  // Refs
  const meetingSessionRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const audioElementRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const timerIntervalRef = useRef(null);
  
  // Initialize Chime SDK and start media
  useEffect(() => {
    const initializeChimeSession = async () => {
      try {
        console.log('🎥 [ActiveCallInterface] Initializing Chime SDK session...');
        console.log('📋 Call data received:', call);
        
        // Validate required call data
        if (!call || !call.mediaPlacement || !call.attendee) {
          console.error('❌ Missing required call data:', { 
            hasCall: !!call, 
            hasMediaPlacement: !!call?.mediaPlacement, 
            hasAttendee: !!call?.attendee 
          });
          setError('Missing call configuration data');
          setConnectionStatus('failed');
          return;
        }
        
        // Create logger
        const logger = new ConsoleLogger('ChimeMeeting', LogLevel.INFO);
        
        // Create device controller
        const deviceController = new DefaultDeviceController(logger);
        
        // Create meeting session configuration
        const configuration = new MeetingSessionConfiguration(
          {
            MeetingId: call.meetingId,
            MediaPlacement: {
              AudioHostUrl: call.mediaPlacement.AudioHostUrl,
              AudioFallbackUrl: call.mediaPlacement.AudioFallbackUrl,
              SignalingUrl: call.mediaPlacement.SignalingUrl,
              TurnControlUrl: call.mediaPlacement.TurnControlUrl,
              EventIngestionUrl: call.mediaPlacement.EventIngestionUrl
            }
          },
          {
            AttendeeId: call.attendee.attendeeId,
            ExternalUserId: call.attendee.externalUserId,
            JoinToken: call.attendee.joinToken
          }
        );
        
        console.log('📋 Meeting configuration created:', configuration);
        
        // Create meeting session
        const meetingSession = new DefaultMeetingSession(
          configuration,
          logger,
          deviceController
        );
        
        meetingSessionRef.current = meetingSession;
        
        // Get audio/video devices
        const audioInputs = await meetingSession.audioVideo.listAudioInputDevices();
        const videoInputs = await meetingSession.audioVideo.listVideoInputDevices();
        
        console.log('🎤 Audio input devices:', audioInputs);
        console.log('📹 Video input devices:', videoInputs);
        
        setAudioInputDevices(audioInputs);
        setVideoInputDevices(videoInputs);
        
        // Select first available devices
        if (audioInputs.length > 0) {
          const audioDevice = audioInputs[0];
          setSelectedAudioInput(audioDevice.deviceId);
          await meetingSession.audioVideo.startAudioInput(audioDevice.deviceId);
          console.log('✅ Audio input started:', audioDevice.label);
        }
        
        if (videoInputs.length > 0) {
          const videoDevice = videoInputs[0];
          setSelectedVideoInput(videoDevice.deviceId);
          await meetingSession.audioVideo.startVideoInput(videoDevice.deviceId);
          console.log('✅ Video input started:', videoDevice.label);
        }
        
        // Set up audio output
        const audioOutputs = await meetingSession.audioVideo.listAudioOutputDevices();
        if (audioOutputs.length > 0) {
          await meetingSession.audioVideo.chooseAudioOutput(audioOutputs[0].deviceId);
        }
        
        // Create audio element for remote audio
        if (!audioElementRef.current) {
          const audioElement = document.createElement('audio');
          audioElement.id = 'chime-audio-element';
          audioElement.autoplay = true;
          document.body.appendChild(audioElement);
          audioElementRef.current = audioElement;
        }
        
        // Bind audio element
        await meetingSession.audioVideo.bindAudioElement(audioElementRef.current);
        console.log('✅ Audio element bound');
        
        // Set up observers
        const observer = {
          audioVideoDidStart: () => {
            console.log('✅ Audio/Video session started');
            setConnectionStatus('connected');
            
            // Start local video tile
            meetingSession.audioVideo.startLocalVideoTile();
            console.log('✅ Local video tile started');
          },
          
          audioVideoDidStop: (sessionStatus) => {
            console.log('⚠️ Audio/Video session stopped:', sessionStatus);
            setConnectionStatus('disconnected');
          },
          
          audioVideoDidStartConnecting: (reconnecting) => {
            console.log('🔄 Audio/Video connecting, reconnecting:', reconnecting);
            setConnectionStatus(reconnecting ? 'reconnecting' : 'connecting');
          },
          
          videoTileDidUpdate: (tileState) => {
            console.log('📹 Video tile updated:', tileState);
            
            if (!tileState.boundAttendeeId) {
              return;
            }
            
            if (tileState.localTile) {
              // Local video
              if (localVideoRef.current) {
                meetingSession.audioVideo.bindVideoElement(
                  tileState.tileId,
                  localVideoRef.current
                );
                console.log('✅ Local video bound to element');
              }
            } else {
              // Remote video
              if (remoteVideoRef.current) {
                meetingSession.audioVideo.bindVideoElement(
                  tileState.tileId,
                  remoteVideoRef.current
                );
                console.log('✅ Remote video bound to element');
              }
              
              setRemoteVideoTiles(prev => ({
                ...prev,
                [tileState.tileId]: tileState
              }));
            }
          },
          
          videoTileWasRemoved: (tileId) => {
            console.log('📹 Video tile removed:', tileId);
            setRemoteVideoTiles(prev => {
              const newTiles = { ...prev };
              delete newTiles[tileId];
              return newTiles;
            });
          },
          
          attendeeIdDidJoin: (attendeeId, externalUserId) => {
            console.log('👤 Attendee joined:', attendeeId, externalUserId);
            setParticipants(prev => [...prev, { attendeeId, externalUserId }]);
          },
          
          attendeeIdDidLeave: (attendeeId) => {
            console.log('👤 Attendee left:', attendeeId);
            setParticipants(prev => prev.filter(p => p.attendeeId !== attendeeId));
          },
          
          attendeeIdDidMute: (attendeeId) => {
            console.log('🔇 Attendee muted:', attendeeId);
          },
          
          attendeeIdDidUnmute: (attendeeId) => {
            console.log('🔊 Attendee unmuted:', attendeeId);
          }
        };
        
        meetingSession.audioVideo.addObserver(observer);
        
        // Start the audio/video session
        console.log('🚀 Starting audio/video session...');
        meetingSession.audioVideo.start();
        
        // Start call timer
        callStartTimeRef.current = Date.now();
        
      } catch (err) {
        console.error('❌ Error initializing Chime session:', err);
        setError(err.message || 'Failed to initialize video call');
        setConnectionStatus('failed');
      }
    };
    
    initializeChimeSession();
    
    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up Chime session...');
      
      if (meetingSessionRef.current) {
        try {
          meetingSessionRef.current.audioVideo.stopLocalVideoTile();
          meetingSessionRef.current.audioVideo.stop();
          console.log('✅ Chime session stopped');
        } catch (err) {
          console.error('Error stopping Chime session:', err);
        }
      }
      
      if (audioElementRef.current) {
        audioElementRef.current.remove();
        audioElementRef.current = null;
      }
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [call]);
  
  // Call duration timer
  useEffect(() => {
    if (connectionStatus === 'connected') {
      timerIntervalRef.current = setInterval(() => {
        if (callStartTimeRef.current) {
          const elapsed = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
          setCallDuration(elapsed);
        }
      }, 1000);
    }
    
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [connectionStatus]);
  
  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!meetingSessionRef.current) return;
    
    try {
      if (isMuted) {
        await meetingSessionRef.current.audioVideo.realtimeUnmuteLocalAudio();
        console.log('🔊 Unmuted');
      } else {
        meetingSessionRef.current.audioVideo.realtimeMuteLocalAudio();
        console.log('🔇 Muted');
      }
      setIsMuted(!isMuted);
    } catch (err) {
      console.error('Error toggling mute:', err);
    }
  }, [isMuted]);
  
  // Toggle video
  const toggleVideo = useCallback(async () => {
    if (!meetingSessionRef.current) return;
    
    try {
      if (isVideoOn) {
        meetingSessionRef.current.audioVideo.stopLocalVideoTile();
        console.log('📹 Video stopped');
      } else {
        if (selectedVideoInput) {
          await meetingSessionRef.current.audioVideo.startVideoInput(selectedVideoInput);
        }
        meetingSessionRef.current.audioVideo.startLocalVideoTile();
        console.log('📹 Video started');
      }
      setIsVideoOn(!isVideoOn);
    } catch (err) {
      console.error('Error toggling video:', err);
    }
  }, [isVideoOn, selectedVideoInput]);
  
  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    if (!meetingSessionRef.current) return;
    
    try {
      if (isScreenSharing) {
        await meetingSessionRef.current.audioVideo.stopContentShare();
        console.log('🖥️ Screen share stopped');
      } else {
        await meetingSessionRef.current.audioVideo.startContentShareFromScreenCapture();
        console.log('🖥️ Screen share started');
      }
      setIsScreenSharing(!isScreenSharing);
    } catch (err) {
      console.error('Error toggling screen share:', err);
      setError('Failed to share screen');
    }
  }, [isScreenSharing]);
  
  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);
  
  // Handle end call
  const handleEndCall = useCallback(async () => {
    console.log('📞 Ending call...');
    
    if (meetingSessionRef.current) {
      try {
        meetingSessionRef.current.audioVideo.stopLocalVideoTile();
        meetingSessionRef.current.audioVideo.stop();
      } catch (err) {
        console.error('Error stopping session:', err);
      }
    }
    
    if (onEndCall) {
      onEndCall();
    }
  }, [onEndCall]);
  
  // Determine other participant name
  const otherParticipantName = isInitiator 
    ? (call?.recipientName || call?.vendorName || 'Vendor')
    : (call?.initiatorName || 'Project Manager');
  
  return (
    <div className="fixed inset-0 bg-cta z-50 flex flex-col">
      {/* Header */}
      <div className="bg-cta px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-info rounded-full flex items-center justify-center">
            <Video className="w-5 h-5 text-cta-foreground" />
          </div>
          <div>
            <h2 className="text-white font-semibold">
              {call?.callTitle || 'Video Call'}
            </h2>
            <p className="text-dim text-sm">
              with {otherParticipantName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            connectionStatus === 'connected' 
              ? 'bg-success text-success' 
              : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
              ? 'bg-warning text-warning'
              : 'bg-danger text-danger'
          }`}>
            {connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : connectionStatus === 'connected' ? (
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="capitalize">{connectionStatus}</span>
          </div>
          
          {/* Duration */}
          <div className="bg-cta px-4 py-2 rounded-lg">
            <span className="text-cta-foreground font-mono text-lg">
              {formatDuration(callDuration)}
            </span>
          </div>
          
          {/* Participants count */}
          <div className="flex items-center gap-2 text-dim">
            <Users className="w-5 h-5" />
            <span>{participants.length + 1}</span>
          </div>
        </div>
      </div>
      
      {/* Error banner */}
      {error && (
        <div className="bg-danger border-b border-danger px-6 py-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-danger" />
          <span className="text-danger">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-danger hover:text-danger"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {/* Video area */}
      <div className="flex-1 relative bg-cta overflow-hidden">
        {/* Remote video (main) */}
        <div className="absolute inset-0 flex items-center justify-center">
          {Object.keys(remoteVideoTiles).length > 0 ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 bg-cta rounded-full flex items-center justify-center">
                <span className="text-4xl text-white font-bold">
                  {otherParticipantName.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-dim">
                {connectionStatus === 'connected' 
                  ? 'Waiting for video...' 
                  : 'Connecting...'}
              </p>
            </div>
          )}
        </div>
        
        {/* Local video (pip) */}
        <div className="absolute bottom-6 right-6 w-48 h-36 bg-cta rounded-lg overflow-hidden shadow-2xl border-2 border-line">
          {isVideoOn ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-cta">
              <div className="w-16 h-16 bg-cta rounded-full flex items-center justify-center">
                <span className="text-xl text-white font-bold">
                  {currentUser?.name?.charAt(0) || 'Y'}
                </span>
              </div>
            </div>
          )}
          
          {/* Mute indicator on local video */}
          {isMuted && (
            <div className="absolute bottom-2 left-2 bg-danger p-1 rounded-full">
              <MicOff className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
      </div>
      
      {/* Controls */}
      <div className="bg-cta px-6 py-4">
        <div className="flex items-center justify-center gap-4">
          {/* Mute button */}
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-all ${
              isMuted 
                ? 'bg-danger hover:bg-danger' 
                : 'bg-cta hover:bg-cta'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <MicOff className="w-6 h-6 text-white" />
            ) : (
              <Mic className="w-6 h-6 text-white" />
            )}
          </button>
          
          {/* Video button */}
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full transition-all ${
              !isVideoOn 
                ? 'bg-danger hover:bg-danger' 
                : 'bg-cta hover:bg-cta'
            }`}
            title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoOn ? (
              <Video className="w-6 h-6 text-white" />
            ) : (
              <VideoOff className="w-6 h-6 text-white" />
            )}
          </button>
          
          {/* Screen share button */}
          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-all ${
              isScreenSharing 
                ? 'bg-info hover:bg-info' 
                : 'bg-cta hover:bg-cta'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            {isScreenSharing ? (
              <ScreenShareOff className="w-6 h-6 text-white" />
            ) : (
              <ScreenShare className="w-6 h-6 text-white" />
            )}
          </button>
          
          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            className="p-4 rounded-full bg-cta hover:bg-cta transition-all"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-6 h-6 text-white" />
            ) : (
              <Maximize2 className="w-6 h-6 text-white" />
            )}
          </button>
          
          {/* End call button */}
          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-danger hover:bg-danger transition-all ml-4"
            title="End call"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveCallInterface;
