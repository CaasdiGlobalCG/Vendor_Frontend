import React, { useState, useEffect, useRef, useContext } from 'react';
import { persistIsImportant, persistDeadline, persistNodeDataPatch, formatTimeLeft, getTimeLeft } from '../../utils/nodePersistence';
import { getWorkspaceById, updateWorkspace, notifyWorkspaceEvent } from '../../utils/workspaceApi';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Calendar, X, User, Clock, MapPin, Check, Video, Link2, Users, Globe, Lock, Pencil } from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';
import DatePicker from 'react-datepicker';
import { VendorContext } from '../../../../context/VendorContext';
import VideoCallModal from '../VideoCallModal';

const REMINDER_OPTIONS = [
  { value: 0, label: 'At start time' },
  { value: 10, label: '10 min before' },
  { value: 30, label: '30 min before' },
  { value: 60, label: '1 hour before' },
  { value: 1440, label: '1 day before' },
];

const pad = (n) => String(n).padStart(2, '0');
const toDateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeKey = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const CalendarNode = ({ id, data, isConnectable, selected }) => {
  const workspaceId = data.workspaceId;
  const { setNodes } = useReactFlow();
  const { currentUser } = useContext(VendorContext) || {};
  // Client/PM sessions may not populate VendorContext — fall back to the
  // workspace URL params (?userId= &userType=client) like WorkspaceTopBar does.
  const urlParams = new URLSearchParams(window.location.search);
  // Clients arrive with ?clientId=&userRole=client; PMs may use ?userId= or ?pmId=
  const urlUserId =
    urlParams.get('userId') || urlParams.get('clientId') || urlParams.get('pmId');
  const urlUserType = urlParams.get('userType') || urlParams.get('userRole');
  const myUserId =
    currentUser?.id || currentUser?.userId || currentUser?.pmId ||
    currentUser?.vendorId || currentUser?.email || urlUserId || null;
  const myName = currentUser?.name || currentUser?.email || 'You';
  const myRole = currentUser?.role || currentUser?.userType || urlUserType || 'vendor';
  const PM_ROLES = ['pm', 'cas', 'admin', 'project_manager', 'projectmanager'];
  const isPMSide = PM_ROLES.includes(String(myRole).toLowerCase());
  // All plausible IDs for this viewer — identity resolution differs by role
  // (vendorId vs pmId vs Cognito sub), so matching must try the whole set.
  const myIds = [
    currentUser?.id, currentUser?.userId, currentUser?.pmId,
    currentUser?.vendorId, currentUser?.clientId, currentUser?.email,
    urlUserId,
  ].filter(Boolean);

  const savedEvent = data.event || {};
  const [saving, setSaving] = useState(false);
  const [isImportant, setIsImportant] = useState(data.isImportant || false);
  const [deadline, setDeadline] = useState(data.deadline || null);
  const [showDeadlineInput, setShowDeadlineInput] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const deadlineJustSetRef = useRef(false);
  const [title, setTitle] = useState(savedEvent.title || 'New Meeting');
  const [location, setLocation] = useState(savedEvent.location || '');
  const [description, setDescription] = useState(savedEvent.notes || '');
  const [meetingLink, setMeetingLink] = useState(savedEvent.meetingLink || '');
  const [startDate, setStartDate] = useState(savedEvent.startIso ? new Date(savedEvent.startIso) : new Date());
  const [endDate, setEndDate] = useState(savedEvent.endIso ? new Date(savedEvent.endIso) : new Date(Date.now() + 3600000));
  const [allDay, setAllDay] = useState(savedEvent.allDay || false);
  const [remindersMinutes, setRemindersMinutes] = useState(savedEvent.remindersMinutes ?? 30);
  const [visibility, setVisibility] = useState(savedEvent.visibility || 'selected');
  const [participantsText, setParticipantsText] = useState(savedEvent.participantsText || '');
  const [participants, setParticipants] = useState(savedEvent.participants || []);
  const [isEditing, setIsEditing] = useState(!data.calendarEventId);
  const [isStarting, setIsStarting] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Only the event creator and PM-side roles may edit a saved event.
  const isCreator = savedEvent.createdById ? myIds.includes(savedEvent.createdById) : true;
  const canEditEvent = isCreator || isPMSide;

  // Mention-related state
  const [collaborators, setCollaborators] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const participantsInputRef = useRef(null);
  const mentionDropdownRef = useRef(null);
  // Authoritative invite list from the workspace calendar entry — node data
  // saved before visibility fixes may lack participant IDs entirely.
  const [calEventVisibleToIds, setCalEventVisibleToIds] = useState(null);
  // Once the event has proven visible to this viewer, keep it visible — canvas
  // re-syncs can transiently wipe participants data and flap the node off.
  const [stickyVisible, setStickyVisible] = useState(false);

  // Who may see this element at all — mirrors the workspace calendar rule:
  // 'shared' (everyone) shows to all; 'selected' → creator + invited IDs;
  // 'personal' → creator only. Unsaved events are visible to whoever is editing.
  const invitedIds = [
    ...(savedEvent.visibleToIds || []),            // plain ID strings
    ...(savedEvent.participants || []),            // participant objects
  ]
    .flatMap((p) => {
      if (typeof p === 'string') return [p];
      if (p.userId || p.email) return [p.userId, p.email];
      // Older events stored only the name — resolve it live against collaborators
      const pname = String(p.name || '').toLowerCase();
      const collab = pname ? collaborators.find((c) => {
        const cn = String(c.name || '').toLowerCase();
        return cn === pname || cn.startsWith(pname) || pname.startsWith(cn);
      }) : null;
      return [collab?.id, collab?.userId, collab?.vendorId, collab?.clientId, collab?.email];
    })
    .filter(Boolean);
  const evVisibility = savedEvent.visibility || 'everyone';
  const canSeeEvent =
    !data.calendarEventId ||                       // unsaved → creator editing
    isCreator ||
    evVisibility === 'everyone' || evVisibility === 'shared' ||
    // 'selected'/'personal' are strict — PM/CAS bypass does NOT apply here;
    // an invited PM still matches via invitedIds.
    (evVisibility === 'selected' && invitedIds.some((vid) => myIds.includes(vid))) ||
    (calEventVisibleToIds || []).some((vid) => myIds.includes(vid));

  // If the node data can't prove access (older saves), check the workspace
  // calendarEvents entry — its visibleToIds is the authoritative list.
  useEffect(() => {
    if (canSeeEvent || !data.calendarEventId || !workspaceId) return;
    let cancelled = false;
    getWorkspaceById(workspaceId)
      .then((ws) => {
        if (cancelled) return;
        const ev = (ws?.calendarEvents || ws?.workspace?.calendarEvents || [])
          .find((e) => e.id === data.calendarEventId);
        console.log('[CalendarNode] calendarEvents cross-check:', {
          found: !!ev,
          visibleToIds: ev?.visibleToIds,
          myIds,
        });
        if (ev?.visibleToIds) setCalEventVisibleToIds(ev.visibleToIds);
      })
      .catch((err) => console.log('[CalendarNode] calendarEvents fetch failed:', err?.message));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.calendarEventId, workspaceId, collaborators.length]);

  useEffect(() => {
    if (canSeeEvent && !stickyVisible) setStickyVisible(true);
  }, [canSeeEvent, stickyVisible]);

  if (!canSeeEvent && evVisibility !== 'everyone') {
    console.log('[CalendarNode] hidden', {
      visibility: evVisibility,
      invitedIds,
      myIds,
      createdById: savedEvent.createdById,
      rawParticipants: savedEvent.participants,
      collaboratorsCount: collaborators.length,
    });
  }

  // Countdown to meeting start (view mode)
  const [timeToStart, setTimeToStart] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Update time left display every second
  useEffect(() => {
    if (!deadline) return;
    const updateTimer = () => setTimeLeft(getTimeLeft(deadline));
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  // Countdown ticking for saved event
  useEffect(() => {
    if (isEditing) return;
    const tick = () => {
      setNow(Date.now());
      if (startDate) setTimeToStart(getTimeLeft(startDate));
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [isEditing, startDate]);

  // Sync deadline and isImportant from node data
  useEffect(() => {
    if (deadlineJustSetRef.current) return;
    if (data.deadline && data.deadline !== deadline) setDeadline(data.deadline);
    if (data.isImportant !== undefined && data.isImportant !== isImportant)
      setIsImportant(data.isImportant);
  }, [data.deadline, data.isImportant]);

  const persistIsImportantLocal = async (important) => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      await persistIsImportant(id, important, setNodes, workspaceId);
    } catch (err) {
      console.error('Failed to persist isImportant:', err);
    } finally {
      setSaving(false);
    }
  };

  const persistDeadlineLocal = async (newDeadline) => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      deadlineJustSetRef.current = true;
      await persistDeadline(id, newDeadline, setNodes, workspaceId);
      setDeadline(newDeadline instanceof Date ? newDeadline.toISOString() : newDeadline);
      setTimeout(() => { deadlineJustSetRef.current = false; }, 2000);
    } catch (err) {
      console.error('Failed to persist deadline:', err);
    } finally {
      setSaving(false);
    }
  };

  // Fetch collaborators for the @mention picker
  useEffect(() => {
    if (!data?.workspaceId) return;
    fetch(`/api/workspaces/${data.workspaceId}/collaborators`)
      .then((r) => (r.ok ? r.json() : null))
      .then((result) => setCollaborators(result?.collaborators || []))
      .catch((err) => console.error('Error fetching collaborators:', err));
  }, [data?.workspaceId]);

  // Close mention dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        mentionDropdownRef.current && !mentionDropdownRef.current.contains(event.target) &&
        participantsInputRef.current && !participantsInputRef.current.contains(event.target)
      ) {
        setShowMentionDropdown(false);
      }
    };
    if (showMentionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMentionDropdown]);

  // Parse @mentions into participant objects
  useEffect(() => {
    if (!participantsText) { setParticipants([]); return; }
    const mentions = participantsText.match(/@([^\s@]+)/g) || [];
    const parsed = mentions.map((mention) => {
      const name = mention.substring(1);
      const collab = collaborators.find((c) => c.name?.toLowerCase() === name.toLowerCase());
      return {
        name: collab?.name || name,
        email: collab?.email || '',
        userId: collab?.id || collab?.userId || collab?.vendorId || collab?.pmId || collab?.clientId || collab?.email || null,
      };
    });
    setParticipants(parsed.filter((p, i, s) => i === s.findIndex((t) => t.name === p.name)));
  }, [participantsText, collaborators]);

  const handleParticipantsChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setParticipantsText(value);
    setCursorPosition(cursorPos);
    const beforeCursor = value.substring(0, cursorPos);
    const mentionMatch = beforeCursor.match(/@([^\s@]*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
    }
  };

  const insertMention = (name) => {
    const beforeCursor = participantsText.substring(0, cursorPosition);
    const afterCursor = participantsText.substring(cursorPosition);
    const beforeMention = beforeCursor.replace(/@[^\s@]*$/, '');
    setParticipantsText(beforeMention + `@${name} ` + afterCursor);
    setShowMentionDropdown(false);
    setMentionQuery('');
    setTimeout(() => {
      if (participantsInputRef.current) {
        const pos = beforeMention.length + name.length + 2;
        participantsInputRef.current.focus();
        participantsInputRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const removeParticipant = (name) => {
    setParticipantsText(participantsText.replace(new RegExp(`@${name}\\s*`, 'g'), '').trim());
  };

  // ---- Save: persist node spec + merge into workspace.calendarEvents ----
  const handleSave = async () => {
    if (!title.trim() || !workspaceId) { setIsEditing(false); return; }
    setSaving(true);
    setSaveError(null);
    try {
      const eventId = data.calendarEventId || `cal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      // Self-heal stale participants — chips restored from older saves may only
      // carry a name; resolve them live against collaborators now.
      const resolvedParticipants = participants.map((p) => {
        if (p.userId || p.email) return p;
        const pname = String(p.name || '').toLowerCase();
        const collab = pname ? collaborators.find((c) => {
          const cn = String(c.name || '').toLowerCase();
          return cn === pname || cn.startsWith(pname) || pname.startsWith(cn);
        }) : null;
        if (!collab) return p;
        return {
          ...p,
          email: collab.email || '',
          userId:
            collab.id || collab.userId || collab.vendorId ||
            collab.clientId || collab.pmId || collab.email || '',
        };
      });
      setParticipants(resolvedParticipants);

      const visibleToIds = resolvedParticipants.flatMap((p) => [p.userId, p.email]).filter(Boolean);
      if (visibility === 'selected' && resolvedParticipants.length === 0) {
        setSaveError('Add at least one @mentioned participant — "Selected people" with no list hides the event from everyone but you.');
        setSaving(false);
        return;
      }
      if (visibility === 'selected' && visibleToIds.length === 0) {
        setSaveError('Participants couldn\'t be resolved to workspace members — re-pick them with @mentions.');
        setSaving(false);
        return;
      }
      const calEvent = {
        id: eventId,
        kind: 'event',
        title: title.trim(),
        date: toDateKey(startDate),
        startTime: allDay ? '' : toTimeKey(startDate),
        endTime: allDay ? '' : toTimeKey(endDate),
        allDay,
        location,
        meetingLink: meetingLink.trim(),
        notes: description,
        color: '#3b82f6',
        busyStatus: 'busy',
        remindersMinutes,
        visibility: visibility === 'everyone' ? 'shared' : visibility,
        visibleToIds,
        createdBy: myName,
        createdById: myUserId,
        createdAt: new Date().toISOString(),
      };

      // 1) Persist the spec on this node (durable + live-synced to collaborators)
      await persistNodeDataPatch(id, {
        calendarEventId: eventId,
        label: title.trim(),
        event: {
          title: title.trim(), location, notes: description, meetingLink: meetingLink.trim(),
          startIso: startDate.toISOString(), endIso: endDate.toISOString(),
          allDay, remindersMinutes, visibility, participantsText,
          participants: resolvedParticipants,
          visibleToIds,
          createdBy: savedEvent.createdBy || myName,
          createdById: savedEvent.createdById || myUserId,
        },
      }, setNodes, workspaceId);

      // 2) Merge into the shared workspace calendar (replace by id or append)
      const ws = await getWorkspaceById(workspaceId);
      const events = ws?.calendarEvents || ws?.workspace?.calendarEvents || [];
      const idx = events.findIndex((e) => e.id === eventId);
      const nextEvents = idx >= 0
        ? events.map((e, i) => (i === idx ? calEvent : e))
        : [...events, calEvent];
      await updateWorkspace(workspaceId, { calendarEvents: nextEvents });

      // The workspace prop won't re-sync until the next refetch — tell the
      // TopBar/calendar to reload calendarEvents so the event shows now.
      window.dispatchEvent(
        new CustomEvent('vd:calendar-updated', { detail: { workspaceId } })
      );

      // 3) Notify invitees / shared audience
      const when = `${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ${allDay ? '(all day)' : `at ${toTimeKey(startDate)}`}`;
      notifyWorkspaceEvent({
        workspaceId,
        roles: visibility === 'everyone' ? ['pm', 'vendor', 'client'] : [],
        targetUserIds: visibility === 'personal' ? [] : visibleToIds,
        excludeUserId: myUserId,
        type: 'calendar_invite',
        title: `Meeting invite: ${calEvent.title}`,
        message: `${myName} scheduled "${calEvent.title}" on ${when}${location ? ` · ${location}` : ''}.`,
        data: { calendarEventId: eventId, nodeId: id },
        priority: 'medium',
      }).catch(() => {});

      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save calendar event:', err);
      setSaveError('Could not save the event');
    } finally {
      setSaving(false);
    }
  };

  const handleStartMeeting = async () => {
    setIsStarting(true);
    try {
      setShowVideoCall(true);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to start meeting:', error);
      alert('Failed to start meeting. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  // Non-invited viewers see a compact locked placeholder instead of the event
  if (!canSeeEvent && !stickyVisible) {
    return (
      <div className="w-[240px] relative">
        <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
        <div className="bg-surface rounded-lg border border-dashed border-line p-3 flex items-center gap-2 opacity-70">
          <Lock className="w-4 h-4 text-dim flex-shrink-0" />
          <span className="text-xs text-dim truncate">Private meeting — you're not invited</span>
        </div>
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
      </div>
    );
  }

  const VisibilityIcon = visibility === 'everyone' ? Globe : visibility === 'personal' ? Lock : Users;
  const msToStart = timeToStart && !timeToStart.isExpired
    ? timeToStart.days * 86400000 + timeToStart.hours * 3600000 + timeToStart.minutes * 60000
    : Infinity;
  const startsWithin = msToStart < 15 * 60 * 1000;

  return (
    <div className="w-[380px] max-w-[88vw] relative group">
      {data.sequenceNumber && (
        <div className="absolute -top-4 -left-4 z-20 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white">
          {data.sequenceNumber}
        </div>
      )}
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <div className={`${isImportant ? 'bg-info/10' : 'bg-surface'} rounded-lg border border-info/20 overflow-hidden`}>

      {/* Header */}
      <div className="bg-info text-white p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span className="font-medium">{isEditing ? 'Schedule Meeting' : 'Calendar Event'}</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={async () => {
              setIsImportant(!isImportant);
              await persistIsImportantLocal(!isImportant);
            }}
            className={`p-1 rounded text-sm ${isImportant ? 'bg-warning text-white' : 'hover:bg-info'}`}
            title={isImportant ? 'Unmark as Important' : 'Mark as Important'}
          >
            {isImportant ? '★' : '☆'}
          </button>
          <button onClick={() => setShowDeadlineInput(!showDeadlineInput)} className="p-1 hover:bg-info rounded" title="Set Deadline">
            <Clock className="w-4 h-4" />
          </button>
          {!isEditing && canEditEvent && (
            <button onClick={() => setIsEditing(true)} className="p-1 hover:bg-info rounded" title="Edit event">
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Deadline Input */}
      {showDeadlineInput && (
        <div className="px-3 py-2 bg-info/10 border-b border-info/10 flex gap-1">
          <input
            type="datetime-local"
            className="border rounded px-2 py-1 text-xs flex-1"
            value={deadline ? new Date(deadline).toISOString().slice(0, 16) : ''}
            onChange={(e) => setDeadline(e.target.value)}
            disabled={saving}
          />
          <button
            className="px-2 py-1 text-xs bg-info text-white rounded"
            onClick={async () => {
              setShowDeadlineInput(false);
              await persistDeadlineLocal(deadline);
            }}
            disabled={saving}
          >
            {saving ? '...' : '✓'}
          </button>
        </div>
      )}

      {/* Deadline Display */}
      {deadline && timeLeft && !timeLeft.isExpired && (
        <div className="px-3 py-1 bg-info/10 border-b border-info/10 text-xs text-info">
          ⏱ {formatTimeLeft(timeLeft)}
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-4">
        {isEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              className="w-full p-2 border rounded focus:ring-2 focus:ring-info/20 focus:border-info/30 outline-none"
              autoFocus={!data.calendarEventId}
            />

            <div className="flex space-x-2">
              <div className="flex-1">
                <label className="text-xs text-dim block mb-1">Start</label>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => { setStartDate(date); if (date > endDate) setEndDate(new Date(date.getTime() + 3600000)); }}
                  showTimeSelect={!allDay}
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat={allDay ? 'MMMM d, yyyy' : 'MMM d, h:mm aa'}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-info/20 focus:border-info/30 outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-dim block mb-1">End</label>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  showTimeSelect={!allDay}
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat={allDay ? 'MMMM d, yyyy' : 'MMM d, h:mm aa'}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-info/20 focus:border-info/30 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-dim block mb-1">Reminder</label>
                <select
                  value={remindersMinutes}
                  onChange={(e) => setRemindersMinutes(Number(e.target.value))}
                  className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-info/20 focus:border-info/30 outline-none bg-surface"
                >
                  {REMINDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-dim block mb-1">Visibility</label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-info/20 focus:border-info/30 outline-none bg-surface"
                >
                  <option value="everyone">Everyone in workspace</option>
                  <option value="selected">Selected people only</option>
                  <option value="personal">Only me</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="rounded"
              />
              All day
            </label>

            <div className="flex items-center space-x-2">
              <MapPin className="text-dim w-4 h-4 flex-shrink-0" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add location"
                className="flex-1 p-2 border rounded text-sm focus:ring-2 focus:ring-info/20 focus:border-info/30 outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Link2 className="text-dim w-4 h-4 flex-shrink-0" />
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="Meeting link (or start a call after saving)"
                className="flex-1 p-2 border rounded text-sm focus:ring-2 focus:ring-info/20 focus:border-info/30 outline-none"
              />
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description"
              rows={2}
              className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-info/20 focus:border-info/30 outline-none"
            />

            {visibility === 'selected' && (
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-dim">Participants — type @ to mention</span>
                </div>
                <div className="relative">
                  <textarea
                    ref={participantsInputRef}
                    value={participantsText}
                    onChange={handleParticipantsChange}
                    onKeyDown={(e) => { if (e.key === 'Escape') setShowMentionDropdown(false); }}
                    placeholder="Type @username to add participants..."
                    rows={2}
                    className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-info/20 focus:border-info/30 outline-none resize-none"
                  />
                  {showMentionDropdown && (
                    <div
                      ref={mentionDropdownRef}
                      className="absolute bottom-full left-0 right-0 mb-1 bg-surface border border-line rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
                    >
                      {collaborators.filter((c) => c.name?.toLowerCase().includes(mentionQuery.toLowerCase())).length > 0 ? (
                        collaborators
                          .filter((c) => c.name?.toLowerCase().includes(mentionQuery.toLowerCase()))
                          .map((collab, index) => (
                            <button
                              key={`${collab.vendorId || collab.email}-${index}`}
                              onClick={() => insertMention(collab.name)}
                              className="w-full px-3 py-2 text-left hover:bg-canvas flex items-center space-x-2"
                            >
                              <div className="w-6 h-6 rounded-full bg-surface-hover flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-medium text-dim">
                                  {collab.name?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-ink truncate">{collab.name}</div>
                                <div className="text-xs text-dim truncate">{collab.specialization || collab.email}</div>
                              </div>
                            </button>
                          ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-dim">No collaborators found</div>
                      )}
                    </div>
                  )}
                </div>
                {participants.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {participants.map((p, index) => (
                      <div key={index} className="flex items-center bg-info/10 rounded-full px-2 py-1 text-xs">
                        <User className="w-3 h-3 text-info mr-1 flex-shrink-0" />
                        <span className="text-info font-medium">{p.name}</span>
                        <button onClick={() => removeParticipant(p.name)} className="ml-1 text-info hover:text-info">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {saveError && <p className="text-xs text-danger">{saveError}</p>}

            <div className="flex justify-between pt-1">
              <button
                onClick={handleSave}
                disabled={saving || !title.trim()}
                className="px-4 py-2 bg-info text-white text-sm rounded hover:bg-info disabled:opacity-50 flex items-center gap-1"
              >
                {saving ? 'Saving…' : <><Check className="w-4 h-4" /> Save to Calendar</>}
              </button>
              {data.calendarEventId && (
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm text-dim hover:bg-surface-hover rounded"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ── View mode ── */
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-base leading-snug">{title}</h3>
              <span className={`flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                visibility === 'everyone' ? 'bg-info/10 text-info'
                : visibility === 'personal' ? 'bg-surface-hover text-dim'
                : 'bg-success/10 text-success'
              }`}>
                <VisibilityIcon className="w-3 h-3" />
                {visibility === 'everyone' ? 'Shared' : visibility === 'personal' ? 'Private' : `${participants.length} invited`}
              </span>
            </div>

            {/* Countdown / live badge */}
            {timeToStart && (
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1.5 rounded ${
                timeToStart.isExpired ? 'bg-surface-hover text-dim' : startsWithin ? 'bg-danger/10 text-danger' : 'bg-info/10 text-info'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                {timeToStart.isExpired
                  ? (new Date(endDate) > new Date(now) ? 'Happening now' : 'Ended')
                  : `Starts in ${formatTimeLeft(timeToStart)}`}
              </div>
            )}

            <div className="flex items-start space-x-2">
              <Clock className="text-dim w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p>{startDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <p className="text-dim">
                  {allDay ? 'All day' : `${toTimeKey(startDate)} – ${toTimeKey(endDate)}`}
                </p>
              </div>
            </div>

            {location && (
              <div className="flex items-center space-x-2">
                <MapPin className="text-dim w-4 h-4 flex-shrink-0" />
                <p className="text-sm">{location}</p>
              </div>
            )}

            {description && <p className="text-sm text-dim">{description}</p>}

            {participants.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {participants.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-info/10 text-info text-[10px] px-2 py-0.5 rounded-full">
                    <User className="w-2.5 h-2.5" />{p.name}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              {meetingLink ? (
                <a
                  href={meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 px-3 py-2 bg-success text-white text-sm rounded hover:opacity-90 flex items-center justify-center gap-1.5"
                >
                  <Video className="w-4 h-4" /> Join meeting
                </a>
              ) : (
                <button
                  onClick={handleStartMeeting}
                  disabled={isStarting}
                  className="flex-1 px-3 py-2 bg-success text-white text-sm rounded hover:opacity-90 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isStarting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><Video className="w-4 h-4" /> Start call</>
                  )}
                </button>
              )}
              {canEditEvent && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-2 border border-line text-sm text-dim rounded hover:bg-surface-hover flex items-center gap-1"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>

            <p className="text-[10px] text-dim flex items-center gap-1">
              <Check className="w-3 h-3 text-success" />
              Saved to workspace calendar · reminder {REMINDER_OPTIONS.find((o) => o.value === remindersMinutes)?.label.toLowerCase()}
              {savedEvent.createdBy && savedEvent.createdById !== myUserId && ` · by ${savedEvent.createdBy}`}
              {!canEditEvent && ' · only creator or PM can edit'}
            </p>
          </div>
        )}
      </div>
      </div>

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />

      {/* Video Call Modal */}
      {showVideoCall && (
        <VideoCallModal
          isOpen={showVideoCall}
          onClose={() => setShowVideoCall(false)}
          meetingTitle={title}
          currentUser={currentUser}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
};

export default CalendarNode;
