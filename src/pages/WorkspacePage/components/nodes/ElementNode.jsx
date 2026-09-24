import React, { useState, useContext, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getWorkspaceById, notifyWorkspaceEvent } from '../../utils/workspaceApi';
import { persistIsImportant, persistDeadline, persistTextContent, persistNodeDataPatch, persistNodeDeletion, getTimeLeft as calculateTimeLeft, formatTimeLeft } from '../../utils/nodePersistence';
import { Handle, Position, useReactFlow, NodeResizer } from 'reactflow';
import * as XLSX from 'xlsx';
import { Download, Eye, ExternalLink, X, ArrowRight, Check, X as XIcon, Menu, Star, Heart, Info, HelpCircle, Lock, Send, MoreVertical, Copy, Edit2, Trash2, FileText, MessageCircle, FileSpreadsheet } from 'lucide-react';
import { useToastOptional } from '../ToastProvider';
import CommentThread from '../comments/CommentThread';
import { VendorContext } from '../../../../context/VendorContext';
import FormTemplate from '../forms/FormTemplate';
import TableRenderer from '../forms/TableRenderer';
import CalendarRenderer from '../forms/CalendarRenderer';
import ChartRenderer from '../forms/ChartRenderer';
import ListRenderer from '../forms/ListRenderer';
import MaterialsRenderer from '../forms/MaterialsRenderer';
import UploadsRenderer from '../forms/UploadsRenderer';
import FileRenderer from '../forms/FileRenderer';
import TaskCardRenderer from '../forms/TaskCardRenderer';
import MaterialSpecCard from '../forms/MaterialSpecCard';
import ImageBlockRenderer from '../forms/ImageBlockRenderer';
import DocumentBlockRenderer from '../forms/DocumentBlockRenderer';
import CadFilesRenderer from '../forms/CadFilesRenderer';
import ConcreteBlocksCalculator from '../forms/ConcreteBlocksCalculator';
import BricksCalculator from '../forms/BricksCalculator';
import ConcreteCalculator from '../forms/ConcreteCalculator';
import FlooringCalculator from '../forms/FlooringCalculator';
import SoilExcavationCalculator from '../forms/SoilExcavationCalculator';
import SteelEstimationCalculator from '../forms/SteelEstimationCalculator';
import VinylFlooringCalculator from '../forms/VinylFlooringCalculator';
import PaintingEstimator from '../forms/PaintingEstimator';
import ElectricalWiringEstimator from '../forms/ElectricalWiringEstimator';
import BOQGenerator from '../forms/BOQGenerator';
import CostCalculatorSummary from '../forms/CostCalculatorSummary';
import ShipmentCard from '../forms/ShipmentCard';
import FreightCostCalculator from '../forms/FreightCostCalculator';
import RouteOptimizationBlock from '../forms/RouteOptimizationBlock';
import ProofOfDeliveryBlock from '../forms/ProofOfDeliveryBlock';
import ExceptionDelayReport from '../forms/ExceptionDelayReport';
import CarrierPerformanceScorecard from '../forms/CarrierPerformanceScorecard';

import TablePreviewModal from '../modals/TablePreviewModal';
import { createTableHelpers, defaultTableData } from '../../utils/tableUtils';

