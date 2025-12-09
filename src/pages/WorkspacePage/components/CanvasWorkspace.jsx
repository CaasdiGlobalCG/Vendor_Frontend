import React, { useState, useCallback, useEffect, useContext, useRef, useImperativeHandle, forwardRef } from 'react';
import { Plus, Save, Eye, X, Users, Grid, Maximize2, Minimize2} from 'lucide-react';
import { VendorContext } from '../../../context/VendorContext';
import ReactFlow, { 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Background,
  Controls,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';

// Import modular components
import ElementNode from './nodes/ElementNode';
import LayoutNode from './nodes/LayoutNode';
import TextNode from './nodes/TextNode';
import TurnkeyNode from './nodes/TurnkeyNode';
import CustomEdge from './edges/CustomEdge';
import TableConfigModal from './modals/TableConfigModal';
import ChartConfigModal from './modals/ChartConfigModal';
import TurnkeyConfigModal from './modals/TurnkeyConfigModal';
import ListConfigModal from './modals/ListConfigModal';
import LayoutConfigModal from './modals/LayoutConfigModal';
import GroupingModal from './modals/GroupingModal';
import GroupingToolbar from './GroupingToolbar';
import ContextMenu from './ContextMenu';
import TaskCardConfigModal from './modals/TaskCardConfigModal';
import { getFlowchartTemplate } from '../utils/flowchartTemplates';
import config from '../../../config/env';

// Custom CSS to ensure controls work properly
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
`;

// Import custom nodes
import SmartNoteNode from './nodes/SmartNoteNode';
import CalendarNode from './nodes/CalendarNode';
import ApprovalBoardNode from './nodes/ApprovalBoardNode';

// Node types
const nodeTypes = {
  elementNode: ElementNode,
  layoutNode: LayoutNode,
  textNode: TextNode,
  turnkeyNode: TurnkeyNode,
  smartNote: SmartNoteNode,
  calendarNode: CalendarNode,
  approvalBoard: ApprovalBoardNode,
};

// Edge types
const edgeTypes = {
  custom: CustomEdge,
};


  const MIN_ZOOM_PERCENT = 10;
  const MAX_ZOOM_PERCENT = 200;
  const CanvasWorkspace = forwardRef(({ 
  selectedSubtask, 
  sidebarCollapsed, 
  onToggleSidebars,
  workspace,
  onSaveWorkspace,
  onActivityCreated,
  userRole,
  userPermissions,
  onZoomChange
}, ref) => {
  const { currentUser } = useContext(VendorContext);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [headerOffset, setHeaderOffset] = useState(0);
  const previousOverflowRef = useRef('');

  const updateOffset = useCallback(() => {
    const headerElements = Array.from(
      document.querySelectorAll('[data-role-header], [data-workspace-header]')
    );

    const visibleBottom = headerElements.reduce((maxBottom, el) => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none') return maxBottom;
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

  
  // Check if user can edit canvas
  const canEdit = userRole === 'pm' || userPermissions?.canEdit || false;
  
  // Canvas permissions check complete

  // Activity tracking function
  const trackActivity = async (action, actionType, targetType, elementData = {}) => {
    if (!workspace?.workspaceId || !currentUser) return;

    try {
      const activityData = {
        workspaceId: workspace.workspaceId,
        taskId: selectedSubtask ? workspace.tasks?.find(task => 
          task.subtasks?.some(subtask => subtask.id === selectedSubtask.id)
        )?.id : null,
        subtaskId: selectedSubtask?.id || null,
        userId: currentUser.id || 'unknown',
        userEmail: currentUser.email || 'unknown@example.com',
        userName: currentUser.name || 'Unknown User',
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

      console.log('🔄 CanvasWorkspace: Tracking activity', activityData);

      const response = await fetch(`/api/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData)
      });

      if (response.ok) {
        console.log('✅ CanvasWorkspace: Activity tracked successfully');
        // Trigger immediate refresh of activities in the sidebar
        if (onActivityCreated) {
          onActivityCreated();
        }
      } else {
        console.error('❌ CanvasWorkspace: Failed to track activity');
      }
    } catch (error) {
      console.error('❌ CanvasWorkspace: Error tracking activity:', error);
    }
  };

  // Initialize nodes and edges from subtask canvas data or workspace data
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

  const canvasData = getCanvasData();
  const [nodes, setNodes, onNodesChange] = useNodesState(canvasData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(canvasData.edges);

  // Function to clear all elements from canvas
  const clearCanvas = () => {
    setNodes([]);
    setEdges([]);
    console.log('🧹 Canvas cleared - all elements removed');
  };
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [zoomLevel, setZoomLevelState] = useState(Number(canvasData.zoomLevel) || 100);

  const updateZoomLevel = useCallback((value) => {
    const numericValue = Number(value);
    const normalizedZoom = Number.isFinite(numericValue)
      ? Math.min(Math.max(Math.round(numericValue), MIN_ZOOM_PERCENT), MAX_ZOOM_PERCENT)
      : 100;
    setZoomLevelState(normalizedZoom);
    onZoomChange?.(normalizedZoom);
  }, [onZoomChange]);

  const handleSetZoomLevel = useCallback((value) => {
    if (!reactFlowInstance) return;

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return;

    const clampedZoom = Math.min(Math.max(Math.round(numericValue), MIN_ZOOM_PERCENT), MAX_ZOOM_PERCENT);
    reactFlowInstance.zoomTo(clampedZoom / 100);
    updateZoomLevel(clampedZoom);
  }, [reactFlowInstance, updateZoomLevel]);

  // Modal state
  const [showTableModal, setShowTableModal] = useState(false);
  const [pendingTableElement, setPendingTableElement] = useState(null);
  const [pendingPosition, setPendingPosition] = useState(null);
  
  // Chart modal state
  const [showChartModal, setShowChartModal] = useState(false);
  const [pendingChartElement, setPendingChartElement] = useState(null);
  
  // Turnkey modal state
  const [showTurnkeyModal, setShowTurnkeyModal] = useState(false);
  const [pendingTurnkeyElement, setPendingTurnkeyElement] = useState(null);
  
  // List modal state
  const [showListModal, setShowListModal] = useState(false);
  const [pendingListElement, setPendingListElement] = useState(null);

  // Layout modal state
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [pendingLayoutElement, setPendingLayoutElement] = useState(null);
  const [showTaskCardModal, setShowTaskCardModal] = useState(false);
  const [pendingTaskCardElement, setPendingTaskCardElement] = useState(null);
  const [pendingTaskCardInitialData, setPendingTaskCardInitialData] = useState(null);

  // Edge labeling state
  const [edgeLabelModal, setEdgeLabelModal] = useState({ isOpen: false, edgeId: null, initialLabel: '' });
  const [edgeLabelInput, setEdgeLabelInput] = useState('');
  
  
  // Flowchart extension state
  const [selectedFlowchartGroup, setSelectedFlowchartGroup] = useState(null);
  const [showFlowchartToolbar, setShowFlowchartToolbar] = useState(false);

  // Multi-element grouping state
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [showGroupingToolbar, setShowGroupingToolbar] = useState(false);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState({
    isVisible: false,
    position: { x: 0, y: 0 },
    selectedNodes: []
  });
  const [showGroupingModal, setShowGroupingModal] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [manuallySelectedNodes, setManuallySelectedNodes] = useState([]);

  // Saving state
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'
  const [lastSaved, setLastSaved] = useState(null);

  // Update canvas data when selectedSubtask changes
  useEffect(() => {
    const newCanvasData = getCanvasData();
    console.log('🔄 CanvasWorkspace: Updating canvas data for subtask change', {
      subtaskId: selectedSubtask?.id,
      nodesCount: newCanvasData.nodes.length,
      edgesCount: newCanvasData.edges.length,
      zoomLevel: newCanvasData.zoomLevel
    });
    
    setNodes(newCanvasData.nodes);
    setEdges(newCanvasData.edges);
    updateZoomLevel(newCanvasData.zoomLevel);
  }, [selectedSubtask?.id, workspace?.workspaceId, updateZoomLevel]);

  // Auto-save workspace data when nodes or edges change
  useEffect(() => {
    // Auto-save effect triggered (log removed for performance)

    const wsId = workspace?.workspaceId || workspace?.id || workspace?._id;
    if (onSaveWorkspace && workspace?.workspaceId) {
      const saveData = {
        nodes,
        edges,
        zoomLevel,
        canvasSettings: {}
      };
      
      // Preparing to save data (log removed for performance)
      setSaveStatus('saving');
      
      // Debounce the save operation
      const timeoutId = setTimeout(async () => {
        try {
          // Calling onSaveWorkspace (log removed for performance)
          await onSaveWorkspace(saveData);
          setSaveStatus('saved');
          setLastSaved(new Date());
          // Save successful (log removed for performance)
          
          // Reset to idle after showing saved status
          setTimeout(() => {
            setSaveStatus('idle');
          }, 1000);
        } catch (error) {
          console.error('❌ CanvasWorkspace: Save failed:', error);
          setSaveStatus('error');
          setTimeout(() => {
            setSaveStatus('idle');
          }, 3000);
        }
      }, 2000); // Save after 2 seconds of inactivity

      return () => {
        // Clearing save timeout (log removed for performance)
        clearTimeout(timeoutId);
      };
    } else {
      console.log('⚠️ CanvasWorkspace: Auto-save skipped - no data or save function');
    }
  }, [nodes, edges, zoomLevel, onSaveWorkspace, workspace?.workspaceId, selectedSubtask?.id]);

  // Update nodes and edges when workspace data changes
  // useEffect(() => {
  //   if (workspace) {
  //     if (workspace.nodes && workspace.nodes.length > 0) {
  //       setNodes(workspace.nodes);
  //     }
  //     if (workspace.edges && workspace.edges.length > 0) {
  //       setEdges(workspace.edges);
  //     }
  //     if (workspace.zoomLevel) {
  //       setZoomLevel(workspace.zoomLevel);
  //     }
  //   }
  // }, [workspace, setNodes, setEdges]);

  // Helper function to check if element is a table
  const isTableElement = (element) => {
    return element.type === 'table' || element.id?.includes('table');
  };

  // Helper function to check if element is a chart
  const isChartElement = (element) => {
    return element.type === 'chart' || element.id?.includes('chart');
  };

  // Helper function to check if element is a list
  const isListElement = (element) => {
    return element.type === 'list';
  };

  // Helper function to check if element is a layout
  const isLayoutElement = (element) => {
    return element.type === 'frame' || element.type === 'rows' || element.type === 'columns' || 
           element.type === 'grid' || element.type === 'image' || element.id?.includes('layout') ||
           element.id === 'frame' || element.id === 'rows' || element.id === 'columns' || 
           element.id === 'grids' || element.id === 'image-placeholder' || element.id === 'image-gallery';
  };

  // Helper function to check if element is a file
  const isFileElement = (element) => {
    return element.type === 'file';
  };

  // Helper function to check if element is a flowchart
  const isFlowchartElement = (element) => {
    return element.type === 'flowchart';
  };

  // Helper function to create a node
  const createElementNode = (element, position, customData = null) => {
    console.log('🏗️ createElementNode called with:', { element, position, customData });
    
    const isLayout = element.width !== undefined || ['frame', 'rows', 'columns', 'grid', 'image'].includes(element.type);
    const isText = element.type === 'text' || element.content !== undefined;
    const isTurnkey = element.category === 'turnkey' || element.type?.startsWith('turnkey-');
    const isTaskCard = element.type === 'task-card' || element.type === 'task-card-progress';
    const isImageBlock = element.type === 'image-block';
    const isSmartNote = element.type === 'smart-note' || element.nodeType === 'smartNote';
    const isCalendarEvent = element.type === 'calendar-event' || element.nodeType === 'calendarNode';
    const isApprovalBoard = element.type === 'approval-board' || element.nodeType === 'approvalBoard';
    
    console.log('🔍 Element type checks:', { isLayout, isText, isTurnkey, isSmartNote, isCalendarEvent, isApprovalBoard });
    
    let nodeType = 'elementNode';
    if (isLayout) nodeType = 'layoutNode';
    if (isText) nodeType = 'textNode';
    if (isTurnkey) nodeType = 'turnkeyNode';
    if (isSmartNote) nodeType = 'smartNote';
    if (isCalendarEvent) nodeType = 'calendarNode';
    if (isApprovalBoard) nodeType = 'approvalBoard';
    
    const nodeId = `${element.type}_${Date.now()}`;
    const taskCardData = isTaskCard
      ? (customData?.taskCardData || element.taskCardData || null)
      : null;
    const imageBlockData = isImageBlock
      ? (customData?.imageBlockData || element.imageBlockData || null)
      : null;
    const previewText = (() => {
      if (isTaskCard && taskCardData?.title) {
        return taskCardData.title;
      }
      if (isImageBlock && (imageBlockData?.caption || imageBlockData?.timestamp)) {
        return imageBlockData.caption || `Snapshot ${imageBlockData.timestamp}`;
      }
      return element.preview || `${element.type} ${isLayout ? 'layout' : isText ? 'text' : isTurnkey ? 'turnkey' : 'element'}`;
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
          vendorName: element.company?.name,
        } : null,
        ...(isTurnkey && (() => {
          const turnkeyData = {
            elementType: element.type,
            taskName: element.taskName || 'Turnkey task 1',
            status: element.status || 'Foundation - phase 1',
            date: element.date || new Date().toLocaleDateString(),
            nodeId: nodeId, // Store the node ID in data for easy access
            // Use custom turnkey data if provided, otherwise use defaults
            ...(customData && element.type === 'turnkey-workflow' && {
              ...customData
            })
          };
          console.log('🎯 Final turnkey data for node:', turnkeyData);
          return turnkeyData;
        })()),
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
        ...(customData && element.type === 'table' && { customTableData: customData }),
        // Custom chart data if provided
        ...(customData && element.type === 'chart' && { customChartData: customData }),
        // Custom list data if provided
        ...(customData && element.type === 'list' && { customListData: customData }),
        // File data if provided
        ...(element.type === 'file' && element.fileData && { fileData: element.fileData }),
        // Store chart ID for chart elements
        ...(element.type === 'chart' && { id: element.id }),
        // Store list ID for list elements
        ...(element.type === 'list' && { id: element.id }),
        ...(isTaskCard && taskCardData && { taskCardData }),
        ...(isImageBlock && imageBlockData && { imageBlockData: JSON.parse(JSON.stringify(imageBlockData)) }),
        // Store icon ID for icon elements
        ...(element.type === 'icon' && { id: element.id }),
        // Store Smart Note data
        ...(isSmartNote && {
          label: element.data?.label || element.name || 'Smart Note',
          ...(element.data || {})
        }),
        // Store Calendar Event data
        ...(isCalendarEvent && {
          label: element.data?.label || element.name || 'Calendar Event',
          ...(element.data || {})
        }),
        // Store Approval Board data
        ...(isApprovalBoard && {
          label: element.data?.label || element.name || 'Approval Board',
          ...(element.data || {})
        }),
        // Store workspaceId for all nodes (needed for MaterialsRenderer and other components)
        workspaceId: workspace?.workspaceId || null,

      },
    };

    return newNode;
  };

  // Helper function to create a layout node with custom configuration
  const createLayoutNode = (element, position, layoutConfig = null) => {
    const newNode = {
      id: `layout_${Date.now()}`,
      type: 'layoutNode',
      position,
      data: {
        name: layoutConfig?.title || element.name,
        type: element.type,
        id: element.id,
        preview: layoutConfig?.description || element.preview,
        width: element.width || 380,
        height: element.height || 280,
        // Add custom layout data if provided
        ...(layoutConfig?.customLayoutData && { customLayoutData: layoutConfig.customLayoutData })
      },
    };
    
    return newNode;
  };

  // Handle table configuration confirmation
  const handleTableConfigConfirm = async (tableConfig) => {
    if (pendingTableElement && pendingPosition) {
      const newNode = createElementNode(pendingTableElement, pendingPosition, tableConfig);
      console.log('🆕 Creating table with custom data:', newNode);
      setNodes((nds) => nds.concat(newNode));
      
      // Track the table creation activity
      await trackActivity(
        'element_added',
        'create',
        'element',
        {
          elementId: newNode.id,
          elementType: 'table',
          position: pendingPosition,
          details: {
            elementName: pendingTableElement.name || 'Table',
            tableConfig: tableConfig,
            canvasAction: true
          }
        }
      );
      
      // Reset pending state
      setPendingTableElement(null);
      setPendingPosition(null);
    }
    setShowTableModal(false);
  };

  // Handle modal close
  const handleTableModalClose = () => {
    setShowTableModal(false);
    setPendingTableElement(null);
    setPendingPosition(null);
  };

  // Handle chart configuration confirmation
  const handleChartConfigConfirm = async (chartConfig) => {
    if (pendingChartElement && pendingPosition) {
      const newNode = createElementNode(pendingChartElement, pendingPosition, chartConfig);
      console.log('🆕 Creating chart with custom data:', newNode);
      setNodes((nds) => nds.concat(newNode));
      
      // Track the chart creation activity
      await trackActivity(
        'element_added',
        'create',
        'element',
        {
          elementId: newNode.id,
          elementType: 'chart',
          position: pendingPosition,
          details: {
            elementName: pendingChartElement.name || 'Chart',
            chartConfig: chartConfig,
            canvasAction: true
          }
        }
      );
      
      // Reset pending state
      setPendingChartElement(null);
      setPendingPosition(null);
    }
    setShowChartModal(false);
  };

  // Handle chart modal close
  const handleChartModalClose = () => {
    setShowChartModal(false);
    setPendingChartElement(null);
    setPendingPosition(null);
  };

  // Handle turnkey configuration confirmation
  const handleTurnkeyConfigConfirm = async (turnkeyConfig) => {

    if (pendingTurnkeyElement) {
      let nodeId;
      let isNewNode = false;
      
      // Check if we're editing an existing node
      if (pendingTurnkeyElement.nodeId) {
        // Update existing node
        nodeId = pendingTurnkeyElement.nodeId;
        console.log('🔧 Updating existing turnkey workflow:', nodeId, turnkeyConfig);
        
        setNodes((nds) => nds.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...turnkeyConfig,
                elementType: 'turnkey-workflow',
                nodeId: nodeId // Ensure nodeId is preserved
              }
            };
          }
          return node;
        }));
        
      } else if (pendingPosition) {
        // Create new node
        const elementWithConfig = {
          ...pendingTurnkeyElement,
          ...turnkeyConfig,
          elementType: 'turnkey-workflow'
        };
        
        console.log('📦 Element with config:', elementWithConfig);
        console.log('🔧 Turnkey config data:', turnkeyConfig);
        const newNode = createElementNode(elementWithConfig, pendingPosition, turnkeyConfig);
        console.log('🆕 Created turnkey workflow node:', newNode);
        setNodes((nds) => nds.concat(newNode));
        
        nodeId = newNode.id;
        isNewNode = true;
        
        // Add to activity tracker
        if (onActivityCreated) {
          onActivityCreated();
        }
      }
      
      // Save turnkey workflow to backend
      if (nodeId && workspace?.workspaceId) {
        try {
          console.log('💾 Saving turnkey workflow to backend:', {
            workspaceId: workspace.workspaceId,
            nodeId,
            isNewNode
          });
          
          // Add a small delay for new nodes to ensure the workspace state is consistent
          if (isNewNode) {
            console.log('⏳ Adding small delay for new node creation...');
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          const method = isNewNode ? 'POST' : 'PUT';
          console.log(`🌐 Making ${method} request for ${isNewNode ? 'new' : 'existing'} turnkey workflow`);
          
          const response = await fetch(`/api/turnkey-workflows/workspace/${workspace.workspaceId}/node/${nodeId}`, {
            method,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...turnkeyConfig,
              vendorId: workspace.vendorId,
              userId: workspace.vendorId, // For audit trail
              nodeId: nodeId,
              workspaceId: workspace.workspaceId
            })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Failed to save turnkey workflow:', errorText);
            
            // If it's a "Node not found" error and this is a new node, 
            // the backend should handle creating the node
            if (errorText.includes('Node not found') && isNewNode) {
              console.log('🔄 Retrying save for new node...');
              // The backend has been updated to handle this case
            }
            
            throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`);
          }
          
          const result = await response.json();
          console.log('✅ Turnkey workflow saved to backend successfully:', result);
          
        } catch (error) {
          console.error('❌ Error saving turnkey workflow to backend:', error);
          // Don't block the UI - the data is still saved locally and will sync via auto-save
          console.log('ℹ️ Note: Turnkey workflow is saved locally. It will sync to server via auto-save.');
        }
      }
    }
    
    // Clear pending data
    setPendingTurnkeyElement(null);
    setPendingPosition(null);
    setShowTurnkeyModal(false);
    
    console.log('🔄 Modal closed and pending data cleared');
  };

  // Handle turnkey modal close
  const handleTurnkeyModalClose = () => {
    setShowTurnkeyModal(false);
    setPendingTurnkeyElement(null);
    setPendingPosition(null);
  };

  // Handle list configuration confirmation
  const handleListConfigConfirm = (listConfig) => {
    if (pendingListElement && pendingPosition) {
      const newNode = createElementNode(pendingListElement, pendingPosition, listConfig);
      console.log('🆕 Creating list with custom data:', newNode);
      setNodes((nds) => nds.concat(newNode));
      
      // Reset pending state
      setPendingListElement(null);
      setPendingPosition(null);
    }
    setShowListModal(false);
  };

  // Handle list modal close
  const handleListModalClose = () => {
    setShowListModal(false);
    setPendingListElement(null);
    setPendingPosition(null);
  };

  // Handle layout configuration confirmation
  const handleLayoutConfigConfirm = (layoutConfig) => {
    if (pendingLayoutElement && pendingPosition) {
      const newNode = createLayoutNode(pendingLayoutElement, pendingPosition, layoutConfig);
      console.log('🆕 Creating layout with custom data:', newNode);
      setNodes((nds) => nds.concat(newNode));
      
      // Reset pending state
      setPendingLayoutElement(null);
      setPendingPosition(null);
    }
    setShowLayoutModal(false);
  };

  // Handle layout modal close
  const handleLayoutModalClose = () => {
    setShowLayoutModal(false);
    setPendingLayoutElement(null);
    setPendingPosition(null);
  };
  const handleTaskCardConfigConfirm = async (taskCardConfig) => {
    if (pendingTaskCardElement && pendingPosition) {
      const newNode = createElementNode(pendingTaskCardElement, pendingPosition, { taskCardData: taskCardConfig });
      setNodes((nds) => nds.concat(newNode));

      await trackActivity(
        'element_added',
        'create',
        'element',
        {
          elementId: newNode.id,
          elementType: 'task-card',
          position: pendingPosition,
          details: {
            elementName: pendingTaskCardElement.name || 'Task Card',
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


  const openEdgeLabelModal = useCallback((edgeId, currentLabel = '') => {
    setEdgeLabelModal({ isOpen: true, edgeId, initialLabel: currentLabel });
    setEdgeLabelInput(currentLabel);
  }, []);

  const closeEdgeLabelModal = useCallback(() => {
    setEdgeLabelModal({ isOpen: false, edgeId: null, initialLabel: '' });
    setEdgeLabelInput('');
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

      return {
        ...edge,
        data: {
          ...(edge.data || {}),
          label: edgeLabelInput.trim()
        }
      };
    }));

    closeEdgeLabelModal();
  }, [edgeLabelInput, edgeLabelModal.edgeId, closeEdgeLabelModal, setEdges]);


  // Handle node selection changes
  const handleSelectionChange = useCallback((params) => {
    const selectedNodeIds = params.nodes.map(node => node.id);
    const selectedNodeObjects = nodes.filter(node => selectedNodeIds.includes(node.id));
    
    setSelectedNodes(selectedNodeObjects);
    
    // Show grouping toolbar if multiple nodes are selected (and not flowchart elements)
    if (selectedNodeObjects.length >= 2) {
      // Check if any selected nodes are part of a flowchart group
      const hasFlowchartNodes = selectedNodeObjects.some(node => node.data?.flowchartGroup);
      
      if (!hasFlowchartNodes) {
        setShowGroupingToolbar(true);
        console.log('🎯 Multiple nodes selected for grouping:', selectedNodeObjects.length);
      } else {
        setShowGroupingToolbar(false);
      }
    } else {
      setShowGroupingToolbar(false);
    }

    // Handle flowchart group selection (existing logic)
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

  // Handle grouping modal close
  const handleGroupingModalClose = () => {
    setShowGroupingModal(false);
  };

  // Handle group into grid action
  const handleGroupIntoGrid = () => {
    console.log('🎯 Group button clicked!');
    console.log('📊 Selected nodes count:', selectedNodes.length);
    console.log('📋 Selected nodes:', selectedNodes);
    console.log('🔍 Manually selected nodes:', manuallySelectedNodes.length);
    
    // Use manuallySelectedNodes directly to avoid state timing issues
    if (manuallySelectedNodes.length >= 2) {
      console.log('✅ Opening grouping modal with nodes:', manuallySelectedNodes);
      setShowGroupingModal(true);
    } else {
      console.log('❌ Not enough nodes selected for grouping. Manual count:', manuallySelectedNodes.length);
    }
  };

  // Handle selection mode toggle
  const handleSelectionModeToggle = () => {
    console.log('🔄 Selection mode toggle clicked!');
    console.log('📊 Current selection mode:', isSelectionMode);
    
    if (isSelectionMode) {
      // Exit selection mode
      setIsSelectionMode(false);
      setManuallySelectedNodes([]);
      setSelectedNodes([]);
      setShowGroupingToolbar(false);
      console.log('🔄 Exited selection mode');
    } else {
      // Enter selection mode
      setIsSelectionMode(true);
      setManuallySelectedNodes([]);
      setSelectedNodes([]);
      setShowGroupingToolbar(false);
      console.log('🎯 Entered selection mode - click elements to select them');
    }
  };

  // Handle manual node selection in selection mode
  const handleManualNodeSelection = (nodeId) => {
    console.log('🖱️ Node clicked for selection:', nodeId);
    console.log('🔍 Is in selection mode:', isSelectionMode);
    
    if (!isSelectionMode) {
      console.log('❌ Not in selection mode, ignoring click');
      return;
    }

    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      console.log('❌ Node not found:', nodeId);
      return;
    }

    // Check if node is part of a flowchart group (don't allow selection)
    if (node.data?.flowchartGroup) {
      console.log('⚠️ Cannot select flowchart elements for grouping');
      return;
    }

    console.log('✅ Processing node selection for:', node.data?.name);

    setManuallySelectedNodes(prev => {
      const isAlreadySelected = prev.some(n => n.id === nodeId);
      
      if (isAlreadySelected) {
        // Remove from selection
        const newSelection = prev.filter(n => n.id !== nodeId);
        console.log('➖ Removed node from selection:', node.data?.name, 'Total:', newSelection.length);
        return newSelection;
      } else {
        // Add to selection
        const newSelection = [...prev, node];
        console.log('➕ Added node to selection:', node.data?.name, 'Total:', newSelection.length);
        return newSelection;
      }
    });
  };

  // Update selectedNodes when manuallySelectedNodes changes
  useEffect(() => {
    console.log('🔄 Updating selection state...');
    console.log('📊 Manually selected nodes:', manuallySelectedNodes.length);
    console.log('🎯 Selection mode:', isSelectionMode);
    
    setSelectedNodes(manuallySelectedNodes);
    const shouldShowToolbar = manuallySelectedNodes.length >= 2;
    setShowGroupingToolbar(shouldShowToolbar);
    
    console.log('🛠️ Should show grouping toolbar:', shouldShowToolbar);
    
    // Update node selection visual state
    const selectedIds = manuallySelectedNodes.map(n => n.id);
    console.log('🎨 Updating visual state for nodes:', selectedIds);
    
    setNodes(currentNodes => 
      currentNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          isManuallySelected: selectedIds.includes(node.id),
          isInSelectionMode: isSelectionMode
        }
      }))
    );
  }, [manuallySelectedNodes, isSelectionMode, setNodes]);

  // Handle grouping confirmation
  const handleGroupingConfirm = (groupingConfig) => {
    console.log('✅ Creating grouped grid:', groupingConfig);
    
    // Use manuallySelectedNodes for consistency
    const nodesToGroup = manuallySelectedNodes;
    
    // Calculate center position of selected nodes
    const centerX = nodesToGroup.reduce((sum, node) => sum + node.position.x, 0) / nodesToGroup.length;
    const centerY = nodesToGroup.reduce((sum, node) => sum + node.position.y, 0) / nodesToGroup.length;
    
    // Create new grouped grid node
    const groupedGridNode = {
      id: `grouped_grid_${Date.now()}`,
      type: 'layoutNode',
      position: { x: centerX - 200, y: centerY - 150 }, // Center the grid
      data: {
        name: groupingConfig.title,
        type: 'grid',
        id: 'grouped-grid',
        preview: groupingConfig.description,
        width: Math.max(400, groupingConfig.gridColumns * 120),
        height: Math.max(300, groupingConfig.gridRows * 100),
        customLayoutData: {
          gridItems: groupingConfig.elements.map((element, index) => {
            // Find the original node to get the complete data
            const originalNode = nodesToGroup.find(node => node.id === element.id);
            return {
              id: element.id,
              content: element.name,
              row: element.gridPosition.row,
              col: element.gridPosition.col,
              visible: element.visible,
              originalData: originalNode?.data || element.data,
              originalType: originalNode?.type || element.type
            };
          })
        },
        isGroupedGrid: true,
        originalNodes: nodesToGroup.map(node => ({
          id: node.id,
          data: node.data,
          position: node.position,
          type: node.type
        }))
      }
    };
    
    // Remove original nodes and add grouped grid
    const selectedNodeIds = nodesToGroup.map(node => node.id);
    setNodes(currentNodes => {
      const filteredNodes = currentNodes.filter(node => !selectedNodeIds.includes(node.id));
      return [...filteredNodes, groupedGridNode];
    });
    
    // Remove any edges connected to the removed nodes
    setEdges(currentEdges => 
      currentEdges.filter(edge => 
        !selectedNodeIds.includes(edge.source) && 
        !selectedNodeIds.includes(edge.target)
      )
    );
    
    // Close modal and reset state
    setShowGroupingModal(false);
    setShowGroupingToolbar(false);
    setSelectedNodes([]);
    setManuallySelectedNodes([]);
    setIsSelectionMode(false);
    
    console.log('🎉 Grouped grid created successfully!');
  };

  // Handle flowchart creation
  const createFlowchartTemplate = async (element, basePosition) => {
    const template = getFlowchartTemplate(element.id);
    if (!template) {
      console.error('❌ Flowchart template not found:', element.id);
      return;
    }

    console.log('📊 Creating flowchart template:', template.name);

    // Generate unique flowchart group ID
    const flowchartGroupId = `flowchart_${element.id}_${Date.now()}`;

    // Create nodes with adjusted positions and group metadata
    const newNodes = template.nodes.map(node => ({
      ...node,
      id: `${node.id}_${Date.now()}`,
      position: {
        x: basePosition.x + node.position.x - 400, // Center the template around drop position
        y: basePosition.y + node.position.y - 200
      },
      data: {
        ...node.data,
        flowchartGroup: flowchartGroupId,
        flowchartType: element.id,
        flowchartName: template.name
      }
    }));

    // Create edges with updated node IDs and group metadata
    const nodeIdMap = {};
    template.nodes.forEach((originalNode, index) => {
      nodeIdMap[originalNode.id] = newNodes[index].id;
    });

    const newEdges = template.edges.map(edge => ({
      ...edge,
      id: `${edge.id}_${Date.now()}`,
      source: nodeIdMap[edge.source],
      target: nodeIdMap[edge.target],
      data: {
        ...edge.data,
        flowchartGroup: flowchartGroupId
      }
    }));

    // Add nodes and edges to the canvas
    setNodes((nds) => nds.concat(newNodes));
    setEdges((eds) => eds.concat(newEdges));

    // Track the flowchart creation activity
    await trackActivity(
      'element_added',
      'create',
      'element',
      {
        elementId: flowchartGroupId,
        elementType: 'flowchart',
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

    console.log('✅ Flowchart created:', {
      nodes: newNodes.length,
      edges: newEdges.length,
      template: template.name,
      groupId: flowchartGroupId
    });
  };

  // Helper function to get all nodes in a flowchart group
  const getFlowchartGroupNodes = (groupId) => {
    return nodes.filter(node => node.data?.flowchartGroup === groupId);
  };

  // Helper function to get all edges in a flowchart group
  const getFlowchartGroupEdges = (groupId) => {
    return edges.filter(edge => edge.data?.flowchartGroup === groupId);
  };

  // Handle flowchart group selection
  const selectFlowchartGroup = (groupId) => {
    const groupNodes = getFlowchartGroupNodes(groupId);
    const groupNodeIds = groupNodes.map(node => node.id);
    
    // Update nodes to mark group as selected
    setNodes(nds => nds.map(node => ({
      ...node,
      selected: groupNodeIds.includes(node.id)
    })));

    // Update edges to mark group edges as selected
    const groupEdges = getFlowchartGroupEdges(groupId);
    const groupEdgeIds = groupEdges.map(edge => edge.id);
    
    setEdges(eds => eds.map(edge => ({
      ...edge,
      selected: groupEdgeIds.includes(edge.id)
    })));

    console.log('🎯 Selected flowchart group:', groupId, {
      nodes: groupNodeIds.length,
      edges: groupEdgeIds.length
    });

    // Show flowchart toolbar
    setSelectedFlowchartGroup(groupId);
    setShowFlowchartToolbar(true);
  };

  // Handle flowchart group deletion
  const deleteFlowchartGroup = (groupId) => {
    const groupNodes = getFlowchartGroupNodes(groupId);
    const groupEdges = getFlowchartGroupEdges(groupId);
    
    if (groupNodes.length === 0) return;

    const flowchartName = groupNodes[0]?.data?.flowchartName || 'Flowchart';
    
    if (window.confirm(`Delete entire ${flowchartName}? This will remove all ${groupNodes.length} elements and ${groupEdges.length} connections.`)) {
      // Remove all nodes in the group
      setNodes(nds => nds.filter(node => node.data?.flowchartGroup !== groupId));
      
      // Remove all edges in the group
      setEdges(eds => eds.filter(edge => edge.data?.flowchartGroup !== groupId));
      
      console.log('🗑️ Deleted flowchart group:', groupId, {
        nodesRemoved: groupNodes.length,
        edgesRemoved: groupEdges.length
      });
    }
  };

  // Add new element to existing flowchart
  const addElementToFlowchart = (elementType, position) => {
    if (!selectedFlowchartGroup) return;

    const groupNodes = getFlowchartGroupNodes(selectedFlowchartGroup);
    if (groupNodes.length === 0) return;

    const flowchartType = groupNodes[0]?.data?.flowchartType;
    const flowchartName = groupNodes[0]?.data?.flowchartName;

    // Create new element based on type
    let newElement;
    switch (elementType) {
      case 'decision':
        newElement = {
          id: `decision_${Date.now()}`,
          type: 'elementNode',
          position: position || { x: 400, y: 300 },
          data: {
            name: 'Decision Point',
            type: 'button',
            preview: 'New decision point',
            flowchartGroup: selectedFlowchartGroup,
            flowchartType: flowchartType,
            flowchartName: flowchartName
          }
        };
        break;
      case 'outcome':
        newElement = {
          id: `outcome_${Date.now()}`,
          type: 'layoutNode',
          position: position || { x: 400, y: 300 },
          data: {
            name: 'Outcome',
            type: 'frame',
            width: 150,
            height: 80,
            backgroundColor: '#dcfce7',
            borderColor: '#16a34a',
            flowchartGroup: selectedFlowchartGroup,
            flowchartType: flowchartType,
            flowchartName: flowchartName
          }
        };
        break;
      case 'process':
        newElement = {
          id: `process_${Date.now()}`,
          type: 'layoutNode',
          position: position || { x: 400, y: 300 },
          data: {
            name: 'Process',
            type: 'frame',
            width: 180,
            height: 100,
            backgroundColor: '#dbeafe',
            borderColor: '#2563eb',
            flowchartGroup: selectedFlowchartGroup,
            flowchartType: flowchartType,
            flowchartName: flowchartName
          }
        };
        break;
      case 'text':
        newElement = {
          id: `text_${Date.now()}`,
          type: 'textNode',
          position: position || { x: 400, y: 300 },
          data: {
            name: 'Text Label',
            type: 'text',
            content: 'New Text',
            fontSize: 14,
            fontFamily: 'Inter',
            color: '#374151',
            backgroundColor: 'transparent',
            formats: {},
            flowchartGroup: selectedFlowchartGroup,
            flowchartType: flowchartType,
            flowchartName: flowchartName
          }
        };
        break;
      default:
        return;
    }

    // Add the new element to the canvas
    setNodes(nds => nds.concat(newElement));
    
    console.log('➕ Added new element to flowchart:', {
      elementType,
      groupId: selectedFlowchartGroup,
      elementId: newElement.id
    });
  };

  // Handle canvas click to hide flowchart toolbar and context menu
  const onPaneClick = useCallback(() => {
    setShowFlowchartToolbar(false);
    setSelectedFlowchartGroup(null);
    setContextMenu({ isVisible: false, position: { x: 0, y: 0 }, selectedNodes: [] });
  }, []);

  // Handle right-click context menu
  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Get currently selected nodes
    const currentlySelected = nodes.filter(n => n.selected);
    
    // If the right-clicked node is not selected, select only it
    let contextSelectedNodes;
    if (!currentlySelected.some(n => n.id === node.id)) {
      contextSelectedNodes = [node];
      // Update node selection
      setNodes(nds => nds.map(n => ({
        ...n,
        selected: n.id === node.id
      })));
    } else {
      // Use currently selected nodes
      contextSelectedNodes = currentlySelected;
    }
    
    // Calculate menu position (ensure it stays within viewport)
    const menuWidth = 200;
    const menuHeight = 150;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight);
    
    setContextMenu({
      isVisible: true,
      position: { x, y },
      selectedNodes: contextSelectedNodes
    });
    
    console.log('🖱️ Context menu opened for:', contextSelectedNodes.length, 'elements');
  }, [nodes, setNodes]);

  // Handle context menu actions
  const handleContextMenuDuplicate = useCallback(() => {
    if (contextMenu.selectedNodes.length > 0) {
      // Temporarily set the selected nodes for duplication
      const originalNodes = nodes.map(n => ({ ...n }));
      setNodes(nds => nds.map(n => ({
        ...n,
        selected: contextMenu.selectedNodes.some(selected => selected.id === n.id)
      })));
      
      // Trigger duplication
      duplicateSelectedElements();
      
      // Restore original selection state
      setTimeout(() => {
        setNodes(originalNodes);
      }, 100);
    }
  }, [contextMenu.selectedNodes, nodes, setNodes]);

  const handleContextMenuDelete = useCallback(() => {
    if (contextMenu.selectedNodes.length > 0) {
      const nodeIdsToDelete = contextMenu.selectedNodes.map(n => n.id);
      
      // Check for flowchart groups and delete them
      const flowchartGroups = new Set();
      contextMenu.selectedNodes.forEach(node => {
        if (node.data?.flowchartGroup) {
          flowchartGroups.add(node.data.flowchartGroup);
        }
      });
      
      if (flowchartGroups.size > 0) {
        // Delete flowchart groups
        flowchartGroups.forEach(groupId => {
          deleteFlowchartGroup(groupId);
        });
      } else {
        // Delete individual nodes
        setNodes(nds => nds.filter(n => !nodeIdsToDelete.includes(n.id)));
        setEdges(eds => eds.filter(e => 
          !nodeIdsToDelete.includes(e.source) && !nodeIdsToDelete.includes(e.target)
        ));
      }
      
      console.log('🗑️ Deleted elements:', nodeIdsToDelete.length);
    }
  }, [contextMenu.selectedNodes, setNodes, setEdges, deleteFlowchartGroup]);

  const handleContextMenuEdit = useCallback(() => {
    if (contextMenu.selectedNodes.length === 1) {
      const node = contextMenu.selectedNodes[0];
      console.log('✏️ Edit element:', node.data?.name || node.data?.type);
      // TODO: Implement edit functionality based on element type
      // This could open appropriate modals for different element types
    }
  }, [contextMenu.selectedNodes]);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu({ isVisible: false, position: { x: 0, y: 0 }, selectedNodes: [] });
  }, []);

  // Duplicate selected elements
  const duplicateSelectedElements = useCallback(async () => {
    const selectedNodes = nodes.filter(node => node.selected);
    
    if (selectedNodes.length === 0) {
      console.log('⚠️ No elements selected for duplication');
      return;
    }

    console.log('🔄 Duplicating elements:', selectedNodes.length);
    
    const duplicatedNodes = [];
    const duplicateOffset = 50; // Offset for positioning duplicates
    
    for (const node of selectedNodes) {
      // Generate new unique ID
      const newId = `${node.data.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Calculate new position (offset from original)
      const newPosition = {
        x: node.position.x + duplicateOffset,
        y: node.position.y + duplicateOffset
      };
      
      // Create duplicated node with all original data
      const duplicatedNode = {
        ...node,
        id: newId,
        position: newPosition,
        selected: false, // Don't select the duplicate initially
        data: {
          ...node.data,
          // Update any ID references in the data
          ...(node.data.id && { id: newId }),
          // For flowchart elements, create new group if needed
          ...(node.data.flowchartGroup && { 
            flowchartGroup: `${node.data.flowchartGroup}_duplicate_${Date.now()}` 
          }),
          // For custom data elements, deep clone the data
          ...(node.data.customTableData && { 
            customTableData: JSON.parse(JSON.stringify(node.data.customTableData)) 
          }),
          ...(node.data.customChartData && { 
            customChartData: JSON.parse(JSON.stringify(node.data.customChartData)) 
          }),
          ...(node.data.customListData && { 
            customListData: JSON.parse(JSON.stringify(node.data.customListData)) 
          }),
          ...(node.data.fileData && { 
            fileData: JSON.parse(JSON.stringify(node.data.fileData)) 
          })
        }
      };
      
      duplicatedNodes.push(duplicatedNode);
      
      // Track the duplication activity
      try {
        await trackActivity(
          'element_duplicated',
          'create',
          'element',
          {
            originalElementId: node.id,
            duplicatedElementId: newId,
            elementType: node.data.type || 'unknown',
            position: newPosition,
            details: {
              elementName: node.data.name || node.data.type,
              canvasAction: true,
              duplicateOffset: duplicateOffset
            }
          }
        );
      } catch (error) {
        console.error('❌ Error tracking duplication activity:', error);
      }
    }
    
    // Add all duplicated nodes to the canvas
    setNodes((nds) => {
      const updatedNodes = [...nds, ...duplicatedNodes];
      console.log('✅ Added duplicated nodes:', duplicatedNodes.length);
      return updatedNodes;
    });
    
    console.log('🎉 Element duplication completed successfully!');
  }, [nodes, setNodes, trackActivity]);

  // Handle node selection to detect flowchart group selection and manual selection
  const onNodeClick = useCallback((event, node) => {
    event.stopPropagation();
    
    // Handle manual selection mode
    if (isSelectionMode) {
      handleManualNodeSelection(node.id);
      return;
    }
    
    // Check if this node belongs to a flowchart group
    if (node.data?.flowchartGroup) {
      // If Ctrl/Cmd is held, just select this node
      if (event.ctrlKey || event.metaKey) {
        return; // Let React Flow handle individual selection
      }
      
      // Otherwise, select the entire flowchart group
      selectFlowchartGroup(node.data.flowchartGroup);
    }
  }, [nodes, edges, isSelectionMode, handleManualNodeSelection]);

  const handleEdgeClick = useCallback((event, edge) => {
    event.stopPropagation();
    openEdgeLabelModal(edge.id, edge.data?.label || '');
  }, [openEdgeLabelModal]);

  // Handle key press for deletion and duplication
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Prevent shortcuts when typing in input fields
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.contentEditable === 'true') {
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Find selected nodes that belong to flowchart groups
        const selectedNodes = nodes.filter(node => node.selected);
        const flowchartGroups = new Set();
        
        selectedNodes.forEach(node => {
          if (node.data?.flowchartGroup) {
            flowchartGroups.add(node.data.flowchartGroup);
          }
        });
        
        // Delete each flowchart group
        flowchartGroups.forEach(groupId => {
          deleteFlowchartGroup(groupId);
        });
      }
      
      // Handle duplication with Ctrl+D (or Cmd+D on Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();
        duplicateSelectedElements();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [nodes, edges]);

  // Manual zoom functions
  const handleZoomIn = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn();
      console.log('🔍 Zoom In clicked');
    }
  };

  const handleZoomOut = () => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut();
      console.log('🔍 Zoom Out clicked');
    }
  };

  const handleFitView = () => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.1 });
      console.log('📐 Fit View clicked');
    }
  };

  useImperativeHandle(ref, () => ({
    zoomIn: handleZoomIn,
    zoomOut: handleZoomOut,
    fitView: handleFitView,
    setZoomLevel: handleSetZoomLevel,
  }));

  // Handle viewport changes to update zoom level
  const onViewportChange = useCallback((viewport) => {
    updateZoomLevel(Math.round(viewport.zoom * 100));
  }, [updateZoomLevel]);

  // Handle custom text element drops from TextPanel
  useEffect(() => {
    const handleTextElementDrop = (event) => {
      const textData = event.detail;
      console.log('📝 Text element drop event received:', textData);
      
      // Add text element to center of canvas
      const newNode = {
        id: `text_${Date.now()}`,
        type: 'textNode',
        position: { x: 250, y: 150 }, // Center position
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
        },
      };
      
      console.log('🆕 Adding text node:', newNode);
      setNodes((nds) => nds.concat(newNode));
    };

    document.addEventListener('textElementDrop', handleTextElementDrop);
    
    return () => {
      document.removeEventListener('textElementDrop', handleTextElementDrop);
    };
  }, [setNodes]);

  // Handle direct table add events from BOQ modal (single and batch)
  useEffect(() => {
    const sanitizeColumnName = (name, index) => {
      const base = String(name || `Column ${index + 1}`).trim();
      return base.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || `col_${index + 1}`;
    };
    const convertTableToCustomData = (table) => {
      const columns = (table.headers || []).map((h, idx) => sanitizeColumnName(h, idx));
      const data = (table.rows || []).map((row, rIdx) => {
        const obj = { id: rIdx + 1 };
        columns.forEach((col, cIdx) => {
          obj[col] = row[cIdx] !== undefined && row[cIdx] !== null ? String(row[cIdx]) : '';
        });
        return obj;
      });
      return { columns, data, sheetName: table.sheetName, originalName: table.name };
    };

    const addOneTable = async (table, index = 0) => {
      // Compute a staggered position near center
      const baseX = window.innerWidth / 2 - 250;
      const baseY = window.innerHeight / 2 - 180;
      const offset = 40;
      const position = { x: baseX + (index % 3) * offset, y: baseY + Math.floor(index / 3) * offset };

      const element = {
        id: 'basic-table',
        name: table.name || table.sheetName || 'Imported Table',
        type: 'table',
        preview: `${(table.rows || []).length} rows × ${(table.headers || []).length} columns`
      };

      const customData = convertTableToCustomData(table);
      const newNode = createElementNode(element, position, customData);
      setNodes((nds) => nds.concat(newNode));

      try {
        await trackActivity(
          'element_added',
          'create',
          'element',
          {
            elementId: newNode.id,
            elementType: 'table',
            position,
            details: {
              elementName: element.name,
              canvasAction: true,
              addedVia: 'boq-modal',
              rows: (table.rows || []).length,
              columns: (table.headers || []).length
            }
          }
        );
      } catch (e) {
        console.error('❌ Error tracking table add activity:', e);
      }
    };

    const handleAddTableToCanvas = async (event) => {
      const table = event.detail;
      if (!table) return;
      await addOneTable(table, 0);
    };

    const handleAddTablesToCanvas = async (event) => {
      const tables = event.detail?.tables || [];
      for (let i = 0; i < tables.length; i++) {
        await addOneTable(tables[i], i);
      }
    };

    document.addEventListener('addTableToCanvas', handleAddTableToCanvas);
    document.addEventListener('addTablesToCanvas', handleAddTablesToCanvas);
    return () => {
      document.removeEventListener('addTableToCanvas', handleAddTableToCanvas);
      document.removeEventListener('addTablesToCanvas', handleAddTablesToCanvas);
    };
  }, [setNodes, trackActivity]);

  // Handle ungrouping elements
  useEffect(() => {
    const handleUngroupElements = (event) => {
      const { groupedNodeId, originalNodes } = event.detail;
      console.log('📥 Ungroup event received:', { groupedNodeId, originalNodes });
      
      if (!groupedNodeId || !originalNodes) return;
      
      // Find the grouped node
      const groupedNode = nodes.find(node => node.id === groupedNodeId);
      if (!groupedNode) return;
      
      // Restore original nodes with positions relative to the grouped node
      const restoredNodes = originalNodes.map((originalNode, index) => {
        // Calculate new position relative to grouped node position
        const offsetX = (index % 3) * 150; // Spread horizontally
        const offsetY = Math.floor(index / 3) * 120; // Spread vertically
        
        return {
          ...originalNode,
          id: `${originalNode.id}_restored_${Date.now()}`, // New unique ID
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
      
      // Remove grouped node and add restored nodes
      setNodes(currentNodes => {
        const filteredNodes = currentNodes.filter(node => node.id !== groupedNodeId);
        return [...filteredNodes, ...restoredNodes];
      });
      
      console.log('✅ Elements ungrouped successfully:', restoredNodes.length);
    };

    document.addEventListener('ungroupElements', handleUngroupElements);
    
    return () => {
      document.removeEventListener('ungroupElements', handleUngroupElements);
    };
  }, [nodes, setNodes]);

  // Handle turnkey workflow editing
  useEffect(() => {
    const handleEditTurnkeyWorkflow = (event) => {
      const { nodeId, data } = event.detail;
      
      // Set the current node data as initial data for the modal
      setPendingTurnkeyElement({
        ...data,
        nodeId: nodeId // Store the node ID for updating later
      });
      setPendingPosition(null); // Not needed for editing
      setShowTurnkeyModal(true);
    };

    document.addEventListener('editTurnkeyWorkflow', handleEditTurnkeyWorkflow);
    
    return () => {
      document.removeEventListener('editTurnkeyWorkflow', handleEditTurnkeyWorkflow);
    };
  }, []);

  // Handle element double-click from ElementsPanel
  useEffect(() => {
    const handleElementDoubleClick = (event) => {
      const element = event.detail;
      console.log('🖱️ Element double-click event received:', element);
      console.log('🔍 Element category:', element?.category);
      console.log('🔍 Element type:', element?.type);
      
      // Calculate center position for the new element
      const centerX = window.innerWidth / 2 - 200; // Offset for element width
      const centerY = window.innerHeight / 2 - 150; // Offset for element height
      const basePosition = { x: centerX, y: centerY };
      const targetPosition = getAutoPlacementPosition(basePosition);
      
      // Check if it's a table element
      if (isTableElement(element)) {
        console.log('📊 Table element detected, showing configuration modal');
        setPendingTableElement(element);
        setPendingPosition(targetPosition);
        setShowTableModal(true);
        return;
      }
      
      // Check if it's a chart element
      if (isChartElement(element)) {
        console.log('📈 Chart element detected, showing configuration modal');
        setPendingChartElement(element);
        setPendingPosition(targetPosition);
        setShowChartModal(true);
        return;
      }
      
      // Check if it's a turnkey workflow element
      console.log('🔍 Checking turnkey workflow:', {
        elementType: element?.type,
        elementElementType: element?.elementType,
        elementId: element?.id,
        isTurnkeyWorkflow: element?.type === 'turnkey-workflow' || element?.elementType === 'turnkey-workflow'
      });
      
      if (element?.type === 'turnkey-workflow' || element?.elementType === 'turnkey-workflow' || element?.id === 'turnkey-workflow') {
        console.log('🔧 Turnkey workflow element detected, showing configuration modal');
        setPendingTurnkeyElement(element);
        setPendingPosition(targetPosition);
        setShowTurnkeyModal(true);
        return;
      }
      
      // Check if it's a list element
      if (isListElement(element)) {
        console.log('📝 List element detected, showing configuration modal');
        setPendingListElement(element);
        setPendingPosition(targetPosition);
        setShowListModal(true);
        return;
      }

      // Check if it's a layout element
      if (isLayoutElement(element)) {
        console.log('🏗️ Layout element detected, showing configuration modal');
        setPendingLayoutElement(element);
        setPendingPosition(targetPosition);
        setShowLayoutModal(true);
        return;
      }
      
      // Check if it's a flowchart element
      if (isFlowchartElement(element)) {
        console.log('🔄 Flowchart element detected, creating template');
        createFlowchartTemplate(element, targetPosition);
        return;
      }
      
      // Check if it's a turnkey element
      if (element.category === 'turnkey' || element.type?.startsWith('turnkey-')) {
        console.log('🎯 Turnkey element detected, creating turnkey node');
        const newNode = createElementNode(element, targetPosition);
        console.log('🆕 Adding turnkey element:', newNode);
        setNodes((nds) => nds.concat(newNode));
        return;
      }
      // Check if it's a task card element
      if (element.type === 'image-block') {
        console.log('🖼️ Image block element detected, creating default block');
        const imageBlockData = JSON.parse(JSON.stringify(element.imageBlockData || {}));
        const newNode = createElementNode(element, targetPosition, { imageBlockData });
        setNodes((nds) => nds.concat(newNode));
        trackActivity('element_added', 'create', 'element', {
          elementId: newNode.id,
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

      if (element.type === 'task-card' || element.type === 'task-card-progress') {
        console.log('📝 Task card element detected, creating default card');
        const taskCardData = element.taskCardData || pendingTaskCardInitialData || {};
        const newNode = createElementNode(element, targetPosition, { taskCardData });
        setNodes((nds) => nds.concat(newNode));
        trackActivity('element_added', 'create', 'element', {
          elementId: newNode.id,
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
      
      // For non-table/chart/flowchart/turnkey elements, create directly
      const newNode = createElementNode(element, targetPosition);
      console.log('🆕 Adding element from double-click:', newNode);
      setNodes((nds) => nds.concat(newNode));
      
      // Add a subtle animation effect
      setTimeout(() => {
        console.log('✨ Element successfully added to canvas via double-click');
      }, 100);
    };

    document.addEventListener('elementDoubleClick', handleElementDoubleClick);
    
    return () => {
      document.removeEventListener('elementDoubleClick', handleElementDoubleClick);
    };
  },  [getAutoPlacementPosition, setNodes]);

  // Handle edge deletion
  const onEdgesDelete = useCallback((edgesToDelete) => {
    console.log('🗑️ Deleting edges:', edgesToDelete);
    setEdges((eds) => eds.filter((edge) => !edgesToDelete.find((e) => e.id === edge.id)));
  }, [setEdges]);

  // Handle node deletion
  const onNodesDelete = useCallback((nodesToDelete) => {
    console.log('🗑️ Deleting nodes:', nodesToDelete);
    setNodes((nds) => nds.filter((node) => !nodesToDelete.find((n) => n.id === node.id)));
  }, [setNodes]);

  // Connection validation
  const isValidConnection = useCallback((connection) => {
    // Prevent self-connections
    if (connection.source === connection.target) {
      console.log('❌ Cannot connect node to itself');
      return false;
    }
    
    // Check if connection already exists
    const existingConnection = edges.find(
      (edge) => 
        edge.source === connection.source && 
        edge.target === connection.target &&
        edge.sourceHandle === connection.sourceHandle &&
        edge.targetHandle === connection.targetHandle
    );
    
    if (existingConnection) {
      console.log('❌ Connection already exists');
      return false;
    }
    
    console.log('✅ Valid connection');
    return true;
  }, [edges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Delete selected nodes/edges with Delete key
      if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodes = nodes.filter(node => node.selected);
        const selectedEdges = edges.filter(edge => edge.selected);
        
        if (selectedNodes.length > 0) {
          onNodesDelete(selectedNodes);
        }
        if (selectedEdges.length > 0) {
          onEdgesDelete(selectedEdges);
        }
      }
      
      // Clear all connections with Ctrl+Shift+C
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        setEdges([]);
        console.log('🧹 All connections cleared');
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [nodes, edges, onNodesDelete, onEdgesDelete, setEdges]);

  // Handle connections between nodes
  const onConnect = useCallback((params) => {
    // Create custom edge with styling
    const edgeId = `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newEdge = {
      ...params,
      id: edgeId,
      type: 'custom',
      animated: true,
      style: { strokeWidth: 2, stroke: '#6b7280' },
      data: { label: '' }
    };
    
    setEdges((eds) => addEdge(newEdge, eds));
    openEdgeLabelModal(edgeId);
    console.log('✅ Connection created (awaiting label):', newEdge);
  }, [setEdges, openEdgeLabelModal]);

  // Handle drag over
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setIsDraggingOver(true);
    console.log('🔄 Drag over React Flow canvas');
  }, []);

  // Handle drag enter
  const onDragEnter = useCallback((event) => {
    event.preventDefault();
    setIsDraggingOver(true);
    console.log('🔄 Drag enter React Flow canvas');
  }, []);

  // Handle drag leave
  const onDragLeave = useCallback((event) => {
    event.preventDefault();
    setIsDraggingOver(false);
    console.log('🔄 Drag leave React Flow canvas');
  }, []);

  // Handle drop from ElementsPanel
  const onDrop = useCallback(
    async (event) => {
      event.preventDefault();
      setIsDraggingOver(false);
      console.log('🎯 Drop event triggered on React Flow canvas');

      const elementData = event.dataTransfer.getData('application/json');
      console.log('📦 Element data retrieved:', elementData);

      if (!elementData) {
        console.log('❌ No element data found in dataTransfer');
        return;
      }

      try {
        const element = JSON.parse(elementData);
        console.log('✅ Parsed element:', element);
        
        // Get the React Flow wrapper bounds
        const reactFlowBounds = event.currentTarget.getBoundingClientRect();
        console.log('📐 React Flow bounds:', reactFlowBounds);
        
        // Calculate position - use simple coordinates if reactFlowInstance not ready
        let position;
        if (reactFlowInstance) {
          position = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
          });
          console.log('🎯 Projected position:', position);
        } else {
          // Fallback positioning
          position = {
            x: event.clientX - reactFlowBounds.left - 100,
            y: event.clientY - reactFlowBounds.top - 50,
          };
          console.log('🎯 Fallback position:', position);
        }

        // Check if it's a table element
        if (isTableElement(element)) {
          console.log('📊 Table element detected in drop, showing configuration modal');
          setPendingTableElement(element);
          setPendingPosition(position);
          setShowTableModal(true);
          return;
        }

        // Check if it's a chart element
        if (isChartElement(element)) {
          console.log('📈 Chart element detected in drop, showing configuration modal');
          setPendingChartElement(element);
          setPendingPosition(position);
          setShowChartModal(true);
          return;
        }

        // Check if it's a list element
        if (isListElement(element)) {
          console.log('📝 List element detected in drop, showing configuration modal');
          setPendingListElement(element);
          setPendingPosition(position);
          setShowListModal(true);
          return;
        }

        // Check if it's a layout element
        if (isLayoutElement(element)) {
          console.log('🏗️ Layout element detected in drop, showing configuration modal');
          setPendingLayoutElement(element);
          setPendingPosition(position);
          setShowLayoutModal(true);
          return;
        }

        // Check if it's a flowchart element
        if (isFlowchartElement(element)) {
          console.log('🔄 Flowchart element detected in drop, creating template');
          createFlowchartTemplate(element, position);
          return;
        }

        // Check if it's a turnkey workflow element
        console.log('🔍 Checking turnkey workflow in drop:', {
          elementType: element?.type,
          elementElementType: element?.elementType,
          elementId: element?.id,
          isTurnkeyWorkflow: element?.type === 'turnkey-workflow' || element?.elementType === 'turnkey-workflow'
        });
        
        if (element?.type === 'turnkey-workflow' || element?.elementType === 'turnkey-workflow' || element?.id === 'turnkey-workflow') {
          console.log('🔧 Turnkey workflow element detected in drop, showing configuration modal');
          setPendingTurnkeyElement(element);
          setPendingPosition(position);
          setShowTurnkeyModal(true);
          return;
        }
        // Check if it's a task card element
        if (element.type === 'image-block') {
          console.log('🖼️ Image block element detected in drop, creating default block');
          const imageBlockData = JSON.parse(JSON.stringify(element.imageBlockData || {}));
          const newNode = createElementNode(element, position, { imageBlockData });
          setNodes((nds) => nds.concat(newNode));
          trackActivity('element_added', 'create', 'element', {
            elementId: newNode.id,
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

        if (element.type === 'task-card' || element.type === 'task-card-progress') {
          console.log('📝 Task card element detected in drop, showing configuration modal');
          setPendingTaskCardElement(element);
          setPendingTaskCardInitialData(element.taskCardData || null);
          setPendingPosition(position);
          setShowTaskCardModal(true);
          return;
        }


        // Check if it's a Smart Note element
        if (element?.type === 'smart-note' || element?.nodeType === 'smartNote') {
          console.log('✨ Smart Note element detected in drop, creating Smart Note node');
        }

        // Check if it's a Calendar Event element
        if (element?.type === 'calendar-event' || element?.nodeType === 'calendarNode') {
          console.log('📅 Calendar Event element detected in drop, creating Calendar Event node');
        }

        // Check if it's an Approval Board element
        if (element?.type === 'approval-board' || element?.nodeType === 'approvalBoard') {
          console.log('✅ Approval Board element detected in drop, creating Approval Board node');
        }

        // For non-table/chart/flowchart/turnkey elements, create directly
        const newNode = createElementNode(element, position);
        console.log('🆕 Creating new node:', newNode);
        console.log('🔍 Node type:', newNode.type);
        console.log('🔍 Node data:', newNode.data);
        setNodes((nds) => {
          const updatedNodes = nds.concat(newNode);
          console.log('📊 Updated nodes array:', updatedNodes);
          return updatedNodes;
        });
        
        // Track the element addition activity
        await trackActivity(
          'element_added',
          'create',
          'element',
          {
            elementId: newNode.id,
            elementType: element.type || 'unknown',
            position: position,
            details: {
              elementName: element.name || element.type,
              canvasAction: true
            }
          }
        );
        
        
        console.log('✅ Element dropped successfully!');
      } catch (error) {
        console.error('❌ Error parsing dropped element:', error);
      }
    },
    [reactFlowInstance, setNodes, trackActivity]
  );
  useEffect(() => {
    updateOffset();
    window.addEventListener('resize', updateOffset);

    return () => window.removeEventListener('resize', updateOffset);
  }, [updateOffset]);

  useEffect(() => {
    if (isFullscreen) {
      previousOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = previousOverflowRef.current || '';
    }

    return () => {
      document.body.style.overflow = previousOverflowRef.current || '';
    };
  }, [isFullscreen]);

  useEffect(() => {
    const headerElements = Array.from(
      document.querySelectorAll('[data-role-header], [data-workspace-header]')
    );

    if (isFullscreen) {
      headerElements.forEach((el) => {
        el.dataset.prevDisplay = el.style.display || '';
        el.style.display = 'none';
      });
    } else {
      headerElements.forEach((el) => {
        if (el.dataset.prevDisplay !== undefined) {
          el.style.display = el.dataset.prevDisplay;
          delete el.dataset.prevDisplay;
        } else {
          el.style.display = '';
        }
      });
    }

    updateOffset();

    return () => {
      headerElements.forEach((el) => {
        if (el.dataset.prevDisplay !== undefined) {
          el.style.display = el.dataset.prevDisplay;
          delete el.dataset.prevDisplay;
        } else {
          el.style.display = '';
        }
      });
    };
  }, [isFullscreen, updateOffset]);

  const containerClasses = isFullscreen
    ? 'fixed left-0 right-0 bottom-0 bg-white z-50 flex flex-col'
    : 'h-full relative flex flex-col';

  const containerStyle = isFullscreen ? { top: `${headerOffset || 0}px` } : undefined;


  return (
    <>
      <style>{controlsCSS}</style>
      <div className={containerClasses} style={containerStyle}>

      
      {/* Subtask Header */}
      <div className="px-8 pb-4">
        <div className="flex items-center justify-between">
          <div>
          <h2 className="text-lg font-semibold text-gray-900">
              {selectedSubtask?.name || workspace?.title || 'Workspace'}
            </h2>
            <p className="text-gray-600 mt-2">Canvas workspace for {selectedSubtask?.name || workspace?.title || 'your project'}</p>
          </div>
          
          {/* Canvas Actions */}
          <div className="flex items-center space-x-3 relative z-20 mt-2">
            <button 
              onClick={onToggleSidebars}
              className="p-2 border border-gray-200  hover:bg-gray-200 text-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={sidebarCollapsed ? 'Show Sidebars' : 'Hide Sidebars'}
              aria-label={sidebarCollapsed ? 'Show sidebars' : 'Hide sidebars'}
            >
               {sidebarCollapsed ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h4M4 12h16M4 18h4" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 6h6M14 18h6" />
                </svg>
              )}
              <span className="sr-only">{sidebarCollapsed ? 'Show sidebars' : 'Hide sidebars'}</span>
            </button>

            <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              title={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
              aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>

            <button
              className="p-2  border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors   flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Preview"
              aria-label="Preview"
            >
              <Eye className="w-5 h-5" />
              <span className="sr-only">Preview</span>
            </button>

            <button 
              onClick={async () => {
                console.log('🔄 Manual save triggered');
                if (onSaveWorkspace && workspace?.workspaceId) {
                  const saveData = {
                    nodes,
                    edges,
                    zoomLevel,
                    canvasSettings: {}
                  };
                  setSaveStatus('saving');
                  try {
                    await onSaveWorkspace(saveData);
                    setSaveStatus('saved');
                    setLastSaved(new Date());
                    setTimeout(() => setSaveStatus('idle'), 2000);
                  } catch (error) {
                    setSaveStatus('error');
                    setTimeout(() => setSaveStatus('idle'), 3000);
                  }
                } else {
                  console.error('Cannot save: missing onSaveWorkspace or workspaceId');
                }
              }}
              disabled={saveStatus === 'saving'}
              className={`p-2 rounded-lg transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                saveStatus === 'saving' 
                  ? 'bg-gray-400 cursor-not-allowed text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              title={saveStatus === 'saving' ? 'Saving workspace' : 'Save workspace'}
              aria-label={saveStatus === 'saving' ? 'Saving workspace' : 'Save workspace'}

            >
              {saveStatus === 'saving' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-5 h-5" />
              )}
               <span className="sr-only">{saveStatus === 'saving' ? 'Saving...' : 'Save'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* React Flow Canvas */}
      <div 
        className="flex-1 relative overflow-hidden" 
        style={{ 
          width: '100%', 
          height: '100%'
        }}
      >
        <ReactFlow
          style={{ width: '100%', height: '100%' }}
          nodes={nodes}
          edges={edges}
          onNodesChange={canEdit ? onNodesChange : undefined}
          onEdgesChange={canEdit ? onEdgesChange : undefined}
          onNodesDelete={canEdit ? onNodesDelete : undefined}
          onEdgesDelete={canEdit ? onEdgesDelete : undefined}
          onConnect={canEdit ? onConnect : undefined}
          onNodeClick={onNodeClick}
          onEdgeClick={canEdit ? handleEdgeClick : undefined}
          onNodeContextMenu={canEdit ? onNodeContextMenu : undefined}
          onPaneClick={onPaneClick}
          onSelectionChange={canEdit ? handleSelectionChange : undefined}
          isValidConnection={canEdit ? isValidConnection : () => false}
          onInit={(instance) => {
            setReactFlowInstance(instance);
            console.log('✅ ReactFlow instance initialized:', instance);
          }}
          onViewportChange={onViewportChange}
          onDrop={canEdit ? onDrop : undefined}
          onDragOver={canEdit ? onDragOver : undefined}
          onDragEnter={canEdit ? onDragEnter : undefined}
          nodesDraggable
          nodesConnectable={canEdit}
          elementsSelectable={canEdit}
          onDragLeave={onDragLeave}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          minZoom={0.1}
          maxZoom={2}
          panOnDrag={[2]}
          panOnScroll
          panOnScrollMode="free"
          panActivationKey={canEdit ? 'Space' : undefined}
          connectionLineType="smoothstep"
          connectionLineStyle={{ strokeWidth: 2, stroke: '#6b7280' }}
          className={`bg-white transition-all duration-200 ${
            isDraggingOver ? 'bg-blue-50 ring-4 ring-blue-300' : ''
          }`}
        >
          {/* Grid Background */}
          <Background 
            color="#a0a0a0" 
            gap={24} 
            size={1.6}
            variant="dots"
          />
          
          {/* Controls (zoom, fit view, etc.) */}
          <Controls 
            position="bottom-right"
            className="bg-white shadow-lg rounded-lg"
            showZoom={true}
            showFitView={true}
            showInteractive={true}
            fitViewOptions={{ padding: 0.1 }}
          />
          
          {/* Top Panel with Instructions and Connection Tools */}
          <Panel position="top-right" className="mt-4 mr-4">
            <div className="bg-white shadow-lg rounded-lg px-4 py-2 border border-gray-200">
            <div className="flex flex-wrap items-center gap-4">
                {/* <div className="text-xs text-gray-600 space-y-1 max-w-xs">
                  <p>Drag elements to reorganise your canvas and connect steps with the handles.</p>
                  <p>Use the selection icon to pick multiple items for grouping or bulk actions.</p>
                </div> */}
                {nodes.length >= 2 && (
                   <div className="flex items-center gap-2">
                    <button
                      onClick={handleSelectionModeToggle}
                      className={`p-2 rounded-lg transition-colors border ${
                        isSelectionMode
                          ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                      }`}
                      title={isSelectionMode ? 'Exit selection mode' : 'Select multiple elements'}
                      aria-pressed={isSelectionMode}
                    >
                      {isSelectionMode ? (
                        <X className="w-4 h-4" />
                      ) : (
                        <Users className="w-4 h-4" />
                      )}
                      <span className="sr-only">
                        {isSelectionMode ? 'Exit selection mode' : 'Select multiple elements'}
                      </span>
                    </button>
                    
                    {/* Group Button - only show when elements are selected */}
                    {isSelectionMode && (
                      <span className="text-xs font-medium text-blue-600">
                        Selecting {manuallySelectedNodes.length}
                      </span>
                    )}
                    {isSelectionMode && manuallySelectedNodes.length >= 2 && (
                      
                      <button
                        onClick={handleGroupIntoGrid}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                      >
                         <Grid className="w-4 h-4" />
                         <span>Group ({manuallySelectedNodes.length})</span>
                      </button>
                    )}
                  </div>
                )}
                
                {/* Connection Tools */}
                {nodes.length > 1 && (
                  <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
                    <button
                      onClick={() => {
                        setEdges([]);
                        console.log('🧹 All connections cleared');
                      }}
                      className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                      title="Clear all connections (Ctrl+Shift+C)"
                    >
                      Clear All
                    </button>
                    {/* <span className="text-xs text-gray-400">
                      Delete: Select & press Del
                    </span> */}
                  </div>
                )}
              </div>
            </div>
          </Panel>

          {/* Flowchart Toolbar */}
          {showFlowchartToolbar && selectedFlowchartGroup && (
            <Panel position="top-right">
              <div className="bg-white shadow-lg rounded-lg border border-gray-200 p-4 min-w-[250px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Extend Flowchart</h3>
                  <button
                    onClick={() => {
                      setShowFlowchartToolbar(false);
                      setSelectedFlowchartGroup(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <p className="text-xs text-gray-600 mb-3">Add new elements to your flowchart:</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => addElementToFlowchart('decision')}
                      className="flex items-center space-x-2 p-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"
                    >
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span>Decision</span>
                    </button>
                    
                    <button
                      onClick={() => addElementToFlowchart('outcome')}
                      className="flex items-center space-x-2 p-2 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors"
                    >
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span>Outcome</span>
                    </button>
                    
                    <button
                      onClick={() => addElementToFlowchart('process')}
                      className="flex items-center space-x-2 p-2 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md transition-colors"
                    >
                      <div className="w-3 h-3 bg-indigo-500 rounded"></div>
                      <span>Process</span>
                    </button>
                    
                    <button
                      onClick={() => addElementToFlowchart('text')}
                      className="flex items-center space-x-2 p-2 text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md transition-colors"
                    >
                      <div className="w-3 h-3 bg-gray-500 rounded"></div>
                      <span>Text</span>
                    </button>
                  </div>
                  
                  <div className="pt-2 mt-3 border-t border-gray-200">
                    <button
                      onClick={() => deleteFlowchartGroup(selectedFlowchartGroup)}
                      className="w-full flex items-center justify-center space-x-2 p-2 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded-md transition-colors"
                    >
                      <span>🗑️</span>
                      <span>Delete Entire Flowchart</span>
                    </button>
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {/* Drop Indicator Overlay */}
          {isDraggingOver && (
            <Panel position="center">
              <div className="text-center pointer-events-none">
                <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <Plus className="w-16 h-16 text-blue-500" />
                </div>
                <h3 className="text-2xl font-bold text-blue-600 mb-2">Drop Here!</h3>
                <p className="text-blue-500 mb-6">Release to add element to canvas</p>
              </div>
            </Panel>
          )}

          {/* Empty State Overlay */}
          {nodes.length === 0 && !isDraggingOver && (
            // <Panel position="center">
            //   <div className="text-center pointer-events-none">
            //     <div className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 opacity-50">
            //       <Plus className="w-16 h-16 text-gray-400" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-2.5">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto opacity-50">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-lg font-semibold text-gray-400">Start Creating</h3>
                  <p className="text-gray-400 text-xs">Drag elements from the Elements panel</p>
                  <p className="text-gray-300 text-[11px]">or double-click any element to add it</p>
                </div>
                {/* <h3 className="text-2xl font-bold text-gray-400 mb-2">Start Creating</h3>
                <p className="text-gray-400 mb-2">Drag elements from the Elements panel</p>
                <p className="text-gray-400 text-sm">or double-click any element to add it</p>
              </div> */}
              </div>
            {/* </Panel> */}
            </div>
          )}

          {/* Keyboard shortcuts help
          {canEdit && nodes.length > 0 && (
            <Panel position="bottom-left" className="pointer-events-none">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-gray-200 shadow-sm">
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex items-center space-x-2">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Ctrl+D</kbd>
                    <span>Duplicate selected</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Right-click</kbd>
                    <span>Context menu</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">Del</kbd>
                    <span>Delete selected</span>
                  </div>
                </div>
              </div>
            </Panel>
          )} */}
        </ReactFlow>
        
        {/* Read-only overlay when user doesn't have edit permissions */}
        {!canEdit && (
          <div className="absolute inset-0 bg-black bg-opacity-5 pointer-events-none z-10 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200 pointer-events-auto">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Canvas View Only</h3>
                  <p className="text-[11px] leading-snug text-gray-500">
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Table Configuration Modal */}
      <TableConfigModal
        isOpen={showTableModal}
        onClose={handleTableModalClose}
        onConfirm={handleTableConfigConfirm}
        tableType={pendingTableElement?.id || pendingTableElement?.name}
      />

      {/* Chart Configuration Modal */}
      <ChartConfigModal
        isOpen={showChartModal}
        onClose={handleChartModalClose}
        onConfirm={handleChartConfigConfirm}
        chartType={pendingChartElement?.id || pendingChartElement?.name}
      />

      {/* Turnkey Configuration Modal */}
      <TurnkeyConfigModal
        isOpen={showTurnkeyModal}
        onClose={handleTurnkeyModalClose}
        onSave={handleTurnkeyConfigConfirm}
        initialData={pendingTurnkeyElement}
      />

      <ListConfigModal
        isOpen={showListModal}
        onClose={handleListModalClose}
        onConfirm={handleListConfigConfirm}
        listType={pendingListElement?.id || pendingListElement?.name}
      />

      {/* Layout Configuration Modal */}
      <LayoutConfigModal
        isOpen={showLayoutModal}
        onClose={handleLayoutModalClose}
        onConfirm={handleLayoutConfigConfirm}
        layoutType={pendingLayoutElement?.id || pendingLayoutElement?.type}
        layoutData={pendingLayoutElement}
      />

      {/* Grouping Modal */}
      <GroupingModal
        isOpen={showGroupingModal}
        onClose={handleGroupingModalClose}
        onConfirm={handleGroupingConfirm}
        selectedNodes={manuallySelectedNodes}
      />

      {/* Grouping Toolbar */}
      <GroupingToolbar
        isVisible={showGroupingToolbar}
        selectedCount={manuallySelectedNodes.length}
        onGroupIntoGrid={handleGroupIntoGrid}
        onClose={() => {
          console.log('🔄 Closing grouping toolbar');
          setShowGroupingToolbar(false);
        }}
        position={{ x: window.innerWidth / 2, y: 150 }}
      />

      {/* Context Menu */}
      <ContextMenu
        isVisible={contextMenu.isVisible}
        position={contextMenu.position}
        selectedNodes={contextMenu.selectedNodes}
        onClose={handleContextMenuClose}
        onDuplicate={handleContextMenuDuplicate}
        onDelete={handleContextMenuDelete}
        onEdit={handleContextMenuEdit}
        userPermissions={{ canEdit }}
      />
      {edgeLabelModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Name Connection</h3>
            <p className="text-sm text-gray-500 mb-4">Assign a meaningful name to this connection.</p>
            <input
              type="text"
              autoFocus
              value={edgeLabelInput}
              onChange={(e) => setEdgeLabelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleEdgeLabelSave();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  closeEdgeLabelModal();
                }
              }}
              placeholder="Connection name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEdgeLabelModal}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEdgeLabelSave}
                className="px-3 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={!edgeLabelInput.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default CanvasWorkspace;
