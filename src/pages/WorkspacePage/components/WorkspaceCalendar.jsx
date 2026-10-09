import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  Trash2,
  Bell,
  CheckSquare,
  Clock,
  AlignLeft,
  EyeOff,
  MapPin,
  Link2,
  Info,
  Pencil,
} from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Google Calendar's three item kinds
const KINDS = {
  event: { label: 'Event', color: '#6366f1', Icon: CalendarDays },
  task: { label: 'Task', color: '#10b981', Icon: CheckSquare },
  reminder: { label: 'Reminder', color: '#f59e0b', Icon: Bell },
};

const COLOR_CHOICES = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Google Calendar "Does not repeat" options
const REPEAT_CHOICES = [
  ['none', 'Does not repeat'],
  ['daily', 'Daily'],
  ['weekly', 'Weekly'],
  ['monthly', 'Monthly'],
  ['yearly', 'Yearly'],
];

// Google Calendar notification offsets (minutes before start)
const REMINDER_OFFSETS = [
  [5, '5 minutes before'],
  [15, '15 minutes before'],
  [30, '30 minutes before'],
  [60, '1 hour before'],
  [1440, '1 day before'],
];

const recurrenceLabel = (r) => REPEAT_CHOICES.find(([v]) => v === r)?.[1];

// Does this (possibly recurring) item occur on `dateKey`?
const occursOn = (e, dateKey) => {
  if (!e?.date) return false;
  if (e.date === dateKey) return true;
  const r = e.recurrence;
  if (!r || r === 'none' || dateKey < e.date) return false;

  // Recurrence end: { type:'on', date } | { type:'after', count }
  const end = e.recurrenceEnd;
  if (end?.type === 'on' && end.date && dateKey > end.date) return false;

  const [sy, sm, sd] = String(e.date).slice(0, 10).split('-').map(Number);
  const [y, m, d] = dateKey.split('-').map(Number);
  const diffDays = Math.round(
    (Date.UTC(y, m - 1, d) - Date.UTC(sy, sm - 1, sd)) / 86400000
  );
  // Nth occurrence (1-based) — needed for "ends after N occurrences"
  const nth = {
    daily: diffDays + 1,
    weekly: Math.floor(diffDays / 7) + 1,
    monthly: (m - sm) + 12 * (y - sy) + 1,
    yearly: y - sy + 1,
  }[r];
  if (end?.type === 'after' && end.count && nth > end.count) return false;

  switch (r) {
    case 'daily': return diffDays >= 0;
    case 'weekly': return diffDays % 7 === 0;
    case 'monthly': return d === sd;
    case 'yearly': return d === sd && m === sm;
    default: return false;
  }
};

