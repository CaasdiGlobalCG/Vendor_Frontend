import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { persistNodeDataPatch } from "../../utils/nodePersistence";
import {
  Calendar,
  Flag,
  Paperclip,
  Plus,
  Tag,
  User,
  MessageCircle,
  CheckSquare,
  Trash2,
  UploadCloud,
  Activity,
  CheckCircle,
  Download,
  Loader2
} from "lucide-react";
const STATUS_OPTIONS = [
  { value: "todo", label: "To-Do" },
  { value: "in-progress", label: "In-Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" }
];
const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" }
];
const getStatusBadgeClass = (status) => {
  switch (status) {
    case "in-progress":
      return "bg-info/10 text-info border-info/20";
    case "blocked":
      return "bg-danger/10 text-danger border-danger/20";
    case "completed":
      return "bg-surface-hover text-ink border-line";
    default:
      return "bg-surface-hover text-ink border-line";
  }
};
const getPriorityBadgeClass = (priority) => {
  switch (priority) {
    case "high":
      return "bg-warning/10 text-warning border-warning/20";
    case "critical":
      return "bg-danger/10 text-danger border-danger/20";
    case "medium":
      return "bg-warning/10 text-warning border-warning/20";
    default:
      return "bg-info/10 text-info border-info/20";
  }
};
const createActivityEntry = (action, meta = {}) => ({
  id: `${action}-${Date.now()}`,
  action,
  meta,
  timestamp: (/* @__PURE__ */ new Date()).toLocaleString()
});
const TaskCardRenderer = ({ data, nodeId, workspaceId, setNodes }) => {
  const defaultState = useMemo(
    () => ({
      title: data?.taskCardData?.title || "Untitled Task",
      description: data?.taskCardData?.description || "",
      status: data?.taskCardData?.status || "todo",
      assignedTo: data?.taskCardData?.assignedTo || "",
      priority: data?.taskCardData?.priority || "medium",
      dueDate: data?.taskCardData?.dueDate || "",
      checklists: data?.taskCardData?.checklists || [],
      attachments: data?.taskCardData?.attachments || [],
      comments: data?.taskCardData?.comments || [],
      dependencies: data?.taskCardData?.dependencies || [],
      labels: data?.taskCardData?.labels || [],
      activityLog: data?.taskCardData?.activityLog || [
        createActivityEntry("Task created")
      ]
    }),
    [data?.taskCardData]
  );
  const [taskState, setTaskState] = useState(defaultState);
  const [checklistText, setChecklistText] = useState("");
  const [commentText, setCommentText] = useState("");
  const [dependencyText, setDependencyText] = useState("");
  const [labelText, setLabelText] = useState("");
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const taskId = data?.taskId;
  const subtaskId = data?.subtaskId;
  const taskStateRef = useRef(taskState);
  const dirtyRef = useRef(false);
  const persistTimerRef = useRef(null);
  useEffect(() => {
    taskStateRef.current = taskState;
  }, [taskState]);
  const schedulePersist = useCallback(() => {
    if (!nodeId || !workspaceId)
      return;
    dirtyRef.current = true;
    if (persistTimerRef.current)
      clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(async () => {
      persistTimerRef.current = null;
      try {
        await persistNodeDataPatch(
          nodeId,
          { taskCardData: taskStateRef.current },
          setNodes,
          workspaceId
        );
      } catch (err) {
        console.error("Failed to persist task card:", err);
      } finally {
        dirtyRef.current = false;
      }
    }, 800);
  }, [nodeId, workspaceId, setNodes]);
  useEffect(() => () => {
    if (persistTimerRef.current && nodeId && workspaceId) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
      persistNodeDataPatch(
        nodeId,
        { taskCardData: taskStateRef.current },
        setNodes,
        workspaceId
      ).catch((err) => console.error("Failed to persist task card on unmount:", err));
    }
  }, [nodeId, workspaceId, setNodes]);
  useEffect(() => {
    if (dirtyRef.current)
      return;
    setTaskState(
      (prev) => JSON.stringify(prev) === JSON.stringify(defaultState) ? prev : defaultState
    );
  }, [defaultState]);
  const logActivity = (action, meta) => {
    setTaskState((prev) => ({
      ...prev,
      activityLog: [createActivityEntry(action, meta), ...prev.activityLog]
    }));
    schedulePersist();
  };
  const updateField = (field, value) => {
    setTaskState((prev) => ({
      ...prev,
      [field]: value
    }));
    schedulePersist();
  };
  const handleStatusChange = (value) => {
    updateField("status", value);
    logActivity("Status updated", { status: value });
  };
  const handlePriorityChange = (value) => {
    updateField("priority", value);
    logActivity("Priority updated", { priority: value });
  };
  const collaborators = useMemo(
    () => (data?.workspaceCollaborators || []).filter(
      (c, i, arr) => arr.findIndex(
        (x) => (x.vendorId || x.userId || x.email) === (c.vendorId || c.userId || c.email)
      ) === i
    ),
    [data?.workspaceCollaborators]
  );
  const collaboratorKey = (c) => c.vendorId || c.userId || c.email;
  const matchedAssignee = collaborators.find(
    (c) => collaboratorKey(c) === taskState.assignedToKey || collaboratorKey(c) === taskState.assignedTo || (c.name || c.email) === taskState.assignedTo
  );
  const assigneeSelectValue = taskState.assignedToKey || (matchedAssignee ? collaboratorKey(matchedAssignee) : taskState.assignedTo || "");
  const handleAssignedToChange = (key) => {
    const collab = collaborators.find((c) => collaboratorKey(c) === key);
    const name = collab ? collab.name || collab.email || "" : key;
    setTaskState((prev) => ({
      ...prev,
      assignedTo: name,
      assignedToKey: key
    }));
    logActivity("Task reassigned", { assignee: name || "Unassigned" });
  };
  const handleDueDateChange = (value) => {
    updateField("dueDate", value);
    logActivity("Due date updated", { dueDate: value });
  };
  const addChecklistItem = () => {
    if (!checklistText.trim())
      return;
    const newItem = {
      id: `cl-${Date.now()}`,
      text: checklistText.trim(),
      completed: false
    };
    setTaskState((prev) => ({
      ...prev,
      checklists: [...prev.checklists, newItem]
    }));
    logActivity("Checklist item added", { item: newItem.text });
    setChecklistText("");
  };
  const toggleChecklist = (itemId) => {
    setTaskState((prev) => ({
      ...prev,
      checklists: prev.checklists.map(
        (item) => item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    }));
    const toggledItem = taskState.checklists.find((item) => item.id === itemId);
    logActivity("Checklist toggled", {
      item: toggledItem?.text,
      completed: !toggledItem?.completed
    });
  };
  const removeChecklistItem = (itemId) => {
    const removed = taskState.checklists.find((item) => item.id === itemId);
    setTaskState((prev) => ({
      ...prev,
      checklists: prev.checklists.filter((item) => item.id !== itemId)
    }));
    logActivity("Checklist removed", { item: removed?.text });
  };
  const addComment = () => {
    if (!commentText.trim())
      return;
    const comment = {
      id: `comment-${Date.now()}`,
      author: taskState.assignedTo || "You",
      text: commentText.trim(),
      timestamp: (/* @__PURE__ */ new Date()).toLocaleString()
    };
    setTaskState((prev) => ({
      ...prev,
      comments: [comment, ...prev.comments]
    }));
    logActivity("Comment added", { excerpt: comment.text.slice(0, 40) });
    setCommentText("");
  };
  const addDependency = () => {
    if (!dependencyText.trim())
      return;
    setTaskState((prev) => ({
      ...prev,
      dependencies: [...prev.dependencies, dependencyText.trim()]
    }));
    logActivity("Dependency linked", { task: dependencyText.trim() });
    setDependencyText("");
  };
  const addLabel = () => {
    if (!labelText.trim())
      return;
    const nextLabel = labelText.trim();
    if (taskState.labels.includes(nextLabel)) {
      setLabelText("");
      return;
    }
    setTaskState((prev) => ({
      ...prev,
      labels: [...prev.labels, nextLabel]
    }));
    logActivity("Label added", { label: nextLabel });
    setLabelText("");
  };
  const removeLabel = (label) => {
    setTaskState((prev) => ({
      ...prev,
      labels: prev.labels.filter((item) => item !== label)
    }));
    logActivity("Label removed", { label });
  };
  const uploadAttachment = async (file) => {
    const entry = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
      size: file.size,
      contentType: file.type,
      uploadedAt: (/* @__PURE__ */ new Date()).toISOString(),
      url: null,
      s3Key: null,
      fileId: null
    };
    try {
      if (!subtaskId) {
        throw new Error(`${file.name}: add this element inside a subtask to enable uploads`);
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", workspaceId);
      formData.append("nodeId", nodeId);
      formData.append("fileType", "task-attachment");
      if (taskId)
        formData.append("taskId", taskId);
      formData.append("subtaskId", subtaskId);
      const response = await fetch("/api/workspace-files/upload", {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Upload failed");
      }
      const result = await response.json();
      entry.url = result.file?.s3Url || null;
      entry.s3Key = result.file?.s3Key || null;
      entry.fileId = result.file?.fileId || null;
    } catch (err) {
      entry.localOnly = true;
      entry.uploadError = err.message;
      console.error("\u274C Task attachment upload failed:", err);
    }
    return entry;
  };
  const attachmentHref = (file) => {
    if (file.fileId && workspaceId && subtaskId) {
      return `/api/workspace-files/stream/${file.fileId}?workspaceId=${encodeURIComponent(workspaceId)}&subtaskId=${encodeURIComponent(subtaskId)}`;
    }
    return file.url || null;
  };
  const handleAttachment = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length)
      return;
    setAttachmentsUploading(true);
    setAttachmentError("");
    const uploaded = [];
    const failures = [];
    for (const file of files) {
      const entry = await uploadAttachment(file);
      uploaded.push(entry);
      if (entry.uploadError)
        failures.push(entry.uploadError);
    }
    if (uploaded.length) {
      setTaskState((prev) => ({
        ...prev,
        attachments: [...uploaded, ...prev.attachments]
      }));
      logActivity("Files attached", { count: uploaded.length });
    }
    if (failures.length)
      setAttachmentError(failures.join(" \xB7 "));
    setAttachmentsUploading(false);
  };
  const removeAttachment = (attachmentId) => {
    const removed = taskState.attachments.find((file) => file.id === attachmentId);
    setTaskState((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((file) => file.id !== attachmentId)
    }));
    logActivity("Attachment removed", { file: removed?.name });
    if (removed?.fileId && workspaceId && subtaskId) {
      fetch(
        `/api/workspace-files/${removed.fileId}?workspaceId=${encodeURIComponent(workspaceId)}&subtaskId=${encodeURIComponent(subtaskId)}`,
        { method: "DELETE" }
      ).catch((err) => console.error("Failed to delete attachment from storage:", err));
    }
  };
  const plannedCompletion = taskState.checklists.length ? Math.round(
    taskState.checklists.filter((item) => item.completed).length / taskState.checklists.length * 100
  ) : 0;
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "w-[360px] bg-surface border-2 border-line rounded-2xl shadow-lg overflow-hidden",
      onClick: (e) => e.stopPropagation(),
      onKeyDown: (e) => e.stopPropagation()
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center px-4 py-3 bg-black border-b border-info/10" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-2" }, /* @__PURE__ */ React.createElement(CheckSquare, { className: "w-5 h-5 text-info" }), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: taskState.title,
        onChange: (e) => updateField("title", e.target.value),
        onBlur: () => logActivity("Title updated", { title: taskState.title }),
        placeholder: "Task title",
        className: "bg-transparent font-semibold text-white text-base placeholder-white/50 focus:outline-none w-full"
      }
    ))),
    /* @__PURE__ */ React.createElement("div", { className: "px-4 py-3 space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("label", { className: "col-span-2 flex items-center justify-between bg-canvas border border-line rounded-lg px-3 py-2 text-sm text-dim" }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center space-x-2" }, /* @__PURE__ */ React.createElement(CheckCircle, { className: "w-4 h-4 text-info" }), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium text-ink" }, "Status")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-2" }, /* @__PURE__ */ React.createElement(
      "span",
      {
        className: `text-xs font-semibold px-2 py-1 rounded-lg border ${getStatusBadgeClass(taskState.status)}`
      },
      STATUS_OPTIONS.find((item) => item.value === taskState.status)?.label
    ), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: taskState.status,
        onChange: (e) => handleStatusChange(e.target.value),
        className: "appearance-none bg-surface border border-line text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-info"
      },
      STATUS_OPTIONS.map((option) => /* @__PURE__ */ React.createElement("option", { key: option.value, value: option.value }, option.label))
    ))), /* @__PURE__ */ React.createElement("label", { className: "flex items-center space-x-2 text-sm text-dim bg-canvas border border-line rounded-lg px-3 py-2" }, /* @__PURE__ */ React.createElement(User, { className: "w-4 h-4 text-info flex-shrink-0" }), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: assigneeSelectValue,
        onChange: (e) => handleAssignedToChange(e.target.value),
        className: "bg-transparent focus:outline-none text-sm text-ink w-full truncate"
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Unassigned"),
      collaborators.map((collab) => {
        const key = collaboratorKey(collab);
        const roleLabel = collab.role || collab.userType || (collab.isClient ? "client" : null);
        return /* @__PURE__ */ React.createElement("option", { key, value: key }, collab.name || collab.email || "Unknown", roleLabel ? ` (${String(roleLabel).toUpperCase()})` : "");
      }),
      taskState.assignedTo && !matchedAssignee && !taskState.assignedToKey && /* @__PURE__ */ React.createElement("option", { value: taskState.assignedTo }, taskState.assignedTo)
    )), /* @__PURE__ */ React.createElement("label", { className: "flex items-center space-x-2 text-sm text-dim bg-canvas border border-line rounded-lg px-3 py-2" }, /* @__PURE__ */ React.createElement(Flag, { className: "w-4 h-4 text-warning" }), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: taskState.priority,
        onChange: (e) => handlePriorityChange(e.target.value),
        className: `bg-transparent focus:outline-none text-sm ${getPriorityBadgeClass(
          taskState.priority
        )} rounded-lg px-1 py-0.5 border-0`
      },
      PRIORITY_OPTIONS.map((option) => /* @__PURE__ */ React.createElement("option", { key: option.value, value: option.value }, option.label))
    )), /* @__PURE__ */ React.createElement("label", { className: "flex items-center space-x-2 text-sm text-dim bg-canvas border border-line rounded-lg px-3 py-2 col-span-2" }, /* @__PURE__ */ React.createElement(Calendar, { className: "w-4 h-4 text-ink" }), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "date",
        value: taskState.dueDate,
        onChange: (e) => handleDueDateChange(e.target.value),
        className: "bg-transparent focus:outline-none text-sm text-ink"
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-dim uppercase tracking-wide" }, "Description"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: taskState.description,
        onChange: (e) => updateField("description", e.target.value),
        onBlur: () => logActivity("Description updated"),
        placeholder: "Describe the task, context, goals, or blockers...",
        className: "w-full min-h-[72px] border border-line rounded-lg p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-info/10"
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold text-ink" }, "Checklist"), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-dim" }, plannedCompletion, "% complete")), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, taskState.checklists.map((item) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: item.id,
        className: "flex items-center justify-between bg-canvas border border-line rounded-lg px-3 py-2"
      },
      /* @__PURE__ */ React.createElement("label", { className: "flex items-center space-x-2 text-sm text-ink" }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: item.completed,
          onChange: () => toggleChecklist(item.id),
          className: "rounded border-line text-info focus:ring-info"
        }
      ), /* @__PURE__ */ React.createElement("span", { className: item.completed ? "line-through text-dim" : "" }, item.text)),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "text-dim hover:text-danger",
          onClick: () => removeChecklistItem(item.id)
        },
        /* @__PURE__ */ React.createElement(Trash2, { className: "w-4 h-4" })
      )
    )), /* @__PURE__ */ React.createElement("div", { className: "flex space-x-2" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: checklistText,
        onChange: (e) => setChecklistText(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addChecklistItem();
          }
        },
        placeholder: "Add checklist item",
        className: "flex-1 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-info/10"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: addChecklistItem,
        className: "px-3 py-2 bg-info text-white rounded-lg text-sm font-medium hover:bg-info"
      },
      /* @__PURE__ */ React.createElement(Plus, { className: "w-4 h-4" })
    )))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold text-ink" }, "Attachments"), /* @__PURE__ */ React.createElement(
      "label",
      {
        className: `flex items-center space-x-1 text-xs font-medium text-info ${attachmentsUploading || !subtaskId ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`,
        title: !subtaskId ? "Uploads need a subtask canvas \u2014 add this element inside a task/subtask" : void 0
      },
      attachmentsUploading ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Loader2, { className: "w-4 h-4 animate-spin" }), /* @__PURE__ */ React.createElement("span", null, "Uploading...")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(UploadCloud, { className: "w-4 h-4" }), /* @__PURE__ */ React.createElement("span", null, "Upload")),
      /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "file",
          multiple: true,
          onChange: handleAttachment,
          disabled: attachmentsUploading || !subtaskId,
          className: "hidden"
        }
      )
    )), attachmentError && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2" }, attachmentError), !subtaskId && /* @__PURE__ */ React.createElement("p", { className: "text-[11px] text-warning" }, "Uploads are enabled when this element sits inside a task/subtask canvas."), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, taskState.attachments.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim bg-canvas rounded-lg px-3 py-2" }, "No files attached yet"), taskState.attachments.map((file) => {
      const href = attachmentHref(file);
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: file.id,
          className: "flex items-center justify-between bg-surface border border-line rounded-lg px-3 py-2 text-sm text-dim"
        },
        /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-2 min-w-0" }, /* @__PURE__ */ React.createElement(Paperclip, { className: "w-4 h-4 text-dim flex-shrink-0" }), href ? /* @__PURE__ */ React.createElement(
          "a",
          {
            href,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "truncate max-w-[160px] text-ink hover:underline",
            title: file.name
          },
          file.name
        ) : /* @__PURE__ */ React.createElement("span", { className: "truncate max-w-[160px]", title: file.name }, file.name), typeof file.size === "number" && file.size > 0 && /* @__PURE__ */ React.createElement("span", { className: "text-xs text-dim flex-shrink-0" }, (file.size / 1024).toFixed(1), " KB"), file.localOnly && /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-medium text-warning flex-shrink-0" }, "not synced")),
        /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-1 flex-shrink-0" }, href && /* @__PURE__ */ React.createElement(
          "a",
          {
            href,
            download: file.name,
            className: "text-dim hover:text-ink",
            title: "Download"
          },
          /* @__PURE__ */ React.createElement(Download, { className: "w-4 h-4" })
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "text-dim hover:text-danger",
            onClick: () => removeAttachment(file.id)
          },
          /* @__PURE__ */ React.createElement(Trash2, { className: "w-4 h-4" })
        ))
      );
    }))), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold text-ink" }, "Comments"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        value: commentText,
        onChange: (e) => setCommentText(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Enter" && e.metaKey) {
            addComment();
          }
        },
        placeholder: "Add a comment (\u2318 + Enter to submit)",
        className: "w-full min-h-[64px] border border-line rounded-lg p-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-info/10"
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: addComment,
        className: "inline-flex items-center space-x-2 px-4 py-2 bg-cta text-cta-foreground rounded-lg text-sm hover:bg-cta"
      },
      /* @__PURE__ */ React.createElement(MessageCircle, { className: "w-4 h-4" }),
      /* @__PURE__ */ React.createElement("span", null, "Comment")
    )), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 max-h-36 overflow-y-auto" }, taskState.comments.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim" }, "No comments yet"), taskState.comments.map((comment) => /* @__PURE__ */ React.createElement("div", { key: comment.id, className: "bg-canvas border border-line rounded-lg px-3 py-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify_between text-xs text-dim" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium text-ink" }, comment.author), /* @__PURE__ */ React.createElement("span", null, comment.timestamp)), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-ink mt-1" }, comment.text))))), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between text-sm font-semibold text-ink" }, /* @__PURE__ */ React.createElement("span", null, "Dependencies")), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, taskState.dependencies.map((dependency) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: dependency,
        className: "flex items-center justify_between bg-surface border border-line rounded-lg px-3 py-2 text-sm text-dim"
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-2" }, /* @__PURE__ */ React.createElement(Activity, { className: "w-4 h-4 text-info" }), /* @__PURE__ */ React.createElement("span", null, dependency)),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "text-dim hover:text-danger",
          onClick: () => {
            setTaskState((prev) => ({
              ...prev,
              dependencies: prev.dependencies.filter((item) => item !== dependency)
            }));
            logActivity("Dependency removed", { task: dependency });
          }
        },
        /* @__PURE__ */ React.createElement(Trash2, { className: "w-4 h-4" })
      )
    )), /* @__PURE__ */ React.createElement("div", { className: "flex space-x-2" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: dependencyText,
        onChange: (e) => setDependencyText(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addDependency();
          }
        },
        placeholder: "Link tasks or milestones",
        className: "flex-1 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-info/10"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: addDependency,
        className: "px-3 py-2 bg-info text-white rounded-lg text-sm font-medium hover:bg-info"
      },
      /* @__PURE__ */ React.createElement(Plus, { className: "w-4 h-4" })
    )))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold text-ink" }, "Labels / Tags"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, taskState.labels.map((label) => /* @__PURE__ */ React.createElement(
      "span",
      {
        key: label,
        className: "inline-flex items-center space-x-1 bg-surface-hover text-ink border border-line rounded-full px-3 py-1 text-xs font-medium"
      },
      /* @__PURE__ */ React.createElement(Tag, { className: "w-3 h-3" }),
      /* @__PURE__ */ React.createElement("span", null, label),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          className: "text-ink hover:text-ink",
          onClick: () => removeLabel(label)
        },
        "\xD7"
      )
    )), taskState.labels.length === 0 && /* @__PURE__ */ React.createElement("span", { className: "text-xs text-dim" }, "No labels yet")), /* @__PURE__ */ React.createElement("div", { className: "flex space-x-2" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: labelText,
        onChange: (e) => setLabelText(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addLabel();
          }
        },
        placeholder: "Add label or tag",
        className: "flex-1 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-info/10"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: addLabel,
        className: "px-3 py-2 bg-cta text-cta-foreground rounded-lg text-sm font-medium hover:bg-cta"
      },
      "Add"
    ))), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold text-ink" }, "Activity Log"), /* @__PURE__ */ React.createElement("div", { className: "max-h-36 overflow-y-auto space-y-2" }, taskState.activityLog.map((entry) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: entry.id,
        className: "bg-canvas border border-line rounded-lg px-3 py-2 text-xs text-dim"
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium text-ink" }, entry.action), /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-dim" }, entry.timestamp)),
      entry.meta && Object.keys(entry.meta).length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-1 space-y-0.5" }, Object.entries(entry.meta).map(([key, value]) => /* @__PURE__ */ React.createElement("div", { key, className: "flex items-center text-[11px] text-dim" }, /* @__PURE__ */ React.createElement("span", { className: "uppercase tracking-wide mr-1" }, key, ":"), /* @__PURE__ */ React.createElement("span", null, String(value)))))
    )))))
  );
};
export default TaskCardRenderer;
