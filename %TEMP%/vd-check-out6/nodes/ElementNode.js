import React, { useState, useContext, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { getWorkspaceById, notifyWorkspaceEvent } from "../../utils/workspaceApi";
import { persistIsImportant, persistDeadline, persistTextContent, persistNodeDataPatch, persistNodeDeletion, getTimeLeft as calculateTimeLeft, formatTimeLeft } from "../../utils/nodePersistence";
import { Handle, Position, useReactFlow, NodeResizer } from "reactflow";
import * as XLSX from "xlsx";
import { Download, Eye, ExternalLink, X, ArrowRight, Check, X as XIcon, Menu, Star, Heart, Info, HelpCircle, Lock, Send, MoreVertical, Copy, Edit2, Trash2, FileText, MessageCircle, FileSpreadsheet } from "lucide-react";
import { useToastOptional } from "../ToastProvider";
import CommentThread from "../comments/CommentThread";
import { VendorContext } from "../../../../context/VendorContext";
import FormTemplate from "../forms/FormTemplate";
import TableRenderer from "../forms/TableRenderer";
import CalendarRenderer from "../forms/CalendarRenderer";
import ChartRenderer from "../forms/ChartRenderer";
import ListRenderer from "../forms/ListRenderer";
import MaterialsRenderer from "../forms/MaterialsRenderer";
import UploadsRenderer from "../forms/UploadsRenderer";
import FileRenderer from "../forms/FileRenderer";
import TaskCardRenderer from "../forms/TaskCardRenderer";
import MaterialSpecCard from "../forms/MaterialSpecCard";
import ImageBlockRenderer from "../forms/ImageBlockRenderer";
import DocumentBlockRenderer from "../forms/DocumentBlockRenderer";
import CadFilesRenderer from "../forms/CadFilesRenderer";
import ConcreteBlocksCalculator from "../forms/ConcreteBlocksCalculator";
import BricksCalculator from "../forms/BricksCalculator";
import ConcreteCalculator from "../forms/ConcreteCalculator";
import FlooringCalculator from "../forms/FlooringCalculator";
import SoilExcavationCalculator from "../forms/SoilExcavationCalculator";
import PlasterCalculator from "../forms/PlasterCalculator";
import PCCCalculator from "../forms/PCCCalculator";
import PuttyCalculator from "../forms/PuttyCalculator";
import SandAggregateCalculator from "../forms/SandAggregateCalculator";
import ConcreteColumnCalculator from "../forms/ConcreteColumnCalculator";
import ConcreteFootingCalculator from "../forms/ConcreteFootingCalculator";
import ConcreteStairsCalculator from "../forms/ConcreteStairsCalculator";
import RCCFormworkCalculator from "../forms/RCCFormworkCalculator";
import RebarBBSCalculator from "../forms/RebarBBSCalculator";
import AACBlocksCalculator from "../forms/AACBlocksCalculator";
import TilesCalculator from "../forms/TilesCalculator";
import WaterproofingCalculator from "../forms/WaterproofingCalculator";
import RoofingCalculator from "../forms/RoofingCalculator";
import DrywallCalculator from "../forms/DrywallCalculator";
import RetainingWallCalculator from "../forms/RetainingWallCalculator";
import DeckingCalculator from "../forms/DeckingCalculator";
import FramingCalculator from "../forms/FramingCalculator";
import LumberCalculator from "../forms/LumberCalculator";
import RoofTrussCalculator from "../forms/RoofTrussCalculator";
import SteelEstimationCalculator from "../forms/SteelEstimationCalculator";
import VinylFlooringCalculator from "../forms/VinylFlooringCalculator";
import PaintingEstimator from "../forms/PaintingEstimator";
import ElectricalWiringEstimator from "../forms/ElectricalWiringEstimator";
import BOQGenerator from "../forms/BOQGenerator";
import CustomBOQDocument from "../forms/CustomBOQDocument";
import CostCalculatorSummary from "../forms/CostCalculatorSummary";
import ShipmentCard from "../forms/ShipmentCard";
import FreightCostCalculator from "../forms/FreightCostCalculator";
import RouteOptimizationBlock from "../forms/RouteOptimizationBlock";
import ProofOfDeliveryBlock from "../forms/ProofOfDeliveryBlock";
import ExceptionDelayReport from "../forms/ExceptionDelayReport";
import CarrierPerformanceScorecard from "../forms/CarrierPerformanceScorecard";
import TablePreviewModal from "../modals/TablePreviewModal";
import { createTableHelpers, defaultTableData } from "../../utils/tableUtils";
const ElementNode = ({ id, data, isConnectable, selected }) => {
  const workspaceId = data.workspaceId;
  const { setNodes, setEdges } = useReactFlow();
  const [saving, setSaving] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [deadline, setDeadline] = useState(data.deadline || null);
  const [showDeadlineInput, setShowDeadlineInput] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const menuDropdownRef = useRef(null);
  const toast = useToastOptional();
  const [isNodeHovered, setIsNodeHovered] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const commentPopoverRef = useRef(null);
  const deadlineJustSetRef = useRef(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger((prev) => prev + 1);
    }, 3e4);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(event.target)) {
        setShowMenuDropdown(false);
      }
    };
    if (showMenuDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenuDropdown]);
  useEffect(() => {
    if (deadlineJustSetRef.current) {
      console.log("\u23F3 Deadline was just set locally, skipping sync to prevent clearing");
      return;
    }
    if (data.deadline && data.deadline !== deadline) {
      console.log("\u{1F504} Syncing deadline from node data:", { dataDeadline: data.deadline, stateDeadline: deadline });
      setDeadline(data.deadline);
    }
    if (data.isImportant !== void 0 && data.isImportant !== isImportant) {
      console.log("\u{1F504} Syncing isImportant from node data:", { dataIsImportant: data.isImportant, stateIsImportant: isImportant });
      setIsImportant(data.isImportant);
    }
  }, [data.deadline, data.isImportant]);
  const { currentUser } = useContext(VendorContext);
  const [inputValue, setInputValue] = useState(data?.inputValue || "");
  const [textareaValue, setTextareaValue] = useState(data?.textareaValue || "");
  const [commentBoxOpen, setCommentBoxOpen] = useState(!data?.textareaValue?.trim());
  const [checkboxValue, setCheckboxValue] = useState(false);
  const nodeComments = data.comments || [];
  const unresolvedCommentCount = nodeComments.filter((c) => !c.resolved).length;
  const handleAddComment = async (nodeId, comment) => {
    const updatedComments = [...nodeComments, comment];
    try {
      await persistNodeDataPatch(nodeId, { comments: updatedComments }, setNodes, workspaceId);
      if (comment.mentionedUserIds && comment.mentionedUserIds.length > 0) {
        try {
          await fetch("/api/workspace/comments/mention", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId,
              nodeId,
              elementName: data.name || data.type || "element",
              commentText: comment.text,
              authorName: comment.authorName,
              mentionedUserIds: comment.mentionedUserIds
            })
          });
        } catch (err) {
          console.error("Failed to send mention notifications:", err);
        }
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };
  const handleResolveComment = async (nodeId, commentId) => {
    const updatedComments = nodeComments.map(
      (c) => c.id === commentId ? { ...c, resolved: !c.resolved, resolvedAt: !c.resolved ? (/* @__PURE__ */ new Date()).toISOString() : null } : c
    );
    try {
      await persistNodeDataPatch(nodeId, { comments: updatedComments }, setNodes, workspaceId);
    } catch (err) {
      console.error("Failed to resolve comment:", err);
    }
  };
  const handleDeleteComment = async (nodeId, commentId) => {
    const updatedComments = nodeComments.filter((c) => c.id !== commentId);
    try {
      await persistNodeDataPatch(nodeId, { comments: updatedComments }, setNodes, workspaceId);
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };
  const [radioValue, setRadioValue] = useState(data?.radioValue || "");
  const [fieldLabel, setFieldLabel] = useState(data?.fieldLabel || "");
  const [isEditingField, setIsEditingField] = useState(false);
  const [radioOptions, setRadioOptions] = useState(data?.radioOptions || ["Option 1", "Option 2"]);
  const [checkboxOptions, setCheckboxOptions] = useState(data?.checkboxOptions || ["Option 1", "Option 2", "Option 3"]);
  const [checkedItems, setCheckedItems] = useState(data?.checkedItems || {});
  const textareaTimeoutRef = useRef(null);
  const inputTimeoutRef = useRef(null);
  useEffect(() => {
    if (!workspaceId || data.type !== "textarea")
      return;
    if (textareaTimeoutRef.current) {
      clearTimeout(textareaTimeoutRef.current);
    }
    textareaTimeoutRef.current = setTimeout(async () => {
      if (textareaValue && textareaValue.length > 0) {
        try {
          console.log("\u{1F4BE} Auto-saving textarea content");
          await persistTextContent(id, textareaValue, "textareaValue", setNodes, workspaceId);
        } catch (error) {
          console.error("\u274C Error auto-saving textarea:", error);
        }
      }
    }, 2e3);
    return () => {
      if (textareaTimeoutRef.current) {
        clearTimeout(textareaTimeoutRef.current);
      }
    };
  }, [textareaValue, workspaceId, data.type, id, setNodes]);
  useEffect(() => {
    if (!workspaceId || data.type !== "textbox" && data.type !== "input")
      return;
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current);
    }
    inputTimeoutRef.current = setTimeout(async () => {
      try {
        console.log("\u{1F4BE} Auto-saving input field content");
        await persistNodeDataPatch(
          id,
          { inputValue, fieldLabel, lastModifiedAt: (/* @__PURE__ */ new Date()).toISOString() },
          null,
          workspaceId
        );
      } catch (error) {
        console.error("\u274C Error auto-saving input field:", error);
      }
    }, 1500);
    return () => {
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
      }
    };
  }, [inputValue, fieldLabel, workspaceId, data.type, id]);
  const [selectOptions, setSelectOptions] = useState(data?.selectOptions || []);
  const [selectValue, setSelectValueState] = useState(data?.selectedValue || "");
  const selectTimeoutRef = useRef(null);
  useEffect(() => {
    if (!workspaceId || data.type !== "select" && data.type !== "dropdown")
      return;
    if (selectTimeoutRef.current) {
      clearTimeout(selectTimeoutRef.current);
    }
    selectTimeoutRef.current = setTimeout(async () => {
      try {
        console.log("\u{1F4BE} Auto-saving dropdown options and value");
        setNodes(
          (nodes) => nodes.map(
            (node) => node.id === id ? {
              ...node,
              data: {
                ...node.data,
                selectOptions,
                selectedValue: selectValue,
                fieldLabel,
                lastModifiedAt: (/* @__PURE__ */ new Date()).toISOString()
              }
            } : node
          )
        );
        await persistNodeDataPatch(
          id,
          {
            selectOptions,
            selectedValue: selectValue,
            fieldLabel,
            lastModifiedAt: (/* @__PURE__ */ new Date()).toISOString()
          },
          null,
          workspaceId
        );
        console.log("\u2705 Dropdown data saved to backend");
      } catch (error) {
        console.error("\u274C Error auto-saving dropdown:", error);
      }
    }, 1e3);
    return () => {
      if (selectTimeoutRef.current) {
        clearTimeout(selectTimeoutRef.current);
      }
    };
  }, [selectOptions, selectValue, fieldLabel, workspaceId, data.type, id, setNodes]);
  useEffect(() => {
    if (!workspaceId || data.type !== "radio")
      return;
    const t = setTimeout(() => {
      persistNodeDataPatch(
        id,
        { radioOptions, radioValue, fieldLabel, lastModifiedAt: (/* @__PURE__ */ new Date()).toISOString() },
        null,
        workspaceId
      ).catch((err) => console.error("\u274C Error auto-saving radio:", err));
    }, 1e3);
    return () => clearTimeout(t);
  }, [radioOptions, radioValue, fieldLabel, workspaceId, data.type, id]);
  useEffect(() => {
    if (!workspaceId || data.type !== "checkbox")
      return;
    const t = setTimeout(() => {
      persistNodeDataPatch(
        id,
        { checkboxOptions, checkedItems, fieldLabel, lastModifiedAt: (/* @__PURE__ */ new Date()).toISOString() },
        null,
        workspaceId
      ).catch((err) => console.error("\u274C Error auto-saving checkbox:", err));
    }, 1e3);
    return () => clearTimeout(t);
  }, [checkboxOptions, checkedItems, fieldLabel, workspaceId, data.type, id]);
  const setSelectValue = (value) => {
    setSelectValueState(value);
  };
  const [buttonText, setButtonText] = useState(data?.buttonText || "Click Me");
  const [buttonAction, setButtonAction] = useState(data?.buttonAction || "custom");
  const [buttonAssignee, setButtonAssignee] = useState(data?.buttonAssignee || null);
  const [isEditingButton, setIsEditingButton] = useState(false);
  const [tableData, setTableData] = useState(defaultTableData);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [filterText, setFilterText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [editingCell, setEditingCell] = useState(null);
  const [expandedRows, setExpandedRows] = useState(/* @__PURE__ */ new Set());
  const [selectedDate, setSelectedDate] = useState(/* @__PURE__ */ new Date());
  const [currentMonth, setCurrentMonth] = useState(/* @__PURE__ */ new Date());
  const [showPreview, setShowPreview] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState(null);
  const [approvalReason, setApprovalReason] = useState("");
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [isSubmittingDeletion, setIsSubmittingDeletion] = useState(false);
  const [showHelpTutorial, setShowHelpTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const tutorialSteps = [
    {
      title: "Welcome to the Workspace! \u{1F44B}",
      description: "This is your collaborative canvas where you can build workflows, forms, and visualize data. Let's take a quick tour!",
      icon: "\u{1F3AF}"
    },
    {
      title: "Drag & Drop Elements",
      description: "Use the Elements panel on the left to drag and drop components like forms, tables, charts, and more onto your canvas.",
      icon: "\u{1F4E6}"
    },
    {
      title: "Connect Elements",
      description: "Elements automatically connect when dropped near each other. You can also manually drag connections between the gray dots on element edges.",
      icon: "\u{1F517}"
    },
    {
      title: "Edit & Customize",
      description: "Click on any element to select it. Use the controls to edit content, mark as important, or set deadlines.",
      icon: "\u270F\uFE0F"
    },
    {
      title: "Mark Important",
      description: "Use the '\u2606 Mark Important' button to highlight critical elements. Important items get a golden border.",
      icon: "\u2B50"
    },
    {
      title: "Set Deadlines",
      description: "Click 'Set Deadline' to add due dates. A countdown timer will appear showing time remaining.",
      icon: "\u23F0"
    },
    {
      title: "Info Button",
      description: "Hover over the blue 'i' icon to see element details - who added it, when, and what it does.",
      icon: "\u2139\uFE0F"
    },
    {
      title: "Zoom & Pan",
      description: "Use the controls at the bottom to zoom in/out. Hold Space + drag to pan around the canvas.",
      icon: "\u{1F50D}"
    },
    {
      title: "Auto-Save",
      description: "Your work is automatically saved. Look for the save indicator at the top to confirm changes are saved.",
      icon: "\u{1F4BE}"
    },
    {
      title: "You're All Set! \u{1F389}",
      description: "Start creating by dragging elements from the left panel. Need help? Click the '?' button anytime!",
      icon: "\u{1F680}"
    }
  ];
  const formatDate = (dateString) => {
    if (!dateString)
      return "Unknown";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "Unknown";
    }
  };
  const canApprove = () => {
    const currentUserRole = getCurrentUserRole();
    const approvalStatus = data.approvalStatus || "draft";
    if (currentUserRole === "pm" && approvalStatus === "sent_to_pm" && !data.pmApproval) {
      return true;
    }
    if (currentUserRole === "client" && approvalStatus === "pm_approved" && !data.clientApproval) {
      return true;
    }
    return false;
  };
  const getCurrentUserRole = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserRole = urlParams.get("userRole");
    const urlUserId = urlParams.get("userId") || "";
    if (urlUserRole === "finance" || urlUserId.startsWith("FIN-")) {
      return "finance";
    }
    if (urlUserRole && ["vendor", "pm", "client"].includes(urlUserRole)) {
      return urlUserRole;
    }
    return currentUser?.role || "vendor";
  };
  const isElementLocked = () => {
    const approvalStatus = data.approvalStatus || "draft";
    return ["sent_to_pm", "pm_approved", "client_approved", "locked"].includes(approvalStatus);
  };
  const handleApprovalClick = (action) => {
    setApprovalAction(action);
    setApprovalReason("");
    setShowApprovalModal(true);
  };
  const handleApprovalSubmit = async () => {
    if (!approvalReason.trim()) {
      console.warn("\u26A0\uFE0F Approval submit blocked: empty reason", { nodeId: id, approvalAction });
      return;
    }
    setIsSubmittingApproval(true);
    window.__isApprovingInProgress = true;
    const currentUserRole = getCurrentUserRole();
    let newApprovalStatus;
    let approvalDataKey;
    if (approvalAction === "approve") {
      if (currentUserRole === "pm") {
        newApprovalStatus = "pm_approved";
        approvalDataKey = "pmApproval";
      } else if (currentUserRole === "client") {
        newApprovalStatus = "client_approved";
        approvalDataKey = "clientApproval";
      } else {
        newApprovalStatus = "approved";
        approvalDataKey = "approval";
      }
    } else {
      newApprovalStatus = "rejected";
      approvalDataKey = currentUserRole === "pm" ? "pmApproval" : currentUserRole === "client" ? "clientApproval" : "approval";
    }
    const newApprovalData = {
      approvalStatus: newApprovalStatus,
      // Clear legacy approval fields (they're now in nested objects)
      approvalReason: null,
      approvedBy: null,
      approvedByEmail: null,
      approvedByRole: null,
      approvalTimestamp: null,
      // Add the new nested approval object
      [approvalDataKey]: {
        approvedBy: currentUser?.name || currentUser?.email || "Unknown User",
        approvedByEmail: currentUser?.email || null,
        approvedByRole: currentUserRole,
        approvalTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
        approvalReason: approvalReason.trim(),
        status: approvalAction === "approve" ? "approved" : "rejected"
      }
    };
    console.log("\u{1F680} Starting approval submission:", {
      elementId: id,
      currentUserRole,
      approvalAction,
      newApprovalStatus,
      approvalDataKey,
      newApprovalData
    });
    try {
      console.log("\u{1F4E4} Persisting approval patch (subtask-aware)...", { nodeId: id, workspaceId });
      await persistNodeDataPatch(id, newApprovalData, setNodes, workspaceId, { bypassApprovalFlow: true });
      console.log("\u{1F504} Fetching fresh workspace data...");
      const freshWorkspaceData = await getWorkspaceById(workspaceId);
      if (freshWorkspaceData) {
        let updatedNodeFromServer = null;
        (freshWorkspaceData.tasks || []).forEach((task) => {
          (task.subtasks || []).forEach((subtask) => {
            (subtask.canvasData?.nodes || []).forEach((node) => {
              if (node.id === id) {
                updatedNodeFromServer = node;
              }
            });
          });
        });
        console.log("\u{1F504} Updating local React Flow state with server data...");
        if (updatedNodeFromServer && updatedNodeFromServer.data?.approvalStatus === newApprovalStatus) {
          setNodes((nds) => nds.map((node) => {
            if (node.id === id) {
              console.log("\u{1F4DD} Local state updated with server node data:", updatedNodeFromServer.data);
              return updatedNodeFromServer;
            }
            return node;
          }));
        } else {
          console.warn("\u26A0\uFE0F Fresh data missing approval \u2014 applying patch locally", {
            nodeId: id,
            expected: newApprovalStatus,
            received: updatedNodeFromServer?.data?.approvalStatus
          });
          setNodes((nds) => nds.map(
            (node) => node.id === id ? { ...node, data: { ...node.data || {}, ...newApprovalData } } : node
          ));
        }
      }
      setForceUpdate((prev) => prev + 1);
      window.dispatchEvent(new CustomEvent("approvalCompleted", {
        detail: {
          nodeId: id,
          workspaceId,
          newStatus: newApprovalStatus,
          timestamp: Date.now()
        }
      }));
      notifyWorkspaceEvent({
        workspaceId,
        roles: ["pm", "vendor", "client"],
        excludeUserId: currentUser?.vendorId || currentUser?.userId || currentUser?.pmId || currentUser?.id,
        type: "approval_result",
        title: `Element ${approvalAction === "approve" ? "approved" : "rejected"}`,
        message: `${currentUser?.name || currentUser?.email || "A collaborator"} ${approvalAction}d "${data.name || data.type || "an element"}"${newApprovalStatus === "pm_approved" ? " \u2014 awaiting client approval" : ""}`,
        data: { nodeId: id, elementName: data.name, elementType: data.type, status: newApprovalStatus },
        priority: approvalAction === "approve" ? "medium" : "high",
        actionRequired: newApprovalStatus === "pm_approved"
      });
      console.log(`\u2705 Element ${approvalAction}d successfully by ${currentUserRole}. Status: ${newApprovalStatus}`);
    } catch (error) {
      console.error("\u274C Error updating approval status:", error);
      alert(`Failed to ${approvalAction} element. Please try again. Error: ${error.message}`);
    } finally {
      console.log("\u{1F3C1} Approval submission cleanup");
      setIsSubmittingApproval(false);
      setShowApprovalModal(false);
      setApprovalAction(null);
      setApprovalReason("");
      setTimeout(() => {
        window.__isApprovingInProgress = false;
        console.log("\u2705 Approval workflow completed, canvas saves re-enabled");
      }, 2e3);
    }
  };
  const getApprovalStatusColor = () => {
    switch (data.approvalStatus) {
      case "sent_to_pm":
        return "bg-info/10 text-info border-info/30";
      case "pm_approved":
        return "bg-warning/10 text-warning border-warning/30";
      case "client_approved":
        return "bg-success/10 text-success border-success/30";
      case "locked":
        return "bg-surface-hover text-ink border-line";
      case "rejected":
        return "bg-danger/10 text-danger border-danger/30";
      default:
        return "bg-surface-hover text-ink border-line";
    }
  };
  const isRecentlyUpdated = () => {
    if (!data.addedAt && !data.lastUpdatedAt) {
      return false;
    }
    const timestamp = data.lastUpdatedAt || data.addedAt;
    const now2 = /* @__PURE__ */ new Date();
    const elementTime = new Date(timestamp);
    const minutesDiff = (now2 - elementTime) / (1e3 * 60);
    return minutesDiff < 5;
  };
  const getApprovalStatusIcon = () => {
    switch (data.approvalStatus) {
      case "sent_to_pm":
        return "\u{1F4E4}";
      case "pm_approved":
        return "\u2713";
      case "client_approved":
        return "\u2713\u2713";
      case "locked":
        return "\u{1F512}";
      case "rejected":
        return "\u2715";
      default:
        return "\u{1F4DD}";
    }
  };
  const getElementDescription = (type) => {
    const descriptions = {
      // Form elements
      "textbox": "A single-line text input field for capturing short text like names, emails, or titles.",
      "textarea": "A multi-line text area for longer content like descriptions, comments, or messages.",
      "input": "A basic input field for collecting user data such as text, numbers, or dates.",
      "select": "A dropdown menu that allows users to choose one option from a predefined list.",
      "checkbox": "A toggle control that lets users select multiple options from a group.",
      "radio": "A selection control where users can choose only one option from a group.",
      "button": "A clickable button that triggers an action like submit, save, or navigate.",
      "form": "A complete form template with multiple input fields for data collection.",
      "form-template": "A pre-built form layout with common fields ready to customize.",
      // Table elements
      "table": "A data table for displaying structured information in rows and columns.",
      "basic-table": "A simple table for displaying data in a grid format.",
      "sortable-table": "A table with clickable headers to sort data ascending or descending.",
      "filterable-table": "A table with search/filter functionality to find specific data.",
      "paginated-table": "A table with pagination controls for browsing large datasets.",
      "editable-table": "A table where cell values can be edited directly inline.",
      "expandable-table": "A table with expandable rows to show additional details.",
      // Chart elements
      "chart": "A visual representation of data using graphs like bar, line, or pie charts.",
      "bar-chart": "A bar chart for comparing quantities across different categories.",
      "line-chart": "A line chart for showing trends and changes over time.",
      "pie-chart": "A pie chart for displaying proportions and percentages of a whole.",
      // Layout elements
      "divider": "A horizontal line to visually separate sections of content.",
      "spacer": "An invisible element that adds vertical spacing between components.",
      "container": "A wrapper element to group and organize other components.",
      "grid": "A layout grid for arranging elements in rows and columns.",
      "frame": "A container with borders to frame and highlight content.",
      // Media elements
      "image": "An image placeholder or uploaded image for visual content.",
      "file": "An uploaded file attachment like documents, PDFs, or spreadsheets.",
      "image-block": "A block element for displaying images with captions.",
      "cad-files": "Upload CAD drawings (.dwg, .dxf, .step, .iges, .stl, .obj) \u2014 each file is scanned and shown as a card.",
      "cdr-files": "Upload CorelDRAW (.cdr) files \u2014 each file is shown as a card with an SVG preview.",
      "floor-plan": "Upload a floor plan (.dwg, .dxf, .png, .pdf) \u2014 auto-extrudes walls into a 3D model with a spec panel.",
      // Special elements
      "calendar": "A calendar widget for date selection and event display.",
      "calendar-event": "A calendar event card showing scheduled items.",
      "list": "A list component for displaying items in an ordered or unordered format.",
      "smart-note": "An intelligent note-taking element with rich text support.",
      "approval-board": "A workflow board for tracking approvals and sign-offs.",
      "task-card": "A task card for tracking work items with status and progress.",
      "task-card-progress": "A task card with progress bar and completion tracking.",
      "turnkey-workflow": "A pre-configured workflow template for common processes.",
      // Icons
      "icon": "A decorative or functional icon element.",
      // Invoice/Quote elements
      "invoice": "An invoice document showing billing details and amounts.",
      "quotation": "A quotation document with pricing and terms for proposals."
    };
    return descriptions[type?.toLowerCase()] || descriptions[type] || `A ${type || "custom"} element for your workspace canvas.`;
  };
  const isTableElement = () => {
    return data.type === "table" || data.id?.includes("table") || ["basic-table", "sortable-table", "filterable-table", "paginated-table", "editable-table", "expandable-table"].includes(data.id);
  };
  const handleDuplicate = async () => {
    setShowMenuDropdown(false);
    const event = new CustomEvent("element-duplicate", { detail: { nodeId: id, nodeData: data } });
    window.dispatchEvent(event);
  };
  const handleDuplicateToAllSubtasks = async () => {
    setShowMenuDropdown(false);
    const event = new CustomEvent("element-duplicate-to-all-subtasks", {
      detail: { nodeId: id, nodeData: data }
    });
    window.dispatchEvent(event);
  };
  const handleEdit = () => {
    setShowMenuDropdown(false);
    console.log("Edit element:", id);
  };
  const handleDelete = async () => {
    setShowMenuDropdown(false);
    const currentUserRole = getCurrentUserRole();
    if (currentUserRole === "vendor") {
      setShowDeletionModal(true);
    } else if (currentUserRole === "pm") {
      if (data.deletionRequested) {
        if (window.confirm("Approve deletion of this element?")) {
          document.dispatchEvent(new CustomEvent("deleteElement", { detail: { elementId: id } }));
        }
      } else {
        if (window.confirm("Are you sure you want to delete this element?")) {
          document.dispatchEvent(new CustomEvent("deleteElement", { detail: { elementId: id } }));
        }
      }
    }
  };
  const canApproveDeletion = () => {
    const currentUserRole = getCurrentUserRole();
    return currentUserRole === "pm" && data.deletionRequested && !data.deletionApprovedAt;
  };
  const handleSubmitDeletionRequest = async () => {
    setIsSubmittingDeletion(true);
    try {
      const patch = {
        deletionRequested: true,
        deletionRequestedAt: (/* @__PURE__ */ new Date()).toISOString(),
        deletionRequestedBy: currentUser?.name || currentUser?.email || "Unknown User",
        deletionReason: deletionReason || "No reason provided"
      };
      console.log("\u{1F4E4} Persisting deletion request...", { nodeId: id, workspaceId, patch });
      await persistNodeDataPatch(
        id,
        patch,
        setNodes,
        workspaceId,
        { bypassApprovalFlow: true }
      );
      setNodes(
        (nodes) => nodes.map(
          (node) => node.id === id ? {
            ...node,
            data: {
              ...node.data,
              ...patch
            }
          } : node
        )
      );
      console.log("\u2705 Deletion request persisted successfully");
      setShowDeletionModal(false);
      setDeletionReason("");
      const event = new CustomEvent("element-deletion-requested", { detail: { nodeId: id } });
      window.dispatchEvent(event);
      notifyWorkspaceEvent({
        workspaceId,
        roles: ["pm"],
        excludeUserId: currentUser?.vendorId || currentUser?.userId || currentUser?.pmId || currentUser?.id,
        type: "deletion_request",
        title: "Deletion requested",
        message: `${currentUser?.name || currentUser?.email || "A vendor"} requested deletion of "${data.name || data.type || "an element"}"`,
        data: { nodeId: id, elementName: data.name, elementType: data.type, taskId: data.taskId, subtaskId: data.subtaskId },
        priority: "high",
        actionRequired: true
      });
    } catch (error) {
      console.error("\u274C Error submitting deletion request:", error);
      alert("Failed to submit deletion request");
    } finally {
      setIsSubmittingDeletion(false);
    }
  };
  const handleApproveDeletion = async () => {
    if (!window.confirm("Approve deletion of this element?"))
      return;
    try {
      setIsSubmittingDeletion(true);
      document.dispatchEvent(new CustomEvent("deleteElement", { detail: { elementId: id } }));
      await persistNodeDeletion(id, setNodes, setEdges, workspaceId);
      console.log("\u2705 Element deleted successfully by PM:", { nodeId: id, workspaceId });
      const event = new CustomEvent("element-deleted", { detail: { nodeId: id } });
      window.dispatchEvent(event);
      notifyWorkspaceEvent({
        workspaceId,
        roles: ["pm", "vendor", "client"],
        excludeUserId: currentUser?.vendorId || currentUser?.userId || currentUser?.pmId || currentUser?.id,
        type: "deletion_approved",
        title: "Deletion approved",
        message: `${currentUser?.name || currentUser?.email || "A PM"} approved deletion of "${data.name || data.type || "an element"}"`,
        data: { nodeId: id, elementName: data.name, elementType: data.type }
      });
    } catch (error) {
      console.error("\u274C Error approving deletion:", error);
      alert("Failed to approve deletion");
    } finally {
      setIsSubmittingDeletion(false);
    }
  };
  const handleRejectDeletion = async () => {
    if (!window.confirm("Reject deletion request for this element?"))
      return;
    try {
      const patch = {
        deletionRequested: false,
        deletionRequestedAt: null,
        deletionRequestedBy: null,
        deletionReason: null,
        deletionRejectedAt: (/* @__PURE__ */ new Date()).toISOString(),
        deletionRejectedBy: currentUser?.name || currentUser?.email || "Unknown User"
      };
      console.log("\u{1F4CB} Persisting deletion rejection...", { nodeId: id, workspaceId, patch });
      await persistNodeDataPatch(
        id,
        patch,
        setNodes,
        workspaceId,
        { bypassApprovalFlow: true }
      );
      setNodes(
        (nodes) => nodes.map(
          (node) => node.id === id ? {
            ...node,
            data: {
              ...node.data,
              ...patch
            }
          } : node
        )
      );
      console.log("\u2705 Deletion request rejected successfully");
      const event = new CustomEvent("element-deletion-rejected", { detail: { nodeId: id } });
      window.dispatchEvent(event);
      notifyWorkspaceEvent({
        workspaceId,
        roles: ["pm", "vendor", "client"],
        excludeUserId: currentUser?.vendorId || currentUser?.userId || currentUser?.pmId || currentUser?.id,
        type: "deletion_rejected",
        title: "Deletion rejected",
        message: `${currentUser?.name || currentUser?.email || "A PM"} rejected the deletion request for "${data.name || data.type || "an element"}"`,
        data: { nodeId: id, elementName: data.name, elementType: data.type }
      });
    } catch (error) {
      console.error("\u274C Error rejecting deletion:", error);
      alert("Failed to reject deletion request");
    }
  };
  useEffect(() => {
    const handleExternalDeletionRequest = (event) => {
      if (event.detail?.nodeId !== id)
        return;
      if (getCurrentUserRole() !== "vendor")
        return;
      if (data.deletionRequested)
        return;
      setShowDeletionModal(true);
    };
    window.addEventListener("request-element-deletion", handleExternalDeletionRequest);
    return () => window.removeEventListener("request-element-deletion", handleExternalDeletionRequest);
  }, [id, data.deletionRequested, currentUser]);
  const handlePreviewClick = (e) => {
    e.stopPropagation();
    setShowPreview(true);
  };
  const handleDocumentPreviewClick = (e) => {
    e.stopPropagation();
    if (!data.documentUrl)
      return;
    setShowDocumentPreview(true);
  };
  const handleDocumentDownload = (e) => {
    e.stopPropagation();
    if (!data.documentUrl)
      return;
    const anchor = document.createElement("a");
    anchor.href = data.documentUrl;
    anchor.download = `${data.documentMeta?.id || data.name || "document"}.pdf`;
    anchor.target = "_blank";
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };
  const handleDocumentOpen = (e) => {
    e.stopPropagation();
    if (!data.documentUrl)
      return;
    window.open(data.documentUrl, "_blank", "noopener,noreferrer");
  };
  const renderDocumentElement = () => {
    const meta = data.documentMeta || {};
    if (!data.documentUrl) {
      return /* @__PURE__ */ React.createElement("div", { className: "p-4 rounded-lg border border-warning/20 bg-warning/10 text-sm text-warning" }, "Document URL unavailable. Please re-upload the file from the source list.");
    }
    const isPdf = data.documentUrl?.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      return /* @__PURE__ */ React.createElement("div", { className: "w-full h-full flex flex-col bg-surface overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-4 p-2 border-b border-line bg-canvas flex-shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-ink truncate" }, data.name), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-dim" }, meta.id || "Document")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-0.5 flex-shrink-0" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: handleDocumentPreviewClick,
          className: "p-1 rounded text-dim hover:text-info hover:bg-info/10 transition-colors",
          title: "Preview"
        },
        /* @__PURE__ */ React.createElement(Eye, { className: "w-3 h-3" })
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: handleDocumentDownload,
          className: "p-1 rounded text-dim hover:text-ink hover:bg-surface-hover transition-colors",
          title: "Download"
        },
        /* @__PURE__ */ React.createElement(Download, { className: "w-3 h-3" })
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: handleDocumentOpen,
          className: "p-1 rounded text-dim hover:text-info hover:bg-info/10 transition-colors",
          title: "Open in new tab"
        },
        /* @__PURE__ */ React.createElement(ExternalLink, { className: "w-3 h-3" })
      ))), /* @__PURE__ */ React.createElement("div", { className: "flex-1 bg-surface-hover overflow-hidden min-h-0" }, /* @__PURE__ */ React.createElement(
        "iframe",
        {
          src: `${data.documentUrl}#toolbar=0&navpanes=0&zoom=fit`,
          title: data.name,
          className: "w-full h-full",
          style: { border: "none", display: "block" }
        }
      )));
    }
    return /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-xl border border-line bg-canvas p-4 " }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-ink" }, data.name), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-xs text-dim" }, meta.id || "Document")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleDocumentPreviewClick,
        className: "p-2 rounded-md text-dim hover:text-info hover:bg-info/10 transition-colors",
        title: "Preview"
      },
      /* @__PURE__ */ React.createElement(Eye, { className: "w-4 h-4" })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleDocumentDownload,
        className: "p-2 rounded-md text-dim hover:text-ink hover:bg-surface-hover transition-colors",
        title: "Download"
      },
      /* @__PURE__ */ React.createElement(Download, { className: "w-4 h-4" })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleDocumentOpen,
        className: "p-2 rounded-md text-dim hover:text-info hover:bg-info/10 transition-colors",
        title: "Open in new tab"
      },
      /* @__PURE__ */ React.createElement(ExternalLink, { className: "w-4 h-4" })
    ))), /* @__PURE__ */ React.createElement("div", { className: "mt-4 grid grid-cols-2 gap-3 text-xs text-dim" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-dim" }, "Customer"), /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 text-ink" }, meta.customer || "\u2014")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-dim" }, "Date"), /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 text-ink" }, meta.date ? new Date(meta.date).toLocaleDateString() : "\u2014")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-dim" }, "Amount"), /* @__PURE__ */ React.createElement("p", { className: "mt-0.5 text-ink" }, meta.amount || "\u2014")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-medium text-dim" }, "Status"), /* @__PURE__ */ React.createElement("p", { className: "mt-0.5" }, meta.status ? /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-ink border border-line" }, meta.status) : "\u2014")))));
  };
  const getPreviewTableData = () => {
    if (data.customTableData) {
      return {
        columns: data.customTableData.columns,
        data: data.customTableData.data
      };
    }
    return {
      columns: ["name", "email", "role", "status"],
      data: tableData
    };
  };
  const getTableExportAOA = () => {
    const { columns, data: rows } = getPreviewTableData();
    const headers = Array.isArray(columns) ? columns : [];
    const colKeys = headers.map((col) => typeof col === "string" ? col : col.key || col.id || col.label || "");
    const colLabels = headers.map((col) => typeof col === "string" ? col : col.label || col.key || col.id || "");
    const body = (rows || []).map(
      (row) => colKeys.map((key) => {
        const val = row?.[key];
        if (val === null || val === void 0)
          return "";
        return typeof val === "object" ? JSON.stringify(val) : val;
      })
    );
    return [colLabels, ...body];
  };
  const handleDownloadExcel = (e) => {
    e?.stopPropagation?.();
    try {
      const worksheet = XLSX.utils.aoa_to_sheet(getTableExportAOA());
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Table");
      const filename = `${(data.name || "table").replace(/[^a-z0-9]+/gi, "_")}.xlsx`;
      XLSX.writeFile(workbook, filename);
      toast?.success?.("Excel file downloaded");
    } catch (err) {
      console.error("\u274C Excel export failed:", err);
      toast?.error?.("Failed to export Excel");
    }
  };
  const handleExportGoogleSheets = async (e) => {
    e?.stopPropagation?.();
    const tsv = getTableExportAOA().map((row) => row.map((cell) => String(cell).replace(/\t/g, " ").replace(/\r?\n/g, " ")).join("	")).join("\n");
    let copied = false;
    try {
      await navigator.clipboard.writeText(tsv);
      copied = true;
    } catch (err) {
      try {
        const ta = document.createElement("textarea");
        ta.value = tsv;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        copied = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch (fallbackErr) {
        console.error("\u274C Clipboard copy failed:", err, fallbackErr);
      }
    }
    window.open("https://sheets.new", "_blank", "noopener,noreferrer");
    if (copied) {
      toast?.info?.("Table copied to clipboard \u2014 in the Google Sheet, click a cell and press Cmd+V (Mac) or Ctrl+V to paste it", 6e3);
    } else {
      toast?.error?.("Could not copy the table automatically \u2014 use the Excel download icon instead", 6e3);
    }
  };
  const tableHelpers = createTableHelpers(
    tableData,
    setTableData,
    sortColumn,
    setSortColumn,
    sortDirection,
    setSortDirection,
    filterText,
    itemsPerPage,
    currentPage,
    setEditingCell,
    expandedRows,
    setExpandedRows
  );
  const renderFieldLabel = (fallback) => {
    if (isElementLocked()) {
      const text = fieldLabel || fallback;
      return text ? /* @__PURE__ */ React.createElement("div", { className: "text-xs font-semibold text-dim mb-1" }, text) : null;
    }
    return /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: fieldLabel,
        placeholder: fallback,
        onChange: (e) => setFieldLabel(e.target.value),
        onKeyDown: (e) => e.stopPropagation(),
        onClick: (e) => e.stopPropagation(),
        className: "text-xs font-semibold text-dim mb-1 w-full bg-transparent outline-none border-b border-transparent focus:border-info/30 placeholder-dim pb-0.5"
      }
    );
  };
  const renderOptionsEditor = (options, setOptions) => /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5", onClick: (e) => e.stopPropagation() }, options.map((opt, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      value: opt,
      onChange: (e) => setOptions(options.map((o, j) => j === i ? e.target.value : o)),
      onKeyDown: (e) => e.stopPropagation(),
      className: "flex-1 px-2 py-1 text-xs border border-line rounded focus:outline-none focus:ring-1 focus:ring-info"
    }
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setOptions(options.filter((_, j) => j !== i)),
      className: "p-1 text-dim hover:text-danger transition-colors",
      title: "Remove option"
    },
    /* @__PURE__ */ React.createElement(X, { className: "w-3.5 h-3.5" })
  ))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1.5 pt-1" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setOptions([...options, `Option ${options.length + 1}`]),
      className: "flex-1 text-[11px] font-medium text-info hover:bg-info/10 border border-dashed border-info/30 rounded py-1.5 transition-colors"
    },
    "+ Add option"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setIsEditingField(false),
      className: "px-3 text-[11px] font-medium text-white bg-info hover:bg-info rounded py-1.5 transition-colors"
    },
    "Done"
  )));
  const renderEditOptionsLink = () => !isElementLocked() && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: (e) => {
        e.stopPropagation();
        setIsEditingField(true);
      },
      className: "mt-1.5 text-[11px] font-medium text-info hover:text-info flex items-center gap-1 transition-colors"
    },
    /* @__PURE__ */ React.createElement(Edit2, { className: "w-3 h-3" }),
    "Edit options"
  );
  const renderTableElement = () => {
    return /* @__PURE__ */ React.createElement(
      TableRenderer,
      {
        data,
        tableData,
        sortColumn,
        sortDirection,
        filterText,
        currentPage,
        itemsPerPage,
        editingCell,
        expandedRows,
        ...tableHelpers,
        setFilterText,
        setItemsPerPage,
        setCurrentPage,
        setEditingCell
      }
    );
  };
  const renderCalendarElement = () => {
    return /* @__PURE__ */ React.createElement(
      CalendarRenderer,
      {
        selectedDate,
        currentMonth,
        setSelectedDate,
        setCurrentMonth
      }
    );
  };
  const renderChartElement = () => {
    return /* @__PURE__ */ React.createElement(
      ChartRenderer,
      {
        data,
        chartType: data.id
      }
    );
  };
  const renderListElement = () => {
    return /* @__PURE__ */ React.createElement(
      ListRenderer,
      {
        data,
        listType: data.id
      }
    );
  };
  const renderMaterialsElement = () => {
    return /* @__PURE__ */ React.createElement(
      MaterialsRenderer,
      {
        data,
        materialType: data.id,
        workspaceId: data.workspaceId,
        currentUser,
        nodeId: id
      }
    );
  };
  const renderUploadsElement = () => {
    return /* @__PURE__ */ React.createElement(
      UploadsRenderer,
      {
        data,
        uploadType: data.id
      }
    );
  };
  const renderFileElement = () => {
    return /* @__PURE__ */ React.createElement(
      FileRenderer,
      {
        data
      }
    );
  };
  const renderInteractiveElement = () => {
    const isLocked = isElementLocked();
    switch (data.type) {
      case "textarea":
        return /* @__PURE__ */ React.createElement(
          "textarea",
          {
            value: textareaValue,
            onChange: (e) => !isLocked && setTextareaValue(e.target.value),
            className: `w-full h-32 p-4 border-2 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-info focus:border-info text-base ${isLocked ? "border-line bg-canvas text-dim cursor-not-allowed" : "border-line"}`,
            placeholder: isLocked ? "Element is locked" : "Enter your text here...",
            onClick: (e) => e.stopPropagation(),
            onKeyDown: (e) => e.stopPropagation(),
            onFocus: (e) => e.stopPropagation(),
            readOnly: isLocked
          }
        );
      case "textbox":
      case "input":
        return /* @__PURE__ */ React.createElement("div", null, renderFieldLabel("Field label"), /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "text",
            value: inputValue,
            onChange: (e) => !isLocked && setInputValue(e.target.value),
            className: `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-info focus:border-info text-sm bg-surface ${isLocked ? "border-line bg-canvas text-dim cursor-not-allowed" : "border-line"}`,
            placeholder: isLocked ? "Element is locked" : "Enter value...",
            onClick: (e) => e.stopPropagation(),
            onKeyDown: (e) => e.stopPropagation(),
            onFocus: (e) => e.stopPropagation(),
            readOnly: isLocked
          }
        ));
      case "button":
        return /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, isEditingButton && !isLocked ? /* @__PURE__ */ React.createElement(
          "input",
          {
            type: "text",
            value: buttonText,
            onChange: (e) => setButtonText(e.target.value),
            onBlur: () => setIsEditingButton(false),
            onKeyPress: (e) => {
              if (e.key === "Enter") {
                setIsEditingButton(false);
              }
            },
            onKeyDown: (e) => e.stopPropagation(),
            className: "w-full p-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-info",
            placeholder: "Button text",
            autoFocus: true
          }
        ) : /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              if (!isLocked) {
                alert(`${buttonText} clicked!`);
              }
            },
            onDoubleClick: (e) => {
              e.stopPropagation();
              if (!isLocked) {
                setIsEditingButton(true);
              }
            },
            className: `w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-info transition-colors ${isLocked ? "bg-cta text-dim cursor-not-allowed" : "bg-info text-cta-foreground hover:bg-info"}`,
            disabled: isLocked
          },
          buttonText
        ), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-dim text-center" }, isLocked ? "Element is locked" : "Double-click to edit text"));
      case "quotation":
      case "invoice":
        return renderDocumentElement();
      case "select":
      case "dropdown":
        return /* @__PURE__ */ React.createElement("div", null, renderFieldLabel("Dropdown"), isEditingField && !isLocked ? renderOptionsEditor(selectOptions, setSelectOptions) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
          "select",
          {
            value: selectValue,
            onChange: (e) => !isLocked && setSelectValue(e.target.value),
            className: `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-info focus:border-info text-sm bg-surface ${isLocked ? "border-line bg-canvas text-dim cursor-not-allowed" : "border-line"}`,
            onClick: (e) => e.stopPropagation(),
            onKeyDown: (e) => e.stopPropagation(),
            onFocus: (e) => e.stopPropagation(),
            disabled: isLocked
          },
          /* @__PURE__ */ React.createElement("option", { value: "" }, isLocked ? "Element is locked" : "Select an option"),
          selectOptions.map((option, index) => /* @__PURE__ */ React.createElement("option", { key: index, value: option }, option))
        ), renderEditOptionsLink()));
      case "checkbox":
        return /* @__PURE__ */ React.createElement("div", null, renderFieldLabel("Select all that apply"), isEditingField && !isLocked ? renderOptionsEditor(checkboxOptions, setCheckboxOptions) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, checkboxOptions.map((option, index) => /* @__PURE__ */ React.createElement(
          "label",
          {
            key: index,
            className: `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-colors ${checkedItems[option] ? "border-info/30 bg-info/10" : "border-line hover:border-line hover:bg-canvas"} ${isLocked ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`
          },
          /* @__PURE__ */ React.createElement(
            "input",
            {
              type: "checkbox",
              checked: checkedItems[option] || false,
              onChange: (e) => !isLocked && setCheckedItems({
                ...checkedItems,
                [option]: e.target.checked
              }),
              className: "w-4 h-4 rounded border-line text-info focus:ring-info",
              onClick: (e) => e.stopPropagation(),
              onKeyDown: (e) => e.stopPropagation(),
              onFocus: (e) => e.stopPropagation(),
              disabled: isLocked
            }
          ),
          /* @__PURE__ */ React.createElement("span", { className: `text-sm ${isLocked ? "text-dim" : "text-ink"}` }, option)
        ))), renderEditOptionsLink()));
      case "radio":
        return /* @__PURE__ */ React.createElement("div", null, renderFieldLabel("Select one"), isEditingField && !isLocked ? renderOptionsEditor(radioOptions, setRadioOptions) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, radioOptions.map((option, index) => /* @__PURE__ */ React.createElement(
          "label",
          {
            key: index,
            className: `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-colors ${radioValue === option ? "border-info/30 bg-info/10" : "border-line hover:border-line hover:bg-canvas"} ${isLocked ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`
          },
          /* @__PURE__ */ React.createElement(
            "input",
            {
              type: "radio",
              name: `radio-${id}`,
              value: option,
              checked: radioValue === option,
              onChange: (e) => !isLocked && setRadioValue(e.target.value),
              className: "w-4 h-4 border-line text-info focus:ring-info",
              onClick: (e) => e.stopPropagation(),
              onKeyDown: (e) => e.stopPropagation(),
              onFocus: (e) => e.stopPropagation(),
              disabled: isLocked
            }
          ),
          /* @__PURE__ */ React.createElement("span", { className: `text-sm ${isLocked ? "text-dim" : "text-ink"}` }, option)
        ))), renderEditOptionsLink()));
      case "form-template":
        console.log("\u{1F4CB} Rendering FormTemplate with data:", {
          nodeId: id,
          workspaceId,
          formData: data?.formData
        });
        return /* @__PURE__ */ React.createElement(
          FormTemplate,
          {
            nodeId: id,
            workspaceId,
            initialFormData: data?.formData
          }
        );
      case "table":
        return renderTableElement();
      case "calendar":
        return renderCalendarElement();
      case "chart":
        return renderChartElement();
      case "list":
        return renderListElement();
      case "materials":
        return renderMaterialsElement();
      case "upload":
        return renderUploadsElement();
      case "file":
        return renderFileElement();
      case "image-block":
        return /* @__PURE__ */ React.createElement(ImageBlockRenderer, { data, nodeId: id, workspaceId, setNodes });
      case "document-block":
        return /* @__PURE__ */ React.createElement(DocumentBlockRenderer, { data, nodeId: id, workspaceId, setNodes });
      case "cad-files":
        return /* @__PURE__ */ React.createElement(CadFilesRenderer, { data, nodeId: id, workspaceId, taskId: data.taskId, subtaskId: data.subtaskId, setNodes });
      case "cdr-files":
        return /* @__PURE__ */ React.createElement(CadFilesRenderer, { variant: "cdr", data, nodeId: id, workspaceId, taskId: data.taskId, subtaskId: data.subtaskId, setNodes });
      case "floor-plan":
        return /* @__PURE__ */ React.createElement(CadFilesRenderer, { variant: "floorplan", data, nodeId: id, workspaceId, taskId: data.taskId, subtaskId: data.subtaskId, setNodes });
      case "procurement-rfq-request": {
        const request = data.procurementRFQData?.request || {};
        const rfq = data.procurementRFQData?.rfqFormData || {};
        const product = rfq.productDetails || {};
        const logistics = rfq.tradeLogistics || {};
        return /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-lg border border-warning/20 bg-warning/10 p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-warning uppercase tracking-wide" }, "Procurement RFQ"), /* @__PURE__ */ React.createElement("div", { className: "mt-2 space-y-1 text-xs text-ink" }, /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Item:"), " ", product.productName || request.item || "-"), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Qty:"), " ", request.quantity || rfq.quantityPricing?.quantity || "-", " ", rfq.quantityPricing?.quantityUnit || ""), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Priority:"), " ", request.priority || "-"), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Required By:"), " ", logistics.requiredByDate || request.requiredByDate || "-"))), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              document.dispatchEvent(new CustomEvent("openRequestDetails", {
                detail: { nodeId: id, requestType: "procurement-rfq-request" }
              }));
            },
            className: "w-full inline-flex items-center justify-center gap-2 rounded-lg border border-info/20 bg-info/10 px-3 py-2 text-xs font-semibold text-info hover:bg-info/10"
          },
          /* @__PURE__ */ React.createElement(Eye, { className: "w-3.5 h-3.5" }),
          "View Full RFQ"
        ));
      }
      case "execution-request": {
        const request = data.executionRequestData?.executionRequest || {};
        const isDailyLog = request.templateType === "execution-daily-site-log";
        return /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-lg border border-info/20 bg-info/10 p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-info uppercase tracking-wide" }, "Execution Preview"), /* @__PURE__ */ React.createElement("div", { className: "mt-2 space-y-1 text-xs text-ink" }, /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Status:"), " ", request.status || "-"), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Location:"), " ", request.location || "-"), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Assignee:"), " ", request.assignee || "-"), isDailyLog ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Skilled / Unskilled:"), " ", request.laborSkilled || 0, " / ", request.laborUnskilled || 0), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Weather:"), " ", request.weatherConditions || "-"), /* @__PURE__ */ React.createElement("p", { className: "line-clamp-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Work Done:"), " ", request.workCompletedToday || "-")) : /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Priority:"), " ", request.priority || "-"))), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              document.dispatchEvent(new CustomEvent("openRequestDetails", {
                detail: { nodeId: id, requestType: "execution-request" }
              }));
            },
            className: "w-full inline-flex items-center justify-center gap-2 rounded-lg border border-info/20 bg-info/10 px-3 py-2 text-xs font-semibold text-info hover:bg-info/10"
          },
          /* @__PURE__ */ React.createElement(Eye, { className: "w-3.5 h-3.5" }),
          "View Full Request"
        ));
      }
      case "card":
        return /* @__PURE__ */ React.createElement(MaterialSpecCard, { data, nodeId: id, workspaceId, setNodes });
      case "task-card":
      case "task-card-progress":
        return /* @__PURE__ */ React.createElement(TaskCardRenderer, { data, nodeId: id, workspaceId, setNodes });
      case "boq-generator":
        return /* @__PURE__ */ React.createElement(BOQGenerator, null);
      case "custom-boq":
        return /* @__PURE__ */ React.createElement(
          CustomBOQDocument,
          {
            boq: data.customBOQData,
            role: getCurrentUserRole(),
            nodeId: id,
            setNodes,
            workspaceId
          }
        );
      case "calculator":
      case "cost-calculator":
        const lowerName = (data.name || "").toLowerCase();
        const lowerId = (data.id || "").toLowerCase();
        if (lowerName.includes("vinyl") || lowerId.includes("vinyl")) {
          return /* @__PURE__ */ React.createElement(VinylFlooringCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("steel") || lowerId.includes("steel")) {
          return /* @__PURE__ */ React.createElement(SteelEstimationCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("paint") || lowerId.includes("paint")) {
          return /* @__PURE__ */ React.createElement(PaintingEstimator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("electrical") || lowerName.includes("wiring") || lowerId.includes("electrical") || lowerId.includes("wiring")) {
          return /* @__PURE__ */ React.createElement(ElectricalWiringEstimator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("rebar") || lowerName.includes("bbs") || lowerId.includes("rebar") || lowerId.includes("bbs")) {
          return /* @__PURE__ */ React.createElement(RebarBBSCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("aac") || lowerId.includes("aac")) {
          return /* @__PURE__ */ React.createElement(AACBlocksCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("tile") || lowerId.includes("tile")) {
          return /* @__PURE__ */ React.createElement(TilesCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("truss") || lowerId.includes("truss")) {
          return /* @__PURE__ */ React.createElement(RoofTrussCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("decking") || lowerName.includes("deck") || lowerId.includes("decking") || lowerId.includes("deck")) {
          return /* @__PURE__ */ React.createElement(DeckingCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("framing") || lowerId.includes("framing")) {
          return /* @__PURE__ */ React.createElement(FramingCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("lumber") || lowerName.includes("board foot") || lowerId.includes("lumber")) {
          return /* @__PURE__ */ React.createElement(LumberCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("waterproof") || lowerId.includes("waterproof")) {
          return /* @__PURE__ */ React.createElement(WaterproofingCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("roofing") || lowerName.includes("roof") || lowerId.includes("roofing") || lowerId.includes("roof")) {
          return /* @__PURE__ */ React.createElement(RoofingCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("drywall") || lowerName.includes("partition") || lowerId.includes("drywall") || lowerId.includes("partition")) {
          return /* @__PURE__ */ React.createElement(DrywallCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("retaining") || lowerId.includes("retaining")) {
          return /* @__PURE__ */ React.createElement(RetainingWallCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("brick") || lowerId.includes("brick")) {
          return /* @__PURE__ */ React.createElement(BricksCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("block") || lowerId.includes("block")) {
          return /* @__PURE__ */ React.createElement(ConcreteBlocksCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("column") || lowerId.includes("column")) {
          return /* @__PURE__ */ React.createElement(ConcreteColumnCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("footing") || lowerId.includes("footing")) {
          return /* @__PURE__ */ React.createElement(ConcreteFootingCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("stair") || lowerId.includes("stair")) {
          return /* @__PURE__ */ React.createElement(ConcreteStairsCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("formwork") || lowerName.includes("shuttering") || lowerId.includes("formwork") || lowerId.includes("shuttering")) {
          return /* @__PURE__ */ React.createElement(RCCFormworkCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("concrete") || lowerName.includes("cement") || lowerId.includes("concrete") || lowerId.includes("cement")) {
          return /* @__PURE__ */ React.createElement(ConcreteCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("soil") || lowerName.includes("excavat") || lowerId.includes("soil") || lowerId.includes("excavat")) {
          return /* @__PURE__ */ React.createElement(SoilExcavationCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("plaster") || lowerId.includes("plaster")) {
          return /* @__PURE__ */ React.createElement(PlasterCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("pcc") || lowerId.includes("pcc")) {
          return /* @__PURE__ */ React.createElement(PCCCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("putty") || lowerId.includes("putty")) {
          return /* @__PURE__ */ React.createElement(PuttyCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("sand") || lowerName.includes("aggregate") || lowerId.includes("sand") || lowerId.includes("aggregate")) {
          return /* @__PURE__ */ React.createElement(SandAggregateCalculator, { data, nodeId: id, workspaceId, setNodes });
        } else if (lowerName.includes("flooring") || lowerName.includes("floor") || lowerId.includes("flooring") || lowerId.includes("floor")) {
          return /* @__PURE__ */ React.createElement(FlooringCalculator, { data, nodeId: id, workspaceId, setNodes });
        }
        return /* @__PURE__ */ React.createElement(ConcreteBlocksCalculator, { data, nodeId: id, workspaceId, setNodes });
      case "cost-calculator-summary":
        return /* @__PURE__ */ React.createElement(CostCalculatorSummary, { data });
      case "logistics-shipment":
        return /* @__PURE__ */ React.createElement(ShipmentCard, { data, nodeId: id, workspaceId, setNodes });
      case "logistics-freight-cost":
        return /* @__PURE__ */ React.createElement(FreightCostCalculator, { data, nodeId: id, workspaceId, setNodes });
      case "logistics-route-optimization":
        return /* @__PURE__ */ React.createElement(RouteOptimizationBlock, { data, nodeId: id, workspaceId, setNodes });
      case "logistics-pod":
        return /* @__PURE__ */ React.createElement(ProofOfDeliveryBlock, { data, nodeId: id, workspaceId, setNodes });
      case "logistics-exception-report":
        return /* @__PURE__ */ React.createElement(ExceptionDelayReport, { data, nodeId: id, workspaceId, setNodes });
      case "logistics-carrier-scorecard":
        return /* @__PURE__ */ React.createElement(CarrierPerformanceScorecard, { data, nodeId: id, workspaceId, setNodes });
      case "icon":
        return renderIconElement();
      case "divider":
        return renderDividerElement();
      case "spacer":
        return renderSpacerElement();
      case "container":
        return renderContainerElement();
      case "grid":
        return renderGridElement();
      default:
        return /* @__PURE__ */ React.createElement("div", { className: "text-center py-4 bg-surface-hover rounded border" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-medium text-dim uppercase tracking-wide" }, data.type));
    }
  };
  const getIconComponent = (iconId) => {
    const iconMap = {
      "arrow-icon": ArrowRight,
      "check-icon": Check,
      "close-icon": XIcon,
      "menu-icon": Menu,
      "star-icon": Star,
      "heart-icon": Heart
    };
    const IconComponent = iconMap[iconId] || ArrowRight;
    return IconComponent;
  };
  const renderIconElement = () => {
    const IconComponent = getIconComponent(data.id);
    return /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center p-4" }, /* @__PURE__ */ React.createElement(IconComponent, { className: "w-16 h-16 text-ink" }));
  };
  const renderDividerElement = () => {
    return /* @__PURE__ */ React.createElement("div", { className: "w-full" }, /* @__PURE__ */ React.createElement("hr", { className: "border-t-2 border-line w-full" }));
  };
  const renderSpacerElement = () => {
    return /* @__PURE__ */ React.createElement("div", { className: "w-full h-16 bg-canvas border-2 border-dashed border-line rounded flex items-center justify-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-dim" }, "Spacer"));
  };
  const renderContainerElement = () => {
    return /* @__PURE__ */ React.createElement("div", { className: "w-full min-h-[120px] border-2 border-line rounded-lg bg-canvas p-4 flex items-center justify-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("div", { className: "w-12 h-12 border-2 border-line rounded-lg mx-auto mb-2 flex items-center justify-center" }, /* @__PURE__ */ React.createElement("span", { className: "text-dim text-xs" }, "\u{1F4E6}")), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-dim" }, "Container")));
  };
  const renderGridElement = () => {
    return /* @__PURE__ */ React.createElement("div", { className: "w-full min-h-[120px] border-2 border-line rounded-lg bg-canvas p-3" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-2 h-full" }, [1, 2, 3, 4, 5, 6].map((item) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: item,
        className: "border border-line rounded bg-surface flex items-center justify-center min-h-[40px]"
      },
      /* @__PURE__ */ React.createElement("span", { className: "text-xs text-dim" }, item)
    ))));
  };
  const getBorderStyle = () => {
    if (isImportant) {
      return "border-warning ring-4 ring-warning/20 shadow-yellow-200";
    }
    if (data.isManuallySelected) {
      return "border-success ring-4 ring-success/20 shadow-green-200";
    }
    if (data.isInSelectionMode) {
      return "border-info/30 hover:border-info cursor-pointer";
    }
    if (selected) {
      return "border-info ring-2 ring-info/20";
    }
    return "border-info";
  };
  if (data.type === "icon") {
    const IconComponent = getIconComponent(data.id);
    return /* @__PURE__ */ React.createElement("div", { className: `bg-transparent border-2 rounded-lg shadow-lg p-2 relative group transition-all min-w-[80px] max-w-[120px] ${getBorderStyle()}` }, /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "source",
        position: Position.Top,
        id: "top-out",
        style: { left: "50%" },
        className: "w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta",
        isConnectable
      }
    ), /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "target",
        position: Position.Top,
        id: "top-in",
        style: { left: "50%" },
        className: "w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta",
        isConnectable
      }
    ), /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "source",
        position: Position.Right,
        id: "right-out",
        style: { top: "50%" },
        className: "w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta",
        isConnectable
      }
    ), /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "target",
        position: Position.Right,
        id: "right-in",
        style: { top: "50%" },
        className: "w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta",
        isConnectable
      }
    ), /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "source",
        position: Position.Bottom,
        id: "bottom-out",
        style: { left: "50%" },
        className: "w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta",
        isConnectable
      }
    ), /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "target",
        position: Position.Bottom,
        id: "bottom-in",
        style: { left: "50%" },
        className: "w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta",
        isConnectable
      }
    ), /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "source",
        position: Position.Left,
        id: "left-out",
        style: { top: "50%" },
        className: "w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta",
        isConnectable
      }
    ), /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "target",
        position: Position.Left,
        id: "left-in",
        style: { top: "50%" },
        className: "w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta",
        isConnectable
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center" }, /* @__PURE__ */ React.createElement(IconComponent, { className: "w-12 h-12 text-ink" })), selected && /* @__PURE__ */ React.createElement("div", { className: "absolute -top-2 -right-2 w-5 h-5 bg-info text-white rounded-full flex items-center justify-center text-[10px] font-bold" }, "E"));
  }
  if (data.type === "button") {
    const isLocked = isElementLocked();
    const BUTTON_ACTION_OPTIONS = [
      { id: "custom", label: "Custom", tone: "neutral", done: "Clicked" },
      { id: "approve", label: "Approve", tone: "positive", done: "Approved" },
      { id: "submit", label: "Submit", tone: "positive", done: "Submitted" },
      { id: "reject", label: "Reject", tone: "negative", done: "Rejected" },
      { id: "cancel", label: "Cancel", tone: "negative", done: "Cancelled" }
    ];
    const buttonResult = data.buttonResult || null;
    const isDone = !!buttonResult;
    const doneLabel = isDone ? BUTTON_ACTION_OPTIONS.find((o) => o.id === (buttonResult.action || buttonAction))?.done || "Done" : null;
    const doneTone = isDone ? BUTTON_ACTION_OPTIONS.find((o) => o.id === (buttonResult.action || buttonAction))?.tone || "neutral" : null;
    const collaborators = (data.workspaceCollaborators || []).filter(
      (c, i, arr) => arr.findIndex((x) => (x.vendorId || x.userId || x.email) === (c.vendorId || c.userId || c.email)) === i
    );
    const urlUserParams = new URLSearchParams(window.location.search);
    const myIds = [
      currentUser?.vendorId,
      currentUser?.userId,
      currentUser?.pmId,
      currentUser?.id,
      urlUserParams.get("pmId"),
      urlUserParams.get("userId"),
      urlUserParams.get("clientId")
    ].filter(Boolean);
    const myEmail = currentUser?.email || (urlUserParams.get("userEmail") ? decodeURIComponent(urlUserParams.get("userEmail")) : null);
    const assignedTo = buttonAssignee || data.buttonAssignee;
    const isAssignee = !assignedTo || myIds.some((id2) => id2 === assignedTo.vendorId || id2 === assignedTo.userId || id2 === assignedTo.id) || assignedTo.email && myEmail && assignedTo.email === myEmail;
    const buttonTone = BUTTON_ACTION_OPTIONS.find((o) => o.id === buttonAction)?.tone || "neutral";
    const buttonColorClasses = isDone ? doneTone === "positive" ? "bg-cta text-cta-foreground cursor-default" : doneTone === "negative" ? "bg-danger text-white cursor-default" : "bg-cta text-cta-foreground cursor-default" : isLocked ? "bg-cta text-dim cursor-not-allowed" : !isAssignee ? buttonTone === "positive" ? "bg-cta text-cta-foreground opacity-60 cursor-not-allowed" : buttonTone === "negative" ? "bg-danger text-white opacity-60 cursor-not-allowed" : "bg-info text-white opacity-60 cursor-not-allowed" : buttonTone === "positive" ? "bg-cta text-cta-foreground hover:bg-cta " : buttonTone === "negative" ? "bg-danger text-white hover:bg-danger " : "bg-info text-white hover:bg-info ";
    const persistButtonPatch = async (updates) => {
      try {
        setNodes(
          (nodes) => nodes.map(
            (node) => node.id === id ? { ...node, data: { ...node.data, ...updates } } : node
          )
        );
        await persistNodeDataPatch(id, updates, null, workspaceId);
      } catch (err) {
        console.error("Failed to save button config:", err);
      }
    };
    const persistButtonChanges = async () => {
      await persistButtonPatch({
        buttonText,
        buttonAction,
        buttonAssignee,
        lastModifiedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    };
    const handleButtonEditDone = async () => {
      setIsEditingButton(false);
      await persistButtonChanges();
    };
    const handleButtonTrigger = async (e) => {
      e.stopPropagation();
      if (isLocked || isDone || !isAssignee)
        return;
      const result = {
        status: BUTTON_ACTION_OPTIONS.find((o) => o.id === buttonAction)?.done?.toLowerCase() || "clicked",
        action: buttonAction,
        label: buttonText,
        by: currentUser?.name || (urlUserParams.get("userName") ? decodeURIComponent(urlUserParams.get("userName")) : null) || myEmail || "Unknown User",
        byRole: getCurrentUserRole(),
        at: (/* @__PURE__ */ new Date()).toISOString()
      };
      await persistButtonPatch({ buttonResult: result, lastModifiedAt: result.at });
    };
    const handleButtonReset = async () => {
      await persistButtonPatch({ buttonResult: null, lastModifiedAt: (/* @__PURE__ */ new Date()).toISOString() });
      setIsEditingButton(false);
    };
    return /* @__PURE__ */ React.createElement("div", { className: `relative group ${selected ? "z-10" : ""}` }, /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "source",
        position: Position.Top,
        id: "top-out",
        style: { left: "50%" },
        className: "w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity",
        isConnectable
      }
    ), /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "target",
        position: Position.Top,
        id: "top-in",
        style: { left: "50%" },
        className: "w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity",
        isConnectable
      }
    ), /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "source",
        position: Position.Right,
        id: "right-out",
        style: { top: "50%" },
        className: "w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity",
        isConnectable
      }
    ), /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "target",
        position: Position.Right,
        id: "right-in",
        style: { top: "50%" },
        className: "w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity",
        isConnectable
      }
    ), /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "source",
        position: Position.Bottom,
        id: "bottom-out",
        style: { left: "50%" },
        className: "w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity",
        isConnectable
      }
    ), /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "target",
        position: Position.Bottom,
        id: "bottom-in",
        style: { left: "50%" },
        className: "w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity",
        isConnectable
      }
    ), /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "source",
        position: Position.Left,
        id: "left-out",
        style: { top: "50%" },
        className: "w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity",
        isConnectable
      }
    ), /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "target",
        position: Position.Left,
        id: "left-in",
        style: { top: "50%" },
        className: "w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity",
        isConnectable
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleButtonTrigger,
        onDoubleClick: (e) => {
          e.stopPropagation();
          if (!isLocked) {
            setIsEditingButton(true);
          }
        },
        disabled: isLocked || isDone,
        title: isDone ? `${doneLabel} by ${buttonResult.by}` : !isAssignee && assignedTo ? `Only ${assignedTo.name || "the assigned user"} can trigger this` : buttonText,
        className: `px-6 py-2.5 rounded-md text-sm font-semibold  transition-all focus:outline-none focus:ring-2 focus:ring-info ${buttonColorClasses} ${selected ? "ring-2 ring-info/30 ring-offset-2" : ""} ${isImportant ? "ring-4 ring-warning/30" : ""}`
      },
      isDone ? `${doneTone === "negative" ? "\u2717" : "\u2713"} ${doneLabel}` : buttonText
    ), isDone ? /* @__PURE__ */ React.createElement("div", { className: "absolute top-full left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap text-[10px] font-medium text-dim" }, doneLabel, " by ", buttonResult.by, buttonResult.byRole ? ` (${buttonResult.byRole.toUpperCase()})` : "", " \xB7 ", new Date(buttonResult.at).toLocaleString()) : assignedTo ? /* @__PURE__ */ React.createElement("div", { className: "absolute top-full left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap text-[10px] font-medium text-dim" }, isAssignee ? `Assigned to you \u2014 click to ${buttonAction === "custom" ? "confirm" : buttonAction}` : `Waiting for ${assignedTo.name || "assignee"} to ${buttonAction === "custom" ? "act" : buttonAction}`) : null, !isLocked && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          setIsEditingButton((v) => !v);
        },
        className: "absolute -right-9 top-1/2 -translate-y-1/2  z-30 w-6 h-6 bg-surface text-dim hover:text-info hover:bg-info/10 rounded-full flex items-center justify-center  border border-line transition-colors",
        title: "Edit button"
      },
      /* @__PURE__ */ React.createElement(Edit2, { className: "w-3 h-3" })
    ), isEditingButton && !isLocked && /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "absolute top-full left-1/2 -translate-x-1/2 mt-7 z-40 w-60 bg-surface border border-line rounded-lg shadow-xl p-3 space-y-2",
        onClick: (e) => e.stopPropagation(),
        onDoubleClick: (e) => e.stopPropagation()
      },
      /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-[10px] font-semibold uppercase tracking-wide text-dim mb-1" }, "Label"), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          value: buttonText,
          onChange: (e) => setButtonText(e.target.value),
          onKeyDown: (e) => {
            e.stopPropagation();
            if (e.key === "Enter")
              handleButtonEditDone();
          },
          className: "w-full px-2 py-1.5 border border-line rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-info",
          placeholder: "Button text",
          autoFocus: true
        }
      )),
      /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-[10px] font-semibold uppercase tracking-wide text-dim mb-1" }, "Action"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1" }, BUTTON_ACTION_OPTIONS.map((option) => /* @__PURE__ */ React.createElement(
        "button",
        {
          key: option.id,
          onClick: () => setButtonAction(option.id),
          className: `px-2 py-1 rounded text-[11px] font-medium border transition-colors ${buttonAction === option.id ? option.tone === "positive" ? "bg-cta text-cta-foreground border-line" : option.tone === "negative" ? "bg-danger text-white border-danger" : "bg-info text-white border-info" : "bg-surface text-dim border-line hover:bg-canvas"}`
        },
        option.label
      )))),
      /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-[10px] font-semibold uppercase tracking-wide text-dim mb-1" }, "Who can act"), /* @__PURE__ */ React.createElement(
        "select",
        {
          value: buttonAssignee ? buttonAssignee.vendorId || buttonAssignee.userId || buttonAssignee.email || "" : "",
          onChange: (e) => {
            const key = e.target.value;
            const collab = collaborators.find((c) => (c.vendorId || c.userId || c.email) === key);
            setButtonAssignee(collab ? {
              vendorId: collab.vendorId || collab.userId || null,
              userId: collab.userId || null,
              name: collab.name || collab.email || "Unknown",
              email: collab.email || null,
              role: collab.role || collab.userType || null
            } : null);
          },
          className: "w-full px-2 py-1.5 border border-line rounded-md text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-info"
        },
        /* @__PURE__ */ React.createElement("option", { value: "" }, "Anyone"),
        collaborators.map((collab) => {
          const key = collab.vendorId || collab.userId || collab.email;
          const roleLabel = collab.role || collab.userType || (collab.isClient ? "client" : null);
          return /* @__PURE__ */ React.createElement("option", { key, value: key }, collab.name || collab.email || "Unknown", roleLabel ? ` (${roleLabel.toUpperCase()})` : "");
        })
      )),
      isDone && /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between px-2 py-1.5 bg-canvas border border-line rounded-md" }, /* @__PURE__ */ React.createElement("span", { className: "text-[11px] text-dim" }, doneLabel, " by ", buttonResult.by), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: handleButtonReset,
          className: "text-[11px] font-medium text-danger hover:text-danger"
        },
        "Reset"
      )),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: handleButtonEditDone,
          className: "w-full px-2 py-1.5 bg-info hover:bg-info text-white text-xs font-semibold rounded-md transition-colors"
        },
        "Done"
      )
    ), data.sequenceNumber && /* @__PURE__ */ React.createElement("div", { className: "absolute -top-3 -left-3 z-20 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white" }, data.sequenceNumber), data.locked && /* @__PURE__ */ React.createElement("div", { className: "absolute -top-3 -right-3 z-20 w-5 h-5 bg-warning text-white rounded-full flex items-center justify-center  border-2 border-white", title: "Element is locked" }, /* @__PURE__ */ React.createElement(Lock, { className: "w-3 h-3" })), selected && !data.locked && /* @__PURE__ */ React.createElement("div", { className: "absolute -top-2 -right-2 w-5 h-5 bg-info text-white rounded-full flex items-center justify-center text-[10px] font-bold" }, "E"));
  }
  if (data.type === "textarea") {
    const authorName = data.addedBy || currentUser?.name || "You";
    const authorInitial = authorName.charAt(0).toUpperCase();
    const isLocked = ["sent_to_pm", "pm_approved", "client_approved", "locked"].includes(data.approvalStatus || "draft");
    const hasContent = !!(textareaValue && textareaValue.trim());
    const addedDate = data.addedAt ? new Date(data.addedAt) : /* @__PURE__ */ new Date();
    const timeAgo = (() => {
      const diff = Date.now() - addedDate.getTime();
      const mins = Math.floor(diff / 6e4);
      if (mins < 1)
        return "just now";
      if (mins < 60)
        return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24)
        return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    })();
    const handleCommentSubmit = async () => {
      if (!textareaValue?.trim() || isLocked)
        return;
      try {
        await persistTextContent(id, textareaValue, "textareaValue", setNodes, workspaceId);
      } catch (err) {
        console.error("Failed to save comment:", err);
      }
      setCommentBoxOpen(false);
    };
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        className: `relative group ${selected ? "z-10" : ""}`,
        style: { width: 36, height: 36 }
      },
      /* @__PURE__ */ React.createElement(
        Handle,
        {
          type: "source",
          position: Position.Top,
          id: "top-out",
          style: { left: "50%" },
          className: "w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity",
          isConnectable
        }
      ),
      /* @__PURE__ */ React.createElement(
        Handle,
        {
          type: "target",
          position: Position.Top,
          id: "top-in",
          style: { left: "50%" },
          className: "w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity",
          isConnectable
        }
      ),
      /* @__PURE__ */ React.createElement(
        Handle,
        {
          type: "source",
          position: Position.Right,
          id: "right-out",
          style: { top: "50%" },
          className: "w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity",
          isConnectable
        }
      ),
      /* @__PURE__ */ React.createElement(
        Handle,
        {
          type: "target",
          position: Position.Right,
          id: "right-in",
          style: { top: "50%" },
          className: "w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity",
          isConnectable
        }
      ),
      /* @__PURE__ */ React.createElement(
        Handle,
        {
          type: "source",
          position: Position.Bottom,
          id: "bottom-out",
          style: { left: "50%" },
          className: "w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity",
          isConnectable
        }
      ),
      /* @__PURE__ */ React.createElement(
        Handle,
        {
          type: "target",
          position: Position.Bottom,
          id: "bottom-in",
          style: { left: "50%" },
          className: "w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity",
          isConnectable
        }
      ),
      /* @__PURE__ */ React.createElement(
        Handle,
        {
          type: "source",
          position: Position.Left,
          id: "left-out",
          style: { top: "50%" },
          className: "w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity",
          isConnectable
        }
      ),
      /* @__PURE__ */ React.createElement(
        Handle,
        {
          type: "target",
          position: Position.Left,
          id: "left-in",
          style: { top: "50%" },
          className: "w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity",
          isConnectable
        }
      ),
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: `
            w-9 h-9 rounded-full bg-gradient-to-br from-black to-black text-white
            flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white
            cursor-pointer transition-transform hover:scale-110
            ${isImportant ? "ring-2 ring-warning ring-offset-1" : ""}
          `,
          onClick: (e) => {
            e.stopPropagation();
            setCommentBoxOpen(true);
          }
        },
        authorInitial
      ),
      data.sequenceNumber && /* @__PURE__ */ React.createElement("div", { className: "absolute -top-1.5 -right-1.5 z-30 w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-white" }, data.sequenceNumber),
      hasContent && !commentBoxOpen && /* @__PURE__ */ React.createElement("div", { className: "absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-info rounded-full border-2 border-white z-20" }),
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: `
            absolute top-10 left-0 z-40 transition-all duration-200 origin-top-left
            ${commentBoxOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto"}
          `,
          style: { minWidth: 260, maxWidth: 320 }
        },
        /* @__PURE__ */ React.createElement("div", { className: "w-3 h-3 bg-surface border-l border-t border-line rotate-45 absolute -top-1.5 left-3 z-10" }),
        /* @__PURE__ */ React.createElement("div", { className: `bg-surface rounded-xl shadow-2xl border overflow-hidden mt-1 ${selected ? "border-info ring-2 ring-info/20" : "border-line"} ${isImportant ? "border-warning bg-warning/10 ring-2 ring-warning/20" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between px-3 py-2 bg-canvas border-b border-line" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-2" }, /* @__PURE__ */ React.createElement("div", { className: "w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0" }, authorInitial), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-ink truncate max-w-[120px]" }, authorName), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-dim" }, timeAgo)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-1" }, isImportant && /* @__PURE__ */ React.createElement("span", { className: "text-[10px] px-1.5 py-0.5 bg-warning/20 text-warning rounded font-medium" }, "\u2605"), isLocked && /* @__PURE__ */ React.createElement(Lock, { className: "w-3 h-3 text-dim" }), /* @__PURE__ */ React.createElement("div", { className: "relative", ref: menuDropdownRef }, /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => setShowMenuDropdown(!showMenuDropdown),
            className: "p-0.5 text-dim hover:text-dim hover:bg-surface-hover rounded transition-all"
          },
          /* @__PURE__ */ React.createElement(MoreVertical, { className: "w-3.5 h-3.5" })
        ), showMenuDropdown && /* @__PURE__ */ React.createElement("div", { className: "absolute right-0 mt-1 w-36 bg-surface border border-line rounded-lg shadow-xl z-50 py-1" }, /* @__PURE__ */ React.createElement("button", { onClick: handleDuplicate, className: "w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-canvas flex items-center space-x-2" }, /* @__PURE__ */ React.createElement(Copy, { className: "w-3 h-3 text-dim" }), /* @__PURE__ */ React.createElement("span", null, "Duplicate")), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => {
              const newImportantState = !isImportant;
              setIsImportant(newImportantState);
              persistIsImportant(id, newImportantState, setNodes, workspaceId).catch((err) => console.error("Failed to persist:", err));
            },
            className: "w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-canvas flex items-center space-x-2"
          },
          /* @__PURE__ */ React.createElement(Star, { className: "w-3 h-3 text-warning" }),
          /* @__PURE__ */ React.createElement("span", null, isImportant ? "Unmark Important" : "Mark Important")
        ), /* @__PURE__ */ React.createElement("button", { onClick: handleDelete, className: "w-full px-3 py-1.5 text-left text-xs text-danger hover:bg-danger/10 flex items-center space-x-2" }, /* @__PURE__ */ React.createElement(Trash2, { className: "w-3 h-3 text-danger" }), /* @__PURE__ */ React.createElement("span", null, "Delete")))))), /* @__PURE__ */ React.createElement("div", { className: "px-3 py-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-end space-x-2" }, /* @__PURE__ */ React.createElement(
          "textarea",
          {
            value: textareaValue,
            onChange: (e) => !isLocked && setTextareaValue(e.target.value),
            className: `flex-1 text-sm leading-relaxed bg-transparent border-0 resize-none focus:outline-none focus:ring-0 p-0 placeholder-dim ${isLocked ? "text-dim cursor-not-allowed" : "text-ink"}`,
            placeholder: isLocked ? "Locked" : "Type a comment...",
            rows: Math.max(1, Math.min(6, (textareaValue || "").split("\n").length)),
            onClick: (e) => e.stopPropagation(),
            onKeyDown: (e) => {
              e.stopPropagation();
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleCommentSubmit();
              }
            },
            onFocus: (e) => {
              e.stopPropagation();
              setCommentBoxOpen(true);
            },
            readOnly: isLocked,
            style: { minHeight: "28px", maxHeight: "160px", overflow: "auto" }
          }
        ), textareaValue?.trim() && !isLocked && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: (e) => {
              e.stopPropagation();
              handleCommentSubmit();
            },
            className: "flex-shrink-0 w-7 h-7 rounded-full bg-info hover:bg-info text-white flex items-center justify-center transition-colors  mb-0.5",
            title: "Save comment (Ctrl+Enter)"
          },
          /* @__PURE__ */ React.createElement(Send, { className: "w-3.5 h-3.5", style: { transform: "rotate(-45deg)", marginLeft: "1px" } })
        ))), data.approvalStatus && data.approvalStatus !== "pending" && /* @__PURE__ */ React.createElement("div", { className: "px-3 py-1.5 border-t border-line bg-canvas" }, /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${data.approvalStatus === "client_approved" ? "bg-success/10 text-success" : data.approvalStatus === "pm_approved" ? "bg-info/10 text-info" : data.approvalStatus === "rejected" ? "bg-danger/10 text-danger" : data.approvalStatus === "sent_to_pm" ? "bg-warning/10 text-warning" : "bg-surface-hover text-dim"}` }, data.approvalStatus === "client_approved" ? "\u2713 Approved" : data.approvalStatus === "pm_approved" ? "\u2713 PM Approved" : data.approvalStatus === "rejected" ? "\u2717 Rejected" : data.approvalStatus === "sent_to_pm" ? "\u23F3 Pending" : data.approvalStatus)))
      )
    );
  }
  const getWrapperClasses = () => {
    const baseClasses = `${isImportant ? "bg-warning/10" : "bg-surface"} border-2 rounded-xl shadow-xl relative group transition-all`;
    const isOverdue = deadline && calculateTimeLeft(deadline)?.isExpired;
    const recentlyUpdatedClass = isOverdue ? "ring-2 ring-danger ring-offset-1" : isRecentlyUpdated() ? "ring-2 ring-warning/30 ring-offset-1" : "";
    const compactTypes = ["divider", "spacer", "container", "grid"];
    if (data.type === "boq-generator") {
      return `${baseClasses} ${recentlyUpdatedClass} p-4 w-full h-full min-w-[600px] max-w-[95vw] flex flex-col`;
    }
    if (data.type === "custom-boq") {
      return `${baseClasses} ${recentlyUpdatedClass} p-4 w-full h-auto min-w-[600px] max-w-[95vw] flex flex-col`;
    }
    if (compactTypes.includes(data.type)) {
      if (data.type === "divider") {
        return `${baseClasses} ${recentlyUpdatedClass} p-2 w-full h-full min-w-[200px] flex flex-col`;
      } else if (data.type === "spacer") {
        return `${baseClasses} ${recentlyUpdatedClass} p-2 w-full h-full min-w-[150px] flex flex-col`;
      } else if (data.type === "container") {
        return `${baseClasses} ${recentlyUpdatedClass} p-4 w-full h-full min-w-[200px] flex flex-col`;
      } else if (data.type === "grid") {
        return `${baseClasses} ${recentlyUpdatedClass} p-3 w-full h-full min-w-[250px] flex flex-col`;
      }
    }
    if (data.type === "form-template") {
      return `${baseClasses} ${recentlyUpdatedClass} p-6 w-full h-full min-w-[450px] flex flex-col`;
    }
    return `${baseClasses} ${recentlyUpdatedClass} p-6 w-full h-full min-w-[320px] flex flex-col`;
  };
  const [now, setNow] = useState(Date.now());
  React.useEffect(() => {
    if (!deadline)
      return;
    const interval = setInterval(() => setNow(Date.now()), 1e3);
    return () => clearInterval(interval);
  }, [deadline]);
  const getTimeLeft = () => {
    const timeLeft = calculateTimeLeft(deadline);
    if (!timeLeft)
      return null;
    if (timeLeft.isExpired)
      return "Deadline reached";
    return formatTimeLeft(timeLeft);
  };
  const persistDeadlineLocal = async (newDeadline) => {
    if (!workspaceId)
      return;
    setSaving(true);
    try {
      deadlineJustSetRef.current = true;
      await persistDeadline(id, newDeadline, setNodes, workspaceId);
      setDeadline(newDeadline instanceof Date ? newDeadline.toISOString() : typeof newDeadline === "string" && !newDeadline.includes("T") ? new Date(newDeadline).toISOString() : newDeadline);
      setTimeout(() => {
        deadlineJustSetRef.current = false;
      }, 2e3);
      console.log("\u{1F4DD} Local deadline state updated");
    } catch (err) {
      console.error("Failed to persist deadline:", err);
    } finally {
      setSaving(false);
    }
  };
  const persistIsImportantLocal = async (important) => {
    if (!workspaceId)
      return;
    setSaving(true);
    try {
      await persistIsImportant(id, important, setNodes, workspaceId);
    } catch (err) {
      console.error("Failed to persist isImportant:", err);
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className: `${getWrapperClasses()} ${getBorderStyle()}`,
      onMouseEnter: () => setIsNodeHovered(true),
      onMouseLeave: () => setIsNodeHovered(false)
    },
    /* @__PURE__ */ React.createElement(
      NodeResizer,
      {
        isVisible: selected || isNodeHovered,
        minWidth: 240,
        minHeight: 140,
        lineClassName: "!border-info",
        handleClassName: "!w-3 !h-3 !bg-info !border-2 !border-white !rounded-md"
      }
    ),
    /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "source",
        position: Position.Top,
        id: "top-out",
        style: { left: "50%" },
        className: "w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta",
        isConnectable
      }
    ),
    /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "target",
        position: Position.Top,
        id: "top-in",
        style: { left: "50%" },
        className: "w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta",
        isConnectable
      }
    ),
    /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "source",
        position: Position.Right,
        id: "right-out",
        style: { top: "50%" },
        className: "w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta",
        isConnectable
      }
    ),
    /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "target",
        position: Position.Right,
        id: "right-in",
        style: { top: "50%" },
        className: "w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta",
        isConnectable
      }
    ),
    /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "source",
        position: Position.Bottom,
        id: "bottom-out",
        style: { left: "50%" },
        className: "w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta",
        isConnectable
      }
    ),
    /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "target",
        position: Position.Bottom,
        id: "bottom-in",
        style: { left: "50%" },
        className: "w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta",
        isConnectable
      }
    ),
    /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "source",
        position: Position.Left,
        id: "left-out",
        style: { top: "50%" },
        className: "w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta",
        isConnectable
      }
    ),
    /* @__PURE__ */ React.createElement(
      Handle,
      {
        type: "target",
        position: Position.Left,
        id: "left-in",
        style: { top: "50%" },
        className: "w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta",
        isConnectable
      }
    ),
    /* @__PURE__ */ React.createElement("div", { className: "absolute -top-3 -right-3 z-20 flex items-center space-x-1" }, isRecentlyUpdated() && /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 bg-warning text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white font-bold text-lg animate-pulse", title: "Recently updated", role: "status", "aria-label": "Recently updated" }, "\u2728"), data.locked && /* @__PURE__ */ React.createElement("div", { className: "w-5 h-5 bg-warning hover:bg-warning text-white rounded-full flex items-center justify-center  border-2 border-white transition-all", title: "Element is locked" }, /* @__PURE__ */ React.createElement(Lock, { className: "w-3 h-3" })), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "relative",
        onMouseEnter: () => setShowInfoTooltip(true),
        onMouseLeave: () => setShowInfoTooltip(false)
      },
      /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            setShowInfoTooltip(!showInfoTooltip);
          },
          className: "w-5 h-5 bg-info hover:bg-info text-white rounded-full flex items-center justify-center  transition-all duration-200 hover:scale-110 border-2 border-white",
          title: "Element Info"
        },
        /* @__PURE__ */ React.createElement(Info, { className: "w-3 h-3" })
      ),
      showInfoTooltip && /* @__PURE__ */ React.createElement("div", { className: "absolute right-7 -top-1 z-50 w-72 bg-surface rounded-lg shadow-xl border border-line p-3 text-left animate-fade-in" }, /* @__PURE__ */ React.createElement("div", { className: "absolute -right-2 top-3 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-white" }), /* @__PURE__ */ React.createElement("div", { className: "absolute -right-[9px] top-3 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-gray-200" }), /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-2 mb-3 pb-2 border-b border-line" }, /* @__PURE__ */ React.createElement("div", { className: "w-8 h-8 bg-info/10 rounded-full flex items-center justify-center" }, /* @__PURE__ */ React.createElement(Info, { className: "w-4 h-4 text-info" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold text-ink" }, "Element Details"))), /* @__PURE__ */ React.createElement("div", { className: "mb-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim uppercase tracking-wide" }, "Element Type"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-ink flex items-center" }, /* @__PURE__ */ React.createElement("span", { className: "w-2 h-2 bg-info rounded-full mr-2" }), data.name || data.type || "Unknown Element")), /* @__PURE__ */ React.createElement("div", { className: "mb-3 p-2 bg-canvas rounded-md border border-line" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim uppercase tracking-wide mb-1" }, "\u{1F4A1} What it does"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-ink leading-relaxed" }, getElementDescription(data.type))), /* @__PURE__ */ React.createElement("div", { className: "mb-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim uppercase tracking-wide" }, "Added By"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-ink flex items-center" }, /* @__PURE__ */ React.createElement("span", { className: "w-6 h-6 bg-success/10 rounded-full flex items-center justify-center mr-2 text-xs font-bold text-success" }, (data.addedBy || "U").charAt(0).toUpperCase()), data.addedBy || "Unknown User"), data.addedByEmail && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim ml-8" }, data.addedByEmail)), /* @__PURE__ */ React.createElement("div", { className: "mb-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim uppercase tracking-wide" }, "Added On"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-medium text-ink" }, "\u{1F4C5} ", formatDate(data.addedAt))), /* @__PURE__ */ React.createElement("div", { className: "pt-2 border-t border-line" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim" }, "ID: ", /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, id?.slice(0, 20), "..."))))
    )),
    !["divider", "spacer", "container", "grid"].includes(data.type) && /* @__PURE__ */ React.createElement("div", { className: "mb-4 text-center relative" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center space-x-2" }, /* @__PURE__ */ React.createElement("h4", { className: "text-lg font-semibold text-ink" }, data.name), isRecentlyUpdated() && /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-warning/20 text-warning  border border-warning/30 whitespace-nowrap" }, "\u2728 NEW"), /* @__PURE__ */ React.createElement("div", { className: "relative", ref: menuDropdownRef }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowMenuDropdown(!showMenuDropdown),
        className: "p-1 text-dim hover:text-dim hover:bg-surface-hover rounded transition-all duration-200",
        title: "More options"
      },
      /* @__PURE__ */ React.createElement(MoreVertical, { className: "w-4 h-4" })
    ), showMenuDropdown && /* @__PURE__ */ React.createElement("div", { className: "absolute right-0 mt-2 w-48 bg-surface border border-line rounded-lg shadow-lg z-50" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleDuplicate,
        className: "w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface-hover flex items-center space-x-2 first:rounded-t-lg transition-colors"
      },
      /* @__PURE__ */ React.createElement(Copy, { className: "w-4 h-4 text-dim" }),
      /* @__PURE__ */ React.createElement("span", null, "Duplicate")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleDuplicateToAllSubtasks,
        className: "w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface-hover flex items-center space-x-2 transition-colors"
      },
      /* @__PURE__ */ React.createElement(Copy, { className: "w-4 h-4 text-dim" }),
      /* @__PURE__ */ React.createElement("span", null, "Duplicate to all subtasks")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleEdit,
        className: "w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface-hover flex items-center space-x-2 transition-colors"
      },
      /* @__PURE__ */ React.createElement(Edit2, { className: "w-4 h-4 text-dim" }),
      /* @__PURE__ */ React.createElement("span", null, "Edit")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setShowComments(true);
          setShowMenuDropdown(false);
        },
        className: "w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface-hover flex items-center space-x-2 transition-colors"
      },
      /* @__PURE__ */ React.createElement(MessageCircle, { className: "w-4 h-4 text-dim" }),
      /* @__PURE__ */ React.createElement("span", null, "Comments")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleDelete,
        className: "w-full px-4 py-2 text-left text-sm text-danger hover:bg-danger/10 flex items-center space-x-2 last:rounded-b-lg transition-colors"
      },
      /* @__PURE__ */ React.createElement(Trash2, { className: "w-4 h-4 text-danger" }),
      /* @__PURE__ */ React.createElement("span", null, "Delete")
    ))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          setShowComments(!showComments);
        },
        className: `relative p-1 rounded transition-all duration-200 ${showComments ? "text-info bg-info/10" : "text-dim hover:text-info hover:bg-info/10"}`,
        title: `Comments${unresolvedCommentCount > 0 ? ` (${unresolvedCommentCount})` : ""}`
      },
      /* @__PURE__ */ React.createElement(MessageCircle, { className: "w-4 h-4" }),
      unresolvedCommentCount > 0 && /* @__PURE__ */ React.createElement("span", { className: "absolute -top-1 -right-1 w-3.5 h-3.5 bg-info text-white rounded-full text-[8px] font-bold flex items-center justify-center border border-white" }, unresolvedCommentCount)
    ), isTableElement() && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handlePreviewClick,
        className: "p-1 text-dim hover:text-info hover:bg-info/10 rounded-full transition-all duration-200 group/preview",
        title: "Preview full table"
      },
      /* @__PURE__ */ React.createElement(Eye, { className: "w-4 h-4" })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleExportGoogleSheets,
        className: "p-1 text-dim hover:text-success hover:bg-success/10 rounded-full transition-all duration-200",
        title: "Export to Google Sheets"
      },
      /* @__PURE__ */ React.createElement(FileSpreadsheet, { className: "w-4 h-4" })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleDownloadExcel,
        className: "p-1 text-dim hover:text-info hover:bg-info/10 rounded-full transition-all duration-200",
        title: "Download Excel (.xlsx)"
      },
      /* @__PURE__ */ React.createElement(Download, { className: "w-4 h-4" })
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: async () => {
          const newImportantState = !isImportant;
          console.log("\u{1F31F} Mark as Important clicked:", { currentState: isImportant, newState: newImportantState, nodeId: id });
          setIsImportant(newImportantState);
          console.log("\u{1F4DD} State updated to:", newImportantState);
          await persistIsImportantLocal(newImportantState);
          console.log("\u2705 isImportant persisted successfully");
        },
        className: `ml-2 px-2 py-1 rounded border text-xs font-medium transition-colors duration-150 ${isImportant ? "bg-warning text-white border-warning" : "bg-surface text-warning border-warning hover:bg-warning/10"}`,
        title: isImportant ? "Unmark as Important" : "Mark as Important"
      },
      isImportant ? "\u2605 Important" : "\u2606 Mark Important"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowDeadlineInput((v) => !v),
        className: "ml-2 px-2 py-1 rounded border text-xs font-medium transition-colors duration-150 bg-surface text-info border-info hover:bg-info/10",
        title: "Set Deadline"
      },
      deadline ? "Edit Deadline" : "Set Deadline"
    )), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-dim mt-2" }, data.preview), showDeadlineInput && /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex flex-col items-center" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "datetime-local",
        className: "border rounded px-2 py-1 text-xs",
        onChange: (e) => setDeadline(e.target.value),
        value: deadline ? new Date(deadline).toISOString().slice(0, 16) : "",
        min: (/* @__PURE__ */ new Date()).toISOString().slice(0, 16),
        disabled: saving
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        className: "mt-1 px-2 py-1 text-xs bg-info text-white rounded",
        onClick: async () => {
          console.log("\u23F0 Setting deadline:", { currentDeadline: deadline, nodeId: id });
          setShowDeadlineInput(false);
          console.log("\u{1F4DD} Deadline input closed, persisting...");
          await persistDeadlineLocal(deadline);
          console.log("\u2705 Deadline persisted successfully");
        },
        disabled: saving
      },
      saving ? "Saving..." : "Done"
    )), deadline && (() => {
      const overdue = calculateTimeLeft(deadline)?.isExpired;
      return /* @__PURE__ */ React.createElement("div", { className: `mt-2 text-xs font-semibold ${overdue ? "text-danger" : "text-info"}` }, overdue ? "\u26A0 Overdue \u2014 deadline reached" : `\u23F0 Time left: ${getTimeLeft()}`);
    })()),
    /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-h-0 overflow-auto" }, renderInteractiveElement()),
    /* @__PURE__ */ React.createElement("div", { className: "mt-4 pt-3 border-t border-line" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-2" }, /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getApprovalStatusColor()}` }, /* @__PURE__ */ React.createElement("span", { className: "mr-1" }, getApprovalStatusIcon()), data.approvalStatus === "sent_to_pm" ? "Sent to PM for Approval" : data.approvalStatus === "pm_approved" ? "PM Approved - Waiting for Client" : data.approvalStatus === "client_approved" ? "Fully Approved" : data.approvalStatus === "locked" ? "Locked" : data.approvalStatus === "rejected" ? "Rejected" : "Draft")), /* @__PURE__ */ React.createElement("span", { className: `text-xs px-2 py-0.5 rounded ${data.addedByRole === "pm" ? "bg-surface-hover text-ink" : "bg-info/10 text-info"}` }, "Added by ", data.addedByRole === "pm" ? "PM" : "Vendor")), data.sentForApprovalAt && /* @__PURE__ */ React.createElement("div", { className: "mb-2 p-2 rounded-lg bg-info/10 border border-info/20" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-2 mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "w-5 h-5 rounded-full flex items-center justify-center text-xs bg-info text-white" }, "\u{1F4E4}"), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-medium text-ink" }, "Sent for approval by ", data.sentForApprovalBy)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim ml-7" }, "\u{1F4C5} ", formatDate(data.sentForApprovalAt))), data.deletionRequested && /* @__PURE__ */ React.createElement("div", { className: "mb-2 p-2 rounded-lg bg-danger/10 border border-danger/20" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-2 mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "w-5 h-5 rounded-full flex items-center justify-center text-xs bg-danger text-white" }, "\u{1F5D1}\uFE0F"), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-medium text-ink" }, "Deletion requested by ", data.deletionRequestedBy)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim ml-7" }, "\u{1F4C5} ", formatDate(data.deletionRequestedAt)), data.deletionReason && /* @__PURE__ */ React.createElement("div", { className: "mt-2 p-2 bg-surface rounded border border-line" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim uppercase tracking-wide mb-1" }, "Deletion Reason"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-ink" }, data.deletionReason)), canApproveDeletion() && /* @__PURE__ */ React.createElement("div", { className: "mt-2 flex gap-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleApproveDeletion,
        className: "flex-1 px-2 py-1 text-xs bg-danger text-white rounded hover:bg-danger transition-colors"
      },
      "Approve Deletion"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleRejectDeletion,
        className: "flex-1 px-2 py-1 text-xs bg-cta text-cta-foreground rounded hover:bg-cta transition-colors"
      },
      "Reject Deletion"
    ))), data.pmApproval && /* @__PURE__ */ React.createElement("div", { className: "mb-2 p-2 rounded-lg bg-success/10 border border-success/20" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-2 mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "w-5 h-5 rounded-full flex items-center justify-center text-xs bg-success text-white" }, "\u2713"), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-medium text-ink" }, data.pmApproval.status === "approved" ? "\u2705 PM Approved" : "\u274C PM Rejected", " by ", data.pmApproval.approvedBy)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim ml-7" }, "\u{1F4C5} ", formatDate(data.pmApproval.approvalTimestamp)), data.pmApproval.approvalReason && /* @__PURE__ */ React.createElement("div", { className: "mt-2 p-2 bg-surface rounded border border-line" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim uppercase tracking-wide mb-1" }, "PM Reason"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-ink" }, data.pmApproval.approvalReason))), data.clientApproval && /* @__PURE__ */ React.createElement("div", { className: "mb-2 p-2 rounded-lg bg-info/10 border border-info/20" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-2 mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "w-5 h-5 rounded-full flex items-center justify-center text-xs bg-info text-white" }, "\u2713"), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-medium text-ink" }, data.clientApproval.status === "approved" ? "\u2705 Client Approved" : "\u274C Client Rejected", " by ", data.clientApproval.approvedBy)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim ml-7" }, "\u{1F4C5} ", formatDate(data.clientApproval.approvalTimestamp)), data.clientApproval.approvalReason && /* @__PURE__ */ React.createElement("div", { className: "mt-2 p-2 bg-surface rounded border border-line" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim uppercase tracking-wide mb-1" }, "Client Reason"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-ink" }, data.clientApproval.approvalReason))), canApprove() && /* @__PURE__ */ React.createElement("div", { className: "flex space-x-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => handleApprovalClick("approve"),
        className: "flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-success hover:bg-success text-white text-sm font-medium rounded-lg transition-colors "
      },
      /* @__PURE__ */ React.createElement(Check, { className: "w-4 h-4" }),
      /* @__PURE__ */ React.createElement("span", null, "Approve")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => handleApprovalClick("reject"),
        className: "flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-danger hover:bg-danger text-white text-sm font-medium rounded-lg transition-colors "
      },
      /* @__PURE__ */ React.createElement(XIcon, { className: "w-4 h-4" }),
      /* @__PURE__ */ React.createElement("span", null, "Reject")
    )), data.approvalStatus === "sent_to_pm" && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-center text-info italic" }, "\u23F3 Waiting for PM to review this element"), data.approvalStatus === "pm_approved" && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-center text-warning italic" }, "\u23F3 Waiting for Client to review this element"), data.approvalStatus === "client_approved" && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-center text-success italic" }, "\u2705 Element has been fully approved"), data.approvalStatus === "locked" && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-center text-dim italic" }, "\u{1F512} Element is locked and cannot be edited"), data.approvalStatus === "rejected" && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-center text-danger italic" }, "\u274C Element has been rejected")),
    data.sequenceNumber && /* @__PURE__ */ React.createElement("div", { className: "absolute -top-4 -left-4 z-20 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white hover:shadow-xl transition-shadow" }, data.sequenceNumber),
    /* @__PURE__ */ React.createElement("div", { className: "absolute -top-2 left-5 px-2 py-1 bg-info text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity" }, data.type.toUpperCase()),
    selected && /* @__PURE__ */ React.createElement("div", { className: "absolute -top-3 -right-3 w-6 h-6 bg-info text-white rounded-full flex items-center justify-center text-xs font-bold" }, "E"),
    unresolvedCommentCount > 0 && !showComments && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          setShowComments(true);
        },
        className: "absolute -bottom-2 -left-2 z-20 flex items-center space-x-0.5 px-1.5 py-0.5 bg-info text-white rounded-full text-[10px] font-bold  border-2 border-white hover:bg-info transition-colors cursor-pointer",
        title: `${unresolvedCommentCount} comment${unresolvedCommentCount !== 1 ? "s" : ""}`
      },
      /* @__PURE__ */ React.createElement(MessageCircle, { className: "w-3 h-3" }),
      /* @__PURE__ */ React.createElement("span", null, unresolvedCommentCount)
    ),
    showComments && /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: commentPopoverRef,
        className: "absolute top-0 -right-[320px] z-50",
        style: { width: 300 },
        onClick: (e) => e.stopPropagation()
      },
      /* @__PURE__ */ React.createElement(
        CommentThread,
        {
          nodeId: id,
          comments: nodeComments,
          collaborators: data.workspaceCollaborators || [],
          onAddComment: handleAddComment,
          onResolve: handleResolveComment,
          onDeleteComment: handleDeleteComment,
          isLocked: isElementLocked(),
          onClose: () => setShowComments(false)
        }
      )
    ),
    showPreview && isTableElement() && /* @__PURE__ */ React.createElement(
      TablePreviewModal,
      {
        isOpen: showPreview,
        onClose: () => setShowPreview(false),
        tableData: getPreviewTableData(),
        tableName: data.name,
        tableType: data.id
      }
    ),
    showDocumentPreview && data.documentUrl && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[999] flex items-center justify-center bg-black/60" }, /* @__PURE__ */ React.createElement("div", { className: "flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between border-b border-line px-6 py-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-base font-semibold text-ink" }, data.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim" }, data.documentMeta?.id || "Document preview")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowDocumentPreview(false),
        className: "rounded-md p-2 text-dim hover:bg-surface-hover hover:text-ink transition-colors",
        "aria-label": "Close preview"
      },
      /* @__PURE__ */ React.createElement(X, { className: "w-4 h-4" })
    )), /* @__PURE__ */ React.createElement("div", { className: "flex-1 bg-surface-hover" }, /* @__PURE__ */ React.createElement(
      "iframe",
      {
        src: `${data.documentUrl}#toolbar=0&navpanes=0`,
        title: data.documentMeta?.id || "Document preview",
        className: "h-full w-full",
        loading: "lazy"
      }
    )))),
    showApprovalModal && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden",
        onClick: (e) => e.stopPropagation()
      },
      /* @__PURE__ */ React.createElement("div", { className: `px-6 py-4 ${approvalAction === "approve" ? "bg-black" : "bg-black"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 bg-white/20 rounded-full flex items-center justify-center" }, approvalAction === "approve" ? /* @__PURE__ */ React.createElement(Check, { className: "w-6 h-6 text-white" }) : /* @__PURE__ */ React.createElement(XIcon, { className: "w-6 h-6 text-white" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-white" }, approvalAction === "approve" ? "Approve Element" : "Reject Element"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-white/80" }, data.name))), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setShowApprovalModal(false),
          className: "p-2 hover:bg-white/20 rounded-full transition-colors"
        },
        /* @__PURE__ */ React.createElement(X, { className: "w-5 h-5 text-white" })
      ))),
      /* @__PURE__ */ React.createElement("div", { className: "p-6" }, /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-ink mb-2" }, approvalAction === "approve" ? "Approval Reason" : "Rejection Reason", /* @__PURE__ */ React.createElement("span", { className: "text-danger" }, "*")), /* @__PURE__ */ React.createElement(
        "textarea",
        {
          value: approvalReason,
          onChange: (e) => setApprovalReason(e.target.value),
          placeholder: approvalAction === "approve" ? "Enter reason for approving this element..." : "Enter reason for rejecting this element...",
          className: "w-full px-4 py-3 border border-line rounded-xl focus:ring-2 focus:ring-info focus:border-info resize-none transition-all",
          rows: 4
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "bg-canvas rounded-lg p-3 mb-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim uppercase tracking-wide mb-1" }, "Element Details"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-ink" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Type:"), " ", data.type), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-ink" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Added by:"), " ", data.addedBy, " (", data.addedByRole === "pm" ? "PM" : "Vendor", ")"))),
      /* @__PURE__ */ React.createElement("div", { className: "px-6 py-4 bg-canvas border-t border-line flex space-x-3" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setShowApprovalModal(false),
          disabled: isSubmittingApproval,
          className: "flex-1 px-4 py-2.5 border border-line text-ink rounded-xl hover:bg-surface-hover transition-colors font-medium"
        },
        "Cancel"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: handleApprovalSubmit,
          disabled: !approvalReason.trim() || isSubmittingApproval,
          className: `flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-all flex items-center justify-center space-x-2 ${approvalAction === "approve" ? "bg-success hover:bg-success disabled:bg-success/30" : "bg-danger hover:bg-danger disabled:bg-danger/30"} disabled:cursor-not-allowed`
        },
        isSubmittingApproval ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("svg", { className: "animate-spin h-4 w-4 text-white", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), /* @__PURE__ */ React.createElement("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })), /* @__PURE__ */ React.createElement("span", null, "Processing...")) : /* @__PURE__ */ React.createElement(React.Fragment, null, approvalAction === "approve" ? /* @__PURE__ */ React.createElement(Check, { className: "w-4 h-4" }) : /* @__PURE__ */ React.createElement(XIcon, { className: "w-4 h-4" }), /* @__PURE__ */ React.createElement("span", null, approvalAction === "approve" ? "Approve" : "Reject"))
      ))
    )),
    showDeletionModal && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden",
        onClick: (e) => e.stopPropagation()
      },
      /* @__PURE__ */ React.createElement("div", { className: "px-6 py-4 bg-black" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center space-x-3" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 bg-white/20 rounded-full flex items-center justify-center" }, /* @__PURE__ */ React.createElement(Trash2, { className: "w-6 h-6 text-white" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-white" }, "Request Deletion"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-white/80" }, data.name))), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setShowDeletionModal(false),
          className: "p-2 hover:bg-white/20 rounded-full transition-colors"
        },
        /* @__PURE__ */ React.createElement(X, { className: "w-5 h-5 text-white" })
      ))),
      /* @__PURE__ */ React.createElement("div", { className: "p-6" }, /* @__PURE__ */ React.createElement("div", { className: "mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-warning" }, "\u26A0\uFE0F This element will be marked for deletion. A PM will need to approve this request before it's permanently deleted.")), /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-ink mb-2" }, "Reason for Deletion", /* @__PURE__ */ React.createElement("span", { className: "text-danger" }, "*")), /* @__PURE__ */ React.createElement(
        "textarea",
        {
          value: deletionReason,
          onChange: (e) => setDeletionReason(e.target.value),
          placeholder: "Enter reason for requesting deletion...",
          className: "w-full px-4 py-3 border border-line rounded-xl focus:ring-2 focus:ring-warning focus:border-warning resize-none transition-all",
          rows: 4
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "bg-canvas rounded-lg p-3 mb-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-dim uppercase tracking-wide mb-1" }, "Element Details"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-ink" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Type:"), " ", data.type), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-ink" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Added by:"), " ", data.addedBy, " (", data.addedByRole === "pm" ? "PM" : "Vendor", ")"))),
      /* @__PURE__ */ React.createElement("div", { className: "px-6 py-4 bg-canvas border-t border-line flex space-x-3" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setShowDeletionModal(false),
          disabled: isSubmittingDeletion,
          className: "flex-1 px-4 py-2.5 border border-line text-ink rounded-xl hover:bg-surface-hover transition-colors font-medium"
        },
        "Cancel"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: handleSubmitDeletionRequest,
          disabled: !deletionReason.trim() || isSubmittingDeletion,
          className: "flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-all flex items-center justify-center space-x-2 bg-warning hover:bg-warning disabled:bg-warning/30 disabled:cursor-not-allowed"
        },
        isSubmittingDeletion ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("svg", { className: "animate-spin h-4 w-4 text-white", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), /* @__PURE__ */ React.createElement("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })), /* @__PURE__ */ React.createElement("span", null, "Submitting...")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Trash2, { className: "w-4 h-4" }), /* @__PURE__ */ React.createElement("span", null, "Request Deletion"))
      ))
    ))
  );
};
export default ElementNode;
