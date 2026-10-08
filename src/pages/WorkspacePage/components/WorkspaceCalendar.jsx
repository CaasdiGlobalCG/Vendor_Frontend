import React, { useEffect, useMemo, useState } from 'react';
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
  const [sy, sm, sd] = String(e.date).slice(0, 10).split('-').map(Number);
  const [y, m, d] = dateKey.split('-').map(Number);
  const diffDays = Math.round(
    (Date.UTC(y, m - 1, d) - Date.UTC(sy, sm - 1, sd)) / 86400000
  );
  switch (r) {
    case 'daily': return diffDays >= 0;
    case 'weekly': return diffDays % 7 === 0;
    case 'monthly': return d === sd;
    case 'yearly': return d === sd && m === sm;
    default: return false;
  }
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
    notes: '',
    color: KINDS.event.color,
    visibility: 'shared',
    visibleToIds: [],
  });
  const [form, setForm] = useState(emptyForm);

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

  // Deduped collaborator list for the "who can see" picker — same identity
  // key used by the task-card assignee dropdown (vendorId || userId || email).
  const collabList = useMemo(() => {
    const seen = new Set();
    return (collaborators || [])
      .map((c) => ({
        id: c.vendorId || c.userId || c.pmId || c.email,
        name: c.name || c.email || 'Unknown',
      }))
      .filter((c) => c.id && !seen.has(c.id) && seen.add(c.id));
  }, [collaborators]);

  // Visibility: 'shared' → everyone; 'personal' → creator only;
  // 'selected' → creator + chosen people. The creator always sees their own
  // items. If the viewer's identity isn't resolvable, don't hide anything
  // (same as pre-visibility behaviour).
  const visibleEvents = useMemo(() => {
    const ids = myIdsProp?.length ? myIdsProp : (myId ? [myId] : []);
    // PM-side roles oversee the workspace — they see every event, invited or not
    const isPMSide = ['pm', 'cas', 'admin', 'project_manager', 'projectmanager']
      .includes(String(myRole || '').toLowerCase());
    return (events || []).filter((e) => {
      const v = e?.visibility || 'shared';
      if (isPMSide) return true;
      if (v === 'shared') return true;
      if (!e.createdById || ids.length === 0) return true;
      if (ids.includes(e.createdById)) return true;
      if (v === 'selected') return (e.visibleToIds || []).some((vid) => ids.includes(vid));
      return false; // personal + not mine
    });
  }, [events, myId, myIdsProp, myRole]);

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
    setForm({
      ...emptyForm(),
      kind,
      date: dateKey || selectedKey,
      color: KINDS[kind].color,
    });
    setShowCreate(true);
  };

  const setKind = (kind) =>
    setForm((f) => ({ ...f, kind, color: KINDS[kind].color }));

  const submitCreate = () => {
    if (!form.title.trim() || !form.date) return;
    onAddEvent?.({
      id: `cal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      kind: form.kind,
      title: form.title.trim(),
      date: form.date,
      allDay: form.kind === 'event' ? form.allDay : false,
      startTime: form.kind === 'event' && !form.allDay ? form.startTime || null : null,
      endTime: form.kind === 'event' && !form.allDay ? form.endTime || null : null,
      recurrence: form.recurrence && form.recurrence !== 'none' ? form.recurrence : undefined,
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
            <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto">
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
                    onClick={() => setSelectedKey(key)}
                    onDoubleClick={() => canEdit && openCreate(key)}
                    className={`relative flex flex-col items-center px-2 py-2 border-b border-r border-line text-left transition-colors min-h-[96px] ${
                      isSelected ? 'bg-info/5' : 'hover:bg-canvas'
                    } ${!inMonth ? 'opacity-40' : ''}`}
                    title={canEdit ? 'Click to select · double-click to add an item' : undefined}
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
                  New {KINDS[form.kind].label}
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
                                setForm((f) => ({
                                  ...f,
                                  visibleToIds: e.target.checked
                                    ? [...f.visibleToIds, c.id]
                                    : f.visibleToIds.filter((id) => id !== c.id),
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
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
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
                            {!e.readonly && onDeleteEvent && (
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
                              <span className="text-info">{recurrenceLabel(e.recurrence)}</span>
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
    </div>
  );
};

export default WorkspaceCalendar;
