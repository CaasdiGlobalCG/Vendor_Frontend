import React, { useState, useCallback, useEffect, useContext, useRef, useImperativeHandle, forwardRef } from "react";
import { Plus, Save, Eye, X, Users, Grid, Maximize2, Minimize2, Check, Gauge, Download, FileText, AlignHorizontalDistributeCenter, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { toJpeg } from "html-to-image";
import { VendorContext } from "../../../context/VendorContext";
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  MiniMap,
  Panel,
  MarkerType,
  ConnectionMode
} from "reactflow";
import "reactflow/dist/style.css";
import ElementNode from "./nodes/ElementNode";
import LayoutNode from "./nodes/LayoutNode";
import TextNode from "./nodes/TextNode";
import TurnkeyNode from "./nodes/TurnkeyNode";
import CustomEdge from "./edges/CustomEdge";
import TableConfigModal from "./modals/TableConfigModal";
import ChartConfigModal from "./modals/ChartConfigModal";
import TurnkeyConfigModal from "./modals/TurnkeyConfigModal";
import ListConfigModal from "./modals/ListConfigModal";
import LayoutConfigModal from "./modals/LayoutConfigModal";
import GroupingModal from "./modals/GroupingModal";
import GroupingToolbar from "./GroupingToolbar";
import ContextMenu from "./ContextMenu";
import HelperLines from "./HelperLines";
import { exportCanvasAsPng, exportCanvasAsPdf } from "../utils/canvasExport";
import TaskCardConfigModal from "./modals/TaskCardConfigModal";
import ProcurementRFQDetailsModal from "./modals/ProcurementRFQDetailsModal";
import ExecutionRequestDetailsModal from "./modals/ExecutionRequestDetailsModal";
import { getFlowchartTemplate } from "../utils/flowchartTemplates";
import { getWorkspaceById, notifyWorkspaceEvent } from "../utils/workspaceApi";
import { registerCanvasEmitter, unregisterCanvasEmitter, persistNodeDataPatch, markTextNodeForFocus } from "../utils/nodePersistence";
import config from "../../../config/env";
import RemoteCursor from "./RemoteCursor";
import { useToast } from "./ToastProvider";
import {
  nodeChangesToOps,
  edgeChangesToOps,
  createNodeAddOp,
  createEdgeAddOp,
  createNodeUpdateOp,
  createNodeMoveOp,
  createZoomChangeOp,
  OperationBatcher,
  applyRemoteOperation
} from "../utils/operationManager";
const controlsCSS = `
  .react-flow__controls {
    z-index: 1000 !important;
  }
  .react-flow__controls-button {
    pointer-events: auto !important;
    cursor: pointer !important;
  }
  .react-flow__controls-button:hover {
    background-color: #f3f4f6 !important;
  }
  
  @keyframes pulse {
    0%, 100% {
      opacity: 0.8;
    }
    50% {
      opacity: 0.3;
    }
  }
`;
import SmartNoteNode from "./nodes/SmartNoteNode";
import CalendarNode from "./nodes/CalendarNode";
import ApprovalBoardNode from "./nodes/ApprovalBoardNode";
import AIHelperNode from "./nodes/AIHelperNode";
import CreditNoteNode from "./nodes/CreditNoteNode";
import InvoiceNode from "./nodes/InvoiceNode";
import QuotationNode from "./nodes/QuotationNode";
import PurchaseOrderNode from "./nodes/PurchaseOrderNode";
import InfoCardNode from "./nodes/InfoCardNode";
import FormCardNode from "./nodes/FormCardNode";
const nodeTypes = {
  elementNode: ElementNode,
  layoutNode: LayoutNode,
  textNode: TextNode,
  turnkeyNode: TurnkeyNode,
  smartNote: SmartNoteNode,
  calendarNode: CalendarNode,
  approvalBoard: ApprovalBoardNode,
  aiHelper: AIHelperNode,
  creditNote: CreditNoteNode,
  invoice: InvoiceNode,
  quotation: QuotationNode,
  purchaseOrder: PurchaseOrderNode,
  infoCard: InfoCardNode,
  formCard: FormCardNode
};
const edgeTypes = {
  custom: CustomEdge
};
const MIN_ZOOM_PERCENT = 10;
const MAX_ZOOM_PERCENT = 200;
const CanvasWorkspace = forwardRef(({
  selectedTask,
  selectedSubtask,
  sidebarCollapsed,
  onToggleSidebars,
  workspace,
  onSaveWorkspace,
  onRefreshWorkspace,
  onActivityCreated,
  userRole,
  userPermissions,
  onZoomChange,
  canvasWebSocket,
  workspaceCollaborators,
  highlightDay
  // YYYY-MM-DD — elements added this day get a highlight ring
}, ref) => {
  const { currentUser } = useContext(VendorContext);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [headerOffset, setHeaderOffset] = useState(0);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [deletionRequestTarget, setDeletionRequestTarget] = useState(null);
  const [deletionRequestReason, setDeletionRequestReason] = useState("");
  const [isSubmittingDeletionRequest, setIsSubmittingDeletionRequest] = useState(false);
  const [isPenMode, setIsPenMode] = useState(false);
  const [penColor, setPenColor] = useState("#ef4444");
  const [penThickness, setPenThickness] = useState(3);
  const [drawingPaths, setDrawingPaths] = useState([]);
  const previousOverflowRef = useRef("");
  const canvasOverlayRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const isPointerDrawingRef = useRef(false);
  const activePathIdRef = useRef(null);
  const updateOffset = useCallback(() => {
    const headerElements = Array.from(
      document.querySelectorAll("[data-role-header], [data-workspace-header], [data-workspace-navigation]")
    );
    const visibleBottom = headerElements.reduce((maxBottom, el) => {
      const style = window.getComputedStyle(el);
      if (style.display === "none")
        return maxBottom;
      const rect = el.getBoundingClientRect();
      return Math.max(maxBottom, rect.bottom);
    }, 0);
    setHeaderOffset(visibleBottom);
  }, []);
  const autoPlacementIndexRef = useRef(0);
  const getAutoPlacementPosition = useCallback((basePosition) => {
    const offsets = [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 0, y: 40 },
      { x: 40, y: 40 },
      { x: 80, y: 0 },
      { x: 0, y: 80 }
    ];
    const index = autoPlacementIndexRef.current % offsets.length;
    autoPlacementIndexRef.current += 1;
    const offset = offsets[index];
    return {
      x: basePosition.x + offset.x,
      y: basePosition.y + offset.y
    };
  }, []);
  const safeClone = useCallback((value) => {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.warn("\u26A0\uFE0F Failed to deep clone node payload, using shallow copy fallback", error);
      return value;
    }
  }, []);
  const createDuplicatedNodeFromSource = useCallback((sourceNode, options = {}) => {
    const {
      offsetX = 50,
      offsetY = 50,
      copiedFromSubtaskId = null,
      copiedFromSubtaskName = null
    } = options;
    const timestamp = Date.now();
    const newId2 = `${sourceNode?.data?.type || "element"}_${timestamp}_${Math.random().toString(36).slice(2, 9)}`;
    const clonedData = safeClone(sourceNode.data || {});
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const duplicatedNode = {
      ...sourceNode,
      id: newId2,
      selected: false,
      position: {
        x: (sourceNode.position?.x || 0) + offsetX,
        y: (sourceNode.position?.y || 0) + offsetY
      },
      data: {
        ...clonedData,
        ...clonedData.id && { id: newId2 },
        ...clonedData.flowchartGroup && {
          flowchartGroup: `${clonedData.flowchartGroup}_duplicate_${timestamp}`
        },
        duplicateSourceNodeId: sourceNode.id,
        duplicateSourceSubtaskId: copiedFromSubtaskId || selectedSubtask?.id || null,
        duplicateSourceSubtaskName: copiedFromSubtaskName || selectedSubtask?.name || null,
        duplicatedAt: nowIso,
        lastUpdatedAt: nowIso,
        lastUpdatedBy: currentUser?.name || currentUser?.email || "Unknown User"
      }
    };
    return duplicatedNode;
  }, [safeClone, selectedSubtask?.id, selectedSubtask?.name, currentUser?.name, currentUser?.email]);
  const isWorkspaceCompleted = workspace?.status === "completed" || workspace?.status === "project completed";
  const isCurrentTaskUnlocked = React.useMemo(() => {
    if (!isWorkspaceCompleted || !selectedTask || !selectedSubtask)
      return false;
    const unlockedTasks = workspace?.unlockedTasks || [];
    console.log("\u{1F513} CanvasWorkspace - Unlock Check:", {
      isWorkspaceCompleted,
      selectedTaskId: selectedTask?.id,
      selectedSubtaskId: selectedSubtask?.id,
      unlockedTasks,
      userRole,
      canEditPerm: userPermissions?.canEdit
    });
    return unlockedTasks.some(
      (ut) => ut.taskId === selectedTask.id && ut.subtaskId === selectedSubtask.id
    );
  }, [isWorkspaceCompleted, selectedTask, selectedSubtask, workspace?.unlockedTasks]);
  const canEdit = userRole === "pm" ? true : isCurrentTaskUnlocked || !isWorkspaceCompleted && userPermissions?.canEdit;
  const toast = useToast();
  const lastViewOnlyToastAtRef = useRef(0);
  const notifyViewOnly = useCallback((action) => {
    console.log(`\u{1F512} Canvas is view-only - ignoring ${action}`);
    const now = Date.now();
    if (now - lastViewOnlyToastAtRef.current < 3e3)
      return;
    lastViewOnlyToastAtRef.current = now;
    toast.info("Canvas is view-only \u2014 you don't have permission to make changes", 2500);
  }, [toast]);
  const getCurrentUserRole = useCallback(() => {
    const urlUserRole = new URLSearchParams(window.location.search).get("userRole");
    if (urlUserRole && ["vendor", "pm", "client"].includes(urlUserRole)) {
      return urlUserRole;
    }
    return userRole || currentUser?.role || "vendor";
  }, [userRole, currentUser?.role]);
  const filterDirectlyDeletableNodes = useCallback((nodesToDelete) => {
    const role = getCurrentUserRole();
    if (role === "pm")
      return nodesToDelete;
    const deletable = [];
    let requestedCount = 0;
    let pendingCount = 0;
    let blockedCount = 0;
    nodesToDelete.forEach((node) => {
      if (node.data?.deletionRequested) {
        pendingCount += 1;
        return;
      }
      if (role === "vendor") {
        requestedCount += 1;
        window.dispatchEvent(new CustomEvent("request-element-deletion", {
          detail: { nodeId: node.id }
        }));
      } else if (node.type === "elementNode") {
        blockedCount += 1;
      } else {
        deletable.push(node);
      }
    });
    if (requestedCount > 0) {
      toast.info("Deleting an element requires PM approval \u2014 please submit the request form", 2500);
    } else if (pendingCount > 0) {
      toast.info("Deletion already requested \u2014 awaiting PM approval", 2500);
    } else if (blockedCount > 0) {
      toast.info("Only a PM can delete elements", 2500);
    }
    return deletable;
  }, [getCurrentUserRole, toast]);
  const trackActivity = async (action, actionType, targetType, elementData = {}) => {
    if (!workspace?.workspaceId || !currentUser)
      return;
    try {
      const activityData = {
        workspaceId: workspace.workspaceId,
        taskId: selectedSubtask ? workspace.tasks?.find(
          (task) => task.subtasks?.some((subtask) => subtask.id === selectedSubtask.id)
        )?.id : null,
        subtaskId: selectedSubtask?.id || null,
        userId: currentUser.id || "unknown",
        userEmail: currentUser.email || "unknown@example.com",
        userName: currentUser.name || "Unknown User",
        action,
        actionType,
        targetType,
        targetId: elementData.elementId || null,
        elementType: elementData.elementType || null,
        oldValue: elementData.oldValue || null,
        newValue: elementData.newValue || null,
        position: elementData.position || null,
        details: elementData.details || {}
      };
      console.log("\u{1F504} CanvasWorkspace: Tracking activity", activityData);
      const response = await fetch(`/api/activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(activityData)
      });
      if (response.ok) {
        console.log("\u2705 CanvasWorkspace: Activity tracked successfully");
        if (onActivityCreated) {
          onActivityCreated();
        }
      } else {
        console.error("\u274C CanvasWorkspace: Failed to track activity");
      }
    } catch (error) {
      console.error("\u274C CanvasWorkspace: Error tracking activity:", error);
    }
  };
  const recordDeletionHistory = async (elementId, elementData, deletionContext = {}) => {
    if (!workspace?.workspaceId || !currentUser || !elementId) {
      console.log("\u26A0\uFE0F Cannot record deletion history - missing required data");
      return;
    }
    try {
      const deletionPayload = {
        workspaceId: workspace.workspaceId,
        taskId: selectedTask?.id || null,
        subtaskId: selectedSubtask?.id || null,
        elementId,
        elementType: elementData?.type || "unknown",
        elementName: elementData?.name || "Unnamed Element",
        elementData: {
          ...elementData,
          // Include all relevant metadata
          addedBy: elementData?.addedBy || null,
          addedByEmail: elementData?.addedByEmail || null,
          addedAt: elementData?.addedAt || null,
          lastUpdatedAt: elementData?.lastUpdatedAt || null,
          lastUpdatedBy: elementData?.lastUpdatedBy || null,
          approvalStatus: elementData?.approvalStatus || null,
          approvedBy: elementData?.approvedBy || null
        },
        deletedBy: currentUser.name || currentUser.email || "Unknown User",
        deletedByEmail: currentUser.email || null,
        deletedByRole: currentUser.role || "vendor",
        position: elementData?.position || deletionContext.position || null,
        details: {
          canvasAction: deletionContext.canvasAction !== false,
          deletedVia: deletionContext.deletedVia || "canvas",
          relatedEdges: deletionContext.relatedEdges || []
        }
      };
      console.log("\u{1F4DD} Recording deletion history:", {
        elementId,
        subtaskId: deletionPayload.subtaskId,
        taskId: deletionPayload.taskId,
        elementType: deletionPayload.elementType,
        elementName: deletionPayload.elementName,
        workspaceId: workspace.workspaceId
      });
      const response = await fetch("/api/element-deletion-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(deletionPayload)
      });
      if (response.ok) {
        const result = await response.json();
        console.log("\u2705 Deletion history recorded successfully:", result.deletion?.deletionId);
        return result.deletion;
      } else {
        const errorText = await response.text();
        console.error("\u274C Failed to record deletion history:", errorText);
      }
    } catch (error) {
      console.error("\u274C Error recording deletion history:", error);
    }
  };
  const getCanvasData = () => {
    if (selectedSubtask?.canvasData) {
      return {
        nodes: selectedSubtask.canvasData.nodes || [],
        edges: selectedSubtask.canvasData.edges || [],
        zoomLevel: selectedSubtask.canvasData.zoomLevel || 100
      };
    }
    return {
      nodes: workspace?.nodes || [],
      edges: workspace?.edges || [],
      zoomLevel: workspace?.zoomLevel || 100
    };
  };
  const cleanupOrphanedNodesHelper = (nodesToClean) => {
    if (!nodesToClean || !Array.isArray(nodesToClean) || nodesToClean.length === 0)
      return [];
    try {
      const nodeIds = new Set(nodesToClean.map((n) => n?.id).filter(Boolean));
      const parentNodes = [];
      const childNodes = [];
      const regularNodes = [];
      nodesToClean.forEach((node) => {
        if (!node || !node.id)
          return;
        if (node.data?.isGroupContainer) {
          parentNodes.push(node);
        } else if (node.parentNode) {
          if (nodeIds.has(node.parentNode)) {
            childNodes.push(node);
          } else {
            console.log("\u{1F9F9} Cleaning orphaned node:", node.id, "- parent not found:", node.parentNode);
            regularNodes.push({
              ...node,
              parentNode: void 0,
              extent: void 0,
              data: {
                ...node.data,
                isGroupChild: false,
                parentGroupId: void 0
              }
            });
          }
        } else {
          regularNodes.push(node);
        }
      });
      return [...parentNodes, ...childNodes, ...regularNodes];
    } catch (err) {
      console.error("\u274C Error cleaning up orphaned nodes:", err);
      return nodesToClean;
    }
  };
  const canvasData = getCanvasData();
  const initialNodes = cleanupOrphanedNodesHelper(canvasData.nodes);
  const [nodes, setNodesRaw, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdgesRaw, onEdgesChange] = useEdgesState(canvasData.edges);
  const historyRef = useRef({
    past: [],
    future: [],
    maxHistorySize: 50
    // Limit history to prevent memory issues
  });
  const createSnapshot = useCallback(() => {
    return {
      nodes,
      edges,
      timestamp: Date.now()
    };
  }, [nodes, edges]);
  const pushToHistory = useCallback(() => {
    historyRef.current.past.push(createSnapshot());
    if (historyRef.current.past.length > historyRef.current.maxHistorySize) {
      historyRef.current.past.shift();
    }
    historyRef.current.future = [];
  }, [createSnapshot]);
  const handleUndo = useCallback(() => {
    if (historyRef.current.past.length === 0) {
      console.log("\u23EE\uFE0F Nothing to undo");
      return;
    }
    historyRef.current.future.push(createSnapshot());
    const previousSnapshot = historyRef.current.past.pop();
    if (previousSnapshot) {
      console.log("\u23EE\uFE0F Undo:", previousSnapshot);
      setNodesRaw(previousSnapshot.nodes);
      setEdgesRaw(previousSnapshot.edges);
    }
  }, [createSnapshot, setNodesRaw, setEdgesRaw]);
  const handleRedo = useCallback(() => {
    if (historyRef.current.future.length === 0) {
      console.log("\u23ED\uFE0F Nothing to redo");
      return;
    }
    historyRef.current.past.push(createSnapshot());
    const nextSnapshot = historyRef.current.future.pop();
    if (nextSnapshot) {
      console.log("\u23ED\uFE0F Redo:", nextSnapshot);
      setNodesRaw(nextSnapshot.nodes);
      setEdgesRaw(nextSnapshot.edges);
    }
  }, [createSnapshot, setNodesRaw, setEdgesRaw]);
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!canEdit)
        return;
      const isInputElement = event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.contentEditable === "true";
      if (isInputElement) {
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      } else if ((event.ctrlKey || event.metaKey) && event.key === "y" || (event.ctrlKey || event.metaKey) && event.shiftKey && event.key === "z") {
        event.preventDefault();
        handleRedo();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, canEdit, notifyViewOnly]);
  const emitOpRef = useRef(null);
  const taskIdRef = useRef(null);
  const subtaskIdRef = useRef(null);
  const setNodes = useCallback((updateFn) => {
    try {
      if (typeof updateFn === "function") {
        setNodesRaw((currentNodes) => {
          const updatedNodes = updateFn(currentNodes);
          const validatedNodes = cleanupOrphanedNodesHelper(updatedNodes);
          if (!isApplyingRemoteRef.current && Array.isArray(validatedNodes)) {
            const prevIds = new Set(currentNodes.map((n) => n.id));
            const newNodes = validatedNodes.filter((n) => !prevIds.has(n.id));
            for (const node of newNodes) {
              emitOpRef.current?.(createNodeAddOp(node, taskIdRef.current, subtaskIdRef.current));
            }
          }
          return validatedNodes;
        });
      } else {
        setNodesRaw((currentNodes) => {
          const validatedNodes = cleanupOrphanedNodesHelper(updateFn);
          if (!isApplyingRemoteRef.current && Array.isArray(validatedNodes)) {
            const prevIds = new Set(currentNodes.map((n) => n.id));
            const newNodes = validatedNodes.filter((n) => !prevIds.has(n.id));
            for (const node of newNodes) {
              emitOpRef.current?.(createNodeAddOp(node, taskIdRef.current, subtaskIdRef.current));
            }
          }
          return validatedNodes;
        });
      }
    } catch (err) {
      console.error("\u274C Error in setNodes wrapper:", err);
    }
  }, []);
  const setEdges = useCallback((updateFn) => {
    try {
      setEdgesRaw((currentEdges) => {
        const next = typeof updateFn === "function" ? updateFn(currentEdges) : updateFn;
        if (!isApplyingRemoteRef.current && Array.isArray(next)) {
          const prevIds = new Set(currentEdges.map((e) => e.id));
          const newEdges = next.filter((e) => e.id && !prevIds.has(e.id));
          for (const edge of newEdges) {
            emitOpRef.current?.(createEdgeAddOp(edge, taskIdRef.current, subtaskIdRef.current));
          }
        }
        return next;
      });
    } catch (err) {
      console.error("\u274C Error in setEdges wrapper:", err);
    }
  }, []);
  useEffect(() => {
    const event = new CustomEvent("canvasNodesChanged", {
      detail: { nodes }
    });
    document.dispatchEvent(event);
  }, [nodes]);
  const elementSequenceRef = useRef(() => {
    const existingNodes = canvasData.nodes || [];
    const maxSequence = existingNodes.reduce((max, node) => {
      const seq = node.data?.sequenceNumber || 0;
      return Math.max(max, seq);
    }, 0);
    return maxSequence;
  });
  if (typeof elementSequenceRef.current === "function") {
    elementSequenceRef.current = elementSequenceRef.current();
  }
  const lastAddedNodeIdRef = useRef(null);
  const workspaceCollaboratorsRef = useRef(workspaceCollaborators || []);
  const [canvasLoadedCounter, setCanvasLoadedCounter] = useState(0);
  const isUpdatingNodesLocallyRef = useRef(false);
  const skipNextSyncRef = useRef(false);
  const lastSyncedSubtaskIdRef = useRef(selectedSubtask?.id || null);
  const clearCanvas = () => {
    if (nodes.length || edges.length)
      pushToHistory();
    isUpdatingNodesLocallyRef.current = true;
    nodes.forEach((n) => emitOpRef.current?.({
      type: "NODE_DELETE",
      nodeId: n.id,
      taskId: taskIdRef.current,
      subtaskId: subtaskIdRef.current
    }));
    edges.forEach((e) => emitOpRef.current?.({
      type: "EDGE_DELETE",
      edgeId: e.id,
      taskId: taskIdRef.current,
      subtaskId: subtaskIdRef.current
    }));
    setNodes([]);
    setEdges([]);
    if (selectedSubtask?.canvasData) {
      selectedSubtask.canvasData.nodes = [];
      selectedSubtask.canvasData.edges = [];
    }
    elementSequenceRef.current = 0;
    lastAddedNodeIdRef.current = null;
    setTimeout(() => {
      isUpdatingNodesLocallyRef.current = false;
    }, 0);
    console.log("\u{1F9F9} Canvas cleared - all elements removed");
  };
  const purgeDeletedFromCanvasCache = useCallback((deletedNodeIds = [], deletedEdgeIds = []) => {
    isUpdatingNodesLocallyRef.current = true;
    const nodeIds = new Set(deletedNodeIds);
    const edgeIds = new Set(deletedEdgeIds);
    const cache = selectedSubtask?.canvasData || workspace;
    if (cache) {
      if (nodeIds.size > 0) {
        cache.nodes = (cache.nodes || []).filter((n) => !nodeIds.has(n.id));
      }
      if (nodeIds.size > 0 || edgeIds.size > 0) {
        cache.edges = (cache.edges || []).filter(
          (e) => !edgeIds.has(e.id) && !nodeIds.has(e.source) && !nodeIds.has(e.target)
        );
      }
    }
    setTimeout(() => {
      isUpdatingNodesLocallyRef.current = false;
    }, 0);
  }, [selectedSubtask, workspace]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [zoomLevel, setZoomLevelState] = useState(Number(canvasData.zoomLevel) || 100);
  const updateZoomLevel = useCallback((value) => {
    const numericValue = Number(value);
    const normalizedZoom = Number.isFinite(numericValue) ? Math.min(Math.max(Math.round(numericValue), MIN_ZOOM_PERCENT), MAX_ZOOM_PERCENT) : 100;
    setZoomLevelState(normalizedZoom);
    onZoomChange?.(normalizedZoom);
  }, [onZoomChange]);
  const handleSetZoomLevel = useCallback((value) => {
    if (!reactFlowInstance)
      return;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue))
      return;
    const clampedZoom = Math.min(Math.max(Math.round(numericValue), MIN_ZOOM_PERCENT), MAX_ZOOM_PERCENT);
    reactFlowInstance.zoomTo(clampedZoom / 100);
    updateZoomLevel(clampedZoom);
  }, [reactFlowInstance, updateZoomLevel]);
  const captureWorkspaceSnapshot = useCallback(async () => {
    const container = canvasContainerRef.current;
    if (!container)
      return null;
    const viewport = container.querySelector(".react-flow__viewport");
    const target = viewport || container;
    const hasVisibleNodes = Array.isArray(nodes) && nodes.length > 0;
    const previousViewport = reactFlowInstance?.getViewport?.();
    const waitForPaint = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
    try {
      if (hasVisibleNodes && reactFlowInstance?.fitView) {
        await reactFlowInstance.fitView({
          padding: 0.18,
          includeHiddenNodes: true,
          duration: 0
        });
        await waitForPaint();
        await waitForPaint();
      }
      return await toJpeg(target, {
        quality: 0.55,
        pixelRatio: 1,
        backgroundColor: "#fbfcfe",
        canvasWidth: 640,
        canvasHeight: 360,
        cacheBust: true,
        filter: (node) => {
          const className = typeof node.className === "string" ? node.className : "";
          if (className.includes("react-flow__controls"))
            return false;
          if (className.includes("react-flow__minimap"))
            return false;
          if (className.includes("react-flow__panel"))
            return false;
          return true;
        }
      });
    } catch (error) {
      console.warn("Could not capture workspace snapshot", error);
      return null;
    } finally {
      if (previousViewport && reactFlowInstance?.setViewport) {
        try {
          await reactFlowInstance.setViewport(previousViewport, { duration: 0 });
          await waitForPaint();
        } catch (restoreError) {
          console.warn("Could not restore viewport after snapshot capture", restoreError);
        }
      }
    }
  }, [nodes, reactFlowInstance]);
  const [showTableModal, setShowTableModal] = useState(false);
  const [pendingTableElement, setPendingTableElement] = useState(null);
  const [pendingPosition, setPendingPosition] = useState(null);
  const [showChartModal, setShowChartModal] = useState(false);
  const [pendingChartElement, setPendingChartElement] = useState(null);
  const [showTurnkeyModal, setShowTurnkeyModal] = useState(false);
  const [pendingTurnkeyElement, setPendingTurnkeyElement] = useState(null);
  const [showListModal, setShowListModal] = useState(false);
  const [pendingListElement, setPendingListElement] = useState(null);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [pendingLayoutElement, setPendingLayoutElement] = useState(null);
  const [showTaskCardModal, setShowTaskCardModal] = useState(false);
  const [pendingTaskCardElement, setPendingTaskCardElement] = useState(null);
  const [pendingTaskCardInitialData, setPendingTaskCardInitialData] = useState(null);
  const [showProcurementRFQDetailsModal, setShowProcurementRFQDetailsModal] = useState(false);
  const [selectedProcurementRFQNode, setSelectedProcurementRFQNode] = useState(null);
  const [showExecutionRequestDetailsModal, setShowExecutionRequestDetailsModal] = useState(false);
  const [selectedExecutionRequestNode, setSelectedExecutionRequestNode] = useState(null);
  const [edgeLabelModal, setEdgeLabelModal] = useState({
    isOpen: false,
    edgeId: null,
    initialLabel: "",
    edgeStyle: "default",
    // default, dashed, dotted, animated
    edgeColor: "#3b82f6"
    // blue default
  });
  const [edgeLabelInput, setEdgeLabelInput] = useState("");
  const [edgeStyleInput, setEdgeStyleInput] = useState("default");
  const [edgeColorInput, setEdgeColorInput] = useState("#3b82f6");
  const [selectedFlowchartGroup, setSelectedFlowchartGroup] = useState(null);
  const [showFlowchartToolbar, setShowFlowchartToolbar] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [showGroupingToolbar, setShowGroupingToolbar] = useState(false);
  const [contextMenu, setContextMenu] = useState({
    isVisible: false,
    position: { x: 0, y: 0 },
    selectedNodes: []
  });
  const [showGroupingModal, setShowGroupingModal] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [manuallySelectedNodes, setManuallySelectedNodes] = useState([]);
  const [isTextModeActive, setIsTextModeActive] = useState(false);
  const [textModeConfig, setTextModeConfig] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [lastSaved, setLastSaved] = useState(null);
  const [performanceMode, setPerformanceMode] = useState(() => localStorage.getItem("workspace-canvas-performance") === "on");
  const [duplicateToAllState, setDuplicateToAllState] = useState({
    isVisible: false,
    isLoading: false,
    total: 0,
    processed: 0,
    message: ""
  });
  const closeDuplicateToAllState = useCallback(() => {
    setDuplicateToAllState({
      isVisible: false,
      isLoading: false,
      total: 0,
      processed: 0,
      message: ""
    });
  }, []);
  useEffect(() => {
    localStorage.setItem("workspace-canvas-performance", performanceMode ? "on" : "off");
  }, [performanceMode]);
  const renderedEdges = React.useMemo(() => {
    const withMarkers = edges.map((edge) => ({
      ...edge,
      markerEnd: edge.markerEnd || {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: edge.data?.edgeColor || edge.style?.stroke || "#6b7280"
      }
    }));
    if (!performanceMode)
      return withMarkers;
    return withMarkers.map((edge) => ({
      ...edge,
      animated: false,
      className: edge.className === "auto-connected-edge" ? "" : edge.className
    }));
  }, [edges, performanceMode]);
  const renderedNodes = React.useMemo(() => {
    const INTERACTIVE_NODE_TYPES = /* @__PURE__ */ new Set([
      "quotation",
      "invoice",
      "purchaseOrder",
      "creditNote",
      "smartNote",
      "infoCard",
      "formCard"
    ]);
    return nodes.map((node) => {
      let out = node;
      if (node.type === "elementNode" && getCurrentUserRole() !== "pm") {
        out = { ...out, deletable: false };
      }
      if (INTERACTIVE_NODE_TYPES.has(node.type)) {
        out = {
          ...out,
          data: {
            ...out.data,
            onUpdate: (updated) => setNodes(
              (nds) => nds.map(
                (n) => n.id === node.id ? { ...n, data: { ...n.data, ...updated } } : n
              )
            ),
            onSendForApproval: (updated) => setNodes(
              (nds) => nds.map(
                (n) => n.id === node.id ? {
                  ...n,
                  data: {
                    ...n.data,
                    ...updated,
                    status: "pending",
                    approvalStatus: "pending"
                  }
                } : n
              )
            ),
            onDelete: () => {
              setNodes((nds) => nds.filter((n) => n.id !== node.id));
              setEdges(
                (eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id)
              );
            }
          }
        };
      }
      return out;
    });
  }, [nodes, getCurrentUserRole, setNodes, setEdges]);
  const cleanupOrphanedNodes = useCallback((nodesToClean) => {
    return cleanupOrphanedNodesHelper(nodesToClean);
  }, []);
  const hasRefreshedRef = useRef(false);
  useEffect(() => {
    const refreshWorkspaceData = async () => {
      if (!workspace?.workspaceId || hasRefreshedRef.current)
        return;
      try {
        console.log("\u{1F504} Refreshing workspace data to ensure latest state is persisted...");
        hasRefreshedRef.current = true;
        const freshWorkspace = await getWorkspaceById(workspace.workspaceId);
        if (freshWorkspace && freshWorkspace.nodes) {
          console.log("\u2705 Workspace data refreshed - loading latest nodes with persisted states");
          if (nodes.length === 0 && freshWorkspace.nodes.length > 0) {
            const cleanedNodes = cleanupOrphanedNodes(freshWorkspace.nodes);
            setNodes(cleanedNodes);
            if (freshWorkspace.edges) {
              setEdges(freshWorkspace.edges);
            }
          }
        }
      } catch (err) {
        console.error("Error refreshing workspace data:", err);
      }
    };
    const timeoutId = setTimeout(() => {
      refreshWorkspaceData();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [workspace?.workspaceId]);
  const canvasSyncRequestRef = useRef(0);
  useEffect(() => {
    if (isUpdatingNodesLocallyRef.current) {
      console.log("\u23ED\uFE0F Skipping canvas data update - currently updating nodes locally");
      return;
    }
    const subtaskActuallyChanged = selectedSubtask?.id !== lastSyncedSubtaskIdRef.current;
    if (!subtaskActuallyChanged && skipNextSyncRef.current) {
      console.log("\u23ED\uFE0F Skipping canvas data sync - triggered by auto-save response, not subtask switch");
      skipNextSyncRef.current = false;
      return;
    }
    if (!subtaskActuallyChanged && nodes.length > 0) {
      console.log("\u23ED\uFE0F Skipping canvas data sync - same subtask, local nodes exist:", nodes.length);
      return;
    }
    lastSyncedSubtaskIdRef.current = selectedSubtask?.id;
    if (subtaskActuallyChanged && workspace?.workspaceId) {
      const requestId = ++canvasSyncRequestRef.current;
      batcherRef.current?.flush();
      canvasWebSocket?.emitOperation?.({ type: "FLUSH" });
      const targetSubtaskId = selectedSubtask?.id;
      (async () => {
        let freshCanvasData = null;
        try {
          const freshWorkspace = await getWorkspaceById(workspace.workspaceId);
          if (targetSubtaskId) {
            for (const task of freshWorkspace?.tasks || []) {
              const st = (task.subtasks || []).find((s) => s?.id === targetSubtaskId);
              if (st) {
                freshCanvasData = st.canvasData;
                break;
              }
            }
            if (!freshCanvasData) {
              freshCanvasData = { nodes: [], edges: [], zoomLevel: 100 };
            }
          } else {
            freshCanvasData = {
              nodes: freshWorkspace?.nodes || [],
              edges: freshWorkspace?.edges || [],
              zoomLevel: freshWorkspace?.zoomLevel || 100
            };
          }
        } catch (err) {
          console.warn("\u26A0\uFE0F Fresh canvas fetch failed, falling back to cached canvasData", err);
          freshCanvasData = getCanvasData();
        }
        if (canvasSyncRequestRef.current !== requestId)
          return;
        skipNextSyncRef.current = true;
        const nodesToLoad = cleanupOrphanedNodesHelper(freshCanvasData?.nodes || []);
        const collabs = workspaceCollaboratorsRef.current;
        const nodesWithCollabs = collabs.length > 0 ? nodesToLoad.map((n) => ({ ...n, data: { ...n.data, workspaceCollaborators: collabs } })) : nodesToLoad;
        setNodesRaw(nodesWithCollabs);
        setCanvasLoadedCounter((c) => c + 1);
        setEdgesRaw(Array.isArray(freshCanvasData?.edges) ? freshCanvasData.edges : []);
        updateZoomLevel(freshCanvasData?.zoomLevel || 100);
        lastAddedNodeIdRef.current = nodesWithCollabs.length > 0 ? nodesWithCollabs[nodesWithCollabs.length - 1].id : null;
      })();
      return;
    }
    const newCanvasData = getCanvasData();
    console.log("\u{1F504} CanvasWorkspace: Updating canvas data for subtask change", {
      subtaskId: selectedSubtask?.id,
      subtaskActuallyChanged,
      nodesCount: newCanvasData.nodes.length,
      edgesCount: newCanvasData.edges.length,
      zoomLevel: newCanvasData.zoomLevel
    });
    if (Array.isArray(newCanvasData.nodes)) {
      const collabs = workspaceCollaboratorsRef.current;
      const nodesWithCollabs = collabs.length > 0 ? newCanvasData.nodes.map((n) => ({ ...n, data: { ...n.data, workspaceCollaborators: collabs } })) : newCanvasData.nodes;
      setNodesRaw(nodesWithCollabs);
      setCanvasLoadedCounter((c) => c + 1);
    }
    if (Array.isArray(newCanvasData.edges)) {
      setEdgesRaw(newCanvasData.edges);
    }
    updateZoomLevel(newCanvasData.zoomLevel);
    if (newCanvasData.nodes && newCanvasData.nodes.length > 0) {
      const lastNode = newCanvasData.nodes[newCanvasData.nodes.length - 1];
      lastAddedNodeIdRef.current = lastNode.id;
      console.log("\u{1F4CC} Set last added element to:", lastNode.id);
    } else {
      lastAddedNodeIdRef.current = null;
      console.log("\u{1F4CC} Cleared last added element reference");
    }
  }, [selectedSubtask?.id, selectedSubtask?.updatedAt, workspace?.workspaceId, updateZoomLevel, nodes.length]);
  const isApplyingRemoteRef = useRef(false);
  const batcherRef = useRef(null);
  useEffect(() => {
    if (canvasWebSocket?.emitOperation) {
      batcherRef.current = new OperationBatcher(canvasWebSocket.emitOperation, 50);
    }
    return () => {
      batcherRef.current?.destroy();
      batcherRef.current = null;
    };
  }, [canvasWebSocket?.emitOperation]);
  const emitOp = useCallback((op) => {
    if (isApplyingRemoteRef.current)
      return;
    if (batcherRef.current) {
      batcherRef.current.add(op);
    } else if (canvasWebSocket?.emitOperation) {
      canvasWebSocket.emitOperation(op);
    }
  }, [canvasWebSocket]);
  useEffect(() => {
    emitOpRef.current = emitOp;
  }, [emitOp]);
  useEffect(() => {
    taskIdRef.current = selectedTask?.id || null;
  }, [selectedTask?.id]);
  useEffect(() => {
    subtaskIdRef.current = selectedSubtask?.id || null;
  }, [selectedSubtask?.id]);
  useEffect(() => {
    if (canvasWebSocket?.isConnected && emitOp) {
      registerCanvasEmitter(emitOp, selectedTask?.id || null, selectedSubtask?.id || null);
    } else {
      unregisterCanvasEmitter();
    }
    return () => unregisterCanvasEmitter();
  }, [canvasWebSocket?.isConnected, emitOp, selectedTask?.id, selectedSubtask?.id]);
  useEffect(() => {
    workspaceCollaboratorsRef.current = workspaceCollaborators || [];
  }, [workspaceCollaborators]);
  useEffect(() => {
    if (!workspaceCollaborators || workspaceCollaborators.length === 0)
      return;
    setNodesRaw((nds) => nds.map((n) => {
      if (n.data && JSON.stringify(n.data.workspaceCollaborators) !== JSON.stringify(workspaceCollaborators)) {
        return { ...n, data: { ...n.data, workspaceCollaborators } };
      }
      return n;
    }));
  }, [workspaceCollaborators, canvasLoadedCounter]);
  useEffect(() => {
    if (canvasWebSocket?.isConnected && canvasWebSocket?.initSnapshot && nodes.length > 0) {
      const taskId = selectedTask?.id || null;
      const subtaskId = selectedSubtask?.id || null;
      canvasWebSocket.initSnapshot({ nodes, edges, zoomLevel, taskId, subtaskId });
      canvasWebSocket.requestFullState?.(taskId, subtaskId);
    }
  }, [canvasWebSocket?.isConnected, selectedSubtask?.id, nodes.length > 0]);
  useEffect(() => {
    if (!canvasWebSocket?.setOnRemoteOperation)
      return;
    canvasWebSocket.setOnRemoteOperation((op) => {
      isApplyingRemoteRef.current = true;
      try {
        applyRemoteOperation(op, setNodesRaw, setEdgesRaw, updateZoomLevel);
        if (op.type === "NODE_DELETE") {
          purgeDeletedFromCanvasCache([op.nodeId]);
        } else if (op.type === "EDGE_DELETE") {
          purgeDeletedFromCanvasCache([], [op.edgeId]);
        } else if (op.type === "NODES_BATCH_UPDATE" && Array.isArray(op.changes)) {
          const removedIds = op.changes.filter((c) => c.type === "remove").map((c) => c.id);
          if (removedIds.length > 0)
            purgeDeletedFromCanvasCache(removedIds);
        }
      } finally {
        queueMicrotask(() => {
          isApplyingRemoteRef.current = false;
        });
      }
    });
    return () => canvasWebSocket.setOnRemoteOperation(null);
  }, [canvasWebSocket, setNodesRaw, setEdgesRaw, updateZoomLevel, purgeDeletedFromCanvasCache]);
  useEffect(() => {
    if (!canvasWebSocket?.setOnFullState)
      return;
    canvasWebSocket.setOnFullState((data) => {
      isApplyingRemoteRef.current = true;
      try {
        if (data.nodes)
          setNodesRaw(data.nodes);
        if (data.edges)
          setEdgesRaw(data.edges);
        if (data.zoomLevel != null)
          updateZoomLevel(data.zoomLevel);
      } finally {
        queueMicrotask(() => {
          isApplyingRemoteRef.current = false;
        });
      }
    });
    return () => canvasWebSocket.setOnFullState(null);
  }, [canvasWebSocket, setNodesRaw, setEdgesRaw, updateZoomLevel]);
  const lastCursorEmitRef = useRef(0);
  const handleCanvasMouseMove = useCallback((event) => {
    if (!canvasWebSocket?.emitCursor)
      return;
    const now = Date.now();
    if (now - lastCursorEmitRef.current < 100)
      return;
    lastCursorEmitRef.current = now;
    canvasWebSocket.emitCursor(event.clientX, event.clientY);
  }, [canvasWebSocket]);
  const getOverlayPoint = useCallback((event) => {
    const overlay = canvasOverlayRef.current;
    if (!overlay)
      return null;
    const rect = overlay.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top))
    };
  }, []);
  const handlePenPointerDown = useCallback((event) => {
    if (!isPenMode || !canEdit)
      return;
    const startPoint = getOverlayPoint(event);
    if (!startPoint)
      return;
    const pathId = `pen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newPath = {
      id: pathId,
      color: penColor,
      thickness: penThickness,
      points: [startPoint]
    };
    isPointerDrawingRef.current = true;
    activePathIdRef.current = pathId;
    setDrawingPaths((prev) => [...prev, newPath]);
  }, [canEdit, getOverlayPoint, isPenMode, penColor, penThickness]);
  const handlePenPointerMove = useCallback((event) => {
    if (!isPenMode || !canEdit || !isPointerDrawingRef.current)
      return;
    const point = getOverlayPoint(event);
    const activePathId = activePathIdRef.current;
    if (!point || !activePathId)
      return;
    setDrawingPaths(
      (prev) => prev.map((path) => {
        if (path.id !== activePathId)
          return path;
        return {
          ...path,
          points: [...path.points, point]
        };
      })
    );
  }, [canEdit, getOverlayPoint, isPenMode]);
  const stopPenDrawing = useCallback(() => {
    isPointerDrawingRef.current = false;
    activePathIdRef.current = null;
  }, []);
  const handlePenPointerUp = useCallback(() => {
    if (!isPenMode || !canEdit)
      return;
    stopPenDrawing();
  }, [canEdit, isPenMode, stopPenDrawing]);
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      stopPenDrawing();
    };
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
  }, [stopPenDrawing]);
  useEffect(() => {
    if (!onSaveWorkspace || !workspace?.workspaceId) {
      return void 0;
    }
    const isLiveSyncConnected = Boolean(canvasWebSocket?.isConnected);
    const saveData = { nodes, edges, zoomLevel, canvasSettings: {} };
    const debounceMs = isLiveSyncConnected ? 12e3 : 5e3;
    if (!isLiveSyncConnected) {
      setSaveStatus("saving");
    } else {
      setSaveStatus("saved");
    }
    const timeoutId = setTimeout(async () => {
      try {
        skipNextSyncRef.current = true;
        const previewSnapshot = await captureWorkspaceSnapshot();
        await onSaveWorkspace({ ...saveData, previewSnapshot });
        setLastSaved(/* @__PURE__ */ new Date());
        if (!isLiveSyncConnected) {
          setSaveStatus("saved");
          pushToHistory();
          setTimeout(() => setSaveStatus("idle"), 1e3);
        }
      } catch (error) {
        console.error("\u274C CanvasWorkspace: Snapshot persistence failed:", error);
        if (!isLiveSyncConnected) {
          setSaveStatus("error");
          setTimeout(() => setSaveStatus("idle"), 3e3);
        }
      }
    }, debounceMs);
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, zoomLevel, onSaveWorkspace, workspace?.workspaceId, selectedSubtask?.id, canvasWebSocket?.isConnected, captureWorkspaceSnapshot, pushToHistory]);
  const isTableElement = (element) => {
    return element.type === "table" || element.id?.includes("table");
  };
  const isChartElement = (element) => {
    return element.type === "chart" || element.id?.includes("chart");
  };
  const isListElement = (element) => {
    return element.type === "list";
  };
  const isLayoutElement = (element) => {
    return element.type === "frame" || element.type === "rows" || element.type === "columns" || element.type === "grid" || element.type === "image" || element.id?.includes("layout") || element.id === "frame" || element.id === "rows" || element.id === "columns" || element.id === "grids" || element.id === "image-placeholder" || element.id === "image-gallery";
  };
  const isFileElement = (element) => {
    return element.type === "file";
  };
  const isFlowchartElement = (element) => {
    return element.type === "flowchart";
  };
  const autoConnectNearbyNodes = (newNode, allNodes, CONNECTION_THRESHOLD = 250) => {
    console.log("\u{1F517} autoConnectNearbyNodes: Analyzing nodes for auto-connection");
    const nearbyNodes = allNodes.filter((node) => {
      if (node.id === newNode.id)
        return false;
      const dx = node.position.x - newNode.position.x;
      const dy = node.position.y - newNode.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < CONNECTION_THRESHOLD;
    });
    console.log(`\u{1F3AF} Found ${nearbyNodes.length} nearby nodes for auto-connection`);
    const connectionsToCreate = [];
    nearbyNodes.forEach((nearbyNode) => {
      const dx = newNode.position.x - nearbyNode.position.x;
      const dy = newNode.position.y - nearbyNode.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      let sourceId, targetId;
      const isToTheLeft = dx > 0;
      const isAbove = dy > 0;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (isToTheLeft) {
          sourceId = nearbyNode.id;
          targetId = newNode.id;
        } else {
          sourceId = newNode.id;
          targetId = nearbyNode.id;
        }
      } else {
        if (isAbove) {
          sourceId = nearbyNode.id;
          targetId = newNode.id;
        } else {
          sourceId = newNode.id;
          targetId = nearbyNode.id;
        }
      }
      const connectionExists = false;
      connectionsToCreate.push({
        source: sourceId,
        target: targetId,
        distance: Math.round(distance),
        direction: isToTheLeft ? "left" : isAbove ? "above" : "right"
      });
      console.log(`\u27A1\uFE0F Will connect: ${sourceId} \u2192 ${targetId} (distance: ${Math.round(distance)}px, direction: ${isToTheLeft ? "left" : isAbove ? "above" : "right"})`);
    });
    return connectionsToCreate;
  };
  const createElementNode = (element, position, customData = null) => {
    const sequenceNum = nodes.filter((n) => n.data?.sequenceNumber !== void 0 && n.data.sequenceNumber !== null).length + 1;
    console.log("\u{1F3D7}\uFE0F createElementNode called with:", { element, position, customData, sequenceNum, totalNodes: nodes.length });
    const isLayout = element.width !== void 0 || ["frame", "rows", "columns", "grid", "image"].includes(element.type);
    const isText = element.type === "text" || element.content !== void 0;
    const isTurnkey = element.category === "turnkey" || element.type?.startsWith("turnkey-");
    const isTaskCard = element.type === "task-card" || element.type === "task-card-progress";
    const isImageBlock = element.type === "image-block";
    const isSmartNote = element.type === "smart-note" || element.nodeType === "smartNote";
    const isCalendarEvent = element.type === "calendar-event" || element.nodeType === "calendarNode";
    const isApprovalBoard = element.type === "approval-board" || element.nodeType === "approvalBoard";
    const isAIHelper = element.type === "ai-helper" || element.nodeType === "aiHelper";
    const isCreditNote = element.type === "credit-note" || element.nodeType === "creditNote";
    const isInvoice = element.type === "invoice" || element.nodeType === "invoice";
    const isQuotation = element.type === "quotation" || element.nodeType === "quotation";
    const isPurchaseOrder = element.type === "purchase-order" || element.nodeType === "purchaseOrder";
    const isInfoCard = element.type === "info-card" || element.nodeType === "infoCard";
    const isFormCard = element.type === "form-card" || element.nodeType === "formCard";
    console.log("\u{1F50D} Element type checks:", { isLayout, isText, isTurnkey, isSmartNote, isCalendarEvent, isApprovalBoard, isAIHelper, isCreditNote, isInvoice, isQuotation, isPurchaseOrder, isInfoCard, isFormCard });
    let nodeType = "elementNode";
    if (isLayout)
      nodeType = "layoutNode";
    if (isText)
      nodeType = "textNode";
    if (isTurnkey)
      nodeType = "turnkeyNode";
    if (isSmartNote)
      nodeType = "smartNote";
    if (isCalendarEvent)
      nodeType = "calendarNode";
    if (isApprovalBoard)
      nodeType = "approvalBoard";
    if (isAIHelper)
      nodeType = "aiHelper";
    if (isCreditNote)
      nodeType = "creditNote";
    if (isInvoice)
      nodeType = "invoice";
    if (isQuotation)
      nodeType = "quotation";
    if (isPurchaseOrder)
      nodeType = "purchaseOrder";
    if (isInfoCard)
      nodeType = "infoCard";
    if (isFormCard)
      nodeType = "formCard";
    const nodeId = `${element.type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const taskCardData = isTaskCard ? customData?.taskCardData || element.taskCardData || null : null;
    const imageBlockData = isImageBlock ? customData?.imageBlockData || element.imageBlockData || null : null;
    const previewText = (() => {
      if (isTaskCard && taskCardData?.title) {
        return taskCardData.title;
      }
      if (isImageBlock && (imageBlockData?.caption || imageBlockData?.timestamp)) {
        return imageBlockData.caption || `Snapshot ${imageBlockData.timestamp}`;
      }
      return element.preview || `${element.type} ${isLayout ? "layout" : isText ? "text" : isTurnkey ? "turnkey" : "element"}`;
    })();
    const documentUrl = element.pdfUrl || element.documentUrl || element.fileUrl || element.url || element.link || null;
    const newNode = {
      id: nodeId,
      type: nodeType,
      position,
      data: {
        name: element.name,
        type: element.type,
        preview: previewText,
        documentUrl,
        documentMeta: documentUrl ? {
          id: element.displayQuoteId || element.customQuoteId || element.customInvoiceId || element.quotationId || element.invoiceId || element.id,
          customer: element.customer || element.customerName || element.customerDetails?.name,
          date: element.date || element.quoteDate || element.invoiceDate || element.createdAt,
          amount: element.totalAmount,
          status: element.status,
          vendorName: element.company?.name
        } : null,
        ...isTurnkey && (() => {
          const turnkeyData = {
            elementType: element.type,
            taskName: element.taskName || "Turnkey task 1",
            status: element.status || "Foundation - phase 1",
            date: element.date || (/* @__PURE__ */ new Date()).toLocaleDateString(),
            nodeId,
            // Store the node ID in data for easy access
            // Use custom turnkey data if provided, otherwise use defaults
            ...customData && element.type === "turnkey-workflow" && {
              ...customData
            }
          };
          console.log("\u{1F3AF} Final turnkey data for node:", turnkeyData);
          return turnkeyData;
        })(),
        width: element.width,
        height: element.height,
        // Text-specific properties
        content: element.content,
        fontSize: element.fontSize,
        fontFamily: element.fontFamily,
        color: element.color,
        backgroundColor: element.backgroundColor,
        formats: element.formats,
        // Custom table data if provided
        ...customData && element.type === "table" && { customTableData: customData },
        // Custom chart data if provided
        ...customData && element.type === "chart" && { customChartData: customData },
        // Custom list data if provided
        ...customData && element.type === "list" && { customListData: customData },
        // File data if provided
        ...element.type === "file" && element.fileData && { fileData: element.fileData },
        ...element.type === "file" && customData?.fileData && { fileData: customData.fileData },
        // Store chart ID for chart elements
        ...element.type === "chart" && { id: element.id },
        // Store list ID for list elements
        ...element.type === "list" && { id: element.id },
        ...isTaskCard && taskCardData && { taskCardData },
        ...isImageBlock && imageBlockData && { imageBlockData: JSON.parse(JSON.stringify(imageBlockData)) },
        // Store CAD files data
        ...element.type === "cad-files" && {
          cadFilesData: element.cadFilesData || customData?.cadFilesData || { files: [] }
        },
        // Store CDR files data
        ...element.type === "cdr-files" && {
          cdrFilesData: element.cdrFilesData || customData?.cdrFilesData || { files: [] }
        },
        // Store floor plan data
        ...element.type === "floor-plan" && {
          floorPlanData: element.floorPlanData || customData?.floorPlanData || { files: [] }
        },
        // Store Custom BOQ document data
        ...element.type === "custom-boq" && {
          customBOQData: element.customBOQData || customData?.customBOQData || null
        },
        // Store icon ID for icon elements
        ...element.type === "icon" && { id: element.id },
        // Store cost calculator data
        ...element.type === "cost-calculator" && { id: element.id },
        ...element.type === "cost-calculator" && element.data && { ...element.data },
        // Store cost calculator summary data
        ...element.type === "cost-calculator-summary" && element.data && { data: element.data },
        // Store Smart Note data
        ...isSmartNote && {
          label: element.data?.label || element.name || "Smart Note",
          ...element.data || {}
        },
        // Store Calendar Event data
        ...isCalendarEvent && {
          label: element.data?.label || element.name || "Calendar Event",
          ...element.data || {}
        },
        // Store Approval Board data
        ...isApprovalBoard && {
          label: element.data?.label || element.name || "Approval Board",
          ...element.data || {}
        },
        // Store AI Helper data
        ...isAIHelper && {
          label: element.data?.label || element.name || "AI Helper",
          taskName: selectedTask?.title || "",
          subtaskName: selectedSubtask?.title || "",
          ...element.data || {}
        },
        // Bind dragged quotation record to the node so it isn't a blank draft
        ...isQuotation && (() => {
          const taxTotal = element.totalTax ?? element.tax ?? ((parseFloat(element.cgst) || 0) + (parseFloat(element.sgst) || 0) + (parseFloat(element.igst) || 0) || "");
          return {
            quotationNumber: element.displayQuoteId || element.customQuoteId || element.quotationNumber || element.name || "",
            customerName: element.customerName || element.customerDetails?.name || element.customerDetails?.displayName || element.customer || "",
            validUntil: element.validUntil || element.expiryDate || "",
            subtotal: element.subtotal ?? element.subTotal ?? "",
            tax: taxTotal,
            total: element.total ?? element.totalAmount ?? element.grandTotal ?? "",
            status: (element.status || "draft").toLowerCase(),
            items: element.items || [],
            quotationId: element.quotationId || element.id || null,
            quotationData: element
          };
        })(),
        // Store workspaceId for all nodes (needed for MaterialsRenderer and other components)
        workspaceId: workspace?.workspaceId || null,
        taskId: selectedTask?.id || null,
        subtaskId: selectedSubtask?.id || null,
        taskName: selectedTask?.name || selectedTask?.title || null,
        subtaskName: selectedSubtask?.name || selectedSubtask?.title || null,
        // Workspace collaborators for @mention in comments
        workspaceCollaborators: workspaceCollaborators || [],
        // Comments thread
        comments: [],
        // Element metadata - who added and when
        addedBy: currentUser?.name || currentUser?.email || "Unknown User",
        addedByEmail: currentUser?.email || null,
        addedByRole: currentUser?.role || "vendor",
        // 'vendor' or 'pm'
        addedAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastUpdatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastUpdatedBy: currentUser?.name || currentUser?.email || "Unknown User",
        isRecentlyUpdated: true,
        // Element sequence number - order in which it was added
        sequenceNumber: sequenceNum,
        // Approval workflow - initially pending
        approvalStatus: "pending",
        // 'pending', 'approved', 'rejected'
        approvedBy: null,
        approvedByEmail: null,
        approvedByRole: null,
        approvalTimestamp: null,
        approvalReason: null
      }
    };
    return newNode;
  };
  const createLayoutNode = (element, position, layoutConfig = null) => {
    const newNode = {
      id: `layout_${Date.now()}`,
      type: "layoutNode",
      position,
      data: {
        name: layoutConfig?.title || element.name,
        type: element.type,
        id: element.id,
        preview: layoutConfig?.description || element.preview,
        width: element.width || 380,
        height: element.height || 280,
        // Add custom layout data if provided
        ...layoutConfig?.customLayoutData && { customLayoutData: layoutConfig.customLayoutData },
        // Element metadata - who added and when
        addedBy: currentUser?.name || currentUser?.email || "Unknown User",
        addedByEmail: currentUser?.email || null,
        addedByRole: currentUser?.role || "vendor",
        addedAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastUpdatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastUpdatedBy: currentUser?.name || currentUser?.email || "Unknown User",
        isRecentlyUpdated: true
      }
    };
    return newNode;
  };
  const autoConnectNewNode = (newNode) => {
    const previousNodeId = lastAddedNodeIdRef.current;
    console.log("\u{1F4CC} Previous node ID stored:", previousNodeId);
    if (previousNodeId) {
      setNodes((currentNodes) => {
        const previousNode = currentNodes.find((node) => node.id === previousNodeId);
        if (previousNode) {
          console.log(`\u{1F3AF} Found previous node: ${previousNodeId} at position (${previousNode.position.x}, ${previousNode.position.y})`);
          const dx = newNode.position.x - previousNode.position.x;
          const dy = newNode.position.y - previousNode.position.y;
          let sourceId = previousNode.id;
          let targetId = newNode.id;
          let sourceHandle = "right-out";
          let targetHandle = "left-in";
          if (Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) {
              sourceId = newNode.id;
              targetId = previousNode.id;
            }
          } else {
            if (dy > 0) {
              sourceId = previousNode.id;
              targetId = newNode.id;
              sourceHandle = "bottom-out";
              targetHandle = "top-in";
            } else {
              sourceId = newNode.id;
              targetId = previousNode.id;
              sourceHandle = "bottom-out";
              targetHandle = "top-in";
            }
          }
          setEdges((currentEdges) => {
            console.log("\u{1F4D0} Creating edge from", sourceId, "to", targetId);
            const connectionExists = currentEdges.some(
              (edge) => edge.source === sourceId && edge.target === targetId && edge.sourceHandle === sourceHandle && edge.targetHandle === targetHandle || edge.source === targetId && edge.target === sourceId
            );
            if (!connectionExists) {
              const edgeId = `edge_auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              const newEdge = {
                id: edgeId,
                source: sourceId,
                target: targetId,
                sourceHandle,
                targetHandle,
                type: "custom",
                animated: false,
                style: {
                  strokeWidth: 2,
                  stroke: "#6b7280"
                },
                markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "#6b7280" },
                data: {
                  label: "",
                  isAutoConnected: true
                }
              };
              console.log(`\u2705 AUTO-CONNECTED: ${sourceId} \u2192 ${targetId}`);
              return [...currentEdges, newEdge];
            } else {
              console.log(`\u23ED\uFE0F Connection already exists between: ${sourceId} \u2194 ${targetId}`);
              return currentEdges;
            }
          });
        } else {
          console.log(`\u26A0\uFE0F Previous node (${previousNodeId}) not found in current nodes`);
        }
        return currentNodes;
      });
    } else {
      console.log("\u2139\uFE0F No previous element - this is the first element");
    }
    lastAddedNodeIdRef.current = newNode.id;
    console.log("\u{1F4CC} Updated last added element to:", newNode.id);
  };
  const handleTableConfigConfirm = async (tableConfig) => {
    if (pendingTableElement && pendingPosition) {
      const finalPosition = findNonCollidingPosition(pendingPosition, 400, 300);
      const newNode = createElementNode(pendingTableElement, finalPosition, tableConfig);
      console.log("\u{1F195} Creating table with custom data:", newNode);
      setNodes((nds) => nds.concat(newNode));
      autoConnectNewNode(newNode);
      await trackActivity(
        "element_added",
        "create",
        "element",
        {
          elementId: newNode.id,
          elementType: "table",
          position: pendingPosition,
          details: {
            elementName: pendingTableElement.name || "Table",
            tableConfig,
            canvasAction: true
          }
        }
      );
      setPendingTableElement(null);
      setPendingPosition(null);
    }
    setShowTableModal(false);
  };
  const handleTableModalClose = () => {
    setShowTableModal(false);
    setPendingTableElement(null);
    setPendingPosition(null);
  };
  const handleChartConfigConfirm = async (chartConfig) => {
    if (pendingChartElement && pendingPosition) {
      const finalPosition = findNonCollidingPosition(pendingPosition, 450, 350);
      const newNode = createElementNode(pendingChartElement, finalPosition, chartConfig);
      console.log("\u{1F195} Creating chart with custom data:", newNode);
      setNodes((nds) => nds.concat(newNode));
      autoConnectNewNode(newNode);
      await trackActivity(
        "element_added",
        "create",
        "element",
        {
          elementId: newNode.id,
          elementType: "chart",
          position: pendingPosition,
          details: {
            elementName: pendingChartElement.name || "Chart",
            chartConfig,
            canvasAction: true
          }
        }
      );
      setPendingChartElement(null);
      setPendingPosition(null);
    }
    setShowChartModal(false);
  };
  const handleChartModalClose = () => {
    setShowChartModal(false);
    setPendingChartElement(null);
    setPendingPosition(null);
  };
  const handleTurnkeyConfigConfirm = async (turnkeyConfig) => {
    if (pendingTurnkeyElement) {
      let nodeId;
      let isNewNode = false;
      if (pendingTurnkeyElement.nodeId) {
        nodeId = pendingTurnkeyElement.nodeId;
        console.log("\u{1F527} Updating existing turnkey workflow:", nodeId, turnkeyConfig);
        setNodes((nds) => nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...turnkeyConfig,
                elementType: "turnkey-workflow",
                nodeId
                // Ensure nodeId is preserved
              }
            };
          }
          return node;
        }));
      } else if (pendingPosition) {
        const elementWithConfig = {
          ...pendingTurnkeyElement,
          ...turnkeyConfig,
          elementType: "turnkey-workflow"
        };
        console.log("\u{1F4E6} Element with config:", elementWithConfig);
        console.log("\u{1F527} Turnkey config data:", turnkeyConfig);
        const finalPosition = findNonCollidingPosition(pendingPosition, 350, 250);
        const newNode = createElementNode(elementWithConfig, finalPosition, turnkeyConfig);
        console.log("\u{1F195} Created turnkey workflow node:", newNode);
        setNodes((nds) => nds.concat(newNode));
        autoConnectNewNode(newNode);
        nodeId = newNode.id;
        isNewNode = true;
        if (onActivityCreated) {
          onActivityCreated();
        }
      }
      if (nodeId && workspace?.workspaceId) {
        try {
          console.log("\u{1F4BE} Saving turnkey workflow to backend:", {
            workspaceId: workspace.workspaceId,
            nodeId,
            isNewNode
          });
          if (isNewNode) {
            console.log("\u23F3 Adding small delay for new node creation...");
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
          const method = isNewNode ? "POST" : "PUT";
          console.log(`\u{1F310} Making ${method} request for ${isNewNode ? "new" : "existing"} turnkey workflow`);
          const response = await fetch(`/api/turnkey-workflows/workspace/${workspace.workspaceId}/node/${nodeId}`, {
            method,
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              ...turnkeyConfig,
              vendorId: workspace.vendorId,
              userId: workspace.vendorId,
              // For audit trail
              nodeId,
              workspaceId: workspace.workspaceId
            })
          });
          if (!response.ok) {
            const errorText = await response.text();
            console.error("\u274C Failed to save turnkey workflow:", errorText);
            if (errorText.includes("Node not found") && isNewNode) {
              console.log("\u{1F504} Retrying save for new node...");
            }
            throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
          }
          const result = await response.json();
          console.log("\u2705 Turnkey workflow saved to backend successfully:", result);
        } catch (error) {
          console.error("\u274C Error saving turnkey workflow to backend:", error);
          console.log("\u2139\uFE0F Note: Turnkey workflow is saved locally. It will sync to server via auto-save.");
        }
      }
    }
    setPendingTurnkeyElement(null);
    setPendingPosition(null);
    setShowTurnkeyModal(false);
    console.log("\u{1F504} Modal closed and pending data cleared");
  };
  const handleTurnkeyModalClose = () => {
    setShowTurnkeyModal(false);
    setPendingTurnkeyElement(null);
    setPendingPosition(null);
  };
  const handleListConfigConfirm = (listConfig) => {
    if (pendingListElement && pendingPosition) {
      const finalPosition = findNonCollidingPosition(pendingPosition, 350, 300);
      const newNode = createElementNode(pendingListElement, finalPosition, listConfig);
      console.log("\u{1F195} Creating list with custom data:", newNode);
      setNodes((nds) => nds.concat(newNode));
      autoConnectNewNode(newNode);
      setPendingListElement(null);
      setPendingPosition(null);
    }
    setShowListModal(false);
  };
  const handleListModalClose = () => {
    setShowListModal(false);
    setPendingListElement(null);
    setPendingPosition(null);
  };
  const handleLayoutConfigConfirm = (layoutConfig) => {
    if (pendingLayoutElement && pendingPosition) {
      const finalPosition = findNonCollidingPosition(pendingPosition, 400, 300);
      const newNode = createLayoutNode(pendingLayoutElement, finalPosition, layoutConfig);
      console.log("\u{1F195} Creating layout with custom data:", newNode);
      setNodes((nds) => nds.concat(newNode));
      autoConnectNewNode(newNode);
      setPendingLayoutElement(null);
      setPendingPosition(null);
    }
    setShowLayoutModal(false);
  };
  const handleLayoutModalClose = () => {
    setShowLayoutModal(false);
    setPendingLayoutElement(null);
    setPendingPosition(null);
  };
  const handleTaskCardConfigConfirm = async (taskCardConfig) => {
    if (pendingTaskCardElement && pendingPosition) {
      const finalPosition = findNonCollidingPosition(pendingPosition, 300, 250);
      const newNode = createElementNode(pendingTaskCardElement, finalPosition, { taskCardData: taskCardConfig });
      setNodes((nds) => nds.concat(newNode));
      autoConnectNewNode(newNode);
      await trackActivity(
        "element_added",
        "create",
        "element",
        {
          elementId: newNode.id,
          elementType: "task-card",
          position: pendingPosition,
          details: {
            elementName: pendingTaskCardElement.name || "Task Card",
            canvasAction: true,
            taskData: taskCardConfig
          }
        }
      );
    }
    setShowTaskCardModal(false);
    setPendingTaskCardElement(null);
    setPendingTaskCardInitialData(null);
    setPendingPosition(null);
  };
  const handleTaskCardModalClose = () => {
    setShowTaskCardModal(false);
    setPendingTaskCardElement(null);
    setPendingTaskCardInitialData(null);
    setPendingPosition(null);
  };
  const openEdgeLabelModal = useCallback((edgeId, currentLabel = "") => {
    const edge = edges.find((e) => e.id === edgeId);
    const currentStyle = edge?.data?.edgeStyle || "default";
    const currentColor = edge?.data?.edgeColor || "#3b82f6";
    setEdgeLabelModal({
      isOpen: true,
      edgeId,
      initialLabel: currentLabel,
      edgeStyle: currentStyle,
      edgeColor: currentColor
    });
    setEdgeLabelInput(currentLabel);
    setEdgeStyleInput(currentStyle);
    setEdgeColorInput(currentColor);
  }, [edges]);
  const closeEdgeLabelModal = useCallback(() => {
    setEdgeLabelModal({ isOpen: false, edgeId: null, initialLabel: "", edgeStyle: "default", edgeColor: "#3b82f6" });
    setEdgeLabelInput("");
    setEdgeStyleInput("default");
    setEdgeColorInput("#3b82f6");
  }, []);
  const handleEdgeLabelSave = useCallback(() => {
    if (!edgeLabelModal.edgeId) {
      closeEdgeLabelModal();
      return;
    }
    setEdges((eds) => eds.map((edge) => {
      if (edge.id !== edgeLabelModal.edgeId) {
        return edge;
      }
      let strokeDasharray = void 0;
      let animated = false;
      switch (edgeStyleInput) {
        case "dashed":
          strokeDasharray = "10,5";
          break;
        case "dotted":
          strokeDasharray = "2,4";
          break;
        case "animated":
          animated = true;
          break;
        default:
          break;
      }
      return {
        ...edge,
        animated,
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: edgeColorInput },
        style: {
          ...edge.style || {},
          stroke: edgeColorInput,
          strokeWidth: 2,
          strokeDasharray
        },
        data: {
          ...edge.data || {},
          label: edgeLabelInput.trim(),
          edgeStyle: edgeStyleInput,
          edgeColor: edgeColorInput
        }
      };
    }));
    closeEdgeLabelModal();
  }, [edgeLabelInput, edgeStyleInput, edgeColorInput, edgeLabelModal.edgeId, closeEdgeLabelModal, setEdges]);
  const handleDeleteEdge = useCallback(() => {
    if (!edgeLabelModal.edgeId) {
      closeEdgeLabelModal();
      return;
    }
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeLabelModal.edgeId));
    purgeDeletedFromCanvasCache([], [edgeLabelModal.edgeId]);
    closeEdgeLabelModal();
    console.log("\u{1F5D1}\uFE0F Edge deleted:", edgeLabelModal.edgeId);
  }, [edgeLabelModal.edgeId, closeEdgeLabelModal, setEdges, purgeDeletedFromCanvasCache]);
  const handleSelectionChange = useCallback((params) => {
    const selectedNodeIds = params.nodes.map((node) => node.id);
    const selectedNodeObjects = nodes.filter((node) => selectedNodeIds.includes(node.id));
    setSelectedNodes(selectedNodeObjects);
    if (selectedNodeObjects.length === 1 && selectedNodeObjects[0].type === "textNode") {
      const textNode = selectedNodeObjects[0];
      const selectEvent = new CustomEvent("selectTextElement", {
        detail: {
          id: textNode.id,
          ...textNode.data,
          position: textNode.position,
          width: textNode.style?.width ?? textNode.width ?? textNode.data?.width ?? null,
          height: textNode.style?.height ?? textNode.height ?? textNode.data?.height ?? null
        }
      });
      document.dispatchEvent(selectEvent);
    }
    if (selectedNodeObjects.length >= 2) {
      const hasFlowchartNodes = selectedNodeObjects.some((node) => node.data?.flowchartGroup);
      if (!hasFlowchartNodes) {
        setShowGroupingToolbar(true);
        console.log("\u{1F3AF} Multiple nodes selected for grouping:", selectedNodeObjects.length);
      } else {
        setShowGroupingToolbar(false);
      }
    } else {
      setShowGroupingToolbar(false);
    }
    if (selectedNodeObjects.length === 1) {
      const selectedNode = selectedNodeObjects[0];
      if (selectedNode.data?.flowchartGroup) {
        setSelectedFlowchartGroup(selectedNode.data.flowchartGroup);
        setShowFlowchartToolbar(true);
      } else {
        setSelectedFlowchartGroup(null);
        setShowFlowchartToolbar(false);
      }
    } else {
      setSelectedFlowchartGroup(null);
      setShowFlowchartToolbar(false);
    }
  }, [nodes]);
  const handleGroupingModalClose = () => {
    setShowGroupingModal(false);
  };
  const handleGroupIntoGrid = () => {
    console.log("\u{1F3AF} Group button clicked!");
    console.log("\u{1F4CA} Selected nodes count:", selectedNodes.length);
    console.log("\u{1F4CB} Selected nodes:", selectedNodes);
    console.log("\u{1F50D} Manually selected nodes:", manuallySelectedNodes.length);
    if (manuallySelectedNodes.length >= 2) {
      console.log("\u2705 Opening grouping modal with nodes:", manuallySelectedNodes);
      setShowGroupingModal(true);
    } else {
      console.log("\u274C Not enough nodes selected for grouping. Manual count:", manuallySelectedNodes.length);
    }
  };
  const handleSelectionModeToggle = () => {
    console.log("\u{1F504} Selection mode toggle clicked!");
    console.log("\u{1F4CA} Current selection mode:", isSelectionMode);
    if (isSelectionMode) {
      setIsSelectionMode(false);
      setManuallySelectedNodes([]);
      setSelectedNodes([]);
      setShowGroupingToolbar(false);
      console.log("\u{1F504} Exited selection mode");
    } else {
      setIsSelectionMode(true);
      setManuallySelectedNodes([]);
      setSelectedNodes([]);
      setShowGroupingToolbar(false);
      console.log("\u{1F3AF} Entered selection mode - click elements to select them");
    }
  };
  const handleManualNodeSelection = (nodeId) => {
    console.log("\u{1F5B1}\uFE0F Node clicked for selection:", nodeId);
    console.log("\u{1F50D} Is in selection mode:", isSelectionMode);
    if (!isSelectionMode) {
      console.log("\u274C Not in selection mode, ignoring click");
      return;
    }
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) {
      console.log("\u274C Node not found:", nodeId);
      return;
    }
    if (node.data?.flowchartGroup) {
      console.log("\u26A0\uFE0F Cannot select flowchart elements for grouping");
      return;
    }
    console.log("\u2705 Processing node selection for:", node.data?.name);
    setManuallySelectedNodes((prev) => {
      const isAlreadySelected = prev.some((n) => n.id === nodeId);
      if (isAlreadySelected) {
        const newSelection = prev.filter((n) => n.id !== nodeId);
        console.log("\u2796 Removed node from selection:", node.data?.name, "Total:", newSelection.length);
        return newSelection;
      } else {
        const newSelection = [...prev, node];
        console.log("\u2795 Added node to selection:", node.data?.name, "Total:", newSelection.length);
        return newSelection;
      }
    });
  };
  useEffect(() => {
    console.log("\u{1F504} Updating selection state...");
    console.log("\u{1F4CA} Manually selected nodes:", manuallySelectedNodes.length);
    console.log("\u{1F3AF} Selection mode:", isSelectionMode);
    setSelectedNodes(manuallySelectedNodes);
    const shouldShowToolbar = manuallySelectedNodes.length >= 2;
    setShowGroupingToolbar(shouldShowToolbar);
    console.log("\u{1F6E0}\uFE0F Should show grouping toolbar:", shouldShowToolbar);
    const selectedIds = manuallySelectedNodes.map((n) => n.id);
    console.log("\u{1F3A8} Updating visual state for nodes:", selectedIds);
    setNodes(
      (currentNodes) => currentNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isManuallySelected: selectedIds.includes(node.id),
          isInSelectionMode: isSelectionMode
        }
      }))
    );
  }, [manuallySelectedNodes, isSelectionMode, setNodes]);
  const handleGroupingConfirm = (groupingConfig) => {
    console.log("\u2705 Creating grouped container with grid layout:", groupingConfig);
    const nodesToGroup = manuallySelectedNodes;
    if (nodesToGroup.length === 0) {
      console.log("\u274C No nodes to group");
      return;
    }
    const gridColumns = groupingConfig.gridColumns || 2;
    const gridRows = groupingConfig.gridRows || Math.ceil(nodesToGroup.length / gridColumns);
    const cellWidth = 420;
    const cellHeight = 480;
    const cellGap = 30;
    const cellInnerPadding = 15;
    const containerPaddingX = 35;
    const containerPaddingTop = 65;
    const containerPaddingBottom = 35;
    const containerWidth = cellWidth * gridColumns + cellGap * Math.max(0, gridColumns - 1) + containerPaddingX * 2;
    const containerHeight = cellHeight * gridRows + cellGap * Math.max(0, gridRows - 1) + containerPaddingTop + containerPaddingBottom;
    const minX = Math.min(...nodesToGroup.map((n) => n.position.x));
    const minY = Math.min(...nodesToGroup.map((n) => n.position.y));
    const containerX = minX - containerPaddingX;
    const containerY = minY - containerPaddingTop;
    const groupId = `group_${Date.now()}`;
    const groupContainerNode = {
      id: groupId,
      type: "layoutNode",
      position: { x: containerX, y: containerY },
      style: {
        width: containerWidth,
        height: containerHeight,
        zIndex: -1
        // Behind child nodes
      },
      data: {
        workspaceId: workspace?.workspaceId,
        name: groupingConfig.title || `Group (${nodesToGroup.length} items)`,
        type: "group-container",
        id: "group-container",
        width: containerWidth,
        height: containerHeight,
        preview: groupingConfig.description || "Grouped elements container",
        isGroupContainer: true,
        groupId,
        childNodeIds: nodesToGroup.map((n) => n.id),
        gridConfig: {
          columns: gridColumns,
          rows: gridRows,
          cellWidth,
          cellHeight,
          cellGap,
          cellInnerPadding
        },
        containerStyle: {
          backgroundColor: "#f0f9ff",
          borderColor: "#3b82f6",
          borderWidth: 3,
          borderRadius: 16,
          headerColor: "#3b82f6"
        },
        customLayoutData: {
          layoutType: "group-container",
          title: groupingConfig.title,
          description: groupingConfig.description,
          gridColumns,
          gridRows,
          childNodes: nodesToGroup.map((node, index) => ({
            id: node.id,
            name: node.data?.name || "Element",
            type: node.type,
            originalPosition: node.position,
            gridPosition: {
              row: Math.floor(index / gridColumns),
              col: index % gridColumns
            }
          }))
        },
        originalNodes: nodesToGroup.map((node) => ({
          id: node.id,
          data: node.data,
          position: node.position,
          type: node.type
        }))
      }
    };
    const selectedNodeIds = nodesToGroup.map((node) => node.id);
    setNodes((currentNodes) => {
      const updatedNodes = currentNodes.map((node) => {
        const nodeIndex = selectedNodeIds.indexOf(node.id);
        if (nodeIndex !== -1) {
          const row = Math.floor(nodeIndex / gridColumns);
          const col = nodeIndex % gridColumns;
          const cellStartX = containerPaddingX + col * (cellWidth + cellGap);
          const cellStartY = containerPaddingTop + row * (cellHeight + cellGap);
          const newX = cellStartX + cellInnerPadding;
          const newY = cellStartY + cellInnerPadding;
          const nodeWidth = cellWidth - cellInnerPadding * 2;
          const nodeHeight = cellHeight - cellInnerPadding * 2;
          const maxX = newX + nodeWidth;
          const maxY = newY + nodeHeight;
          const boundedX = Math.max(cellInnerPadding, Math.min(newX, containerWidth - nodeWidth - cellInnerPadding));
          const boundedY = Math.max(containerPaddingTop, Math.min(newY, containerHeight - nodeHeight - cellInnerPadding));
          return {
            ...node,
            parentNode: groupId,
            extent: "parent",
            position: {
              x: boundedX,
              y: boundedY
            },
            style: {
              ...node.style,
              width: nodeWidth,
              height: nodeHeight
            },
            data: {
              ...node.data,
              isGroupChild: true,
              parentGroupId: groupId,
              gridPosition: { row, col },
              width: nodeWidth,
              height: nodeHeight
            }
          };
        }
        return node;
      });
      return [groupContainerNode, ...updatedNodes];
    });
    setShowGroupingModal(false);
    setShowGroupingToolbar(false);
    setSelectedNodes([]);
    setManuallySelectedNodes([]);
    setIsSelectionMode(false);
    console.log("\u{1F389} Group container created with grid layout!", {
      groupId,
      childCount: nodesToGroup.length,
      gridConfig: { columns: gridColumns, rows: gridRows },
      containerPosition: { x: containerX, y: containerY },
      containerSize: { width: containerWidth, height: containerHeight }
    });
  };
  const createFlowchartTemplate = async (element, basePosition) => {
    const template = getFlowchartTemplate(element.id);
    if (!template) {
      console.error("\u274C Flowchart template not found:", element.id);
      return;
    }
    console.log("\u{1F4CA} Creating flowchart template:", template.name);
    const flowchartGroupId = `flowchart_${element.id}_${Date.now()}`;
    const newNodes = template.nodes.map((node) => ({
      ...node,
      id: `${node.id}_${Date.now()}`,
      position: {
        x: basePosition.x + node.position.x - 400,
        // Center the template around drop position
        y: basePosition.y + node.position.y - 200
      },
      data: {
        ...node.data,
        flowchartGroup: flowchartGroupId,
        flowchartType: element.id,
        flowchartName: template.name
      }
    }));
    const nodeIdMap = {};
    template.nodes.forEach((originalNode, index) => {
      nodeIdMap[originalNode.id] = newNodes[index].id;
    });
    const newEdges = template.edges.map((edge) => ({
      ...edge,
      id: `${edge.id}_${Date.now()}`,
      source: nodeIdMap[edge.source],
      target: nodeIdMap[edge.target],
      data: {
        ...edge.data,
        flowchartGroup: flowchartGroupId
      }
    }));
    setNodes((nds) => nds.concat(newNodes));
    setEdges((eds) => eds.concat(newEdges));
    if (newNodes.length > 0) {
      const firstNode = newNodes[0];
      autoConnectNewNode(firstNode);
    }
    await trackActivity(
      "element_added",
      "create",
      "element",
      {
        elementId: flowchartGroupId,
        elementType: "flowchart",
        position: basePosition,
        details: {
          elementName: template.name,
          flowchartType: element.id,
          nodesCount: newNodes.length,
          edgesCount: newEdges.length,
          canvasAction: true
        }
      }
    );
    console.log("\u2705 Flowchart created:", {
      nodes: newNodes.length,
      edges: newEdges.length,
      template: template.name,
      groupId: flowchartGroupId
    });
  };
  const getFlowchartGroupNodes = (groupId) => {
    return nodes.filter((node) => node.data?.flowchartGroup === groupId);
  };
  const getFlowchartGroupEdges = (groupId) => {
    return edges.filter((edge) => edge.data?.flowchartGroup === groupId);
  };
  const selectFlowchartGroup = (groupId) => {
    const groupNodes = getFlowchartGroupNodes(groupId);
    const groupNodeIds = groupNodes.map((node) => node.id);
    setNodes((nds) => nds.map((node) => ({
      ...node,
      selected: groupNodeIds.includes(node.id)
    })));
    const groupEdges = getFlowchartGroupEdges(groupId);
    const groupEdgeIds = groupEdges.map((edge) => edge.id);
    setEdges((eds) => eds.map((edge) => ({
      ...edge,
      selected: groupEdgeIds.includes(edge.id)
    })));
    console.log("\u{1F3AF} Selected flowchart group:", groupId, {
      nodes: groupNodeIds.length,
      edges: groupEdgeIds.length
    });
    setSelectedFlowchartGroup(groupId);
    setShowFlowchartToolbar(true);
  };
  const deleteFlowchartGroup = (groupId) => {
    const groupNodes = getFlowchartGroupNodes(groupId);
    const groupEdges = getFlowchartGroupEdges(groupId);
    if (groupNodes.length === 0)
      return;
    const flowchartName = groupNodes[0]?.data?.flowchartName || "Flowchart";
    if (window.confirm(`Delete entire ${flowchartName}? This will remove all ${groupNodes.length} elements and ${groupEdges.length} connections.`)) {
      setNodes((nds) => {
        let remainingNodes = nds.filter((node) => node.data?.flowchartGroup !== groupId);
        const nodesWithSequence = remainingNodes.filter((node) => node.data?.sequenceNumber !== void 0 && node.data.sequenceNumber !== null).sort((a, b) => (a.data?.sequenceNumber || 0) - (b.data?.sequenceNumber || 0));
        if (nodesWithSequence.length > 0) {
          remainingNodes = remainingNodes.map((node) => {
            const currentSeqIndex = nodesWithSequence.findIndex((n) => n.id === node.id);
            if (currentSeqIndex !== -1) {
              const newSequenceNumber = currentSeqIndex + 1;
              console.log(`\u{1F522} Renumbering node ${node.id}: ${node.data?.sequenceNumber} \u2192 ${newSequenceNumber}`);
              return {
                ...node,
                data: {
                  ...node.data,
                  sequenceNumber: newSequenceNumber
                }
              };
            }
            return node;
          });
        }
        return remainingNodes;
      });
      setEdges((eds) => eds.filter((edge) => edge.data?.flowchartGroup !== groupId));
      groupNodes.forEach((n) => emitOpRef.current?.({
        type: "NODE_DELETE",
        nodeId: n.id,
        taskId: taskIdRef.current,
        subtaskId: subtaskIdRef.current
      }));
      purgeDeletedFromCanvasCache(
        groupNodes.map((n) => n.id),
        groupEdges.map((e) => e.id)
      );
      console.log("\u{1F5D1}\uFE0F Deleted flowchart group:", groupId, {
        nodesRemoved: groupNodes.length,
        edgesRemoved: groupEdges.length
      });
    }
  };
  const addElementToFlowchart = (elementType, position) => {
    if (!selectedFlowchartGroup)
      return;
    const groupNodes = getFlowchartGroupNodes(selectedFlowchartGroup);
    if (groupNodes.length === 0)
      return;
    const flowchartType = groupNodes[0]?.data?.flowchartType;
    const flowchartName = groupNodes[0]?.data?.flowchartName;
    let newElement;
    switch (elementType) {
      case "decision":
        newElement = {
          id: `decision_${Date.now()}`,
          type: "elementNode",
          position: position || { x: 400, y: 300 },
          data: {
            name: "Decision Point",
            type: "button",
            preview: "New decision point",
            flowchartGroup: selectedFlowchartGroup,
            flowchartType,
            flowchartName
          }
        };
        break;
      case "outcome":
        newElement = {
          id: `outcome_${Date.now()}`,
          type: "layoutNode",
          position: position || { x: 400, y: 300 },
          data: {
            name: "Outcome",
            type: "frame",
            width: 150,
            height: 80,
            backgroundColor: "#dcfce7",
            borderColor: "#16a34a",
            flowchartGroup: selectedFlowchartGroup,
            flowchartType,
            flowchartName
          }
        };
        break;
      case "process":
        newElement = {
          id: `process_${Date.now()}`,
          type: "layoutNode",
          position: position || { x: 400, y: 300 },
          data: {
            name: "Process",
            type: "frame",
            width: 180,
            height: 100,
            backgroundColor: "#dbeafe",
            borderColor: "#2563eb",
            flowchartGroup: selectedFlowchartGroup,
            flowchartType,
            flowchartName
          }
        };
        break;
      case "text":
        newElement = {
          id: `text_${Date.now()}`,
          type: "textNode",
          position: position || { x: 400, y: 300 },
          data: {
            name: "Text Label",
            type: "text",
            content: "New Text",
            fontSize: 14,
            fontFamily: "Inter",
            color: "#374151",
            backgroundColor: "transparent",
            formats: {},
            flowchartGroup: selectedFlowchartGroup,
            flowchartType,
            flowchartName,
            workspaceId: workspace?.workspaceId
          }
        };
        break;
      default:
        return;
    }
    setNodes((nds) => nds.concat(newElement));
    console.log("\u2795 Added new element to flowchart:", {
      elementType,
      groupId: selectedFlowchartGroup,
      elementId: newElement.id
    });
  };
  const onPaneClick = useCallback((event) => {
    if (isTextModeActive && reactFlowInstance) {
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });
      const newTextNode = {
        id: `text_${Date.now()}`,
        type: "textNode",
        position,
        selected: true,
        data: {
          name: "Text",
          type: "text",
          caption: true,
          content: "",
          fontSize: textModeConfig?.fontSize || "14",
          fontFamily: textModeConfig?.fontFamily || "Arial",
          color: textModeConfig?.color || "#111827",
          backgroundColor: "transparent",
          formats: [],
          workspaceId: workspace?.workspaceId
        }
      };
      markTextNodeForFocus(newTextNode.id);
      setNodes((nds) => [
        ...nds.map((n) => n.selected ? { ...n, selected: false } : n),
        newTextNode
      ]);
      event.stopPropagation();
      return;
    }
    setShowFlowchartToolbar(false);
    setSelectedFlowchartGroup(null);
    setContextMenu({ isVisible: false, position: { x: 0, y: 0 }, selectedNodes: [] });
  }, [isTextModeActive, reactFlowInstance, textModeConfig, setNodes, workspace?.workspaceId]);
  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    event.stopPropagation();
    const currentlySelected = nodes.filter((n) => n.selected);
    let contextSelectedNodes;
    if (!currentlySelected.some((n) => n.id === node.id)) {
      contextSelectedNodes = [node];
      setNodes((nds) => nds.map((n) => ({
        ...n,
        selected: n.id === node.id
      })));
    } else {
      contextSelectedNodes = currentlySelected;
    }
    const menuWidth = 200;
    const menuHeight = 150;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight);
    setContextMenu({
      isVisible: true,
      position: { x, y },
      selectedNodes: contextSelectedNodes
    });
    console.log("\u{1F5B1}\uFE0F Context menu opened for:", contextSelectedNodes.length, "elements");
  }, [nodes, setNodes]);
  const handleContextMenuDuplicate = useCallback(() => {
    if (contextMenu.selectedNodes.length > 0) {
      const originalNodes = nodes.map((n) => ({ ...n }));
      setNodes((nds) => nds.map((n) => ({
        ...n,
        selected: contextMenu.selectedNodes.some((selected) => selected.id === n.id)
      })));
      duplicateSelectedElements();
      setTimeout(() => {
        setNodes(originalNodes);
      }, 100);
    }
  }, [contextMenu.selectedNodes, nodes, setNodes]);
  const handleContextMenuDelete = useCallback(() => {
    if (contextMenu.selectedNodes.length > 0) {
      const deletableNodes = filterDirectlyDeletableNodes(contextMenu.selectedNodes);
      if (deletableNodes.length === 0)
        return;
      const nodeIdsToDelete = deletableNodes.map((n) => n.id);
      deletableNodes.forEach((nodeToDelete) => {
        recordDeletionHistory(nodeToDelete.id, nodeToDelete.data, {
          deletedVia: "context-menu",
          canvasAction: true,
          position: nodeToDelete.position
        });
      });
      const flowchartGroups = /* @__PURE__ */ new Set();
      deletableNodes.forEach((node) => {
        if (node.data?.flowchartGroup) {
          flowchartGroups.add(node.data.flowchartGroup);
        }
      });
      deletableNodes.forEach((n) => emitOpRef.current?.({
        type: "NODE_DELETE",
        nodeId: n.id,
        taskId: taskIdRef.current,
        subtaskId: subtaskIdRef.current
      }));
      if (flowchartGroups.size > 0) {
        flowchartGroups.forEach((groupId) => {
          deleteFlowchartGroup(groupId);
        });
      } else {
        setNodes((nds) => nds.filter((n) => !nodeIdsToDelete.includes(n.id)));
        setEdges((eds) => eds.filter(
          (e) => !nodeIdsToDelete.includes(e.source) && !nodeIdsToDelete.includes(e.target)
        ));
      }
      purgeDeletedFromCanvasCache(nodeIdsToDelete);
      console.log("\u{1F5D1}\uFE0F Deleted elements:", nodeIdsToDelete.length);
    }
  }, [contextMenu.selectedNodes, setNodes, setEdges, deleteFlowchartGroup, recordDeletionHistory, filterDirectlyDeletableNodes, purgeDeletedFromCanvasCache]);
  const handleContextMenuEdit = useCallback(() => {
    if (contextMenu.selectedNodes.length === 1) {
      const node = contextMenu.selectedNodes[0];
      console.log("\u270F\uFE0F Edit element:", node.data?.name || node.data?.type);
    }
  }, [contextMenu.selectedNodes]);
  const handleContextMenuClose = useCallback(() => {
    setContextMenu({ isVisible: false, position: { x: 0, y: 0 }, selectedNodes: [] });
  }, []);
  const duplicateSelectedElements = useCallback(async () => {
    const selectedNodes2 = nodes.filter((node) => node.selected);
    if (selectedNodes2.length === 0) {
      console.log("\u26A0\uFE0F No elements selected for duplication");
      return;
    }
    console.log("\u{1F504} Duplicating elements:", selectedNodes2.length);
    const duplicatedNodes = [];
    const duplicateOffset = 50;
    for (const node of selectedNodes2) {
      const duplicatedNode = createDuplicatedNodeFromSource(node, {
        offsetX: duplicateOffset,
        offsetY: duplicateOffset
      });
      const newPosition = duplicatedNode.position;
      duplicatedNodes.push(duplicatedNode);
      try {
        await trackActivity(
          "element_duplicated",
          "create",
          "element",
          {
            originalElementId: node.id,
            duplicatedElementId: newId,
            elementType: node.data.type || "unknown",
            position: newPosition,
            details: {
              elementName: node.data.name || node.data.type,
              canvasAction: true,
              duplicateOffset
            }
          }
        );
      } catch (error) {
        console.error("\u274C Error tracking duplication activity:", error);
      }
    }
    setNodes((nds) => {
      const updatedNodes = [...nds, ...duplicatedNodes];
      console.log("\u2705 Added duplicated nodes:", duplicatedNodes.length);
      return updatedNodes;
    });
    console.log("\u{1F389} Element duplication completed successfully!");
  }, [nodes, setNodes, trackActivity, createDuplicatedNodeFromSource]);
  useEffect(() => {
    const handleElementDuplicate = (event) => {
      const nodeId = event?.detail?.nodeId;
      if (!nodeId)
        return;
      const sourceNode = nodes.find((node) => node.id === nodeId);
      if (!sourceNode) {
        console.warn("\u26A0\uFE0F Duplicate event received for missing node:", nodeId);
        return;
      }
      const duplicatedNode = createDuplicatedNodeFromSource(sourceNode, {
        offsetX: 50,
        offsetY: 50
      });
      setNodes((nds) => [...nds, duplicatedNode]);
    };
    const handleElementDuplicateToAllSubtasks = async (event) => {
      const nodeId = event?.detail?.nodeId;
      if (!nodeId)
        return;
      if (!workspace?.workspaceId || !selectedTask?.id || !selectedSubtask?.id) {
        setDuplicateToAllState({
          isVisible: true,
          isLoading: false,
          total: 0,
          processed: 0,
          message: "Select a task and subtask before duplicating across subtasks."
        });
        return;
      }
      const sourceNode = nodes.find((node) => node.id === nodeId);
      if (!sourceNode) {
        setDuplicateToAllState({
          isVisible: true,
          isLoading: false,
          total: 0,
          processed: 0,
          message: "Could not find the selected element to duplicate."
        });
        return;
      }
      const sourceTask = (workspace.tasks || []).find((task) => task.id === selectedTask.id) || selectedTask;
      const targetSubtasks = (sourceTask.subtasks || []).filter((subtask) => subtask.id !== selectedSubtask.id);
      if (targetSubtasks.length === 0) {
        setDuplicateToAllState({
          isVisible: true,
          isLoading: false,
          total: 0,
          processed: 0,
          message: "No other subtasks available in this task."
        });
        return;
      }
      setDuplicateToAllState({
        isVisible: true,
        isLoading: true,
        total: targetSubtasks.length,
        processed: 0,
        message: "Duplicating element to all subtasks. Please wait..."
      });
      let successCount = 0;
      let failedCount = 0;
      for (let i = 0; i < targetSubtasks.length; i += 1) {
        const targetSubtask = targetSubtasks[i];
        const targetCanvas = targetSubtask.canvasData || { nodes: [], edges: [], zoomLevel: 100 };
        const targetNodes = targetCanvas.nodes || [];
        const duplicateAlreadyExists = targetNodes.some(
          (node) => node?.data?.duplicateSourceNodeId === sourceNode.id && node?.data?.duplicateSourceSubtaskId === selectedSubtask.id
        );
        if (duplicateAlreadyExists) {
          setDuplicateToAllState((prev) => ({
            ...prev,
            processed: Math.min(prev.total, prev.processed + 1)
          }));
          continue;
        }
        const duplicatedNode = createDuplicatedNodeFromSource(sourceNode, {
          offsetX: 40 + i % 3 * 20,
          offsetY: 40 + i % 3 * 20,
          copiedFromSubtaskId: selectedSubtask.id,
          copiedFromSubtaskName: selectedSubtask.name
        });
        duplicatedNode.data = {
          ...duplicatedNode.data,
          copiedToSubtaskId: targetSubtask.id,
          copiedToSubtaskName: targetSubtask.name,
          duplicatedAcrossSubtasks: true
        };
        try {
          const response = await fetch(
            `/api/workspaces/${workspace.workspaceId}/tasks/${selectedTask.id}/subtasks/${targetSubtask.id}/canvas`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                nodes: [...targetNodes, duplicatedNode],
                edges: targetCanvas.edges || [],
                zoomLevel: targetCanvas.zoomLevel || 100
              })
            }
          );
          if (!response.ok) {
            failedCount += 1;
            setDuplicateToAllState((prev) => ({
              ...prev,
              processed: Math.min(prev.total, prev.processed + 1)
            }));
            continue;
          }
          successCount += 1;
          setDuplicateToAllState((prev) => ({
            ...prev,
            processed: Math.min(prev.total, prev.processed + 1)
          }));
        } catch (error) {
          console.error("\u274C Failed duplicating node to subtask:", targetSubtask.id, error);
          failedCount += 1;
          setDuplicateToAllState((prev) => ({
            ...prev,
            processed: Math.min(prev.total, prev.processed + 1)
          }));
        }
      }
      try {
        await trackActivity(
          "element_duplicated_to_all_subtasks",
          "update",
          "element",
          {
            elementId: sourceNode.id,
            elementType: sourceNode?.data?.type || "unknown",
            details: {
              sourceTaskId: selectedTask.id,
              sourceSubtaskId: selectedSubtask.id,
              copiedCount: successCount,
              failedCount
            }
          }
        );
      } catch (error) {
        console.error("\u274C Failed to track duplicate-to-all-subtasks activity:", error);
      }
      if (typeof onRefreshWorkspace === "function") {
        await onRefreshWorkspace();
      }
      if (successCount > 0 && failedCount === 0) {
        setDuplicateToAllState((prev) => ({
          ...prev,
          isLoading: false,
          processed: prev.total,
          message: `Element duplicated to ${successCount} subtasks.`
        }));
      } else if (successCount > 0) {
        setDuplicateToAllState((prev) => ({
          ...prev,
          isLoading: false,
          processed: prev.total,
          message: `Element duplicated to ${successCount} subtasks. ${failedCount} failed.`
        }));
      } else {
        setDuplicateToAllState((prev) => ({
          ...prev,
          isLoading: false,
          processed: prev.total,
          message: "Could not duplicate the element to other subtasks."
        }));
      }
    };
    window.addEventListener("element-duplicate", handleElementDuplicate);
    window.addEventListener("element-duplicate-to-all-subtasks", handleElementDuplicateToAllSubtasks);
    return () => {
      window.removeEventListener("element-duplicate", handleElementDuplicate);
      window.removeEventListener("element-duplicate-to-all-subtasks", handleElementDuplicateToAllSubtasks);
    };
  }, [
    nodes,
    setNodes,
    workspace?.workspaceId,
    workspace?.tasks,
    selectedTask,
    selectedSubtask,
    createDuplicatedNodeFromSource,
    setDuplicateToAllState,
    onRefreshWorkspace,
    trackActivity
  ]);
  const onNodeClick = useCallback((event, node) => {
    event.stopPropagation();
    if (node?.data?.type === "procurement-rfq-request" && node?.data?.procurementRFQData) {
      setSelectedProcurementRFQNode(node.data);
      setShowProcurementRFQDetailsModal(true);
      return;
    }
    if (node?.data?.type === "execution-request" && node?.data?.executionRequestData) {
      setSelectedExecutionRequestNode(node.data);
      setShowExecutionRequestDetailsModal(true);
      return;
    }
    if (isSelectionMode) {
      handleManualNodeSelection(node.id);
      return;
    }
    if (node.data?.flowchartGroup) {
      if (event.ctrlKey || event.metaKey) {
        return;
      }
      selectFlowchartGroup(node.data.flowchartGroup);
    }
  }, [isSelectionMode, handleManualNodeSelection]);
  const handleEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    openEdgeLabelModal(edge.id, edge.data?.label || "");
  }, [openEdgeLabelModal]);
  const [helperLines, setHelperLines] = useState({ horizontal: null, vertical: null });
  const [aiReview, setAiReview] = useState(null);
  const aiGenTimersRef = useRef([]);
  const getNodeSize = useCallback((n) => ({
    w: n.width ?? n.measured?.width ?? n.style?.width ?? 200,
    h: n.height ?? n.measured?.height ?? n.style?.height ?? 150
  }), []);
  const handleNodeDrag = useCallback((event, node) => {
    const { w, h } = getNodeSize(node);
    const zoom = reactFlowInstance?.getZoom?.() || 1;
    const threshold = 6 / zoom;
    const d = {
      xs: [node.position.x, node.position.x + w / 2, node.position.x + w],
      ys: [node.position.y, node.position.y + h / 2, node.position.y + h]
    };
    let vertical = null;
    let horizontal = null;
    for (const other of nodes) {
      if (other.id === node.id)
        continue;
      const os = getNodeSize(other);
      const o = {
        xs: [other.position.x, other.position.x + os.w / 2, other.position.x + os.w],
        ys: [other.position.y, other.position.y + os.h / 2, other.position.y + os.h]
      };
      for (const dx of d.xs) {
        for (const ox of o.xs) {
          if (Math.abs(dx - ox) < threshold)
            vertical = ox;
        }
      }
      for (const dy of d.ys) {
        for (const oy of o.ys) {
          if (Math.abs(dy - oy) < threshold)
            horizontal = oy;
        }
      }
      if (vertical != null && horizontal != null)
        break;
    }
    setHelperLines(
      (prev) => prev.vertical === vertical && prev.horizontal === horizontal ? prev : { vertical, horizontal }
    );
  }, [nodes, reactFlowInstance, getNodeSize]);
  const handleNodeDragStop = useCallback(() => {
    setHelperLines({ horizontal: null, vertical: null });
    batcherRef.current?.flush();
    canvasWebSocket?.emitOperation?.({ type: "FLUSH" });
  }, [canvasWebSocket]);
  const alignSelectedNodes = useCallback((mode) => {
    if (!canEdit) {
      notifyViewOnly("align elements");
      return;
    }
    const sel = nodes.filter((n) => n.selected);
    if (sel.length < 2)
      return;
    pushToHistory();
    const sizes = {};
    sel.forEach((n) => {
      sizes[n.id] = getNodeSize(n);
    });
    const minX = Math.min(...sel.map((n) => n.position.x));
    const maxX = Math.max(...sel.map((n) => n.position.x + sizes[n.id].w));
    const minY = Math.min(...sel.map((n) => n.position.y));
    const maxY = Math.max(...sel.map((n) => n.position.y + sizes[n.id].h));
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const newPositions = {};
    if (mode === "distributeH" || mode === "distributeV") {
      const axis = mode === "distributeH" ? "x" : "y";
      const sizeKey = mode === "distributeH" ? "w" : "h";
      const sorted = [...sel].sort((a, b) => a.position[axis] - b.position[axis]);
      if (sorted.length > 2) {
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const start = first.position[axis] + sizes[first.id][sizeKey] / 2;
        const end = last.position[axis] + sizes[last.id][sizeKey] / 2;
        const step = (end - start) / (sorted.length - 1);
        sorted.forEach((n, i) => {
          newPositions[n.id] = mode === "distributeH" ? { x: start + step * i - sizes[n.id].w / 2, y: n.position.y } : { x: n.position.x, y: start + step * i - sizes[n.id].h / 2 };
        });
      }
    } else {
      sel.forEach((n) => {
        const { w, h } = sizes[n.id];
        const pos = { ...n.position };
        if (mode === "left")
          pos.x = minX;
        else if (mode === "centerH")
          pos.x = midX - w / 2;
        else if (mode === "right")
          pos.x = maxX - w;
        else if (mode === "top")
          pos.y = minY;
        else if (mode === "centerV")
          pos.y = midY - h / 2;
        else if (mode === "bottom")
          pos.y = maxY - h;
        newPositions[n.id] = pos;
      });
    }
    if (Object.keys(newPositions).length === 0)
      return;
    setNodes((nds) => nds.map((n) => newPositions[n.id] ? { ...n, position: newPositions[n.id] } : n));
    Object.entries(newPositions).forEach(([nodeId, position]) => {
      emitOp(createNodeMoveOp(nodeId, position, selectedTask?.id, selectedSubtask?.id));
    });
  }, [nodes, setNodes, canEdit, notifyViewOnly, pushToHistory, getNodeSize, emitOp, selectedTask?.id, selectedSubtask?.id]);
  const handleTidyCanvas = useCallback(() => {
    if (!canEdit) {
      notifyViewOnly("rearrange canvas");
      return;
    }
    if (nodes.length < 2)
      return;
    pushToHistory();
    const gap = 60;
    const sizes = {};
    nodes.forEach((n) => {
      sizes[n.id] = getNodeSize(n);
    });
    const maxW = Math.max(...nodes.map((n) => sizes[n.id].w));
    const maxH = Math.max(...nodes.map((n) => sizes[n.id].h));
    const startX = Math.min(...nodes.map((n) => n.position.x));
    const startY = Math.min(...nodes.map((n) => n.position.y));
    const sorted = [...nodes].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
    const cols = Math.max(1, Math.ceil(Math.sqrt(sorted.length)));
    const newPositions = {};
    sorted.forEach((n, i) => {
      newPositions[n.id] = {
        x: startX + i % cols * (maxW + gap),
        y: startY + Math.floor(i / cols) * (maxH + gap)
      };
    });
    setNodes((nds) => nds.map((n) => newPositions[n.id] ? { ...n, position: newPositions[n.id] } : n));
    Object.entries(newPositions).forEach(([nodeId, position]) => {
      emitOp(createNodeMoveOp(nodeId, position, selectedTask?.id, selectedSubtask?.id));
    });
    toast?.success?.("Canvas arranged into a grid");
  }, [nodes, setNodes, canEdit, notifyViewOnly, pushToHistory, getNodeSize, emitOp, selectedTask?.id, selectedSubtask?.id, toast]);
  const handleExportCanvas = useCallback(async (format) => {
    const container = canvasContainerRef.current;
    if (!container)
      return;
    const target = container.querySelector(".react-flow__viewport") || container;
    const waitForPaint = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const previousViewport = reactFlowInstance?.getViewport?.();
    try {
      toast?.info?.(format === "pdf" ? "Generating PDF\u2026" : "Exporting canvas\u2026");
      if (nodes.length > 0 && reactFlowInstance?.fitView) {
        await reactFlowInstance.fitView({ padding: 0.12, includeHiddenNodes: true, duration: 0 });
        await waitForPaint();
      }
      if (format === "pdf") {
        await exportCanvasAsPdf(target);
        toast?.success?.("Canvas exported as PDF");
      } else {
        await exportCanvasAsPng(target);
        toast?.success?.("Canvas exported as PNG");
      }
    } catch (err) {
      console.error("\u274C Canvas export failed:", err);
      toast?.error?.("Failed to export canvas");
    } finally {
      if (previousViewport && reactFlowInstance?.setViewport) {
        try {
          await reactFlowInstance.setViewport(previousViewport, { duration: 0 });
        } catch (e) {
        }
      }
    }
  }, [reactFlowInstance, nodes.length, toast]);
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (!canEdit)
        return;
      const isInputElement = event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.contentEditable === "true";
      const isInsideInput = event.target.closest('input, textarea, [contenteditable="true"]');
      if (isInputElement || isInsideInput) {
        return;
      }
      if (event.key === "Delete") {
        const selectedNodes2 = nodes.filter((node) => node.selected);
        const flowchartGroups = /* @__PURE__ */ new Set();
        selectedNodes2.forEach((node) => {
          if (node.data?.flowchartGroup) {
            flowchartGroups.add(node.data.flowchartGroup);
          }
        });
        flowchartGroups.forEach((groupId) => {
          deleteFlowchartGroup(groupId);
        });
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "d") {
        event.preventDefault();
        duplicateSelectedElements();
      }
    };
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [nodes, edges, canEdit, notifyViewOnly]);
  const handleZoomIn = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn();
      console.log("\u{1F50D} Zoom In clicked");
    }
  };
  const handleZoomOut = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut();
      console.log("\u{1F50D} Zoom Out clicked");
    }
  };
  const handleFitView = () => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.1 });
      console.log("\u{1F4D0} Fit View clicked");
    }
  };
  const addProcurementRFQNodeToCanvas = useCallback(async (payload) => {
    if (!payload || !payload.request)
      return;
    const basePosition = {
      x: window.innerWidth / 2 - 220,
      y: window.innerHeight / 2 - 160
    };
    const targetPosition = getAutoPlacementPosition(basePosition);
    const productName = payload?.rfqFormData?.productDetails?.productName || payload?.request?.item || "RFQ Item";
    const requestId = payload?.request?.requestId || `RFQ-${Date.now()}`;
    const quantity = payload?.request?.quantity || payload?.rfqFormData?.quantityPricing?.quantity || 1;
    const element = {
      id: "procurement-rfq-request",
      name: `Procurement RFQ ${requestId}`,
      type: "procurement-rfq-request",
      preview: `${productName} x ${quantity}`
    };
    const newNode = createElementNode(element, targetPosition);
    newNode.data.procurementRFQData = payload;
    newNode.data.requestId = requestId;
    newNode.data.requestStatus = payload?.request?.status || "Pending";
    newNode.data.category = "procurement";
    setNodes((nds) => nds.concat(newNode));
    await trackActivity("element_added", "create", "element", {
      elementId: newNode.id,
      elementType: "procurement-rfq-request",
      position: targetPosition,
      details: {
        elementName: element.name,
        requestId,
        productName,
        quantity,
        canvasAction: true,
        addedVia: "procurement-rfq-template"
      }
    });
  }, [createElementNode, getAutoPlacementPosition, setNodes, trackActivity]);
  const addExecutionRequestNodeToCanvas = useCallback(async (payload) => {
    const request = payload?.executionRequest;
    if (!request)
      return;
    const basePosition = {
      x: window.innerWidth / 2 - 220,
      y: window.innerHeight / 2 - 120
    };
    const targetPosition = getAutoPlacementPosition(basePosition);
    const requestId = request.requestId || `EXE-${Date.now()}`;
    const element = {
      id: "execution-request",
      name: `${request.templateType || "execution"} \u2022 ${requestId}`,
      type: "execution-request",
      preview: `${request.title || "Execution request"} \u2022 ${request.status || "Open"}`
    };
    const newNode = createElementNode(element, targetPosition);
    newNode.data.executionRequestData = payload;
    newNode.data.requestId = requestId;
    newNode.data.requestStatus = request.status || "Open";
    newNode.data.category = "execution";
    setNodes((nds) => nds.concat(newNode));
    await trackActivity("element_added", "create", "element", {
      elementId: newNode.id,
      elementType: "execution-request",
      position: targetPosition,
      details: {
        elementName: element.name,
        requestId,
        requestType: request.templateType,
        title: request.title,
        status: request.status,
        canvasAction: true,
        addedVia: "execution-template"
      }
    });
  }, [createElementNode, getAutoPlacementPosition, setNodes, trackActivity]);
  const addDrawingFilesToCanvas = useCallback(async (uploadedFiles = [], options = {}) => {
    if (!Array.isArray(uploadedFiles) || uploadedFiles.length === 0)
      return;
    const imageExtensions = ["jpg", "jpeg", "png", "webp", "bmp", "gif", "tif", "tiff"];
    const classifyAsImage = (file) => {
      const mimeType = String(file?.fileType || "").toLowerCase();
      if (mimeType.startsWith("image/"))
        return true;
      const extension = String(file?.fileName || "").split(".").pop()?.toLowerCase();
      return imageExtensions.includes(extension);
    };
    const basePosition = {
      x: window.innerWidth / 2 - 240,
      y: window.innerHeight / 2 - 180
    };
    const createdNodes = uploadedFiles.map((file, index) => {
      const targetPosition = getAutoPlacementPosition({
        x: basePosition.x + index % 3 * 40,
        y: basePosition.y + Math.floor(index / 3) * 60
      });
      const isImage = classifyAsImage(file);
      if (isImage) {
        const imageBlockData = {
          imageUrl: file.s3Url,
          caption: file.fileName,
          timestamp: file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : "",
          geotag: "",
          annotations: [],
          fileId: file.fileId,
          fileType: file.fileType,
          fileSize: file.fileSize,
          s3Key: file.s3Key
        };
        const imageElement = {
          id: "image-block",
          name: `Drawing: ${file.fileName}`,
          type: "image-block",
          preview: file.fileName,
          imageBlockData
        };
        const imageNode = createElementNode(imageElement, targetPosition, { imageBlockData });
        imageNode.data.linkedFile = {
          fileId: file.fileId,
          fileName: file.fileName,
          fileType: file.fileType,
          fileSize: file.fileSize,
          s3Key: file.s3Key,
          s3Url: file.s3Url,
          uploadedAt: file.uploadedAt,
          taskId: file.taskId || selectedTask?.id || null,
          subtaskId: file.subtaskId || selectedSubtask?.id || null
        };
        imageNode.data.category = "drawing";
        return imageNode;
      }
      const fileData = {
        fileId: file.fileId,
        name: file.fileName,
        size: file.fileSize,
        type: file.fileType,
        s3Key: file.s3Key,
        url: file.s3Url,
        uploadedAt: file.uploadedAt
      };
      const fileElement = {
        id: "file",
        name: `File: ${file.fileName}`,
        type: "file",
        preview: file.fileName,
        fileData
      };
      const fileNode = createElementNode(fileElement, targetPosition, { fileData });
      fileNode.data.linkedFile = {
        fileId: file.fileId,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: file.fileSize,
        s3Key: file.s3Key,
        s3Url: file.s3Url,
        uploadedAt: file.uploadedAt,
        taskId: file.taskId || selectedTask?.id || null,
        subtaskId: file.subtaskId || selectedSubtask?.id || null
      };
      fileNode.data.category = "attachment";
      return fileNode;
    });
    setNodes((nds) => nds.concat(createdNodes));
    await trackActivity("element_added", "create", "element", {
      elementId: createdNodes[0]?.id,
      elementType: "file-upload-batch",
      position: createdNodes[0]?.position,
      details: {
        source: options?.source || "workspace-file-upload",
        count: createdNodes.length,
        taskId: selectedTask?.id,
        subtaskId: selectedSubtask?.id,
        fileNames: uploadedFiles.map((file) => file.fileName)
      }
    });
  }, [createElementNode, getAutoPlacementPosition, selectedTask?.id, selectedSubtask?.id, setNodes, trackActivity]);
  const undoPenStroke = useCallback(() => {
    setDrawingPaths((prev) => prev.slice(0, -1));
  }, []);
  const clearPenDrawings = useCallback(() => {
    setDrawingPaths([]);
  }, []);
  const setDrawingMode = useCallback((active) => {
    const enabled = Boolean(active);
    setIsPenMode(enabled);
    if (!enabled) {
      stopPenDrawing();
    }
  }, [stopPenDrawing]);
  const setDrawingToolSettings = useCallback((settings = {}) => {
    if (typeof settings.color === "string" && settings.color.trim()) {
      setPenColor(settings.color);
    }
    if (Number.isFinite(settings.thickness)) {
      setPenThickness(Math.max(1, Math.min(12, Number(settings.thickness))));
    }
  }, []);
  useImperativeHandle(ref, () => ({
    zoomIn: handleZoomIn,
    zoomOut: handleZoomOut,
    fitView: handleFitView,
    setZoomLevel: handleSetZoomLevel,
    getNodes: () => nodes,
    getEdges: () => edges,
    addProcurementRFQNode: addProcurementRFQNodeToCanvas,
    addExecutionRequestNode: addExecutionRequestNodeToCanvas,
    addDrawingFilesToCanvas,
    setDrawingMode,
    setDrawingToolSettings,
    clearPenDrawings,
    undoPenStroke
  }));
  useEffect(() => {
    const handler = () => handleFitView();
    document.addEventListener("canvasFitView", handler);
    return () => document.removeEventListener("canvasFitView", handler);
  }, [reactFlowInstance]);
  useEffect(() => {
    if (!selectedSubtask?.id)
      return;
    const pendingRaw = sessionStorage.getItem("pendingProcurementRFQNode");
    if (!pendingRaw)
      return;
    try {
      const pending = JSON.parse(pendingRaw);
      if (pending?.payload?.request) {
        addProcurementRFQNodeToCanvas(pending.payload);
      }
      sessionStorage.removeItem("pendingProcurementRFQNode");
    } catch (error) {
      console.warn("Could not parse pending procurement RFQ node payload:", error);
      sessionStorage.removeItem("pendingProcurementRFQNode");
    }
  }, [selectedSubtask?.id, addProcurementRFQNodeToCanvas]);
  useEffect(() => {
    if (!selectedSubtask?.id)
      return;
    const pendingRaw = sessionStorage.getItem("pendingExecutionRequestNode");
    if (!pendingRaw)
      return;
    try {
      const pending = JSON.parse(pendingRaw);
      if (pending?.payload?.executionRequest) {
        addExecutionRequestNodeToCanvas(pending.payload);
      }
      sessionStorage.removeItem("pendingExecutionRequestNode");
    } catch (error) {
      console.warn("Could not parse pending execution request payload:", error);
      sessionStorage.removeItem("pendingExecutionRequestNode");
    }
  }, [selectedSubtask?.id, addExecutionRequestNodeToCanvas]);
  const onViewportChange = useCallback((viewport) => {
    updateZoomLevel(Math.round(viewport.zoom * 100));
  }, [updateZoomLevel]);
  useEffect(() => {
    const handleTextElementDrop = (event) => {
      if (!canEdit) {
        notifyViewOnly("text element add");
        return;
      }
      const textData = event.detail;
      console.log("\u{1F4DD} Text element drop event received:", textData);
      const newNode = {
        id: `text_${Date.now()}`,
        type: "textNode",
        position: { x: 250, y: 150 },
        // Center position
        data: {
          name: textData.name,
          type: textData.type,
          preview: textData.preview,
          content: textData.content,
          fontSize: textData.fontSize,
          fontFamily: textData.fontFamily,
          color: textData.color,
          backgroundColor: textData.backgroundColor,
          formats: textData.formats,
          workspaceId: workspace?.workspaceId
        }
      };
      console.log("\u{1F195} Adding text node:", newNode);
      setNodes((nds) => nds.concat(newNode));
    };
    document.addEventListener("textElementDrop", handleTextElementDrop);
    return () => {
      document.removeEventListener("textElementDrop", handleTextElementDrop);
    };
  }, [setNodes, canEdit, notifyViewOnly]);
  useEffect(() => {
    const sanitizeColumnName = (name, index) => {
      const base = String(name || `Column ${index + 1}`).trim();
      return base.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() || `col_${index + 1}`;
    };
    const convertTableToCustomData = (table) => {
      const columns = (table.headers || []).map((h, idx) => sanitizeColumnName(h, idx));
      const data = (table.rows || []).map((row, rIdx) => {
        const obj = { id: rIdx + 1 };
        columns.forEach((col, cIdx) => {
          obj[col] = row[cIdx] !== void 0 && row[cIdx] !== null ? String(row[cIdx]) : "";
        });
        return obj;
      });
      return { columns, data, sheetName: table.sheetName, originalName: table.name };
    };
    const addOneTable = async (table, index = 0) => {
      const baseX = window.innerWidth / 2 - 250;
      const baseY = window.innerHeight / 2 - 180;
      const offset = 40;
      const position = { x: baseX + index % 3 * offset, y: baseY + Math.floor(index / 3) * offset };
      const element = {
        id: "basic-table",
        name: table.name || table.sheetName || "Imported Table",
        type: "table",
        preview: `${(table.rows || []).length} rows \xD7 ${(table.headers || []).length} columns`
      };
      const customData = convertTableToCustomData(table);
      const newNode = createElementNode(element, position, customData);
      setNodes((nds) => nds.concat(newNode));
      try {
        await trackActivity(
          "element_added",
          "create",
          "element",
          {
            elementId: newNode.id,
            elementType: "table",
            position,
            details: {
              elementName: element.name,
              canvasAction: true,
              addedVia: "boq-modal",
              rows: (table.rows || []).length,
              columns: (table.headers || []).length
            }
          }
        );
      } catch (e) {
        console.error("\u274C Error tracking table add activity:", e);
      }
    };
    const handleAddTableToCanvas = async (event) => {
      if (!canEdit) {
        notifyViewOnly("table add");
        return;
      }
      const table = event.detail;
      if (!table)
        return;
      await addOneTable(table, 0);
    };
    const handleAddTablesToCanvas = async (event) => {
      if (!canEdit) {
        notifyViewOnly("tables add");
        return;
      }
      const tables = event.detail?.tables || [];
      for (let i = 0; i < tables.length; i++) {
        await addOneTable(tables[i], i);
      }
    };
    document.addEventListener("addTableToCanvas", handleAddTableToCanvas);
    document.addEventListener("addTablesToCanvas", handleAddTablesToCanvas);
    return () => {
      document.removeEventListener("addTableToCanvas", handleAddTableToCanvas);
      document.removeEventListener("addTablesToCanvas", handleAddTablesToCanvas);
    };
  }, [setNodes, trackActivity, canEdit, notifyViewOnly]);
  useEffect(() => {
    const handleUngroupElements = (event) => {
      if (!canEdit) {
        notifyViewOnly("ungroup");
        return;
      }
      const { groupedNodeId, originalNodes } = event.detail;
      console.log("\u{1F4E5} Ungroup event received:", { groupedNodeId, originalNodes });
      if (!groupedNodeId || !originalNodes)
        return;
      const groupedNode = nodes.find((node) => node.id === groupedNodeId);
      if (!groupedNode)
        return;
      const restoredNodes = originalNodes.map((originalNode, index) => {
        const offsetX = index % 3 * 150;
        const offsetY = Math.floor(index / 3) * 120;
        return {
          ...originalNode,
          id: `${originalNode.id}_restored_${Date.now()}`,
          // New unique ID
          position: {
            x: groupedNode.position.x + offsetX,
            y: groupedNode.position.y + offsetY
          },
          data: {
            ...originalNode.data,
            // Remove selection mode data
            isManuallySelected: false,
            isInSelectionMode: false
          }
        };
      });
      setNodes((currentNodes) => {
        const filteredNodes = currentNodes.filter((node) => node.id !== groupedNodeId);
        return [...filteredNodes, ...restoredNodes];
      });
      console.log("\u2705 Elements ungrouped successfully:", restoredNodes.length);
    };
    document.addEventListener("ungroupElements", handleUngroupElements);
    return () => {
      document.removeEventListener("ungroupElements", handleUngroupElements);
    };
  }, [nodes, setNodes, canEdit, notifyViewOnly]);
  useEffect(() => {
    const handleEditTurnkeyWorkflow = (event) => {
      if (!canEdit) {
        notifyViewOnly("turnkey workflow edit");
        return;
      }
      const { nodeId, data } = event.detail;
      setPendingTurnkeyElement({
        ...data,
        nodeId
        // Store the node ID for updating later
      });
      setPendingPosition(null);
      setShowTurnkeyModal(true);
    };
    document.addEventListener("editTurnkeyWorkflow", handleEditTurnkeyWorkflow);
    return () => {
      document.removeEventListener("editTurnkeyWorkflow", handleEditTurnkeyWorkflow);
    };
  }, [canEdit, notifyViewOnly]);
  useEffect(() => {
    const handleElementDoubleClick = (event) => {
      if (!canEdit) {
        notifyViewOnly("element add");
        return;
      }
      const element = event.detail;
      console.log("\u{1F5B1}\uFE0F Element double-click event received:", element);
      console.log("\u{1F50D} Element category:", element?.category);
      console.log("\u{1F50D} Element type:", element?.type);
      const centerX = window.innerWidth / 2 - 200;
      const centerY = window.innerHeight / 2 - 150;
      const basePosition = { x: centerX, y: centerY };
      const targetPosition = getAutoPlacementPosition(basePosition);
      if (isTableElement(element)) {
        console.log("\u{1F4CA} Table element detected, showing configuration modal");
        setPendingTableElement(element);
        setPendingPosition(targetPosition);
        setShowTableModal(true);
        return;
      }
      if (isChartElement(element)) {
        console.log("\u{1F4C8} Chart element detected, showing configuration modal");
        setPendingChartElement(element);
        setPendingPosition(targetPosition);
        setShowChartModal(true);
        return;
      }
      console.log("\u{1F50D} Checking turnkey workflow:", {
        elementType: element?.type,
        elementElementType: element?.elementType,
        elementId: element?.id,
        isTurnkeyWorkflow: element?.type === "turnkey-workflow" || element?.elementType === "turnkey-workflow"
      });
      if (element?.type === "turnkey-workflow" || element?.elementType === "turnkey-workflow" || element?.id === "turnkey-workflow") {
        console.log("\u{1F527} Turnkey workflow element detected, showing configuration modal");
        setPendingTurnkeyElement(element);
        setPendingPosition(targetPosition);
        setShowTurnkeyModal(true);
        return;
      }
      if (isListElement(element)) {
        console.log("\u{1F4DD} List element detected, showing configuration modal");
        setPendingListElement(element);
        setPendingPosition(targetPosition);
        setShowListModal(true);
        return;
      }
      if (isLayoutElement(element)) {
        console.log("\u{1F3D7}\uFE0F Layout element detected, showing configuration modal");
        setPendingLayoutElement(element);
        setPendingPosition(targetPosition);
        setShowLayoutModal(true);
        return;
      }
      if (isFlowchartElement(element)) {
        console.log("\u{1F504} Flowchart element detected, creating template");
        createFlowchartTemplate(element, targetPosition);
        return;
      }
      if (element.category === "turnkey" || element.type?.startsWith("turnkey-")) {
        console.log("\u{1F3AF} Turnkey element detected, creating turnkey node");
        const newNode2 = createElementNode(element, targetPosition);
        console.log("\u{1F195} Adding turnkey element:", newNode2);
        setNodes((nds) => nds.concat(newNode2));
        autoConnectNewNode(newNode2);
        return;
      }
      if (element.type === "image-block") {
        console.log("\u{1F5BC}\uFE0F Image block element detected, creating default block");
        const imageBlockData = JSON.parse(JSON.stringify(element.imageBlockData || {}));
        const newNode2 = createElementNode(element, targetPosition, { imageBlockData });
        setNodes((nds) => nds.concat(newNode2));
        autoConnectNewNode(newNode2);
        trackActivity("element_added", "create", "element", {
          elementId: newNode2.id,
          elementType: element.type,
          position: targetPosition,
          details: {
            elementName: element.name,
            canvasAction: true,
            imageBlockData
          }
        });
        return;
      }
      if (element.type === "task-card" || element.type === "task-card-progress") {
        console.log("\u{1F4DD} Task card element detected, creating default card");
        const taskCardData = element.taskCardData || pendingTaskCardInitialData || {};
        const newNode2 = createElementNode(element, targetPosition, { taskCardData });
        setNodes((nds) => nds.concat(newNode2));
        autoConnectNewNode(newNode2);
        trackActivity("element_added", "create", "element", {
          elementId: newNode2.id,
          elementType: element.type,
          position: targetPosition,
          details: {
            elementName: element.name,
            canvasAction: true,
            taskData: taskCardData
          }
        });
        return;
      }
      const newNode = createElementNode(element, targetPosition);
      console.log("\u{1F195} Adding element from double-click:", newNode);
      setNodes((nds) => nds.concat(newNode));
      autoConnectNewNode(newNode);
      setTimeout(() => {
        console.log("\u2728 Element successfully added to canvas via double-click");
      }, 100);
    };
    document.addEventListener("elementDoubleClick", handleElementDoubleClick);
    return () => {
      document.removeEventListener("elementDoubleClick", handleElementDoubleClick);
    };
  }, [getAutoPlacementPosition, setNodes, canEdit, notifyViewOnly]);
  useEffect(() => {
    const handleAddProcurementRFQNode = async (event) => {
      if (!canEdit) {
        notifyViewOnly("procurement RFQ node add");
        return;
      }
      await addProcurementRFQNodeToCanvas(event.detail);
    };
    document.addEventListener("addProcurementRFQNode", handleAddProcurementRFQNode);
    return () => {
      document.removeEventListener("addProcurementRFQNode", handleAddProcurementRFQNode);
    };
  }, [addProcurementRFQNodeToCanvas, canEdit, notifyViewOnly]);
  useEffect(() => {
    const handleAddExecutionRequestNode = async (event) => {
      if (!canEdit) {
        notifyViewOnly("execution request node add");
        return;
      }
      await addExecutionRequestNodeToCanvas(event.detail);
    };
    document.addEventListener("addExecutionRequestNode", handleAddExecutionRequestNode);
    return () => {
      document.removeEventListener("addExecutionRequestNode", handleAddExecutionRequestNode);
    };
  }, [addExecutionRequestNodeToCanvas, canEdit, notifyViewOnly]);
  useEffect(() => {
    const handleOpenRequestDetails = (event) => {
      const { nodeId, requestType } = event.detail || {};
      if (!nodeId || !requestType)
        return;
      const matchedNode = nodes.find((node) => node.id === nodeId);
      if (!matchedNode)
        return;
      if (requestType === "procurement-rfq-request" && matchedNode.data?.procurementRFQData) {
        setSelectedProcurementRFQNode(matchedNode.data);
        setShowProcurementRFQDetailsModal(true);
      }
      if (requestType === "execution-request" && matchedNode.data?.executionRequestData) {
        setSelectedExecutionRequestNode(matchedNode.data);
        setShowExecutionRequestDetailsModal(true);
      }
    };
    document.addEventListener("openRequestDetails", handleOpenRequestDetails);
    return () => {
      document.removeEventListener("openRequestDetails", handleOpenRequestDetails);
    };
  }, [nodes]);
  useEffect(() => {
    const handleElementFromCalculator = (event) => {
      if (!canEdit) {
        notifyViewOnly("calculator element add");
        return;
      }
      const element = event.detail;
      console.log("\u{1F4CA} Adding calculator element to canvas:", element);
      const targetPosition = {
        x: window.innerWidth / 2 - 150,
        y: window.innerHeight / 2 - 150
      };
      const newNode = createElementNode(element, targetPosition);
      console.log("\u{1F195} New calculator node created:", newNode);
      isUpdatingNodesLocallyRef.current = true;
      setNodes((nds) => nds.concat(newNode));
      setTimeout(() => {
        isUpdatingNodesLocallyRef.current = false;
        console.log("\u{1F513} Unlocked canvas data updates after calculator node addition");
      }, 100);
      setTimeout(() => {
        console.log("\u2728 Calculator successfully added to canvas");
      }, 100);
    };
    document.addEventListener("elementFromCalculator", handleElementFromCalculator);
    return () => {
      document.removeEventListener("elementFromCalculator", handleElementFromCalculator);
    };
  }, [canEdit, notifyViewOnly]);
  useEffect(() => {
    const handleZoomToElement = (event) => {
      const { elementId } = event.detail;
      console.log("\u{1F50D} Zooming to element:", elementId);
      const targetNode = nodes.find((node) => node.id === elementId);
      if (targetNode && reactFlowInstance) {
        setNodes((nds) => nds.map((node) => ({
          ...node,
          selected: node.id === elementId
        })));
        let x = targetNode.position.x;
        let y = targetNode.position.y;
        let width = targetNode.width || 200;
        let height = targetNode.height || 200;
        if (targetNode.parentNode) {
          const parentNode = nodes.find((n) => n.id === targetNode.parentNode);
          if (parentNode) {
            x += parentNode.position.x;
            y += parentNode.position.y;
            console.log("\u{1F4E6} Element is nested in parent:", { parentId: targetNode.parentNode, parentPos: parentNode.position });
          }
        }
        const position = {
          x: x + width / 2,
          y: y + height / 2
        };
        const targetZoom = 1.5;
        reactFlowInstance.setCenter(position.x, position.y, { zoom: targetZoom, duration: 800 });
        console.log("\u2705 Zoomed to element:", { elementId, position, zoom: targetZoom, isNested: !!targetNode.parentNode });
      } else {
        console.warn("\u274C Element not found or ReactFlow instance not ready:", { elementId, nodeFound: !!targetNode, instanceReady: !!reactFlowInstance });
      }
    };
    document.addEventListener("zoomToElement", handleZoomToElement);
    return () => {
      document.removeEventListener("zoomToElement", handleZoomToElement);
    };
  }, [nodes, setNodes, reactFlowInstance]);
  useEffect(() => {
    const handleUpdateElementName = (event) => {
      if (!canEdit) {
        notifyViewOnly("element rename");
        return;
      }
      const { elementId, newName, lastUpdatedAt, lastUpdatedBy } = event.detail;
      console.log("\u270F\uFE0F Updating element name:", { elementId, newName, lastUpdatedAt });
      setNodes((nds) => nds.map((node) => {
        if (node.id === elementId) {
          return {
            ...node,
            data: {
              ...node.data,
              name: newName,
              lastUpdatedAt: lastUpdatedAt || (/* @__PURE__ */ new Date()).toISOString(),
              lastUpdatedBy: lastUpdatedBy || node.data?.lastUpdatedBy,
              isRecentlyUpdated: true
            }
          };
        }
        return node;
      }));
    };
    document.addEventListener("updateElementName", handleUpdateElementName);
    return () => {
      document.removeEventListener("updateElementName", handleUpdateElementName);
    };
  }, [setNodes, canEdit, notifyViewOnly]);
  useEffect(() => {
    const handleDeleteElement = (event) => {
      if (!canEdit) {
        notifyViewOnly("element delete");
        return;
      }
      const { elementId } = event.detail;
      console.log("\u{1F5D1}\uFE0F Deleting element:", elementId);
      const nodeToDelete = nodes.find((node) => node.id === elementId);
      if (!nodeToDelete)
        return;
      const isEmptyCaption = event.detail?.allowEmptyCaption && nodeToDelete.data?.caption === true;
      if (filterDirectlyDeletableNodes([nodeToDelete]).length === 0 && !isEmptyCaption)
        return;
      const nodeData = nodeToDelete?.data || {};
      const connectedEdges = edges.filter((edge) => edge.source === elementId || edge.target === elementId);
      const connectedEdgeIds = connectedEdges.map((edge) => edge.id);
      setNodes((nds) => nds.filter((node) => node.id !== elementId));
      setEdges((eds) => eds.filter((edge) => edge.source !== elementId && edge.target !== elementId));
      emitOpRef.current?.({
        type: "NODE_DELETE",
        nodeId: elementId,
        taskId: taskIdRef.current,
        subtaskId: subtaskIdRef.current
      });
      purgeDeletedFromCanvasCache([elementId], connectedEdgeIds);
      recordDeletionHistory(elementId, nodeData, {
        deletedVia: "elements-overview",
        canvasAction: true,
        relatedEdges: connectedEdgeIds,
        position: nodeToDelete?.position
      });
      try {
        trackActivity("element_removed", "delete", "element", {
          elementId,
          elementType: nodeData?.type || "unknown",
          details: {
            canvasAction: true,
            deletedVia: "elements-overview",
            elementName: nodeData?.name || "Unnamed",
            connectedEdges: connectedEdgeIds.length
          }
        });
      } catch (e) {
        console.error("\u274C Error tracking delete activity:", e);
      }
    };
    document.addEventListener("deleteElement", handleDeleteElement);
    return () => {
      document.removeEventListener("deleteElement", handleDeleteElement);
    };
  }, [setNodes, setEdges, trackActivity, recordDeletionHistory, nodes, edges, canEdit, notifyViewOnly, filterDirectlyDeletableNodes, purgeDeletedFromCanvasCache]);
  useEffect(() => {
    const handleDeletionRequest = (event) => {
      const nodeId = event.detail?.nodeId;
      if (!nodeId)
        return;
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.type === "elementNode")
        return;
      setDeletionRequestTarget({ nodeId, name: node.data?.name || node.data?.type || "element" });
      setDeletionRequestReason("");
    };
    window.addEventListener("request-element-deletion", handleDeletionRequest);
    return () => window.removeEventListener("request-element-deletion", handleDeletionRequest);
  }, [nodes]);
  const handleSubmitCanvasDeletionRequest = async () => {
    if (!deletionRequestTarget || !deletionRequestReason.trim())
      return;
    setIsSubmittingDeletionRequest(true);
    try {
      const patch = {
        deletionRequested: true,
        deletionRequestedAt: (/* @__PURE__ */ new Date()).toISOString(),
        deletionRequestedBy: currentUser?.name || currentUser?.email || "Unknown User",
        deletionReason: deletionRequestReason.trim()
      };
      await persistNodeDataPatch(
        deletionRequestTarget.nodeId,
        patch,
        setNodes,
        workspace?.workspaceId,
        { bypassApprovalFlow: true }
      );
      notifyWorkspaceEvent({
        workspaceId: workspace?.workspaceId,
        roles: ["pm"],
        excludeUserId: currentUser?.vendorId || currentUser?.userId || currentUser?.pmId || currentUser?.id,
        type: "deletion_request",
        title: "Deletion requested",
        message: `${currentUser?.name || currentUser?.email || "A vendor"} requested deletion of "${deletionRequestTarget.name}"`,
        data: {
          nodeId: deletionRequestTarget.nodeId,
          elementName: deletionRequestTarget.name,
          taskId: taskIdRef.current,
          subtaskId: subtaskIdRef.current
        },
        priority: "high",
        actionRequired: true
      });
      toast.success("Deletion request sent to PM for approval");
      setDeletionRequestTarget(null);
      setDeletionRequestReason("");
    } catch (error) {
      console.error("\u274C Error submitting deletion request:", error);
      toast.error("Failed to submit deletion request");
    } finally {
      setIsSubmittingDeletionRequest(false);
    }
  };
  const pendingFocusNodeRef = useRef(null);
  const [focusTick, setFocusTick] = useState(0);
  useEffect(() => {
    const handler = (e) => {
      pendingFocusNodeRef.current = e.detail?.nodeId || null;
      setFocusTick((t) => t + 1);
    };
    window.addEventListener("focusCanvasNode", handler);
    return () => window.removeEventListener("focusCanvasNode", handler);
  }, []);
  useEffect(() => {
    const nodeId = pendingFocusNodeRef.current;
    if (!nodeId)
      return;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node)
      return;
    pendingFocusNodeRef.current = null;
    setNodesRaw((nds) => nds.map((n) => ({ ...n, selected: n.id === nodeId })));
    const w = node.width ?? node.measured?.width ?? node.style?.width ?? 200;
    const h = node.height ?? node.measured?.height ?? node.style?.height ?? 100;
    reactFlowInstance?.setCenter?.(
      node.position.x + w / 2,
      node.position.y + h / 2,
      { zoom: reactFlowInstance.getZoom?.() || 1, duration: 400 }
    );
  }, [nodes, focusTick, reactFlowInstance, setNodesRaw]);
  useEffect(() => {
    const handleToggleLockElement = (event) => {
      if (!canEdit) {
        notifyViewOnly("lock toggle");
        return;
      }
      const { elementId } = event.detail;
      console.log("\u{1F512} Toggling lock for element:", elementId);
      setNodes((nds) => nds.map((node) => {
        if (node.id === elementId) {
          const isCurrentlyLocked = node.data?.locked || false;
          const willBeLocked = !isCurrentlyLocked;
          console.log(`\u{1F510} Element ${elementId} lock status: ${isCurrentlyLocked} \u2192 ${willBeLocked}`);
          return {
            ...node,
            data: {
              ...node.data,
              locked: willBeLocked
            },
            draggable: !willBeLocked
            // Prevent dragging when locked
          };
        }
        return node;
      }));
    };
    document.addEventListener("toggleLockElement", handleToggleLockElement);
    return () => {
      document.removeEventListener("toggleLockElement", handleToggleLockElement);
    };
  }, [setNodes, canEdit, notifyViewOnly]);
  const onEdgesDelete = useCallback((edgesToDelete) => {
    console.log("\u{1F5D1}\uFE0F Deleting edges:", edgesToDelete);
    setEdges((eds) => eds.filter((edge) => !edgesToDelete.find((e) => e.id === edge.id)));
    purgeDeletedFromCanvasCache([], edgesToDelete.map((e) => e.id));
  }, [setEdges, purgeDeletedFromCanvasCache]);
  const onNodesDelete = useCallback((nodesToDelete) => {
    console.log("\u{1F5D1}\uFE0F Deleting nodes:", nodesToDelete);
    if (getCurrentUserRole() !== "pm")
      return;
    const deletableNodes = filterDirectlyDeletableNodes(nodesToDelete);
    if (deletableNodes.length === 0)
      return;
    deletableNodes.forEach((nodeToDelete) => {
      const fullNode = nodes.find((n) => n.id === nodeToDelete.id);
      if (fullNode) {
        recordDeletionHistory(nodeToDelete.id, fullNode.data, {
          deletedVia: "canvas-delete-key",
          canvasAction: true,
          position: fullNode.position
        });
      }
    });
    setNodes((nds) => {
      let remainingNodes = nds.filter((node) => !deletableNodes.find((n) => n.id === node.id));
      const nodesWithSequence = remainingNodes.filter((node) => node.data?.sequenceNumber !== void 0 && node.data.sequenceNumber !== null).sort((a, b) => (a.data?.sequenceNumber || 0) - (b.data?.sequenceNumber || 0));
      console.log("\u{1F4CA} Nodes with sequence numbers:", nodesWithSequence.length);
      if (nodesWithSequence.length > 0) {
        remainingNodes = remainingNodes.map((node) => {
          const currentSeqIndex = nodesWithSequence.findIndex((n) => n.id === node.id);
          if (currentSeqIndex !== -1) {
            const newSequenceNumber = currentSeqIndex + 1;
            console.log(`\u{1F522} Renumbering node ${node.id}: ${node.data?.sequenceNumber} \u2192 ${newSequenceNumber}`);
            return {
              ...node,
              data: {
                ...node.data,
                sequenceNumber: newSequenceNumber
              }
            };
          }
          return node;
        });
      }
      return remainingNodes;
    });
    purgeDeletedFromCanvasCache(deletableNodes.map((n) => n.id));
  }, [setNodes, recordDeletionHistory, nodes, filterDirectlyDeletableNodes, purgeDeletedFromCanvasCache, getCurrentUserRole]);
  const isValidConnection = useCallback((connection) => {
    if (connection.source === connection.target) {
      console.log("\u274C Cannot connect node to itself");
      return false;
    }
    const existingConnection = edges.find(
      (edge) => edge.source === connection.source && edge.target === connection.target && edge.sourceHandle === connection.sourceHandle && edge.targetHandle === connection.targetHandle
    );
    if (existingConnection) {
      console.log("\u274C Connection already exists");
      return false;
    }
    console.log("\u2705 Valid connection");
    return true;
  }, [edges]);
  useEffect(() => {
    const handleActivateTextMode = (event) => {
      if (!canEdit) {
        notifyViewOnly("text mode activation");
        return;
      }
      const { active, ...config2 } = event.detail;
      setIsTextModeActive(active);
      setTextModeConfig(config2);
      console.log("\u{1F4DD} Text mode:", active ? "ON" : "OFF");
    };
    document.addEventListener("activateTextMode", handleActivateTextMode);
    return () => document.removeEventListener("activateTextMode", handleActivateTextMode);
  }, [canEdit, notifyViewOnly]);
  useEffect(() => {
    const handleSelectTextElement = (event) => {
      const textElement = event.detail;
      console.log("\u{1F3AF} Text element selected:", textElement);
    };
    document.addEventListener("selectTextElement", handleSelectTextElement);
    return () => document.removeEventListener("selectTextElement", handleSelectTextElement);
  }, []);
  useEffect(() => {
    const handleUpdateTextElement = (event) => {
      if (!canEdit) {
        notifyViewOnly("text element update");
        return;
      }
      const updatedElement = event.detail;
      console.log("\u270F\uFE0F Updating text element:", updatedElement);
      const { id, position, width, height, ...dataPatch } = updatedElement;
      setNodes((nds) => nds.map((node) => {
        if (node.id !== id)
          return node;
        const nextStyle = { ...node.style || {} };
        const nextData = { ...node.data, ...dataPatch };
        if (width === null) {
          delete nextStyle.width;
          delete nextData.width;
        } else if (width !== void 0 && width !== "") {
          nextStyle.width = Number(width);
          nextData.width = Number(width);
        }
        if (height === null) {
          delete nextStyle.height;
          delete nextData.height;
        } else if (height !== void 0 && height !== "") {
          nextStyle.height = Number(height);
          nextData.height = Number(height);
        }
        return {
          ...node,
          ...position ? { position: { x: Number(position.x) || 0, y: Number(position.y) || 0 } } : {},
          style: nextStyle,
          data: nextData
        };
      }));
    };
    document.addEventListener("updateTextElement", handleUpdateTextElement);
    return () => document.removeEventListener("updateTextElement", handleUpdateTextElement);
  }, [setNodes, canEdit, notifyViewOnly]);
  useEffect(() => {
    const handleAIContextRequest = () => {
      document.dispatchEvent(new CustomEvent("aiContextResponse", {
        detail: { nodes, edges }
      }));
    };
    document.addEventListener("aiContextRequest", handleAIContextRequest);
    return () => document.removeEventListener("aiContextRequest", handleAIContextRequest);
  }, [nodes, edges]);
  useEffect(() => {
    const handleAIGenerateFlow = (event) => {
      if (!canEdit) {
        notifyViewOnly("AI canvas generation");
        return;
      }
      const spec = event?.detail?.spec;
      if (!spec || !Array.isArray(spec.nodes) || spec.nodes.length === 0)
        return;
      aiGenTimersRef.current.forEach(clearTimeout);
      aiGenTimersRef.current = [];
      setAiReview(null);
      pushToHistory();
      const incoming = new Set((spec.edges || []).map((e) => e.target));
      const depth = {};
      spec.nodes.forEach((n) => {
        depth[n.key] = incoming.has(n.key) ? Infinity : 0;
      });
      for (let pass = 0; pass < spec.nodes.length; pass += 1) {
        (spec.edges || []).forEach((e) => {
          if (depth[e.source] !== Infinity && depth[e.target] === Infinity) {
            depth[e.target] = depth[e.source] + 1;
          } else if (depth[e.source] !== Infinity && depth[e.target] !== Infinity) {
            depth[e.target] = Math.min(depth[e.target], depth[e.source] + 1);
          }
        });
      }
      spec.nodes.forEach((n) => {
        if (depth[n.key] === Infinity)
          depth[n.key] = 0;
      });
      const startX = nodes.length ? Math.max(...nodes.map((n) => n.position.x)) + 420 : 200;
      const startY = nodes.length ? Math.min(...nodes.map((n) => n.position.y)) : 200;
      const AI_NODE_SIZE = {
        "form-template": { w: 440, h: 660 },
        "task-card": { w: 420, h: 640 },
        "approval-board": { w: 480, h: 400 },
        "turnkey-workflow": { w: 440, h: 500 },
        table: { w: 400, h: 340 },
        chart: { w: 400, h: 320 },
        list: { w: 360, h: 340 },
        "smart-note": { w: 340, h: 320 },
        materials: { w: 400, h: 340 },
        "boq-generator": { w: 400, h: 360 },
        "custom-boq": { w: 640, h: 420 },
        "form-card": { w: 380, h: 340 },
        "calendar-event": { w: 340, h: 300 }
      };
      const sizeOf = (t) => AI_NODE_SIZE[t] || { w: 340, h: 240 };
      const depthMaxW = {};
      spec.nodes.forEach((sn) => {
        depthMaxW[depth[sn.key]] = Math.max(depthMaxW[depth[sn.key]] || 0, sizeOf(sn.type).w);
      });
      const depthX = {};
      {
        let cx = startX;
        Object.keys(depthMaxW).map(Number).sort((a, b) => a - b).forEach((d) => {
          depthX[d] = cx;
          cx += depthMaxW[d] + 120;
        });
      }
      const depthYCursor = {};
      const keyToNodeId = {};
      const newNodes = spec.nodes.map((sn) => {
        const d = depth[sn.key];
        const y = startY + (depthYCursor[d] || 0);
        depthYCursor[d] = (depthYCursor[d] || 0) + sizeOf(sn.type).h + 80;
        const position = { x: depthX[d], y };
        const element = { type: sn.type, name: sn.name, data: sn.data || {} };
        const newNode = createElementNode(element, position, sn.data || null);
        newNode.data = { ...newNode.data, ...sn.data || {}, lastModifiedAt: (/* @__PURE__ */ new Date()).toISOString() };
        keyToNodeId[sn.key] = newNode.id;
        return newNode;
      });
      const newEdges = (spec.edges || []).filter((e) => keyToNodeId[e.source] && keyToNodeId[e.target]).map((e, i) => ({
        id: `edge_ai_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
        source: keyToNodeId[e.source],
        target: keyToNodeId[e.target],
        // No sourceHandle/targetHandle — node types use different handle ids
        // (some have none), and RF drops edges that reference missing handles
        type: "custom",
        animated: false,
        style: { strokeWidth: 2, stroke: "#6b7280" },
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "#6b7280" },
        data: { label: e.label || "" }
      }));
      const NODE_REVEAL_MS = 2e3;
      const EDGE_REVEAL_MS = 800;
      const queue = [
        ...newNodes.map((n) => () => setNodes((nds) => [...nds, n])),
        ...newEdges.map((e) => () => setEdges((eds) => [...eds, e]))
      ];
      let step = 0;
      const runNext = () => {
        if (step < queue.length) {
          queue[step]();
          step += 1;
          aiGenTimersRef.current.push(setTimeout(runNext, step <= newNodes.length ? NODE_REVEAL_MS : EDGE_REVEAL_MS));
        } else {
          setAiReview({
            nodeIds: newNodes.map((n) => n.id),
            edgeIds: newEdges.map((e) => e.id)
          });
          document.dispatchEvent(new CustomEvent("canvasFitView"));
        }
      };
      runNext();
    };
    document.addEventListener("aiGenerateFlow", handleAIGenerateFlow);
    return () => document.removeEventListener("aiGenerateFlow", handleAIGenerateFlow);
  }, [nodes, setNodes, setEdges, createElementNode, pushToHistory, canEdit, notifyViewOnly, toast]);
  const handleAIReviewReject = useCallback(() => {
    if (!aiReview)
      return;
    isUpdatingNodesLocallyRef.current = true;
    aiReview.nodeIds.forEach((nodeId) => emitOpRef.current?.({
      type: "NODE_DELETE",
      nodeId,
      taskId: taskIdRef.current,
      subtaskId: subtaskIdRef.current
    }));
    aiReview.edgeIds.forEach((edgeId) => emitOpRef.current?.({
      type: "EDGE_DELETE",
      edgeId,
      taskId: taskIdRef.current,
      subtaskId: subtaskIdRef.current
    }));
    setNodesRaw((nds) => nds.filter((n) => !aiReview.nodeIds.includes(n.id)));
    setEdgesRaw((eds) => eds.filter((e) => !aiReview.edgeIds.includes(e.id)));
    if (selectedSubtask?.canvasData) {
      selectedSubtask.canvasData.nodes = (selectedSubtask.canvasData.nodes || []).filter((n) => !aiReview.nodeIds.includes(n.id));
      selectedSubtask.canvasData.edges = (selectedSubtask.canvasData.edges || []).filter((e) => !aiReview.edgeIds.includes(e.id));
    }
    setTimeout(() => {
      isUpdatingNodesLocallyRef.current = false;
    }, 0);
    setAiReview(null);
    toast?.info?.("AI generation discarded");
  }, [aiReview, setNodesRaw, setEdgesRaw, selectedSubtask, toast]);
  useEffect(() => {
    const handleAIGenerateNodes = (event) => {
      if (!canEdit) {
        notifyViewOnly("AI node generation");
        return;
      }
      const { nodes: generatedNodes, sourceNodeId } = event.detail;
      if (!generatedNodes?.length)
        return;
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      const startX = sourceNode ? sourceNode.position.x + 350 : 400;
      const startY = sourceNode ? sourceNode.position.y : 200;
      generatedNodes.forEach((genNode, i) => {
        const element = {
          type: genNode.type || "textbox",
          name: genNode.name || `Step ${i + 1}`,
          nodeType: "elementNode"
        };
        const position = { x: startX, y: startY + i * 220 };
        const newNode = createElementNode(element, position);
        if (newNode) {
          setNodes((nds) => [...nds, newNode]);
        }
      });
    };
    document.addEventListener("aiGenerateNodes", handleAIGenerateNodes);
    return () => document.removeEventListener("aiGenerateNodes", handleAIGenerateNodes);
  }, [nodes, setNodes, createElementNode, canEdit, notifyViewOnly]);
  useEffect(() => {
    const handleAddElement = (event) => {
      if (!canEdit) {
        notifyViewOnly("element add");
        return;
      }
      const element = event.detail;
      if (!element)
        return;
      const center = reactFlowInstance?.getViewport();
      const position = findNonCollidingPosition(
        { x: center?.x ? -center.x + 400 : 400, y: center?.y ? -center.y + 300 : 300 }
      );
      const newNode = createElementNode(element, position);
      if (newNode) {
        setNodes((nds) => [...nds, newNode]);
        autoConnectNewNode(newNode);
      }
    };
    document.addEventListener("addElementToCanvas", handleAddElement);
    return () => document.removeEventListener("addElementToCanvas", handleAddElement);
  }, [reactFlowInstance, setNodes, createElementNode, canEdit, notifyViewOnly]);
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (!canEdit)
        return;
      const isInputElement = event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.contentEditable === "true";
      const isInsideInput = event.target.closest('input, textarea, [contenteditable="true"]');
      if (isInputElement || isInsideInput) {
        return;
      }
      if (event.key === "Escape" && isTextModeActive) {
        document.dispatchEvent(new CustomEvent("activateTextMode", { detail: { active: false } }));
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        const selectedElementNodes = nodes.filter((node) => node.selected && node.type === "elementNode");
        if (selectedElementNodes.length > 0) {
          filterDirectlyDeletableNodes(selectedElementNodes);
        }
      }
      if (event.ctrlKey && event.shiftKey && event.key === "C" && getCurrentUserRole() === "pm") {
        setEdges([]);
        console.log("\u{1F9F9} All connections cleared");
      }
    };
    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [nodes, edges, onNodesDelete, onEdgesDelete, setEdges, canEdit, notifyViewOnly, filterDirectlyDeletableNodes, isTextModeActive]);
  const onConnect = useCallback((params) => {
    const edgeId = `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newEdge = {
      ...params,
      id: edgeId,
      type: "custom",
      animated: false,
      style: { strokeWidth: 2, stroke: "#6b7280" },
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "#6b7280" },
      data: { label: "" }
    };
    setEdges((eds) => addEdge(newEdge, eds));
    openEdgeLabelModal(edgeId);
    console.log("\u2705 Connection created (awaiting label):", newEdge);
  }, [setEdges, openEdgeLabelModal, emitOp, selectedTask?.id, selectedSubtask?.id]);
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setIsDraggingOver(true);
    console.log("\u{1F504} Drag over React Flow canvas, dataTransfer types:", event.dataTransfer.types);
  }, []);
  const onDragEnter = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(true);
    console.log("\u{1F504} Drag enter React Flow canvas");
  }, []);
  const onDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingOver(false);
    console.log("\u{1F504} Drag leave React Flow canvas");
  }, []);
  const findNonCollidingPosition = (position, newNodeWidth = 300, newNodeHeight = 200) => {
    const padding = 100;
    const offset = 100;
    const offsets = [
      { x: offset, y: 0 },
      // Right
      { x: 0, y: offset },
      // Down
      { x: -offset, y: 0 },
      // Left
      { x: 0, y: -offset },
      // Up
      { x: offset, y: offset },
      // Down-right
      { x: -offset, y: offset },
      // Down-left
      { x: offset, y: -offset },
      // Up-right
      { x: -offset, y: -offset }
      // Up-left
    ];
    const hasCollision = (pos) => {
      for (const node of nodes) {
        if (!node.position)
          continue;
        const nodeWidth = node.measured?.width || node.width || 350;
        const nodeHeight = node.measured?.height || node.height || 250;
        const overlaps = pos.x < node.position.x + nodeWidth + padding && pos.x + newNodeWidth + padding > node.position.x && pos.y < node.position.y + nodeHeight + padding && pos.y + newNodeHeight + padding > node.position.y;
        if (overlaps) {
          console.log(`\u26A0\uFE0F Collision detected with node at (${node.position.x}, ${node.position.y})`);
          return true;
        }
      }
      return false;
    };
    if (!hasCollision(position)) {
      console.log(`\u2705 Current position is clear`);
      return position;
    }
    console.log(`\u{1F50D} Current position has collision, searching for empty space...`);
    let found = false;
    for (let multiplier = 1; multiplier <= 10 && !found; multiplier++) {
      for (const offset2 of offsets) {
        const testPos = {
          x: position.x + offset2.x * multiplier,
          y: position.y + offset2.y * multiplier
        };
        if (!hasCollision(testPos)) {
          console.log(`\u{1F3AF} Found non-colliding position at distance multiplier ${multiplier}`);
          console.log(`\u{1F4CD} New position: x=${testPos.x}, y=${testPos.y}`);
          return testPos;
        }
      }
    }
    if (!found) {
      console.log(`\u26A0\uFE0F Could not find position using standard search, using fallback strategy`);
      let maxX = position.x;
      let maxY = position.y;
      let maxNodeWidth = 0;
      let maxNodeHeight = 0;
      for (const node of nodes) {
        if (!node.position)
          continue;
        const nodeWidth = node.measured?.width || node.width || 350;
        const nodeHeight = node.measured?.height || node.height || 250;
        if (node.position.x + nodeWidth > maxX + maxNodeWidth) {
          maxX = node.position.x;
          maxNodeWidth = nodeWidth;
        }
        if (node.position.y + nodeHeight > maxY + maxNodeHeight) {
          maxY = node.position.y;
          maxNodeHeight = nodeHeight;
        }
      }
      const fallbackPos = {
        x: maxX + maxNodeWidth + 150,
        y: maxY + maxNodeHeight + 150
      };
      console.log(`\u{1F4CD} Using fallback position: x=${fallbackPos.x}, y=${fallbackPos.y}`);
      return fallbackPos;
    }
    console.log(`\u{1F4CD} Final position: x=${position.x}, y=${position.y}`);
    return position;
  };
  const onDrop = useCallback(
    async (event) => {
      console.log("\u{1F3AF}\u{1F3AF}\u{1F3AF} DROP EVENT FIRED - dataTransfer types:", event.dataTransfer?.types);
      event.preventDefault();
      event.stopPropagation();
      setIsDraggingOver(false);
      console.log("\u{1F3AF} Drop event triggered on React Flow canvas");
      const assetData = event.dataTransfer.getData("asset");
      console.log("\u{1F3AF} Asset data from drag:", assetData);
      if (assetData) {
        console.log("\u{1F5BC}\uFE0F Asset dropped on canvas");
        try {
          const asset = JSON.parse(assetData);
          console.log("\u{1F4E6} Asset parsed:", asset);
          if (!asset.s3Url) {
            console.error("\u274C Asset missing s3Url:", asset);
            return;
          }
          const reactFlowBounds = event.currentTarget.getBoundingClientRect();
          let position;
          if (reactFlowInstance) {
            position = reactFlowInstance.project({
              x: event.clientX - reactFlowBounds.left,
              y: event.clientY - reactFlowBounds.top
            });
          } else {
            position = {
              x: event.clientX - reactFlowBounds.left - 100,
              y: event.clientY - reactFlowBounds.top - 50
            };
          }
          position = findNonCollidingPosition(position, 200, 200);
          let newNode;
          if (asset.category === "images" || asset.category === "icons") {
            newNode = {
              id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: "elementNode",
              position,
              data: {
                elementName: asset.name,
                elementType: "image-block",
                type: "image-block",
                imageUrl: asset.s3Url,
                imageBlockData: {
                  imageUrl: asset.s3Url,
                  imageAlt: asset.name,
                  imageWidth: 200,
                  imageHeight: 200
                },
                canvasAction: true,
                assetId: asset.assetId || asset.id,
                category: asset.category
              }
            };
          } else if (asset.category === "documents") {
            newNode = {
              id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: "elementNode",
              position,
              data: {
                elementName: asset.name,
                elementType: "document-block",
                type: "document-block",
                documentBlockData: {
                  fileName: asset.name,
                  fileType: asset.name.split(".").pop().toUpperCase(),
                  fileSize: asset.size,
                  fileUrl: asset.s3Url,
                  versions: [],
                  comments: []
                },
                canvasAction: true,
                assetId: asset.assetId || asset.id,
                category: asset.category
              }
            };
          } else if (asset.category === "fonts") {
            newNode = {
              id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: "textNode",
              position,
              data: {
                content: `Font: ${asset.name}`,
                type: "font",
                fontUrl: asset.s3Url,
                canvasAction: true,
                assetId: asset.assetId || asset.id,
                category: asset.category
              }
            };
          }
          if (newNode) {
            console.log("\u2705 Creating asset node:", newNode);
            setNodes((nds) => [...nds, newNode]);
            return;
          }
        } catch (error) {
          console.error("\u274C Error processing asset drop:", error);
          return;
        }
      }
      const elementData = event.dataTransfer.getData("application/json");
      console.log("\u{1F4E6} Element data retrieved:", elementData);
      console.log("\u{1F4E6} All available data types:", Array.from(event.dataTransfer.items || []).map((item) => item.type));
      console.log("\u{1F4E6} Plain text data:", event.dataTransfer.getData("text/plain"));
      if (!elementData) {
        console.log("\u274C No element data found in dataTransfer");
        console.log("\u26A0\uFE0F Checking all data types...");
        const itemsArray = Array.from(event.dataTransfer.items || []);
        console.log("\u{1F4CB} DataTransfer items:", itemsArray);
        return;
      }
      try {
        const element = JSON.parse(elementData);
        console.log("\u2705 Parsed element:", element);
        const reactFlowBounds = event.currentTarget.getBoundingClientRect();
        console.log("\u{1F4D0} React Flow bounds:", reactFlowBounds);
        let position;
        if (reactFlowInstance) {
          position = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top
          });
          console.log("\u{1F3AF} Projected position:", position);
        } else {
          position = {
            x: event.clientX - reactFlowBounds.left - 100,
            y: event.clientY - reactFlowBounds.top - 50
          };
          console.log("\u{1F3AF} Fallback position:", position);
        }
        position = findNonCollidingPosition(position, 300, 200);
        if (isTableElement(element)) {
          console.log("\u{1F4CA} Table element detected in drop, showing configuration modal");
          setPendingTableElement(element);
          setPendingPosition(findNonCollidingPosition(position, 400, 300));
          setShowTableModal(true);
          return;
        }
        if (isChartElement(element)) {
          console.log("\u{1F4C8} Chart element detected in drop, showing configuration modal");
          setPendingChartElement(element);
          setPendingPosition(findNonCollidingPosition(position, 450, 350));
          setShowChartModal(true);
          return;
        }
        if (isListElement(element)) {
          console.log("\u{1F4DD} List element detected in drop, showing configuration modal");
          setPendingListElement(element);
          setPendingPosition(findNonCollidingPosition(position, 350, 300));
          setShowListModal(true);
          return;
        }
        if (isLayoutElement(element)) {
          console.log("\u{1F3D7}\uFE0F Layout element detected in drop, showing configuration modal");
          setPendingLayoutElement(element);
          setPendingPosition(findNonCollidingPosition(position, 400, 300));
          setShowLayoutModal(true);
          return;
        }
        if (isFlowchartElement(element)) {
          console.log("\u{1F504} Flowchart element detected in drop, creating template");
          createFlowchartTemplate(element, findNonCollidingPosition(position, 300, 200));
          return;
        }
        console.log("\u{1F50D} Checking turnkey workflow in drop:", {
          elementType: element?.type,
          elementElementType: element?.elementType,
          elementId: element?.id,
          isTurnkeyWorkflow: element?.type === "turnkey-workflow" || element?.elementType === "turnkey-workflow"
        });
        if (element?.type === "turnkey-workflow" || element?.elementType === "turnkey-workflow" || element?.id === "turnkey-workflow") {
          console.log("\u{1F527} Turnkey workflow element detected in drop, showing configuration modal");
          setPendingTurnkeyElement(element);
          setPendingPosition(findNonCollidingPosition(position, 350, 250));
          setShowTurnkeyModal(true);
          return;
        }
        if (element.type === "image-block") {
          console.log("\u{1F5BC}\uFE0F Image block element detected in drop, creating default block");
          const imageBlockData = JSON.parse(JSON.stringify(element.imageBlockData || {}));
          const newNode2 = createElementNode(element, findNonCollidingPosition(position, 300, 200), { imageBlockData });
          setNodes((nds) => nds.concat(newNode2));
          autoConnectNewNode(newNode2);
          trackActivity("element_added", "create", "element", {
            elementId: newNode2.id,
            elementType: element.type,
            position,
            details: {
              elementName: element.name,
              canvasAction: true,
              imageBlockData
            }
          });
          return;
        }
        if (element.type === "task-card" || element.type === "task-card-progress") {
          console.log("\u{1F4DD} Task card element detected in drop, showing configuration modal");
          setPendingTaskCardElement(element);
          setPendingTaskCardInitialData(element.taskCardData || null);
          setPendingPosition(findNonCollidingPosition(position, 300, 250));
          setShowTaskCardModal(true);
          return;
        }
        if (element?.type === "smart-note" || element?.nodeType === "smartNote") {
          console.log("\u2728 Smart Note element detected in drop, creating Smart Note node");
        }
        if (element?.type === "calendar-event" || element?.nodeType === "calendarNode") {
          console.log("\u{1F4C5} Calendar Event element detected in drop, creating Calendar Event node");
        }
        if (element?.type === "approval-board" || element?.nodeType === "approvalBoard") {
          console.log("\u2705 Approval Board element detected in drop, creating Approval Board node");
        }
        const newNode = createElementNode(element, position);
        console.log("\u{1F195} Creating new node:", newNode);
        console.log("\u{1F50D} Node type:", newNode.type);
        console.log("\u{1F50D} Node data:", newNode.data);
        const previousNodeId = lastAddedNodeIdRef.current;
        console.log("\u{1F4CC} Previous node ID stored:", previousNodeId);
        setNodes((currentNodes) => {
          console.log("\u{1F4CA} Current nodes before adding new:", currentNodes.length, "nodes");
          if (previousNodeId && currentNodes.length > 0) {
            console.log("\u{1F517} Attempting to connect new element to previously added element:", previousNodeId);
            const previousNode = currentNodes.find((node) => node.id === previousNodeId);
            if (previousNode) {
              console.log(`\u{1F3AF} Found previous node: ${previousNodeId} at position (${previousNode.position.x}, ${previousNode.position.y})`);
              const dx = newNode.position.x - previousNode.position.x;
              const dy = newNode.position.y - previousNode.position.y;
              let sourceId = previousNode.id;
              let targetId = newNode.id;
              let sourceHandle = "right-out";
              let targetHandle = "left-in";
              if (Math.abs(dx) > Math.abs(dy)) {
                if (dx < 0) {
                  sourceId = newNode.id;
                  targetId = previousNode.id;
                  sourceHandle = "right-out";
                  targetHandle = "left-in";
                }
              } else {
                if (dy > 0) {
                  sourceId = previousNode.id;
                  targetId = newNode.id;
                  sourceHandle = "bottom-out";
                  targetHandle = "top-in";
                } else {
                  sourceId = newNode.id;
                  targetId = previousNode.id;
                  sourceHandle = "bottom-out";
                  targetHandle = "top-in";
                }
              }
              setEdges((currentEdges) => {
                console.log("\u{1F4D0} Creating edge from", sourceId, "to", targetId);
                const connectionExists = currentEdges.some(
                  (edge) => edge.source === sourceId && edge.target === targetId && edge.sourceHandle === sourceHandle && edge.targetHandle === targetHandle || edge.source === targetId && edge.target === sourceId
                );
                if (!connectionExists) {
                  const edgeId = `edge_auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                  const newEdge = {
                    id: edgeId,
                    source: sourceId,
                    target: targetId,
                    sourceHandle,
                    targetHandle,
                    type: "custom",
                    animated: false,
                    style: {
                      strokeWidth: 2,
                      stroke: "#6b7280"
                    },
                    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: "#6b7280" },
                    data: {
                      label: "",
                      isAutoConnected: true
                    }
                  };
                  console.log(`\u2705 AUTO-CONNECTED: ${sourceId} \u2192 ${targetId}`);
                  return [...currentEdges, newEdge];
                } else {
                  console.log(`\u23ED\uFE0F Connection already exists between: ${sourceId} \u2194 ${targetId}`);
                  return currentEdges;
                }
              });
            } else {
              console.log(`\u26A0\uFE0F Previous node (${previousNodeId}) not found in current nodes`);
            }
          } else {
            console.log("\u2139\uFE0F First element dropped - no previous element to connect to");
          }
          lastAddedNodeIdRef.current = newNode.id;
          console.log("\u{1F4CC} Updated last added element to:", newNode.id);
          isUpdatingNodesLocallyRef.current = true;
          return [...currentNodes, newNode];
        });
        setTimeout(() => {
          isUpdatingNodesLocallyRef.current = false;
          console.log("\u{1F513} Unlocked canvas data updates after local node addition");
        }, 100);
        await trackActivity(
          "element_added",
          "create",
          "element",
          {
            elementId: newNode.id,
            elementType: element.type || "unknown",
            position,
            details: {
              elementName: element.name || element.type,
              canvasAction: true
            }
          }
        );
        console.log("\u2705 Element dropped and auto-connected successfully!");
      } catch (error) {
        console.error("\u274C Error parsing dropped element:", error);
      }
    },
    [reactFlowInstance, setNodes, trackActivity, nodes]
  );
  useEffect(() => {
    const dayOf = (ts) => {
      if (!ts)
        return "";
      const d = new Date(ts);
      if (isNaN(d.getTime()))
        return "";
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    setNodes((nds) => {
      let changed = false;
      const next = nds.map((n) => {
        const want = Boolean(highlightDay) && dayOf(n?.data?.addedAt) === highlightDay;
        const classes = (n.className || "").split(" ").filter(Boolean);
        const has = classes.includes("progress-day-highlight");
        if (want === has)
          return n;
        changed = true;
        const cls = classes.filter((c) => c !== "progress-day-highlight");
        if (want)
          cls.push("progress-day-highlight");
        return { ...n, className: cls.join(" ") };
      });
      return changed ? next : nds;
    });
  }, [highlightDay, nodes, selectedSubtask?.id]);
  useEffect(() => {
    updateOffset();
    window.addEventListener("resize", updateOffset);
    return () => window.removeEventListener("resize", updateOffset);
  }, [updateOffset]);
  useEffect(() => {
    if (isFullscreen) {
      previousOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflowRef.current || "";
    }
    return () => {
      document.body.style.overflow = previousOverflowRef.current || "";
    };
  }, [isFullscreen]);
  useEffect(() => {
    updateOffset();
  }, [isFullscreen, updateOffset]);
  const containerClasses = isFullscreen ? "fixed left-0 right-0 bottom-0 bg-surface z-50 flex flex-col" : "h-full relative flex flex-col";
  const containerStyle = isFullscreen ? { top: `${headerOffset || 0}px` } : void 0;
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("style", null, controlsCSS), /* @__PURE__ */ React.createElement("div", { className: containerClasses, style: containerStyle }, /* @__PURE__ */ React.createElement("div", { className: "pl-20 pr-6 py-3 md:pl-20 md:pr-8 bg-white/20 supports-[backdrop-filter]:bg-white/10 backdrop-blur-xl border-b border-white/30 " }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col gap-2 md:flex-row md:items-center md:justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-semibold text-ink" }, selectedSubtask?.name || workspace?.title || "Workspace"), /* @__PURE__ */ React.createElement("p", { className: "text-dim mt-1" }, "Canvas workspace for ", selectedSubtask?.name || workspace?.title || "your project")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 relative z-20 md:mt-0" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: onToggleSidebars,
      className: "p-2 bg-white/40 supports-[backdrop-filter]:bg-white/20 backdrop-blur-md border border-white/40 hover:bg-white/55 text-ink rounded-lg  transition-colors focus:outline-none focus:ring-2 focus:ring-info",
      title: sidebarCollapsed ? "Show Sidebars" : "Hide Sidebars",
      "aria-label": sidebarCollapsed ? "Show sidebars" : "Hide sidebars"
    },
    sidebarCollapsed ? /* @__PURE__ */ React.createElement("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 6h16M4 12h16M4 18h16" })) : /* @__PURE__ */ React.createElement("svg", { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M4 6h4M4 12h16M4 18h4" }), /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M14 6h6M14 18h6" })),
    /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, sidebarCollapsed ? "Show sidebars" : "Hide sidebars")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setIsFullscreen((prev) => !prev),
      className: "p-2 bg-white/40 supports-[backdrop-filter]:bg-white/20 backdrop-blur-md border border-white/40 hover:bg-white/55 text-ink rounded-lg  transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-info",
      title: isFullscreen ? "Exit full screen" : "Enter full screen",
      "aria-label": isFullscreen ? "Exit full screen" : "Enter full screen"
    },
    isFullscreen ? /* @__PURE__ */ React.createElement(Minimize2, { className: "w-5 h-5" }) : /* @__PURE__ */ React.createElement(Maximize2, { className: "w-5 h-5" })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "p-2 bg-white/40 supports-[backdrop-filter]:bg-white/20 backdrop-blur-md border border-white/40 hover:bg-white/55 text-ink rounded-lg  transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-info",
      title: "Preview",
      "aria-label": "Preview"
    },
    /* @__PURE__ */ React.createElement(Eye, { className: "w-5 h-5" }),
    /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, "Preview")
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setPerformanceMode((prev) => !prev),
      className: `p-2 border rounded-lg  transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-info ${performanceMode ? "border-warning/20 bg-warning supports-[backdrop-filter]:bg-warning backdrop-blur-md text-warning hover:bg-warning" : "bg-white/40 supports-[backdrop-filter]:bg-white/20 backdrop-blur-md border-white/40 hover:bg-white/55 text-ink"}`,
      title: performanceMode ? "Disable performance mode" : "Enable performance mode for large canvases",
      "aria-label": performanceMode ? "Disable performance mode" : "Enable performance mode"
    },
    /* @__PURE__ */ React.createElement(Gauge, { className: "w-5 h-5" })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => window.dispatchEvent(new CustomEvent("progress-sidebar-toggle")),
      className: `p-2 border rounded-lg transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-info ${highlightDay ? "border-info/40 bg-info/10 text-info" : "bg-white/40 supports-[backdrop-filter]:bg-white/20 backdrop-blur-md border-white/40 hover:bg-white/55 text-ink"}`,
      title: "Progress by day \u2014 highlight elements added on a date",
      "aria-label": "Toggle progress day panel"
    },
    /* @__PURE__ */ React.createElement(TrendingUp, { className: "w-5 h-5" }),
    highlightDay && /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, "highlighting ", highlightDay)
  ), canvasWebSocket && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/40 supports-[backdrop-filter]:bg-white/20 backdrop-blur-md border border-white/40  text-xs" }, /* @__PURE__ */ React.createElement("div", { className: `w-2 h-2 rounded-full ${canvasWebSocket.isConnected ? "bg-success" : "bg-danger"}` }), /* @__PURE__ */ React.createElement("span", { className: "text-dim" }, canvasWebSocket.isConnected ? "Live" : "Offline"), canvasWebSocket.connectedUsers?.length > 1 && /* @__PURE__ */ React.createElement("span", { className: "text-dim ml-1" }, "\xB7 ", canvasWebSocket.connectedUsers.length, " users")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: async () => {
        console.log("\u{1F504} Manual save triggered");
        if (onSaveWorkspace && workspace?.workspaceId) {
          const saveData = {
            nodes,
            edges,
            zoomLevel,
            canvasSettings: {}
          };
          setSaveStatus("saving");
          try {
            const previewSnapshot = await captureWorkspaceSnapshot();
            await onSaveWorkspace({ ...saveData, previewSnapshot });
            setSaveStatus("saved");
            setLastSaved(/* @__PURE__ */ new Date());
            setTimeout(() => setSaveStatus("idle"), 2e3);
          } catch (error) {
            setSaveStatus("error");
            setTimeout(() => setSaveStatus("idle"), 3e3);
          }
        } else {
          console.error("Cannot save: missing onSaveWorkspace or workspaceId");
        }
      },
      disabled: saveStatus === "saving",
      className: `p-2 rounded-lg border border-info  backdrop-blur-md transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-info ${saveStatus === "saving" ? "bg-cta cursor-not-allowed text-cta-foreground" : "bg-info hover:bg-info text-cta-foreground"}`,
      title: saveStatus === "saving" ? "Saving workspace" : "Save workspace",
      "aria-label": saveStatus === "saving" ? "Saving workspace" : "Save workspace"
    },
    saveStatus === "saving" ? /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-white" }) : /* @__PURE__ */ React.createElement(Save, { className: "w-5 h-5" }),
    /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, saveStatus === "saving" ? "Saving..." : "Save")
  )))), /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: canvasContainerRef,
      "data-tour": "canvas",
      className: `flex-1 relative overflow-hidden ${isTextModeActive ? "text-cursor-mode" : ""}`,
      style: {
        width: "100%",
        height: "100%",
        zIndex: 1,
        pointerEvents: "auto"
      },
      onDrop: canEdit ? onDrop : void 0,
      onDragOver: canEdit ? onDragOver : void 0,
      onDragEnter: canEdit ? onDragEnter : void 0,
      onDragLeave,
      onMouseMove: handleCanvasMouseMove
    },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: canvasOverlayRef,
        className: `absolute inset-0 z-20 ${isPenMode ? "pointer-events-auto cursor-crosshair touch-none" : "pointer-events-none"}`,
        onPointerDown: handlePenPointerDown,
        onPointerMove: handlePenPointerMove,
        onPointerUp: handlePenPointerUp
      },
      /* @__PURE__ */ React.createElement("svg", { className: "w-full h-full" }, drawingPaths.map((path) => {
        if (!path.points || path.points.length === 0)
          return null;
        const points = path.points.map((pt) => `${pt.x},${pt.y}`).join(" ");
        return /* @__PURE__ */ React.createElement(
          "polyline",
          {
            key: path.id,
            points,
            fill: "none",
            stroke: path.color,
            strokeWidth: path.thickness,
            strokeLinecap: "round",
            strokeLinejoin: "round"
          }
        );
      }))
    ),
    !performanceMode && canvasWebSocket?.remoteCursors && Object.entries(canvasWebSocket.remoteCursors).map(([cursorUserId, cursor]) => /* @__PURE__ */ React.createElement(RemoteCursor, { key: cursorUserId, userId: cursorUserId, userName: cursor.userName, x: cursor.x, y: cursor.y })),
    /* @__PURE__ */ React.createElement(
      ReactFlow,
      {
        style: { width: "100%", height: "100%" },
        nodes: renderedNodes,
        edges: renderedEdges,
        onNodesChange: canEdit ? (changes) => {
          let allowedChanges = changes;
          const removeChanges = changes.filter((c) => c.type === "remove");
          if (removeChanges.length > 0 && getCurrentUserRole() !== "pm") {
            const removedIds = new Set(removeChanges.map((c) => c.id));
            const deletable = new Set(
              filterDirectlyDeletableNodes(
                nodes.filter((n) => removedIds.has(n.id))
              ).map((n) => n.id)
            );
            if (deletable.size < removedIds.size) {
              allowedChanges = changes.filter((c) => c.type !== "remove" || deletable.has(c.id));
            }
          }
          if (allowedChanges.length === 0)
            return;
          onNodesChange(allowedChanges);
          if (!isApplyingRemoteRef.current) {
            const ops = nodeChangesToOps(allowedChanges, selectedTask?.id, selectedSubtask?.id);
            ops.forEach((op) => emitOp(op));
          }
        } : void 0,
        onEdgesChange: canEdit ? (changes) => {
          onEdgesChange(changes);
          if (!isApplyingRemoteRef.current) {
            const ops = edgeChangesToOps(changes, selectedTask?.id, selectedSubtask?.id);
            ops.forEach((op) => emitOp(op));
          }
        } : void 0,
        onNodesDelete: canEdit ? onNodesDelete : void 0,
        onEdgesDelete: canEdit ? onEdgesDelete : void 0,
        onConnect: canEdit ? onConnect : void 0,
        onNodeClick,
        onEdgeClick: canEdit ? handleEdgeClick : void 0,
        onNodeContextMenu: canEdit ? onNodeContextMenu : void 0,
        onNodeDrag: canEdit ? handleNodeDrag : void 0,
        onNodeDragStop: canEdit ? handleNodeDragStop : void 0,
        snapToGrid: true,
        snapGrid: [22, 22],
        onPaneClick,
        onSelectionChange: canEdit ? handleSelectionChange : void 0,
        isValidConnection: canEdit ? isValidConnection : () => false,
        onInit: (instance) => {
          setReactFlowInstance(instance);
          console.log("\u2705 ReactFlow instance initialized:", instance);
        },
        onViewportChange,
        nodesDraggable: !isPenMode,
        nodesConnectable: canEdit && !isPenMode,
        elementsSelectable: canEdit && !isPenMode,
        onDragLeave,
        nodeTypes,
        edgeTypes,
        defaultViewport: { x: 0, y: 0, zoom: 1 },
        minZoom: 0.1,
        maxZoom: 2,
        panOnDrag: isPenMode ? false : [2],
        panOnScroll: !isPenMode,
        panOnScrollMode: "free",
        panActivationKey: canEdit ? "Space" : void 0,
        connectionMode: ConnectionMode.Loose,
        connectionLineType: "smoothstep",
        connectionLineStyle: { strokeWidth: 2, stroke: "#6b7280" },
        elevateEdgesOnSelect: true,
        onlyRenderVisibleElements: performanceMode,
        deleteKeyCode: ["Backspace", "Delete"],
        className: `bg-transparent transition-all duration-200 ${isDraggingOver ? "bg-info ring-4 ring-info/30" : ""}`
      },
      !performanceMode && /* @__PURE__ */ React.createElement(
        Background,
        {
          color: "#cbd5e1",
          gap: 22,
          size: 1.2,
          variant: "dots"
        }
      ),
      /* @__PURE__ */ React.createElement(HelperLines, { horizontal: helperLines.horizontal, vertical: helperLines.vertical }),
      aiReview && /* @__PURE__ */ React.createElement(Panel, { position: "top-center", className: "mt-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 bg-surface shadow-2xl border border-line rounded-xl px-4 py-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Sparkles, { className: "w-4 h-4 text-ink" }), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-medium text-ink" }, "AI generated ", aiReview.nodeIds.length, " element", aiReview.nodeIds.length !== 1 ? "s" : "", aiReview.edgeIds.length > 0 && `, ${aiReview.edgeIds.length} connection${aiReview.edgeIds.length !== 1 ? "s" : ""}`)), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: handleAIReviewReject,
          className: "px-3 py-1.5 text-xs font-medium text-danger bg-danger/10 hover:bg-danger/10 border border-danger/20 rounded-lg transition-colors"
        },
        "Reject"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            setAiReview(null);
            toast?.success?.("AI generation applied");
          },
          className: "px-3 py-1.5 text-xs font-medium text-cta-foreground bg-cta hover:bg-cta rounded-lg transition-colors"
        },
        "Keep it"
      ))),
      /* @__PURE__ */ React.createElement(
        Controls,
        {
          position: "bottom-right",
          className: "bg-surface shadow-lg rounded-lg",
          showZoom: true,
          showFitView: true,
          showInteractive: true,
          fitViewOptions: { padding: 0.1 }
        }
      ),
      !performanceMode && /* @__PURE__ */ React.createElement(
        MiniMap,
        {
          position: "bottom-left",
          nodeColor: (node) => {
            switch (node.type) {
              case "textNode":
                return "#818cf8";
              case "layoutNode":
                return "#34d399";
              case "turnkeyNode":
                return "#f59e0b";
              case "smartNote":
                return "#fbbf24";
              case "calendarNode":
                return "#60a5fa";
              case "approvalBoard":
                return "#f87171";
              case "aiHelper":
                return "#a78bfa";
              default:
                return "#6b7280";
            }
          },
          nodeStrokeWidth: 3,
          maskColor: "rgba(0,0,0,0.08)",
          style: { width: 160, height: 100, borderRadius: 8, border: "1px solid #e5e7eb", background: "rgb(var(--surface-hover))" },
          zoomable: true,
          pannable: true
        }
      ),
      /* @__PURE__ */ React.createElement(Panel, { position: "top-right", className: "mt-4 mr-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-surface shadow-lg rounded-lg px-4 py-2 border border-line" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-4" }, nodes.length >= 2 && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: handleSelectionModeToggle,
          className: `p-1.5 rounded-lg transition-colors border ${isSelectionMode ? "bg-info text-white hover:bg-info border-info" : "bg-info/10 text-info hover:bg-info/10 border-info/20"}`,
          title: isSelectionMode ? "Exit selection mode" : "Select multiple elements",
          "aria-pressed": isSelectionMode
        },
        isSelectionMode ? /* @__PURE__ */ React.createElement(X, { className: "w-3.5 h-3.5" }) : /* @__PURE__ */ React.createElement(Users, { className: "w-3.5 h-3.5" }),
        /* @__PURE__ */ React.createElement("span", { className: "sr-only" }, isSelectionMode ? "Exit selection mode" : "Select multiple elements")
      ), isSelectionMode && /* @__PURE__ */ React.createElement("span", { className: "text-xs font-medium text-info" }, "Selecting ", manuallySelectedNodes.length), isSelectionMode && manuallySelectedNodes.length >= 2 && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: handleGroupIntoGrid,
          className: "inline-flex items-center gap-2 px-2.5 py-1 text-xs bg-info text-white hover:bg-info rounded-lg transition-colors"
        },
        /* @__PURE__ */ React.createElement(Grid, { className: "w-3.5 h-3.5" }),
        /* @__PURE__ */ React.createElement("span", null, "Group (", manuallySelectedNodes.length, ")")
      )), canEdit && nodes.length >= 2 && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: handleTidyCanvas,
          className: "p-1.5 rounded-lg transition-colors border bg-info/10 text-info hover:bg-info/10 border-info/20",
          title: "Tidy canvas \u2014 arrange elements in a grid"
        },
        /* @__PURE__ */ React.createElement(AlignHorizontalDistributeCenter, { className: "w-3.5 h-3.5" })
      ), nodes.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 border-l border-line pl-3" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => handleExportCanvas("png"),
          className: "p-1.5 rounded-lg transition-colors border bg-surface-hover text-ink hover:bg-surface-hover border-line",
          title: "Export canvas as PNG"
        },
        /* @__PURE__ */ React.createElement(Download, { className: "w-3.5 h-3.5" })
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => handleExportCanvas("pdf"),
          className: "p-1.5 rounded-lg transition-colors border bg-surface-hover text-ink hover:bg-surface-hover border-line",
          title: "Export canvas as PDF"
        },
        /* @__PURE__ */ React.createElement(FileText, { className: "w-3.5 h-3.5" })
      )), nodes.length > 1 && getCurrentUserRole() === "pm" && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 border-l border-line pl-3" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setShowClearConfirmation(true),
          className: "px-2.5 py-1 text-xs bg-danger/10 hover:bg-danger/20 text-danger rounded transition-colors",
          title: "Clear all elements and connections (Ctrl+Shift+C)"
        },
        "Clear All"
      ))))),
      showFlowchartToolbar && selectedFlowchartGroup && /* @__PURE__ */ React.createElement(Panel, { position: "top-right" }, /* @__PURE__ */ React.createElement("div", { className: "bg-surface shadow-lg rounded-lg border border-line p-4 min-w-[250px]" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-semibold text-ink" }, "Extend Flowchart"), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            setShowFlowchartToolbar(false);
            setSelectedFlowchartGroup(null);
          },
          className: "text-dim hover:text-dim"
        },
        /* @__PURE__ */ React.createElement(X, { className: "w-4 h-4" })
      )), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim mb-3" }, "Add new elements to your flowchart:"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => addElementToFlowchart("decision"),
          className: "flex items-center space-x-2 p-2 text-xs bg-info/10 hover:bg-info/10 text-info rounded-md transition-colors"
        },
        /* @__PURE__ */ React.createElement("div", { className: "w-3 h-3 bg-info rounded" }),
        /* @__PURE__ */ React.createElement("span", null, "Decision")
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => addElementToFlowchart("outcome"),
          className: "flex items-center space-x-2 p-2 text-xs bg-success/10 hover:bg-success/10 text-success rounded-md transition-colors"
        },
        /* @__PURE__ */ React.createElement("div", { className: "w-3 h-3 bg-success rounded" }),
        /* @__PURE__ */ React.createElement("span", null, "Outcome")
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => addElementToFlowchart("process"),
          className: "flex items-center space-x-2 p-2 text-xs bg-info/10 hover:bg-info/10 text-info rounded-md transition-colors"
        },
        /* @__PURE__ */ React.createElement("div", { className: "w-3 h-3 bg-info rounded" }),
        /* @__PURE__ */ React.createElement("span", null, "Process")
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => addElementToFlowchart("text"),
          className: "flex items-center space-x-2 p-2 text-xs bg-canvas hover:bg-surface-hover text-ink rounded-md transition-colors"
        },
        /* @__PURE__ */ React.createElement("div", { className: "w-3 h-3 bg-cta rounded" }),
        /* @__PURE__ */ React.createElement("span", null, "Text")
      )), /* @__PURE__ */ React.createElement("div", { className: "pt-2 mt-3 border-t border-line" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => deleteFlowchartGroup(selectedFlowchartGroup),
          className: "w-full flex items-center justify-center space-x-2 p-2 text-xs bg-danger/10 hover:bg-danger/10 text-danger rounded-md transition-colors"
        },
        /* @__PURE__ */ React.createElement("span", null, "\u{1F5D1}\uFE0F"),
        /* @__PURE__ */ React.createElement("span", null, "Delete Entire Flowchart")
      ))))),
      isDraggingOver && /* @__PURE__ */ React.createElement(Panel, { position: "center" }, /* @__PURE__ */ React.createElement("div", { className: "text-center pointer-events-none" }, /* @__PURE__ */ React.createElement("div", { className: "w-32 h-32 bg-info/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse" }, /* @__PURE__ */ React.createElement(Plus, { className: "w-16 h-16 text-info" })), /* @__PURE__ */ React.createElement("h3", { className: "text-2xl font-bold text-info mb-2" }, "Drop Here!"), /* @__PURE__ */ React.createElement("p", { className: "text-info mb-6" }, "Release to add element to canvas"))),
      nodes.length === 0 && !isDraggingOver && // <Panel position="center">
      //   <div className="text-center pointer-events-none">
      //     <div className="w-32 h-32 bg-surface-hover rounded-full flex items-center justify-center mx-auto mb-6 opacity-50">
      //       <Plus className="w-16 h-16 text-dim" />
      /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 flex items-center justify-center pointer-events-none" }, /* @__PURE__ */ React.createElement("div", { className: "text-center space-y-2.5" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 bg-surface-hover rounded-full flex items-center justify-center mx-auto opacity-50" }, /* @__PURE__ */ React.createElement(Plus, { className: "w-8 h-8 text-dim" })), /* @__PURE__ */ React.createElement("div", { className: "space-y-0.5" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-dim" }, "Start Creating"), /* @__PURE__ */ React.createElement("p", { className: "text-dim text-xs" }, "Drag elements from the Elements panel"), /* @__PURE__ */ React.createElement("p", { className: "text-dim text-[11px]" }, "or double-click any element to add it"))))
    ),
    !canEdit && userRole !== "client" && /* @__PURE__ */ React.createElement("div", { className: "absolute inset-0 bg-black bg-opacity-5 pointer-events-none z-10 flex items-center justify-center" }, /* @__PURE__ */ React.createElement("div", { className: "bg-surface rounded-lg shadow-lg p-4 border border-line pointer-events-auto" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex-shrink-0" }, /* @__PURE__ */ React.createElement("svg", { className: "h-8 w-8 text-dim", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" }))), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement("h3", { className: "text-xs font-semibold text-ink uppercase tracking-wide" }, "Canvas View Only"), /* @__PURE__ */ React.createElement("p", { className: "text-[11px] leading-snug text-dim" }))))),
    !canEdit && userRole === "client" && /* @__PURE__ */ React.createElement("div", { className: "absolute top-4 right-4 z-10 bg-canvas border border-line rounded-lg px-3 py-2 flex items-center space-x-2 text-xs text-dim" }, /* @__PURE__ */ React.createElement(Eye, { className: "w-3 h-3" }), /* @__PURE__ */ React.createElement("span", null, "View only"))
  )), duplicateToAllState.isVisible && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[90] bg-black/40 backdrop-blur-[1px] flex items-center justify-center px-4" }, /* @__PURE__ */ React.createElement("div", { className: "w-full max-w-md bg-surface rounded-xl shadow-2xl border border-line p-5" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: `mt-0.5 w-8 h-8 rounded-full flex items-center justify-center ${duplicateToAllState.isLoading ? "bg-info/10" : "bg-surface-hover"}` }, duplicateToAllState.isLoading ? /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-4 w-4 border-2 border-info border-t-transparent" }) : /* @__PURE__ */ React.createElement(Check, { className: "w-4 h-4 text-ink" })), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-semibold text-ink" }, duplicateToAllState.isLoading ? "Duplicating Element" : "Duplication Result"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim mt-1" }, duplicateToAllState.message))), duplicateToAllState.total > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between text-[11px] text-dim mb-1" }, /* @__PURE__ */ React.createElement("span", null, "Progress"), /* @__PURE__ */ React.createElement("span", null, duplicateToAllState.processed, "/", duplicateToAllState.total)), /* @__PURE__ */ React.createElement("div", { className: "h-2 rounded-full bg-surface-hover overflow-hidden" }, /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "h-full bg-info transition-all duration-200",
      style: { width: `${Math.min(100, Math.round(duplicateToAllState.processed / Math.max(1, duplicateToAllState.total) * 100))}%` }
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "mt-5 flex justify-end" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: closeDuplicateToAllState,
      disabled: duplicateToAllState.isLoading,
      className: `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${duplicateToAllState.isLoading ? "bg-surface-hover text-dim cursor-not-allowed" : "bg-info text-white hover:bg-info"}`
    },
    "OK"
  )))), /* @__PURE__ */ React.createElement(
    TableConfigModal,
    {
      isOpen: showTableModal,
      onClose: handleTableModalClose,
      onConfirm: handleTableConfigConfirm,
      tableType: pendingTableElement?.id || pendingTableElement?.name
    }
  ), /* @__PURE__ */ React.createElement(
    ChartConfigModal,
    {
      isOpen: showChartModal,
      onClose: handleChartModalClose,
      onConfirm: handleChartConfigConfirm,
      chartType: pendingChartElement?.id || pendingChartElement?.name
    }
  ), /* @__PURE__ */ React.createElement(
    TurnkeyConfigModal,
    {
      isOpen: showTurnkeyModal,
      onClose: handleTurnkeyModalClose,
      onSave: handleTurnkeyConfigConfirm,
      initialData: pendingTurnkeyElement
    }
  ), /* @__PURE__ */ React.createElement(
    ListConfigModal,
    {
      isOpen: showListModal,
      onClose: handleListModalClose,
      onConfirm: handleListConfigConfirm,
      listType: pendingListElement?.id || pendingListElement?.name
    }
  ), /* @__PURE__ */ React.createElement(
    LayoutConfigModal,
    {
      isOpen: showLayoutModal,
      onClose: handleLayoutModalClose,
      onConfirm: handleLayoutConfigConfirm,
      layoutType: pendingLayoutElement?.id || pendingLayoutElement?.type,
      layoutData: pendingLayoutElement
    }
  ), /* @__PURE__ */ React.createElement(
    GroupingModal,
    {
      isOpen: showGroupingModal,
      onClose: handleGroupingModalClose,
      onConfirm: handleGroupingConfirm,
      selectedNodes: manuallySelectedNodes
    }
  ), /* @__PURE__ */ React.createElement(
    GroupingToolbar,
    {
      isVisible: showGroupingToolbar,
      selectedCount: manuallySelectedNodes.length,
      onGroupIntoGrid: handleGroupIntoGrid,
      onAlign: alignSelectedNodes,
      onClose: () => {
        console.log("\u{1F504} Closing grouping toolbar");
        setShowGroupingToolbar(false);
      },
      position: { x: window.innerWidth / 2, y: 150 }
    }
  ), /* @__PURE__ */ React.createElement(
    ContextMenu,
    {
      isVisible: contextMenu.isVisible,
      position: contextMenu.position,
      selectedNodes: contextMenu.selectedNodes,
      onClose: handleContextMenuClose,
      onDuplicate: handleContextMenuDuplicate,
      onDelete: handleContextMenuDelete,
      onEdit: handleContextMenuEdit,
      userPermissions: { canEdit }
    }
  ), /* @__PURE__ */ React.createElement(
    ProcurementRFQDetailsModal,
    {
      isOpen: showProcurementRFQDetailsModal,
      onClose: () => {
        setShowProcurementRFQDetailsModal(false);
        setSelectedProcurementRFQNode(null);
      },
      nodeData: selectedProcurementRFQNode
    }
  ), /* @__PURE__ */ React.createElement(
    ExecutionRequestDetailsModal,
    {
      isOpen: showExecutionRequestDetailsModal,
      onClose: () => {
        setShowExecutionRequestDetailsModal(false);
        setSelectedExecutionRequestNode(null);
      },
      nodeData: selectedExecutionRequestNode
    }
  ), edgeLabelModal.isOpen && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50" }, /* @__PURE__ */ React.createElement("div", { className: "bg-surface rounded-xl shadow-2xl w-full max-w-sm p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ React.createElement("h3", { className: "text-base font-semibold text-ink" }, "Edit Connection"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: closeEdgeLabelModal,
      className: "p-1 hover:bg-surface-hover rounded-lg transition-colors"
    },
    /* @__PURE__ */ React.createElement(X, { className: "w-5 h-5 text-dim" })
  )), /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-ink mb-1" }, "Connection Name"), /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      autoFocus: true,
      value: edgeLabelInput,
      onChange: (e) => setEdgeLabelInput(e.target.value),
      onKeyDown: (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleEdgeLabelSave();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          closeEdgeLabelModal();
        }
      },
      placeholder: "e.g., Data Flow, Approval, Next Step...",
      className: "w-full px-2 py-1.5 text-sm border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-info focus:border-info"
    }
  )), /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-ink mb-1.5" }, "Line Style"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-4 gap-1.5" }, [
    { id: "default", label: "Solid", icon: "\u2501" },
    { id: "dashed", label: "Dashed", icon: "\u2505" },
    { id: "dotted", label: "Dotted", icon: "\u22EF" },
    { id: "animated", label: "Animated", icon: "\u27FF" }
  ].map((style) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: style.id,
      onClick: () => setEdgeStyleInput(style.id),
      className: `px-2 py-1.5 rounded-lg border-2 text-xs font-medium transition-all ${edgeStyleInput === style.id ? "border-info bg-info/10 text-info" : "border-line hover:border-line text-dim"}`
    },
    /* @__PURE__ */ React.createElement("span", { className: "text-lg block mb-1" }, style.icon),
    /* @__PURE__ */ React.createElement("span", { className: "text-xs" }, style.label)
  )))), /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-ink mb-1.5" }, "Line Color"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1.5" }, [
    { color: "#3b82f6", name: "Blue" },
    { color: "#10b981", name: "Green" },
    { color: "#f59e0b", name: "Orange" },
    { color: "#ef4444", name: "Red" },
    { color: "#8b5cf6", name: "Purple" },
    { color: "#6b7280", name: "Gray" },
    { color: "#000000", name: "Black" }
  ].map((c) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: c.color,
      onClick: () => setEdgeColorInput(c.color),
      className: `w-7 h-7 rounded-full border-2 transition-all ${edgeColorInput === c.color ? "border-line ring-2 ring-offset-2 ring-info" : "border-line hover:border-line"}`,
      style: { backgroundColor: c.color },
      title: c.name
    }
  )))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handleDeleteEdge,
      className: "px-2 py-1.5 text-xs rounded-lg border border-danger/30 text-danger hover:bg-danger/10 flex items-center gap-1.5 transition-colors"
    },
    /* @__PURE__ */ React.createElement("svg", { className: "w-3.5 h-3.5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" })),
    "Delete"
  ), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1.5" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: closeEdgeLabelModal,
      className: "px-2 py-1.5 text-xs rounded-lg border border-line text-ink hover:bg-surface-hover transition-colors"
    },
    "Cancel"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      onClick: handleEdgeLabelSave,
      className: "px-2 py-1.5 text-xs rounded-lg bg-info text-white hover:bg-info transition-colors"
    },
    "Save"
  ))))), showClearConfirmation && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" }, /* @__PURE__ */ React.createElement("div", { className: "bg-surface rounded-lg shadow-xl w-full max-w-md overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between p-6 border-b border-line bg-danger/10" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-danger" }, "Clear All Elements?"), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowClearConfirmation(false),
      className: "text-dim hover:text-dim transition-colors"
    },
    /* @__PURE__ */ React.createElement("svg", { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }))
  )), /* @__PURE__ */ React.createElement("div", { className: "p-6" }, /* @__PURE__ */ React.createElement("p", { className: "text-ink mb-2" }, "Are you sure you want to delete everything?"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dim" }, "This will remove all elements and connections from the canvas. This action cannot be undone.")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-end space-x-3 p-6 border-t border-line bg-canvas" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowClearConfirmation(false),
      className: "px-4 py-2 text-sm font-medium text-ink bg-surface border border-line rounded-md hover:bg-canvas transition-colors"
    },
    "Cancel"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        if (nodes.length || edges.length)
          pushToHistory();
        isUpdatingNodesLocallyRef.current = true;
        nodes.forEach((n) => emitOpRef.current?.({
          type: "NODE_DELETE",
          nodeId: n.id,
          taskId: taskIdRef.current,
          subtaskId: subtaskIdRef.current
        }));
        edges.forEach((e) => emitOpRef.current?.({
          type: "EDGE_DELETE",
          edgeId: e.id,
          taskId: taskIdRef.current,
          subtaskId: subtaskIdRef.current
        }));
        setNodes([]);
        setEdges([]);
        if (selectedSubtask?.canvasData) {
          selectedSubtask.canvasData.nodes = [];
          selectedSubtask.canvasData.edges = [];
        }
        elementSequenceRef.current = 0;
        lastAddedNodeIdRef.current = null;
        setTimeout(() => {
          isUpdatingNodesLocallyRef.current = false;
        }, 0);
        console.log("\u{1F9F9} Canvas cleared - all elements and connections removed");
        setShowClearConfirmation(false);
      },
      className: "px-4 py-2 text-sm font-medium text-white bg-danger rounded-md hover:bg-danger transition-colors"
    },
    "Delete All"
  )))), deletionRequestTarget && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-surface rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-line" }, /* @__PURE__ */ React.createElement("div", { className: "bg-danger px-6 py-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 bg-white/20 rounded-full flex items-center justify-center" }, /* @__PURE__ */ React.createElement(Trash2, { className: "w-5 h-5 text-white" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold text-white" }, "Request Deletion"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-white/80" }, deletionRequestTarget.name))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setDeletionRequestTarget(null),
      className: "p-2 hover:bg-white/20 rounded-full transition-colors"
    },
    /* @__PURE__ */ React.createElement(X, { className: "w-5 h-5 text-white" })
  ))), /* @__PURE__ */ React.createElement("div", { className: "p-6" }, /* @__PURE__ */ React.createElement("div", { className: "mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-warning" }, "This element will be marked for deletion. A PM will need to approve this request before it's permanently deleted.")), /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-ink mb-2" }, "Reason for Deletion ", /* @__PURE__ */ React.createElement("span", { className: "text-danger" }, "*")), /* @__PURE__ */ React.createElement(
    "textarea",
    {
      value: deletionRequestReason,
      onChange: (e) => setDeletionRequestReason(e.target.value),
      placeholder: "Enter reason for requesting deletion...",
      className: "w-full px-4 py-3 border border-line rounded-xl focus:ring-2 focus:ring-warning focus:border-warning resize-none transition-all bg-surface text-ink",
      rows: 4,
      autoFocus: true
    }
  ))), /* @__PURE__ */ React.createElement("div", { className: "px-6 py-4 bg-canvas border-t border-line flex space-x-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setDeletionRequestTarget(null),
      disabled: isSubmittingDeletionRequest,
      className: "flex-1 px-4 py-2.5 border border-line text-ink rounded-xl hover:bg-surface-hover transition-colors font-medium"
    },
    "Cancel"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleSubmitCanvasDeletionRequest,
      disabled: !deletionRequestReason.trim() || isSubmittingDeletionRequest,
      className: "flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-all flex items-center justify-center space-x-2 bg-warning hover:bg-warning disabled:bg-warning/30 disabled:cursor-not-allowed"
    },
    isSubmittingDeletionRequest ? /* @__PURE__ */ React.createElement("span", null, "Submitting...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Trash2, { className: "w-4 h-4" }), /* @__PURE__ */ React.createElement("span", null, "Request Deletion"))
  )))));
});
var CanvasWorkspace_default = CanvasWorkspace;
export {
  CanvasWorkspace_default as default
};
