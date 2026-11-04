import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Type,
  AlignLeft,
  ChevronDown,
  FileText,
  Table,
  BarChart3,
  ListChecks,
  ClipboardList,
  StickyNote,
  Calendar,
  ClipboardCheck,
  Search,
  Activity,
  Percent,
  TrendingUp,
} from 'lucide-react';
import { blockElementFor } from '../utils/blockElements';

/**
 * Elements offered when a connection is dropped on empty canvas ("add next
 * node"). Each entry is the same element object the Elements panel hands to
 * the canvas, so tables/charts/lists still go through their config modals.
 */
export const QUICK_ADD_ELEMENTS = [
  { icon: Type, name: 'Text Box', hint: 'Single line input', element: { id: 'textbox', name: 'TextBox', type: 'textbox', preview: 'Single line text input' } },
  { icon: AlignLeft, name: 'Text Area', hint: 'Multi-line notes', element: { id: 'textarea', name: 'TextArea', type: 'textarea', preview: 'Large text input area' } },
  { icon: ChevronDown, name: 'Dropdown', hint: 'Pick from options', element: { id: 'dropdown', name: 'Dropdown', type: 'dropdown', preview: 'Dropdown menu' } },
  { icon: FileText, name: 'Form', hint: 'Ready-made form', element: { id: 'form-template', name: 'Form Template', type: 'form-template', preview: 'Ready-made form with basic fields' } },
  { icon: Table, name: 'Table', hint: 'Rows and columns', element: { id: 'basic-table', name: 'Basic Table', type: 'table', preview: 'Simple data table' } },
  { icon: BarChart3, name: 'Chart', hint: 'Visualise data', element: { id: 'bar-chart', name: 'Bar Chart', type: 'chart', preview: 'Vertical bar chart' } },
  { icon: ListChecks, name: 'Checklist', hint: 'Track to-dos', element: { id: 'checklist', name: 'Checklist', type: 'list', preview: 'Task list' } },
  {
    icon: ClipboardList,
    name: 'Task Card',
    hint: 'Owner, status, due date',
    element: {
      id: 'task-card-basic',
      name: 'Task Card',
      type: 'task-card',
      preview: 'Tracker for daily work',
      taskCardData: {
        title: 'New task',
        description: '',
        status: 'todo',
        assignedTo: '',
        priority: 'medium',
        dueDate: '',
        checklists: [],
        attachments: [],
        comments: [],
        dependencies: [],
        labels: [],
        activityLog: [],
      },
    },
  },
  { icon: StickyNote, name: 'Smart Note', hint: 'Sticky note with AI actions', element: { id: 'smart-note', name: 'Smart Note', type: 'smart-note', nodeType: 'smartNote', data: { label: 'Smart Note' } } },
  { icon: Calendar, name: 'Calendar Event', hint: 'Meeting with invites', element: { id: 'calendar-event', name: 'Calendar Event', type: 'calendar-event', nodeType: 'calendarNode', data: { label: 'Calendar Event' } } },
  { icon: ClipboardCheck, name: 'Approval Board', hint: 'Approval workflow', element: { id: 'approval-board', name: 'Approval Board', type: 'approval-board', nodeType: 'approvalBoard', data: { label: 'Approval Board' } } },
  { icon: Activity, name: 'Status Badge', hint: 'On track, delayed, approved', element: blockElementFor('status') },
  { icon: Percent, name: 'Progress Bar', hint: 'How far along', element: blockElementFor('progress') },
  { icon: TrendingUp, name: 'KPI Card', hint: 'Big number with trend', element: blockElementFor('kpi') },
];

const MENU_WIDTH = 264;
const MENU_MAX_HEIGHT = 340;

/**
 * Small popover anchored at the point where a connection was dropped.
 * Type to filter, arrow keys + Enter to choose, Escape or outside click to close.
 */
const QuickAddMenu = ({ x, y, onPick, onClose }) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return QUICK_ADD_ELEMENTS;
    return QUICK_ADD_ELEMENTS.filter(
      (item) => item.name.toLowerCase().includes(q) || item.hint.toLowerCase().includes(q)
    );
  }, [query]);

  // Keep the popover inside the viewport
  const left = Math.max(8, Math.min(x, window.innerWidth - MENU_WIDTH - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - MENU_MAX_HEIGHT - 8));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) onClose();
    };
    document.addEventListener('mousedown', onPointerDown, true);
    return () => document.removeEventListener('mousedown', onPointerDown, true);
  }, [onClose]);

  const onKeyDown = (event) => {
    event.stopPropagation(); // do not trigger canvas shortcuts (Delete, Space, ...)
    if (event.key === 'Escape') {
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && items[active]) {
      event.preventDefault();
      onPick(items[active].element);
    }
  };

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-label="Add next element"
      className="fixed z-[1000] rounded-xl border border-line bg-surface shadow-xl"
      style={{ left, top, width: MENU_WIDTH }}
      onKeyDown={onKeyDown}
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <Search className="h-4 w-4 text-dim" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Add next element…"
          className="w-full bg-transparent text-sm text-ink placeholder:text-dim focus:outline-none"
        />
      </div>
      <ul className="overflow-y-auto p-1" style={{ maxHeight: MENU_MAX_HEIGHT - 48 }} role="listbox">
        {items.length === 0 && <li className="px-3 py-3 text-sm text-dim">No matching element</li>}
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <li key={item.element.id} role="option" aria-selected={index === active}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => onPick(item.element)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
                  index === active ? 'bg-surface-hover' : ''
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0 text-ink" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{item.name}</span>
                  <span className="block truncate text-xs text-dim">{item.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>,
    document.body
  );
};

export default QuickAddMenu;