const ElementNode = ({ id, data, isConnectable, selected }) => {
  const workspaceId = data.workspaceId;  // Get workspaceId from node data
  const { setNodes, setEdges } = useReactFlow();
  const [saving, setSaving] = useState(false);
  // Important state for highlighting
  const [isImportant, setIsImportant] = useState(false);

  // Deadline state (persisted in backend)
  const [deadline, setDeadline] = useState(data.deadline || null); // ISO string or null
  const [showDeadlineInput, setShowDeadlineInput] = useState(false);
  
  // Menu dropdown state
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const menuDropdownRef = useRef(null);

  // Toast for export feedback + hover state for resize handles
  const toast = useToastOptional();
  const [isNodeHovered, setIsNodeHovered] = useState(false);

  // Comment thread state
  const [showComments, setShowComments] = useState(false);
  const commentPopoverRef = useRef(null);
  

  
  // Track if we just set the deadline to prevent it from being cleared during sync
  const deadlineJustSetRef = useRef(false);

  // Auto-refresh for recently updated indicator (every 30 seconds)
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuDropdownRef.current && !menuDropdownRef.current.contains(event.target)) {
        setShowMenuDropdown(false);
      }
    };
    
    if (showMenuDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenuDropdown]);
  
  // Sync deadline from backend node data if changed externally
  useEffect(() => {
    // Don't sync if we just set the deadline locally - give it time to persist
    if (deadlineJustSetRef.current) {
      console.log('⏳ Deadline was just set locally, skipping sync to prevent clearing');
      return;
    }
    
    // Only sync deadline if data has it AND it's different from current state
    if (data.deadline && data.deadline !== deadline) {
      console.log('🔄 Syncing deadline from node data:', { dataDeadline: data.deadline, stateDeadline: deadline });
      setDeadline(data.deadline);
    }
    // Don't clear deadline if data doesn't have it but state does - it might be in the process of being saved
    // Only clear if explicitly set to null/undefined after previously having a value
    
    if (data.isImportant !== undefined && data.isImportant !== isImportant) {
      console.log('🔄 Syncing isImportant from node data:', { dataIsImportant: data.isImportant, stateIsImportant: isImportant });
      setIsImportant(data.isImportant);
    }
    // eslint-disable-next-line
  }, [data.deadline, data.isImportant]);
  // Get current user from context
  const { currentUser } = useContext(VendorContext);
  const [inputValue, setInputValue] = useState(data?.inputValue || '');
  const [textareaValue, setTextareaValue] = useState(data?.textareaValue || '');
  const [commentBoxOpen, setCommentBoxOpen] = useState(!data?.textareaValue?.trim()); // open if empty, closed if already has content
  const [checkboxValue, setCheckboxValue] = useState(false);

  // Comment handlers
  const nodeComments = data.comments || [];
  const unresolvedCommentCount = nodeComments.filter(c => !c.resolved).length;

  const handleAddComment = async (nodeId, comment) => {
    const updatedComments = [...nodeComments, comment];
    try {
      await persistNodeDataPatch(nodeId, { comments: updatedComments }, setNodes, workspaceId);
      // Send @mention notifications via API
      if (comment.mentionedUserIds && comment.mentionedUserIds.length > 0) {
        try {
          await fetch('/api/workspace/comments/mention', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspaceId,
              nodeId,
              elementName: data.name || data.type || 'element',
              commentText: comment.text,
              authorName: comment.authorName,
              mentionedUserIds: comment.mentionedUserIds,
            }),
          });
        } catch (err) {
          console.error('Failed to send mention notifications:', err);
        }
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleResolveComment = async (nodeId, commentId) => {
    const updatedComments = nodeComments.map(c =>
      c.id === commentId ? { ...c, resolved: !c.resolved, resolvedAt: !c.resolved ? new Date().toISOString() : null } : c
    );
    try {
      await persistNodeDataPatch(nodeId, { comments: updatedComments }, setNodes, workspaceId);
    } catch (err) {
      console.error('Failed to resolve comment:', err);
    }
  };

  const handleDeleteComment = async (nodeId, commentId) => {
    const updatedComments = nodeComments.filter(c => c.id !== commentId);
    try {
      await persistNodeDataPatch(nodeId, { comments: updatedComments }, setNodes, workspaceId);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };
  const [radioValue, setRadioValue] = useState(data?.radioValue || '');

  // Shared form-field state: label + option editor (declared before autosave effects)
  const [fieldLabel, setFieldLabel] = useState(data?.fieldLabel || '');
  const [isEditingField, setIsEditingField] = useState(false);
  const [radioOptions, setRadioOptions] = useState(data?.radioOptions || ['Option 1', 'Option 2']);
  const [checkboxOptions, setCheckboxOptions] = useState(data?.checkboxOptions || ['Option 1', 'Option 2', 'Option 3']);
  const [checkedItems, setCheckedItems] = useState(data?.checkedItems || {});

  // Auto-save refs for debouncing
  const textareaTimeoutRef = useRef(null);
  const inputTimeoutRef = useRef(null);
  
  // Auto-save textarea content with debounce
  useEffect(() => {
    if (!workspaceId || data.type !== 'textarea') return;
    
    // Clear previous timeout
    if (textareaTimeoutRef.current) {
      clearTimeout(textareaTimeoutRef.current);
    }
    
    // Set new timeout to save after 2 seconds of inactivity
    textareaTimeoutRef.current = setTimeout(async () => {
      if (textareaValue && textareaValue.length > 0) {
        try {
          console.log('💾 Auto-saving textarea content');
          await persistTextContent(id, textareaValue, 'textareaValue', setNodes, workspaceId);
        } catch (error) {
          console.error('❌ Error auto-saving textarea:', error);
        }
      }
    }, 2000);
    
    return () => {
      if (textareaTimeoutRef.current) {
        clearTimeout(textareaTimeoutRef.current);
      }
    };
  }, [textareaValue, workspaceId, data.type, id, setNodes]);
  
  // Auto-save textbox/input content + label with debounce
  useEffect(() => {
    if (!workspaceId || (data.type !== 'textbox' && data.type !== 'input')) return;

    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current);
    }

    inputTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('💾 Auto-saving input field content');
        await persistNodeDataPatch(
          id,
          { inputValue, fieldLabel, lastModifiedAt: new Date().toISOString() },
          null,
          workspaceId
        );
      } catch (error) {
        console.error('❌ Error auto-saving input field:', error);
      }
    }, 1500);

    return () => {
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
      }
    };
  }, [inputValue, fieldLabel, workspaceId, data.type, id]);
  
  // Dynamic options for interactive elements - load from persisted data
  const [selectOptions, setSelectOptions] = useState(data?.selectOptions || []);
  const [selectValue, setSelectValueState] = useState(data?.selectedValue || '');
  const selectTimeoutRef = useRef(null);
  
  // Auto-save dropdown options and selected value with debounce
  useEffect(() => {
    if (!workspaceId || (data.type !== 'select' && data.type !== 'dropdown')) return;
    
    // Clear previous timeout
    if (selectTimeoutRef.current) {
      clearTimeout(selectTimeoutRef.current);
    }
    
    // Set new timeout to save after 1 second of inactivity
    selectTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('💾 Auto-saving dropdown options and value');
        // Save both options and selected value
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === id
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    selectOptions: selectOptions,
                    selectedValue: selectValue,
                    fieldLabel: fieldLabel,
                    lastModifiedAt: new Date().toISOString()
                  }
                }
              : node
          )
        );
        
        // Persist to backend (subtask canvas aware)
        await persistNodeDataPatch(
          id,
          {
            selectOptions: selectOptions,
            selectedValue: selectValue,
            fieldLabel: fieldLabel,
            lastModifiedAt: new Date().toISOString()
          },
          null,
          workspaceId
        );
        console.log('✅ Dropdown data saved to backend');
      } catch (error) {
        console.error('❌ Error auto-saving dropdown:', error);
      }
    }, 1000);
    
    return () => {
      if (selectTimeoutRef.current) {
        clearTimeout(selectTimeoutRef.current);
      }
    };
  }, [selectOptions, selectValue, fieldLabel, workspaceId, data.type, id, setNodes]);

  // Auto-save radio options, selection and label with debounce
  useEffect(() => {
    if (!workspaceId || data.type !== 'radio') return;
    const t = setTimeout(() => {
      persistNodeDataPatch(
        id,
        { radioOptions, radioValue, fieldLabel, lastModifiedAt: new Date().toISOString() },
        null,
        workspaceId
      ).catch((err) => console.error('❌ Error auto-saving radio:', err));
    }, 1000);
    return () => clearTimeout(t);
  }, [radioOptions, radioValue, fieldLabel, workspaceId, data.type, id]);

  // Auto-save checkbox options, checked state and label with debounce
  useEffect(() => {
    if (!workspaceId || data.type !== 'checkbox') return;
    const t = setTimeout(() => {
      persistNodeDataPatch(
        id,
        { checkboxOptions, checkedItems, fieldLabel, lastModifiedAt: new Date().toISOString() },
        null,
        workspaceId
      ).catch((err) => console.error('❌ Error auto-saving checkbox:', err));
    }, 1000);
    return () => clearTimeout(t);
  }, [checkboxOptions, checkedItems, fieldLabel, workspaceId, data.type, id]);

  // Wrapper to set select value and trigger save
  const setSelectValue = (value) => {
    setSelectValueState(value);
  };
  
  const [buttonText, setButtonText] = useState(data?.buttonText || 'Click Me');
  const [buttonAction, setButtonAction] = useState(data?.buttonAction || 'custom');
  const [buttonAssignee, setButtonAssignee] = useState(data?.buttonAssignee || null);
  const [isEditingButton, setIsEditingButton] = useState(false);
  
  // Table state
  const [tableData, setTableData] = useState(defaultTableData);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');
  const [filterText, setFilterText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [editingCell, setEditingCell] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  // Calendar state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  
  // Info tooltip state
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  
  // Approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState(null); // 'approve' or 'reject'
  const [approvalReason, setApprovalReason] = useState('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  
  // Force re-render after approval
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Deletion request state
  const [showDeletionModal, setShowDeletionModal] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [isSubmittingDeletion, setIsSubmittingDeletion] = useState(false);
  
  // Help tutorial state
  const [showHelpTutorial, setShowHelpTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  
  // Tutorial steps data
  const tutorialSteps = [
    {
      title: "Welcome to the Workspace! 👋",
      description: "This is your collaborative canvas where you can build workflows, forms, and visualize data. Let's take a quick tour!",
      icon: "🎯"
    },
    {
      title: "Drag & Drop Elements",
      description: "Use the Elements panel on the left to drag and drop components like forms, tables, charts, and more onto your canvas.",
      icon: "📦"
    },
    {
      title: "Connect Elements",
      description: "Elements automatically connect when dropped near each other. You can also manually drag connections between the gray dots on element edges.",
      icon: "🔗"
    },
    {
      title: "Edit & Customize",
      description: "Click on any element to select it. Use the controls to edit content, mark as important, or set deadlines.",
      icon: "✏️"
    },
    {
      title: "Mark Important",
      description: "Use the '☆ Mark Important' button to highlight critical elements. Important items get a golden border.",
      icon: "⭐"
    },
    {
      title: "Set Deadlines",
      description: "Click 'Set Deadline' to add due dates. A countdown timer will appear showing time remaining.",
      icon: "⏰"
    },
    {
      title: "Info Button",
      description: "Hover over the blue 'i' icon to see element details - who added it, when, and what it does.",
      icon: "ℹ️"
    },
    {
      title: "Zoom & Pan",
      description: "Use the controls at the bottom to zoom in/out. Hold Space + drag to pan around the canvas.",
      icon: "🔍"
    },
    {
      title: "Auto-Save",
      description: "Your work is automatically saved. Look for the save indicator at the top to confirm changes are saved.",
      icon: "💾"
    },
    {
      title: "You're All Set! 🎉",
      description: "Start creating by dragging elements from the left panel. Need help? Click the '?' button anytime!",
      icon: "🚀"
    }
  ];
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };
  
  // Check if current user can approve/reject this element
  // Multi-step approval workflow:
  // 1. Vendor sends for approval (status: 'sent_to_pm')
  // 2. PM approves pending elements (status: 'sent_to_pm' -> 'pm_approved')
  // 3. Client approves PM-approved elements (status: 'pm_approved' -> 'client_approved')
  // 4. Final state: element becomes locked
  const canApprove = () => {
    const currentUserRole = getCurrentUserRole();
    const approvalStatus = data.approvalStatus || 'draft';
    
    // PM can approve if element is sent to PM and PM hasn't already approved
    if (currentUserRole === 'pm' && approvalStatus === 'sent_to_pm' && !data.pmApproval) {
      return true;
    }
    
    // Client can approve if PM has already approved and client hasn't already acted
    if (currentUserRole === 'client' && approvalStatus === 'pm_approved' && !data.clientApproval) {
      return true;
    }
    
    // Vendors cannot approve their own elements
    return false;
  };
  
  // Get current user role from URL parameters or context
  const getCurrentUserRole = () => {
    // Check URL parameters first (for PMs and clients accessing vendor frontend)
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserRole = urlParams.get('userRole');
    
    if (urlUserRole && ['vendor', 'pm', 'client'].includes(urlUserRole)) {
      return urlUserRole;
    }
    
    // Fall back to context
    return currentUser?.role || 'vendor';
  };
  
  // Check if element is locked (cannot be edited)
  const isElementLocked = () => {
    const approvalStatus = data.approvalStatus || 'draft';
    // Element is locked if it's in approval process or fully approved
    return ['sent_to_pm', 'pm_approved', 'client_approved', 'locked'].includes(approvalStatus);
  };
  
  // Handle opening approval modal
  const handleApprovalClick = (action) => {
    setApprovalAction(action);
    setApprovalReason('');
    setShowApprovalModal(true);
  };
  
  // Handle submitting approval/rejection
  const handleApprovalSubmit = async () => {
    if (!approvalReason.trim()) {
      console.warn('⚠️ Approval submit blocked: empty reason', { nodeId: id, approvalAction });
      return;
    }
    
    setIsSubmittingApproval(true);
    
    // Mark that we're in approval submission to prevent WorkspacePage from saving stale canvas data
    // Store this flag globally so WorkspacePage can check it
    window.__isApprovingInProgress = true;
    
    const currentUserRole = getCurrentUserRole();
    
    // Determine the new approval status based on user role and action
    let newApprovalStatus;
    let approvalDataKey; // Key to store approval data (e.g., 'pmApproval', 'clientApproval')
    
    if (approvalAction === 'approve') {
      if (currentUserRole === 'pm') {
        newApprovalStatus = 'pm_approved'; // PM approved, waiting for client
        approvalDataKey = 'pmApproval';
      } else if (currentUserRole === 'client') {
        newApprovalStatus = 'client_approved'; // Client approved, fully approved
        approvalDataKey = 'clientApproval';
      } else {
        newApprovalStatus = 'approved'; // Vendor or other
        approvalDataKey = 'approval';
      }
    } else {
      newApprovalStatus = 'rejected'; // Rejection ends the chain
      approvalDataKey = currentUserRole === 'pm' ? 'pmApproval' : currentUserRole === 'client' ? 'clientApproval' : 'approval';
    }
    
    // Prepare the new approval data - with proper structure for database
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
        approvedBy: currentUser?.name || currentUser?.email || 'Unknown User',
        approvedByEmail: currentUser?.email || null,
        approvedByRole: currentUserRole,
        approvalTimestamp: new Date().toISOString(),
        approvalReason: approvalReason.trim(),
        status: approvalAction === 'approve' ? 'approved' : 'rejected'
      }
    };
    
    console.log('🚀 Starting approval submission:', {
      elementId: id,
      currentUserRole,
      approvalAction,
      newApprovalStatus,
      approvalDataKey,
      newApprovalData
    });
    
    try {
      console.log('📤 Persisting approval patch (subtask-aware)...', { nodeId: id, workspaceId });
      await persistNodeDataPatch(id, newApprovalData, setNodes, workspaceId, { bypassApprovalFlow: true });

      // Fetch fresh workspace data to ensure we have the latest state
      console.log('🔄 Fetching fresh workspace data...');
      const freshWorkspaceData = await getWorkspaceById(workspaceId);

      if (freshWorkspaceData) {
        // Find the updated node from fresh data
        let updatedNodeFromServer = null;
        (freshWorkspaceData.tasks || []).forEach(task => {
          (task.subtasks || []).forEach(subtask => {
            (subtask.canvasData?.nodes || []).forEach(node => {
              if (node.id === id) {
                updatedNodeFromServer = node;
              }
            });
          });
        });

        // Update local React Flow state with fresh data from server
        console.log('🔄 Updating local React Flow state with server data...');
        if (updatedNodeFromServer && updatedNodeFromServer.data?.approvalStatus === newApprovalStatus) {
          setNodes((nds) => nds.map((node) => {
            if (node.id === id) {
              console.log('📝 Local state updated with server node data:', updatedNodeFromServer.data);
              return updatedNodeFromServer;
            }
            return node;
          }));
        } else {
          // Server read may still be stale (eventual consistency) — keep the
          // optimistic approval patch locally so the UI doesn't appear to revert
          console.warn('⚠️ Fresh data missing approval — applying patch locally', {
            nodeId: id,
            expected: newApprovalStatus,
            received: updatedNodeFromServer?.data?.approvalStatus
          });
          setNodes((nds) => nds.map((node) =>
            node.id === id
              ? { ...node, data: { ...(node.data || {}), ...newApprovalData } }
              : node
          ));
        }
      }
        
        // Force re-render to ensure UI updates
        setForceUpdate(prev => prev + 1);
        
        // Notify parent component to refresh workspace state
        // This ensures WorkspacePage gets the latest data with updated approval status
        window.dispatchEvent(new CustomEvent('approvalCompleted', {
          detail: {
            nodeId: id,
            workspaceId,
            newStatus: newApprovalStatus,
            timestamp: Date.now()
          }
        }));
        
        // Notify other collaborators about the approval decision
        notifyWorkspaceEvent({
          workspaceId,
          roles: ['pm', 'vendor', 'client'],
          excludeUserId: currentUser?.vendorId || currentUser?.userId || currentUser?.pmId || currentUser?.id,
          type: 'approval_result',
          title: `Element ${approvalAction === 'approve' ? 'approved' : 'rejected'}`,
          message: `${currentUser?.name || currentUser?.email || 'A collaborator'} ${approvalAction}d "${data.name || data.type || 'an element'}"${newApprovalStatus === 'pm_approved' ? ' — awaiting client approval' : ''}`,
          data: { nodeId: id, elementName: data.name, elementType: data.type, status: newApprovalStatus },
          priority: approvalAction === 'approve' ? 'medium' : 'high',
          actionRequired: newApprovalStatus === 'pm_approved',
        });

        console.log(`✅ Element ${approvalAction}d successfully by ${currentUserRole}. Status: ${newApprovalStatus}`);
    } catch (error) {
      console.error('❌ Error updating approval status:', error);
      // Don't update local state if backend update failed
      alert(`Failed to ${approvalAction} element. Please try again. Error: ${error.message}`);
    } finally {
      console.log('🏁 Approval submission cleanup');
      setIsSubmittingApproval(false);
      setShowApprovalModal(false);
      setApprovalAction(null);
      setApprovalReason('');
      // Wait before clearing the approval flag to ensure canvas saves are blocked
      // The flag was set to true at the start, keep it true until this completes
      setTimeout(() => {
        window.__isApprovingInProgress = false;
        console.log('✅ Approval workflow completed, canvas saves re-enabled');
      }, 2000);
    }
  };
  
  // Get approval status color
  const getApprovalStatusColor = () => {
    switch (data.approvalStatus) {
      case 'sent_to_pm':
        return 'bg-info/10 text-info border-info/30'; // Sent to PM - blue
      case 'pm_approved':
        return 'bg-warning/10 text-warning border-warning/30'; // PM approved, waiting for client - yellow
      case 'client_approved':
        return 'bg-success/10 text-success border-success/30'; // Fully approved - green
      case 'locked':
        return 'bg-surface-hover text-ink border-line'; // Locked - gray
      case 'rejected':
        return 'bg-danger/10 text-danger border-danger/30'; // Rejected - red
      default:
        return 'bg-surface-hover text-ink border-line'; // Draft - gray
    }
  };

  // Helper function to check if element is recently updated (within 5 minutes)
  const isRecentlyUpdated = () => {
    if (!data.addedAt && !data.lastUpdatedAt) {
      return false;
    }
    
    const timestamp = data.lastUpdatedAt || data.addedAt;
    const now = new Date();
    const elementTime = new Date(timestamp);
    const minutesDiff = (now - elementTime) / (1000 * 60);
    
    // Consider element recently updated if added/updated within last 5 minutes
    return minutesDiff < 5;
  };
  
  // Get approval status icon
  const getApprovalStatusIcon = () => {
    switch (data.approvalStatus) {
      case 'sent_to_pm':
        return '📤'; // Sent to PM
      case 'pm_approved':
        return '✓'; // PM approved
      case 'client_approved':
        return '✓✓'; // Client approved
      case 'locked':
        return '🔒'; // Locked
      case 'rejected':
        return '✕'; // Rejected
      default:
        return '📝'; // Draft
    }
  };
  
  // Get element description based on type
  const getElementDescription = (type) => {
    const descriptions = {
      // Form elements
      'textbox': 'A single-line text input field for capturing short text like names, emails, or titles.',
      'textarea': 'A multi-line text area for longer content like descriptions, comments, or messages.',
      'input': 'A basic input field for collecting user data such as text, numbers, or dates.',
      'select': 'A dropdown menu that allows users to choose one option from a predefined list.',
      'checkbox': 'A toggle control that lets users select multiple options from a group.',
      'radio': 'A selection control where users can choose only one option from a group.',
      'button': 'A clickable button that triggers an action like submit, save, or navigate.',
      'form': 'A complete form template with multiple input fields for data collection.',
      'form-template': 'A pre-built form layout with common fields ready to customize.',
      
      // Table elements
      'table': 'A data table for displaying structured information in rows and columns.',
      'basic-table': 'A simple table for displaying data in a grid format.',
      'sortable-table': 'A table with clickable headers to sort data ascending or descending.',
      'filterable-table': 'A table with search/filter functionality to find specific data.',
      'paginated-table': 'A table with pagination controls for browsing large datasets.',
      'editable-table': 'A table where cell values can be edited directly inline.',
      'expandable-table': 'A table with expandable rows to show additional details.',
      
      // Chart elements
      'chart': 'A visual representation of data using graphs like bar, line, or pie charts.',
      'bar-chart': 'A bar chart for comparing quantities across different categories.',
      'line-chart': 'A line chart for showing trends and changes over time.',
      'pie-chart': 'A pie chart for displaying proportions and percentages of a whole.',
      
      // Layout elements
      'divider': 'A horizontal line to visually separate sections of content.',
      'spacer': 'An invisible element that adds vertical spacing between components.',
      'container': 'A wrapper element to group and organize other components.',
      'grid': 'A layout grid for arranging elements in rows and columns.',
      'frame': 'A container with borders to frame and highlight content.',
      
      // Media elements
      'image': 'An image placeholder or uploaded image for visual content.',
      'file': 'An uploaded file attachment like documents, PDFs, or spreadsheets.',
      'image-block': 'A block element for displaying images with captions.',
      'cad-files': 'Upload CAD drawings (.dwg, .dxf, .step, .iges, .stl, .obj) — each file is scanned and shown as a card.',
      'cdr-files': 'Upload CorelDRAW (.cdr) files — each file is shown as a card with an SVG preview.',
      'floor-plan': 'Upload a floor plan (.dwg, .dxf, .png, .pdf) — auto-extrudes walls into a 3D model with a spec panel.',
      
      // Special elements
      'calendar': 'A calendar widget for date selection and event display.',
      'calendar-event': 'A calendar event card showing scheduled items.',
      'list': 'A list component for displaying items in an ordered or unordered format.',
      'smart-note': 'An intelligent note-taking element with rich text support.',
      'approval-board': 'A workflow board for tracking approvals and sign-offs.',
      'task-card': 'A task card for tracking work items with status and progress.',
      'task-card-progress': 'A task card with progress bar and completion tracking.',
      'turnkey-workflow': 'A pre-configured workflow template for common processes.',
      
      // Icons
      'icon': 'A decorative or functional icon element.',
      
      // Invoice/Quote elements
      'invoice': 'An invoice document showing billing details and amounts.',
      'quotation': 'A quotation document with pricing and terms for proposals.',
    };
    
    return descriptions[type?.toLowerCase()] || 
           descriptions[type] || 
           `A ${type || 'custom'} element for your workspace canvas.`;
  };
  
  // Check if element is a table type
  const isTableElement = () => {
    return data.type === 'table' || data.id?.includes('table') || 
           ['basic-table', 'sortable-table', 'filterable-table', 'paginated-table', 'editable-table', 'expandable-table'].includes(data.id);
  };
  
  // Menu action handlers
  const handleDuplicate = async () => {
    setShowMenuDropdown(false);
    // Emit duplicate action - parent component should handle this
    const event = new CustomEvent('element-duplicate', { detail: { nodeId: id, nodeData: data } });
    window.dispatchEvent(event);
  };

  const handleDuplicateToAllSubtasks = async () => {
    setShowMenuDropdown(false);
    const event = new CustomEvent('element-duplicate-to-all-subtasks', {
      detail: { nodeId: id, nodeData: data }
    });
    window.dispatchEvent(event);
  };

  const handleEdit = () => {
    setShowMenuDropdown(false);
    // The element is already in edit mode by default when selected
    // This can trigger any additional edit-specific behavior if needed
    console.log('Edit element:', id);
  };

  const handleDelete = async () => {
    setShowMenuDropdown(false);
    const currentUserRole = getCurrentUserRole();
    
    // If user is vendor, request deletion (not immediate delete)
    if (currentUserRole === 'vendor') {
      setShowDeletionModal(true);
    } else if (currentUserRole === 'pm') {
      // PM can approve existing deletion request or delete directly
      if (data.deletionRequested) {
        // PM approving an existing deletion request
        if (window.confirm('Approve deletion of this element?')) {
          // Emit delete action for actual deletion — CanvasWorkspace listens
          // for 'deleteElement' on document with an elementId payload
          document.dispatchEvent(new CustomEvent('deleteElement', { detail: { elementId: id } }));
        }
      } else {
        // PM deleting directly (with confirmation)
        if (window.confirm('Are you sure you want to delete this element?')) {
          document.dispatchEvent(new CustomEvent('deleteElement', { detail: { elementId: id } }));
        }
      }
    }
  };

  // Check if PM can approve deletion
  const canApproveDeletion = () => {
    const currentUserRole = getCurrentUserRole();
    return currentUserRole === 'pm' && data.deletionRequested && !data.deletionApprovedAt;
  };

  // Handle submitting deletion request (vendor)
  const handleSubmitDeletionRequest = async () => {
    setIsSubmittingDeletion(true);
    try {
      const patch = {
        deletionRequested: true,
        deletionRequestedAt: new Date().toISOString(),
        deletionRequestedBy: currentUser?.name || currentUser?.email || 'Unknown User',
        deletionReason: deletionReason || 'No reason provided'
      };

      console.log('📤 Persisting deletion request...', { nodeId: id, workspaceId, patch });

      await persistNodeDataPatch(
        id,
        patch,
        setNodes,
        workspaceId,
        { bypassApprovalFlow: true }
      );

      // Update local state
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...patch
                }
              }
            : node
        )
      );

      console.log('✅ Deletion request persisted successfully');
      setShowDeletionModal(false);
      setDeletionReason('');
      
      // Notify parent that deletion was requested
      const event = new CustomEvent('element-deletion-requested', { detail: { nodeId: id } });
      window.dispatchEvent(event);

      // Notify PMs that a deletion request needs their review
      notifyWorkspaceEvent({
        workspaceId,
        roles: ['pm'],
        excludeUserId: currentUser?.vendorId || currentUser?.userId || currentUser?.pmId || currentUser?.id,
        type: 'deletion_request',
        title: 'Deletion requested',
        message: `${currentUser?.name || currentUser?.email || 'A vendor'} requested deletion of "${data.name || data.type || 'an element'}"`,
        data: { nodeId: id, elementName: data.name, elementType: data.type, taskId: data.taskId, subtaskId: data.subtaskId },
        priority: 'high',
        actionRequired: true,
      });
    } catch (error) {
      console.error('❌ Error submitting deletion request:', error);
      alert('Failed to submit deletion request');
    } finally {
      setIsSubmittingDeletion(false);
    }
  };

  // Handle PM approving deletion
  const handleApproveDeletion = async () => {
    if (!window.confirm('Approve deletion of this element?')) return;

    try {
      setIsSubmittingDeletion(true);

      // Run the canvas delete path first — removes node + connected edges
      // locally, emits NODE_DELETE to collaborators, records deletion history
      document.dispatchEvent(new CustomEvent('deleteElement', { detail: { elementId: id } }));

      // Then durably remove the node from the owning subtask canvas (elements
      // live in subtask canvasData, not the workspace root nodes) so the
      // deletion persists regardless of WebSocket/autosave state
      await persistNodeDeletion(id, setNodes, setEdges, workspaceId);

      console.log('✅ Element deleted successfully by PM:', { nodeId: id, workspaceId });

      // Emit event for parent component
      const event = new CustomEvent('element-deleted', { detail: { nodeId: id } });
      window.dispatchEvent(event);

      // Notify collaborators that the deletion was approved
      notifyWorkspaceEvent({
        workspaceId,
        roles: ['pm', 'vendor', 'client'],
        excludeUserId: currentUser?.vendorId || currentUser?.userId || currentUser?.pmId || currentUser?.id,
        type: 'deletion_approved',
        title: 'Deletion approved',
        message: `${currentUser?.name || currentUser?.email || 'A PM'} approved deletion of "${data.name || data.type || 'an element'}"`,
        data: { nodeId: id, elementName: data.name, elementType: data.type },
      });
    } catch (error) {
      console.error('❌ Error approving deletion:', error);
      alert('Failed to approve deletion');
    } finally {
      setIsSubmittingDeletion(false);
    }
  };

  // Handle PM rejecting deletion
  const handleRejectDeletion = async () => {
    if (!window.confirm('Reject deletion request for this element?')) return;

    try {
      const patch = {
        deletionRequested: false,
        deletionRequestedAt: null,
        deletionRequestedBy: null,
        deletionReason: null,
        deletionRejectedAt: new Date().toISOString(),
        deletionRejectedBy: currentUser?.name || currentUser?.email || 'Unknown User'
      };

      console.log('📋 Persisting deletion rejection...', { nodeId: id, workspaceId, patch });

      await persistNodeDataPatch(
        id,
        patch,
        setNodes,
        workspaceId,
        { bypassApprovalFlow: true }
      );

      // Update local state
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...patch
                }
              }
            : node
        )
      );

      console.log('✅ Deletion request rejected successfully');

      // Notify parent
      const event = new CustomEvent('element-deletion-rejected', { detail: { nodeId: id } });
      window.dispatchEvent(event);

      // Notify collaborators that the deletion request was rejected
      notifyWorkspaceEvent({
        workspaceId,
        roles: ['pm', 'vendor', 'client'],
        excludeUserId: currentUser?.vendorId || currentUser?.userId || currentUser?.pmId || currentUser?.id,
        type: 'deletion_rejected',
        title: 'Deletion rejected',
        message: `${currentUser?.name || currentUser?.email || 'A PM'} rejected the deletion request for "${data.name || data.type || 'an element'}"`,
        data: { nodeId: id, elementName: data.name, elementType: data.type },
      });
    } catch (error) {
      console.error('❌ Error rejecting deletion:', error);
      alert('Failed to reject deletion request');
    }
  };

  // Open the Request Deletion modal when deletion is triggered externally
  // (e.g. Delete/Backspace key or canvas context menu) so vendors always go
  // through the PM approval flow instead of deleting directly.
  useEffect(() => {
    const handleExternalDeletionRequest = (event) => {
      if (event.detail?.nodeId !== id) return;
      if (getCurrentUserRole() !== 'vendor') return;
      if (data.deletionRequested) return;
      setShowDeletionModal(true);
    };

    window.addEventListener('request-element-deletion', handleExternalDeletionRequest);
    return () => window.removeEventListener('request-element-deletion', handleExternalDeletionRequest);
  }, [id, data.deletionRequested, currentUser]);

  // Handle preview click
  const handlePreviewClick = (e) => {
    e.stopPropagation();
    setShowPreview(true);
  };

  const handleDocumentPreviewClick = (e) => {
    e.stopPropagation();
    if (!data.documentUrl) return;
    setShowDocumentPreview(true);
  };

  const handleDocumentDownload = (e) => {
    e.stopPropagation();
    if (!data.documentUrl) return;
    const anchor = document.createElement('a');
    anchor.href = data.documentUrl;
    anchor.download = `${data.documentMeta?.id || data.name || 'document'}.pdf`;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const handleDocumentOpen = (e) => {
    e.stopPropagation();
    if (!data.documentUrl) return;
    window.open(data.documentUrl, '_blank', 'noopener,noreferrer');
  };

  const renderDocumentElement = () => {
    const meta = data.documentMeta || {};

    if (!data.documentUrl) {
      return (
        <div className="p-4 rounded-lg border border-warning/20 bg-warning/10 text-sm text-warning">
          Document URL unavailable. Please re-upload the file from the source list.
        </div>
      );
    }

    // Show PDF preview for documents
    const isPdf = data.documentUrl?.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      return (
        <div className="w-full h-full flex flex-col bg-surface overflow-hidden">
          {/* Document Header */}
          <div className="flex items-start justify-between gap-4 p-2 border-b border-line bg-canvas flex-shrink-0">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink truncate">{data.name}</p>
              <p className="text-[10px] text-dim">{meta.id || 'Document'}</p>
            </div>
            <div className="flex items-center space-x-0.5 flex-shrink-0">
              <button
                onClick={handleDocumentPreviewClick}
                className="p-1 rounded text-dim hover:text-info hover:bg-info/10 transition-colors"
                title="Preview"
              >
                <Eye className="w-3 h-3" />
              </button>
              <button
                onClick={handleDocumentDownload}
                className="p-1 rounded text-dim hover:text-ink hover:bg-surface-hover transition-colors"
                title="Download"
              >
                <Download className="w-3 h-3" />
              </button>
              <button
                onClick={handleDocumentOpen}
                className="p-1 rounded text-dim hover:text-info hover:bg-info/10 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 bg-surface-hover overflow-hidden min-h-0">
            <iframe
              src={`${data.documentUrl}#toolbar=0&navpanes=0&zoom=fit`}
              title={data.name}
              className="w-full h-full"
              style={{ border: 'none', display: 'block' }}
            />
          </div>
        </div>
      );
    }

    // Fallback card view for non-PDF documents
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-canvas p-4 ">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">{data.name}</p>
              <p className="mt-1 text-xs text-dim">{meta.id || 'Document'}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDocumentPreviewClick}
                className="p-2 rounded-md text-dim hover:text-info hover:bg-info/10 transition-colors"
                title="Preview"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={handleDocumentDownload}
                className="p-2 rounded-md text-dim hover:text-ink hover:bg-surface-hover transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleDocumentOpen}
                className="p-2 rounded-md text-dim hover:text-info hover:bg-info/10 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-dim">
            <div>
              <p className="font-medium text-dim">Customer</p>
              <p className="mt-0.5 text-ink">{meta.customer || '—'}</p>
            </div>
            <div>
              <p className="font-medium text-dim">Date</p>
              <p className="mt-0.5 text-ink">{meta.date ? new Date(meta.date).toLocaleDateString() : '—'}</p>
            </div>
            <div>
              <p className="font-medium text-dim">Amount</p>
              <p className="mt-0.5 text-ink">{meta.amount || '—'}</p>
            </div>
            <div>
              <p className="font-medium text-dim">Status</p>
              <p className="mt-0.5">
                {meta.status ? (
                  <span className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-ink border border-line">
                    {meta.status}
                  </span>
                ) : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Get table data for preview (use custom data if available, otherwise default)
  const getPreviewTableData = () => {
    if (data.customTableData) {
      return {
        columns: data.customTableData.columns,
        data: data.customTableData.data
      };
    }
    return {
      columns: ['name', 'email', 'role', 'status'],
      data: tableData
    };
  };

  // Build an array-of-arrays export payload [headers, ...rows] for the table element
  const getTableExportAOA = () => {
    const { columns, data: rows } = getPreviewTableData();
    const headers = Array.isArray(columns) ? columns : [];
    const colKeys = headers.map(col => (typeof col === 'string' ? col : (col.key || col.id || col.label || '')));
    const colLabels = headers.map(col => (typeof col === 'string' ? col : (col.label || col.key || col.id || '')));
    const body = (rows || []).map(row =>
      colKeys.map(key => {
        const val = row?.[key];
        if (val === null || val === undefined) return '';
        return typeof val === 'object' ? JSON.stringify(val) : val;
      })
    );
    return [colLabels, ...body];
  };

  const handleDownloadExcel = (e) => {
    e?.stopPropagation?.();
    try {
      const worksheet = XLSX.utils.aoa_to_sheet(getTableExportAOA());
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Table');
      const filename = `${(data.name || 'table').replace(/[^a-z0-9]+/gi, '_')}.xlsx`;
      XLSX.writeFile(workbook, filename);
      toast?.success?.('Excel file downloaded');
    } catch (err) {
      console.error('❌ Excel export failed:', err);
      toast?.error?.('Failed to export Excel');
    }
  };

  // Google Sheets has no unauthenticated "import via URL" endpoint, so we copy the
  // table as TSV to the clipboard and open a new sheet — paste drops it into cells.
  const handleExportGoogleSheets = async (e) => {
    e?.stopPropagation?.();
    const tsv = getTableExportAOA()
      .map(row => row.map(cell => String(cell).replace(/\t/g, ' ').replace(/\r?\n/g, ' ')).join('\t'))
      .join('\n');

    let copied = false;
    try {
      await navigator.clipboard.writeText(tsv);
      copied = true;
    } catch (err) {
      // Fallback: hidden textarea + execCommand for older browsers / denied permission
      try {
        const ta = document.createElement('textarea');
        ta.value = tsv;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        copied = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (fallbackErr) {
        console.error('❌ Clipboard copy failed:', err, fallbackErr);
      }
    }

    window.open('https://sheets.new', '_blank', 'noopener,noreferrer');

    if (copied) {
      toast?.info?.('Table copied to clipboard — in the Google Sheet, click a cell and press Cmd+V (Mac) or Ctrl+V to paste it', 6000);
    } else {
      toast?.error?.('Could not copy the table automatically — use the Excel download icon instead', 6000);
    }
  };

  // Create table helpers
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

  // Editable field label shown above form controls — persisted as data.fieldLabel
  const renderFieldLabel = (fallback) => {
    if (isElementLocked()) {
      const text = fieldLabel || fallback;
      return text ? <div className="text-xs font-semibold text-dim mb-1">{text}</div> : null;
    }
    return (
      <input
        type="text"
        value={fieldLabel}
        placeholder={fallback}
        onChange={(e) => setFieldLabel(e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="text-xs font-semibold text-dim mb-1 w-full bg-transparent outline-none border-b border-transparent focus:border-info/30 placeholder-dim pb-0.5"
      />
    );
  };

  // Inline options editor — rename each option, remove, add; replaces prompt() flow
  const renderOptionsEditor = (options, setOptions) => (
    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            type="text"
            value={opt}
            onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))}
            onKeyDown={(e) => e.stopPropagation()}
            className="flex-1 px-2 py-1 text-xs border border-line rounded focus:outline-none focus:ring-1 focus:ring-info"
          />
          <button
            onClick={() => setOptions(options.filter((_, j) => j !== i))}
            className="p-1 text-dim hover:text-danger transition-colors"
            title="Remove option"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <div className="flex gap-1.5 pt-1">
        <button
          onClick={() => setOptions([...options, `Option ${options.length + 1}`])}
          className="flex-1 text-[11px] font-medium text-info hover:bg-info/10 border border-dashed border-info/30 rounded py-1.5 transition-colors"
        >
          + Add option
        </button>
        <button
          onClick={() => setIsEditingField(false)}
          className="px-3 text-[11px] font-medium text-white bg-info hover:bg-info rounded py-1.5 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );

  // Small "Edit options" link shown below a control when editable
  const renderEditOptionsLink = () =>
    !isElementLocked() && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsEditingField(true);
        }}
        className="mt-1.5 text-[11px] font-medium text-info hover:text-info flex items-center gap-1 transition-colors"
      >
        <Edit2 className="w-3 h-3" />
        Edit options
      </button>
    );

  const renderTableElement = () => {
    return (
      <TableRenderer
        data={data}
        tableData={tableData}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        filterText={filterText}
        currentPage={currentPage}
        itemsPerPage={itemsPerPage}
        editingCell={editingCell}
        expandedRows={expandedRows}
        {...tableHelpers}
        setFilterText={setFilterText}
        setItemsPerPage={setItemsPerPage}
        setCurrentPage={setCurrentPage}
        setEditingCell={setEditingCell}
      />
    );
  };

  const renderCalendarElement = () => {
    return (
      <CalendarRenderer
        selectedDate={selectedDate}
        currentMonth={currentMonth}
        setSelectedDate={setSelectedDate}
        setCurrentMonth={setCurrentMonth}
      />
    );
  };

  const renderChartElement = () => {
    return (
      <ChartRenderer
        data={data}
        chartType={data.id}
      />
    );
  };

  const renderListElement = () => {
    return (
      <ListRenderer
        data={data}
        listType={data.id}
      />
    );
  };

  const renderMaterialsElement = () => {
    return (
      <MaterialsRenderer
        data={data}
        materialType={data.id}
        workspaceId={data.workspaceId}
        currentUser={currentUser}
        nodeId={id}
      />
    );
  };

  const renderUploadsElement = () => {
    return (
      <UploadsRenderer
        data={data}
        uploadType={data.id}
      />
    );
  };

  const renderFileElement = () => {
    return (
      <FileRenderer
        data={data}
      />
    );
  };



  const renderInteractiveElement = () => {
    const isLocked = isElementLocked();
    
    switch (data.type) {
      case 'textarea':
        return (
          <textarea
            value={textareaValue}
            onChange={(e) => !isLocked && setTextareaValue(e.target.value)}
            className={`w-full h-32 p-4 border-2 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-info focus:border-info text-base ${
              isLocked ? 'border-line bg-canvas text-dim cursor-not-allowed' : 'border-line'
            }`}
            placeholder={isLocked ? "Element is locked" : "Enter your text here..."}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            readOnly={isLocked}
          />
        );
      
      case 'textbox':
      case 'input':
        return (
          <div>
            {renderFieldLabel('Field label')}
            <input
              type="text"
              value={inputValue}
              onChange={(e) => !isLocked && setInputValue(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-info focus:border-info text-sm bg-surface ${
                isLocked ? 'border-line bg-canvas text-dim cursor-not-allowed' : 'border-line'
              }`}
              placeholder={isLocked ? "Element is locked" : "Enter value..."}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              readOnly={isLocked}
            />
          </div>
        );
      
      case 'button':
        return (
          <div className="space-y-2">
            {isEditingButton && !isLocked ? (
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                onBlur={() => setIsEditingButton(false)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    setIsEditingButton(false);
                  }
                }}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full p-2 border border-line rounded-md focus:outline-none focus:ring-2 focus:ring-info"
                placeholder="Button text"
                autoFocus
              />
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isLocked) {
                    alert(`${buttonText} clicked!`);
                  }
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (!isLocked) {
                    setIsEditingButton(true);
                  }
                }}
                className={`w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-info transition-colors ${
                  isLocked 
                    ? 'bg-cta text-dim cursor-not-allowed' 
                    : 'bg-info text-cta-foreground hover:bg-info'
                }`}
                disabled={isLocked}
              >
                {buttonText}
              </button>
            )}
            <div className="text-xs text-dim text-center">
              {isLocked ? 'Element is locked' : 'Double-click to edit text'}
            </div>
          </div>
        );
      
      case 'quotation':
      case 'invoice':
        return renderDocumentElement();

      case 'select':
      case 'dropdown':
        return (
          <div>
            {renderFieldLabel('Dropdown')}
            {isEditingField && !isLocked ? (
              renderOptionsEditor(selectOptions, setSelectOptions)
            ) : (
              <>
                <select
                  value={selectValue}
                  onChange={(e) => !isLocked && setSelectValue(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-info focus:border-info text-sm bg-surface ${
                    isLocked ? 'border-line bg-canvas text-dim cursor-not-allowed' : 'border-line'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  disabled={isLocked}
                >
                  <option value="">{isLocked ? "Element is locked" : "Select an option"}</option>
                  {selectOptions.map((option, index) => (
                    <option key={index} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {renderEditOptionsLink()}
              </>
            )}
          </div>
        );
      
      case 'checkbox':
        return (
          <div>
            {renderFieldLabel('Select all that apply')}
            {isEditingField && !isLocked ? (
              renderOptionsEditor(checkboxOptions, setCheckboxOptions)
            ) : (
              <>
                <div className="space-y-1.5">
                  {checkboxOptions.map((option, index) => (
                    <label
                      key={index}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
                        checkedItems[option]
                          ? 'border-info/30 bg-info/10'
                          : 'border-line hover:border-line hover:bg-canvas'
                      } ${isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checkedItems[option] || false}
                        onChange={(e) => !isLocked && setCheckedItems({
                          ...checkedItems,
                          [option]: e.target.checked
                        })}
                        className="w-4 h-4 rounded border-line text-info focus:ring-info"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        onFocus={(e) => e.stopPropagation()}
                        disabled={isLocked}
                      />
                      <span className={`text-sm ${isLocked ? 'text-dim' : 'text-ink'}`}>{option}</span>
                    </label>
                  ))}
                </div>
                {renderEditOptionsLink()}
              </>
            )}
          </div>
        );
      
      case 'radio':
        return (
          <div>
            {renderFieldLabel('Select one')}
            {isEditingField && !isLocked ? (
              renderOptionsEditor(radioOptions, setRadioOptions)
            ) : (
              <>
                <div className="space-y-1.5">
                  {radioOptions.map((option, index) => (
                    <label
                      key={index}
                      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border transition-colors ${
                        radioValue === option
                          ? 'border-info/30 bg-info/10'
                          : 'border-line hover:border-line hover:bg-canvas'
                      } ${isLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                    >
                      <input
                        type="radio"
                        name={`radio-${id}`}
                        value={option}
                        checked={radioValue === option}
                        onChange={(e) => !isLocked && setRadioValue(e.target.value)}
                        className="w-4 h-4 border-line text-info focus:ring-info"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        onFocus={(e) => e.stopPropagation()}
                        disabled={isLocked}
                      />
                      <span className={`text-sm ${isLocked ? 'text-dim' : 'text-ink'}`}>{option}</span>
                    </label>
                  ))}
                </div>
                {renderEditOptionsLink()}
              </>
            )}
          </div>
        );
      
      case 'form-template':
        console.log('📋 Rendering FormTemplate with data:', { 
          nodeId: id, 
          workspaceId, 
          formData: data?.formData 
        });
        return <FormTemplate 
          nodeId={id} 
          workspaceId={workspaceId}
          initialFormData={data?.formData}
        />;
      
      case 'table':
        return renderTableElement();
      
      case 'calendar':
        return renderCalendarElement();
      
      case 'chart':
        return renderChartElement();
      
      case 'list':
        return renderListElement();
      
      case 'materials':
        return renderMaterialsElement();
      
      case 'upload':
        return renderUploadsElement();
      
      case 'file':
        return renderFileElement();

      case 'image-block':
        return <ImageBlockRenderer data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;

      case 'document-block':
        return <DocumentBlockRenderer data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;

      case 'cad-files':
        return <CadFilesRenderer data={data} nodeId={id} workspaceId={workspaceId} taskId={data.taskId} subtaskId={data.subtaskId} setNodes={setNodes} />;
      case 'cdr-files':
        return <CadFilesRenderer variant="cdr" data={data} nodeId={id} workspaceId={workspaceId} taskId={data.taskId} subtaskId={data.subtaskId} setNodes={setNodes} />;
      case 'floor-plan':
        return <CadFilesRenderer variant="floorplan" data={data} nodeId={id} workspaceId={workspaceId} taskId={data.taskId} subtaskId={data.subtaskId} setNodes={setNodes} />;

      case 'procurement-rfq-request': {
        const request = data.procurementRFQData?.request || {};
        const rfq = data.procurementRFQData?.rfqFormData || {};
        const product = rfq.productDetails || {};
        const logistics = rfq.tradeLogistics || {};

        return (
          <div className="space-y-3">
            <div className="rounded-lg border border-warning/20 bg-warning/10 p-3">
              <p className="text-xs font-semibold text-warning uppercase tracking-wide">Procurement RFQ</p>
              <div className="mt-2 space-y-1 text-xs text-ink">
                <p><span className="font-medium">Item:</span> {product.productName || request.item || '-'}</p>
                <p><span className="font-medium">Qty:</span> {request.quantity || rfq.quantityPricing?.quantity || '-'} {rfq.quantityPricing?.quantityUnit || ''}</p>
                <p><span className="font-medium">Priority:</span> {request.priority || '-'}</p>
                <p><span className="font-medium">Required By:</span> {logistics.requiredByDate || request.requiredByDate || '-'}</p>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                document.dispatchEvent(new CustomEvent('openRequestDetails', {
                  detail: { nodeId: id, requestType: 'procurement-rfq-request' }
                }));
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-info/20 bg-info/10 px-3 py-2 text-xs font-semibold text-info hover:bg-info/10"
            >
              <Eye className="w-3.5 h-3.5" />
              View Full RFQ
            </button>
          </div>
        );
      }

      case 'execution-request': {
        const request = data.executionRequestData?.executionRequest || {};
        const isDailyLog = request.templateType === 'execution-daily-site-log';

        return (
          <div className="space-y-3">
            <div className="rounded-lg border border-info/20 bg-info/10 p-3">
              <p className="text-xs font-semibold text-info uppercase tracking-wide">Execution Preview</p>
              <div className="mt-2 space-y-1 text-xs text-ink">
                <p><span className="font-medium">Status:</span> {request.status || '-'}</p>
                <p><span className="font-medium">Location:</span> {request.location || '-'}</p>
                <p><span className="font-medium">Assignee:</span> {request.assignee || '-'}</p>
                {isDailyLog ? (
                  <>
                    <p><span className="font-medium">Skilled / Unskilled:</span> {request.laborSkilled || 0} / {request.laborUnskilled || 0}</p>
                    <p><span className="font-medium">Weather:</span> {request.weatherConditions || '-'}</p>
                    <p className="line-clamp-2"><span className="font-medium">Work Done:</span> {request.workCompletedToday || '-'}</p>
                  </>
                ) : (
                  <p><span className="font-medium">Priority:</span> {request.priority || '-'}</p>
                )}
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                document.dispatchEvent(new CustomEvent('openRequestDetails', {
                  detail: { nodeId: id, requestType: 'execution-request' }
                }));
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-info/20 bg-info/10 px-3 py-2 text-xs font-semibold text-info hover:bg-info/10"
            >
              <Eye className="w-3.5 h-3.5" />
              View Full Request
            </button>
          </div>
        );
      }

      case 'card':
        return <MaterialSpecCard data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;

      case 'task-card':
      case 'task-card-progress':
        return <TaskCardRenderer data={data} />;
      
      case 'boq-generator':
        return <BOQGenerator />;

      case 'calculator': // legacy panel type — route through the same dispatch below
      case 'cost-calculator':
        // Render different calculators based on element name or id
        const lowerName = (data.name || '').toLowerCase();
        const lowerId = (data.id || '').toLowerCase();
        
        if (lowerName.includes('vinyl') || lowerId.includes('vinyl')) {
          return <VinylFlooringCalculator data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;
        } else if (lowerName.includes('steel') || lowerId.includes('steel')) {
          return <SteelEstimationCalculator data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;
        } else if (lowerName.includes('paint') || lowerId.includes('paint')) {
          return <PaintingEstimator data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;
        } else if (lowerName.includes('electrical') || lowerName.includes('wiring') || lowerId.includes('electrical') || lowerId.includes('wiring')) {
          return <ElectricalWiringEstimator data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;
        } else if (lowerName.includes('brick') || lowerId.includes('brick')) {
          return <BricksCalculator data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;
        } else if (lowerName.includes('block') || lowerId.includes('block')) {
          return <ConcreteBlocksCalculator data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;
        } else if (lowerName.includes('concrete') || lowerName.includes('cement') || lowerId.includes('concrete') || lowerId.includes('cement')) {
          return <ConcreteCalculator data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;
        } else if (lowerName.includes('soil') || lowerName.includes('excavat') || lowerId.includes('soil') || lowerId.includes('excavat')) {
          return <SoilExcavationCalculator data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;
        } else if (lowerName.includes('flooring') || lowerName.includes('floor') || lowerId.includes('flooring') || lowerId.includes('floor')) {
          return <FlooringCalculator data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;
        }
        // Default to Concrete Blocks Calculator
        return <ConcreteBlocksCalculator data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;
      
      case 'cost-calculator-summary':
        return <CostCalculatorSummary data={data} />;

      // Logistics Elements
      case 'logistics-shipment':
        return <ShipmentCard data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;

      case 'logistics-freight-cost':
        return <FreightCostCalculator data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;

      case 'logistics-route-optimization':
        return <RouteOptimizationBlock data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;

      case 'logistics-pod':
        return <ProofOfDeliveryBlock data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;

      case 'logistics-exception-report':
        return <ExceptionDelayReport data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;

      case 'logistics-carrier-scorecard':
        return <CarrierPerformanceScorecard data={data} nodeId={id} workspaceId={workspaceId} setNodes={setNodes} />;
      
      case 'icon':
        return renderIconElement();
      
      case 'divider':
        return renderDividerElement();
      
      case 'spacer':
        return renderSpacerElement();
      
      case 'container':
        return renderContainerElement();
      
      case 'grid':
        return renderGridElement();
      
      default:
        return (
          <div className="text-center py-4 bg-surface-hover rounded border">
            <span className="text-xs font-medium text-dim uppercase tracking-wide">
              {data.type}
            </span>
          </div>
        );
    }
  };

  // Icon mapping function
  const getIconComponent = (iconId) => {
    const iconMap = {
      'arrow-icon': ArrowRight,
      'check-icon': Check,
      'close-icon': XIcon,
      'menu-icon': Menu,
      'star-icon': Star,
      'heart-icon': Heart,
    };
    
    const IconComponent = iconMap[iconId] || ArrowRight; // Default to ArrowRight if not found
    return IconComponent;
  };

  // Render icon element
  const renderIconElement = () => {
    const IconComponent = getIconComponent(data.id);
    
    return (
      <div className="flex items-center justify-center p-4">
        <IconComponent className="w-16 h-16 text-ink" />
      </div>
    );
  };

  // Render divider element
  const renderDividerElement = () => {
    return (
      <div className="w-full">
        <hr className="border-t-2 border-line w-full" />
      </div>
    );
  };

  // Render spacer element
  const renderSpacerElement = () => {
    return (
      <div className="w-full h-16 bg-canvas border-2 border-dashed border-line rounded flex items-center justify-center">
        <span className="text-xs text-dim">Spacer</span>
      </div>
    );
  };

  // Render container element
  const renderContainerElement = () => {
    return (
      <div className="w-full min-h-[120px] border-2 border-line rounded-lg bg-canvas p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-line rounded-lg mx-auto mb-2 flex items-center justify-center">
            <span className="text-dim text-xs">📦</span>
          </div>
          <span className="text-xs text-dim">Container</span>
        </div>
      </div>
    );
  };

  // Render grid element
  const renderGridElement = () => {
    return (
      <div className="w-full min-h-[120px] border-2 border-line rounded-lg bg-canvas p-3">
        <div className="grid grid-cols-3 gap-2 h-full">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="border border-line rounded bg-surface flex items-center justify-center min-h-[40px]"
            >
              <span className="text-xs text-dim">{item}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Determine border style based on selection state and importance
  const getBorderStyle = () => {
    if (isImportant) {
      return 'border-warning ring-4 ring-warning/20 shadow-yellow-200';
    }
    if (data.isManuallySelected) {
      return 'border-success ring-4 ring-success/20 shadow-green-200';
    }
    if (data.isInSelectionMode) {
      return 'border-info/30 hover:border-info cursor-pointer';
    }
    if (selected) {
      return 'border-info ring-2 ring-info/20';
    }
    return 'border-info';
  };

  // Special rendering for icon type - just show the icon without card wrapper
  if (data.type === 'icon') {
    const IconComponent = getIconComponent(data.id);
    
    return (
      <div className={`bg-transparent border-2 rounded-lg shadow-lg p-2 relative group transition-all min-w-[80px] max-w-[120px] ${getBorderStyle()}`}>
        {/* Connection Handles - All uniform gray, bidirectional */}
        <Handle
          type="source"
          position={Position.Top}
          id="top-out"
          style={{ left: '50%' }}
          className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
          isConnectable={isConnectable}
        />
        <Handle
          type="target"
          position={Position.Top}
          id="top-in"
          style={{ left: '50%' }}
          className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
          isConnectable={isConnectable}
        />
        
        <Handle
          type="source"
          position={Position.Right}
          id="right-out"
          style={{ top: '50%' }}
          className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
          isConnectable={isConnectable}
        />
        <Handle
          type="target"
          position={Position.Right}
          id="right-in"
          style={{ top: '50%' }}
          className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
          isConnectable={isConnectable}
        />
        
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom-out"
          style={{ left: '50%' }}
          className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
          isConnectable={isConnectable}
        />
        <Handle
          type="target"
          position={Position.Bottom}
          id="bottom-in"
          style={{ left: '50%' }}
          className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
          isConnectable={isConnectable}
        />
        
        <Handle
          type="source"
          position={Position.Left}
          id="left-out"
          style={{ top: '50%' }}
          className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
          isConnectable={isConnectable}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left-in"
          style={{ top: '50%' }}
          className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
          isConnectable={isConnectable}
        />
        
        {/* Icon Element */}
        <div className="flex items-center justify-center">
          <IconComponent className="w-12 h-12 text-ink" />
        </div>
        
        {/* Selection indicator */}
        {selected && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-info text-white rounded-full flex items-center justify-center text-[10px] font-bold">
            E
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // Special rendering for button type - just show the button
  // itself without the card wrapper (header/footer chrome)
  // ============================================================
  if (data.type === 'button') {
    const isLocked = isElementLocked();

    const BUTTON_ACTION_OPTIONS = [
      { id: 'custom', label: 'Custom', tone: 'neutral', done: 'Clicked' },
      { id: 'approve', label: 'Approve', tone: 'positive', done: 'Approved' },
      { id: 'submit', label: 'Submit', tone: 'positive', done: 'Submitted' },
      { id: 'reject', label: 'Reject', tone: 'negative', done: 'Rejected' },
      { id: 'cancel', label: 'Cancel', tone: 'negative', done: 'Cancelled' },
    ];

    const buttonResult = data.buttonResult || null;
    const isDone = !!buttonResult;
    const doneLabel = isDone
      ? (BUTTON_ACTION_OPTIONS.find(o => o.id === (buttonResult.action || buttonAction))?.done || 'Done')
      : null;
    const doneTone = isDone
      ? (BUTTON_ACTION_OPTIONS.find(o => o.id === (buttonResult.action || buttonAction))?.tone || 'neutral')
      : null;

    // Workspace collaborators available for assignment
    const collaborators = (data.workspaceCollaborators || []).filter(
      (c, i, arr) => arr.findIndex(x => (x.vendorId || x.userId || x.email) === (c.vendorId || c.userId || c.email)) === i
    );

    // Only the assigned user can trigger the button (when an assignee is set).
    // Identity can come from VendorContext OR URL params (PM/client/CAS arrive via links).
    const urlUserParams = new URLSearchParams(window.location.search);
    const myIds = [
      currentUser?.vendorId,
      currentUser?.userId,
      currentUser?.pmId,
      currentUser?.id,
      urlUserParams.get('pmId'),
      urlUserParams.get('userId'),
      urlUserParams.get('clientId')
    ].filter(Boolean);
    const myEmail = currentUser?.email ||
      (urlUserParams.get('userEmail') ? decodeURIComponent(urlUserParams.get('userEmail')) : null);
    const assignedTo = buttonAssignee || data.buttonAssignee;
    const isAssignee = !assignedTo ||
      myIds.some(id => id === assignedTo.vendorId || id === assignedTo.userId || id === assignedTo.id) ||
      (assignedTo.email && myEmail && assignedTo.email === myEmail);

    const buttonTone = BUTTON_ACTION_OPTIONS.find(o => o.id === buttonAction)?.tone || 'neutral';
    const buttonColorClasses = isDone
      ? doneTone === 'positive'
        ? 'bg-cta text-cta-foreground cursor-default'
        : doneTone === 'negative'
          ? 'bg-danger text-white cursor-default'
          : 'bg-cta text-cta-foreground cursor-default'
      : isLocked
        ? 'bg-cta text-dim cursor-not-allowed'
        : !isAssignee
          ? (buttonTone === 'positive'
              ? 'bg-cta text-cta-foreground opacity-60 cursor-not-allowed'
              : buttonTone === 'negative'
                ? 'bg-danger text-white opacity-60 cursor-not-allowed'
                : 'bg-info text-white opacity-60 cursor-not-allowed')
          : buttonTone === 'positive'
            ? 'bg-cta text-cta-foreground hover:bg-cta '
            : buttonTone === 'negative'
              ? 'bg-danger text-white hover:bg-danger '
              : 'bg-info text-white hover:bg-info ';

    const persistButtonPatch = async (updates) => {
      try {
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === id
              ? { ...node, data: { ...node.data, ...updates } }
              : node
          )
        );
        await persistNodeDataPatch(id, updates, null, workspaceId);
      } catch (err) {
        console.error('Failed to save button config:', err);
      }
    };

    const persistButtonChanges = async () => {
      await persistButtonPatch({
        buttonText,
        buttonAction,
        buttonAssignee,
        lastModifiedAt: new Date().toISOString()
      });
    };

    const handleButtonEditDone = async () => {
      setIsEditingButton(false);
      await persistButtonChanges();
    };

    const handleButtonTrigger = async (e) => {
      e.stopPropagation();
      if (isLocked || isDone || !isAssignee) return;

      const result = {
        status: BUTTON_ACTION_OPTIONS.find(o => o.id === buttonAction)?.done?.toLowerCase() || 'clicked',
        action: buttonAction,
        label: buttonText,
        by: currentUser?.name ||
            (urlUserParams.get('userName') ? decodeURIComponent(urlUserParams.get('userName')) : null) ||
            myEmail || 'Unknown User',
        byRole: getCurrentUserRole(),
        at: new Date().toISOString()
      };

      await persistButtonPatch({ buttonResult: result, lastModifiedAt: result.at });
    };

    const handleButtonReset = async () => {
      await persistButtonPatch({ buttonResult: null, lastModifiedAt: new Date().toISOString() });
      setIsEditingButton(false);
    };

    return (
      <div className={`relative group ${selected ? 'z-10' : ''}`}>
        {/* Connection Handles - uniform gray, bidirectional */}
        <Handle type="source" position={Position.Top} id="top-out" style={{ left: '50%' }}
          className="w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" isConnectable={isConnectable} />
        <Handle type="target" position={Position.Top} id="top-in" style={{ left: '50%' }}
          className="w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" isConnectable={isConnectable} />
        <Handle type="source" position={Position.Right} id="right-out" style={{ top: '50%' }}
          className="w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" isConnectable={isConnectable} />
        <Handle type="target" position={Position.Right} id="right-in" style={{ top: '50%' }}
          className="w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" isConnectable={isConnectable} />
        <Handle type="source" position={Position.Bottom} id="bottom-out" style={{ left: '50%' }}
          className="w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" isConnectable={isConnectable} />
        <Handle type="target" position={Position.Bottom} id="bottom-in" style={{ left: '50%' }}
          className="w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" isConnectable={isConnectable} />
        <Handle type="source" position={Position.Left} id="left-out" style={{ top: '50%' }}
          className="w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" isConnectable={isConnectable} />
        <Handle type="target" position={Position.Left} id="left-in" style={{ top: '50%' }}
          className="w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" isConnectable={isConnectable} />

        {/* The button itself */}
        <button
          onClick={handleButtonTrigger}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (!isLocked) {
              setIsEditingButton(true);
            }
          }}
          disabled={isLocked || isDone}
          title={
            isDone
              ? `${doneLabel} by ${buttonResult.by}`
              : !isAssignee && assignedTo
                ? `Only ${assignedTo.name || 'the assigned user'} can trigger this`
                : buttonText
          }
          className={`px-6 py-2.5 rounded-md text-sm font-semibold  transition-all focus:outline-none focus:ring-2 focus:ring-info ${buttonColorClasses} ${selected ? 'ring-2 ring-info/30 ring-offset-2' : ''} ${isImportant ? 'ring-4 ring-warning/30' : ''}`}
        >
          {isDone ? `${doneTone === 'negative' ? '✗' : '✓'} ${doneLabel}` : buttonText}
        </button>

        {/* Status caption under the button */}
        {isDone ? (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap text-[10px] font-medium text-dim">
            {doneLabel} by {buttonResult.by}
            {buttonResult.byRole ? ` (${buttonResult.byRole.toUpperCase()})` : ''}
            {' · '}{new Date(buttonResult.at).toLocaleString()}
          </div>
        ) : assignedTo ? (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 whitespace-nowrap text-[10px] font-medium text-dim">
            {isAssignee
              ? `Assigned to you — click to ${buttonAction === 'custom' ? 'confirm' : buttonAction}`
              : `Waiting for ${assignedTo.name || 'assignee'} to ${buttonAction === 'custom' ? 'act' : buttonAction}`}
          </div>
        ) : null}

        {/* Edit pencil - beside the button */}
        {!isLocked && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingButton((v) => !v);
            }}
            className="absolute -right-9 top-1/2 -translate-y-1/2  z-30 w-6 h-6 bg-surface text-dim hover:text-info hover:bg-info/10 rounded-full flex items-center justify-center  border border-line transition-colors"
            title="Edit button"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        )}

        {/* Edit popover - label + action + assignee */}
        {isEditingButton && !isLocked && (
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 mt-7 z-40 w-60 bg-surface border border-line rounded-lg shadow-xl p-3 space-y-2"
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-dim mb-1">Label</label>
              <input
                type="text"
                value={buttonText}
                onChange={(e) => setButtonText(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') handleButtonEditDone();
                }}
                className="w-full px-2 py-1.5 border border-line rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-info"
                placeholder="Button text"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-dim mb-1">Action</label>
              <div className="flex flex-wrap gap-1">
                {BUTTON_ACTION_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setButtonAction(option.id)}
                    className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                      buttonAction === option.id
                        ? option.tone === 'positive'
                          ? 'bg-cta text-cta-foreground border-line'
                          : option.tone === 'negative'
                            ? 'bg-danger text-white border-danger'
                            : 'bg-info text-white border-info'
                        : 'bg-surface text-dim border-line hover:bg-canvas'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wide text-dim mb-1">Who can act</label>
              <select
                value={buttonAssignee ? (buttonAssignee.vendorId || buttonAssignee.userId || buttonAssignee.email || '') : ''}
                onChange={(e) => {
                  const key = e.target.value;
                  const collab = collaborators.find(c => (c.vendorId || c.userId || c.email) === key);
                  setButtonAssignee(collab ? {
                    vendorId: collab.vendorId || collab.userId || null,
                    userId: collab.userId || null,
                    name: collab.name || collab.email || 'Unknown',
                    email: collab.email || null,
                    role: collab.role || collab.userType || null
                  } : null);
                }}
                className="w-full px-2 py-1.5 border border-line rounded-md text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-info"
              >
                <option value="">Anyone</option>
                {collaborators.map((collab) => {
                  const key = collab.vendorId || collab.userId || collab.email;
                  const roleLabel = collab.role || collab.userType || (collab.isClient ? 'client' : null);
                  return (
                    <option key={key} value={key}>
                      {collab.name || collab.email || 'Unknown'}{roleLabel ? ` (${roleLabel.toUpperCase()})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            {isDone && (
              <div className="flex items-center justify-between px-2 py-1.5 bg-canvas border border-line rounded-md">
                <span className="text-[11px] text-dim">
                  {doneLabel} by {buttonResult.by}
                </span>
                <button
                  onClick={handleButtonReset}
                  className="text-[11px] font-medium text-danger hover:text-danger"
                >
                  Reset
                </button>
              </div>
            )}
            <button
              onClick={handleButtonEditDone}
              className="w-full px-2 py-1.5 bg-info hover:bg-info text-white text-xs font-semibold rounded-md transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {/* Sequence Number Badge */}
        {data.sequenceNumber && (
          <div className="absolute -top-3 -left-3 z-20 w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white">
            {data.sequenceNumber}
          </div>
        )}

        {/* Lock Indicator */}
        {data.locked && (
          <div className="absolute -top-3 -right-3 z-20 w-5 h-5 bg-warning text-white rounded-full flex items-center justify-center  border-2 border-white" title="Element is locked">
            <Lock className="w-3 h-3" />
          </div>
        )}

        {/* Selection indicator */}
        {selected && !data.locked && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-info text-white rounded-full flex items-center justify-center text-[10px] font-bold">
            E
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // Figma-style Comment Pin for textarea type
  // Collapsed = avatar pin only | Hover/Click = expand comment box
  // ============================================================
  if (data.type === 'textarea') {
    const authorName = data.addedBy || currentUser?.name || 'You';
    const authorInitial = authorName.charAt(0).toUpperCase();
    const isLocked = ['sent_to_pm', 'pm_approved', 'client_approved', 'locked'].includes(data.approvalStatus || 'draft');
    const hasContent = !!(textareaValue && textareaValue.trim());
    const addedDate = data.addedAt ? new Date(data.addedAt) : new Date();
    const timeAgo = (() => {
      const diff = Date.now() - addedDate.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      const days = Math.floor(hrs / 24);
      return `${days}d ago`;
    })();

    // Submit handler — save immediately and collapse
    const handleCommentSubmit = async () => {
      if (!textareaValue?.trim() || isLocked) return;
      try {
        await persistTextContent(id, textareaValue, 'textareaValue', setNodes, workspaceId);
      } catch (err) {
        console.error('Failed to save comment:', err);
      }
      setCommentBoxOpen(false);
    };

    return (
      <div
        className={`relative group ${selected ? 'z-10' : ''}`}
        style={{ width: 36, height: 36 }}
      >
        {/* Connection Handles */}
        <Handle type="source" position={Position.Top} id="top-out" style={{ left: '50%' }}
          className="w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" isConnectable={isConnectable} />
        <Handle type="target" position={Position.Top} id="top-in" style={{ left: '50%' }}
          className="w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" isConnectable={isConnectable} />
        <Handle type="source" position={Position.Right} id="right-out" style={{ top: '50%' }}
          className="w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" isConnectable={isConnectable} />
        <Handle type="target" position={Position.Right} id="right-in" style={{ top: '50%' }}
          className="w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" isConnectable={isConnectable} />
        <Handle type="source" position={Position.Bottom} id="bottom-out" style={{ left: '50%' }}
          className="w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" isConnectable={isConnectable} />
        <Handle type="target" position={Position.Bottom} id="bottom-in" style={{ left: '50%' }}
          className="w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" isConnectable={isConnectable} />
        <Handle type="source" position={Position.Left} id="left-out" style={{ top: '50%' }}
          className="w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" isConnectable={isConnectable} />
        <Handle type="target" position={Position.Left} id="left-in" style={{ top: '50%' }}
          className="w-2.5 h-2.5 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity" isConnectable={isConnectable} />

        {/* ── Avatar Pin (always visible) ── */}
        <div
          className={`
            w-9 h-9 rounded-full bg-gradient-to-br from-black to-black text-white
            flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white
            cursor-pointer transition-transform hover:scale-110
            ${isImportant ? 'ring-2 ring-warning ring-offset-1' : ''}
          `}
          onClick={(e) => { e.stopPropagation(); setCommentBoxOpen(true); }}
        >
          {authorInitial}
        </div>

        {/* Sequence number badge */}
        {data.sequenceNumber && (
          <div className="absolute -top-1.5 -right-1.5 z-30 w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-white">
            {data.sequenceNumber}
          </div>
        )}

        {/* Small dot indicator when has content (so user knows there's a comment) */}
        {hasContent && !commentBoxOpen && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-info rounded-full border-2 border-white z-20" />
        )}

        {/* ── Comment Box — opens on pin click OR hover ── */}
        <div
          className={`
            absolute top-10 left-0 z-40 transition-all duration-200 origin-top-left
            ${commentBoxOpen
              ? 'opacity-100 scale-100 pointer-events-auto'
              : 'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'
            }
          `}
          style={{ minWidth: 260, maxWidth: 320 }}
        >
          {/* Speech-bubble triangle */}
          <div className="w-3 h-3 bg-surface border-l border-t border-line rotate-45 absolute -top-1.5 left-3 z-10" />

          <div className={`bg-surface rounded-xl shadow-2xl border overflow-hidden mt-1 ${
            selected ? 'border-info ring-2 ring-info/20' : 'border-line'
          } ${isImportant ? 'border-warning bg-warning/10 ring-2 ring-warning/20' : ''}`}>

            {/* Header — author + timestamp + menu */}
            <div className="flex items-center justify-between px-3 py-2 bg-canvas border-b border-line">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                  {authorInitial}
                </div>
                <span className="text-xs font-semibold text-ink truncate max-w-[120px]">{authorName}</span>
                <span className="text-[10px] text-dim">{timeAgo}</span>
              </div>
              <div className="flex items-center space-x-1">
                {isImportant && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-warning/20 text-warning rounded font-medium">★</span>
                )}
                {isLocked && (
                  <Lock className="w-3 h-3 text-dim" />
                )}
                <div className="relative" ref={menuDropdownRef}>
                  <button
                    onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                    className="p-0.5 text-dim hover:text-dim hover:bg-surface-hover rounded transition-all"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                  {showMenuDropdown && (
                    <div className="absolute right-0 mt-1 w-36 bg-surface border border-line rounded-lg shadow-xl z-50 py-1">
                      <button onClick={handleDuplicate} className="w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-canvas flex items-center space-x-2">
                        <Copy className="w-3 h-3 text-dim" /><span>Duplicate</span>
                      </button>
                      <button onClick={() => { const newImportantState = !isImportant; setIsImportant(newImportantState); persistIsImportant(id, newImportantState, setNodes, workspaceId).catch(err => console.error('Failed to persist:', err)); }}
                        className="w-full px-3 py-1.5 text-left text-xs text-ink hover:bg-canvas flex items-center space-x-2">
                        <Star className="w-3 h-3 text-warning" /><span>{isImportant ? 'Unmark Important' : 'Mark Important'}</span>
                      </button>
                      <button onClick={handleDelete} className="w-full px-3 py-1.5 text-left text-xs text-danger hover:bg-danger/10 flex items-center space-x-2">
                        <Trash2 className="w-3 h-3 text-danger" /><span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Text area body + send button */}
            <div className="px-3 py-2">
              <div className="flex items-end space-x-2">
                <textarea
                  value={textareaValue}
                  onChange={(e) => !isLocked && setTextareaValue(e.target.value)}
                  className={`flex-1 text-sm leading-relaxed bg-transparent border-0 resize-none focus:outline-none focus:ring-0 p-0 placeholder-dim ${
                    isLocked ? 'text-dim cursor-not-allowed' : 'text-ink'
                  }`}
                  placeholder={isLocked ? 'Locked' : 'Type a comment...'}
                  rows={Math.max(1, Math.min(6, (textareaValue || '').split('\n').length))}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    // Ctrl/Cmd + Enter to submit
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleCommentSubmit();
                    }
                  }}
                  onFocus={(e) => { e.stopPropagation(); setCommentBoxOpen(true); }}
                  readOnly={isLocked}
                  style={{ minHeight: '28px', maxHeight: '160px', overflow: 'auto' }}
                />
                {/* Send / Enter button */}
                {textareaValue?.trim() && !isLocked && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCommentSubmit(); }}
                    className="flex-shrink-0 w-7 h-7 rounded-full bg-info hover:bg-info text-white flex items-center justify-center transition-colors  mb-0.5"
                    title="Save comment (Ctrl+Enter)"
                  >
                    <Send className="w-3.5 h-3.5" style={{ transform: 'rotate(-45deg)', marginLeft: '1px' }} />
                  </button>
                )}
              </div>
            </div>

            {/* Footer — approval status badge */}
            {data.approvalStatus && data.approvalStatus !== 'pending' && (
              <div className="px-3 py-1.5 border-t border-line bg-canvas">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  data.approvalStatus === 'client_approved' ? 'bg-success/10 text-success' :
                  data.approvalStatus === 'pm_approved' ? 'bg-info/10 text-info' :
                  data.approvalStatus === 'rejected' ? 'bg-danger/10 text-danger' :
                  data.approvalStatus === 'sent_to_pm' ? 'bg-warning/10 text-warning' :
                  'bg-surface-hover text-dim'
                }`}>
                  {data.approvalStatus === 'client_approved' ? '✓ Approved' :
                   data.approvalStatus === 'pm_approved' ? '✓ PM Approved' :
                   data.approvalStatus === 'rejected' ? '✗ Rejected' :
                   data.approvalStatus === 'sent_to_pm' ? '⏳ Pending' :
                   data.approvalStatus}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Determine wrapper classes based on element type
  const getWrapperClasses = () => {
    const baseClasses = `${isImportant ? 'bg-warning/10' : 'bg-surface'} border-2 rounded-xl shadow-xl relative group transition-all`;
    const isOverdue = deadline && calculateTimeLeft(deadline)?.isExpired;
    const recentlyUpdatedClass = isOverdue
      ? 'ring-2 ring-danger ring-offset-1'
      : isRecentlyUpdated() ? 'ring-2 ring-warning/30 ring-offset-1' : '';
    const compactTypes = ['divider', 'spacer', 'container', 'grid'];
    
    // BOQ Generator has special flexible sizing
    if (data.type === 'boq-generator') {
      return `${baseClasses} ${recentlyUpdatedClass} p-4 w-full h-full min-w-[600px] max-w-[95vw] flex flex-col`;
    }

    // All elements fill the resized node dimensions (NodeResizer sets style w/h).
    // max-w caps are removed so nodes can grow when manually resized.
    if (compactTypes.includes(data.type)) {
      if (data.type === 'divider') {
        return `${baseClasses} ${recentlyUpdatedClass} p-2 w-full h-full min-w-[200px] flex flex-col`;
      } else if (data.type === 'spacer') {
        return `${baseClasses} ${recentlyUpdatedClass} p-2 w-full h-full min-w-[150px] flex flex-col`;
      } else if (data.type === 'container') {
        return `${baseClasses} ${recentlyUpdatedClass} p-4 w-full h-full min-w-[200px] flex flex-col`;
      } else if (data.type === 'grid') {
        return `${baseClasses} ${recentlyUpdatedClass} p-3 w-full h-full min-w-[250px] flex flex-col`;
      }
    }

    if (data.type === 'form-template') {
      return `${baseClasses} ${recentlyUpdatedClass} p-6 w-full h-full min-w-[450px] flex flex-col`;
    }

    return `${baseClasses} ${recentlyUpdatedClass} p-6 w-full h-full min-w-[320px] flex flex-col`;
  };

  // Timer calculation
  const [now, setNow] = useState(Date.now());
  React.useEffect(() => {
    if (!deadline) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  const getTimeLeft = () => {
    const timeLeft = calculateTimeLeft(deadline);
    if (!timeLeft) return null;
    if (timeLeft.isExpired) return 'Deadline reached';
    return formatTimeLeft(timeLeft);
  };

  // Save deadline to backend (update node in workspace)
  const persistDeadlineLocal = async (newDeadline) => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      deadlineJustSetRef.current = true; // Mark that we just set it to prevent sync from clearing it
      
      // Use shared persistence function
      await persistDeadline(id, newDeadline, setNodes, workspaceId);
      
      // Update the local deadline state to match
      setDeadline(newDeadline instanceof Date ? newDeadline.toISOString() : 
                 (typeof newDeadline === 'string' && !newDeadline.includes('T')) ? new Date(newDeadline).toISOString() :
                 newDeadline);
      
      // Reset the flag after 2 seconds so future syncs work normally
      setTimeout(() => {
        deadlineJustSetRef.current = false;
      }, 2000);
      
      console.log('📝 Local deadline state updated');
    } catch (err) {
      console.error('Failed to persist deadline:', err);
    } finally {
      setSaving(false);
    }
  };

  // Save isImportant state to backend (update node in workspace)
  const persistIsImportantLocal = async (important) => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      // Use shared persistence function
      await persistIsImportant(id, important, setNodes, workspaceId);
    } catch (err) {
      console.error('Failed to persist isImportant:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`${getWrapperClasses()} ${getBorderStyle()}`}
      onMouseEnter={() => setIsNodeHovered(true)}
      onMouseLeave={() => setIsNodeHovered(false)}
    >
      {/* Manual resize affordance for all card-type elements */}
      <NodeResizer
        isVisible={selected || isNodeHovered}
        minWidth={240}
        minHeight={140}
        lineClassName="!border-info"
        handleClassName="!w-3 !h-3 !bg-info !border-2 !border-white !rounded-md"
      />

      {/* Connection Handles - All uniform gray, bidirectional */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-out"
        style={{ left: '50%' }}
        className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-in"
        style={{ left: '50%' }}
        className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
        isConnectable={isConnectable}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="right-out"
        style={{ top: '50%' }}
        className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-in"
        style={{ top: '50%' }}
        className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
        isConnectable={isConnectable}
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-out"
        style={{ left: '50%' }}
        className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-in"
        style={{ left: '50%' }}
        className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
        isConnectable={isConnectable}
      />
      
      <Handle
        type="source"
        position={Position.Left}
        id="left-out"
        style={{ top: '50%' }}
        className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-in"
        style={{ top: '50%' }}
        className="w-3 h-3 !bg-cta !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-cta"
        isConnectable={isConnectable}
      />
      
      {/* Info & Help Icons - Top right corner */}
      <div className="absolute -top-3 -right-3 z-20 flex items-center space-x-1">
        {/* Recently Updated Badge - Shows when element was added/updated within 5 minutes */}
        {isRecentlyUpdated() && (
          <div className="w-8 h-8 bg-warning text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white font-bold text-lg animate-pulse" title="Recently updated" role="status" aria-label="Recently updated">
            ✨
          </div>
        )}
        
        {/* Lock Indicator - Shows when element is locked */}
        {data.locked && (
          <div className="w-5 h-5 bg-warning hover:bg-warning text-white rounded-full flex items-center justify-center  border-2 border-white transition-all" title="Element is locked">
            <Lock className="w-3 h-3" />
          </div>
        )}
        
        {/* Info Button */}
        <div 
          className="relative"
          onMouseEnter={() => setShowInfoTooltip(true)}
          onMouseLeave={() => setShowInfoTooltip(false)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInfoTooltip(!showInfoTooltip);
            }}
            className="w-5 h-5 bg-info hover:bg-info text-white rounded-full flex items-center justify-center  transition-all duration-200 hover:scale-110 border-2 border-white"
            title="Element Info"
          >
            <Info className="w-3 h-3" />
          </button>
          
          {/* Info Tooltip */}
          {showInfoTooltip && (
            <div className="absolute right-7 -top-1 z-50 w-72 bg-surface rounded-lg shadow-xl border border-line p-3 text-left animate-fade-in">
              {/* Arrow pointer */}
              <div className="absolute -right-2 top-3 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-white"></div>
              <div className="absolute -right-[9px] top-3 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-gray-200"></div>
              
              {/* Header */}
              <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-line">
                <div className="w-8 h-8 bg-info/10 rounded-full flex items-center justify-center">
                  <Info className="w-4 h-4 text-info" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-ink">Element Details</h4>
                </div>
              </div>
              
              {/* Element Type */}
              <div className="mb-2">
                <p className="text-xs text-dim uppercase tracking-wide">Element Type</p>
                <p className="text-sm font-medium text-ink flex items-center">
                  <span className="w-2 h-2 bg-info rounded-full mr-2"></span>
                  {data.name || data.type || 'Unknown Element'}
                </p>
              </div>
              
              {/* What it does - Description */}
              <div className="mb-3 p-2 bg-canvas rounded-md border border-line">
                <p className="text-xs text-dim uppercase tracking-wide mb-1">💡 What it does</p>
                <p className="text-xs text-ink leading-relaxed">
                  {getElementDescription(data.type)}
                </p>
              </div>
              
              {/* Added By */}
              <div className="mb-2">
                <p className="text-xs text-dim uppercase tracking-wide">Added By</p>
                <p className="text-sm font-medium text-ink flex items-center">
                  <span className="w-6 h-6 bg-success/10 rounded-full flex items-center justify-center mr-2 text-xs font-bold text-success">
                    {(data.addedBy || 'U').charAt(0).toUpperCase()}
                  </span>
                  {data.addedBy || 'Unknown User'}
                </p>
                {data.addedByEmail && (
                  <p className="text-xs text-dim ml-8">{data.addedByEmail}</p>
                )}
              </div>
              
              {/* Added At */}
              <div className="mb-2">
                <p className="text-xs text-dim uppercase tracking-wide">Added On</p>
                <p className="text-sm font-medium text-ink">
                  📅 {formatDate(data.addedAt)}
                </p>
              </div>
              
              {/* Element ID */}
              <div className="pt-2 border-t border-line">
                <p className="text-xs text-dim">
                  ID: <span className="font-mono">{id?.slice(0, 20)}...</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Element Header - Hide for divider, spacer, container, grid */}
      {!['divider', 'spacer', 'container', 'grid'].includes(data.type) && (
        <div className="mb-4 text-center relative">
          <div className="flex items-center justify-center space-x-2">
            <h4 className="text-lg font-semibold text-ink">{data.name}</h4>
            
            {/* Recently Updated Badge */}
            {isRecentlyUpdated() && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-warning/20 text-warning  border border-warning/30 whitespace-nowrap">
                ✨ NEW
              </span>
            )}
            
            {/* Three-Dot Menu Button */}
            <div className="relative" ref={menuDropdownRef}>
              <button
                onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                className="p-1 text-dim hover:text-dim hover:bg-surface-hover rounded transition-all duration-200"
                title="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {/* Dropdown Menu */}
              {showMenuDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-surface border border-line rounded-lg shadow-lg z-50">
                  <button
                    onClick={handleDuplicate}
                    className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface-hover flex items-center space-x-2 first:rounded-t-lg transition-colors"
                  >
                    <Copy className="w-4 h-4 text-dim" />
                    <span>Duplicate</span>
                  </button>
                  <button
                    onClick={handleDuplicateToAllSubtasks}
                    className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface-hover flex items-center space-x-2 transition-colors"
                  >
                    <Copy className="w-4 h-4 text-dim" />
                    <span>Duplicate to all subtasks</span>
                  </button>
                  <button
                    onClick={handleEdit}
                    className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface-hover flex items-center space-x-2 transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-dim" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowComments(true);
                      setShowMenuDropdown(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-ink hover:bg-surface-hover flex items-center space-x-2 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4 text-dim" />
                    <span>Comments</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full px-4 py-2 text-left text-sm text-danger hover:bg-danger/10 flex items-center space-x-2 last:rounded-b-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-danger" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>

            {/* Comment Thread Button — icon only, sits next to menu */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
              className={`relative p-1 rounded transition-all duration-200 ${
                showComments ? 'text-info bg-info/10' :
                'text-dim hover:text-info hover:bg-info/10'
              }`}
              title={`Comments${unresolvedCommentCount > 0 ? ` (${unresolvedCommentCount})` : ''}`}
            >
              <MessageCircle className="w-4 h-4" />
              {unresolvedCommentCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-info text-white rounded-full text-[8px] font-bold flex items-center justify-center border border-white">
                  {unresolvedCommentCount}
                </span>
              )}
            </button>
            
            {isTableElement() && (
              <>
                <button
                  onClick={handlePreviewClick}
                  className="p-1 text-dim hover:text-info hover:bg-info/10 rounded-full transition-all duration-200 group/preview"
                  title="Preview full table"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={handleExportGoogleSheets}
                  className="p-1 text-dim hover:text-success hover:bg-success/10 rounded-full transition-all duration-200"
                  title="Export to Google Sheets"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownloadExcel}
                  className="p-1 text-dim hover:text-info hover:bg-info/10 rounded-full transition-all duration-200"
                  title="Download Excel (.xlsx)"
                >
                  <Download className="w-4 h-4" />
                </button>
              </>
            )}
            {/* Mark as Important button */}
            <button
              onClick={async () => {
                const newImportantState = !isImportant;
                console.log('🌟 Mark as Important clicked:', { currentState: isImportant, newState: newImportantState, nodeId: id });
                setIsImportant(newImportantState);
                console.log('📝 State updated to:', newImportantState);
                await persistIsImportantLocal(newImportantState);
                console.log('✅ isImportant persisted successfully');
              }}
              className={`ml-2 px-2 py-1 rounded border text-xs font-medium transition-colors duration-150 ${isImportant ? 'bg-warning text-white border-warning' : 'bg-surface text-warning border-warning hover:bg-warning/10'}`}
              title={isImportant ? 'Unmark as Important' : 'Mark as Important'}
            >
              {isImportant ? '★ Important' : '☆ Mark Important'}
            </button>
            {/* Deadline Button */}
            <button
              onClick={() => setShowDeadlineInput((v) => !v)}
              className="ml-2 px-2 py-1 rounded border text-xs font-medium transition-colors duration-150 bg-surface text-info border-info hover:bg-info/10"
              title="Set Deadline"
            >
              {deadline ? 'Edit Deadline' : 'Set Deadline'}
            </button>
          </div>
          <p className="text-sm text-dim mt-2">{data.preview}</p>
          {/* Deadline Input UI */}
          {showDeadlineInput && (
            <div className="mt-2 flex flex-col items-center">
              <input
                type="datetime-local"
                className="border rounded px-2 py-1 text-xs"
                onChange={e => setDeadline(e.target.value)}
                value={deadline ? new Date(deadline).toISOString().slice(0,16) : ''}
                min={new Date().toISOString().slice(0,16)}
                disabled={saving}
              />
              <button
                className="mt-1 px-2 py-1 text-xs bg-info text-white rounded"
                onClick={async () => {
                  console.log('⏰ Setting deadline:', { currentDeadline: deadline, nodeId: id });
                  setShowDeadlineInput(false);
                  console.log('📝 Deadline input closed, persisting...');
                  await persistDeadlineLocal(deadline);
                  console.log('✅ Deadline persisted successfully');
                }}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Done'}
              </button>
            </div>
          )}
          {/* Timer Display */}
          {deadline && (() => {
            const overdue = calculateTimeLeft(deadline)?.isExpired;
            return (
              <div className={`mt-2 text-xs font-semibold ${overdue ? 'text-danger' : 'text-info'}`}>
                {overdue ? '⚠ Overdue — deadline reached' : `⏰ Time left: ${getTimeLeft()}`}
              </div>
            );
          })()}
        </div>
      )}
      
      {/* Interactive Element */}
      <div className="flex-1 min-h-0 overflow-auto">
        {renderInteractiveElement()}
      </div>
      
      {/* Approval Status & Buttons Section */}
      <div className="mt-4 pt-3 border-t border-line">
        {/* Current Approval Status */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getApprovalStatusColor()}`}>
              <span className="mr-1">{getApprovalStatusIcon()}</span>
              {data.approvalStatus === 'sent_to_pm' ? 'Sent to PM for Approval' :
               data.approvalStatus === 'pm_approved' ? 'PM Approved - Waiting for Client' :
               data.approvalStatus === 'client_approved' ? 'Fully Approved' :
               data.approvalStatus === 'locked' ? 'Locked' :
               data.approvalStatus === 'rejected' ? 'Rejected' : 'Draft'}
            </span>
          </div>
          
          {/* Added By Role Badge */}
          <span className={`text-xs px-2 py-0.5 rounded ${
            data.addedByRole === 'pm' ? 'bg-surface-hover text-ink' : 'bg-info/10 text-info'
          }`}>
            Added by {data.addedByRole === 'pm' ? 'PM' : 'Vendor'}
          </span>
        </div>
        
        {/* Sent for Approval Info */}
        {data.sentForApprovalAt && (
          <div className="mb-2 p-2 rounded-lg bg-info/10 border border-info/20">
            <div className="flex items-center space-x-2 mb-1">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs bg-info text-white">
                📤
              </span>
              <span className="text-xs font-medium text-ink">
                Sent for approval by {data.sentForApprovalBy}
              </span>
            </div>
            <p className="text-xs text-dim ml-7">
              📅 {formatDate(data.sentForApprovalAt)}
            </p>
          </div>
        )}
        
        {/* Deletion Request Status */}
        {data.deletionRequested && (
          <div className="mb-2 p-2 rounded-lg bg-danger/10 border border-danger/20">
            <div className="flex items-center space-x-2 mb-1">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs bg-danger text-white">
                🗑️
              </span>
              <span className="text-xs font-medium text-ink">
                Deletion requested by {data.deletionRequestedBy}
              </span>
            </div>
            <p className="text-xs text-dim ml-7">
              📅 {formatDate(data.deletionRequestedAt)}
            </p>
            {data.deletionReason && (
              <div className="mt-2 p-2 bg-surface rounded border border-line">
                <p className="text-xs text-dim uppercase tracking-wide mb-1">Deletion Reason</p>
                <p className="text-xs text-ink">{data.deletionReason}</p>
              </div>
            )}
            
            {/* PM Deletion Controls */}
            {canApproveDeletion() && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleApproveDeletion}
                  className="flex-1 px-2 py-1 text-xs bg-danger text-white rounded hover:bg-danger transition-colors"
                >
                  Approve Deletion
                </button>
                <button
                  onClick={handleRejectDeletion}
                  className="flex-1 px-2 py-1 text-xs bg-cta text-cta-foreground rounded hover:bg-cta transition-colors"
                >
                  Reject Deletion
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* PM Approval Details */}
        {data.pmApproval && (
          <div className="mb-2 p-2 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center space-x-2 mb-1">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs bg-success text-white">
                ✓
              </span>
              <span className="text-xs font-medium text-ink">
                {data.pmApproval.status === 'approved' ? '✅ PM Approved' : '❌ PM Rejected'} by {data.pmApproval.approvedBy}
              </span>
            </div>
            <p className="text-xs text-dim ml-7">
              📅 {formatDate(data.pmApproval.approvalTimestamp)}
            </p>
            {data.pmApproval.approvalReason && (
              <div className="mt-2 p-2 bg-surface rounded border border-line">
                <p className="text-xs text-dim uppercase tracking-wide mb-1">PM Reason</p>
                <p className="text-sm text-ink">{data.pmApproval.approvalReason}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Client Approval Details */}
        {data.clientApproval && (
          <div className="mb-2 p-2 rounded-lg bg-info/10 border border-info/20">
            <div className="flex items-center space-x-2 mb-1">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs bg-info text-white">
                ✓
              </span>
              <span className="text-xs font-medium text-ink">
                {data.clientApproval.status === 'approved' ? '✅ Client Approved' : '❌ Client Rejected'} by {data.clientApproval.approvedBy}
              </span>
            </div>
            <p className="text-xs text-dim ml-7">
              📅 {formatDate(data.clientApproval.approvalTimestamp)}
            </p>
            {data.clientApproval.approvalReason && (
              <div className="mt-2 p-2 bg-surface rounded border border-line">
                <p className="text-xs text-dim uppercase tracking-wide mb-1">Client Reason</p>
                <p className="text-sm text-ink">{data.clientApproval.approvalReason}</p>
              </div>
            )}
          </div>
        )}
        
        
        {/* Approval/Reject Buttons (only show if user can approve) */}
        {canApprove() && (
          <div className="flex space-x-2">
            <button
              onClick={() => handleApprovalClick('approve')}
              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-success hover:bg-success text-white text-sm font-medium rounded-lg transition-colors "
            >
              <Check className="w-4 h-4" />
              <span>Approve</span>
            </button>
            <button
              onClick={() => handleApprovalClick('reject')}
              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-danger hover:bg-danger text-white text-sm font-medium rounded-lg transition-colors "
            >
              <XIcon className="w-4 h-4" />
              <span>Reject</span>
            </button>
          </div>
        )}
        
        {/* Message when approval workflow is active */}
        {data.approvalStatus === 'sent_to_pm' && (
          <p className="text-xs text-center text-info italic">
            ⏳ Waiting for PM to review this element
          </p>
        )}
        {data.approvalStatus === 'pm_approved' && (
          <p className="text-xs text-center text-warning italic">
            ⏳ Waiting for Client to review this element
          </p>
        )}
        {data.approvalStatus === 'client_approved' && (
          <p className="text-xs text-center text-success italic">
            ✅ Element has been fully approved
          </p>
        )}
        {data.approvalStatus === 'locked' && (
          <p className="text-xs text-center text-dim italic">
            🔒 Element is locked and cannot be edited
          </p>
        )}
        {data.approvalStatus === 'rejected' && (
          <p className="text-xs text-center text-danger italic">
            ❌ Element has been rejected
          </p>
        )}
      </div>
      
      {/* Sequence Number Badge - Top left corner, always visible */}
      {data.sequenceNumber && (
        <div className="absolute -top-4 -left-4 z-20 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white hover:shadow-xl transition-shadow">
          {data.sequenceNumber}
        </div>
      )}
      
      {/* Element Type Label */}
      <div className="absolute -top-2 left-5 px-2 py-1 bg-info text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
        {data.type.toUpperCase()}
      </div>
      
      {/* Selection indicator */}
      {selected && (
        <div className="absolute -top-3 -right-3 w-6 h-6 bg-info text-white rounded-full flex items-center justify-center text-xs font-bold">
          E
        </div>
      )}

      {/* Comment count badge — bottom-left corner */}
      {unresolvedCommentCount > 0 && !showComments && (
        <button
          onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
          className="absolute -bottom-2 -left-2 z-20 flex items-center space-x-0.5 px-1.5 py-0.5 bg-info text-white rounded-full text-[10px] font-bold  border-2 border-white hover:bg-info transition-colors cursor-pointer"
          title={`${unresolvedCommentCount} comment${unresolvedCommentCount !== 1 ? 's' : ''}`}
        >
          <MessageCircle className="w-3 h-3" />
          <span>{unresolvedCommentCount}</span>
        </button>
      )}

      {/* Comment Thread Popover */}
      {showComments && (
        <div
          ref={commentPopoverRef}
          className="absolute top-0 -right-[320px] z-50"
          style={{ width: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <CommentThread
            nodeId={id}
            comments={nodeComments}
            collaborators={data.workspaceCollaborators || []}
            onAddComment={handleAddComment}
            onResolve={handleResolveComment}
            onDeleteComment={handleDeleteComment}
            isLocked={isElementLocked()}
            onClose={() => setShowComments(false)}
          />
        </div>
      )}

      {/* Table Preview Modal */}
      {showPreview && isTableElement() && (
        <TablePreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          tableData={getPreviewTableData()}
          tableName={data.name}
          tableType={data.id}
        />
      )}

      {showDocumentPreview && data.documentUrl && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
          <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-ink">{data.name}</h3>
                <p className="text-xs text-dim">{data.documentMeta?.id || 'Document preview'}</p>
              </div>
              <button
                onClick={() => setShowDocumentPreview(false)}
                className="rounded-md p-2 text-dim hover:bg-surface-hover hover:text-ink transition-colors"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-surface-hover">
              <iframe
                src={`${data.documentUrl}#toolbar=0&navpanes=0`}
                title={data.documentMeta?.id || 'Document preview'}
                className="h-full w-full"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Approval/Rejection Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div 
            className="bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`px-6 py-4 ${approvalAction === 'approve' ? 'bg-black' : 'bg-black'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    {approvalAction === 'approve' ? (
                      <Check className="w-6 h-6 text-white" />
                    ) : (
                      <XIcon className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {approvalAction === 'approve' ? 'Approve Element' : 'Reject Element'}
                    </h3>
                    <p className="text-sm text-white/80">{data.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-ink mb-2">
                  {approvalAction === 'approve' ? 'Approval Reason' : 'Rejection Reason'} 
                  <span className="text-danger">*</span>
                </label>
                <textarea
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  placeholder={approvalAction === 'approve' 
                    ? 'Enter reason for approving this element...' 
                    : 'Enter reason for rejecting this element...'}
                  className="w-full px-4 py-3 border border-line rounded-xl focus:ring-2 focus:ring-info focus:border-info resize-none transition-all"
                  rows={4}
                />
              </div>
              
              {/* Element Info */}
              <div className="bg-canvas rounded-lg p-3 mb-4">
                <p className="text-xs text-dim uppercase tracking-wide mb-1">Element Details</p>
                <p className="text-sm text-ink">
                  <span className="font-medium">Type:</span> {data.type}
                </p>
                <p className="text-sm text-ink">
                  <span className="font-medium">Added by:</span> {data.addedBy} ({data.addedByRole === 'pm' ? 'PM' : 'Vendor'})
                </p>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-canvas border-t border-line flex space-x-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                disabled={isSubmittingApproval}
                className="flex-1 px-4 py-2.5 border border-line text-ink rounded-xl hover:bg-surface-hover transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleApprovalSubmit}
                disabled={!approvalReason.trim() || isSubmittingApproval}
                className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-all flex items-center justify-center space-x-2 ${
                  approvalAction === 'approve' 
                    ? 'bg-success hover:bg-success disabled:bg-success/30' 
                    : 'bg-danger hover:bg-danger disabled:bg-danger/30'
                } disabled:cursor-not-allowed`}
              >
                {isSubmittingApproval ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    {approvalAction === 'approve' ? <Check className="w-4 h-4" /> : <XIcon className="w-4 h-4" />}
                    <span>{approvalAction === 'approve' ? 'Approve' : 'Reject'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Deletion Request Modal */}
      {showDeletionModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div 
            className="bg-surface rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-black">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Request Deletion
                    </h3>
                    <p className="text-sm text-white/80">{data.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeletionModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-6">
              <div className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-sm text-warning">
                  ⚠️ This element will be marked for deletion. A PM will need to approve this request before it's permanently deleted.
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-ink mb-2">
                  Reason for Deletion
                  <span className="text-danger">*</span>
                </label>
                <textarea
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Enter reason for requesting deletion..."
                  className="w-full px-4 py-3 border border-line rounded-xl focus:ring-2 focus:ring-warning focus:border-warning resize-none transition-all"
                  rows={4}
                />
              </div>
              
              {/* Element Info */}
              <div className="bg-canvas rounded-lg p-3 mb-4">
                <p className="text-xs text-dim uppercase tracking-wide mb-1">Element Details</p>
                <p className="text-sm text-ink">
                  <span className="font-medium">Type:</span> {data.type}
                </p>
                <p className="text-sm text-ink">
                  <span className="font-medium">Added by:</span> {data.addedBy} ({data.addedByRole === 'pm' ? 'PM' : 'Vendor'})
                </p>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-canvas border-t border-line flex space-x-3">
              <button
                onClick={() => setShowDeletionModal(false)}
                disabled={isSubmittingDeletion}
                className="flex-1 px-4 py-2.5 border border-line text-ink rounded-xl hover:bg-surface-hover transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitDeletionRequest}
                disabled={!deletionReason.trim() || isSubmittingDeletion}
                className="flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-all flex items-center justify-center space-x-2 bg-warning hover:bg-warning disabled:bg-warning/30 disabled:cursor-not-allowed"
              >
                {isSubmittingDeletion ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Request Deletion</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElementNode;
