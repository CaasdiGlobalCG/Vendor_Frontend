import React, { useState, useEffect, useRef, useContext } from 'react';
import { Handle, Position } from 'reactflow';
import { Calendar, X, Plus, Mail, User, Clock, MapPin, Check, Trash2, MoreVertical, Video } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';
import DatePicker from 'react-datepicker';
import config from '../../../../config/env';
import { VendorContext } from '../../../../context/VendorContext';
import VideoCallModal from '../VideoCallModal';

const CalendarNode = ({ data }) => {
  const { currentUser } = useContext(VendorContext);
  const [title, setTitle] = useState('New Meeting');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 3600000)); // 1 hour later
  const [participantsText, setParticipantsText] = useState('');
  const [participants, setParticipants] = useState([]);
  const [isEditing, setIsEditing] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  
  // Mention-related state
  const [collaborators, setCollaborators] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const participantsInputRef = useRef(null);
  const mentionDropdownRef = useRef(null);

  // Fetch collaborators from workspace
  useEffect(() => {
    if (data?.workspaceId) {
      fetchCollaborators();
    }
  }, [data?.workspaceId]);

  // Close mention dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        mentionDropdownRef.current &&
        !mentionDropdownRef.current.contains(event.target) &&
        participantsInputRef.current &&
        !participantsInputRef.current.contains(event.target)
      ) {
        setShowMentionDropdown(false);
      }
    };

    if (showMentionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMentionDropdown]);

  const fetchCollaborators = async () => {
    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/workspaces/${data.workspaceId}/collaborators`);
      if (response.ok) {
        const result = await response.json();
        setCollaborators(result.collaborators || []);
      }
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  };

  // Parse participants from text with @mentions
  useEffect(() => {
    if (participantsText) {
      const mentions = participantsText.match(/@([^\s@]+)/g) || [];
      const parsedParticipants = mentions.map(mention => {
        const name = mention.substring(1); // Remove @
        const collaborator = collaborators.find(c => 
          c.name.toLowerCase() === name.toLowerCase()
        );
        return {
          name: collaborator?.name || name,
          email: collaborator?.email || `${name}@example.com`
        };
      });
      // Remove duplicates
      const uniqueParticipants = parsedParticipants.filter((p, index, self) =>
        index === self.findIndex(t => t.name === p.name)
      );
      setParticipants(uniqueParticipants);
    } else {
      setParticipants([]);
    }
  }, [participantsText, collaborators]);

  // Handle participants text input changes and detect @ mentions
  const handleParticipantsChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setParticipantsText(value);
    setCursorPosition(cursorPos);

    // Check for @ mention trigger
    const beforeCursor = value.substring(0, cursorPos);
    const mentionMatch = beforeCursor.match(/@([^\s@]*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
    }
  };

  // Insert mention
  const insertMention = (name) => {
    const beforeCursor = participantsText.substring(0, cursorPosition);
    const afterCursor = participantsText.substring(cursorPosition);
    const beforeMention = beforeCursor.replace(/@[^\s@]*$/, '');
    const newText = beforeMention + `@${name} ` + afterCursor;
    setParticipantsText(newText);
    setShowMentionDropdown(false);
    setMentionQuery('');
    
    // Focus back on input
    setTimeout(() => {
      if (participantsInputRef.current) {
        const newCursorPos = beforeMention.length + name.length + 2; // +2 for @ and space
        participantsInputRef.current.focus();
        participantsInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Remove participant
  const removeParticipant = (name) => {
    const newText = participantsText.replace(new RegExp(`@${name}\\s*`, 'g'), '').trim();
    setParticipantsText(newText);
  };

  const handleSave = () => {
    setIsEditing(false);
    // Here you would typically save the meeting to your backend
    console.log('Meeting saved:', { title, location, description, startDate, endDate, participants });
  };

  const handleStartMeeting = async () => {
    setIsStarting(true);
    try {
      // Start the video meeting by opening the VideoCallModal
      console.log('Starting meeting with:', { title, participants, startDate, endDate });
      
      // Open the video call modal
      setShowVideoCall(true);
      setIsEditing(false); // Optionally close edit mode when starting meeting
      
    } catch (error) {
      console.error('Failed to start meeting:', error);
      alert('Failed to start meeting. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-blue-200 shadow-md overflow-hidden w-96">
      <Handle type="target" position={Position.Top} />
      
      {/* Header */}
      <div className="bg-blue-600 text-white p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span className="font-medium">Schedule Meeting</span>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="p-1 hover:bg-blue-500 rounded"
        >
          {isEditing ? <Check className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Meeting Title"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
              />
            </div>

            <div className="flex space-x-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Start</label>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">End</label>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <MapPin className="text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add location"
                className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
              />
            </div>

            <div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add description"
                rows={3}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none"
              />
            </div>

            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Participants</span>
                <span className="text-xs text-gray-500">Type @ to mention users</span>
              </div>
              
              {/* Participants input with @mention support */}
              <div className="relative">
                <textarea
                  ref={participantsInputRef}
                  value={participantsText}
                  onChange={handleParticipantsChange}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' && showMentionDropdown) {
                      e.preventDefault();
                      // Focus first mention option
                    }
                    if (e.key === 'Escape') {
                      setShowMentionDropdown(false);
                    }
                  }}
                  placeholder="Type @username to add participants..."
                  rows={3}
                  className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-300 outline-none resize-none"
                />
                
                {/* Mention dropdown */}
                {showMentionDropdown && (
                  <div 
                    ref={mentionDropdownRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
                  >
                    {collaborators.filter(collab => 
                      collab.name.toLowerCase().includes(mentionQuery.toLowerCase())
                    ).length > 0 ? (
                      collaborators
                        .filter(collab => 
                          collab.name.toLowerCase().includes(mentionQuery.toLowerCase())
                        )
                        .map((collab, index) => (
                          <button
                            key={`${collab.vendorId}-${collab.name}-${index}`}
                            onClick={() => insertMention(collab.name)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                          >
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-medium text-gray-600">
                                {collab.avatar || collab.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{collab.name}</div>
                              <div className="text-xs text-gray-500 truncate">{collab.specialization || collab.email}</div>
                            </div>
                          </button>
                        ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">No collaborators found</div>
                    )}
                  </div>
                )}
              </div>

              {/* Display parsed participants as chips */}
              {participants.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {participants.map((p, index) => (
                    <div 
                      key={index} 
                      className="flex items-center bg-blue-50 rounded-full px-2 py-1 text-xs"
                    >
                      <User className="w-3 h-3 text-blue-500 mr-1 flex-shrink-0" />
                      <span className="text-blue-700 font-medium">{p.name}</span>
                      <button
                        onClick={() => removeParticipant(p.name)}
                        className="ml-1 text-blue-400 hover:text-blue-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Save
              </button>
              <button
                onClick={handleStartMeeting}
                disabled={isStarting || participants.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting ? (
                  <>
                    <span>Starting...</span>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    <span>Start Meeting</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="font-medium text-lg">{title}</h3>
            
            <div className="flex items-start space-x-2">
              <Clock className="text-gray-400 w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm">
                  {startDate.toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                <p className="text-sm text-gray-500">
                  {endDate.toLocaleString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short'
                  })}
                </p>
              </div>
            </div>

            {location && (
              <div className="flex items-center space-x-2">
                <MapPin className="text-gray-400 w-4 h-4 flex-shrink-0" />
                <p className="text-sm">{location}</p>
              </div>
            )}

            {description && (
              <div className="pt-2">
                <p className="text-sm text-gray-700 whitespace-pre-line">{description}</p>
              </div>
            )}

            {participants.length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-gray-500 mb-1">Participants:</p>
                <div className="flex flex-wrap gap-2">
                  {participants.map((p, i) => (
                    <div key={i} className="flex items-center bg-blue-50 rounded-full px-2 py-1">
                      <User className="w-3 h-3 text-blue-500 mr-1" />
                      <span className="text-xs">
                        {p.name || p.email.split('@')[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} />
      
      {/* Video Call Modal */}
      {data?.workspaceId && (
        <VideoCallModal
          isOpen={showVideoCall}
          onClose={() => setShowVideoCall(false)}
          workspaceId={data.workspaceId}
          currentUser={currentUser}
          meetingTitle={title || 'Scheduled Meeting'}
        />
      )}
    </div>
  );
};

export default CalendarNode;
