import React, { useState, useRef, useEffect, useCallback, useContext, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Paperclip, Smile, Star, MoreVertical, Plus, ExternalLink, Loader2, AlertCircle, MessageSquare, Trash2, ArrowLeft, Clock, ChevronRight, ThumbsUp, ThumbsDown, GripVertical, Maximize2, Minimize2, Zap, FileText, Users, Briefcase, TrendingUp, Hash, CalendarClock, Bell, ToggleLeft, ToggleRight, Repeat, FolderKanban, Globe, Search, Lightbulb, PenLine, Pin, PinOff, AtSign, Mic, MicOff, AlertTriangle, XCircle, Sparkles, FileDown, FileSpreadsheet, Expand, Shrink, RefreshCw, Mail, CheckCircle } from "lucide-react";
import { exportToPdf, exportToExcel } from "../../utils/exportUtils";
import config from "../../config/env";
import { VendorContext } from "../../context/VendorContext";

/**
 * AiPromptPanel
 *
 * A slide-in side panel for AI-powered chat/prompt interaction.
 * Connects to the backend /api/ai/* endpoints for real LLM responses
 * via Ollama with DynamoDB-backed conversation memory.
 */

// ── Helper: get auth token ──
function getAuthToken() {
  return localStorage.getItem("authToken") || "";
}

// ── Helper: API call ──
async function apiFetch(path, options = {}) {
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
const AiSparkleIcon = ({ size = 28 }) => (
  <div
    className="ai-sparkle-icon flex items-center justify-center rounded-full flex-shrink-0"
    style={{
      width: size,
      height: size,
      background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 40%, #a3e635 100%)",
    }}
  >
    <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" fill="white" fillOpacity="0.95" />
    </svg>
  </div>
);

// ── Tool name → human-readable status map ──
const TOOL_STATUS_LABELS = {
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
const TypingIndicator = ({ toolStatus }) => (
  <div className="flex gap-3 mb-5">
    <AiSparkleIcon size={32} />
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 rounded-2xl rounded-tl-md">
        <motion.div className="w-2 h-2 bg-teal-400 rounded-full" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
        <motion.div className="w-2 h-2 bg-teal-500 rounded-full" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }} />
        <motion.div className="w-2 h-2 bg-teal-600 rounded-full" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }} />
      </div>
      {toolStatus && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-teal-600 font-medium"
        >
          <Loader2 size={12} className="animate-spin text-teal-500" />
          <span>{TOOL_STATUS_LABELS[toolStatus] || `Running ${toolStatus}...`}</span>
        </motion.div>
      )}
    </div>
  </div>
);

