import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ExternalLink, Loader2, Trash2, ArrowLeft, Clock, ChevronRight, Zap, FileText, Users, Briefcase, TrendingUp, Hash, CalendarClock, Bell, ToggleLeft, ToggleRight, Repeat, Globe, Search, Lightbulb, AlertTriangle, Target, X, PenLine, Pin, PinOff, AtSign, Mic, MicOff, XCircle, Sparkles } from "lucide-react";
import config from "../../config/env";

/**
 * Building blocks of the AI workspace (AiPromptPanel): markdown rendering, menus,
 * strips, schedules view, voice input and the API helpers they share.
 */

// ── Helper: get auth token ──
export function getAuthToken() {
  return localStorage.getItem("authToken") || "";
}

// ── Helper: API call ──
export async function apiFetch(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(`${config.VENDOR_BACKEND_URL}${path}`, {
    credentials: "include",
    ...options,
    headers,
  });
  return res;
}

// ── Sparkle / AI gradient icon ──
export const AiSparkleIcon = ({ size = 28 }) => (
  <div
    className="ai-sparkle-icon flex items-center justify-center rounded-full flex-shrink-0"
    style={{
      width: size,
      height: size,
      background: "linear-gradient(135deg, rgb(var(--text-ink)) 0%, rgb(var(--text-ink)) 40%, rgb(var(--success)) 100%)",
    }}
  >
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="white" fillOpacity="0.95" />
    </svg>
  </div>
);

// ── Tool name → human-readable status map ──
export const TOOL_STATUS_LABELS = {
  __thinking: "Analyzing your request...",
  listWorkspaces: "Searching workspaces...",
  getWorkspaceTasks: "Fetching tasks...",
  createTaskInWorkspace: "Creating task...",
  addSubtaskToTask: "Adding subtask...",
  searchInvoices: "Searching invoices...",
  getInvoiceDetails: "Fetching invoice details...",
  searchPurchaseOrders: "Searching purchase orders...",
  getVendorProfile: "Loading vendor profile...",
  searchProducts: "Searching products...",
  getNotifications: "Checking notifications...",
  getQuotations: "Fetching quotations...",
  getInvoices: "Fetching invoices...",
  getPurchaseOrders: "Fetching purchase orders...",
  getCreditNotes: "Fetching credit notes...",
  getSubscriptions: "Fetching subscriptions...",
  getFinanceSummary: "Building finance summary...",
  naturalLanguageFilter: "Filtering your data...",
  searchConversationHistory: "Searching past conversations...",
  createScheduleFromText: "Creating schedule...",
  listSchedules: "Loading schedules...",
  toggleSchedule: "Updating schedule...",
  deleteSchedule: "Removing schedule...",
  sendEmail: "Sending email...",
};

// ── Typing indicator with tool status ──
export const TypingIndicator = ({ toolStatus }) => (
  <div className="flex gap-3 mb-5">
    <AiSparkleIcon size={32} />
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 px-4 py-3 bg-canvas rounded-2xl rounded-tl-md">
        <motion.div className="w-2 h-2 bg-cta rounded-full" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
        <motion.div className="w-2 h-2 bg-cta rounded-full" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }} />
        <motion.div className="w-2 h-2 bg-cta rounded-full" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }} />
      </div>
      {toolStatus && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-ink font-medium"
        >
          <Loader2 size={12} className="animate-spin text-ink" />
          <span>{TOOL_STATUS_LABELS[toolStatus] || `Running ${toolStatus}...`}</span>
        </motion.div>
      )}
    </div>
  </div>
);

