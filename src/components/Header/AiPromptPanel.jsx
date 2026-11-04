import React, { useState, useRef, useEffect, useCallback, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelLeft, PanelRight, Bot, Activity, Sparkles, ChevronRight, X, Plus, Loader2, AlertCircle, MessageSquare, Trash2, Clock, ThumbsUp, ThumbsDown, CalendarClock, FolderKanban, Globe, Search, PenLine, Pin, PinOff, AtSign, FileDown, FileSpreadsheet, RefreshCw, Mail, CheckCircle } from "lucide-react";
import { exportToPdf, exportToExcel } from "../../utils/exportUtils";
import config from "../../config/env";
import { VendorContext } from "../../context/VendorContext";
import AiApprovalCard from "./AiApprovalCard";
import { AgentAvatar } from "./AgentAvatars";
import ArchieBuilder from "./ArchieBuilder";
import { getAuthToken, apiFetch, AiSparkleIcon, TOOL_STATUS_LABELS, TypingIndicator, ToolBadge, renderMarkdown, SlashCommandMenu, SmartSuggestions, SchedulesView, MentionDropdown, PinnedMessagesStrip, ProactiveAlertsBar, InsightsList, countBySeverity, VoiceInputButton } from "./aiPanelParts";

// Agents that can run inside the workspace.
// status: 'coming-soon' agents are listed but do nothing yet.
const AGENT_REGISTRY = [
  {
    id: 'archie',
    name: 'Archie',
    role: 'Workspace Builder',
    description: 'Sets up the workspace once the PM accepts a lead and gives you collaborative access.',
    status: 'preview', // opens the intake screens; it cannot build anything yet
    themeClass: 'agent-archie', // remaps the colour tokens for the whole window (see main.css)
    lightColor: '100, 149, 237',
  },
];

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
  const [aiHealthy, setAiHealthy] = useState(null);
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
  const [emailTo, setEmailTo] = useState('');
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
  // Pins live on the server (per vendor) so they follow you across browsers and devices.
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const pendingScrollText = useRef(null); // set when a pin points into a conversation we still have to open

  // ── Voice Input state ──
  const [interimTranscript, setInterimTranscript] = useState('');

  // ── Proactive Alerts state ──
  const [proactiveAlerts, setProactiveAlerts] = useState([]);
  const [alertsExpanded, setAlertsExpanded] = useState(false);
  const [alertsLoaded, setAlertsLoaded] = useState(false);
  const wsRef = useRef(null);

  // ── Workspace layout state ──
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1024);
  const [railOpen, setRailOpen] = useState(true);
  const [railTab, setRailTab] = useState('agents'); // 'agents' | 'activity'
  const [historyQuery, setHistoryQuery] = useState('');
  const [insightFilter, setInsightFilter] = useState('all');
  const [activeAgent, setActiveAgent] = useState(null); // id of the agent whose screen is open
  const [archieSession, setArchieSession] = useState(null); // a saved Archie conversation being reopened
  const [archieConvoId, setArchieConvoId] = useState(null); // the Archie conversation on screen (highlighted in history)
  const [historyStatus, setHistoryStatus] = useState('loading'); // loading | ready | error
  const [lightUp, setLightUp] = useState(null); // { key, x, y } origin of the colour wash when an agent opens
  const [usage, setUsage] = useState(null); // { used, limit, remaining }
  const [corrections, setCorrections] = useState([]);


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


  // ── Check AI service health on mount ──
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
      setAiHealthy(data.success && data.data?.healthy && data.data?.hasRequiredModel);
    } catch {
      setAiHealthy(false);
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
      if (!res.ok || !data.success) throw new Error(data.message || `HTTP ${res.status}`);
      setConversations(data.data || []);
      setHistoryStatus('ready');
    } catch (err) {
      console.error("Failed to load conversations:", err);
      setHistoryStatus('error'); // say so, instead of pretending there are no chats
    }
  };

  // ── Bring drafts back after a reload / conversation switch ──
  const restoreDrafts = async (ids) => {
    if (!ids.length) return;
    let byId = {};
    try {
      const res = await apiFetch(`/api/ai/actions?ids=${encodeURIComponent(ids.slice(-20).join(','))}`);
      const body = await res.json();
      byId = Object.fromEntries((body.data || []).map((d) => [d.id, d]));
    } catch { /* leave them as expired below */ }
    setMessages((prev) => prev.map((m) => (m.approvals
      ? { ...m, approvals: m.approvals.map((a) => (a.state === 'loading' ? (byId[a.id] ? { ...a, ...byId[a.id] } : { ...a, state: 'expired' }) : a)) }
      : m)));
  };

  // ── Load a specific conversation ──
  const loadConversation = async (convoId) => {
    setActiveAgent(null);
    try {
      const res = await apiFetch(`/api/ai/conversations/${convoId}`);
      const data = await res.json();
      if (data.success && data.data && data.data.agent === 'archie') {
        // A saved Archie session: reopen it as it was (lead, what was said, the plan, whether it was created)
        const d = data.data;
        setArchieSession({
          conversationId: convoId,
          title: d.title || '',
          leadId: d.archieLeadId || null,
          startDate: d.archieStartDate || null,
          brief: d.archieBrief || '',
          plan: d.archiePlan || null,
          warnings: d.archieWarnings || [],
          workspace: d.archieWorkspace || null,
          created: d.archieCreated || null,
          messages: (d.messages || []).map((m) => ({ role: m.role === 'user' ? 'user' : 'archie', text: m.content })),
        });
        setArchieConvoId(convoId);
        setShowSchedules(false);
        setActiveAgent('archie');
        return;
      }
      if (data.success && data.data) {
        setArchieConvoId(null);
        setConversationId(convoId);
        setConversationTitle(data.data.title || null);
        const loaded = (data.data.messages || []).map((m) => ({
          id: m.id,
          type: m.role === "user" ? "user" : "ai",
          text: m.content,
          timestamp: m.timestamp,
          // Drafts the assistant prepared in this message: shown as "checking" until the server tells us how they stand.
          ...(m.approvalIds?.length ? { approvals: m.approvalIds.map((id) => ({ id, kind: 'task', summary: 'Draft', details: {}, expiresAt: 0, state: 'loading' })) } : {}),
        }));
        setMessages(loaded);
        restoreDrafts(loaded.flatMap((m) => (m.approvals || []).map((a) => a.id)));
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
    setActiveAgent(null);
    setArchieSession(null);
    setArchieConvoId(null);
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
        // Limits, validation and auth failures come back as JSON with a readable message.
        let message = `The assistant could not answer (error ${res.status}).`;
        try {
          const body = await res.json();
          if (body?.message) message = body.message;
        } catch { /* keep the generic message */ }
        const failure = new Error(message);
        failure.userMessage = message;
        throw failure;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = ""; // an SSE line can be split across network chunks
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

        sseBuffer += decoder.decode(value, { stream: true });
        const lines = sseBuffer.split("\n");
        sseBuffer = lines.pop() ?? "";

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
              case "reset":
                // The assistant spoke, then decided to call a tool: drop that preamble.
                aiText = "";
                setMessages((prev) => prev.map((m) => (m.id === aiMsgId ? { ...m, text: "" } : m)));
                break;
              case "done":
                setCurrentToolStatus(null);
                // The server's final text is authoritative (the stream may have been trimmed).
                if (typeof event.response === "string" && event.response && event.response !== aiText) {
                  aiText = event.response;
                  setIsLoading(false);
                  setMessages((prev) => prev.map((m) => (m.id === aiMsgId ? { ...m, text: aiText } : m)));
                }
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
                    if (action.type === 'APPROVAL_REQUIRED') {
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === aiMsgId
                            ? { ...m, approvals: [...(m.approvals || []), { ...action, state: 'pending' }] }
                            : m
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
                setIsLoading(false);
                // Remove the empty placeholder bubble left by a failed answer.
                setMessages((prev) => prev.filter((m) => m.id !== aiMsgId || m.text));
                break;
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }

      if (newConvoId && newConvoId !== conversationId) {
        setConversationId(newConvoId);
        // Show the new chat in the history straight away; the real title replaces this shortly
        setConversations((prev) => (prev.some((c) => c.conversationId === newConvoId)
          ? prev
          : [{ conversationId: newConvoId, title: userMsg.slice(0, 60), messageCount: 2, agent: null, metadata: { updatedAt: new Date().toISOString() } }, ...prev]));
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // User stopped the stream — this is expected, not an error
        console.log("[AI] Stream aborted by user");
      } else {
        console.error("Chat error:", err);
        setError(err.userMessage || "Failed to get AI response. Please try again.");
        setMessages((prev) =>
          prev.filter((m) => m.type !== "ai" || m.text !== "")
        );
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
      // Refresh learning stats and the daily allowance after each interaction
      fetchLearningStats();
      loadUsage();
      // The chat is saved on the server: pull the history so it (and its generated title) shows up
      loadConversations();
      setTimeout(loadConversations, 3000);
    }
  }, [inputText, isLoading, conversationId, activeMentions, activeSpace]);

  // ── Approve / discard a drafted action ──
  const patchApproval = useCallback((msgId, approvalId, patch) => {
    setMessages((prev) => prev.map((m) => (
      m.id === msgId
        ? { ...m, approvals: (m.approvals || []).map((a) => (a.id === approvalId ? { ...a, ...patch } : a)) }
        : m
    )));
  }, []);

  const handleApprove = useCallback(async (msgId, approval) => {
    patchApproval(msgId, approval.id, { state: 'working', error: null });
    try {
      const res = await apiFetch(`/api/ai/actions/${approval.id}/approve`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        const expired = body.code === 'EXPIRED';
        patchApproval(msgId, approval.id, { state: expired ? 'expired' : 'failed', error: body.message || 'The action did not complete.' });
        return;
      }
      patchApproval(msgId, approval.id, { state: 'done' });
      for (const action of body.data?.actions || []) {
        if (action.type === 'OPEN_WORKSPACE' && action.workspaceId) {
          setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, workspaceAction: action } : m)));
        }
        if (action.type === 'EMAIL_SENT') {
          setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, emailAction: action } : m)));
        }
      }
    } catch {
      patchApproval(msgId, approval.id, { state: 'failed', error: 'Could not reach the server. Nothing was changed. Try again.' });
    }
  }, [patchApproval]);

  const handleDiscard = useCallback(async (msgId, approval) => {
    patchApproval(msgId, approval.id, { state: 'working' });
    try {
      const res = await apiFetch(`/api/ai/actions/${approval.id}/reject`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      patchApproval(msgId, approval.id, res.ok && body.success ? { state: 'discarded' } : { state: 'failed', error: body.message || 'Could not discard it.' });
    } catch {
      patchApproval(msgId, approval.id, { state: 'failed', error: 'Could not reach the server.' });
    }
  }, [patchApproval]);

  // ── Daily allowance + saved corrections (shown in the Activity tab) ──
  const loadUsage = useCallback(async () => {
    try {
      const res = await apiFetch('/api/ai/usage');
      const body = await res.json();
      if (body.success) setUsage(body.data);
    } catch { /* optional */ }
  }, []);

  const loadCorrections = useCallback(async () => {
    try {
      const res = await apiFetch('/api/ai/corrections');
      const body = await res.json();
      if (body.success) setCorrections(body.data || []);
    } catch { /* optional */ }
  }, []);

  const removeCorrection = useCallback(async (timestamp) => {
    setCorrections((prev) => prev.filter((c) => c.timestamp !== timestamp));
    try {
      await apiFetch(`/api/ai/corrections/${encodeURIComponent(timestamp)}`, { method: 'DELETE' });
    } catch { loadCorrections(); }
  }, [loadCorrections]);

  const clearAllCorrections = useCallback(async () => {
    setCorrections([]);
    try {
      await apiFetch('/api/ai/corrections', { method: 'DELETE' });
    } catch { loadCorrections(); }
  }, [loadCorrections]);

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

    const to = emailTo.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return;
    const subject = emailSubject.trim();
    const prompt = subject
      ? `Send an email to ${to} with subject "${subject}" and message: ${body}`
      : `Send an email to ${to} saying: ${body}`;

    // Close email compose & send as normal AI message
    setShowEmailCompose(false);
    setEmailTo('');
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

  // ── Pin / Unpin messages (saved to the account) ──
  const loadPins = useCallback(async () => {
    try {
      // Pins from before this change lived in this browser only: move them into the account once.
      let local = [];
      try { local = JSON.parse(localStorage.getItem('ai_pinned_messages') || '[]'); } catch { /* ignore */ }
      const res = local.length
        ? await apiFetch('/api/ai/pins/import', { method: 'POST', body: JSON.stringify({ pins: local }) })
        : await apiFetch('/api/ai/pins');
      const body = await res.json();
      if (!body.success) return;
      setPinnedMessages(body.data || []);
      if (local.length) { try { localStorage.removeItem('ai_pinned_messages'); } catch { /* ignore */ } }
    } catch { /* pins are optional */ }
  }, []);

  const findPin = (msg) =>
    pinnedMessages.find((p) => (p.sourceMessageId != null && String(p.sourceMessageId) === String(msg.id)) || (p.conversationId === conversationId && p.text === msg.text));

  const pinMessage = async (msg) => {
    const temp = { id: `tmp-${msg.id}`, text: msg.text, timestamp: msg.timestamp, conversationId, sourceMessageId: String(msg.id) };
    setPinnedMessages((prev) => (prev.find((p) => p.id === temp.id) ? prev : [...prev, temp]));
    try {
      const res = await apiFetch('/api/ai/pins', { method: 'POST', body: JSON.stringify({ text: msg.text, timestamp: msg.timestamp, conversationId, sourceMessageId: msg.id }) });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message || 'Could not pin this answer.');
      setPinnedMessages((prev) => prev.map((p) => (p.id === temp.id ? body.data : p)));
    } catch (err) {
      setPinnedMessages((prev) => prev.filter((p) => p.id !== temp.id));
      setError(err.message || 'Could not pin this answer.');
    }
  };

  const unpinPin = async (pinId) => {
    const before = pinnedMessages;
    setPinnedMessages((prev) => prev.filter((p) => p.id !== pinId));
    if (String(pinId).startsWith('tmp-')) return;
    try {
      const res = await apiFetch(`/api/ai/pins/${pinId}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) throw new Error('failed');
    } catch {
      setPinnedMessages(before);
      setError('Could not unpin this answer.');
    }
  };

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // A pin can point at an answer in another conversation: open it, then scroll to the text.
  const scrollToPin = (pinId) => {
    const pin = pinnedMessages.find((p) => p.id === pinId);
    if (!pin) return;
    const here = messages.find((m) => (pin.sourceMessageId != null && String(m.id) === String(pin.sourceMessageId)) || m.text === pin.text);
    if (here) return scrollToMessage(here.id);
    if (pin.conversationId && pin.conversationId !== conversationId) {
      pendingScrollText.current = pin.text;
      loadConversation(pin.conversationId);
    }
  };

  useEffect(() => {
    if (!pendingScrollText.current) return;
    const target = messages.find((m) => m.text === pendingScrollText.current);
    if (target) {
      pendingScrollText.current = null;
      setTimeout(() => scrollToMessage(target.id), 50);
    }
  }, [messages]);

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

  // ── Something else in the app (e.g. the Today view) hands the assistant a question to put in the box ──
  useEffect(() => {
    const onPrefill = (e) => {
      const text = e.detail?.text;
      if (typeof text !== 'string' || !text.trim()) return;
      setActiveAgent(null);
      setInputText(text);
      setTimeout(() => inputRef.current?.focus(), 150);
    };
    window.addEventListener('ai-assistant-prefill', onPrefill);
    return () => window.removeEventListener('ai-assistant-prefill', onPrefill);
  }, []);

  // ── Load chat history whenever the workspace opens ──
  useEffect(() => {
    if (isOpen) {
      loadConversations();
      loadUsage();
      loadCorrections();
      loadPins();
    }
  }, [isOpen]);

  // ── Global keyboard shortcuts for the workspace ──
  useEffect(() => {
    if (!isOpen) return;
    const handleShortcuts = (e) => {
      // Cmd/Ctrl + K → new chat
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        startNewConversation();
        return;
      }
      // Cmd/Ctrl + B → toggle history sidebar
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarOpen((v) => !v);
        return;
      }
      // Escape → leave an open agent first, otherwise close (only if no dropdown menus are open)
      if (e.key === 'Escape' && !showSlashMenu && !showMentionMenu) {
        e.preventDefault();
        if (activeAgent) setActiveAgent(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [isOpen, onClose, showSlashMenu, showMentionMenu, activeAgent]);

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

  const filteredConversations = historyQuery.trim()
    ? conversations.filter((c) => (c.title || 'Untitled chat').toLowerCase().includes(historyQuery.trim().toLowerCase()))
    : conversations;
  const activeAgentDef = AGENT_REGISTRY.find((a) => a.id === activeAgent) || null;
  const openAgent = (agent, e) => {
    setArchieSession(null); // a fresh session
    setArchieConvoId(null);
    setLightUp({ key: Date.now(), x: e?.clientX ?? window.innerWidth - 160, y: e?.clientY ?? 160, color: agent.lightColor });
    setShowSchedules(false);
    setRailOpen(true);
    setRailTab('agents');
    setActiveAgent(agent.id);
  };

  // Wide screens show insights in the side panel; narrow ones expand them under the banner.
  const openInsights = () => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1280px)').matches) {
      setAlertsExpanded(false);
      setRailOpen(true);
      setRailTab('insights');
    } else {
      setAlertsExpanded((v) => !v);
    }
  };
  const insightCounts = countBySeverity(proactiveAlerts);
  const railButton = (id, label, Icon, badge) => (
    <button
      key={id}
      onClick={() => setRailTab(id)}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
        railTab === id ? 'bg-surface text-ink border border-line' : 'text-dim hover:text-ink'
      }`}
    >
      <Icon size={13} />
      {label}
      {badge > 0 && <span className="rounded-full bg-warning/15 px-1.5 text-[10px] font-bold text-warning">{badge}</span>}
    </button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-canvas text-ink font-['Montserrat'] ${activeAgentDef?.themeClass || ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="CG Assistant workspace"
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {/* Colour wash that "lights up" the window from the agent card that was clicked */}
          <AnimatePresence>
            {lightUp && (
              <motion.div
                key={lightUp.key}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-[60]"
                style={{
                  transformOrigin: `${lightUp.x}px ${lightUp.y}px`,
                  background: `radial-gradient(circle at ${lightUp.x}px ${lightUp.y}px, rgba(${lightUp.color || '100, 149, 237'}, 0.95) 0%, rgba(${lightUp.color || '100, 149, 237'}, 0.5) 30%, rgba(${lightUp.color || '100, 149, 237'}, 0) 65%)`,
                }}
                initial={{ opacity: 1, scale: 0.15 }}
                animate={{ opacity: 0, scale: 2.4 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                onAnimationComplete={() => setLightUp(null)}
              />
            )}
          </AnimatePresence>
          {/* ===== Top bar ===== */}
          <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-dim transition-colors hover:bg-surface-hover hover:text-ink"
              aria-label={sidebarOpen ? 'Hide chat history' : 'Show chat history'}
              title="Chat history (Ctrl/Cmd + B)"
            >
              <PanelLeft size={17} />
            </button>

            {activeAgentDef ? (
              <div className="flex items-center gap-2.5">
                <div className="overflow-hidden rounded-xl shadow-sm"><AgentAvatar id={activeAgentDef.id} size={32} /></div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-ink">{activeAgentDef.name}</div>
                  <div className="text-[10px] text-dim">{activeAgentDef.role}</div>
                </div>
              </div>
            ) : (
            <div className="flex items-center gap-2.5">
              <AiSparkleIcon size={24} />
              <div className="leading-tight">
                <div className="text-sm font-semibold text-ink">CG Assistant</div>
                <div className="flex items-center gap-1.5 text-[10px] text-dim">
                  <span className={`h-1.5 w-1.5 rounded-full ${aiHealthy === false ? 'bg-danger' : aiHealthy ? 'bg-success' : 'bg-dim'}`} />
                  {aiHealthy === false ? 'Offline' : aiHealthy ? 'Online' : 'Connecting'}
                  {learningStats && learningStats.totalInteractions > 0 && (
                    <span>· {learningStats.totalInteractions} interaction{learningStats.totalInteractions !== 1 ? 's' : ''} learned</span>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* Space switcher (hidden while an agent is open: agents have their own flow) */}
            {activeAgentDef ? <div className="mx-auto" /> : (
            <div className="mx-auto flex items-center gap-1 rounded-xl bg-surface-hover p-1">
              <button
                onClick={() => switchSpace('project')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  activeSpace === 'project' ? 'bg-surface text-ink border border-line' : 'text-dim hover:text-ink'
                }`}
              >
                <FolderKanban size={13} />
                Project
              </button>
              <button
                onClick={() => switchSpace('personal')}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  activeSpace === 'personal' ? 'bg-surface text-info border border-line' : 'text-dim hover:text-ink'
                }`}
              >
                <Globe size={13} />
                Personal
              </button>
            </div>
            )}

            <div className="flex items-center gap-1.5">
              {activeSpace === 'project' && !activeAgentDef && (
                <button
                  onClick={() => { setShowSchedules(true); loadSchedules(); }}
                  className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium transition-colors ${
                    showSchedules ? 'bg-surface-hover text-ink' : 'text-dim hover:bg-surface-hover hover:text-ink'
                  }`}
                  title="Schedules & reminders"
                >
                  <CalendarClock size={14} />
                  <span className="hidden md:inline">Schedules</span>
                </button>
              )}
              <button
                onClick={() => setRailOpen((v) => !v)}
                className="hidden h-8 w-8 items-center justify-center rounded-lg text-dim transition-colors hover:bg-surface-hover hover:text-ink xl:flex"
                aria-label={railOpen ? 'Hide agents panel' : 'Show agents panel'}
                title="Agents panel"
              >
                <PanelRight size={17} />
              </button>
              <div className="mx-1 h-5 w-px bg-line" />
              <button
                onClick={onClose}
                className="flex h-8 items-center gap-2 rounded-lg border border-line px-3 text-xs font-medium text-ink transition-colors hover:bg-surface-hover"
                aria-label="Close workspace"
              >
                <X size={14} />
                <span className="hidden sm:inline">Close</span>
                <kbd className="hidden rounded border border-line bg-surface-hover px-1.5 py-0.5 text-[9px] font-semibold text-dim sm:inline">Esc</kbd>
              </button>
            </div>
          </header>

          <div className="relative flex min-h-0 flex-1">
            {/* ===== Left sidebar: history ===== */}
            {sidebarOpen && (
              <>
                <div className="absolute inset-0 z-10 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
                <aside className="absolute inset-y-0 left-0 z-20 flex w-72 flex-shrink-0 flex-col border-r border-line bg-surface lg:relative lg:z-auto">
                  <div className="space-y-3 p-3">
                    <button
                      onClick={startNewConversation}
                      className="flex w-full items-center justify-between rounded-xl bg-cta px-3.5 py-2.5 text-xs font-semibold text-cta-foreground transition-opacity hover:opacity-90"
                    >
                      <span className="flex items-center gap-2"><Plus size={15} />New chat</span>
                      <kbd className="rounded bg-white/15 px-1.5 py-0.5 text-[9px] font-semibold">⌘K</kbd>
                    </button>
                    <div className="relative">
                      <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                      <input
                        value={historyQuery}
                        onChange={(e) => setHistoryQuery(e.target.value)}
                        placeholder="Search chats"
                        className="w-full rounded-lg border border-line bg-canvas py-2 pl-8 pr-3 text-xs text-ink outline-none placeholder:text-dim focus:border-ink/30"
                      />
                    </div>
                  </div>
                  {/* Only a fallback: the right-hand panel lists agents whenever it is visible (wide screens, panel open). */}
                  <div className={`px-3 pb-2 ${railOpen ? 'xl:hidden' : ''}`}>
                    <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-dim">Agents</p>
                    {AGENT_REGISTRY.map((agent) => (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={(e) => openAgent(agent, e)}
                        aria-pressed={activeAgent === agent.id}
                        className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors ${activeAgent === agent.id ? 'border-cta bg-surface-hover' : 'border-transparent hover:bg-surface-hover'}`}
                      >
                        <span className="flex-shrink-0 overflow-hidden rounded-lg"><AgentAvatar id={agent.id} size={28} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-semibold text-ink">{agent.name}</span>
                          <span className="block truncate text-[10px] text-dim">{agent.role}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 ai-prompt-messages-scroll">
                    {historyStatus === 'error' && conversations.length === 0 ? (
                      <div role="alert" className="mx-1 mt-4 rounded-xl border border-danger/40 bg-danger/5 p-3 text-center">
                        <p className="text-xs font-semibold text-ink">Couldn't load your chats</p>
                        <p className="mt-0.5 text-[11px] text-dim">They are still saved. Check your connection and try again.</p>
                        <button onClick={loadConversations} className="mt-2 rounded-lg border border-line px-3 py-1 text-[11px] font-medium text-ink hover:bg-surface-hover">Try again</button>
                      </div>
                    ) : historyStatus === 'loading' && conversations.length === 0 ? (
                      <div className="space-y-2 pt-3" aria-hidden="true">
                        {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-surface-hover" />)}
                      </div>
                    ) : historyQuery.trim() && filteredConversations.length === 0 ? (
                      <p className="py-10 text-center text-xs text-dim">No chats match “{historyQuery.trim()}”</p>
                    ) : (
                  conversations.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-surface-hover to-surface-hover flex items-center justify-center">
                        <MessageSquare size={28} className="text-dim" />
                      </div>
                      <p className="text-sm font-medium text-dim mb-1">No conversations yet</p>
                      <p className="text-[11px] text-dim mb-4">Start a chat to see it here</p>
                      <button
                        onClick={startNewConversation}
                        className="px-5 py-2.5 bg-cta text-cta-foreground text-xs font-medium rounded-xl hover:opacity-90 transition-all"
                      >
                        Start a new chat
                      </button>
                    </div>
                  ) : (
                    (() => {
                      const grouped = groupConversations(filteredConversations);
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
                                <Clock size={12} className="text-dim" />
                                <span className="text-[11px] font-semibold text-dim uppercase tracking-wider">{section.label}</span>
                                <div className="flex-1 h-px bg-surface-hover" />
                              </div>

                              {/* Conversation cards */}
                              <div className="space-y-1.5">
                                {section.items.map((convo, idx) => {
                                  const isActive = conversationId === convo.conversationId || archieConvoId === convo.conversationId;
                                  const updatedAt = convo.metadata?.updatedAt || convo.metadata?.createdAt;
                                  return (
                                    <motion.div
                                      key={convo.conversationId}
                                      initial={{ opacity: 0, x: -12 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: idx * 0.04 }}
                                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                                        isActive
                                          ? "bg-surface-hover border border-line "
                                          : "hover:bg-canvas border border-transparent hover:border-line"
                                      }`}
                                      onClick={() => loadConversation(convo.conversationId)}
                                    >
                                      {/* Icon */}
                                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                        isActive
                                          ? "bg-black "
                                          : "bg-surface-hover group-hover:bg-gradient-to-br group-hover:from-black group-hover:to-black"
                                      }`}>
                                        {convo.agent === 'archie'
                                          ? <AgentAvatar id="archie" size={22} />
                                          : <MessageSquare size={15} className={isActive ? "text-white" : "text-dim group-hover:text-white"} />}
                                      </div>

                                      {/* Title & meta */}
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-[13px] font-medium truncate ${isActive ? "text-ink" : "text-ink"}`}>
                                          {convo.title || "Untitled chat"}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-[10px] text-dim">{convo.messageCount || 0} msgs</span>
                                          {updatedAt && (
                                            <>
                                              <span className="text-dim">·</span>
                                              <span className="text-[10px] text-dim">{timeAgo(updatedAt)}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* Delete button */}
                                      <button
                                        onClick={(e) => handleDeleteConversation(convo.conversationId, e)}
                                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-danger/10 transition-all duration-150"
                                        aria-label="Delete conversation"
                                      >
                                        <Trash2 size={13} className="text-danger" />
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
                  )
                    )}
                  </div>
                </aside>
              </>
            )}

            {/* ===== Center: conversation ===== */}
            <main className="flex min-w-0 flex-1 flex-col bg-canvas">
              {activeAgent === 'archie' ? (
                <ArchieBuilder key={archieSession?.conversationId || 'new'} session={archieSession} onSession={(id) => { setArchieConvoId(id); loadConversations(); }} onExit={() => setActiveAgent(null)} />
              ) : showSchedules ? (
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
              ) : (
                <>
                  <div className="flex h-11 flex-shrink-0 items-center gap-3 border-b border-line bg-surface px-6">
                    <MessageSquare size={14} className="text-dim" />
                    <h2 className="truncate text-[13px] font-semibold text-ink">{conversationTitle || 'New conversation'}</h2>
                    {activeSpace === 'personal' && (
                      <span className="rounded-full border border-info bg-info px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-info">Personal</span>
                    )}
                  </div>
                  <PinnedMessagesStrip pinnedMessages={pinnedMessages} onUnpin={unpinPin} onScrollTo={scrollToPin} />
                  {activeSpace === 'project' && (
                    <ProactiveAlertsBar
                      alerts={proactiveAlerts}
                      onDismiss={dismissAlert}
                      onActOnAlert={actOnAlert}
                      expanded={alertsExpanded}
                      onOpen={openInsights}
                    />
                  )}
                <motion.div
                  className="flex-1 min-h-0 overflow-y-auto ai-prompt-messages-scroll"
                  variants={containerVariants} initial="hidden" animate="visible"
                >
                  <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-8">
                  {/* Empty state */}
                  {messages.length === 0 && !isLoading && (
                    <div className="flex flex-1 flex-col items-center justify-center text-center px-6 py-10">
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 12, delay: 0.2 }}
                      >
                        {activeSpace === 'personal' ? (
                          <div
                            className="flex items-center justify-center rounded-full flex-shrink-0"
                            style={{ width: 56, height: 56, background: "linear-gradient(135deg, rgb(var(--info)) 0%, rgb(var(--info)) 40%, rgb(var(--info)) 100%)" }}
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
                        className="mt-4 text-base font-semibold text-ink font-['Montserrat']"
                      >
                        {activeSpace === 'personal'
                          ? `Your Personal Space`
                          : `Hi${vendorData?.vendorDetails?.firstName ? `, ${vendorData.vendorDetails.firstName}` : ""}! How can I help?`}
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="mt-2 text-xs text-dim leading-relaxed max-w-md"
                      >
                        {activeSpace === 'personal'
                          ? "Use this space for brainstorming, writing, analysis and general questions. It has no live internet access, so it cannot look up today's news or prices."
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
                              "Explain common SaaS pricing models",
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
                            className={`px-3 py-1.5 bg-surface border rounded-full text-[11px] transition-all duration-200 ${
                              activeSpace === 'personal'
                                ? 'border-line text-dim hover:border-info/30 hover:text-info hover:bg-info/10'
                                : 'border-line text-dim hover:border-line hover:text-ink hover:bg-surface-hover'
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
                      className="mb-4 px-4 py-3 bg-danger/10 border border-danger/10 rounded-xl flex items-center gap-2"
                    >
                      <AlertCircle size={16} className="text-danger flex-shrink-0" />
                      <p className="text-xs text-danger">{error}</p>
                      <button onClick={() => setError(null)} className="ml-auto p-1"><X size={14} className="text-danger" /></button>
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
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-info border border-info rounded-full text-[10px] text-info font-medium"
                                  >
                                    <span>{m.icon}</span>
                                    <span>@{m.type}:{m.name}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                            {editingMsgId === msg.id ? (
                              /* Editing mode */
                              <div className="rounded-2xl rounded-tr-md px-4 py-3  border-2 border-line" style={{ background: "rgb(var(--info))" }}>
                                <textarea
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  rows={3}
                                  className="w-full text-[13px] text-dim bg-transparent border-none outline-none focus:ring-0 resize-none p-0 font-['Montserrat']"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                      e.preventDefault();
                                      handleSaveAndResend(msg.id);
                                    }
                                    if (e.key === 'Escape') handleCancelEdit();
                                  }}
                                />
                                <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-line">
                                  <button
                                    onClick={handleCancelEdit}
                                    className="px-3 py-1.5 text-[11px] text-dim hover:text-dim transition-colors rounded-lg hover:bg-cta"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveAndResend(msg.id)}
                                    disabled={!editingText.trim()}
                                    className="px-3 py-1.5 text-[11px] text-cta-foreground bg-cta hover:bg-cta rounded-lg font-medium disabled:opacity-40 transition-colors flex items-center gap-1.5"
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
                                  className="rounded-2xl rounded-tr-md px-4 py-3 text-[13px] leading-relaxed "
                                  style={{ background: "rgb(var(--info))", color: "rgb(var(--surface-hover))", fontFamily: "'Montserrat', sans-serif" }}
                                >
                                  {msg.text}
                                </div>
                                {/* Edit button — appears on hover if not streaming */}
                                {!isStreaming && (
                                  <motion.button
                                    initial={{ opacity: 0 }}
                                    whileHover={{ scale: 1.1 }}
                                    onClick={() => handleEditMessage(msg.id, msg.text)}
                                    className="absolute -left-8 top-1/2 -translate-y-1/2  opacity-0 group-hover:opacity-100 p-1.5 rounded-full bg-surface-hover hover:bg-surface-hover text-dim transition-all duration-200 "
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
                            <div className="text-[13px] leading-relaxed text-ink">
                              {msg.text ? renderMarkdown(msg.text) : (
                                <span className="text-dim italic">Thinking...</span>
                              )}
                            </div>

                            {/* Email sent confirmation banner */}
                            {msg.emailAction && (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-3 flex items-center gap-3 px-4 py-3 bg-black border border-line rounded-xl"
                              >
                                <div className="flex-shrink-0 w-8 h-8 bg-white/15 rounded-full flex items-center justify-center">
                                  <Mail size={16} className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle size={13} className="text-white" />
                                    <span className="text-xs font-semibold text-white">Email Sent</span>
                                  </div>
                                  <p className="text-[11px] text-white/60 mt-0.5 truncate">
                                    To: {msg.emailAction.to} &bull; Subject: {msg.emailAction.subject}
                                  </p>
                                </div>
                              </motion.div>
                            )}

                            {(msg.approvals || []).map((approval) => (
                              <AiApprovalCard
                                key={approval.id}
                                approval={approval}
                                onApprove={(a) => handleApprove(msg.id, a)}
                                onDiscard={(a) => handleDiscard(msg.id, a)}
                              />
                            ))}

                            {msg.timestamp && (
                              <div className="flex items-center gap-1 mt-2">
                                <span className="text-[11px] text-dim mr-auto">
                                  {new Date(msg.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {/* Only show action buttons after response is fully generated */}
                                {!isStreaming || msg.id !== messages[messages.length - 1]?.id ? (
                                  <>
                                    {/* Pin / Unpin */}
                                    <motion.button
                                      onClick={() => (findPin(msg) ? unpinPin(findPin(msg).id) : pinMessage(msg))}
                                      className={`p-1.5 rounded-full transition-all duration-200 ${
                                        findPin(msg)
                                          ? "bg-warning/10 text-warning"
                                          : "text-dim hover:text-warning hover:bg-warning/10"
                                      }`}
                                      whileHover={{ scale: 1.15 }}
                                      whileTap={{ scale: 0.9 }}
                                      title={findPin(msg) ? "Unpin" : "Pin this response"}
                                    >
                                      {findPin(msg)
                                        ? <PinOff size={14} />
                                        : <Pin size={14} />}
                                    </motion.button>
                                    {/* Thumbs Up */}
                                    <motion.button
                                      onClick={() => handleFeedback(msg.id, "positive")}
                                      className={`p-1.5 rounded-full transition-all duration-200 ${
                                        feedbackMap[msg.id] === "positive"
                                          ? "bg-surface-hover text-ink"
                                          : "text-dim hover:text-ink hover:bg-surface-hover"
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
                                          ? "bg-danger/10 text-danger"
                                          : "text-dim hover:text-danger hover:bg-danger/10"
                                      }`}
                                      whileHover={{ scale: 1.15 }}
                                      whileTap={{ scale: 0.9 }}
                                      title="Bad response"
                                    >
                                      <ThumbsDown size={14} fill={feedbackMap[msg.id] === "negative" ? "currentColor" : "none"} />
                                    </motion.button>

                                    {/* Divider */}
                                    <div className="w-px h-4 bg-surface-hover mx-0.5" />

                                    {/* Export as PDF */}
                                    <motion.button
                                      onClick={() => exportToPdf(msg.text, "AI Response")}
                                      className="p-1.5 rounded-full text-dim hover:text-danger hover:bg-danger/10 transition-all duration-200"
                                      whileHover={{ scale: 1.15 }}
                                      whileTap={{ scale: 0.9 }}
                                      title="Export as PDF"
                                    >
                                      <FileDown size={14} />
                                    </motion.button>

                                    {/* Export as Excel */}
                                    <motion.button
                                      onClick={() => exportToExcel(msg.text, "AI Response")}
                                      className="p-1.5 rounded-full text-dim hover:text-ink hover:bg-surface-hover transition-all duration-200"
                                      whileHover={{ scale: 1.15 }}
                                      whileTap={{ scale: 0.9 }}
                                      title="Export as Excel"
                                    >
                                      <FileSpreadsheet size={14} />
                                    </motion.button>

                                    {/* Regenerate response */}
                                    <motion.button
                                      onClick={() => handleRegenerate(msg.id)}
                                      className="p-1.5 rounded-full text-dim hover:text-ink hover:bg-surface-hover transition-all duration-200"
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
                  </div>
                </motion.div>

                <motion.div
                  className="flex-shrink-0 relative px-6 pb-5 pt-2"
                  initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring", damping: 25 }}
                >
                  <div className="relative mx-auto w-full max-w-3xl rounded-2xl border border-line bg-surface shadow-sm focus-within:border-ink/30 transition-colors">
                  {/* AI service offline warning */}
                  {aiHealthy === false && (
                    <div className="px-4 py-2 bg-warning/10 border-b border-warning/10 flex items-center gap-2">
                      <AlertCircle size={14} className="text-warning" />
                      <span className="text-[11px] text-warning">AI assistant is unavailable. Please try again later.</span>
                      <button onClick={checkHealth} className="ml-auto text-[11px] text-ink font-medium hover:underline">Retry</button>
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
                          className="inline-flex items-center gap-1 px-2 py-1 bg-info/10 border border-info/20 rounded-lg text-[10px] text-info font-medium group"
                        >
                          <span>{m.icon}</span>
                          <span>@{m.type}:{m.name}</span>
                          <button
                            onClick={() => removeMention(m.id)}
                            className="ml-0.5 p-0.5 rounded-full hover:bg-info/10 opacity-60 group-hover:opacity-100 transition-opacity"
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
                        className="mx-3 mb-2 bg-surface rounded-2xl border border-line shadow-xl overflow-hidden"
                      >
                        {/* Header — like macOS Spotlight */}
                        <div className="flex items-center gap-3 px-4 py-3 bg-black">
                          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                            <Mail size={16} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <span className="text-white text-[13px] font-semibold">Send Email</span>
                            <span className="text-white/60 text-[11px] ml-2">via CaaS AI</span>
                          </div>
                          <button
                            onClick={() => { setShowEmailCompose(false); setInputText(''); }}
                            className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
                          >
                            <X size={14} className="text-white" />
                          </button>
                        </div>

                        {/* To field */}
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line">
                          <span className="text-[11px] text-dim font-medium w-12">To:</span>
                          <input
                            type="email"
                            value={emailTo}
                            onChange={(e) => setEmailTo(e.target.value)}
                            className="flex-1 text-[13px] text-ink bg-transparent border-none outline-none focus:ring-0 p-0 placeholder-dim font-['Montserrat']"
                            placeholder="name@company.com"
                          />
                        </div>

                        {/* Subject field */}
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-line">
                          <span className="text-[11px] text-dim font-medium w-12">Subject:</span>
                          <input
                            type="text"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                            className="flex-1 text-[13px] text-ink bg-transparent border-none outline-none focus:ring-0 p-0 placeholder-dim font-['Montserrat']"
                            placeholder="Auto-generated if left blank"
                          />
                        </div>

                        {/* Message body */}
                        <div className="px-4 py-3">
                          <textarea
                            value={emailBody}
                            onChange={(e) => setEmailBody(e.target.value)}
                            rows={4}
                            className="w-full text-[13px] text-ink bg-canvas border border-line rounded-xl outline-none focus:ring-2 focus:ring-ink focus:border-line resize-none p-3 placeholder-dim font-['Montserrat'] transition-all"
                            placeholder="Type your message here..."
                            autoFocus
                          />
                        </div>

                        {/* Send button */}
                        <div className="flex items-center justify-between px-4 pb-3">
                          <span className="text-[10px] text-dim">
                            You'll review the draft before it is sent
                          </span>
                          <motion.button
                            onClick={handleSpotlightEmailSend}
                            disabled={!emailBody.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTo.trim())}
                            className="flex items-center gap-2 px-4 py-2 bg-black text-white text-[12px] font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
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
                        <span className="w-2 h-2 bg-danger rounded-full animate-pulse" />
                        <span className="text-[11px] text-dim italic truncate">{interimTranscript}</span>
                      </div>
                    )}
                    <textarea
                      ref={inputRef}
                      rows={2}
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      className="w-full text-[13px] text-ink bg-transparent border-none outline-none focus:ring-0 resize-none p-0 placeholder-dim font-['Montserrat']"
                      placeholder={isStreaming ? "AI is responding..." : activeSpace === 'personal' ? "Ask anything — research, brainstorm, write..." : "Type @ to mention entities, / for commands..."}
                      disabled={isStreaming}
                    />
                  </div>

                  {/* Bottom toolbar */}
                  <div className="flex items-center justify-between px-4 pb-4 pt-1">
                    <div className="flex items-center gap-2">
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
                              ? 'bg-info/10 text-info hover:bg-info/10'
                              : 'hover:bg-surface-hover text-dim'
                          }`}
                          aria-label="Mention an entity"
                          title="@ Mention an entity"
                        >
                          <AtSign size={18} />
                        </button>
                      )}
                      <VoiceInputButton onTranscript={handleVoiceTranscript} disabled={isStreaming} />
                    </div>

                    {/* Send / Stop button */}
                    {isStreaming ? (
                      <motion.button
                        onClick={handleStopStreaming}
                        className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                        style={{ background: "linear-gradient(135deg, rgb(var(--danger)) 0%, rgb(var(--warning)) 100%)" }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        aria-label="Stop generating"
                        title="Stop generating"
                      >
                        <div className="w-3.5 h-3.5 rounded-sm bg-surface" />
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
                  </div>
                  <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-dim">AI can make mistakes. Check important figures before acting on them.</p>
                </motion.div>
                </>
              )}
            </main>

            {/* ===== Right rail: agents & activity ===== */}
            {railOpen && (
              <aside className="hidden w-80 flex-shrink-0 flex-col border-l border-line bg-surface xl:flex">
                <div className="p-3">
                  <div className="flex items-center gap-1 rounded-xl bg-surface-hover p-1">
                    {railButton('agents', 'Agents', Bot)}
                    {activeSpace === 'project' && railButton('insights', 'Insights', Sparkles, proactiveAlerts.length)}
                    {railButton('activity', 'Activity', Activity)}
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 ai-prompt-messages-scroll">
                  {railTab === 'insights' && activeSpace === 'project' ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter insights">
                        {[['all', 'All', proactiveAlerts.length], ['critical', 'Urgent', insightCounts.critical], ['warning', 'Warnings', insightCounts.warning], ['info', 'Info', insightCounts.info]].map(([id, label, n]) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setInsightFilter(id)}
                            aria-pressed={insightFilter === id}
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${insightFilter === id ? 'border-ink bg-ink text-canvas' : 'border-line text-dim hover:text-ink'}`}
                          >
                            {label} <span className="opacity-70">{n}</span>
                          </button>
                        ))}
                      </div>
                      <InsightsList alerts={proactiveAlerts} filter={insightFilter} onDismiss={dismissAlert} onActOnAlert={actOnAlert} />
                    </div>
                  ) : railTab === 'agents' ? (
                    AGENT_REGISTRY.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-line px-5 py-10 text-center">
                        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-surface-hover">
                          <Bot size={20} className="text-dim" />
                        </div>
                        <p className="text-[13px] font-semibold text-ink">No agents yet</p>
                        <p className="mx-auto mt-1.5 max-w-[210px] text-[11px] leading-relaxed text-dim">
                          Agents that run tasks for you, like drafting quotations or chasing invoices, will appear here once they are added.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {AGENT_REGISTRY.map((agent) => {
                          const open = activeAgent === agent.id;
                          return (
                            <button
                              key={agent.id}
                              type="button"
                              onClick={(e) => (open ? setActiveAgent(null) : openAgent(agent, e))}
                              aria-pressed={open}
                              className={`block w-full rounded-2xl border bg-canvas p-3.5 text-left transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cta ${open ? 'border-cta ring-2 ring-cta/40 shadow-md' : 'border-line hover:border-cta/60'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 overflow-hidden rounded-2xl shadow-sm"><AgentAvatar id={agent.id} size={52} /></div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[14px] font-semibold text-ink">{agent.name}</span>
                                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${open ? 'border-cta bg-cta text-cta-foreground' : 'border-line bg-surface-hover text-dim'}`}>
                                      {open ? 'Open' : agent.status === 'preview' ? 'Preview' : 'Not active yet'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-medium text-dim">{agent.role}</p>
                                </div>
                                <ChevronRight size={14} className="flex-shrink-0 text-dim" />
                              </div>
                              {agent.description && <p className="mt-3 text-[11px] leading-relaxed text-dim">{agent.description}</p>}
                            </button>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-dim">This conversation</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-line bg-canvas p-3">
                            <div className="text-lg font-semibold text-ink">{messages.length}</div>
                            <div className="text-[10px] text-dim">Messages</div>
                          </div>
                          <div className="rounded-xl border border-line bg-canvas p-3">
                            <div className="text-lg font-semibold text-ink">{pinnedMessages.length}</div>
                            <div className="text-[10px] text-dim">Pinned</div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-dim">Data sources used</p>
                        {currentToolStatus && (
                          <div className="mb-2 flex items-center gap-2 rounded-lg bg-surface-hover px-3 py-2 text-[11px] text-ink">
                            <Loader2 size={12} className="animate-spin" />
                            {TOOL_STATUS_LABELS[currentToolStatus] || 'Working…'}
                          </div>
                        )}
                        {toolsUsed.length > 0 ? (
                          <div className="flex flex-wrap">{toolsUsed.map((tool, i) => <ToolBadge key={i} tool={tool} />)}</div>
                        ) : (
                          <p className="text-[11px] leading-relaxed text-dim">Nothing yet. When the assistant looks up your tasks, leads or invoices, they are listed here.</p>
                        )}
                      </div>
                      {usage && (
                        <div>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-dim">Messages today</p>
                          <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover" role="progressbar" aria-valuemin={0} aria-valuemax={usage.limit} aria-valuenow={usage.used}>
                            <div
                              className={`h-full rounded-full ${usage.remaining <= Math.max(5, usage.limit * 0.1) ? 'bg-danger' : 'bg-cta'}`}
                              style={{ width: `${Math.min(100, (usage.used / Math.max(1, usage.limit)) * 100)}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-[11px] text-dim">{usage.used} of {usage.limit} used · resets at midnight UTC</p>
                        </div>
                      )}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-dim">Saved corrections</p>
                          {corrections.length > 0 && (
                            <button onClick={clearAllCorrections} className="text-[10px] font-medium text-dim hover:text-danger">Clear all</button>
                          )}
                        </div>
                        {corrections.length === 0 ? (
                          <p className="text-[11px] leading-relaxed text-dim">When you correct the assistant ("No, that's wrong…"), it remembers. Those notes show up here so you can review or remove them.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {corrections.slice(0, 10).map((c) => (
                              <li key={c.timestamp} className="group flex items-start gap-2 rounded-lg border border-line bg-canvas p-2.5">
                                <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-ink break-words">{c.correct}</p>
                                <button
                                  onClick={() => removeCorrection(c.timestamp)}
                                  className="flex-shrink-0 rounded p-1 text-dim opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 focus:opacity-100"
                                  aria-label="Remove this correction"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {activeSpace === 'project' && (
                        <div>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-dim">Alerts</p>
                          <p className="text-[11px] text-dim">{proactiveAlerts.length ? `${proactiveAlerts.length} active alert${proactiveAlerts.length !== 1 ? 's' : ''}` : 'No active alerts'}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

};

export default AiPromptPanel;