// ── Human-readable tool labels for badges ──
const TOOL_BADGE_LABELS = {
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
const ToolBadge = ({ tool }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 border border-teal-100 rounded-full text-[11px] text-teal-700 font-medium mr-2 mb-1"
  >
    <svg className="w-2 h-2 text-teal-400 flex-shrink-0" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor" /></svg>
    {TOOL_BADGE_LABELS[tool] || tool}
  </motion.div>
);

// ── Parse a markdown table block (array of lines) into JSX ──
function renderTable(tableLines, keyPrefix) {
  if (tableLines.length < 2) return null;
  const parseRow = (line) =>
    line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  const headers = parseRow(tableLines[0]);
  // Skip separator row (index 1), data starts at index 2
  const dataRows = tableLines.slice(2).map(parseRow);

  return (
    <div key={keyPrefix} className="my-2 overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="bg-teal-50">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold text-teal-700 border-b border-teal-100 whitespace-nowrap">
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, rIdx) => (
            <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3 py-1.5 text-gray-700 border-b border-gray-100">
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
function renderMarkdown(text) {
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
      result.push(<Tag key={lineIdx} className="font-semibold text-gray-800 mt-2 mb-1">{renderInline(content)}</Tag>);
      continue;
    }

    // Bullet list item: - or * or •
    if (/^\s*[-*•]\s/.test(line)) {
      const content = line.replace(/^\s*[-*•]\s*/, '');
      result.push(
        <div key={lineIdx} className="flex gap-2 ml-1 my-0.5">
          <span className="text-teal-500 mt-0.5 flex-shrink-0">•</span>
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
          <span className="text-teal-600 font-medium flex-shrink-0">{numMatch[1]}.</span>
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
function renderInline(text) {
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 my-1 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold rounded-lg border border-teal-200 transition-all duration-200 hover:shadow-sm cursor-pointer"
          title={`Open ${wsTitle} in new tab`}
        >
          <ExternalLink size={12} />
          Open {wsTitle}
        </button>
      );
    } else if (match[5]) {
      // **bold**
      parts.push(<strong key={key++} className="font-semibold text-gray-800">{match[5]}</strong>);
    } else if (match[7]) {
      // `code`
      parts.push(<code key={key++} className="px-1.5 py-0.5 bg-gray-100 rounded text-[12px] font-mono text-teal-700">{match[7]}</code>);
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
const PROJECT_SLASH_COMMANDS = [
  { command: '/summary', label: 'Dashboard Summary', description: 'Get complete overview of your dashboard', icon: FileText, query: 'Give me a complete summary of my dashboard — projects, leads, finance, and tasks' },
  { command: '/finance', label: 'Finance Overview', description: 'Invoices, quotations, credit notes, subscriptions', icon: TrendingUp, query: 'Give me a detailed finance summary including invoices, quotations, purchase orders, credit notes, and subscriptions with their statuses and totals' },
  { command: '/tasks', label: 'Pending Tasks', description: 'View pending tasks across all workspaces', icon: Hash, query: 'Show me all pending tasks across all my workspaces with their status and deadlines' },
  { command: '/leads', label: 'Lead Status', description: 'Your lead invitations and conversion stats', icon: Users, query: 'Show me all my leads with their current status, PM decisions, and any response details' },
  { command: '/projects', label: 'Project Status', description: 'All projects with completion progress', icon: Briefcase, query: 'List all my projects with their current status, progress percentage, and completion details' },
  { command: '/profile', label: 'Vendor Profile', description: 'Your profile, team, products, customers', icon: Users, query: 'Show my vendor profile details including team members, products listed, and customer count' },
  { command: '/schedule', label: 'Scheduled Reports', description: 'Set up recurring reports or deadline reminders', icon: CalendarClock, query: '__OPEN_SCHEDULES__' },
  { command: '/reminders', label: 'My Reminders', description: 'View active deadline reminders', icon: Bell, query: 'Show me all my scheduled reports and reminders' },
];

const PERSONAL_SLASH_COMMANDS = [
  { command: '/research', label: 'Market Research', description: 'Help with industry or market analysis', icon: Search, query: 'Help me with market research: ' },
  { command: '/draft', label: 'Write Draft', description: 'Draft an email, proposal, or document', icon: PenLine, query: 'Help me draft: ' },
  { command: '/brainstorm', label: 'Brainstorm Ideas', description: 'Generate ideas or strategies', icon: Lightbulb, query: 'Let\'s brainstorm ideas for: ' },
  { command: '/trends', label: 'Industry Trends', description: 'Latest trends and market insights', icon: TrendingUp, query: 'What are the latest trends in ' },
  { command: '/competitor', label: 'Competitor Analysis', description: 'Help analyze competitors', icon: Users, query: 'Help me analyze competitors in: ' },
  { command: '/news', label: 'Latest News', description: 'Get latest news on a topic', icon: Globe, query: 'What are the latest developments in ' },
];

// ── Slash command dropdown ──
const SlashCommandMenu = ({ filter, onSelect, visible, activeSpace }) => {
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
      className="absolute bottom-full left-0 right-0 mb-1 mx-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-gray-100">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Quick Commands</span>
      </div>
      <div className="max-h-[240px] overflow-y-auto py-1">
        {filtered.map((cmd) => {
          const Icon = cmd.icon;
          return (
            <button
              key={cmd.command}
              onClick={() => onSelect(cmd)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-teal-50 transition-colors text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 flex items-center justify-center flex-shrink-0 group-hover:from-teal-100 group-hover:to-emerald-100">
                <Icon size={15} className="text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-teal-600">{cmd.command}</span>
                  <span className="text-[12px] font-medium text-gray-700">{cmd.label}</span>
                </div>
                <p className="text-[11px] text-gray-400 truncate">{cmd.description}</p>
              </div>
              <Zap size={12} className="text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

// ── Smart suggestions component ──
const SmartSuggestions = ({ suggestions, onSelect, visible }) => {
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-full text-[11px] text-teal-700 font-medium hover:from-teal-100 hover:to-emerald-100 hover:border-teal-300 transition-all duration-200 shadow-sm"
        >
          <Zap size={10} className="text-teal-500" />
          {s}
        </motion.button>
      ))}
    </motion.div>
  );
};

// ── Schedules / Reminders View ──
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SCOPE_ICONS = {
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

const SchedulesView = ({ schedules, loading, onToggle, onDelete, onBack, onCreateViaChat }) => {
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
            ? 'bg-white border-gray-200 hover:border-teal-200 hover:shadow-sm'
            : 'bg-gray-50 border-gray-100 opacity-70'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
            isActive
              ? 'bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100'
              : 'bg-gray-100 border border-gray-200'
          }`}>
            {icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-gray-800 truncate">{schedule.title}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${
                schedule.type === 'report'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-amber-50 text-amber-600'
              }`}>
                {schedule.type}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
              <span>{scopeLabel}</span>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1">
                <Repeat size={10} />
                {freq}{day ? ` (${day})` : ''} at {schedule.timeOfDay}
              </span>
            </div>

            {schedule.dueDate && (
              <div className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                <CalendarClock size={10} />
                Due: {new Date(schedule.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}

            {schedule.entityName && (
              <div className="text-[11px] text-gray-400 mt-0.5">
                Entity: {schedule.entityName}
              </div>
            )}

            {nextRun && isActive && (
              <div className="text-[10px] text-teal-600 mt-1.5 flex items-center gap-1">
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
                isActive ? 'text-teal-500 hover:bg-teal-50' : 'text-gray-400 hover:bg-gray-100'
              }`}
              title={isActive ? 'Pause' : 'Resume'}
            >
              {isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            </button>
            {/* Delete */}
            <button
              onClick={(e) => onDelete(schedule.scheduleId, e)}
              className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
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
            <button onClick={onBack} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft size={16} className="text-gray-500" />
            </button>
            <h3 className="text-sm font-semibold text-gray-700 font-['Montserrat']">Schedules & Reminders</h3>
          </div>
          <button
            onClick={onCreateViaChat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-[11px] font-medium rounded-lg hover:from-teal-600 hover:to-emerald-600 transition-all shadow-sm"
          >
            <Plus size={13} />
            New
          </button>
        </div>

        {/* Tip */}
        <div className="mb-4 px-3 py-2.5 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-xl">
          <p className="text-[11px] text-teal-700 leading-relaxed">
            <strong>Tip:</strong> Type naturally in the chat, like <em>"Send me a finance summary every Monday at 9am"</em> or <em>"Remind me about invoice INV-001 due March 15"</em>.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-teal-500 animate-spin" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 flex items-center justify-center">
              <CalendarClock size={28} className="text-teal-300" />
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">No schedules yet</p>
            <p className="text-[11px] text-gray-400 mb-4">Set up recurring reports or deadline reminders</p>
            <button
              onClick={onCreateViaChat}
              className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-medium rounded-xl hover:from-teal-600 hover:to-emerald-600 transition-all shadow-md"
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
                  <FileText size={12} className="text-blue-500" />
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Scheduled Reports</span>
                  <span className="text-[10px] text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded-full">{reports.length}</span>
                  <div className="flex-1 h-px bg-gray-100" />
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
                  <Bell size={12} className="text-amber-500" />
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Deadline Reminders</span>
                  <span className="text-[10px] text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded-full">{reminders.length}</span>
                  <div className="flex-1 h-px bg-gray-100" />
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
const MENTION_ENTITY_TYPES = [
  { type: 'workspace', label: 'Workspace', icon: '📋' },
  { type: 'project', label: 'Project', icon: '🚀' },
  { type: 'invoice', label: 'Invoice', icon: '🧾' },
  { type: 'quotation', label: 'Quotation', icon: '📝' },
  { type: 'lead', label: 'Lead', icon: '🎯' },
  { type: 'purchase_order', label: 'Purchase Order', icon: '📦' },
  { type: 'credit_note', label: 'Credit Note', icon: '📄' },
  { type: 'subscription', label: 'Subscription', icon: '🔁' },
];

const MentionDropdown = ({ query, visible, onSelect, results, loading, showTypeSelector, onTypeSelect }) => {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="absolute bottom-full left-0 right-0 mb-1 mx-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-2">
        <AtSign size={12} className="text-blue-500" />
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          {showTypeSelector ? 'Select Entity Type' : `Mention — ${query || '...'}`}
        </span>
        {loading && <Loader2 size={12} className="text-teal-500 animate-spin ml-auto" />}
      </div>

      <div className="max-h-[220px] overflow-y-auto py-1">
        {showTypeSelector ? (
          // Step 1: Show entity type selector
          MENTION_ENTITY_TYPES.map((t) => (
            <button
              key={t.type}
              onClick={() => onTypeSelect(t.type)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition-colors text-left group"
            >
              <span className="text-lg">{t.icon}</span>
              <div className="flex-1">
                <span className="text-xs font-medium text-gray-700">@{t.type}</span>
                <span className="text-[11px] text-gray-400 ml-2">{t.label}</span>
              </div>
              <ChevronRight size={12} className="text-gray-300 group-hover:text-blue-400" />
            </button>
          ))
        ) : results.length === 0 && !loading ? (
          <div className="px-3 py-4 text-center text-[11px] text-gray-400">
            {query ? 'No matching entities found' : 'Type to search...'}
          </div>
        ) : (
          // Step 2: Show search results
          results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              onClick={() => onSelect(r)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-blue-50 transition-colors text-left group"
            >
              <span className="text-base">{r.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-700 truncate">{r.name}</div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span>{r.type.replace(/_/g, ' ')}</span>
                  {r.status && <><span className="text-gray-300">·</span><span>{r.status}</span></>}
                  {r.extra && <><span className="text-gray-300">·</span><span>{r.extra}</span></>}
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
const PinnedMessagesStrip = ({ pinnedMessages, onUnpin, onScrollTo }) => {
  const [expanded, setExpanded] = useState(false);

  if (!pinnedMessages || pinnedMessages.length === 0) return null;

  return (
    <div className="flex-shrink-0 border-b border-amber-100 bg-gradient-to-r from-amber-50/80 to-yellow-50/80">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-amber-50 transition-colors"
      >
        <Pin size={12} className="text-amber-500 flex-shrink-0" />
        <span className="text-[11px] font-semibold text-amber-700">
          {pinnedMessages.length} Pinned
        </span>
        <ChevronRight size={12} className={`text-amber-400 transition-transform duration-200 ml-auto ${expanded ? 'rotate-90' : ''}`} />
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
                  className="group flex items-start gap-2 px-2.5 py-2 bg-white/80 rounded-lg border border-amber-100 cursor-pointer hover:border-amber-200 transition-colors"
                  onClick={() => { onScrollTo(pin.id); setExpanded(false); }}
                >
                  <AiSparkleIcon size={18} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                      {pin.text?.slice(0, 120)}{pin.text?.length > 120 ? '...' : ''}
                    </p>
                    <span className="text-[9px] text-gray-400">{pin.timestamp ? new Date(pin.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onUnpin(pin.id); }}
                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
                    title="Unpin"
                  >
                    <PinOff size={11} className="text-red-400" />
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

// ── Proactive Alerts Bar ──
const SEVERITY_STYLES = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-600' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-600' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-600' },
};

const ProactiveAlertsBar = ({ alerts, onDismiss, onActOnAlert, expanded, onToggle }) => {
  if (!alerts || alerts.length === 0) return null;

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  return (
    <div className="flex-shrink-0 border-b border-gray-100">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="relative">
          <Sparkles size={14} className="text-amber-500" />
          {criticalCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>
        <span className="text-[11px] font-semibold text-gray-600">
          {alerts.length} Insight{alerts.length !== 1 ? 's' : ''}
        </span>
        {criticalCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-600">
            {criticalCount} urgent
          </span>
        )}
        {warningCount > 0 && (
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-600">
            {warningCount} warning{warningCount > 1 ? 's' : ''}
          </span>
        )}
        <ChevronRight
          size={12}
          className={`text-gray-400 transition-transform duration-200 ml-auto ${expanded ? 'rotate-90' : ''}`}
        />
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
            <div className="px-3 pb-3 space-y-2 max-h-[250px] overflow-y-auto">
              {alerts.map((alert) => {
                const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`group relative px-3 py-2.5 rounded-xl border ${style.bg} ${style.border}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base flex-shrink-0 mt-0.5">{alert.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-semibold ${style.text} leading-snug`}>
                          {alert.title}
                        </p>
                        {alert.message && (
                          <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{alert.message}</p>
                        )}
                        {alert.suggestion && (
                          <button
                            onClick={() => onActOnAlert(alert)}
                            className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 bg-white/80 border border-gray-200 rounded-lg text-[10px] font-medium text-teal-700 hover:bg-teal-50 hover:border-teal-300 transition-all"
                          >
                            <Sparkles size={10} />
                            {alert.suggestion.length > 50 ? alert.suggestion.slice(0, 50) + '...' : alert.suggestion}
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => onDismiss(alert.id)}
                        className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/60 transition-all flex-shrink-0"
                        title="Dismiss"
                      >
                        <XCircle size={14} className="text-gray-400" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Voice Input Button ──
const VoiceInputButton = ({ onTranscript, disabled }) => {
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
          ? 'bg-red-50 text-red-500 hover:bg-red-100 ring-2 ring-red-200'
          : 'hover:bg-gray-100 text-gray-400'
      }`}
      whileTap={{ scale: 0.9 }}
      aria-label={isListening ? 'Stop listening' : 'Voice input'}
      title={isListening ? 'Tap to stop' : 'Voice input'}
    >
      {isListening ? (
        <>
          <MicOff size={18} />
          {/* Pulsing ring animation */}
          <span className="absolute inset-0 rounded-full animate-ping bg-red-200/50" />
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
const AiPromptPanel = ({ isOpen, onClose }) => {
  // State
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [conversationTitle, setConversationTitle] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [showConversationList, setShowConversationList] = useState(false);
  const [ollamaHealthy, setOllamaHealthy] = useState(null);
  const [error, setError] = useState(null);
  const [toolsUsed, setToolsUsed] = useState([]);
  const [feedbackMap, setFeedbackMap] = useState({}); // { messageId: 'positive'|'negative' }
  const [learningStats, setLearningStats] = useState(null); // { totalInteractions, correctionsStored, ... }
  const [showSlashMenu, setShowSlashMenu] = useState(false); // Slash command dropdown
  const [slashFilter, setSlashFilter] = useState('');
  const [smartSuggestions, setSmartSuggestions] = useState([]); // Follow-up suggestions from backend
  const [showSchedules, setShowSchedules] = useState(false); // Schedules management view
  const [schedules, setSchedules] = useState([]); // Vendor's scheduled reports/reminders
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [activeSpace, setActiveSpace] = useState('project'); // 'project' | 'personal'
  const [currentToolStatus, setCurrentToolStatus] = useState(null); // tool name currently running

  // ── Spotlight Email Compose state ──
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [emailTo, setEmailTo] = useState('tech@caasdiglobal.in');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // ── Stop / Edit state ──
  const abortControllerRef = useRef(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editingText, setEditingText] = useState('');

  // ── @ Mentions state ──
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionType, setMentionType] = useState(null); // null = show type picker, string = search within type
  const [mentionResults, setMentionResults] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [activeMentions, setActiveMentions] = useState([]); // resolved entities attached to current message
  const mentionSearchTimer = useRef(null);

  // ── Pin Messages state ──
  const [pinnedMessages, setPinnedMessages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ai_pinned_messages') || '[]');
    } catch { return []; }
  });

  // ── Voice Input state ──
  const [interimTranscript, setInterimTranscript] = useState('');

  // ── Proactive Alerts state ──
  const [proactiveAlerts, setProactiveAlerts] = useState([]);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [alertsLoaded, setAlertsLoaded] = useState(false);
  const wsRef = useRef(null);

  // ── Resize & drag state ──
  const DEFAULT_WIDTH = 480;
  const MIN_WIDTH = 340;
  const MAX_WIDTH = Math.min(900, typeof window !== 'undefined' ? window.innerWidth * 0.85 : 900);
  const MIN_HEIGHT = 400;
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const [panelHeight, setPanelHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [panelTop, setPanelTop] = useState(0);
  const [isFloating, setIsFloating] = useState(false); // false = docked right, true = detached window
  const [isFullscreen, setIsFullscreen] = useState(false); // fullscreen mode
  const [fullscreenTransitioning, setFullscreenTransitioning] = useState(false); // true during fullscreen animation
  const [panelPos, setPanelPos] = useState({ x: 0, y: 0 }); // For floating mode position
  const preFullscreenState = useRef({ width: DEFAULT_WIDTH, height: 0, floating: false, pos: { x: 0, y: 0 } }); // snapshot before entering fullscreen
  const isResizingX = useRef(false);
  const isResizingY = useRef(false);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, panelX: 0, panelY: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: DEFAULT_WIDTH, height: 0 });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const { vendorData } = useContext(VendorContext);

  // ── Fetch proactive alerts on mount + connect WebSocket for real-time pushes ──
  useEffect(() => {
    if (!isOpen || activeSpace !== 'project') return;

    // Fetch alerts on open
    const fetchAlerts = async () => {
      if (alertsLoaded) return;
      try {
        const res = await apiFetch('/api/ai/alerts');
        const data = await res.json();
        if (data.success) {
          setProactiveAlerts(data.data || []);
          setAlertsLoaded(true);
          // Auto-expand if there are critical alerts
          if ((data.data || []).some((a) => a.severity === 'critical')) {
            setAlertsExpanded(true);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch proactive alerts:', err);
      }
    };
    fetchAlerts();

    // Connect WebSocket for real-time alert pushes
    const vendorId = vendorData?.currentUser?.vendorId;
    if (!vendorId || wsRef.current) return;

    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const backendHost = config.VENDOR_BACKEND_URL.replace(/^https?:\/\//, '');
      const wsUrl = `${wsProtocol}//${backendHost}/api/notifications/ws/${vendorId}?userType=vendor`;

      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Handle proactive alert messages
          if (data.type === 'notification' && data.notification?.type === 'proactive_alert') {
            const newAlerts = data.notification.alerts || [];
            if (newAlerts.length > 0) {
              setProactiveAlerts((prev) => {
                const existingIds = new Set(prev.map((a) => a.id));
                const unique = newAlerts.filter((a) => !existingIds.has(a.id));
                if (unique.length === 0) return prev;
                const updated = [...unique, ...prev];
                // Auto-expand on new critical alerts
                if (unique.some((a) => a.severity === 'critical')) setAlertsExpanded(true);
                return updated;
              });
            }
          }
        } catch {}
      };

      ws.onclose = () => { wsRef.current = null; };
      ws.onerror = () => { wsRef.current = null; };
      wsRef.current = ws;
    } catch (err) {
      console.warn('WebSocket connection failed:', err);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isOpen, activeSpace, vendorData]);

  // ── Dismiss alert ──
  const dismissAlert = async (alertId) => {
    setProactiveAlerts((prev) => prev.filter((a) => a.id !== alertId));
    try {
      await apiFetch('/api/ai/alerts/dismiss', {
        method: 'POST',
        body: JSON.stringify({ alertId }),
      });
    } catch {}
  };

  // ── Act on alert (insert suggestion into chat) ──
  const actOnAlert = (alert) => {
    const context = `[Regarding ${alert.entityType}: ${alert.entityName}] ${alert.suggestion}`;
    setInputText(context);
    setAlertsExpanded(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── Voice transcript handler ──
  const handleVoiceTranscript = useCallback((transcript, isInterim = false) => {
    if (isInterim) {
      setInterimTranscript(transcript);
    } else {
      setInputText((prev) => (prev ? prev + ' ' : '') + transcript);
      setInterimTranscript('');
    }
  }, []);

  // ── Auto-scroll ──
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // ── Focus input when opened ──
  useEffect(() => {
    if (isOpen && inputRef.current && !showConversationList) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [isOpen, showConversationList]);

  // ── Reset panel dimensions when switching modes ──
  useEffect(() => {
    if (!isFloating) {
      setPanelHeight(window.innerHeight);
      setPanelTop(0);
      setPanelPos({ x: 0, y: 0 });
    } else {
      // Detach: center-ish with a nice height
      const w = panelWidth;
      const h = Math.min(700, window.innerHeight - 80);
      setPanelHeight(h);
      setPanelTop(Math.max(40, (window.innerHeight - h) / 2));
      setPanelPos({ x: window.innerWidth - w - 24, y: Math.max(40, (window.innerHeight - h) / 2) });
    }
  }, [isFloating]);

  // ── Resize handlers ──
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingX.current) {
        e.preventDefault();
        const delta = resizeStart.current.x - e.clientX;
        const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStart.current.width + delta));
        setPanelWidth(newWidth);
        if (isFloating) {
          setPanelPos((prev) => ({ ...prev, x: resizeStart.current.panelX - delta }));
        }
      }
      if (isResizingY.current && isFloating) {
        e.preventDefault();
        const delta = resizeStart.current.y - e.clientY;
        const newHeight = Math.max(MIN_HEIGHT, Math.min(window.innerHeight - 40, resizeStart.current.height + delta));
        setPanelHeight(newHeight);
        setPanelPos((prev) => ({ ...prev, y: resizeStart.current.panelY - delta }));
      }
      if (isDragging.current && isFloating) {
        e.preventDefault();
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setPanelPos({
          x: Math.max(0, Math.min(window.innerWidth - 200, dragStart.current.panelX + dx)),
          y: Math.max(0, Math.min(window.innerHeight - 100, dragStart.current.panelY + dy)),
        });
      }
    };

    const handleMouseUp = () => {
      if (isResizingX.current || isResizingY.current || isDragging.current) {
        isResizingX.current = false;
        isResizingY.current = false;
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isFloating]);

  const startResizeX = useCallback((e) => {
    e.preventDefault();
    isResizingX.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY, width: panelWidth, height: panelHeight, panelX: panelPos.x, panelY: panelPos.y };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [panelWidth, panelHeight, panelPos]);

  const startResizeY = useCallback((e) => {
    e.preventDefault();
    isResizingY.current = true;
    resizeStart.current = { x: e.clientX, y: e.clientY, width: panelWidth, height: panelHeight, panelX: panelPos.x, panelY: panelPos.y };
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, [panelWidth, panelHeight, panelPos]);

  const startDrag = useCallback((e) => {
    if (!isFloating) return;
    // Only start drag from header area, ignore button clicks
    if (e.target.closest('button')) return;
    e.preventDefault();
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, panelX: panelPos.x, panelY: panelPos.y };
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  }, [isFloating, panelPos]);

  // ── Check Ollama health on mount ──
  useEffect(() => {
    if (isOpen) {
      checkHealth();
      fetchLearningStats();
    }
  }, [isOpen]);

  const checkHealth = async () => {
    try {
      const res = await apiFetch("/api/ai/health");
      const data = await res.json();
      setOllamaHealthy(data.success && data.data?.healthy && data.data?.hasRequiredModel);
    } catch {
      setOllamaHealthy(false);
    }
  };

  const fetchLearningStats = async () => {
    try {
      const res = await apiFetch("/api/ai/learning-stats");
      const data = await res.json();
      if (data.success) {
        setLearningStats(data.data);
      }
    } catch {
      // Non-critical — learning stats are optional
    }
  };

  // ── Load conversations list ──
  const loadConversations = async () => {
    try {
      const res = await apiFetch("/api/ai/conversations");
      const data = await res.json();
      if (data.success) {
        setConversations(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  // ── Load a specific conversation ──
  const loadConversation = async (convoId) => {
    try {
      const res = await apiFetch(`/api/ai/conversations/${convoId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setConversationId(convoId);
        setConversationTitle(data.data.title || null);
        setMessages(
          (data.data.messages || []).map((m) => ({
            id: m.id,
            type: m.role === "user" ? "user" : "ai",
            text: m.content,
            timestamp: m.timestamp,
          }))
        );
        setShowConversationList(false);
        setToolsUsed([]);
        setError(null);
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  };

  // ── Delete a conversation ──
  const handleDeleteConversation = async (convoId, e) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/ai/conversations/${convoId}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.conversationId !== convoId));
      if (conversationId === convoId) {
        setConversationId(null);
        setConversationTitle(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  // ── Switch space ──
  const switchSpace = (newSpace) => {
    if (newSpace === activeSpace) return;
    setActiveSpace(newSpace);
    // Start fresh conversation in new space
    setConversationId(null);
    setConversationTitle(null);
    setMessages([]);
    setToolsUsed([]);
    setError(null);
    setFeedbackMap({});
    setSmartSuggestions([]);
    setShowConversationList(false);
    setShowSchedules(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── New conversation (+ button) ──
  // Saves current chat context and opens a fresh blank chat
  const startNewConversation = () => {
    setConversationId(null);
    setConversationTitle(null);
    setMessages([]);
    setToolsUsed([]);
    setError(null);
    setFeedbackMap({});
    setShowConversationList(false);
    setShowSchedules(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ── Schedules: load, toggle, delete ──
  const loadSchedules = async () => {
    setSchedulesLoading(true);
    try {
      const res = await apiFetch("/api/ai/schedules");
      const data = await res.json();
      if (data.success) setSchedules(data.data || []);
    } catch (err) {
      console.error("Failed to load schedules:", err);
    } finally {
      setSchedulesLoading(false);
    }
  };

  const toggleSchedule = async (scheduleId) => {
    try {
      const res = await apiFetch(`/api/ai/schedules/${scheduleId}/toggle`, { method: "PATCH" });
      const data = await res.json();
      if (data.success) {
        setSchedules((prev) => prev.map((s) => s.scheduleId === scheduleId ? data.data : s));
      }
    } catch (err) {
      console.error("Failed to toggle schedule:", err);
    }
  };

  const deleteScheduleItem = async (scheduleId, e) => {
    e?.stopPropagation();
    try {
      await apiFetch(`/api/ai/schedules/${scheduleId}`, { method: "DELETE" });
      setSchedules((prev) => prev.filter((s) => s.scheduleId !== scheduleId));
    } catch (err) {
      console.error("Failed to delete schedule:", err);
    }
  };

  // ── Send message (SSE streaming) ──
  const handleSend = useCallback(async (overrideText, { skipUserMsg = false } = {}) => {
    // Guard: ignore non-string first arg (e.g. click event passed by onClick={handleSend})
    const textToSend = (typeof overrideText === 'string' && overrideText.trim()) || inputText.trim();
    if (!textToSend || isLoading) return;

    const userMsg = textToSend;
    setInputText("");
    setError(null);
    setToolsUsed([]);
    setCurrentToolStatus(null);
    setSmartSuggestions([]);
    setShowSlashMenu(false);
    setShowMentionMenu(false);

    // Build message with mention context if any
    let messageToSend = userMsg;
    const currentMentions = [...activeMentions];
    if (currentMentions.length > 0) {
      const contextBlock = currentMentions.map((m) =>
        `@${m.type}:${m.name} (ID: ${m.id}${m.status ? `, Status: ${m.status}` : ''}${m.extra ? `, ${m.extra}` : ''})`
      ).join('; ');
      messageToSend = `[CONTEXT: ${contextBlock}] ${userMsg}`;
      setActiveMentions([]); // Clear after sending
    }

    // Add user message to UI immediately (skip for regeneration since the user msg already exists)
    if (!skipUserMsg) {
      const userMsgObj = { id: Date.now(), type: "user", text: userMsg, timestamp: new Date().toISOString(), mentions: currentMentions.length > 0 ? currentMentions : undefined };
      setMessages((prev) => [...prev, userMsgObj]);
    }
    setIsLoading(true);
    setIsStreaming(true);

    // Create abort controller for stop functionality
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const token = getAuthToken();
      const res = await fetch(`${config.VENDOR_BACKEND_URL}/api/ai/chat/stream`, {
        method: "POST",
        credentials: "include",
        signal: abortController.signal,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ conversationId, message: messageToSend, space: activeSpace }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = "";
      let aiMsgId = Date.now() + 1;
      let newConvoId = conversationId;
      let accumulatedTools = [];
      let loadingCleared = false; // local flag to avoid stale closure

      // Add placeholder AI message — keep isLoading true until first token
      setMessages((prev) => [...prev, { id: aiMsgId, type: "ai", text: "", timestamp: new Date().toISOString() }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            switch (event.type) {
              case "thinking":
                // Show thinking status in the indicator
                setCurrentToolStatus('__thinking');
                break;
              case "tool_call":
                if (event.status === 'running') {
                  // Tool just started — show its name in the indicator
                  setCurrentToolStatus(event.tool);
                } else if (event.status === 'completed') {
                  // Tool finished — add to badges, clear active status
                  if (!accumulatedTools.includes(event.tool)) {
                    accumulatedTools.push(event.tool);
                    setToolsUsed([...accumulatedTools]);
                  }
                  setCurrentToolStatus(null);
                } else {
                  // Legacy fallback
                  accumulatedTools.push(event.tool);
                  setToolsUsed([...accumulatedTools]);
                  setCurrentToolStatus(event.tool);
                }
                break;
              case "token":
                // First token means response is streaming — clear loading & tool status
                if (!loadingCleared) {
                  setIsLoading(false);
                  loadingCleared = true;
                }
                setCurrentToolStatus(null);
                aiText += event.content;
                setMessages((prev) =>
                  prev.map((m) => (m.id === aiMsgId ? { ...m, text: aiText } : m))
                );
                break;
              case "done":
                setCurrentToolStatus(null);
                if (event.conversationId) {
                  newConvoId = event.conversationId;
                }
                // Update the conversation title if backend generated one
                if (event.generatedTitle) {
                  setConversationTitle(event.generatedTitle);
                }
                // Set smart follow-up suggestions
                if (event.suggestions && event.suggestions.length > 0) {
                  setSmartSuggestions(event.suggestions);
                }
                // Handle actions (e.g. open workspace in new tab, email sent confirmation)
                if (event.actions && event.actions.length > 0) {
                  for (const action of event.actions) {
                    if (action.type === 'OPEN_WORKSPACE' && action.workspaceId) {
                      // Attach action to the AI message for rendering a persistent button
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === aiMsgId ? { ...m, workspaceAction: action } : m
                        )
                      );
                    }
                    if (action.type === 'EMAIL_SENT') {
                      // Attach email sent action for confirmation banner
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === aiMsgId ? { ...m, emailAction: action } : m
                        )
                      );
                    }
                  }
                }
                break;
              case "error":
                setError(event.message || "An error occurred");
                break;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      if (newConvoId && newConvoId !== conversationId) {
        setConversationId(newConvoId);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // User stopped the stream — this is expected, not an error
        console.log("[AI] Stream aborted by user");
      } else {
        console.error("Chat error:", err);
        setError("Failed to get AI response. Make sure Ollama is running.");
        setMessages((prev) =>
          prev.filter((m) => m.type !== "ai" || m.text !== "")
        );
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
      // Refresh learning stats after each interaction
      fetchLearningStats();
    }
  }, [inputText, isLoading, conversationId, activeMentions, activeSpace]);

  // ── Stop streaming ──
  const handleStopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsLoading(false);
    setCurrentToolStatus(null);
  }, []);

  // ── Edit a user message & resend ──
  const handleEditMessage = useCallback((msgId, msgText) => {
    setEditingMsgId(msgId);
    setEditingText(msgText);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMsgId(null);
    setEditingText('');
  }, []);

  const handleSaveAndResend = useCallback((msgId) => {
    const newText = editingText.trim();
    if (!newText) return;

    // Update the user message text
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, text: newText } : m));

    // Remove all messages AFTER this user message (the AI response)
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msgId);
      if (idx === -1) return prev;
      return prev.slice(0, idx + 1);
    });

    setEditingMsgId(null);
    setEditingText('');

    // Resend with skipUserMsg since we already have the user message in the list
    setTimeout(() => handleSend(newText, { skipUserMsg: true }), 100);
  }, [editingText, handleSend]);

  // ── Send email from Spotlight compose ──
  const handleSpotlightEmailSend = useCallback(() => {
    const body = emailBody.trim();
    if (!body) return;

    const to = emailTo.trim() || 'tech@caasdiglobal.in';
    const subject = emailSubject.trim();
    const prompt = subject
      ? `Send an email to ${to} with subject "${subject}" and message: ${body}`
      : `Send an email to ${to} saying: ${body}`;

    // Close email compose & send as normal AI message
    setShowEmailCompose(false);
    setEmailTo('tech@caasdiglobal.in');
    setEmailSubject('');
    setEmailBody('');
    setInputText('');
    handleSend(prompt);
  }, [emailTo, emailSubject, emailBody, handleSend]);

  // ── Input change handler (slash command & @ mention detection) ──
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    // Detect Spotlight email compose trigger
    const emailTrigger = /^(send\s*(an?\s+)?email|compose\s*(an?\s+)?email|mail\s+to|send\s*(a\s+)?message|email\s+to)/i;
    if (emailTrigger.test(val.trim()) && activeSpace === 'project') {
      setShowEmailCompose(true);
    }

    // Detect slash commands
    if (val.startsWith('/')) {
      setShowSlashMenu(true);
      setSlashFilter(val);
      setShowMentionMenu(false);
      return;
    } else {
      setShowSlashMenu(false);
      setSlashFilter('');
    }

    // Detect @ mentions — only in project space
    if (activeSpace === 'project') {
      const cursorPos = e.target.selectionStart;
      const textBeforeCursor = val.slice(0, cursorPos);
      // Match @<type>:<query> or just @<query>
      const mentionMatch = textBeforeCursor.match(/@(\w*(?::\w*)?)$/);

      if (mentionMatch) {
        const raw = mentionMatch[1]; // e.g. "invoice:INV" or "inv" or ""
        if (raw.includes(':')) {
          const [type, query] = raw.split(':');
          setMentionType(type);
          setMentionQuery(query || '');
          setShowMentionMenu(true);
          // Debounce search
          if (mentionSearchTimer.current) clearTimeout(mentionSearchTimer.current);
          if (query && query.length >= 1) {
            mentionSearchTimer.current = setTimeout(() => searchMentions(query, type), 300);
          } else {
            setMentionResults([]);
          }
        } else {
          // No colon yet — show type selector or search all types
          setMentionType(null);
          setMentionQuery(raw);
          setShowMentionMenu(true);
          setMentionResults([]);
        }
      } else {
        setShowMentionMenu(false);
        setMentionQuery('');
      }
    }
  };

  // ── Search entities for @ mention ──
  const searchMentions = async (query, type) => {
    if (!query || query.length < 1) return;
    setMentionLoading(true);
    try {
      const params = new URLSearchParams({ q: query });
      if (type) params.append('type', type);
      const res = await apiFetch(`/api/ai/mentions/search?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMentionResults(data.data || []);
      }
    } catch (err) {
      console.error('Mention search failed:', err);
    } finally {
      setMentionLoading(false);
    }
  };

  // ── Handle mention type selection ──
  const handleMentionTypeSelect = (type) => {
    setMentionType(type);
    setMentionResults([]);
    // Replace the @partial in input with @type:
    const cursorPos = inputRef.current?.selectionStart || inputText.length;
    const textBeforeCursor = inputText.slice(0, cursorPos);
    const textAfterCursor = inputText.slice(cursorPos);
    const newBefore = textBeforeCursor.replace(/@\w*$/, `@${type}:`);
    setInputText(newBefore + textAfterCursor);
    setTimeout(() => {
      inputRef.current?.focus();
      const newPos = newBefore.length;
      inputRef.current?.setSelectionRange(newPos, newPos);
    }, 50);
  };

  // ── Handle mention entity selection ──
  const handleMentionSelect = (entity) => {
    // Add to active mentions
    setActiveMentions((prev) => {
      const exists = prev.find((m) => m.type === entity.type && m.id === entity.id);
      if (exists) return prev;
      return [...prev, entity];
    });

    // Replace the @type:query in input with @type:name
    const cursorPos = inputRef.current?.selectionStart || inputText.length;
    const textBeforeCursor = inputText.slice(0, cursorPos);
    const textAfterCursor = inputText.slice(cursorPos);
    const newBefore = textBeforeCursor.replace(/@\w*(?::\w*)?$/, `@${entity.type}:${entity.name.replace(/\s/g, '_')} `);
    setInputText(newBefore + textAfterCursor);
    setShowMentionMenu(false);
    setMentionQuery('');
    setMentionType(null);
    setMentionResults([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ── Remove an active mention chip ──
  const removeMention = (mentionId) => {
    setActiveMentions((prev) => prev.filter((m) => m.id !== mentionId));
  };

  // ── Slash command selection ──
  const handleSlashSelect = (cmd) => {
    // Magic: open schedules view instead of sending a message (project space only)
    if (cmd.query === '__OPEN_SCHEDULES__' && activeSpace === 'project') {
      setShowSchedules(true);
      setShowConversationList(false);
      loadSchedules();
      setShowSlashMenu(false);
      setSlashFilter('');
      setInputText('');
      return;
    }
    // For personal space commands that end with a colon/space, place cursor at end
    setInputText(cmd.query);
    setShowSlashMenu(false);
    setSlashFilter('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ── Smart suggestion click ──
  const handleSuggestionClick = (suggestion) => {
    setInputText(suggestion);
    setSmartSuggestions([]);
    setTimeout(() => {
      inputRef.current?.focus();
      // Auto-send after a tiny delay for visual feedback
      setTimeout(() => {
        const fakeEvent = { key: 'Enter', shiftKey: false, preventDefault: () => {} };
        // Just set it — handleSend will fire on next render via effect or user hits enter
      }, 50);
    }, 50);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape" && showSlashMenu) {
      setShowSlashMenu(false);
      return;
    }
    if (e.key === "Escape" && showMentionMenu) {
      setShowMentionMenu(false);
      return;
    }
    // Cmd/Ctrl + Enter → send message
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Regenerate last AI response ──
  const handleRegenerate = useCallback((aiMsgId) => {
    // Find the AI message and the user message right before it
    const aiIdx = messages.findIndex((m) => m.id === aiMsgId);
    if (aiIdx < 1) return;
    const userMsg = messages[aiIdx - 1];
    if (!userMsg || userMsg.type !== "user") return;

    // Remove the AI message
    setMessages((prev) => prev.filter((m) => m.id !== aiMsgId));

    // Re-send the original user text directly (skip adding user msg again)
    handleSend(userMsg.text, { skipUserMsg: true });
  }, [messages, handleSend]);

  // ── Pin / Unpin messages ──
  const pinMessage = (msg) => {
    setPinnedMessages((prev) => {
      if (prev.find((p) => p.id === msg.id)) return prev;
      const updated = [...prev, { id: msg.id, text: msg.text, timestamp: msg.timestamp }];
      localStorage.setItem('ai_pinned_messages', JSON.stringify(updated));
      return updated;
    });
  };

  const unpinMessage = (msgId) => {
    setPinnedMessages((prev) => {
      const updated = prev.filter((p) => p.id !== msgId);
      localStorage.setItem('ai_pinned_messages', JSON.stringify(updated));
      return updated;
    });
  };

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // ── Submit feedback (thumbs up/down) ──
  const handleFeedback = async (msgId, feedbackType) => {
    if (!conversationId) return;
    // If already same feedback, un-toggle
    if (feedbackMap[msgId] === feedbackType) {
      setFeedbackMap((prev) => { const copy = { ...prev }; delete copy[msgId]; return copy; });
      return;
    }
    setFeedbackMap((prev) => ({ ...prev, [msgId]: feedbackType }));

    // Find the AI message and the preceding user message for context
    const msgIndex = messages.findIndex((m) => m.id === msgId);
    const aiMsg = messages[msgIndex];
    const userMsg = messages.slice(0, msgIndex).reverse().find((m) => m.type === "user");

    try {
      await apiFetch("/api/ai/feedback", {
        method: "POST",
        body: JSON.stringify({
          conversationId,
          messageId: String(msgId),
          feedback: feedbackType,
          userQuery: userMsg?.text || "",
          aiResponse: aiMsg?.text || "",
        }),
      });
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  };

  // ── Animations ──
  const backdropVariants = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };
  const panelVariants = {
    hidden: { x: "100%", opacity: 0.5 },
    visible: { x: 0, opacity: 1, transition: { type: "spring", damping: 30, stiffness: 300, mass: 0.8 } },
    exit: { x: "100%", opacity: 0, transition: { type: "spring", damping: 35, stiffness: 400 } },
  };

  // ── Fullscreen toggle ──
  const toggleFullscreen = useCallback(() => {
    setFullscreenTransitioning(true);
    if (!isFullscreen) {
      // Save current state before going fullscreen
      preFullscreenState.current = {
        width: panelWidth,
        height: panelHeight,
        floating: isFloating,
        pos: { ...panelPos },
      };
      setIsFullscreen(true);
      setIsFloating(false);
      setPanelWidth(window.innerWidth);
      setPanelHeight(window.innerHeight);
      setPanelPos({ x: 0, y: 0 });
    } else {
      // Restore previous state
      setIsFullscreen(false);
      const prev = preFullscreenState.current;
      setIsFloating(prev.floating);
      setPanelWidth(prev.width);
      if (prev.floating) {
        setPanelHeight(prev.height);
        setPanelPos(prev.pos);
      } else {
        setPanelHeight(window.innerHeight);
        setPanelPos({ x: 0, y: 0 });
      }
    }
    // Clear transitioning flag after animation completes
    setTimeout(() => setFullscreenTransitioning(false), 600);
  }, [isFullscreen, panelWidth, panelHeight, isFloating, panelPos]);

  // ── Global keyboard shortcuts for the panel ──
  useEffect(() => {
    if (!isOpen) return;
    const handlePanelShortcuts = (e) => {
      // Cmd/Ctrl + Shift + F → toggle fullscreen
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
        return;
      }
      // Escape → close panel (only if no dropdown menus are open)
      if (e.key === 'Escape' && !showSlashMenu && !showMentionMenu) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handlePanelShortcuts);
    return () => window.removeEventListener('keydown', handlePanelShortcuts);
  }, [isOpen, toggleFullscreen, onClose, showSlashMenu, showMentionMenu]);

  // ── Relative time helper ──
  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  // ── Group conversations by date ──
  const groupConversations = (convos) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const groups = { today: [], yesterday: [], thisWeek: [], older: [] };
    for (const c of convos) {
      const date = new Date(c.metadata?.updatedAt || c.metadata?.createdAt || 0);
      if (date >= today) groups.today.push(c);
      else if (date >= yesterday) groups.yesterday.push(c);
      else if (date >= weekAgo) groups.thisWeek.push(c);
      else groups.older.push(c);
    }
    return groups;
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 25, stiffness: 200 } },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={`fixed inset-0 z-[9998] ${isFloating ? 'bg-black/10' : 'bg-black/30 backdrop-blur-[2px]'}`}
            variants={backdropVariants} initial="hidden" animate="visible" exit="exit"
            onClick={onClose} transition={{ duration: 0.25 }}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            className={`fixed z-[9999] flex flex-col shadow-2xl overflow-hidden ${
              !isFloating ? 'top-0 right-0' : ''
            }`}
            style={{
              background: "#fafafa",
              borderLeft: isFullscreen ? 'none' : (isFloating ? 'none' : "1px solid rgba(0,0,0,0.08)"),
              border: isFullscreen ? 'none' : (isFloating ? '1px solid rgba(0,0,0,0.12)' : undefined),
              ...(isFloating && !isFullscreen
                ? { left: `${panelPos.x}px`, top: `${panelPos.y}px` }
                : {}),
            }}
            initial={{ x: "100%", opacity: 0.5 }}
            animate={{
              x: 0,
              opacity: 1,
              width: isFullscreen ? window.innerWidth : panelWidth,
              height: isFullscreen ? window.innerHeight : (isFloating ? panelHeight : window.innerHeight),
              borderRadius: isFullscreen ? 0 : (isFloating ? 12 : 0),
            }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{
              // Default spring for open/close (x, opacity)
              type: "spring", damping: 30, stiffness: 300, mass: 0.8,
              // Width/height: smooth spring during fullscreen toggle, instant during resize
              width: fullscreenTransitioning
                ? { type: "spring", damping: 28, stiffness: 170, mass: 1 }
                : { duration: 0 },
              height: fullscreenTransitioning
                ? { type: "spring", damping: 28, stiffness: 170, mass: 1 }
                : { duration: 0 },
              borderRadius: fullscreenTransitioning
                ? { type: "spring", damping: 25, stiffness: 200 }
                : { duration: 0 },
            }}
          >
            {/* ── Left-edge resize handle (hidden in fullscreen) ── */}
            {!isFullscreen && (
              <div
                className="absolute left-0 top-0 bottom-0 w-[5px] z-[10000] cursor-col-resize group"
                onMouseDown={startResizeX}
              >
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-transparent group-hover:bg-teal-400/40 transition-colors duration-150" />
              </div>
            )}

            {/* ── Top-edge resize handle (floating mode, hidden in fullscreen) ── */}
            {isFloating && !isFullscreen && (
              <div
                className="absolute left-0 right-0 top-0 h-[5px] z-[10000] cursor-row-resize group"
                onMouseDown={startResizeY}
              >
                <div className="absolute left-0 right-0 top-0 h-[3px] bg-transparent group-hover:bg-teal-400/40 transition-colors duration-150" />
              </div>
            )}
            {/* ===== Gradient Header ===== */}
            <div
              className={`relative px-5 pt-5 pb-4 flex-shrink-0 ${isFloating ? 'cursor-grab active:cursor-grabbing' : ''}`}
              style={{ background: "linear-gradient(135deg, #0f2b26 0%, #134e3a 30%, #166045 50%, #1a7a56 70%, #1e8a5e 100%)" }}
              onMouseDown={isFloating ? startDrag : undefined}
            >
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                backgroundImage: "radial-gradient(circle at 20% 50%, rgba(20,184,166,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(163,230,53,0.15) 0%, transparent 50%)",
              }} />

              <div className="relative flex items-center justify-between">
                {/* Left: Close or Back */}
                <button
                  onClick={showConversationList || showSchedules ? () => { setShowConversationList(false); setShowSchedules(false); } : onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
                  aria-label={showConversationList || showSchedules ? "Back" : "Close panel"}
                >
                  {showConversationList || showSchedules ? <ArrowLeft size={18} /> : <X size={18} />}
                </button>

                {/* Center: Status */}
                <div className="flex items-center gap-2">
                  <AiSparkleIcon size={22} />
                  <div className="flex flex-col items-start">
                    <span className="text-white text-sm font-medium font-['Montserrat']">CG Assistant</span>
                    {learningStats && learningStats.totalInteractions > 0 && (
                      <span className="text-teal-300/70 text-[9px] font-medium leading-tight">
                        {learningStats.totalInteractions} interaction{learningStats.totalInteractions !== 1 ? 's' : ''} learned
                      </span>
                    )}
                  </div>
                  {activeSpace === 'personal' && (
                    <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-[9px] text-indigo-200 font-semibold uppercase tracking-wider">
                      Personal
                    </span>
                  )}
                  {ollamaHealthy === false && (
                    <span className="text-red-300 text-[10px]">(offline)</span>
                  )}
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-2">
                  {/* Schedules button — project space only */}
                  {activeSpace === 'project' && (
                    <button
                      onClick={() => { setShowSchedules(true); setShowConversationList(false); loadSchedules(); }}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-all duration-200 border border-white/10"
                      aria-label="Schedules & Reminders"
                      title="Schedules & Reminders"
                    >
                      <CalendarClock size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => { setShowConversationList(true); setShowSchedules(false); loadConversations(); }}
                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-all duration-200 backdrop-blur-sm border border-white/10"
                  >
                    Recent chats
                  </button>
                  {/* Float / Dock toggle */}
                  {!isFullscreen && (
                    <button
                      onClick={() => setIsFloating((f) => !f)}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-all duration-200 border border-white/10"
                      aria-label={isFloating ? 'Dock panel' : 'Float panel'}
                      title={isFloating ? 'Dock to side' : 'Pop out as window'}
                    >
                      {isFloating ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                  )}
                  {/* Fullscreen toggle */}
                  <button
                    onClick={toggleFullscreen}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 border border-white/10 ${
                      isFullscreen
                        ? 'bg-white/25 hover:bg-white/35 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? <Shrink size={14} /> : <Expand size={14} />}
                  </button>
                  <button
                    onClick={startNewConversation}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-all duration-200 border border-white/10"
                    aria-label="New chat"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* ===== Space Switcher Tabs ===== */}
            <div className="flex-shrink-0 bg-white border-b border-gray-100 px-3 py-2">
              <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
                <button
                  onClick={() => switchSpace('project')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    activeSpace === 'project'
                      ? 'bg-white text-teal-700 shadow-sm border border-gray-200'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FolderKanban size={14} className={activeSpace === 'project' ? 'text-teal-600' : 'text-gray-400'} />
                  Project Space
                </button>
                <button
                  onClick={() => switchSpace('personal')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    activeSpace === 'personal'
                      ? 'bg-white text-indigo-700 shadow-sm border border-gray-200'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Globe size={14} className={activeSpace === 'personal' ? 'text-indigo-500' : 'text-gray-400'} />
                  Personal Space
                </button>
              </div>
            </div>

            {/* ===== Pinned Messages Strip ===== */}
            <PinnedMessagesStrip
              pinnedMessages={pinnedMessages}
              onUnpin={unpinMessage}
              onScrollTo={scrollToMessage}
            />

            {/* ===== Proactive Alerts Bar (Project Space only) ===== */}
            {activeSpace === 'project' && (
              <ProactiveAlertsBar
                alerts={proactiveAlerts}
                onDismiss={dismissAlert}
                onActOnAlert={actOnAlert}
                expanded={alertsExpanded}
                onToggle={() => setAlertsExpanded((e) => !e)}
              />
            )}

            {/* ===== Schedules View ===== */}
            {showSchedules ? (
              <SchedulesView
                schedules={schedules}
                loading={schedulesLoading}
                onToggle={toggleSchedule}
                onDelete={deleteScheduleItem}
                onBack={() => setShowSchedules(false)}
                onCreateViaChat={() => {
                  setShowSchedules(false);
                  setInputText('Set up a ');
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
              />
            ) : showConversationList ? (
              <div className="flex-1 overflow-y-auto ai-prompt-messages-scroll">
                <div className="p-4">
                  {/* Header with new chat button */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 font-['Montserrat']">Recent Chats</h3>
                    <button
                      onClick={startNewConversation}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-[11px] font-medium rounded-lg hover:from-teal-600 hover:to-emerald-600 transition-all shadow-sm"
                    >
                      <Plus size={13} />
                      New Chat
                    </button>
                  </div>

                  {conversations.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                        <MessageSquare size={28} className="text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500 mb-1">No conversations yet</p>
                      <p className="text-[11px] text-gray-400 mb-4">Start a chat to see it here</p>
                      <button
                        onClick={startNewConversation}
                        className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-xs font-medium rounded-xl hover:from-teal-600 hover:to-emerald-600 transition-all shadow-md"
                      >
                        Start a new chat
                      </button>
                    </div>
                  ) : (
                    (() => {
                      const grouped = groupConversations(conversations);
                      const sections = [
                        { label: "Today", items: grouped.today },
                        { label: "Yesterday", items: grouped.yesterday },
                        { label: "This Week", items: grouped.thisWeek },
                        { label: "Older", items: grouped.older },
                      ].filter((s) => s.items.length > 0);

                      return (
                        <div className="space-y-4">
                          {sections.map((section) => (
                            <div key={section.label}>
                              {/* Section label */}
                              <div className="flex items-center gap-2 mb-2">
                                <Clock size={12} className="text-gray-400" />
                                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{section.label}</span>
                                <div className="flex-1 h-px bg-gray-100" />
                              </div>

                              {/* Conversation cards */}
                              <div className="space-y-1.5">
                                {section.items.map((convo, idx) => {
                                  const isActive = conversationId === convo.conversationId;
                                  const updatedAt = convo.metadata?.updatedAt || convo.metadata?.createdAt;
                                  return (
                                    <motion.div
                                      key={convo.conversationId}
                                      initial={{ opacity: 0, x: -12 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: idx * 0.04 }}
                                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                                        isActive
                                          ? "bg-teal-50 border border-teal-200 shadow-sm"
                                          : "hover:bg-gray-50 border border-transparent hover:border-gray-100"
                                      }`}
                                      onClick={() => loadConversation(convo.conversationId)}
                                    >
                                      {/* Icon */}
                                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                        isActive
                                          ? "bg-gradient-to-br from-teal-400 to-emerald-500 shadow-sm"
                                          : "bg-gray-100 group-hover:bg-gradient-to-br group-hover:from-teal-400 group-hover:to-emerald-500"
                                      }`}>
                                        <MessageSquare size={15} className={isActive ? "text-white" : "text-gray-400 group-hover:text-white"} />
                                      </div>

                                      {/* Title & meta */}
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-[13px] font-medium truncate ${isActive ? "text-teal-800" : "text-gray-700"}`}>
                                          {convo.title || "Untitled chat"}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[10px] text-gray-400">{convo.messageCount || 0} msgs</span>
                                          {updatedAt && (
                                            <>
                                              <span className="text-gray-300">·</span>
                                              <span className="text-[10px] text-gray-400">{timeAgo(updatedAt)}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* Delete button */}
                                      <button
                                        onClick={(e) => handleDeleteConversation(convo.conversationId, e)}
                                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all duration-150"
                                        aria-label="Delete conversation"
                                      >
                                        <Trash2 size={13} className="text-red-400" />
                                      </button>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* ===== Messages Area ===== */}
                <motion.div
                  className="flex-1 overflow-y-auto px-4 py-4 ai-prompt-messages-scroll"
                  variants={containerVariants} initial="hidden" animate="visible"
                >
                  {/* Empty state */}
                  {messages.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 12, delay: 0.2 }}
                      >
                        {activeSpace === 'personal' ? (
                          <div
                            className="flex items-center justify-center rounded-full flex-shrink-0"
                            style={{ width: 56, height: 56, background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 40%, #a78bfa 100%)" }}
                          >
                            <Globe size={28} className="text-white" />
                          </div>
                        ) : (
                          <AiSparkleIcon size={56} />
                        )}
                      </motion.div>
                      <motion.h3
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="mt-4 text-base font-semibold text-gray-700 font-['Montserrat']"
                      >
                        {activeSpace === 'personal'
                          ? `Your Personal Space`
                          : `Hi${vendorData?.vendorDetails?.firstName ? `, ${vendorData.vendorDetails.firstName}` : ""}! How can I help?`}
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="mt-2 text-xs text-gray-400 leading-relaxed max-w-[280px]"
                      >
                        {activeSpace === 'personal'
                          ? "Use this space for market research, brainstorming, writing, industry trends, and anything beyond your CaaS data."
                          : "Ask me about your workspaces, tasks, leads, invoices, quotations, or anything about your vendor data."}
                      </motion.p>
                      {/* Quick suggestions */}
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="mt-5 flex flex-wrap justify-center gap-2"
                      >
                        {(activeSpace === 'personal'
                          ? [
                              "Latest trends in SaaS industry",
                              "Help me draft a business proposal",
                              "Brainstorm marketing ideas",
                            ]
                          : [
                              "How many pending tasks do I have?",
                              "Show my recent leads",
                              "Give me a finance summary",
                            ]
                        ).map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => { setInputText(suggestion); setTimeout(() => inputRef.current?.focus(), 50); }}
                            className={`px-3 py-1.5 bg-white border rounded-full text-[11px] transition-all duration-200 ${
                              activeSpace === 'personal'
                                ? 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50'
                                : 'border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50'
                            }`}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </motion.div>
                    </div>
                  )}

                  {/* Error banner */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                      className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2"
                    >
                      <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                      <p className="text-xs text-red-600">{error}</p>
                      <button onClick={() => setError(null)} className="ml-auto p-1"><X size={14} className="text-red-300" /></button>
                    </motion.div>
                  )}

                  {/* Tool badges */}
                  {toolsUsed.length > 0 && (
                    <div className="mb-3 flex flex-wrap">
                      {toolsUsed.map((tool, i) => <ToolBadge key={i} tool={tool} />)}
                    </div>
                  )}

                  {/* Message bubbles */}
                  {messages.map((msg) => (
                    <motion.div key={msg.id} id={`msg-${msg.id}`} variants={itemVariants} className="mb-5">
                      {msg.type === "user" ? (
                        <div className="flex justify-end group">
                          <div className="max-w-[88%]">
                            {/* Mention chips above user message */}
                            {msg.mentions && msg.mentions.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-1.5 justify-end">
                                {msg.mentions.map((m) => (
                                  <span key={`${m.type}-${m.id}`}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 border border-blue-300/30 rounded-full text-[10px] text-blue-300 font-medium"
                                  >
                                    <span>{m.icon}</span>
                                    <span>@{m.type}:{m.name}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                            {editingMsgId === msg.id ? (
                              /* Editing mode */
                              <div className="rounded-2xl rounded-tr-md px-4 py-3 shadow-sm border-2 border-teal-400" style={{ background: "#1a1a2e" }}>
                                <textarea
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  rows={3}
                                  className="w-full text-[13px] text-gray-200 bg-transparent border-none outline-none focus:ring-0 resize-none p-0 font-['Montserrat']"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                      e.preventDefault();
                                      handleSaveAndResend(msg.id);
                                    }
                                    if (e.key === 'Escape') handleCancelEdit();
                                  }}
                                />
                                <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-gray-600">
                                  <button
                                    onClick={handleCancelEdit}
                                    className="px-3 py-1.5 text-[11px] text-gray-400 hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-700"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveAndResend(msg.id)}
                                    disabled={!editingText.trim()}
                                    className="px-3 py-1.5 text-[11px] text-white bg-teal-500 hover:bg-teal-600 rounded-lg font-medium disabled:opacity-40 transition-colors flex items-center gap-1.5"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                                    Save & Resend
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Normal display mode */
                              <div className="relative">
                                <div
                                  className="rounded-2xl rounded-tr-md px-4 py-3 text-[13px] leading-relaxed shadow-sm"
                                  style={{ background: "#1a1a2e", color: "#e2e8f0", fontFamily: "'Montserrat', sans-serif" }}
                                >
                                  {msg.text}
                                </div>
                                {/* Edit button — appears on hover if not streaming */}
                                {!isStreaming && (
                                  <motion.button
                                    initial={{ opacity: 0 }}
                                    whileHover={{ scale: 1.1 }}
                                    onClick={() => handleEditMessage(msg.id, msg.text)}
                                    className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all duration-200 shadow-sm"
                                    title="Edit & resend"
                                  >
                                    <PenLine size={12} />
                                  </motion.button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.1 }}
                          >
                            <AiSparkleIcon size={32} />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            {/* Tool badges shown inline on the streaming message once tools complete */}
                            {isStreaming && msg.id === messages[messages.length - 1]?.id && toolsUsed.length > 0 && !currentToolStatus && (
                              <div className="mb-2 flex flex-wrap gap-1">
                                {toolsUsed.map((tool, i) => <ToolBadge key={i} tool={tool} />)}
                              </div>
                            )}
                            <div className="text-[13px] leading-relaxed text-gray-700">
                              {msg.text ? renderMarkdown(msg.text) : (
                                <span className="text-gray-300 italic">Thinking...</span>
                              )}
                            </div>

                            {/* Email sent confirmation banner */}
                            {msg.emailAction && (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-3 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl"
                              >
                                <div className="flex-shrink-0 w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                                  <Mail size={16} className="text-teal-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle size={13} className="text-emerald-500" />
                                    <span className="text-xs font-semibold text-emerald-700">Email Sent</span>
                                  </div>
                                  <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                                    To: {msg.emailAction.to} &bull; Subject: {msg.emailAction.subject}
                                  </p>
                                </div>
                              </motion.div>
                            )}

                            {msg.timestamp && (
                              <div className="flex items-center gap-1 mt-2">
                                <span className="text-[11px] text-gray-400 mr-auto">
                                  {new Date(msg.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {/* Only show action buttons after response is fully generated */}
                                {!isStreaming || msg.id !== messages[messages.length - 1]?.id ? (
                                  <>
                                    {/* Pin / Unpin */}
                                    <motion.button
                                      onClick={() => pinnedMessages.find((p) => p.id === msg.id) ? unpinMessage(msg.id) : pinMessage(msg)}
                                      className={`p-1.5 rounded-full transition-all duration-200 ${
                                        pinnedMessages.find((p) => p.id === msg.id)
                                          ? "bg-amber-100 text-amber-600"
                                          : "text-gray-300 hover:text-amber-500 hover:bg-amber-50"
                                      }`}
                                      whileHover={{ scale: 1.15 }}
                                      whileTap={{ scale: 0.9 }}
                                      title={pinnedMessages.find((p) => p.id === msg.id) ? "Unpin" : "Pin this response"}
                                    >
                                      {pinnedMessages.find((p) => p.id === msg.id)
                                        ? <PinOff size={14} />
                                        : <Pin size={14} />}
                                    </motion.button>
                                    {/* Thumbs Up */}
                                    <motion.button
                                      onClick={() => handleFeedback(msg.id, "positive")}
                                      className={`p-1.5 rounded-full transition-all duration-200 ${
                                        feedbackMap[msg.id] === "positive"
                                          ? "bg-emerald-100 text-emerald-600"
                                          : "text-gray-300 hover:text-emerald-500 hover:bg-emerald-50"
                                      }`}
                                      whileHover={{ scale: 1.15 }}
                                      whileTap={{ scale: 0.9 }}
                                      title="Good response"
                                    >
                                      <ThumbsUp size={14} fill={feedbackMap[msg.id] === "positive" ? "currentColor" : "none"} />
                                    </motion.button>
                                    {/* Thumbs Down */}
                                    <motion.button
                                      onClick={() => handleFeedback(msg.id, "negative")}
                                      className={`p-1.5 rounded-full transition-all duration-200 ${
                                        feedbackMap[msg.id] === "negative"
                                          ? "bg-red-100 text-red-500"
                                          : "text-gray-300 hover:text-red-400 hover:bg-red-50"
                                      }`}
                                      whileHover={{ scale: 1.15 }}
                                      whileTap={{ scale: 0.9 }}
                                      title="Bad response"
                                    >
                                      <ThumbsDown size={14} fill={feedbackMap[msg.id] === "negative" ? "currentColor" : "none"} />
                                    </motion.button>

                                    {/* Divider */}
                                    <div className="w-px h-4 bg-gray-200 mx-0.5" />

                                    {/* Export as PDF */}
                                    <motion.button
                                      onClick={() => exportToPdf(msg.text, "AI Response")}
                                      className="p-1.5 rounded-full text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-all duration-200"
                                      whileHover={{ scale: 1.15 }}
                                      whileTap={{ scale: 0.9 }}
                                      title="Export as PDF"
                                    >
                                      <FileDown size={14} />
                                    </motion.button>

                                    {/* Export as Excel */}
                                    <motion.button
                                      onClick={() => exportToExcel(msg.text, "AI Response")}
                                      className="p-1.5 rounded-full text-gray-300 hover:text-emerald-500 hover:bg-emerald-50 transition-all duration-200"
                                      whileHover={{ scale: 1.15 }}
                                      whileTap={{ scale: 0.9 }}
                                      title="Export as Excel"
                                    >
                                      <FileSpreadsheet size={14} />
                                    </motion.button>

                                    {/* Regenerate response */}
                                    <motion.button
                                      onClick={() => handleRegenerate(msg.id)}
                                      className="p-1.5 rounded-full text-gray-300 hover:text-teal-500 hover:bg-teal-50 transition-all duration-200"
                                      whileHover={{ scale: 1.15, rotate: -30 }}
                                      whileTap={{ scale: 0.9 }}
                                      title="Regenerate response"
                                    >
                                      <RefreshCw size={14} />
                                    </motion.button>
                                  </>
                                ) : null}
                              </div>
                            )}

                            {/* Smart follow-up suggestions (only on the last AI message after streaming completes) */}
                            {msg.id === messages[messages.length - 1]?.id && !isStreaming && (
                              <SmartSuggestions
                                suggestions={smartSuggestions}
                                onSelect={handleSuggestionClick}
                                visible={smartSuggestions.length > 0}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* Typing indicator while loading OR while tools are running */}
                  {(isLoading || currentToolStatus) && <TypingIndicator toolStatus={currentToolStatus} />}

                  <div ref={messagesEndRef} />
                </motion.div>

                {/* ===== Compose Area ===== */}
                <motion.div
                  className="flex-shrink-0 border-t border-gray-100 bg-white relative"
                  initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring", damping: 25 }}
                >
                  {/* Ollama offline warning */}
                  {ollamaHealthy === false && (
                    <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                      <AlertCircle size={14} className="text-amber-500" />
                      <span className="text-[11px] text-amber-700">AI model is offline. Make sure Ollama is running.</span>
                      <button onClick={checkHealth} className="ml-auto text-[11px] text-teal-600 font-medium hover:underline">Retry</button>
                    </div>
                  )}

                  {/* Slash command dropdown (positioned above input) */}
                  <AnimatePresence>
                    <SlashCommandMenu
                      filter={slashFilter}
                      onSelect={handleSlashSelect}
                      visible={showSlashMenu}
                      activeSpace={activeSpace}
                    />
                  </AnimatePresence>

                  {/* @ Mention dropdown (positioned above input) */}
                  <AnimatePresence>
                    <MentionDropdown
                      query={mentionQuery}
                      visible={showMentionMenu && activeSpace === 'project'}
                      onSelect={handleMentionSelect}
                      results={mentionResults}
                      loading={mentionLoading}
                      showTypeSelector={!mentionType}
                      onTypeSelect={handleMentionTypeSelect}
                    />
                  </AnimatePresence>

                  {/* Active mention chips */}
                  {activeMentions.length > 0 && (
                    <div className="px-4 pt-2 pb-0 flex flex-wrap gap-1.5">
                      {activeMentions.map((m) => (
                        <span
                          key={`${m.type}-${m.id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg text-[10px] text-blue-700 font-medium group"
                        >
                          <span>{m.icon}</span>
                          <span>@{m.type}:{m.name}</span>
                          <button
                            onClick={() => removeMention(m.id)}
                            className="ml-0.5 p-0.5 rounded-full hover:bg-blue-100 opacity-60 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* ── Spotlight Email Compose Panel ── */}
                  <AnimatePresence>
                    {showEmailCompose && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="mx-3 mb-2 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden"
                      >
                        {/* Header — like macOS Spotlight */}
                        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-teal-500 to-teal-600">
                          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                            <Mail size={16} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <span className="text-white text-[13px] font-semibold">Send Email</span>
                            <span className="text-teal-100 text-[11px] ml-2">via CaaS AI</span>
                          </div>
                          <button
                            onClick={() => { setShowEmailCompose(false); setInputText(''); }}
                            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                          >
                            <X size={14} className="text-white" />
                          </button>
                        </div>

                        {/* To field */}
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
                          <span className="text-[11px] text-gray-400 font-medium w-12">To:</span>
                          <input
                            type="email"
                            value={emailTo}
                            onChange={(e) => setEmailTo(e.target.value)}
                            className="flex-1 text-[13px] text-gray-700 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder-gray-300 font-['Montserrat']"
                            placeholder="tech@caasdiglobal.in"
                          />
                        </div>

                        {/* Subject field */}
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
                          <span className="text-[11px] text-gray-400 font-medium w-12">Subject:</span>
                          <input
                            type="text"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            className="flex-1 text-[13px] text-gray-700 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder-gray-300 font-['Montserrat']"
                            placeholder="Auto-generated if left blank"
                          />
                        </div>

                        {/* Message body */}
                        <div className="px-4 py-3">
                          <textarea
                            value={emailBody}
                            onChange={(e) => setEmailBody(e.target.value)}
                            rows={4}
                            className="w-full text-[13px] text-gray-700 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-200 focus:border-teal-300 resize-none p-3 placeholder-gray-400 font-['Montserrat'] transition-all"
                            placeholder="Type your message here..."
                            autoFocus
                          />
                        </div>

                        {/* Send button */}
                        <div className="flex items-center justify-between px-4 pb-3">
                          <span className="text-[10px] text-gray-400">
                            Powered by AWS SES
                          </span>
                          <motion.button
                            onClick={handleSpotlightEmailSend}
                            disabled={!emailBody.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-[12px] font-semibold rounded-xl shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                            whileHover={emailBody.trim() ? { scale: 1.03 } : {}}
                            whileTap={emailBody.trim() ? { scale: 0.97 } : {}}
                          >
                            <Mail size={14} />
                            Send Email
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Input area */}
                  <div className="px-4 py-3">
                    {/* Interim voice transcript */}
                    {interimTranscript && (
                      <div className="mb-1 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                        <span className="text-[11px] text-gray-400 italic truncate">{interimTranscript}</span>
                      </div>
                    )}
                    <textarea
                      ref={inputRef}
                      rows={2}
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      className="w-full text-[13px] text-gray-700 bg-transparent border-none outline-none focus:ring-0 resize-none p-0 placeholder-gray-400 font-['Montserrat']"
                      placeholder={isStreaming ? "AI is responding..." : activeSpace === 'personal' ? "Ask anything — research, brainstorm, write..." : "Type @ to mention entities, / for commands..."}
                      disabled={isStreaming}
                    />
                  </div>

                  {/* Bottom toolbar */}
                  <div className="flex items-center justify-between px-4 pb-4 pt-1">
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Attach file">
                        <Paperclip size={18} className="text-gray-400" />
                      </button>
                      {activeSpace === 'project' && (
                        <button
                          onClick={() => {
                            setInputText((prev) => prev + '@');
                            setShowMentionMenu(true);
                            setMentionType(null);
                            setMentionResults([]);
                            setTimeout(() => inputRef.current?.focus(), 50);
                          }}
                          className={`p-2 rounded-full transition-colors ${
                            activeMentions.length > 0
                              ? 'bg-blue-50 text-blue-500 hover:bg-blue-100'
                              : 'hover:bg-gray-100 text-gray-400'
                          }`}
                          aria-label="Mention an entity"
                          title="@ Mention an entity"
                        >
                          <AtSign size={18} />
                        </button>
                      )}
                      <button className="p-2 hover:bg-gray-100 rounded-full transition-colors" aria-label="Add emoji">
                        <Smile size={18} className="text-gray-400" />
                      </button>
                      <VoiceInputButton onTranscript={handleVoiceTranscript} disabled={isStreaming} />
                    </div>

                    {/* Send / Stop button */}
                    {isStreaming ? (
                      <motion.button
                        onClick={handleStopStreaming}
                        className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                        style={{ background: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)" }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        aria-label="Stop generating"
                        title="Stop generating"
                      >
                        <div className="w-3.5 h-3.5 rounded-sm bg-white" />
                      </motion.button>
                    ) : (
                      <motion.button
                        onClick={handleSend}
                        className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg disabled:opacity-50"
                        style={{
                          background: inputText.trim()
                            ? "linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #22c55e 100%)"
                            : "#d1d5db",
                        }}
                        whileHover={inputText.trim() ? { scale: 1.08 } : {}}
                        whileTap={inputText.trim() ? { scale: 0.92 } : {}}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        disabled={!inputText.trim()}
                        aria-label="Send message"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AiPromptPanel;