// ── Human-readable tool labels for badges ──
export const TOOL_BADGE_LABELS = {
  listWorkspaces: "Searched workspaces",
  getWorkspaceTasks: "Fetched tasks",
  createTaskInWorkspace: "Created task",
  addSubtaskToTask: "Added subtask",
  searchInvoices: "Searched invoices",
  getInvoiceDetails: "Fetched invoice details",
  searchPurchaseOrders: "Searched purchase orders",
  getVendorProfile: "Loaded vendor profile",
  searchProducts: "Searched products",
  getNotifications: "Checked notifications",
  getQuotations: "Fetched quotations",
  getInvoices: "Fetched invoices",
  getPurchaseOrders: "Fetched purchase orders",
  getCreditNotes: "Fetched credit notes",
  getSubscriptions: "Fetched subscriptions",
  getFinanceSummary: "Built finance summary",
  naturalLanguageFilter: "Filtered data",
  searchConversationHistory: "Searched conversations",
  createScheduleFromText: "Created schedule",
  listSchedules: "Loaded schedules",
  toggleSchedule: "Updated schedule",
  deleteSchedule: "Removed schedule",
  sendEmail: "Sent email",
};

// ── Tool call badge ──
export const ToolBadge = ({ tool }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface-hover border border-line rounded-full text-[11px] text-ink font-medium mr-2 mb-1"
  >
    <svg className="w-2 h-2 text-ink flex-shrink-0" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor" /></svg>
    {TOOL_BADGE_LABELS[tool] || tool}
  </motion.div>
);