// "until 15 Nov" / "for 10×" — short end label for detail views
const recurrenceEndLabel = (e) => {
  const end = e?.recurrenceEnd;
  if (!end) return '';
  if (end.type === 'on' && end.date)
    return ` · until ${new Date(`${end.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  if (end.type === 'after' && end.count) return ` · ${end.count}×`;
  return '';
};

const fmtTime = (t) => {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
};

const inputCls =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink outline-none placeholder:text-dim focus:border-info focus:ring-1 focus:ring-info/30';

/**
 * WorkspaceCalendar — Google-Calendar-style month view for the workspace.
 *
 * events: [{ id, date:'YYYY-MM-DD', title, kind?:'event'|'task'|'reminder',
 *            startTime?, endTime?, notes?, color?, done?, readonly?, createdBy? }]
 * Handlers (optional) persist user-created items: onAddEvent/onUpdateEvent/
 * onDeleteEvent. Items with `readonly` are display-only (e.g. task deadlines).
 */
const WorkspaceCalendar = ({
  isOpen,
  onClose,
  events = [],
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  canEdit = true,
  currentUser,
  myId,
  myIds: myIdsProp,
  myRole,
  collaborators = [],
}) => {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedKey, setSelectedKey] = useState(() => dayKey(today));
  const [showCreate, setShowCreate] = useState(false);
  const emptyForm = () => ({
    kind: 'event',
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    allDay: false,
    recurrence: 'none',
    location: '',
    meetingLink: '',
    remindersMinutes: [30],
    busyStatus: 'busy',
    recurrenceEndType: 'never',   // 'never' | 'on' | 'after'
    recurrenceEndDate: '',
    recurrenceEndCount: 10,
    notes: '',
    color: KINDS.event.color,
    visibility: 'shared',
    visibleToIds: [],
  });
  const [form, setForm] = useState(emptyForm);
  const [dayPopup, setDayPopup] = useState(null); // { key, x, y } — anchored day-details popup
  const [editingId, setEditingId] = useState(null); // event id when editing
  const scrollCooldownRef = useRef(0); // debounce month-scroll

  // Viewer's normalised identity set + PM-side flag — shared by the
  // visibility filter and the "who may edit" check.
  const normId = (s) => String(s || '').trim().toLowerCase();
  const myNormIds = useMemo(() =>
    (myIdsProp?.length ? myIdsProp : myId ? [myId] : []).map(normId).filter(Boolean),
  [myIdsProp, myId]); // eslint-disable-line react-hooks/exhaustive-deps
  const isPMSide = ['pm', 'cas', 'admin', 'project_manager', 'projectmanager']
    .includes(String(myRole || '').toLowerCase());
  const canEditItem = (e) =>
    !e.readonly &&
    ((e.createdById && myNormIds.includes(normId(e.createdById))) || isPMSide);

  useEffect(() => {
    if (isOpen) {
      setSelectedKey(dayKey(new Date()));
      setShowCreate(false);
    }
  }, [isOpen]);

  // 42-cell month grid starting on the Sunday of the week containing the 1st
  const weeks = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    const out = [];
    for (let i = 0; i < 6; i++) out.push(days.slice(i * 7, i * 7 + 7));
    return out;
  }, [cursor]);

  // Deduped collaborator list for the "who can see" picker. `ids` carries
  // every plausible identity (vendorId/userId/pmId/clientId/email) so the
  // selected-visibility check hits whichever one the viewer resolves as.
  const collabList = useMemo(() => {
    const seen = new Set();
    return (collaborators || [])
      .map((c) => ({
        id: c.vendorId || c.userId || c.pmId || c.clientId || c.email,
        ids: [c.vendorId, c.userId, c.pmId, c.clientId, c.id, c.email].filter(Boolean),
        name: c.name || c.email || 'Unknown',
      }))
      .filter((c) => c.id && !seen.has(c.id) && seen.add(c.id));
  }, [collaborators]);

  // Visibility: 'shared' → everyone; 'personal' → creator only;
  // 'selected' → creator + chosen people. The creator always sees their own
  // items. IDs are compared case-insensitively (emails collide otherwise).
  // 'selected' is enforced strictly — if the viewer isn't in visibleToIds
  // they don't see it, even when identity resolution is partial. The
  // legacy fail-open (unresolvable viewer AND unresolvable creator) only
  // applies to 'personal' items so old data doesn't vanish.
  const visibleEvents = useMemo(() => {
    return (events || []).filter((e) => {
      const v = e?.visibility || 'shared';
      if (v === 'shared') return true;
      const creatorOk = e.createdById && myNormIds.includes(normId(e.createdById));
      if (v === 'selected') {
        const list = (e.visibleToIds || []).map(normId).filter(Boolean);
        return Boolean(creatorOk) || list.some((vid) => myNormIds.includes(vid));
      }
      // personal
      if (creatorOk) return true;
      if (!e.createdById || myNormIds.length === 0) return true;
      return false;
    });
  }, [events, myNormIds]); // eslint-disable-line react-hooks/exhaustive-deps

  const eventsByDay = useMemo(() => {
    const map = {};
    // Expand recurring items onto every visible day they occur on
    weeks.flat().forEach((d) => {
      const key = dayKey(d);
      visibleEvents.forEach((e) => {
        if (occursOn(e, key)) (map[key] ||= []).push(e);
      });
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => String(a.startTime || '99').localeCompare(String(b.startTime || '99')))
    );
    return map;
  }, [visibleEvents, weeks]);

  const selectedEvents = eventsByDay[selectedKey] || [];
  const todayKey = dayKey(today);

  const shiftMonth = (delta) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  const goToday = () => {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedKey(todayKey);
  };

  const openCreate = (dateKey, kind = 'event') => {
    setEditingId(null);
    setForm({
      ...emptyForm(),
      kind,
      date: dateKey || selectedKey,
      color: KINDS[kind].color,
    });
    setShowCreate(true);
  };

  // Load an existing item into the create form for editing — creator (+ PM-side)
  const openEdit = (e) => {
    setForm({
      kind: e.kind || 'event',
      title: e.title || '',
      date: e.date || '',
      startTime: e.startTime || '',
      endTime: e.endTime || '',
      allDay: !!e.allDay,
      recurrence: e.recurrence || 'none',
      recurrenceEndType: e.recurrenceEnd?.type || 'never',
      recurrenceEndDate: e.recurrenceEnd?.date || '',
      recurrenceEndCount: e.recurrenceEnd?.count || 10,
      location: e.location || '',
      meetingLink: e.meetingLink || '',
      remindersMinutes: e.remindersMinutes || [],
      busyStatus: e.busyStatus || 'busy',
      notes: e.notes || '',
      color: e.color || KINDS[e.kind]?.color || KINDS.event.color,
      visibility: e.visibility || 'shared',
      visibleToIds: e.visibleToIds || [],
    });
    setEditingId(e.id);
    setDayPopup(null);
    setShowCreate(true);
  };

  const setKind = (kind) =>
    setForm((f) => ({ ...f, kind, color: KINDS[kind].color }));

  const submitCreate = () => {
    if (!form.title.trim() || !form.date) return;

    if (editingId) {
      // Edit — keep the original identity fields, update the rest
      const original = (events || []).find((e) => e.id === editingId) || {};
      onUpdateEvent?.({
        ...original,
        kind: form.kind,
        title: form.title.trim(),
        date: form.date,
        allDay: form.kind === 'event' ? form.allDay : false,
        startTime: form.kind === 'event' && !form.allDay ? form.startTime || null : null,
        endTime: form.kind === 'event' && !form.allDay ? form.endTime || null : null,
        recurrence: form.recurrence && form.recurrence !== 'none' ? form.recurrence : undefined,
        recurrenceEnd:
          form.recurrence !== 'none' && form.recurrenceEndType !== 'never'
            ? {
                type: form.recurrenceEndType,
                date: form.recurrenceEndType === 'on' ? form.recurrenceEndDate || undefined : undefined,
                count: form.recurrenceEndType === 'after' ? Number(form.recurrenceEndCount) || undefined : undefined,
              }
            : undefined,
        location: form.location.trim() || undefined,
        meetingLink: form.meetingLink.trim() || undefined,
        remindersMinutes: form.remindersMinutes.length ? form.remindersMinutes : undefined,
        busyStatus: form.kind === 'event' ? form.busyStatus : undefined,
        notes: form.notes.trim(),
        color: form.color || KINDS[form.kind].color,
        visibility: form.visibility || 'shared',
        visibleToIds: form.visibility === 'selected' ? form.visibleToIds : undefined,
        updatedAt: new Date().toISOString(),
      });
      setEditingId(null);
      setShowCreate(false);
      return;
    }

    onAddEvent?.({
      id: `cal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: form.kind,
      title: form.title.trim(),
      date: form.date,
      allDay: form.kind === 'event' ? form.allDay : false,
      startTime: form.kind === 'event' && !form.allDay ? form.startTime || null : null,
      endTime: form.kind === 'event' && !form.allDay ? form.endTime || null : null,
      recurrence: form.recurrence && form.recurrence !== 'none' ? form.recurrence : undefined,
      recurrenceEnd:
        form.recurrence !== 'none' && form.recurrenceEndType !== 'never'
          ? {
              type: form.recurrenceEndType,
              date: form.recurrenceEndType === 'on' ? form.recurrenceEndDate || undefined : undefined,
              count: form.recurrenceEndType === 'after' ? Number(form.recurrenceEndCount) || undefined : undefined,
            }
          : undefined,
      location: form.location.trim() || undefined,
      meetingLink: form.meetingLink.trim() || undefined,
      remindersMinutes: form.remindersMinutes.length ? form.remindersMinutes : undefined,
      busyStatus: form.kind === 'event' ? form.busyStatus : undefined,
      notes: form.notes.trim(),
      color: form.color || KINDS[form.kind].color,
      done: false,
      visibility: form.visibility || 'shared',
      visibleToIds:
        form.visibility === 'selected' ? form.visibleToIds : undefined,
      createdBy: currentUser?.name || currentUser?.email || 'You',
      // Same identity the viewer is known by (myId) so personal/selected
      // items match back correctly on future loads.
      createdById:
        myId ||
        currentUser?.id ||
        currentUser?.userId ||
        currentUser?.vendorId ||
        currentUser?.email ||
        null,
      createdAt: new Date().toISOString(),
    });
    setShowCreate(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — Google Calendar style toolbar */}
        <div className="flex items-center gap-4 px-5 py-3.5 border-b border-line">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-lg bg-info/10 text-info flex items-center justify-center flex-shrink-0">
              <CalendarDays className="w-[18px] h-[18px]" />
            </span>
            <span className="text-sm font-semibold text-ink whitespace-nowrap">
              Workspace Calendar
            </span>
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={() => openCreate(selectedKey)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-black rounded-full hover:bg-slate-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create
            </button>
          )}

          <button
            type="button"
            onClick={goToday}
            className="px-3.5 py-1.5 text-xs font-medium text-ink border border-line rounded-full hover:bg-canvas transition-colors"
          >
            Today
          </button>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="p-2 rounded-full hover:bg-surface-hover text-dim hover:text-ink transition-colors"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="p-2 rounded-full hover:bg-surface-hover text-dim hover:text-ink transition-colors"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h3 className="text-base font-semibold text-ink">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="ml-auto p-1.5 hover:bg-surface-hover rounded-lg transition-colors text-dim hover:text-ink"
            title="Close calendar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Month grid */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="grid grid-cols-7 border-b border-line">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="px-2 py-2.5 text-center text-[10px] font-semibold text-dim uppercase tracking-wider"
                >
                  {d}
                </div>
              ))}
            </div>
            {/* Scroll wheel on the grid moves through months — like Google
                Calendar's continuous scroll. Cooldown so one flick = one
                month, not ten. */}
            <div
              className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto"
              onWheel={(e) => {
                const now = Date.now();
                if (now - scrollCooldownRef.current < 500) return;
                // Only hijack scrolling when the grid can't scroll further
                // that direction — otherwise let normal overflow scroll run
                const el = e.currentTarget;
                const atTop = el.scrollTop <= 0;
                const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
                if ((e.deltaY > 0 && atBottom) || (e.deltaY < 0 && atTop)) {
                  scrollCooldownRef.current = now;
                  shiftMonth(e.deltaY > 0 ? 1 : -1);
                }
              }}
            >
              {weeks.flat().map((d) => {
                const key = dayKey(d);
                const inMonth = d.getMonth() === cursor.getMonth();
                const isToday = key === todayKey;
                const isSelected = key === selectedKey;
                const dayEvents = eventsByDay[key] || [];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={(e) => {
                      setSelectedKey(key);
                      if (!dayEvents.length) {
                        // Empty day → straight to the create form
                        if (canEdit) openCreate(key);
                      } else {
                        // Day with items → pop up their full details,
                        // anchored just below the cell
                        const r = e.currentTarget.getBoundingClientRect();
                        setDayPopup({ key, x: r.left + r.width / 2, y: r.bottom + 6 });
                      }
                    }}
                    onDoubleClick={() => canEdit && openCreate(key)}
                    className={`relative flex flex-col items-center px-2 py-2 border-b border-r border-line text-left transition-colors min-h-[96px] ${
                      isSelected ? 'bg-info/5' : 'hover:bg-canvas'
                    } ${!inMonth ? 'opacity-40' : ''}`}
                    title={canEdit ? 'Click an empty day to add an item' : undefined}
                  >
                    <span
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium ${
                        isToday
                          ? 'bg-info text-white'
                          : isSelected
                            ? 'text-info font-bold'
                            : 'text-ink'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    <div className="w-full mt-1.5 space-y-1 px-0.5">
                      {dayEvents.slice(0, 2).map((e, i) => {
                        const color = e.color || KINDS[e.kind]?.color || '#6366f1';
                        return (
                          <div
                            key={e.id || i}
                            className={`truncate text-[10px] font-medium text-white rounded px-1.5 py-[3px] ${e.done ? 'opacity-60 line-through' : ''}`}
                            style={{ backgroundColor: color }}
                            title={`${KINDS[e.kind]?.label || 'Item'}: ${e.title}`}
                          >
                            {e.startTime ? `${fmtTime(e.startTime)} ` : ''}{e.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-dim px-1">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel — selected day items OR create form */}
          <div className="w-72 border-l border-line p-4 flex flex-col min-h-0 flex-shrink-0">
            {showCreate ? (
              <>
                <p className="text-[11px] font-semibold text-dim uppercase tracking-wide">
                  {editingId ? 'Edit' : 'New'} {KINDS[form.kind].label}
                </p>

                {/* Kind selector — Event / Task / Reminder (Google style) */}
                <div className="mt-2.5 flex rounded-lg border border-line overflow-hidden">
                  {Object.entries(KINDS).map(([k, meta]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setKind(k)}
                      className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
                        form.kind === k
                          ? 'bg-black text-white'
                          : 'bg-surface text-ink hover:bg-canvas'
                      }`}
                    >
                      {meta.label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 space-y-3 overflow-y-auto flex-1">
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder={form.kind === 'task' ? 'Task title' : form.kind === 'reminder' ? 'Reminder' : 'Event title'}
                    className={inputCls}
                    autoFocus
                  />
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className={inputCls}
                  />
                  {form.kind === 'event' && (
                    <>
                      {!form.allDay && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="time"
                            value={form.startTime}
                            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                            className={inputCls}
                          />
                          <span className="text-[10px] text-dim">–</span>
                          <input
                            type="time"
                            value={form.endTime}
                            onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                            className={inputCls}
                          />
                        </div>
                      )}
                      <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.allDay}
                          onChange={(e) => setForm((f) => ({ ...f, allDay: e.target.checked }))}
                          className="w-3.5 h-3.5 accent-info"
                        />
                        All day
                      </label>
                    </>
                  )}
                  <select
                    value={form.recurrence}
                    onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value }))}
                    className={inputCls}
                  >
                    {REPEAT_CHOICES.map(([v, label]) => (
                      <option key={v} value={v}>{label}</option>
                    ))}
                  </select>

                  {/* Recurrence end — only for repeating items, like Google
                      Calendar's "Ends: never / on date / after N" */}
                  {form.recurrence !== 'none' && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-dim uppercase tracking-wide flex-shrink-0">Ends</span>
                      <select
                        value={form.recurrenceEndType}
                        onChange={(e) => setForm((f) => ({ ...f, recurrenceEndType: e.target.value }))}
                        className={`${inputCls} flex-1`}
                      >
                        <option value="never">Never</option>
                        <option value="on">On date</option>
                        <option value="after">After occurrences</option>
                      </select>
                      {form.recurrenceEndType === 'on' && (
                        <input
                          type="date"
                          value={form.recurrenceEndDate}
                          min={form.date || undefined}
                          onChange={(e) => setForm((f) => ({ ...f, recurrenceEndDate: e.target.value }))}
                          className={`${inputCls} w-32 flex-shrink-0`}
                        />
                      )}
                      {form.recurrenceEndType === 'after' && (
                        <input
                          type="number"
                          min={1}
                          value={form.recurrenceEndCount}
                          onChange={(e) => setForm((f) => ({ ...f, recurrenceEndCount: e.target.value }))}
                          className={`${inputCls} w-16 flex-shrink-0`}
                          title="Number of occurrences"
                        />
                      )}
                    </div>
                  )}

                  {/* Notification offsets — "notify me N min before" like
                      Google Calendar; fires a workspace bell notification */}
                  <div className="space-y-1.5">
                    <select
                      value=""
                      onChange={(e) => {
                        const mins = Number(e.target.value);
                        if (!Number.isNaN(mins) && !form.remindersMinutes.includes(mins))
                          setForm((f) => ({ ...f, remindersMinutes: [...f.remindersMinutes, mins].sort((a, b) => a - b) }));
                      }}
                      className={inputCls}
                    >
                      <option value="">Add notification…</option>
                      {REMINDER_OFFSETS.map(([mins, label]) => (
                        <option key={mins} value={mins}>{label}</option>
                      ))}
                    </select>
                    {form.remindersMinutes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {form.remindersMinutes.map((mins) => (
                          <span
                            key={mins}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-info/10 text-info text-[10px] font-medium"
                          >
                            <Bell className="w-2.5 h-2.5" />
                            {REMINDER_OFFSETS.find(([m]) => m === mins)?.[1] || `${mins} min before`}
                            <button
                              type="button"
                              onClick={() =>
                                setForm((f) => ({
                                  ...f,
                                  remindersMinutes: f.remindersMinutes.filter((m) => m !== mins),
                                }))
                              }
                              className="hover:text-danger"
                              title="Remove notification"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {form.kind === 'event' && (
                    <>
                      <input
                        type="text"
                        value={form.location}
                        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                        placeholder="Add location"
                        className={inputCls}
                      />
                      <input
                        type="url"
                        value={form.meetingLink}
                        onChange={(e) => setForm((f) => ({ ...f, meetingLink: e.target.value }))}
                        placeholder="Add meeting link (Meet, Zoom…)"
                        className={inputCls}
                      />
                      <select
                        value={form.busyStatus}
                        onChange={(e) => setForm((f) => ({ ...f, busyStatus: e.target.value }))}
                        className={inputCls}
                      >
                        <option value="busy">Busy</option>
                        <option value="free">Free</option>
                      </select>
                    </>
                  )}
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Notes (optional)"
                    className={`${inputCls} resize-none`}
                  />
                  {form.kind === 'event' && (
                    <div className="flex items-center gap-2">
                      {COLOR_CHOICES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, color: c }))}
                          className={`w-5 h-5 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-info scale-110' : ''}`}
                          style={{ backgroundColor: c }}
                          title="Color"
                        />
                      ))}
                    </div>
                  )}

                  {/* Visibility — shared to the whole workspace, only the
                      creator, or a picked set of collaborators */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold text-dim uppercase tracking-wide">
                      Who can see
                    </span>
                    <div className="flex rounded-lg border border-line overflow-hidden">
                      {[
                        ['shared', 'Everyone'],
                        ['selected', 'Selected people'],
                        ['personal', 'Only me'],
                      ].map(([v, label]) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, visibility: v }))}
                          className={`flex-1 py-2 text-[11px] font-medium transition-colors ${
                            form.visibility === v
                              ? 'bg-black text-white'
                              : 'bg-surface text-ink hover:bg-canvas'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {form.visibility === 'selected' && (
                      <div className="max-h-32 overflow-y-auto rounded-lg border border-line bg-surface">
                        {collabList.length === 0 && (
                          <p className="px-3 py-2.5 text-[11px] text-dim">
                            No collaborators in this workspace yet.
                          </p>
                        )}
                        {collabList.map((c) => (
                          <label
                            key={c.id}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs text-ink hover:bg-canvas cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={form.visibleToIds.includes(c.id)}
                              onChange={(e) =>
                                // Store every plausible ID for the person —
                                // the viewer may resolve as email while we
                                // keyed on vendorId, or vice versa.
                                setForm((f) => ({
                                  ...f,
                                  visibleToIds: e.target.checked
                                    ? [...new Set([...f.visibleToIds, ...c.ids])]
                                    : f.visibleToIds.filter((id) => !c.ids.includes(id)),
                                }))
                              }
                              className="w-3.5 h-3.5 accent-info"
                            />
                            <span className="truncate">{c.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {form.visibility === 'selected' && form.visibleToIds.length === 0 && collabList.length > 0 && (
                      <p className="text-[10px] text-warning">
                        No one selected — only you will see this.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2.5 pt-3">
                  <button
                    type="button"
                    onClick={submitCreate}
                    disabled={!form.title.trim() || !form.date}
                    className="flex-1 py-2 text-xs font-semibold text-white bg-black rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {editingId ? 'Update' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreate(false); setEditingId(null); }}
                    className="px-4 py-2 text-xs font-medium text-ink border border-line rounded-lg hover:bg-surface-hover transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-dim uppercase tracking-wide">
                    {new Date(`${selectedKey}T00:00:00`).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openCreate(selectedKey)}
                      className="p-1 rounded-full hover:bg-surface-hover text-info transition-colors"
                      title="Add to this day"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="mt-3 space-y-2 overflow-y-auto flex-1">
                  {selectedEvents.length === 0 ? (
                    <p className="text-[11px] text-dim py-8 text-center">
                      No items on this day
                    </p>
                  ) : (
                    selectedEvents.map((e, i) => {
                      const meta = KINDS[e.kind] || KINDS.event;
                      const KindIcon = meta.Icon;
                      const isTask = e.kind === 'task';
                      return (
                        <div
                          key={e.id || i}
                          className="rounded-lg border border-line bg-canvas px-3 py-2.5 group/item"
                        >
                          <div className="flex items-center gap-2">
                            {isTask && !e.readonly ? (
                              <button
                                type="button"
                                onClick={() => onUpdateEvent?.({ ...e, done: !e.done })}
                                className="flex-shrink-0"
                                title={e.done ? 'Mark not done' : 'Mark done'}
                              >
                                <CheckSquare
                                  className={`w-3.5 h-3.5 ${e.done ? 'text-success' : 'text-dim'}`}
                                />
                              </button>
                            ) : (
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: e.color || meta.color }}
                              />
                            )}
                            <span
                              className={`text-xs font-medium text-ink truncate flex-1 ${e.done ? 'line-through text-dim' : ''}`}
                              title={e.title}
                            >
                              {e.title}
                            </span>
                            {canEdit && canEditItem(e) && (
                              <button
                                type="button"
                                onClick={() => openEdit(e)}
                                className="opacity-0 group-hover/item:opacity-100 text-dim hover:text-info transition-opacity flex-shrink-0"
                                title="Edit"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            )}
                            {!e.readonly && canEditItem(e) && onDeleteEvent && (
                              <button
                                type="button"
                                onClick={() => onDeleteEvent(e.id)}
                                className="opacity-0 group-hover/item:opacity-100 text-dim hover:text-danger transition-opacity flex-shrink-0"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 ml-4 text-[10px] text-dim">
                            <KindIcon
                              className="w-3 h-3"
                              style={{ color: e.color || meta.color }}
                            />
                            <span>{meta.label}</span>
                            {e.allDay ? (
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" /> All day
                              </span>
                            ) : e.startTime && (
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {fmtTime(e.startTime)}
                                {e.endTime ? `–${fmtTime(e.endTime)}` : ''}
                              </span>
                            )}
                            {e.recurrence && (
                              <span className="text-info">{recurrenceLabel(e.recurrence)}{recurrenceEndLabel(e)}</span>
                            )}
                            {e.busyStatus === 'free' && (
                              <span className="text-success">Free</span>
                            )}
                            {e.kind === 'reminder' && !e.readonly && e.date < todayKey && (
                              <span className="text-danger font-semibold">Overdue</span>
                            )}
                            {e.kind === 'reminder' && !e.readonly && e.date === todayKey && (
                              <span className="text-warning font-semibold">Due today</span>
                            )}
                            {e.visibility === 'personal' && (
                              <span className="flex items-center gap-0.5 text-warning">
                                <EyeOff className="w-2.5 h-2.5" /> Only you
                              </span>
                            )}
                            {e.visibility === 'selected' && (
                              <span className="flex items-center gap-0.5 text-info">
                                <EyeOff className="w-2.5 h-2.5" /> Shared with{' '}
                                {(e.visibleToIds || []).length} people
                              </span>
                            )}
                            {e.createdBy && <span>· {e.createdBy}</span>}
                          </div>
                          {e.location && (
                            <p className="text-[10px] text-dim mt-1 ml-4 flex items-start gap-1">
                              <MapPin className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                              {e.location}
                            </p>
                          )}
                          {e.meetingLink && (
                            <p className="text-[10px] mt-1 ml-4 flex items-start gap-1">
                              <Link2 className="w-2.5 h-2.5 mt-0.5 flex-shrink-0 text-info" />
                              <a
                                href={e.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-info hover:underline break-all"
                              >
                                Join meeting
                              </a>
                            </p>
                          )}
                          {e.notes && (
                            <p className="text-[10px] text-dim mt-1 ml-4 flex items-start gap-1">
                              <AlignLeft className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                              {e.notes}
                            </p>
                          )}
                          {e.meta && (
                            <p className="text-[10px] text-dim mt-1 ml-4">{e.meta}</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Day-details popup — clicking a populated cell anchors this under it */}
      {dayPopup && createPortal(
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setDayPopup(null)} />
          <div
            className="fixed z-[91] w-80 bg-surface rounded-xl border border-line shadow-2xl overflow-hidden"
            style={{
              left: Math.min(Math.max(dayPopup.x - 160, 8), window.innerWidth - 328),
              top: Math.min(dayPopup.y, window.innerHeight - 360),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-line bg-canvas">
              <p className="text-[11px] font-semibold text-ink">
                {new Date(`${dayPopup.key}T00:00:00`).toLocaleDateString('en-IN', {
                  weekday: 'short', day: 'numeric', month: 'short',
                })}
              </p>
              <button onClick={() => setDayPopup(null)} className="p-1 rounded text-dim hover:text-ink hover:bg-surface-hover">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto p-2.5 space-y-2">
              {(eventsByDay[dayPopup.key] || []).map((e, i) => {
                const meta = KINDS[e.kind] || KINDS.event;
                const KindIcon = meta.Icon;
                const isTask = e.kind === 'task';
                const color = e.color || meta.color;
                return (
                  <div key={e.id || i} className="rounded-xl border border-line bg-surface overflow-hidden group/item">
                    {/* color accent bar */}
                    <div className="h-1" style={{ backgroundColor: color }} />

                    <div className="px-3.5 pt-2.5 pb-3">
                      {/* kind chip + actions */}
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide"
                          style={{ backgroundColor: `${color}1a`, color }}
                        >
                          <KindIcon className="w-2.5 h-2.5" />{meta.label}
                        </span>
                        {e.busyStatus === 'free' && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-success/10 text-success">Free</span>
                        )}
                        {e.visibility === 'personal' && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-warning/10 text-warning flex items-center gap-0.5">
                            <EyeOff className="w-2.5 h-2.5" />Only you
                          </span>
                        )}
                        {e.visibility === 'selected' && (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide bg-info/10 text-info flex items-center gap-0.5">
                            <EyeOff className="w-2.5 h-2.5" />Shared · {(e.visibleToIds || []).length}
                          </span>
                        )}
                        <span className="flex-1" />
                        {isTask && !e.readonly && (
                          <button type="button"
                            onClick={() => onUpdateEvent?.({ ...e, done: !e.done })}
                            className="p-1 rounded hover:bg-surface-hover flex-shrink-0"
                            title={e.done ? 'Mark not done' : 'Mark done'}>
                            <CheckSquare className={`w-3.5 h-3.5 ${e.done ? 'text-success' : 'text-dim'}`} />
                          </button>
                        )}
                        {canEdit && canEditItem(e) && (
                          <button type="button" onClick={() => openEdit(e)}
                            className="p-1 rounded text-dim hover:text-info hover:bg-info/10 flex-shrink-0" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!e.readonly && canEditItem(e) && onDeleteEvent && (
                          <button type="button" onClick={() => { onDeleteEvent(e.id); setDayPopup(null); }}
                            className="p-1 rounded text-dim hover:text-danger hover:bg-danger/10 flex-shrink-0" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* title */}
                      <p className={`text-[13px] font-semibold text-ink leading-snug break-words ${e.done ? 'line-through text-dim' : ''}`}>
                        {e.title}
                      </p>

                      {/* detail rows — one per line, never crammed */}
                      <div className="mt-2 space-y-1.5 text-[11px] text-dim">
                        {(e.allDay || e.startTime) && (
                          <p className="flex items-center gap-2">
                            <Clock className="w-3 h-3 flex-shrink-0 text-dim" />
                            {e.allDay ? 'All day' : `${fmtTime(e.startTime)}${e.endTime ? ` – ${fmtTime(e.endTime)}` : ''}`}
                          </p>
                        )}
                        {e.recurrence && (
                          <p className="flex items-center gap-2">
                            <CalendarDays className="w-3 h-3 flex-shrink-0 text-dim" />
                            {recurrenceLabel(e.recurrence)}{recurrenceEndLabel(e)}
                          </p>
                        )}
                        {e.location && (
                          <p className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 flex-shrink-0 text-dim" />
                            <span className="break-words min-w-0">{e.location}</span>
                          </p>
                        )}
                        {e.meetingLink && (
                          <p className="flex items-center gap-2">
                            <Link2 className="w-3 h-3 flex-shrink-0 text-info" />
                            <a href={e.meetingLink} target="_blank" rel="noreferrer"
                              className="text-info hover:underline break-all min-w-0">Join meeting</a>
                          </p>
                        )}
                        {e.notes && (
                          <p className="flex items-start gap-2">
                            <AlignLeft className="w-3 h-3 mt-0.5 flex-shrink-0 text-dim" />
                            <span className="break-words min-w-0 whitespace-pre-wrap">{e.notes}</span>
                          </p>
                        )}
                        {e.meta && (
                          <p className="flex items-center gap-2">
                            <Info className="w-3 h-3 flex-shrink-0 text-dim" />{e.meta}
                          </p>
                        )}
                        {e.createdBy && (
                          <p className="pt-1.5 border-t border-line/60 text-[10px]">
                            Created by {e.createdBy}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {canEdit && (
              <button type="button"
                onClick={() => { openCreate(dayPopup.key); setDayPopup(null); }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium text-info hover:bg-info/5 border-t border-line">
                <Plus className="w-3 h-3" /> Add to this day
              </button>
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default WorkspaceCalendar;
