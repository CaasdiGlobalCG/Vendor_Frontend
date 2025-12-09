import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Video, VideoOff, Monitor, Phone, PhoneOff, Users, Settings, Maximize2, Minimize2 } from 'lucide-react';
import {
  DefaultMeetingSession,
  DefaultDeviceController,
  ConsoleLogger,
  LogLevel,
  MeetingSessionConfiguration
} from 'amazon-chime-sdk-js';
import config from '../../../config/env';

const VideoCallModal = ({ 
  isOpen, 
  onClose, 
  workspaceId, 
  currentUser,
  meetingTitle = "Workspace Video Call"
}) => {
  const [meetingSession, setMeetingSession] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [error, setError] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const contentShareRef = useRef(null);
  const audioRef = useRef(null);


  // Initialize meeting when modal opens
  useEffect(() => {
    if (isOpen && !meetingSession) {
      initializeMeeting();
    }
    
    return () => {
      if (meetingSession) {
        leaveMeeting();
      }
    };
  }, [isOpen]);

  const initializeMeeting = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      console.log('🎥 VideoCall: Initializing meeting for workspace:', workspaceId);

      // Create meeting
      const meetingResponse = await fetch(`/api/chime/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          meetingTitle,
          createdBy: currentUser?.id || currentUser?.vendorId
        })
      });

      if (!meetingResponse.ok) {
        throw new Error('Failed to create meeting');
      }

      const meetingData = await meetingResponse.json();
      console.log('✅ VideoCall: Meeting created:', meetingData.meeting.meetingId);

      // Create attendee
      const attendeeResponse = await fetch(`/api/chime/meetings/${meetingData.meeting.meetingId}/attendees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id || currentUser?.vendorId,
          userName: currentUser?.name || currentUser?.companyName || 'Unknown User'
        })
      });

      if (!attendeeResponse.ok) {
        throw new Error('Failed to create attendee');
      }

      const attendeeData = await attendeeResponse.json();
      console.log('✅ VideoCall: Attendee created:', attendeeData.attendee.attendeeId);

      // Initialize Chime SDK
      await setupChimeSession(meetingData.meeting, attendeeData.attendee);

    } catch (error) {
      console.error('❌ VideoCall: Error initializing meeting:', error);
      setError(error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const setupChimeSession = async (meeting, attendee) => {
    try {
      const logger = new ConsoleLogger('ChimeSDK', LogLevel.INFO);
      const deviceController = new DefaultDeviceController(logger);

      // Request camera and microphone permissions explicitly
      console.log('🎥 VideoCall: Requesting device permissions...');
      
      try {
        // First, request permissions using browser API
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        console.log('✅ VideoCall: Browser permissions granted');
        
        // Stop the stream as we'll let Chime handle it
        stream.getTracks().forEach(track => track.stop());
        
        // Now properly configure devices with Chime
        const audioInputDevices = await deviceController.listAudioInputDevices();
        const videoInputDevices = await deviceController.listVideoInputDevices();
        
        console.log('🎤 Available audio devices:', audioInputDevices.length);
        console.log('📹 Available video devices:', videoInputDevices.length);
        
        // Select default devices using correct API
        if (audioInputDevices.length > 0) {
          const audioDevice = audioInputDevices[0];
          console.log('🎤 VideoCall: Selecting audio device:', {
            label: audioDevice.label,
            deviceId: audioDevice.deviceId,
            groupId: audioDevice.groupId
          });
          try {
            await deviceController.startAudioInput(audioDevice);
            console.log('✅ VideoCall: Audio device selected successfully:', audioDevice.label);
          } catch (audioError) {
            console.log('⚠️ VideoCall: Audio device selection failed, trying deviceId:', audioError.message);
            try {
              await deviceController.startAudioInput(audioDevice.deviceId);
              console.log('✅ VideoCall: Audio device selected with deviceId');
            } catch (audioError2) {
              console.error('❌ VideoCall: Audio device selection completely failed:', audioError2);
            }
          }
        } else {
          console.log('⚠️ VideoCall: No audio input devices available');
        }
        
        if (videoInputDevices.length > 0) {
          const videoDevice = videoInputDevices[0];
          console.log('📹 VideoCall: Selecting video device:', {
            label: videoDevice.label,
            deviceId: videoDevice.deviceId,
            groupId: videoDevice.groupId
          });
          try {
            await deviceController.startVideoInput(videoDevice);
            console.log('✅ VideoCall: Video device selected successfully:', videoDevice.label);
          } catch (videoError) {
            console.log('⚠️ VideoCall: Video device selection failed, trying deviceId:', videoError.message);
            try {
              await deviceController.startVideoInput(videoDevice.deviceId);
              console.log('✅ VideoCall: Video device selected with deviceId');
            } catch (videoError2) {
              console.error('❌ VideoCall: Video device selection completely failed:', videoError2);
            }
          }
        } else {
          console.log('⚠️ VideoCall: No video input devices available');
        }
        
      } catch (deviceError) {
        console.error('❌ VideoCall: Error accessing devices:', deviceError);
        throw new Error('Camera/microphone access denied. Please allow permissions and try again.');
      }

      const configuration = new MeetingSessionConfiguration(meeting, attendee);
      const session = new DefaultMeetingSession(configuration, logger, deviceController);

      // Set up audio and video observers
      session.audioVideo.addObserver({
        audioVideoDidStart: () => {
          console.log('✅ VideoCall: Audio/Video started');
          setIsConnected(true);
        },
        audioVideoDidStop: (sessionStatus) => {
          console.log('🛑 VideoCall: Audio/Video stopped:', sessionStatus);
          console.log('🛑 VideoCall: Session status code:', sessionStatus.statusCode());
          console.log('🛑 VideoCall: Session status reason:', sessionStatus.toString());
          setIsConnected(false);
        },
        audioVideoDidStartConnecting: (reconnecting) => {
          console.log('🔄 VideoCall: Connecting...', reconnecting ? 'reconnecting' : 'initial connection');
        },
        connectionDidBecomePoor: () => {
          console.log('⚠️ VideoCall: Connection became poor');
        },
        connectionDidSuggestStopVideo: () => {
          console.log('⚠️ VideoCall: Connection suggests stopping video');
        },
        connectionDidBecomeGood: () => {
          console.log('✅ VideoCall: Connection became good');
        }
      });

      // Set up attendee observer
      session.audioVideo.addObserver({
        attendeeDidJoin: (attendeeId) => {
          console.log('👤 VideoCall: Attendee joined:', attendeeId);
          setAttendees(prev => [...prev, attendeeId]);
        },
        attendeeDidLeave: (attendeeId) => {
          console.log('👋 VideoCall: Attendee left:', attendeeId);
          setAttendees(prev => prev.filter(id => id !== attendeeId));
        }
      });

      // Set up content share observer
      session.audioVideo.addObserver({
        contentShareDidStart: () => {
          console.log('🖥️ VideoCall: Content share started - observer triggered');
          console.log('🖥️ VideoCall: Content share element exists:', !!contentShareRef.current);
          setIsScreenSharing(true);
        },
        contentShareDidStop: () => {
          console.log('🖥️ VideoCall: Content share stopped - observer triggered');
          setIsScreenSharing(false);
        },
        contentShareDidPause: () => {
          console.log('⏸️ VideoCall: Content share paused');
        },
        contentShareDidUnpause: () => {
          console.log('▶️ VideoCall: Content share unpaused');
        }
      });

      // Set up video tile observer for remote videos
      session.audioVideo.addObserver({
        videoTileDidUpdate: (tileState) => {
          console.log('🎥 VideoCall: Video tile updated:', tileState);
          console.log('🎥 VideoCall: Tile state details:', {
            tileId: tileState.tileId,
            localTile: tileState.localTile,
            active: tileState.active,
            paused: tileState.paused,
            boundAttendeeId: tileState.boundAttendeeId,
            localTileStarted: tileState.localTileStarted,
            isContent: tileState.isContent
          });
          
          if (tileState.isContent) {
            // Content tile (screen share)
            console.log('🖥️ VideoCall: Processing content tile (screen share):', tileState.tileId);
            console.log('🖥️ VideoCall: Content share element exists:', !!contentShareRef.current);
            console.log('🖥️ VideoCall: Content tile active:', tileState.active);
            console.log('🖥️ VideoCall: Content tile paused:', tileState.paused);
            console.log('🖥️ VideoCall: isScreenSharing state:', isScreenSharing);
            
            if (contentShareRef.current && tileState.active) {
              try {
                session.audioVideo.bindVideoElement(tileState.tileId, contentShareRef.current);
                console.log('✅ VideoCall: Content share bound to tile', tileState.tileId);
                
                // Force video element to play
                contentShareRef.current.play().catch(e => {
                  console.log('🖥️ VideoCall: Content share play() called:', e.message);
                });
                
                // Ensure screen sharing state is set
                if (!isScreenSharing) {
                  console.log('🖥️ VideoCall: Setting screen sharing to true due to active content tile');
                  setIsScreenSharing(true);
                }
              } catch (error) {
                console.error('❌ VideoCall: Error binding content share:', error);
                // Don't fail completely, just log the error
                if (error.message && error.message.includes('unknown tile id')) {
                  console.log('⚠️ VideoCall: Content tile not ready yet, will retry when tile becomes available');
                }
              }
            } else if (!tileState.active) {
              console.log('⏳ VideoCall: Content tile not active yet');
            } else {
              console.error('❌ VideoCall: Content share ref is null');
            }
          } else if (tileState.localTile) {
            // Local video tile - wait for it to become active
            console.log('📹 VideoCall: Processing local video tile:', tileState.tileId);
            console.log('📹 VideoCall: Local video element exists:', !!localVideoRef.current);
            console.log('📹 VideoCall: Tile active:', tileState.active, 'localTileStarted:', tileState.localTileStarted);
            
            if (localVideoRef.current) {
              if (tileState.active) {
                try {
                  session.audioVideo.bindVideoElement(tileState.tileId, localVideoRef.current);
                  console.log('✅ VideoCall: Local video bound successfully to tile', tileState.tileId);
                  
                  // Force video element to play
                  localVideoRef.current.play().catch(e => {
                    console.log('📹 VideoCall: Local video play() called (may auto-resolve):', e.message);
                  });
                } catch (error) {
                  console.error('❌ VideoCall: Error binding local video:', error);
                }
              } else {
                console.log('⏳ VideoCall: Local tile not active yet (active:', tileState.active, 'localTileStarted:', tileState.localTileStarted, ')');
                // Try to bind anyway in case the tile becomes active later
                try {
                  session.audioVideo.bindVideoElement(tileState.tileId, localVideoRef.current);
                  console.log('🔄 VideoCall: Local video bound to inactive tile', tileState.tileId, '- waiting for activation');
                } catch (error) {
                  console.log('⚠️ VideoCall: Could not bind to inactive tile:', error.message);
                }
              }
            } else {
              console.error('❌ VideoCall: Local video ref is null');
            }
          } else {
            // Remote video tile
            console.log('📹 VideoCall: Processing remote video tile:', tileState.tileId);
            console.log('📹 VideoCall: Remote video element exists:', !!remoteVideoRef.current);
            if (remoteVideoRef.current && tileState.active) {
              try {
                session.audioVideo.bindVideoElement(tileState.tileId, remoteVideoRef.current);
                console.log('✅ VideoCall: Remote video bound successfully to tile', tileState.tileId);
                
                // Force video element to play
                remoteVideoRef.current.play().catch(e => {
                  console.log('📹 VideoCall: Remote video play() called (may auto-resolve):', e.message);
                });
              } catch (error) {
                console.error('❌ VideoCall: Error binding remote video:', error);
              }
            } else if (!tileState.active) {
              console.log('⏳ VideoCall: Remote tile not active yet');
            } else {
              console.error('❌ VideoCall: Remote video ref is null');
            }
          }
        },
        videoTileWasRemoved: (tileId) => {
          console.log('🎥 VideoCall: Video tile removed:', tileId);
          console.log('🎥 VideoCall: This might indicate a connection issue or device problem');
        }
      });

      setMeetingSession(session);

      console.log('🔄 VideoCall: Starting audio/video session...');
      
      // Start the session
      try {
        await session.audioVideo.start();
        console.log('✅ VideoCall: Session started successfully');
      } catch (sessionError) {
        console.error('❌ VideoCall: Error starting session:', sessionError);
        throw sessionError;
      }

      // Start local video after session is established
      setTimeout(async () => {
        console.log('🎥 VideoCall: Attempting to start video tile, isVideoEnabled:', isVideoEnabled);
        console.log('🎥 VideoCall: Session state - isConnected:', isConnected);
        
        if (isVideoEnabled) {
          try {
            console.log('🎥 VideoCall: Starting local video tile...');
            
            // Check if we have video input device selected
            const selectedVideoDevice = await deviceController.listVideoInputDevices();
            console.log('🎥 VideoCall: Available video devices when starting tile:', selectedVideoDevice.length);
            
            session.audioVideo.startLocalVideoTile();
            console.log('✅ VideoCall: Local video tile start requested');
          } catch (videoError) {
            console.error('❌ VideoCall: Error starting local video:', videoError);
            console.error('❌ VideoCall: Video error details:', {
              name: videoError.name,
              message: videoError.message,
              stack: videoError.stack
            });
          }
        } else {
          console.log('⚠️ VideoCall: Video is disabled, not starting video tile');
        }
      }, 2000); // Reduced delay but still give time for connection

    } catch (error) {
      console.error('❌ VideoCall: Error setting up Chime session:', error);
      setError('Failed to setup video call');
    }
  };

  const leaveMeeting = async () => {
    if (meetingSession) {
      console.log('👋 VideoCall: Leaving meeting');
      await meetingSession.audioVideo.stop();
      setMeetingSession(null);
      setIsConnected(false);
      setAttendees([]);
    }
  };

  const toggleMute = async () => {
    if (meetingSession) {
      if (isMuted) {
        meetingSession.audioVideo.realtimeUnmuteLocalAudio();
      } else {
        meetingSession.audioVideo.realtimeMuteLocalAudio();
      }
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = async () => {
    if (meetingSession) {
      if (isVideoEnabled) {
        meetingSession.audioVideo.stopLocalVideoTile();
      } else {
        await meetingSession.audioVideo.startLocalVideoTile();
        if (localVideoRef.current) {
          meetingSession.audioVideo.bindVideoElement(
            meetingSession.audioVideo.getLocalVideoTile()?.tileId, 
            localVideoRef.current
          );
        }
      }
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleScreenShare = async () => {
    if (meetingSession) {
      try {
        if (isScreenSharing) {
          console.log('🖥️ VideoCall: Stopping screen share...');
          await meetingSession.audioVideo.stopContentShare();
          console.log('✅ VideoCall: Screen share stop requested');
          // State will be updated by contentShareDidStop observer
        } else {
          console.log('🖥️ VideoCall: Starting screen share...');
          await meetingSession.audioVideo.startContentShareFromScreenCapture();
          console.log('✅ VideoCall: Screen share start requested');
          // State will be updated by contentShareDidStart observer
        }
      } catch (error) {
        console.error('❌ VideoCall: Error toggling screen share:', error);
        // Reset state on error
        setIsScreenSharing(false);
      }
    }
  };

  const handleClose = async () => {
    await leaveMeeting();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className={`bg-gray-900 rounded-2xl shadow-2xl ${isFullScreen ? 'w-full h-full' : 'w-full max-w-6xl h-5/6'} flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Video className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-lg font-semibold text-white">{meetingTitle}</h2>
              <p className="text-sm text-gray-400">
                {isConnected ? `${attendees.length + 1} participant${attendees.length !== 0 ? 's' : ''}` : 'Connecting...'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Area */}
        <div className="flex-1 relative bg-black">
          {error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Connection Error</h3>
                <p className="text-gray-400 mb-4">{error}</p>
                <button
                  onClick={initializeMeeting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : isConnecting ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-white">Connecting to video call...</p>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full">
              {/* Content Share (Screen Share) - Takes priority when active */}
              {isScreenSharing ? (
                <div className="relative w-full h-full">
                  <video
                    ref={contentShareRef}
                    className="w-full h-full object-contain bg-black"
                    autoPlay
                    playsInline
                    style={{ backgroundColor: '#000000' }}
                    onLoadedData={() => console.log('🖥️ VideoCall: Content share video loaded')}
                    onPlay={() => console.log('🖥️ VideoCall: Content share video playing')}
                    onError={(e) => console.error('❌ VideoCall: Content share video error:', e)}
                  />
                  
                  {/* Remote Video (smaller when screen sharing) */}
                  <div className="absolute top-4 left-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
                    <video
                      ref={remoteVideoRef}
                      className="w-full h-full object-cover bg-gray-800"
                      autoPlay
                      playsInline
                      style={{ backgroundColor: '#1f2937' }}
                      onLoadedData={() => console.log('📹 VideoCall: Remote video loaded')}
                      onPlay={() => console.log('📹 VideoCall: Remote video playing')}
                      onError={(e) => console.error('❌ VideoCall: Remote video error:', e)}
                    />
                  </div>
                  
                  {/* Local Video (Picture-in-Picture) */}
                  <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
                    <video
                      ref={localVideoRef}
                      className="w-full h-full object-cover bg-gray-700"
                      autoPlay
                      playsInline
                      muted
                      style={{ backgroundColor: '#374151' }}
                      onLoadedData={() => console.log('📹 VideoCall: Local video loaded')}
                      onPlay={() => console.log('📹 VideoCall: Local video playing')}
                      onError={(e) => console.error('❌ VideoCall: Local video error:', e)}
                    />
                    {!isVideoEnabled && (
                      <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                        <VideoOff className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  
                  {/* Screen Share Indicator */}
                  <div className="absolute bottom-4 left-4 bg-blue-600 bg-opacity-90 px-3 py-2 rounded-lg">
                    <div className="flex items-center space-x-2 text-white">
                      <Monitor className="w-4 h-4" />
                      <span className="text-sm">Screen Sharing</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full">
                  {/* Remote Video (full screen when not screen sharing) */}
                  <video
                    ref={remoteVideoRef}
                    className="w-full h-full object-cover bg-gray-800"
                    autoPlay
                    playsInline
                    style={{ backgroundColor: '#1f2937' }}
                    onLoadedData={() => console.log('📹 VideoCall: Remote video loaded')}
                    onPlay={() => console.log('📹 VideoCall: Remote video playing')}
                    onError={(e) => console.error('❌ VideoCall: Remote video error:', e)}
                  />
                  
                  {/* Local Video (Picture-in-Picture) */}
                  <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-gray-600">
                    <video
                      ref={localVideoRef}
                      className="w-full h-full object-cover bg-gray-700"
                      autoPlay
                      playsInline
                      muted
                      style={{ backgroundColor: '#374151' }}
                      onLoadedData={() => console.log('📹 VideoCall: Local video loaded')}
                      onPlay={() => console.log('📹 VideoCall: Local video playing')}
                      onError={(e) => console.error('❌ VideoCall: Local video error:', e)}
                    />
                    {!isVideoEnabled && (
                      <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                        <VideoOff className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Content share video element - always present but conditionally visible */}
              {!isScreenSharing && (
                <video
                  ref={contentShareRef}
                  className="hidden w-full h-full object-contain bg-black"
                  autoPlay
                  playsInline
                  style={{ backgroundColor: '#000000' }}
                  onLoadedData={() => console.log('🖥️ VideoCall: Content share video loaded (hidden)')}
                  onPlay={() => console.log('🖥️ VideoCall: Content share video playing (hidden)')}
                  onError={(e) => console.error('❌ VideoCall: Content share video error (hidden):', e)}
                />
              )}

              {/* Participants Count */}
              <div className="absolute top-4 left-4 bg-black bg-opacity-50 px-3 py-2 rounded-lg">
                <div className="flex items-center space-x-2 text-white">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{attendees.length + 1}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 border-t border-gray-700">
          <div className="flex items-center justify-center space-x-4">
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className={`p-4 rounded-full transition-colors ${
                isMuted 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {/* Video Button */}
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-colors ${
                !isVideoEnabled 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
            >
              {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>

            {/* Screen Share Button */}
            <button
              onClick={toggleScreenShare}
              className={`p-4 rounded-full transition-colors ${
                isScreenSharing 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              title={isScreenSharing ? "Stop sharing" : "Share screen"}
            >
              <Monitor className="w-6 h-6" />
            </button>

            {/* End Call Button */}
            <button
              onClick={handleClose}
              className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
              title="End call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Audio element for remote audio */}
      <audio ref={audioRef} autoPlay />
    </div>
  );
};

export default VideoCallModal;
