import React, { useState, useContext, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getWorkspaceById, updateWorkspace } from '../../utils/workspaceApi';
import { persistIsImportant, persistDeadline, persistTextContent, persistNodeDataPatch, getTimeLeft as calculateTimeLeft, formatTimeLeft } from '../../utils/nodePersistence';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Download, Eye, ExternalLink, X, ArrowRight, Check, X as XIcon, Menu, Star, Heart, Info, HelpCircle, Lock, Send } from 'lucide-react';
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
import ImageBlockRenderer from '../forms/ImageBlockRenderer';
import DocumentBlockRenderer from '../forms/DocumentBlockRenderer';


import TablePreviewModal from '../modals/TablePreviewModal';
import { createTableHelpers, defaultTableData } from '../../utils/tableUtils';

const ElementNode = ({ id, data, isConnectable, selected }) => {
  const workspaceId = data.workspaceId;  // Get workspaceId from node data
  const { setNodes } = useReactFlow();
  const [saving, setSaving] = useState(false);
  // Important state for highlighting
  const [isImportant, setIsImportant] = useState(false);

  // Deadline state (persisted in backend)
  const [deadline, setDeadline] = useState(data.deadline || null); // ISO string or null
  const [showDeadlineInput, setShowDeadlineInput] = useState(false);
  
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
  const [checkboxValue, setCheckboxValue] = useState(false);
  const [radioValue, setRadioValue] = useState('');
  
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
  
  // Auto-save textbox content with debounce
  useEffect(() => {
    if (!workspaceId || data.type !== 'textbox') return;
    
    // Clear previous timeout
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current);
    }
    
    // Set new timeout to save after 2 seconds of inactivity
    inputTimeoutRef.current = setTimeout(async () => {
      if (inputValue && inputValue.length > 0) {
        try {
          console.log('💾 Auto-saving textbox content');
          await persistTextContent(id, inputValue, 'inputValue', setNodes, workspaceId);
        } catch (error) {
          console.error('❌ Error auto-saving textbox:', error);
        }
      }
    }, 2000);
    
    return () => {
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
      }
    };
  }, [inputValue, workspaceId, data.type, id, setNodes]);
  
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
  }, [selectOptions, selectValue, workspaceId, data.type, id, setNodes]);
  
  // Wrapper to set select value and trigger save
  const setSelectValue = (value) => {
    setSelectValueState(value);
  };
  
  const [radioOptions, setRadioOptions] = useState(['Option 1', 'Option 2']);
  const [checkboxOptions, setCheckboxOptions] = useState(['Option 1', 'Option 2', 'Option 3']);
  const [checkedItems, setCheckedItems] = useState({});
  const [buttonText, setButtonText] = useState('Click Me');
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
  
  // Send for approval state
  const [isSendingForApproval, setIsSendingForApproval] = useState(false);
  
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
  
  // Check if vendor can send element for approval
  const canSendForApproval = () => {
    const currentUserRole = getCurrentUserRole();
    const approvalStatus = data.approvalStatus || 'draft';
    
    // Only vendors can send for approval, and only if element is in draft/initial state
    // Accept both 'draft' and 'pending' as initial states (before being sent to PM)
    const canSend = currentUserRole === 'vendor' && (approvalStatus === 'draft' || approvalStatus === 'pending' || approvalStatus === undefined || approvalStatus === null);
    
    if (!canSend && currentUserRole === 'vendor') {
      console.log('🔍 canSendForApproval DEBUG:', {
        currentUserRole,
        approvalStatus,
        dataApprovalStatus: data.approvalStatus,
        canSend
      });
    }
    
    return canSend;
  };
  
  // Check if element is locked (cannot be edited)
  const isElementLocked = () => {
    const approvalStatus = data.approvalStatus || 'draft';
    // Element is locked if it's in approval process or fully approved
    return ['sent_to_pm', 'pm_approved', 'client_approved', 'locked'].includes(approvalStatus);
  };
  
  // Handle sending element for approval
  const handleSendForApproval = async () => {
    console.log('🚀 handleSendForApproval CALLED! Node ID:', id);
    console.log('🔍 Current approval status:', data.approvalStatus);
    console.log('🔍 Workspace ID:', workspaceId);
    
    setIsSendingForApproval(true);
    
    // Mark that we're in approval submission to prevent WorkspacePage from saving stale canvas data
    window.__isApprovingInProgress = true;
    
    try {
      const patch = {
        approvalStatus: 'sent_to_pm',
        sentForApprovalAt: new Date().toISOString(),
        sentForApprovalBy: currentUser?.name || currentUser?.email || 'Unknown User'
      };

      console.log('📤 Persisting send-for-approval patch (subtask-aware)...', { nodeId: id, workspaceId, patch });
      await persistNodeDataPatch(id, patch, setNodes, workspaceId, { bypassApprovalFlow: true });

      // Fetch fresh workspace data to ensure UI is in sync
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
                console.log('📝 Found updated node from server:', {
                  id: node.id,
                  approvalStatus: node.data?.approvalStatus
                });
              }
            });
          });
        });

        if (!updatedNodeFromServer) {
          console.error('❌ Could not find updated node in fresh data after send-for-approval');
        }
      }

      // Force re-render to ensure UI updates
      setForceUpdate(prev => prev + 1);

      console.log('✅ Element sent for approval successfully');
    } catch (error) {
      console.error('❌ Error sending element for approval:', error);
      console.error('Error details:', error.message, error.stack);
    } finally {
      setIsSendingForApproval(false);
      // Wait before clearing the approval flag to ensure canvas saves are blocked
      setTimeout(() => {
        window.__isApprovingInProgress = false;
        console.log('✅ Send for approval workflow completed, canvas saves re-enabled');
      }, 2000);
    }
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
        if (updatedNodeFromServer) {
          setNodes((nds) => nds.map((node) => {
            if (node.id === id) {
              console.log('📝 Local state updated with server node data:', updatedNodeFromServer.data);
              return updatedNodeFromServer;
            }
            return node;
          }));
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
        return 'bg-blue-100 text-blue-800 border-blue-300'; // Sent to PM - blue
      case 'pm_approved':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'; // PM approved, waiting for client - yellow
      case 'client_approved':
        return 'bg-green-100 text-green-800 border-green-300'; // Fully approved - green
      case 'locked':
        return 'bg-gray-100 text-gray-800 border-gray-300'; // Locked - gray
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300'; // Rejected - red
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'; // Draft - gray
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
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
          Document URL unavailable. Please re-upload the file from the source list.
        </div>
      );
    }

    // Show PDF preview for documents
    const isPdf = data.documentUrl?.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      return (
        <div className="w-full h-full flex flex-col bg-white overflow-hidden">
          {/* Document Header */}
          <div className="flex items-start justify-between gap-4 p-2 border-b border-slate-200 bg-slate-50 flex-shrink-0">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{data.name}</p>
              <p className="text-[10px] text-slate-500">{meta.id || 'Document'}</p>
            </div>
            <div className="flex items-center space-x-0.5 flex-shrink-0">
              <button
                onClick={handleDocumentPreviewClick}
                className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Preview"
              >
                <Eye className="w-3 h-3" />
              </button>
              <button
                onClick={handleDocumentDownload}
                className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                title="Download"
              >
                <Download className="w-3 h-3" />
              </button>
              <button
                onClick={handleDocumentOpen}
                className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 bg-gray-100 overflow-hidden min-h-0">
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
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">{data.name}</p>
              <p className="mt-1 text-xs text-slate-500">{meta.id || 'Document'}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDocumentPreviewClick}
                className="p-2 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Preview"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={handleDocumentDownload}
                className="p-2 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                title="Download"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handleDocumentOpen}
                className="p-2 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
            <div>
              <p className="font-medium text-slate-500">Customer</p>
              <p className="mt-0.5 text-slate-800">{meta.customer || '—'}</p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Date</p>
              <p className="mt-0.5 text-slate-800">{meta.date ? new Date(meta.date).toLocaleDateString() : '—'}</p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Amount</p>
              <p className="mt-0.5 text-slate-800">{meta.amount || '—'}</p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Status</p>
              <p className="mt-0.5">
                {meta.status ? (
                  <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 border border-slate-200">
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

  const addSelectOption = () => {
    const newOption = prompt('Enter new option:');
    if (newOption && newOption.trim()) {
      setSelectOptions([...selectOptions, newOption.trim()]);
    }
  };

  const addRadioOption = () => {
    const newOption = prompt('Enter new option:');
    if (newOption && newOption.trim()) {
      setRadioOptions([...radioOptions, newOption.trim()]);
    }
  };

  const addCheckboxOption = () => {
    const newOption = prompt('Enter new option:');
    if (newOption && newOption.trim()) {
      setCheckboxOptions([...checkboxOptions, newOption.trim()]);
    }
  };

  const removeOption = (options, setOptions, index) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

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
            className={`w-full h-32 p-4 border-2 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base ${
              isLocked ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-300'
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
          <input
            type="text"
            value={inputValue}
            onChange={(e) => !isLocked && setInputValue(e.target.value)}
            className={`w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base ${
              isLocked ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-300'
            }`}
            placeholder={isLocked ? "Element is locked" : "Type your text here..."}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            readOnly={isLocked}
          />
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
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className={`w-full px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  isLocked 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                disabled={isLocked}
              >
                {buttonText}
              </button>
            )}
            <div className="text-xs text-gray-500 text-center">
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
          <div className="space-y-2">
            <select
              value={selectValue}
              onChange={(e) => !isLocked && setSelectValue(e.target.value)}
              className={`w-full p-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base bg-white ${
                isLocked ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-300'
              }`}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              disabled={isLocked}
            >
              <option value="">{isLocked ? "Element is locked" : "Select an option"}</option>
              {selectOptions.map((option, index) => (
                <option key={index} value={option.toLowerCase().replace(/\s+/g, '-')}>
                  {option}
                </option>
              ))}
            </select>
            <div className="flex space-x-3 mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isLocked) {
                    addSelectOption();
                  }
                }}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 ${
                  isLocked 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700'
                }`}
                disabled={isLocked}
              >
                <span className="text-lg">+</span>
                <span>Add Option</span>
              </button>
              {selectOptions.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isLocked) {
                      removeOption(selectOptions, setSelectOptions, selectOptions.length - 1);
                    }
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 ${
                    isLocked 
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700'
                  }`}
                  disabled={isLocked}
                >
                  <span className="text-lg">×</span>
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-2">
            <div className="space-y-2">
              {checkboxOptions.map((option, index) => (
                <label key={index} className={`flex items-center space-x-2 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    checked={checkedItems[option] || false}
                    onChange={(e) => !isLocked && setCheckedItems({
                      ...checkedItems,
                      [option]: e.target.checked
                    })}
                    className={`w-5 h-5 border-2 rounded focus:ring-blue-500 ${
                      isLocked ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-blue-600 border-gray-300'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    disabled={isLocked}
                  />
                  <span className={`text-base ${isLocked ? 'text-gray-500' : 'text-gray-700'}`}>{option}</span>
                </label>
              ))}
            </div>
            <div className="flex space-x-3 mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isLocked) {
                    addCheckboxOption();
                  }
                }}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 ${
                  isLocked 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700'
                }`}
                disabled={isLocked}
              >
                <span className="text-lg">+</span>
                <span>Add Option</span>
              </button>
              {checkboxOptions.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isLocked) {
                      removeOption(checkboxOptions, setCheckboxOptions, checkboxOptions.length - 1);
                    }
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 ${
                    isLocked 
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700'
                  }`}
                  disabled={isLocked}
                >
                  <span className="text-lg">×</span>
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>
        );
      
      case 'radio':
        return (
          <div className="space-y-2">
            <div className="space-y-2">
              {radioOptions.map((option, index) => (
                <label key={index} className={`flex items-center space-x-2 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="radio"
                    name={`radio-${data.id || Math.random()}`}
                    value={option}
                    checked={radioValue === option}
                    onChange={(e) => !isLocked && setRadioValue(e.target.value)}
                    className={`w-5 h-5 border-2 focus:ring-blue-500 ${
                      isLocked ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-blue-600 border-gray-300'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    disabled={isLocked}
                  />
                  <span className={`text-base ${isLocked ? 'text-gray-500' : 'text-gray-700'}`}>{option}</span>
                </label>
              ))}
            </div>
            <div className="flex space-x-3 mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isLocked) {
                    addRadioOption();
                  }
                }}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 ${
                  isLocked 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700'
                }`}
                disabled={isLocked}
              >
                <span className="text-lg">+</span>
                <span>Add Option</span>
              </button>
              {radioOptions.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isLocked) {
                      removeOption(radioOptions, setRadioOptions, radioOptions.length - 1);
                    }
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 ${
                    isLocked 
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700'
                  }`}
                  disabled={isLocked}
                >
                  <span className="text-lg">×</span>
                  <span>Remove</span>
                </button>
              )}
            </div>
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

      case 'task-card':
      case 'task-card-progress':
        return <TaskCardRenderer data={data} />;
      
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
          <div className="text-center py-4 bg-gray-100 rounded border">
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
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
        <IconComponent className="w-16 h-16 text-gray-700" />
      </div>
    );
  };

  // Render divider element
  const renderDividerElement = () => {
    return (
      <div className="w-full">
        <hr className="border-t-2 border-gray-400 w-full" />
      </div>
    );
  };

  // Render spacer element
  const renderSpacerElement = () => {
    return (
      <div className="w-full h-16 bg-gray-50 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
        <span className="text-xs text-gray-400">Spacer</span>
      </div>
    );
  };

  // Render container element
  const renderContainerElement = () => {
    return (
      <div className="w-full min-h-[120px] border-2 border-gray-300 rounded-lg bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-gray-400 rounded-lg mx-auto mb-2 flex items-center justify-center">
            <span className="text-gray-400 text-xs">📦</span>
          </div>
          <span className="text-xs text-gray-500">Container</span>
        </div>
      </div>
    );
  };

  // Render grid element
  const renderGridElement = () => {
    return (
      <div className="w-full min-h-[120px] border-2 border-gray-300 rounded-lg bg-gray-50 p-3">
        <div className="grid grid-cols-3 gap-2 h-full">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="border border-gray-300 rounded bg-white flex items-center justify-center min-h-[40px]"
            >
              <span className="text-xs text-gray-400">{item}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Determine border style based on selection state and importance
  const getBorderStyle = () => {
    if (isImportant) {
      return 'border-yellow-500 ring-4 ring-yellow-200 shadow-yellow-200';
    }
    if (data.isManuallySelected) {
      return 'border-green-600 ring-4 ring-green-200 shadow-green-200';
    }
    if (data.isInSelectionMode) {
      return 'border-blue-300 hover:border-blue-500 cursor-pointer';
    }
    if (selected) {
      return 'border-blue-600 ring-2 ring-blue-200';
    }
    return 'border-blue-500';
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
          style={{ left: '48%' }}
          className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
          isConnectable={isConnectable}
        />
        <Handle
          type="target"
          position={Position.Top}
          id="top-in"
          style={{ left: '52%' }}
          className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
          isConnectable={isConnectable}
        />
        
        <Handle
          type="source"
          position={Position.Right}
          id="right-out"
          style={{ top: '48%' }}
          className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
          isConnectable={isConnectable}
        />
        <Handle
          type="target"
          position={Position.Right}
          id="right-in"
          style={{ top: '52%' }}
          className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
          isConnectable={isConnectable}
        />
        
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom-out"
          style={{ left: '48%' }}
          className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
          isConnectable={isConnectable}
        />
        <Handle
          type="target"
          position={Position.Bottom}
          id="bottom-in"
          style={{ left: '52%' }}
          className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
          isConnectable={isConnectable}
        />
        
        <Handle
          type="source"
          position={Position.Left}
          id="left-out"
          style={{ top: '48%' }}
          className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
          isConnectable={isConnectable}
        />
        <Handle
          type="target"
          position={Position.Left}
          id="left-in"
          style={{ top: '52%' }}
          className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
          isConnectable={isConnectable}
        />
        
        {/* Icon Element */}
        <div className="flex items-center justify-center">
          <IconComponent className="w-12 h-12 text-gray-700" />
        </div>
        
        {/* Selection indicator */}
        {selected && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
            E
          </div>
        )}
      </div>
    );
  }

  // Determine wrapper classes based on element type
  const getWrapperClasses = () => {
    const baseClasses = `${isImportant ? 'bg-yellow-50' : 'bg-white'} border-2 rounded-xl shadow-xl relative group transition-all`;
    const recentlyUpdatedClass = isRecentlyUpdated() ? 'ring-2 ring-amber-300 ring-offset-1' : '';
    const compactTypes = ['divider', 'spacer', 'container', 'grid'];
    
    if (compactTypes.includes(data.type)) {
      if (data.type === 'divider') {
        return `${baseClasses} ${recentlyUpdatedClass} p-2 min-w-[200px] max-w-[400px]`;
      } else if (data.type === 'spacer') {
        return `${baseClasses} ${recentlyUpdatedClass} p-2 min-w-[150px] max-w-[300px]`;
      } else if (data.type === 'container') {
        return `${baseClasses} ${recentlyUpdatedClass} p-4 min-w-[200px] max-w-[400px]`;
      } else if (data.type === 'grid') {
        return `${baseClasses} ${recentlyUpdatedClass} p-3 min-w-[250px] max-w-[400px]`;
      }
    }
    
    return `${baseClasses} ${recentlyUpdatedClass} p-6 ${
      data.type === 'form-template' 
        ? 'min-w-[450px] max-w-[550px]' 
        : 'min-w-[320px] max-w-[400px]'
    }`;
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
    <div className={`${getWrapperClasses()} ${getBorderStyle()}`}>
      {/* Connection Handles - All uniform gray, bidirectional */}
      <Handle
        type="source"
        position={Position.Top}
        id="top-out"
        style={{ left: '48%' }}
        className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-in"
        style={{ left: '52%' }}
        className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
        isConnectable={isConnectable}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="right-out"
        style={{ top: '48%' }}
        className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-in"
        style={{ top: '52%' }}
        className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
        isConnectable={isConnectable}
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-out"
        style={{ left: '48%' }}
        className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-in"
        style={{ left: '52%' }}
        className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
        isConnectable={isConnectable}
      />
      
      <Handle
        type="source"
        position={Position.Left}
        id="left-out"
        style={{ top: '48%' }}
        className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
        isConnectable={isConnectable}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-in"
        style={{ top: '52%' }}
        className="w-3 h-3 !bg-gray-500 !border-2 !border-white opacity-0 group-hover:opacity-100 transition-opacity hover:!bg-gray-700"
        isConnectable={isConnectable}
      />
      
      {/* Info & Help Icons - Top right corner */}
      <div className="absolute -top-3 -right-3 z-20 flex items-center space-x-1">
        {/* Recently Updated Badge - Shows when element was added/updated within 5 minutes */}
        {isRecentlyUpdated() && (
          <div className="w-8 h-8 bg-amber-400 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white font-bold text-lg animate-pulse" title="Recently updated" role="status" aria-label="Recently updated">
            ✨
          </div>
        )}
        
        {/* Lock Indicator - Shows when element is locked */}
        {data.locked && (
          <div className="w-5 h-5 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center shadow-md border-2 border-white transition-all" title="Element is locked">
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
            className="w-5 h-5 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-md transition-all duration-200 hover:scale-110 border-2 border-white"
            title="Element Info"
          >
            <Info className="w-3 h-3" />
          </button>
          
          {/* Info Tooltip */}
          {showInfoTooltip && (
            <div className="absolute right-7 -top-1 z-50 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-3 text-left animate-fade-in">
              {/* Arrow pointer */}
              <div className="absolute -right-2 top-3 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-white"></div>
              <div className="absolute -right-[9px] top-3 w-0 h-0 border-t-8 border-t-transparent border-b-8 border-b-transparent border-l-8 border-l-gray-200"></div>
              
              {/* Header */}
              <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-gray-100">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Info className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-800">Element Details</h4>
                </div>
              </div>
              
              {/* Element Type */}
              <div className="mb-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Element Type</p>
                <p className="text-sm font-medium text-gray-800 flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                  {data.name || data.type || 'Unknown Element'}
                </p>
              </div>
              
              {/* What it does - Description */}
              <div className="mb-3 p-2 bg-gray-50 rounded-md border border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">💡 What it does</p>
                <p className="text-xs text-gray-700 leading-relaxed">
                  {getElementDescription(data.type)}
                </p>
              </div>
              
              {/* Added By */}
              <div className="mb-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Added By</p>
                <p className="text-sm font-medium text-gray-800 flex items-center">
                  <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2 text-xs font-bold text-green-600">
                    {(data.addedBy || 'U').charAt(0).toUpperCase()}
                  </span>
                  {data.addedBy || 'Unknown User'}
                </p>
                {data.addedByEmail && (
                  <p className="text-xs text-gray-400 ml-8">{data.addedByEmail}</p>
                )}
              </div>
              
              {/* Added At */}
              <div className="mb-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Added On</p>
                <p className="text-sm font-medium text-gray-800">
                  📅 {formatDate(data.addedAt)}
                </p>
              </div>
              
              {/* Element ID */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400">
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
            <h4 className="text-lg font-semibold text-gray-800">{data.name}</h4>
            
            {/* Recently Updated Badge */}
            {isRecentlyUpdated() && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-amber-200 text-amber-800 shadow-md border border-amber-300 whitespace-nowrap">
                ✨ NEW
              </span>
            )}
            
            {isTableElement() && (
              <button
                onClick={handlePreviewClick}
                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-200 group/preview"
                title="Preview full table"
              >
                <Eye className="w-4 h-4" />
              </button>
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
              className={`ml-2 px-2 py-1 rounded border text-xs font-medium transition-colors duration-150 ${isImportant ? 'bg-yellow-400 text-white border-yellow-500' : 'bg-white text-yellow-600 border-yellow-400 hover:bg-yellow-50'}`}
              title={isImportant ? 'Unmark as Important' : 'Mark as Important'}
            >
              {isImportant ? '★ Important' : '☆ Mark Important'}
            </button>
            {/* Deadline Button */}
            <button
              onClick={() => setShowDeadlineInput((v) => !v)}
              className="ml-2 px-2 py-1 rounded border text-xs font-medium transition-colors duration-150 bg-white text-blue-600 border-blue-400 hover:bg-blue-50"
              title="Set Deadline"
            >
              {deadline ? 'Edit Deadline' : 'Set Deadline'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">{data.preview}</p>
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
                className="mt-1 px-2 py-1 text-xs bg-blue-500 text-white rounded"
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
          {deadline && (
            <div className="mt-2 text-xs text-blue-700 font-semibold">⏰ Time left: {getTimeLeft()}</div>
          )}
        </div>
      )}
      
      {/* Interactive Element */}
      <div className={['divider', 'spacer', 'container', 'grid'].includes(data.type) ? '' : 'mb-2'}>
        {renderInteractiveElement()}
      </div>
      
      {/* Approval Status & Buttons Section */}
      <div className="mt-4 pt-3 border-t border-gray-200">
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
            data.addedByRole === 'pm' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
          }`}>
            Added by {data.addedByRole === 'pm' ? 'PM' : 'Vendor'}
          </span>
        </div>
        
        {/* Sent for Approval Info */}
        {data.sentForApprovalAt && (
          <div className="mb-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center space-x-2 mb-1">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs bg-blue-500 text-white">
                📤
              </span>
              <span className="text-xs font-medium text-gray-700">
                Sent for approval by {data.sentForApprovalBy}
              </span>
            </div>
            <p className="text-xs text-gray-500 ml-7">
              📅 {formatDate(data.sentForApprovalAt)}
            </p>
          </div>
        )}
        
        {/* PM Approval Details */}
        {data.pmApproval && (
          <div className="mb-2 p-2 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center space-x-2 mb-1">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs bg-green-500 text-white">
                ✓
              </span>
              <span className="text-xs font-medium text-gray-700">
                {data.pmApproval.status === 'approved' ? '✅ PM Approved' : '❌ PM Rejected'} by {data.pmApproval.approvedBy}
              </span>
            </div>
            <p className="text-xs text-gray-500 ml-7">
              📅 {formatDate(data.pmApproval.approvalTimestamp)}
            </p>
            {data.pmApproval.approvalReason && (
              <div className="mt-2 p-2 bg-white rounded border border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">PM Reason</p>
                <p className="text-sm text-gray-700">{data.pmApproval.approvalReason}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Client Approval Details */}
        {data.clientApproval && (
          <div className="mb-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
            <div className="flex items-center space-x-2 mb-1">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs bg-blue-500 text-white">
                ✓
              </span>
              <span className="text-xs font-medium text-gray-700">
                {data.clientApproval.status === 'approved' ? '✅ Client Approved' : '❌ Client Rejected'} by {data.clientApproval.approvedBy}
              </span>
            </div>
            <p className="text-xs text-gray-500 ml-7">
              📅 {formatDate(data.clientApproval.approvalTimestamp)}
            </p>
            {data.clientApproval.approvalReason && (
              <div className="mt-2 p-2 bg-white rounded border border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Client Reason</p>
                <p className="text-sm text-gray-700">{data.clientApproval.approvalReason}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Send for Approval Button (only for vendors on draft elements) */}
        {(() => {
          const canSend = canSendForApproval();
          console.log('📤 Button visibility check:', {
            nodeId: id,
            canSend,
            currentUserRole: getCurrentUserRole(),
            approvalStatus: data.approvalStatus
          });
          return canSend && (
            <div className="mb-3">
              <button
                onClick={handleSendForApproval}
                disabled={isSendingForApproval}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingForApproval ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send for Approval</span>
                  </>
                )}
              </button>
            </div>
          );
        })()}
        
        {/* Approval/Reject Buttons (only show if user can approve) */}
        {canApprove() && (
          <div className="flex space-x-2">
            <button
              onClick={() => handleApprovalClick('approve')}
              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Approve</span>
            </button>
            <button
              onClick={() => handleApprovalClick('reject')}
              className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <XIcon className="w-4 h-4" />
              <span>Reject</span>
            </button>
          </div>
        )}
        
        {/* Message when approval workflow is active */}
        {data.approvalStatus === 'sent_to_pm' && (
          <p className="text-xs text-center text-blue-600 italic">
            ⏳ Waiting for PM to review this element
          </p>
        )}
        {data.approvalStatus === 'pm_approved' && (
          <p className="text-xs text-center text-yellow-600 italic">
            ⏳ Waiting for Client to review this element
          </p>
        )}
        {data.approvalStatus === 'client_approved' && (
          <p className="text-xs text-center text-green-600 italic">
            ✅ Element has been fully approved
          </p>
        )}
        {data.approvalStatus === 'locked' && (
          <p className="text-xs text-center text-gray-600 italic">
            🔒 Element is locked and cannot be edited
          </p>
        )}
        {data.approvalStatus === 'rejected' && (
          <p className="text-xs text-center text-red-600 italic">
            ❌ Element has been rejected
          </p>
        )}
      </div>
      
      {/* Sequence Number Badge - Top left corner, always visible */}
      {data.sequenceNumber && (
        <div className="absolute -top-4 -left-4 z-20 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white hover:shadow-xl transition-shadow">
          {data.sequenceNumber}
        </div>
      )}
      
      {/* Element Type Label */}
      <div className="absolute -top-2 left-5 px-2 py-1 bg-blue-500 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
        {data.type.toUpperCase()}
      </div>
      
      {/* Selection indicator */}
      {selected && (
        <div className="absolute -top-3 -right-3 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
          E
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
          <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{data.name}</h3>
                <p className="text-xs text-slate-500">{data.documentMeta?.id || 'Document preview'}</p>
              </div>
              <button
                onClick={() => setShowDocumentPreview(false)}
                className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-slate-100">
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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`px-6 py-4 ${approvalAction === 'approve' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-rose-500'}`}>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {approvalAction === 'approve' ? 'Approval Reason' : 'Rejection Reason'} 
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                  placeholder={approvalAction === 'approve' 
                    ? 'Enter reason for approving this element...' 
                    : 'Enter reason for rejecting this element...'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-all"
                  rows={4}
                />
              </div>
              
              {/* Element Info */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Element Details</p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Type:</span> {data.type}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Added by:</span> {data.addedBy} ({data.addedByRole === 'pm' ? 'PM' : 'Vendor'})
                </p>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex space-x-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                disabled={isSubmittingApproval}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleApprovalSubmit}
                disabled={!approvalReason.trim() || isSubmittingApproval}
                className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-all flex items-center justify-center space-x-2 ${
                  approvalAction === 'approve' 
                    ? 'bg-green-500 hover:bg-green-600 disabled:bg-green-300' 
                    : 'bg-red-500 hover:bg-red-600 disabled:bg-red-300'
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
    </div>
  );
};

export default ElementNode;