// ── Parse a markdown table block (array of lines) into JSX ──
export function renderTable(tableLines, keyPrefix) {
  if (tableLines.length < 2) return null;
  const parseRow = (line) =>
    line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const headers = parseRow(tableLines[0]);
  // Skip separator row (index 1), data starts at index 2
  const dataRows = tableLines.slice(2).map(parseRow);

  return (
    <div key={keyPrefix} className="my-2 overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-surface-hover">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold text-ink border-b border-line whitespace-nowrap">
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, rIdx) => (
            <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-surface' : 'bg-canvas'}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3 py-1.5 text-ink border-b border-line">
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Lightweight markdown renderer ──
export function renderMarkdown(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const result = [];
  let tableBuffer = [];
  let lineIdx = 0;

  const flushTable = () => {
    if (tableBuffer.length >= 2) {
      result.push(renderTable(tableBuffer, `tbl-${lineIdx}`));
    } else {
      // Not a real table, render as normal lines
      tableBuffer.forEach((tl) => result.push(<div key={`line-${lineIdx++}`}>{renderInline(tl)}</div>));
    }
    tableBuffer = [];
  };

  for (lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    // Table line: starts and ends with | or contains | with content between
    if (/^\s*\|.+\|\s*$/.test(line)) {
      // Skip separator rows when not inside a table buffer yet
      if (tableBuffer.length === 0 && /^\s*\|[\s:|-]+\|\s*$/.test(line)) {
        result.push(<div key={lineIdx} className="h-2" />);
        continue;
      }
      tableBuffer.push(line);
      continue;
    }

    // Not a table line — flush any buffered table rows
    if (tableBuffer.length > 0) flushTable();

    // Heading: ### or ## or #
    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^(#{1,3})/)[1].length;
      const content = line.replace(/^#{1,3}\s*/, '');
      const Tag = level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5';
      result.push(<Tag key={lineIdx} className="font-semibold text-ink mt-2 mb-1">{renderInline(content)}</Tag>);
      continue;
    }

    // Bullet list item: - or * or •
    if (/^\s*[-*•]\s/.test(line)) {
      const content = line.replace(/^\s*[-*•]\s*/, '');
      result.push(
        <div key={lineIdx} className="flex gap-2 ml-1 my-0.5">
          <span className="text-ink mt-0.5 flex-shrink-0">•</span>
          <span>{renderInline(content)}</span>
        </div>
      );
      continue;
    }

    // Numbered list: 1. or 1)
    const numMatch = line.match(/^\s*(\d+)[.)\s]\s*(.*)/);
    if (numMatch) {
      result.push(
        <div key={lineIdx} className="flex gap-2 ml-1 my-0.5">
          <span className="text-ink font-medium flex-shrink-0">{numMatch[1]}.</span>
          <span>{renderInline(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Empty line → spacer
    if (!line.trim()) {
      result.push(<div key={lineIdx} className="h-2" />);
      continue;
    }

    // Regular paragraph
    result.push(<div key={lineIdx}>{renderInline(line)}</div>);
  }

  // Flush any remaining table at end of text
  if (tableBuffer.length > 0) flushTable();

  return result;
}

// Render inline markdown: **bold**, *italic*, `code`, [Open Workspace: TITLE](workspace:ID)
export function renderInline(text) {
  if (!text) return null;
  const parts = [];
  // Regex: workspace link | **bold** | `code` | *italic*
  const regex = /(\[Open Workspace:\s*(.+?)\]\(workspace:([\w-]+)\))|(\*\*(.+?)\*\*)|(`(.+?)`)|(\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Push plain text before this match
    if (match.index > lastIndex) {
      parts.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
    }
    if (match[2] && match[3]) {
      // [Open Workspace: TITLE](workspace:ID) → clickable button
      const wsTitle = match[2];
      const wsId = match[3];
      parts.push(
        <button
          key={key++}
          onClick={() => window.open(`/VendorDashboard/workspace/${wsId}`, '_blank')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 my-1 bg-surface-hover hover:bg-surface-hover text-ink text-xs font-semibold rounded-lg border border-line transition-all duration-200  cursor-pointer"
          title={`Open ${wsTitle} in new tab`}
        >
          <ExternalLink size={12} />
          Open {wsTitle}
        </button>
      );
    } else if (match[5]) {
      // **bold**
      parts.push(<strong key={key++} className="font-semibold text-ink">{match[5]}</strong>);
    } else if (match[7]) {
      // `code`
      parts.push(<code key={key++} className="px-1.5 py-0.5 bg-surface-hover rounded text-[12px] font-mono text-ink">{match[7]}</code>);
    } else if (match[9]) {
      // *italic*
      parts.push(<em key={key++} className="italic">{match[9]}</em>);
    }
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return parts.length > 0 ? parts : text;
}

// ── Slash commands definition ──
export const PROJECT_SLASH_COMMANDS = [
  { command: '/summary', label: 'Dashboard Summary', description: 'Get complete overview of your dashboard', icon: FileText, query: 'Give me a complete summary of my dashboard — projects, leads, finance, and tasks' },
  { command: '/finance', label: 'Finance Overview', description: 'Invoices, quotations, credit notes, subscriptions', icon: TrendingUp, query: 'Give me a detailed finance summary including invoices, quotations, purchase orders, credit notes, and subscriptions with their statuses and totals' },
  { command: '/tasks', label: 'Pending Tasks', description: 'View pending tasks across all workspaces', icon: Hash, query: 'Show me all pending tasks across all my workspaces with their status and deadlines' },
  { command: '/leads', label: 'Lead Status', description: 'Your lead invitations and conversion stats', icon: Users, query: 'Show me all my leads with their current status, PM decisions, and any response details' },
  { command: '/projects', label: 'Project Status', description: 'All projects with completion progress', icon: Briefcase, query: 'List all my projects with their current status, progress percentage, and completion details' },
  { command: '/profile', label: 'Vendor Profile', description: 'Your profile, team, products, customers', icon: Users, query: 'Show my vendor profile details including team members, products listed, and customer count' },
  { command: '/schedule', label: 'Scheduled Reports', description: 'Set up recurring reports or deadline reminders', icon: CalendarClock, query: '__OPEN_SCHEDULES__' },
  { command: '/reminders', label: 'My Reminders', description: 'View active deadline reminders', icon: Bell, query: 'Show me all my scheduled reports and reminders' },
];

export const PERSONAL_SLASH_COMMANDS = [
  { command: '/research', label: 'Market Research', description: 'Help with industry or market analysis', icon: Search, query: 'Help me with market research: ' },
  { command: '/draft', label: 'Write Draft', description: 'Draft an email, proposal, or document', icon: PenLine, query: 'Help me draft: ' },
  { command: '/brainstorm', label: 'Brainstorm Ideas', description: 'Generate ideas or strategies', icon: Lightbulb, query: 'Let\'s brainstorm ideas for: ' },
  { command: '/trends', label: 'Industry Trends', description: 'Latest trends and market insights', icon: TrendingUp, query: 'What are the latest trends in ' },
  { command: '/competitor', label: 'Competitor Analysis', description: 'Help analyze competitors', icon: Users, query: 'Help me analyze competitors in: ' },
  { command: '/news', label: 'Latest News', description: 'Get latest news on a topic', icon: Globe, query: 'What are the latest developments in ' },
];

// ── Slash command dropdown ──
export const SlashCommandMenu = ({ filter, onSelect, visible, activeSpace }) => {
  if (!visible) return null;
  const commands = activeSpace === 'personal' ? PERSONAL_SLASH_COMMANDS : PROJECT_SLASH_COMMANDS;
  const filtered = commands.filter(
    (c) => c.command.includes(filter.toLowerCase()) || c.label.toLowerCase().includes(filter.toLowerCase().replace('/', ''))
  );
  if (filtered.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="absolute bottom-full left-0 right-0 mb-1 mx-2 bg-surface border border-line rounded-xl shadow-xl z-50 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-line">
        <span className="text-[10px] font-semibold text-dim uppercase tracking-wider">Quick Commands</span>
      </div>
      <div className="max-h-[240px] overflow-y-auto py-1">
        {filtered.map((cmd) => {
          const Icon = cmd.icon;
          return (
            <button
              key={cmd.command}
              onClick={() => onSelect(cmd)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-hover transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-black border border-line flex items-center justify-center flex-shrink-0 group-hover:from-black group-hover:to-black">
                <Icon size={15} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-ink">{cmd.command}</span>
                  <span className="text-[12px] font-medium text-ink">{cmd.label}</span>
                </div>
                <p className="text-[11px] text-dim truncate">{cmd.description}</p>
              </div>
              <Zap size={12} className="text-ink opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

// ── Smart suggestions component ──
export const SmartSuggestions = ({ suggestions, onSelect, visible }) => {
  if (!visible || !suggestions || suggestions.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="flex flex-wrap gap-1.5 mt-3 mb-1"
    >
      {suggestions.map((s, i) => (
        <motion.button
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 + i * 0.1 }}
          onClick={() => onSelect(s)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black border border-line rounded-full text-[11px] text-white font-medium hover:from-black hover:to-black hover:border-line transition-all duration-200 "
        >
          <Zap size={10} className="text-white" />
          {s}
        </motion.button>
      ))}
    </motion.div>
  );
};

// ── Schedules / Reminders View ──
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const SCOPE_ICONS = {
  finance_summary: '💰',
  dashboard_summary: '📊',
  invoice: '🧾',
  quotation: '📝',
  payment: '💳',
  workspace_task: '📋',
  project: '🚀',
  purchase_order: '📦',
  credit_note: '📄',
  subscription: '🔁',
  lead: '🎯',
};

export const SchedulesView = ({ schedules, loading, onToggle, onDelete, onBack, onCreateViaChat }) => {
  const reports = schedules.filter(s => s.type === 'report');
  const reminders = schedules.filter(s => s.type === 'reminder');

  const ScheduleCard = ({ schedule }) => {
    const icon = SCOPE_ICONS[schedule.scope] || '📌';
    const scopeLabel = (schedule.scope || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const freq = schedule.recurrence === 'once' ? 'One-time' : schedule.recurrence?.charAt(0).toUpperCase() + schedule.recurrence?.slice(1);
    const day = schedule.dayOfWeek !== null && schedule.dayOfWeek !== undefined ? DAY_NAMES[schedule.dayOfWeek] : null;
    const nextRun = schedule.nextRunAt ? new Date(schedule.nextRunAt) : null;
    const isActive = schedule.enabled;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`group relative p-3.5 rounded-xl border transition-all duration-200 ${
          isActive
            ? 'bg-surface border-line hover:border-line '
            : 'bg-canvas border-line opacity-70'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
            isActive
              ? 'bg-black border border-line'
              : 'bg-surface-hover border border-line'
          }`}>
            {icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-ink truncate">{schedule.title}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${
                schedule.type === 'report'
                  ? 'bg-info/10 text-info'
                  : 'bg-warning/10 text-warning'
              }`}>
                {schedule.type}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1 text-[11px] text-dim">
              <span>{scopeLabel}</span>
              <span className="text-dim">·</span>
              <span className="flex items-center gap-1">
                <Repeat size={10} />
                {freq}{day ? ` (${day})` : ''} at {schedule.timeOfDay}
              </span>
            </div>

            {schedule.dueDate && (
              <div className="text-[11px] text-warning mt-1 flex items-center gap-1">
                <CalendarClock size={10} />
                Due: {new Date(schedule.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}

            {schedule.entityName && (
              <div className="text-[11px] text-dim mt-0.5">
                Entity: {schedule.entityName}
              </div>
            )}

            {nextRun && isActive && (
              <div className="text-[10px] text-ink mt-1.5 flex items-center gap-1">
                <Clock size={9} />
                Next: {nextRun.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Toggle */}
            <button
              onClick={() => onToggle(schedule.scheduleId)}
              className={`p-1.5 rounded-lg transition-colors ${
                isActive ? 'text-ink hover:bg-surface-hover' : 'text-dim hover:bg-surface-hover'
              }`}
              title={isActive ? 'Pause' : 'Resume'}
            >
              {isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            </button>
            {/* Delete */}
            <button
              onClick={(e) => onDelete(schedule.scheduleId, e)}
              className="p-1.5 rounded-lg text-dim hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-all"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto ai-prompt-messages-scroll">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-1 hover:bg-surface-hover rounded-lg transition-colors">
              <ArrowLeft size={16} className="text-dim" />
            </button>
            <h3 className="text-sm font-semibold text-ink font-['Montserrat']">Schedules & Reminders</h3>
          </div>
          <button
            onClick={onCreateViaChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-[11px] font-medium rounded-lg hover:from-black hover:to-black transition-all "
          >
            <Plus size={13} />
            New
          </button>
        </div>

        {/* Tip */}
        <div className="mb-4 px-3 py-2.5 bg-black border border-line rounded-xl">
          <p className="text-[11px] text-white/80 leading-relaxed">
            <strong>Tip:</strong> Type naturally in the chat, like <em>"Send me a finance summary every Monday at 9am"</em> or <em>"Remind me about invoice INV-001 due March 15"</em>.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-ink animate-spin" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-black flex items-center justify-center">
              <CalendarClock size={28} className="text-white" />
            </div>
            <p className="text-sm font-medium text-dim mb-1">No schedules yet</p>
            <p className="text-[11px] text-dim mb-4">Set up recurring reports or deadline reminders</p>
            <button
              onClick={onCreateViaChat}
              className="px-5 py-2.5 bg-cta text-cta-foreground text-xs font-medium rounded-xl hover:opacity-90 transition-all"
            >
              Create via chat
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Reports section */}
            {reports.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <FileText size={12} className="text-info" />
                  <span className="text-[11px] font-semibold text-dim uppercase tracking-wider">Scheduled Reports</span>
                  <span className="text-[10px] text-dim bg-surface-hover px-1.5 py-0.5 rounded-full">{reports.length}</span>
                  <div className="flex-1 h-px bg-surface-hover" />
                </div>
                <div className="space-y-2">
                  {reports.map(s => <ScheduleCard key={s.scheduleId} schedule={s} />)}
                </div>
              </div>
            )}

            {/* Reminders section */}
            {reminders.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Bell size={12} className="text-warning" />
                  <span className="text-[11px] font-semibold text-dim uppercase tracking-wider">Deadline Reminders</span>
                  <span className="text-[10px] text-dim bg-surface-hover px-1.5 py-0.5 rounded-full">{reminders.length}</span>
                  <div className="flex-1 h-px bg-surface-hover" />
                </div>
                <div className="space-y-2">
                  {reminders.map(s => <ScheduleCard key={s.scheduleId} schedule={s} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ── @ Mention Dropdown ──
export const MENTION_ENTITY_TYPES = [
  { type: 'workspace', label: 'Workspace', icon: '📋' },
  { type: 'project', label: 'Project', icon: '🚀' },
  { type: 'invoice', label: 'Invoice', icon: '🧾' },
  { type: 'quotation', label: 'Quotation', icon: '📝' },
  { type: 'lead', label: 'Lead', icon: '🎯' },
  { type: 'purchase_order', label: 'Purchase Order', icon: '📦' },
  { type: 'credit_note', label: 'Credit Note', icon: '📄' },
  { type: 'subscription', label: 'Subscription', icon: '🔁' },
];

export const MentionDropdown = ({ query, visible, onSelect, results, loading, showTypeSelector, onTypeSelect }) => {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="absolute bottom-full left-0 right-0 mb-1 mx-2 bg-surface border border-line rounded-xl shadow-xl z-50 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-line flex items-center gap-2">
        <AtSign size={12} className="text-info" />
        <span className="text-[10px] font-semibold text-dim uppercase tracking-wider">
          {showTypeSelector ? 'Select Entity Type' : `Mention — ${query || '...'}`}
        </span>
        {loading && <Loader2 size={12} className="text-ink animate-spin ml-auto" />}
      </div>

      <div className="max-h-[220px] overflow-y-auto py-1">
        {showTypeSelector ? (
          // Step 1: Show entity type selector
          MENTION_ENTITY_TYPES.map((t) => (
            <button
              key={t.type}
              onClick={() => onTypeSelect(t.type)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-info/10 transition-colors text-left group"
            >
              <span className="text-lg">{t.icon}</span>
              <div className="flex-1">
                <span className="text-xs font-medium text-ink">@{t.type}</span>
                <span className="text-[11px] text-dim ml-2">{t.label}</span>
              </div>
              <ChevronRight size={12} className="text-dim group-hover:text-info" />
            </button>
          ))
        ) : results.length === 0 && !loading ? (
          <div className="px-3 py-4 text-center text-[11px] text-dim">
            {query ? 'No matching entities found' : 'Type to search...'}
          </div>
        ) : (
          // Step 2: Show search results
          results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => onSelect(r)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-info/10 transition-colors text-left group"
            >
              <span className="text-base">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-ink truncate">{r.name}</div>
                <div className="flex items-center gap-2 text-[10px] text-dim">
                  <span>{r.type.replace(/_/g, ' ')}</span>
                  {r.status && <><span className="text-dim">·</span><span>{r.status}</span></>}
                  {r.extra && <><span className="text-dim">·</span><span>{r.extra}</span></>}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </motion.div>
  );
};

// ── Pinned Messages Strip ──
export const PinnedMessagesStrip = ({ pinnedMessages, onUnpin, onScrollTo }) => {
  const [expanded, setExpanded] = useState(false);

  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  return (
    <div className="flex-shrink-0 border-b border-warning/10 bg-black">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-warning/10 transition-colors"
      >
        <Pin size={12} className="text-warning flex-shrink-0" />
        <span className="text-[11px] font-semibold text-warning">
          {pinnedMessages.length} Pinned
        </span>
        <ChevronRight size={12} className={`text-warning transition-transform duration-200 ml-auto ${expanded ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-2 space-y-1.5 max-h-[160px] overflow-y-auto">
              {pinnedMessages.map((pin) => (
                <div
                  key={pin.id}
                  className="group flex items-start gap-2 px-2.5 py-2 bg-white/80 rounded-lg border border-warning/10 cursor-pointer hover:border-warning/20 transition-colors"
                  onClick={() => { onScrollTo(pin.id); setExpanded(false); }}
                >
                  <AiSparkleIcon size={18} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-dim line-clamp-2 leading-relaxed">
                      {pin.text?.slice(0, 120)}{pin.text?.length > 120 ? '...' : ''}
                    </p>
                    <span className="text-[9px] text-dim">{pin.timestamp ? new Date(pin.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onUnpin(pin.id); }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-danger/10 transition-all"
                    title="Unpin"
                  >
                    <PinOff size={11} className="text-danger" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Insights (proactive alerts) ──
// Severity drives colour; the alert type drives the icon.
export const SEVERITY_STYLES = {
  critical: { label: 'Urgent', accent: 'bg-danger', tint: 'bg-danger/10 text-danger', chip: 'bg-danger/10 text-danger' },
  warning: { label: 'Warnings', accent: 'bg-warning', tint: 'bg-warning/10 text-warning', chip: 'bg-warning/10 text-warning' },
  info: { label: 'For your info', accent: 'bg-info', tint: 'bg-info/10 text-info', chip: 'bg-info/10 text-info' },
};
const SEVERITY_ORDER = ['critical', 'warning', 'info'];

const ALERT_ICONS = {
  overdue_invoice: AlertTriangle,
  upcoming_invoice: Clock,
  stale_lead: Target,
  stale_quotation: FileText,
  subscription_expiring: Repeat,
};

export const countBySeverity = (alerts = []) => ({
  critical: alerts.filter((a) => a.severity === 'critical').length,
  warning: alerts.filter((a) => a.severity === 'warning').length,
  info: alerts.filter((a) => a.severity !== 'critical' && a.severity !== 'warning').length,
});

const InsightCard = ({ alert, onDismiss, onActOnAlert }) => {
  const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
  const Icon = ALERT_ICONS[alert.type] || Lightbulb;
  return (
    <li className="relative overflow-hidden rounded-xl border border-line bg-surface">
      <span className={`absolute inset-y-0 left-0 w-1 ${style.accent}`} aria-hidden="true" />
      <div className="flex gap-3 py-3 pl-4 pr-2">
        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${style.tint}`}>
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold leading-snug text-ink">{alert.title}</p>
          {alert.message && <p className="mt-0.5 text-[11px] leading-relaxed text-dim">{alert.message}</p>}
          {alert.suggestion && (
            <button
              type="button"
              onClick={() => onActOnAlert(alert)}
              title={alert.suggestion}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-ink transition-colors hover:bg-surface-hover"
            >
              <Sparkles size={11} />
              Ask assistant
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(alert.id)}
          className="h-6 w-6 flex-shrink-0 rounded-md text-dim transition-colors hover:bg-surface-hover hover:text-ink"
          aria-label={`Dismiss: ${alert.title}`}
          title="Dismiss"
        >
          <X size={13} className="mx-auto" />
        </button>
      </div>
    </li>
  );
};

/** Alerts grouped by severity, most urgent first. `filter` is 'all' or a severity. */
export const InsightsList = ({ alerts, onDismiss, onActOnAlert, filter = 'all' }) => {
  const visible = filter === 'all' ? alerts : alerts.filter((a) => (filter === 'info' ? a.severity !== 'critical' && a.severity !== 'warning' : a.severity === filter));
  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-5 py-10 text-center">
        <Sparkles size={18} className="mx-auto mb-2 text-dim" />
        <p className="text-[13px] font-semibold text-ink">Nothing needs attention</p>
        <p className="mx-auto mt-1 max-w-[210px] text-[11px] leading-relaxed text-dim">Overdue invoices, quiet leads and expiring subscriptions show up here.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {SEVERITY_ORDER.map((sev) => {
        const group = visible.filter((a) => (sev === 'info' ? a.severity !== 'critical' && a.severity !== 'warning' : a.severity === sev));
        if (group.length === 0) return null;
        return (
          <section key={sev} aria-label={SEVERITY_STYLES[sev].label}>
            <h4 className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-dim">
              <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_STYLES[sev].accent}`} />
              {SEVERITY_STYLES[sev].label}
              <span className="font-medium">{group.length}</span>
            </h4>
            <ul className="space-y-2">
              {group.map((alert) => (
                <InsightCard key={alert.id} alert={alert} onDismiss={onDismiss} onActOnAlert={onActOnAlert} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};

/**
 * One slim line above the conversation. On wide screens "View" opens the Insights
 * tab in the side panel; on narrow screens the list opens right below, capped in height.
 */
export const ProactiveAlertsBar = ({ alerts, onDismiss, onActOnAlert, expanded, onOpen }) => {
  if (!alerts || alerts.length === 0) return null;
  const counts = countBySeverity(alerts);

  return (
    <div className="flex-shrink-0 border-b border-line bg-surface">
      <div className="flex items-center gap-2.5 px-6 py-2">
        <span className="relative flex h-6 w-6 items-center justify-center rounded-lg bg-warning/10 text-warning">
          <Sparkles size={13} />
          {counts.critical > 0 && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger" />}
        </span>
        <p className="text-[12px] font-semibold text-ink">{alerts.length} insight{alerts.length !== 1 ? 's' : ''}</p>
        {counts.critical > 0 && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_STYLES.critical.chip}`}>{counts.critical} urgent</span>}
        {counts.warning > 0 && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_STYLES.warning.chip}`}>{counts.warning} warning{counts.warning > 1 ? 's' : ''}</span>}
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={expanded}
          className="ml-auto flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium text-dim transition-colors hover:bg-surface-hover hover:text-ink"
        >
          {expanded ? 'Hide' : 'View'}
          <ChevronRight size={12} className={`transition-transform ${expanded ? '-rotate-90' : ''}`} />
        </button>
      </div>
      {expanded && (
        <div className="max-h-[40vh] overflow-y-auto border-t border-line bg-canvas px-6 py-4 ai-prompt-messages-scroll">
          <InsightsList alerts={alerts} onDismiss={onDismiss} onActOnAlert={onActOnAlert} />
        </div>
      )}
    </div>
  );
};

// ── Voice Input Button ──
export const VoiceInputButton = ({ onTranscript, disabled }) => {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      if (finalTranscript) {
        onTranscript(finalTranscript);
      } else if (interimTranscript) {
        onTranscript(interimTranscript, true); // true = interim
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setSpeechSupported(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, [onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.warn('Failed to start speech recognition:', err);
      }
    }
  };

  if (!speechSupported) return null;

  return (
    <motion.button
      onClick={toggleListening}
      disabled={disabled}
      className={`p-2 rounded-full transition-all duration-200 relative ${
        isListening
          ? 'bg-danger/10 text-danger hover:bg-danger/10 ring-2 ring-danger/20'
          : 'hover:bg-surface-hover text-dim'
      }`}
      whileTap={{ scale: 0.9 }}
      aria-label={isListening ? 'Stop listening' : 'Voice input'}
      title={isListening ? 'Tap to stop' : 'Voice input'}
    >
      {isListening ? (
        <>
          <MicOff size={18} />
          {/* Pulsing ring animation */}
          <span className="absolute inset-0 rounded-full animate-ping bg-danger" />
        </>
      ) : (
        <Mic size={18} />
      )}
    </motion.button>
  );
};

// ────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────
