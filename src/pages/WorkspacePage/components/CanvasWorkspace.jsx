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
import { getWorkspaceById } from '../utils/workspaceApi';
import config from '../../../config/env';

// Custom CSS to ensure controls work properly and add auto-connection effects
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
  
  /* Auto-connected edge animations */
  .auto-connected-edge {
    animation: connectionGlow 2s ease-in-out infinite;
  }
  
  @keyframes connectionGlow {
    0%, 100% {
      filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.4));
    }
    50% {
      filter: drop-shadow(0 0 12px rgba(59, 130, 246, 0.8));
    }
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
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
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
  // Lock canvas if workspace is marked completed, regardless of userPermissions
  const isWorkspaceCompleted = workspace?.status === 'project completed';
  const canEdit = userRole === 'pm' ? true : (!isWorkspaceCompleted && userPermissions?.canEdit);
  
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

  // Utility function to clean up orphaned nodes (nodes with invalid parentNode references)
  // Defined outside useCallback since it's used in initialization
  const cleanupOrphanedNodesHelper = (nodesToClean) => {
    if (!nodesToClean || !Array.isArray(nodesToClean) || nodesToClean.length === 0) return [];
    
    try {
      // Get all node IDs
      const nodeIds = new Set(nodesToClean.map(n => n?.id).filter(Boolean));
      
      // First pass: collect parent nodes (must come before children)
      const parentNodes = [];
      const childNodes = [];
      const regularNodes = [];
      
      nodesToClean.forEach(node => {
        if (!node || !node.id) return; // Skip invalid nodes
        
        if (node.data?.isGroupContainer) {
          parentNodes.push(node);
        } else if (node.parentNode) {
          // Check if parent exists
          if (nodeIds.has(node.parentNode)) {
            childNodes.push(node);
          } else {
            // Parent doesn't exist - remove parentNode reference
            console.log('🧹 Cleaning orphaned node:', node.id, '- parent not found:', node.parentNode);
            regularNodes.push({
              ...node,
              parentNode: undefined,
              extent: undefined,
              data: {
                ...node.data,
                isGroupChild: false,
                parentGroupId: undefined
              }
            });
          }
        } else {
          regularNodes.push(node);
        }
      });
      
      // Return nodes in correct order: parents first, then children, then regular
      return [...parentNodes, ...childNodes, ...regularNodes];
    } catch (err) {
      console.error('❌ Error cleaning up orphaned nodes:', err);
      // Return original array if cleanup fails
      return nodesToClean;
    }
  };

  const canvasData = getCanvasData();
  // Clean up nodes on initialization to remove orphaned parent references
  const initialNodes = cleanupOrphanedNodesHelper(canvasData.nodes);
  const [nodes, setNodesRaw, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(canvasData.edges);
  
  // Undo/Redo History Management
  const historyRef = useRef({
    past: [],
    future: [],
    maxHistorySize: 50 // Limit history to prevent memory issues
  });

  // Helper to create a snapshot of current state
  const createSnapshot = useCallback(() => {
    return {
      nodes: nodes,
      edges: edges,
      timestamp: Date.now()
    };
  }, [nodes, edges]);

  // Add state to history (called after changes)
  const pushToHistory = useCallback(() => {
    historyRef.current.past.push(createSnapshot());
    // Limit history size
    if (historyRef.current.past.length > historyRef.current.maxHistorySize) {
      historyRef.current.past.shift();
    }
    // Clear future history when new action is performed
    historyRef.current.future = [];
  }, [createSnapshot]);

  // Undo function
  const handleUndo = useCallback(() => {
    if (historyRef.current.past.length === 0) {
      console.log('⏮️ Nothing to undo');
      return;
    }

    // Save current state to future
    historyRef.current.future.push(createSnapshot());

    // Get previous state
    const previousSnapshot = historyRef.current.past.pop();
    if (previousSnapshot) {
      console.log('⏮️ Undo:', previousSnapshot);
      setNodesRaw(previousSnapshot.nodes);
      setEdges(previousSnapshot.edges);
    }
  }, [createSnapshot, setNodesRaw, setEdges]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (historyRef.current.future.length === 0) {
      console.log('⏭️ Nothing to redo');
      return;
    }

    // Save current state to past
    historyRef.current.past.push(createSnapshot());

    // Get next state
    const nextSnapshot = historyRef.current.future.pop();
    if (nextSnapshot) {
      console.log('⏭️ Redo:', nextSnapshot);
      setNodesRaw(nextSnapshot.nodes);
      setEdges(nextSnapshot.edges);
    }
  }, [createSnapshot, setNodesRaw, setEdges]);

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Check if user is typing in an input/textarea
      const isInputElement = event.target.tagName === 'INPUT' ||
                            event.target.tagName === 'TEXTAREA' ||
                            event.target.contentEditable === 'true';

      if (isInputElement) {
        // Still allow undo/redo in input fields
      }

      // Ctrl+Z (or Cmd+Z on Mac) for Undo
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      }
      // Ctrl+Y or Ctrl+Shift+Z for Redo
      else if (((event.ctrlKey || event.metaKey) && event.key === 'y') ||
               ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z')) {
        event.preventDefault();
        handleRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);
  
  // Wrapper around setNodes to validate parent-child relationships
  const setNodes = useCallback((updateFn) => {
    try {
      // If it's a function, call it with current nodes
      if (typeof updateFn === 'function') {
        setNodesRaw(currentNodes => {
          const updatedNodes = updateFn(currentNodes);
          // Validate and clean before applying
          const validatedNodes = cleanupOrphanedNodesHelper(updatedNodes);
          return validatedNodes;
        });
      } else {
        // If it's an array, validate directly
        const validatedNodes = cleanupOrphanedNodesHelper(updateFn);
        setNodesRaw(validatedNodes);
      }
    } catch (err) {
      console.error('❌ Error in setNodes wrapper:', err);
      // Fail silently to prevent crashes
    }
  }, []);

  // Emit nodes change event for the Elements Overview sidebar
  useEffect(() => {
    const event = new CustomEvent('canvasNodesChanged', {
      detail: { nodes }
    });
    document.dispatchEvent(event);
  }, [nodes]);
  
  // Element sequence counter - tracks the order elements are added
  const elementSequenceRef = useRef(() => {
    // Initialize with the count of existing nodes that have sequence numbers
    const existingNodes = canvasData.nodes || [];
    const maxSequence = existingNodes.reduce((max, node) => {
      const seq = node.data?.sequenceNumber || 0;
      return Math.max(max, seq);
    }, 0);
    return maxSequence;
  });
  
  // Initialize ref value
  if (typeof elementSequenceRef.current === 'function') {
    elementSequenceRef.current = elementSequenceRef.current();
  }

  // Track the last added element for auto-connection
  const lastAddedNodeIdRef = useRef(null);
  // Flag to prevent workspace data refresh from overwriting local node changes
  const isUpdatingNodesLocallyRef = useRef(false);

  // Function to clear all elements from canvas
  const clearCanvas = () => {
    setNodes([]);
    setEdges([]);
    elementSequenceRef.current = 0; // Reset sequence when canvas is cleared
    lastAddedNodeIdRef.current = null; // Reset last added element reference
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
  const [edgeLabelModal, setEdgeLabelModal] = useState({ 
    isOpen: false, 
    edgeId: null, 
    initialLabel: '',
    edgeStyle: 'default', // default, dashed, dotted, animated
    edgeColor: '#3b82f6' // blue default
  });
  const [edgeLabelInput, setEdgeLabelInput] = useState('');
  const [edgeStyleInput, setEdgeStyleInput] = useState('default');
  const [edgeColorInput, setEdgeColorInput] = useState('#3b82f6');
  
  
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
  const [isTextModeActive, setIsTextModeActive] = useState(false);
  const [textModeConfig, setTextModeConfig] = useState(null);

  // Saving state
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'
  const [lastSaved, setLastSaved] = useState(null);

  // Wrapped cleanup function using the helper
  const cleanupOrphanedNodes = useCallback((nodesToClean) => {
    return cleanupOrphanedNodesHelper(nodesToClean);
  }, []);

  // Refresh workspace data when navigating back or on mount to ensure latest state is loaded
  // BUT only do this on initial mount, not when nodes change (to prevent losing local additions)
  const hasRefreshedRef = useRef(false);
  
  useEffect(() => {
    const refreshWorkspaceData = async () => {
      if (!workspace?.workspaceId || hasRefreshedRef.current) return;
      
      try {
        console.log('🔄 Refreshing workspace data to ensure latest state is persisted...');
        hasRefreshedRef.current = true;
        const freshWorkspace = await getWorkspaceById(workspace.workspaceId);
        
        if (freshWorkspace && freshWorkspace.nodes) {
          console.log('✅ Workspace data refreshed - loading latest nodes with persisted states');
          // Only update if we haven't added any local nodes yet
          // This ensures that locally added elements aren't lost
          if (nodes.length === 0 && freshWorkspace.nodes.length > 0) {
            // Clean up nodes with invalid parent references
            const cleanedNodes = cleanupOrphanedNodes(freshWorkspace.nodes);
            setNodes(cleanedNodes);
            if (freshWorkspace.edges) {
              setEdges(freshWorkspace.edges);
            }
          }
        }
      } catch (err) {
        console.error('Error refreshing workspace data:', err);
      }
    };

    // Use a timeout to ensure this runs after component is fully mounted
    const timeoutId = setTimeout(() => {
      refreshWorkspaceData();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [workspace?.workspaceId]);

  // Update canvas data when selectedSubtask changes
  // BUT: Skip this if we're currently updating nodes locally (to prevent losing new additions)
  useEffect(() => {
    // If we're actively updating nodes locally (like after drop), skip this refresh
    if (isUpdatingNodesLocallyRef.current) {
      console.log('⏭️ Skipping canvas data update - currently updating nodes locally');
      return;
    }

    const newCanvasData = getCanvasData();
    console.log('🔄 CanvasWorkspace: Updating canvas data for subtask change', {
      subtaskId: selectedSubtask?.id,
      nodesCount: newCanvasData.nodes.length,
      edgesCount: newCanvasData.edges.length,
      zoomLevel: newCanvasData.zoomLevel
    });
    
    // Directly clear and set nodes to ensure fresh data for new subtask
    // Use setNodesRaw to bypass cleanup validation temporarily
    if (Array.isArray(newCanvasData.nodes)) {
      setNodesRaw(newCanvasData.nodes);
    }
    if (Array.isArray(newCanvasData.edges)) {
      setEdges(newCanvasData.edges);
    }
    updateZoomLevel(newCanvasData.zoomLevel);
    
    // Update last added node reference to the most recently added node (last in array)
    if (newCanvasData.nodes && newCanvasData.nodes.length > 0) {
      const lastNode = newCanvasData.nodes[newCanvasData.nodes.length - 1];
      lastAddedNodeIdRef.current = lastNode.id;
      console.log('📌 Set last added element to:', lastNode.id);
    } else {
      lastAddedNodeIdRef.current = null;
      console.log('📌 Cleared last added element reference');
    }
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
          
          // Add to history after successful save
          pushToHistory();
          
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

  // Helper function for smart auto-connection
  const autoConnectNearbyNodes = (newNode, allNodes, CONNECTION_THRESHOLD = 250) => {
    console.log('🔗 autoConnectNearbyNodes: Analyzing nodes for auto-connection');
    
    // Find nearby nodes based on distance
    const nearbyNodes = allNodes.filter(node => {
      if (node.id === newNode.id) return false;
      
      const dx = node.position.x - newNode.position.x;
      const dy = node.position.y - newNode.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      return distance < CONNECTION_THRESHOLD;
    });

    console.log(`🎯 Found ${nearbyNodes.length} nearby nodes for auto-connection`);

    // Determine connection direction based on relative position
    const connectionsToCreate = [];
    
    nearbyNodes.forEach((nearbyNode) => {
      const dx = newNode.position.x - nearbyNode.position.x;
      const dy = newNode.position.y - nearbyNode.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Determine direction
      let sourceId, targetId;
      const isToTheLeft = dx > 0; // new node is to the right
      const isAbove = dy > 0; // new node is below
      
      if (Math.abs(dx) > Math.abs(dy)) {
        // Primarily horizontal layout
        if (isToTheLeft) {
          // new node is to the right - connect from old to new
          sourceId = nearbyNode.id;
          targetId = newNode.id;
        } else {
          // new node is to the left - connect from new to old
          sourceId = newNode.id;
          targetId = nearbyNode.id;
        }
      } else {
        // Primarily vertical layout
        if (isAbove) {
          // new node is below - connect from old to new
          sourceId = nearbyNode.id;
          targetId = newNode.id;
        } else {
          // new node is above - connect from new to old
          sourceId = newNode.id;
          targetId = nearbyNode.id;
        }
      }
      
      // Check if connection already exists
      const connectionExists = false; // We'll check this when adding
      
      connectionsToCreate.push({
        source: sourceId,
        target: targetId,
        distance: Math.round(distance),
        direction: isToTheLeft ? 'left' : isAbove ? 'above' : 'right'
      });
      
      console.log(`➡️ Will connect: ${sourceId} → ${targetId} (distance: ${Math.round(distance)}px, direction: ${isToTheLeft ? 'left' : isAbove ? 'above' : 'right'})`);
    });

    return connectionsToCreate;
  };

  // Helper function to create a node with sequence number
  const createElementNode = (element, position, customData = null) => {
    // Get the next sequence number (count of existing sequenced elements + 1)
    const sequenceNum = (nodes.filter(n => n.data?.sequenceNumber !== undefined && n.data.sequenceNumber !== null).length) + 1;
    
    console.log('🏗️ createElementNode called with:', { element, position, customData, sequenceNum, totalNodes: nodes.length });
    
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
        
        // Element metadata - who added and when
        addedBy: currentUser?.name || currentUser?.email || 'Unknown User',
        addedByEmail: currentUser?.email || null,
        addedByRole: currentUser?.role || 'vendor', // 'vendor' or 'pm'
        addedAt: new Date().toISOString(),
        
        // Element sequence number - order in which it was added
        sequenceNumber: sequenceNum,
        
        // Approval workflow - initially pending
        approvalStatus: 'pending', // 'pending', 'approved', 'rejected'
        approvedBy: null,
        approvedByEmail: null,
        approvedByRole: null,
        approvalTimestamp: null,
        approvalReason: null,
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

  // Helper function to auto-connect a newly added node to the previous element
  const autoConnectNewNode = (newNode) => {
    const previousNodeId = lastAddedNodeIdRef.current;
    console.log('📌 Previous node ID stored:', previousNodeId);
    
    if (previousNodeId) {
      setNodes((currentNodes) => {
        // Find the previous node
        const previousNode = currentNodes.find(node => node.id === previousNodeId);
        
        if (previousNode) {
          console.log(`🎯 Found previous node: ${previousNodeId} at position (${previousNode.position.x}, ${previousNode.position.y})`);
          
          // Determine connection direction based on relative position
          const dx = newNode.position.x - previousNode.position.x;
          const dy = newNode.position.y - previousNode.position.y;
          
          let sourceId = previousNode.id;
          let targetId = newNode.id;
          let sourceHandle = 'right-out';
          let targetHandle = 'left-in';
          
          // Adjust handles based on direction
          if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal layout
            if (dx < 0) {
              // New node is to the left, reverse direction
              sourceId = newNode.id;
              targetId = previousNode.id;
            }
          } else {
            // Vertical layout
            if (dy > 0) {
              // New node is below - connect top to bottom
              sourceId = previousNode.id;
              targetId = newNode.id;
              sourceHandle = 'bottom-out';
              targetHandle = 'top-in';
            } else {
              // New node is above - connect bottom to top
              sourceId = newNode.id;
              targetId = previousNode.id;
              sourceHandle = 'bottom-out';
              targetHandle = 'top-in';
            }
          }
          
          // Queue the edge creation for after nodes are updated
          setEdges((currentEdges) => {
            console.log('📐 Creating edge from', sourceId, 'to', targetId);
            
            // Check if connection already exists
            const connectionExists = currentEdges.some(
              edge => (edge.source === sourceId && edge.target === targetId && 
                       edge.sourceHandle === sourceHandle && edge.targetHandle === targetHandle) ||
                      (edge.source === targetId && edge.target === sourceId)
            );
            
            if (!connectionExists) {
              const edgeId = `edge_auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
              const newEdge = {
                id: edgeId,
                source: sourceId,
                target: targetId,
                sourceHandle: sourceHandle,
                targetHandle: targetHandle,
                type: 'custom',
                animated: true,
                style: { 
                  strokeWidth: 3, 
                  stroke: '#3b82f6',
                },
                data: { 
                  label: '',
                  isAutoConnected: true
                }
              };
              
              console.log(`✅ AUTO-CONNECTED: ${sourceId} → ${targetId}`);
              return [...currentEdges, newEdge];
            } else {
              console.log(`⏭️ Connection already exists between: ${sourceId} ↔ ${targetId}`);
              return currentEdges;
            }
          });
        } else {
          console.log(`⚠️ Previous node (${previousNodeId}) not found in current nodes`);
        }
        
        return currentNodes;
      });
    } else {
      console.log('ℹ️ No previous element - this is the first element');
    }
    
    // Update the reference to track this new node as the last added
    lastAddedNodeIdRef.current = newNode.id;
    console.log('📌 Updated last added element to:', newNode.id);
  };

  // Handle table configuration confirmation
  const handleTableConfigConfirm = async (tableConfig) => {
    if (pendingTableElement && pendingPosition) {
      const finalPosition = findNonCollidingPosition(pendingPosition, 400, 300);
      const newNode = createElementNode(pendingTableElement, finalPosition, tableConfig);
      console.log('🆕 Creating table with custom data:', newNode);
      setNodes((nds) => nds.concat(newNode));
      
      // Auto-connect to previous element
      autoConnectNewNode(newNode);
      
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
      const finalPosition = findNonCollidingPosition(pendingPosition, 450, 350);
      const newNode = createElementNode(pendingChartElement, finalPosition, chartConfig);
      console.log('🆕 Creating chart with custom data:', newNode);
      setNodes((nds) => nds.concat(newNode));
      
      // Auto-connect to previous element
      autoConnectNewNode(newNode);
      
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
        const finalPosition = findNonCollidingPosition(pendingPosition, 350, 250);
        const newNode = createElementNode(elementWithConfig, finalPosition, turnkeyConfig);
        console.log('🆕 Created turnkey workflow node:', newNode);
        setNodes((nds) => nds.concat(newNode));
        
        // Auto-connect to previous element
        autoConnectNewNode(newNode);
        
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
      const finalPosition = findNonCollidingPosition(pendingPosition, 350, 300);
      const newNode = createElementNode(pendingListElement, finalPosition, listConfig);
      console.log('🆕 Creating list with custom data:', newNode);
      setNodes((nds) => nds.concat(newNode));
      
      // Auto-connect to previous element
      autoConnectNewNode(newNode);
      
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
      const finalPosition = findNonCollidingPosition(pendingPosition, 400, 300);
      const newNode = createLayoutNode(pendingLayoutElement, finalPosition, layoutConfig);
      console.log('🆕 Creating layout with custom data:', newNode);
      setNodes((nds) => nds.concat(newNode));
      
      // Auto-connect to previous element
      autoConnectNewNode(newNode);
      
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
      const finalPosition = findNonCollidingPosition(pendingPosition, 300, 250);
      const newNode = createElementNode(pendingTaskCardElement, finalPosition, { taskCardData: taskCardConfig });
      setNodes((nds) => nds.concat(newNode));
      
      // Auto-connect to previous element
      autoConnectNewNode(newNode);

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
    // Find the edge to get its current style
    const edge = edges.find(e => e.id === edgeId);
    const currentStyle = edge?.data?.edgeStyle || 'default';
    const currentColor = edge?.data?.edgeColor || '#3b82f6';
    
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
    setEdgeLabelModal({ isOpen: false, edgeId: null, initialLabel: '', edgeStyle: 'default', edgeColor: '#3b82f6' });
    setEdgeLabelInput('');
    setEdgeStyleInput('default');
    setEdgeColorInput('#3b82f6');
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

      // Build style based on edgeStyleInput
      let strokeDasharray = undefined;
      let animated = false;
      
      switch (edgeStyleInput) {
        case 'dashed':
          strokeDasharray = '10,5';
          break;
        case 'dotted':
          strokeDasharray = '2,4';
          break;
        case 'animated':
          animated = true;
          break;
        default:
          break;
      }

      return {
        ...edge,
        animated,
        style: {
          ...(edge.style || {}),
          stroke: edgeColorInput,
          strokeWidth: 2,
          strokeDasharray,
        },
        data: {
          ...(edge.data || {}),
          label: edgeLabelInput.trim(),
          edgeStyle: edgeStyleInput,
          edgeColor: edgeColorInput,
        }
      };
    }));

    closeEdgeLabelModal();
  }, [edgeLabelInput, edgeStyleInput, edgeColorInput, edgeLabelModal.edgeId, closeEdgeLabelModal, setEdges]);

  // Delete a specific edge
  const handleDeleteEdge = useCallback(() => {
    if (!edgeLabelModal.edgeId) {
      closeEdgeLabelModal();
      return;
    }
    
    setEdges((eds) => eds.filter((edge) => edge.id !== edgeLabelModal.edgeId));
    closeEdgeLabelModal();
    console.log('🗑️ Edge deleted:', edgeLabelModal.edgeId);
  }, [edgeLabelModal.edgeId, closeEdgeLabelModal, setEdges]);


  // Handle node selection changes
  const handleSelectionChange = useCallback((params) => {
    const selectedNodeIds = params.nodes.map(node => node.id);
    const selectedNodeObjects = nodes.filter(node => selectedNodeIds.includes(node.id));
    
    setSelectedNodes(selectedNodeObjects);
    
    // If a text node is selected, emit event to update TextPanel
    if (selectedNodeObjects.length === 1 && selectedNodeObjects[0].type === 'textNode') {
      const textNode = selectedNodeObjects[0];
      const selectEvent = new CustomEvent('selectTextElement', {
        detail: {
          id: textNode.id,
          ...textNode.data
        }
      });
      document.dispatchEvent(selectEvent);
    }
    
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
    console.log('✅ Creating grouped container with grid layout:', groupingConfig);
    
    // Use manuallySelectedNodes for consistency
    const nodesToGroup = manuallySelectedNodes;
    
    if (nodesToGroup.length === 0) {
      console.log('❌ No nodes to group');
      return;
    }
    
    // Get grid configuration from modal
    const gridColumns = groupingConfig.gridColumns || 2;
    const gridRows = groupingConfig.gridRows || Math.ceil(nodesToGroup.length / gridColumns);
    
    // Calculate cell dimensions based on actual node sizes with generous spacing
    const cellWidth = 420;  // Width for each cell (increased for spacing)
    const cellHeight = 480; // Height for each cell (increased for spacing)
    const cellGap = 30; // Gap between cells (increased)
    const cellInnerPadding = 15; // Inner padding around each node within cell
    const containerPaddingX = 35; // Horizontal padding inside container (increased to ensure elements fit)
    const containerPaddingTop = 65; // Top padding (for header + spacing)
    const containerPaddingBottom = 35; // Bottom padding (increased to ensure elements fit)
    
    // Calculate container dimensions - ensure it perfectly fits the grid
    // Formula: (cellWidth * columns) + (gaps between cells) + (padding on both sides)
    const containerWidth = (cellWidth * gridColumns) + (cellGap * Math.max(0, gridColumns - 1)) + (containerPaddingX * 2);
    const containerHeight = (cellHeight * gridRows) + (cellGap * Math.max(0, gridRows - 1)) + containerPaddingTop + containerPaddingBottom;
    
    // Get the top-left position based on selected nodes
    const minX = Math.min(...nodesToGroup.map(n => n.position.x));
    const minY = Math.min(...nodesToGroup.map(n => n.position.y));
    
    // Position container with proper offset
    const containerX = minX - containerPaddingX;
    const containerY = minY - containerPaddingTop;
    
    // Generate unique group ID
    const groupId = `group_${Date.now()}`;
    
    // Create the group container node (parent)
    const groupContainerNode = {
      id: groupId,
      type: 'layoutNode',
      position: { x: containerX, y: containerY },
      style: {
        width: containerWidth,
        height: containerHeight,
        zIndex: -1, // Behind child nodes
      },
      data: {
        workspaceId: workspace?.workspaceId,
        name: groupingConfig.title || `Group (${nodesToGroup.length} items)`,
        type: 'group-container',
        id: 'group-container',
        width: containerWidth,
        height: containerHeight,
        preview: groupingConfig.description || 'Grouped elements container',
        isGroupContainer: true,
        groupId: groupId,
        childNodeIds: nodesToGroup.map(n => n.id),
        gridConfig: {
          columns: gridColumns,
          rows: gridRows,
          cellWidth,
          cellHeight,
          cellGap,
          cellInnerPadding
        },
        containerStyle: {
          backgroundColor: '#f0f9ff',
          borderColor: '#3b82f6',
          borderWidth: 3,
          borderRadius: 16,
          headerColor: '#3b82f6',
        },
        customLayoutData: {
          layoutType: 'group-container',
          title: groupingConfig.title,
          description: groupingConfig.description,
          gridColumns,
          gridRows,
          childNodes: nodesToGroup.map((node, index) => ({
            id: node.id,
            name: node.data?.name || 'Element',
            type: node.type,
            originalPosition: node.position,
            gridPosition: {
              row: Math.floor(index / gridColumns),
              col: index % gridColumns
            }
          }))
        },
        originalNodes: nodesToGroup.map(node => ({
          id: node.id,
          data: node.data,
          position: node.position,
          type: node.type
        }))
      }
    };
    
    // Calculate grid positions for child nodes
    const selectedNodeIds = nodesToGroup.map(node => node.id);
    
    setNodes(currentNodes => {
      // Update existing nodes with new grid positions inside the container
      const updatedNodes = currentNodes.map(node => {
        const nodeIndex = selectedNodeIds.indexOf(node.id);
        if (nodeIndex !== -1) {
          // Calculate row and column for this node
          const row = Math.floor(nodeIndex / gridColumns);
          const col = nodeIndex % gridColumns;
          
          // Calculate position within container (relative to container's top-left)
          // Position at the start of the cell, then add inner padding
          const cellStartX = containerPaddingX + (col * (cellWidth + cellGap));
          const cellStartY = containerPaddingTop + (row * (cellHeight + cellGap));
          
          const newX = cellStartX + cellInnerPadding;
          const newY = cellStartY + cellInnerPadding;
          
          // Calculate available space for node (cell size minus padding on both sides)
          const nodeWidth = cellWidth - (cellInnerPadding * 2);
          const nodeHeight = cellHeight - (cellInnerPadding * 2);
          
          // Ensure node stays within bounds
          const maxX = newX + nodeWidth;
          const maxY = newY + nodeHeight;
          
          // Validate positioning
          const boundedX = Math.max(cellInnerPadding, Math.min(newX, containerWidth - nodeWidth - cellInnerPadding));
          const boundedY = Math.max(containerPaddingTop, Math.min(newY, containerHeight - nodeHeight - cellInnerPadding));
          
          return {
            ...node,
            parentNode: groupId,
            extent: 'parent',
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
      
      // Add the group container at the beginning (so it renders behind)
      return [groupContainerNode, ...updatedNodes];
    });
    
    // Close modal and reset state
    setShowGroupingModal(false);
    setShowGroupingToolbar(false);
    setSelectedNodes([]);
    setManuallySelectedNodes([]);
    setIsSelectionMode(false);
    
    console.log('🎉 Group container created with grid layout!', {
      groupId,
      childCount: nodesToGroup.length,
      gridConfig: { columns: gridColumns, rows: gridRows },
      containerPosition: { x: containerX, y: containerY },
      containerSize: { width: containerWidth, height: containerHeight }
    });
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
    
    // Auto-connect the first node of the flowchart to the previous element
    if (newNodes.length > 0) {
      const firstNode = newNodes[0];
      autoConnectNewNode(firstNode);
    }

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
      // Remove all nodes in the group and renumber remaining nodes
      setNodes(nds => {
        // Filter out flowchart nodes
        let remainingNodes = nds.filter(node => node.data?.flowchartGroup !== groupId);
        
        // Renumber remaining nodes with sequence numbers
        const nodesWithSequence = remainingNodes
          .filter(node => node.data?.sequenceNumber !== undefined && node.data.sequenceNumber !== null)
          .sort((a, b) => (a.data?.sequenceNumber || 0) - (b.data?.sequenceNumber || 0));
        
        if (nodesWithSequence.length > 0) {
          remainingNodes = remainingNodes.map((node) => {
            const currentSeqIndex = nodesWithSequence.findIndex(n => n.id === node.id);
            
            if (currentSeqIndex !== -1) {
              const newSequenceNumber = currentSeqIndex + 1;
              console.log(`🔢 Renumbering node ${node.id}: ${node.data?.sequenceNumber} → ${newSequenceNumber}`);
              
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
            flowchartName: flowchartName,
            workspaceId: workspace?.workspaceId
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
  const onPaneClick = useCallback((event) => {
    console.log('🖱️ Pane clicked - Text mode active:', isTextModeActive);
    
    // If text mode is active, create a new text node
    if (isTextModeActive && reactFlowInstance) {
      console.log('✏️ Creating text node from pane click');
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });

      const newTextNode = {
        id: `text_${Date.now()}`,
        type: 'textNode',
        position,
        data: {
          name: 'Text',
          type: 'text',
          content: 'Type here...',
          fontSize: textModeConfig?.fontSize || '16',
          fontFamily: textModeConfig?.fontFamily || 'Arial',
          color: textModeConfig?.color || '#000000',
          backgroundColor: textModeConfig?.backgroundColor || '#ffffff',
          formats: [],
          isEditing: true,
          workspaceId: workspace?.workspaceId
        }
      };

      console.log('✏️ Adding text node:', newTextNode);
      setNodes(nds => [...nds, newTextNode]);
      
      // Emit event to select this text element in the panel
      const selectEvent = new CustomEvent('selectTextElement', {
        detail: newTextNode.data
      });
      document.dispatchEvent(selectEvent);
      
      // Prevent default pane click behavior
      event.stopPropagation();
      return;
    }
    
    // Normal pane click behavior
    setShowFlowchartToolbar(false);
    setSelectedFlowchartGroup(null);
    setContextMenu({ isVisible: false, position: { x: 0, y: 0 }, selectedNodes: [] });
  }, [isTextModeActive, reactFlowInstance, textModeConfig, setNodes, workspace?.workspaceId]);

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
      // Prevent shortcuts when typing in input fields, textareas, or contenteditable elements
      const isInputElement = event.target.tagName === 'INPUT' || 
                            event.target.tagName === 'TEXTAREA' || 
                            event.target.contentEditable === 'true';
      
      // Also check if the event target is inside an input (for nested elements)
      const isInsideInput = event.target.closest('input, textarea, [contenteditable="true"]');
      
      if (isInputElement || isInsideInput) {
        // Allow the input to receive the key event
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
    getNodes: () => nodes,
    getEdges: () => edges,
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
          workspaceId: workspace?.workspaceId
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

  // Handle zoom to element from Elements Overview
  useEffect(() => {
    const handleZoomToElement = (event) => {
      const { elementId } = event.detail;
      console.log('🔍 Zooming to element:', elementId);
      
      // Find the node with the given ID
      const targetNode = nodes.find(node => node.id === elementId);
      
      if (targetNode && reactFlowInstance) {
        // Select the node
        setNodes(nds => nds.map(node => ({
          ...node,
          selected: node.id === elementId
        })));
        
        // Calculate position, accounting for parent offsets if element is nested
        let x = targetNode.position.x;
        let y = targetNode.position.y;
        let width = targetNode.width || 200;
        let height = targetNode.height || 200;
        
        // If the node has a parent (is inside a container), add parent position
        if (targetNode.parentNode) {
          const parentNode = nodes.find(n => n.id === targetNode.parentNode);
          if (parentNode) {
            x += parentNode.position.x;
            y += parentNode.position.y;
            console.log('📦 Element is nested in parent:', { parentId: targetNode.parentNode, parentPos: parentNode.position });
          }
        }
        
        // Get the center position of the target node
        const position = {
          x: x + width / 2,
          y: y + height / 2
        };
        
        // Use a zoom level that fits the element well (higher zoom = closer)
        const targetZoom = 1.5;
        reactFlowInstance.setCenter(position.x, position.y, { zoom: targetZoom, duration: 800 });
        
        console.log('✅ Zoomed to element:', { elementId, position, zoom: targetZoom, isNested: !!targetNode.parentNode });
      } else {
        console.warn('❌ Element not found or ReactFlow instance not ready:', { elementId, nodeFound: !!targetNode, instanceReady: !!reactFlowInstance });
      }
    };

    document.addEventListener('zoomToElement', handleZoomToElement);
    
    return () => {
      document.removeEventListener('zoomToElement', handleZoomToElement);
    };
  }, [nodes, setNodes, reactFlowInstance]);

  // Handle update element name
  useEffect(() => {
    const handleUpdateElementName = (event) => {
      const { elementId, newName } = event.detail;
      console.log('✏️ Updating element name:', { elementId, newName });
      
      // Update the node data with new name
      setNodes(nds => nds.map(node => {
        if (node.id === elementId) {
          return {
            ...node,
            data: {
              ...node.data,
              name: newName
            }
          };
        }
        return node;
      }));
    };

    document.addEventListener('updateElementName', handleUpdateElementName);
    
    return () => {
      document.removeEventListener('updateElementName', handleUpdateElementName);
    };
  }, [setNodes]);

  // Handle delete element
  useEffect(() => {
    const handleDeleteElement = (event) => {
      const { elementId } = event.detail;
      console.log('🗑️ Deleting element:', elementId);
      
      // Remove the node from canvas
      setNodes(nds => nds.filter(node => node.id !== elementId));
      
      // Remove all edges connected to this node
      setEdges(eds => eds.filter(edge => edge.source !== elementId && edge.target !== elementId));
      
      // Track the deletion activity
      try {
        trackActivity('element_removed', 'delete', 'element', {
          elementId: elementId,
          elementType: 'unknown',
          details: {
            canvasAction: true,
            deletedVia: 'elements-overview'
          }
        });
      } catch (e) {
        console.error('❌ Error tracking delete activity:', e);
      }
    };

    document.addEventListener('deleteElement', handleDeleteElement);
    
    return () => {
      document.removeEventListener('deleteElement', handleDeleteElement);
    };
  }, [setNodes, setEdges, trackActivity]);

  // Handle lock/unlock element
  useEffect(() => {
    const handleToggleLockElement = (event) => {
      const { elementId } = event.detail;
      console.log('🔒 Toggling lock for element:', elementId);
      
      setNodes(nds => nds.map(node => {
        if (node.id === elementId) {
          const isCurrentlyLocked = node.data?.locked || false;
          const willBeLocked = !isCurrentlyLocked;
          
          console.log(`🔐 Element ${elementId} lock status: ${isCurrentlyLocked} → ${willBeLocked}`);
          
          return {
            ...node,
            data: {
              ...node.data,
              locked: willBeLocked
            },
            draggable: !willBeLocked // Prevent dragging when locked
          };
        }
        return node;
      }));
    };

    document.addEventListener('toggleLockElement', handleToggleLockElement);
    
    return () => {
      document.removeEventListener('toggleLockElement', handleToggleLockElement);
    };
  }, [setNodes]);

  // Handle edge deletion
  const onEdgesDelete = useCallback((edgesToDelete) => {
    console.log('🗑️ Deleting edges:', edgesToDelete);
    setEdges((eds) => eds.filter((edge) => !edgesToDelete.find((e) => e.id === edge.id)));
  }, [setEdges]);

  // Handle node deletion
  const onNodesDelete = useCallback((nodesToDelete) => {
    console.log('🗑️ Deleting nodes:', nodesToDelete);
    setNodes((nds) => {
      // Filter out deleted nodes
      let remainingNodes = nds.filter((node) => !nodesToDelete.find((n) => n.id === node.id));
      
      // Get all nodes with sequence numbers and sort by sequence number
      const nodesWithSequence = remainingNodes
        .filter(node => node.data?.sequenceNumber !== undefined && node.data.sequenceNumber !== null)
        .sort((a, b) => (a.data?.sequenceNumber || 0) - (b.data?.sequenceNumber || 0));
      
      console.log('📊 Nodes with sequence numbers:', nodesWithSequence.length);
      
      // Renumber the remaining nodes
      if (nodesWithSequence.length > 0) {
        remainingNodes = remainingNodes.map((node) => {
          // Find the current sequence number position
          const currentSeqIndex = nodesWithSequence.findIndex(n => n.id === node.id);
          
          if (currentSeqIndex !== -1) {
            // This node has a sequence number, update it to new sequential number
            const newSequenceNumber = currentSeqIndex + 1;
            console.log(`🔢 Renumbering node ${node.id}: ${node.data?.sequenceNumber} → ${newSequenceNumber}`);
            
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

  // Handle text mode activation
  useEffect(() => {
    const handleActivateTextMode = (event) => {
      const { active, ...config } = event.detail;
      setIsTextModeActive(active);
      setTextModeConfig(config);
      console.log('📝 Text mode:', active ? 'ON' : 'OFF');
    };

    document.addEventListener('activateTextMode', handleActivateTextMode);
    return () => document.removeEventListener('activateTextMode', handleActivateTextMode);
  }, []);

  // Listen for text element selection from TextPanel
  useEffect(() => {
    const handleSelectTextElement = (event) => {
      const textElement = event.detail;
      console.log('🎯 Text element selected:', textElement);
      // This event is handled by WorkspacePage which updates the TextPanel state
    };

    document.addEventListener('selectTextElement', handleSelectTextElement);
    return () => document.removeEventListener('selectTextElement', handleSelectTextElement);
  }, []);

  // Listen for text element updates from TextPanel
  useEffect(() => {
    const handleUpdateTextElement = (event) => {
      const updatedElement = event.detail;
      console.log('✏️ Updating text element:', updatedElement);
      
      setNodes(nds => nds.map(node => {
        if (node.id === updatedElement.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...updatedElement
            }
          };
        }
        return node;
      }));
    };

    document.addEventListener('updateTextElement', handleUpdateTextElement);
    return () => document.removeEventListener('updateTextElement', handleUpdateTextElement);
  }, [setNodes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Prevent shortcuts when typing in input fields, textareas, or contenteditable elements
      const isInputElement = event.target.tagName === 'INPUT' || 
                            event.target.tagName === 'TEXTAREA' || 
                            event.target.contentEditable === 'true';
      
      // Also check if the event target is inside an input (for nested elements)
      const isInsideInput = event.target.closest('input, textarea, [contenteditable="true"]');
      
      if (isInputElement || isInsideInput) {
        // Allow the input to receive the key event
        return;
      }
      
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
    event.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);
    console.log('🔄 Drag over React Flow canvas, dataTransfer types:', event.dataTransfer.types);
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

  // Collision detection function - Enhanced to prevent ANY overlaps
  const findNonCollidingPosition = (position, newNodeWidth = 300, newNodeHeight = 200) => {
    const padding = 100; // Larger padding to prevent overlaps
    const offset = 100; // Larger offset distance to try
    const offsets = [
      { x: offset, y: 0 },       // Right
      { x: 0, y: offset },       // Down
      { x: -offset, y: 0 },      // Left
      { x: 0, y: -offset },      // Up
      { x: offset, y: offset },  // Down-right
      { x: -offset, y: offset }, // Down-left
      { x: offset, y: -offset }, // Up-right
      { x: -offset, y: -offset } // Up-left
    ];

    const hasCollision = (pos) => {
      for (const node of nodes) {
        if (!node.position) continue;
        
        // Use more generous dimension estimates
        const nodeWidth = node.measured?.width || node.width || 350;
        const nodeHeight = node.measured?.height || node.height || 250;
        
        // Check if position overlaps with this node (with generous padding)
        const overlaps = 
          pos.x < node.position.x + nodeWidth + padding &&
          pos.x + newNodeWidth + padding > node.position.x &&
          pos.y < node.position.y + nodeHeight + padding &&
          pos.y + newNodeHeight + padding > node.position.y;
        
        if (overlaps) {
          console.log(`⚠️ Collision detected with node at (${node.position.x}, ${node.position.y})`);
          return true;
        }
      }
      return false;
    };

    // If current position has no collision, use it
    if (!hasCollision(position)) {
      console.log(`✅ Current position is clear`);
      return position;
    }

    console.log(`🔍 Current position has collision, searching for empty space...`);

    // Try offsets in expanding circles - more aggressive search
    let found = false;

    for (let multiplier = 1; multiplier <= 10 && !found; multiplier++) {
      for (const offset of offsets) {
        const testPos = {
          x: position.x + offset.x * multiplier,
          y: position.y + offset.y * multiplier
        };

        if (!hasCollision(testPos)) {
          console.log(`🎯 Found non-colliding position at distance multiplier ${multiplier}`);
          console.log(`📍 New position: x=${testPos.x}, y=${testPos.y}`);
          return testPos;
        }
      }
    }

    // If still no space found, find the node with most available space and move far from it
    if (!found) {
      console.log(`⚠️ Could not find position using standard search, using fallback strategy`);
      
      // Find the bottommost and rightmost node
      let maxX = position.x;
      let maxY = position.y;
      let maxNodeWidth = 0;
      let maxNodeHeight = 0;

      for (const node of nodes) {
        if (!node.position) continue;
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

      // Place new node below and to the right of the rightmost/bottommost node
      const fallbackPos = {
        x: maxX + maxNodeWidth + 150,
        y: maxY + maxNodeHeight + 150
      };

      console.log(`📍 Using fallback position: x=${fallbackPos.x}, y=${fallbackPos.y}`);
      return fallbackPos;
    }

    console.log(`📍 Final position: x=${position.x}, y=${position.y}`);
    return position;
  };

  // Handle drop from ElementsPanel
  const onDrop = useCallback(
    async (event) => {
      console.log('🎯🎯🎯 DROP EVENT FIRED - dataTransfer types:', event.dataTransfer?.types);
      event.preventDefault();
      setIsDraggingOver(false);
      console.log('🎯 Drop event triggered on React Flow canvas');

      // Check for asset drop first
      const assetData = event.dataTransfer.getData('asset');
      console.log('🎯 Asset data from drag:', assetData);
      
      if (assetData) {
        console.log('🖼️ Asset dropped on canvas');
        try {
          const asset = JSON.parse(assetData);
          console.log('📦 Asset parsed:', asset);
          
          if (!asset.s3Url) {
            console.error('❌ Asset missing s3Url:', asset);
            return;
          }
          
          // Get position
          const reactFlowBounds = event.currentTarget.getBoundingClientRect();
          let position;
          if (reactFlowInstance) {
            position = reactFlowInstance.project({
              x: event.clientX - reactFlowBounds.left,
              y: event.clientY - reactFlowBounds.top,
            });
          } else {
            position = {
              x: event.clientX - reactFlowBounds.left - 100,
              y: event.clientY - reactFlowBounds.top - 50,
            };
          }

          position = findNonCollidingPosition(position, 200, 200);

          // Create image or asset node based on category
          let newNode;
          if (asset.category === 'images' || asset.category === 'icons') {
            // Create image node
            newNode = {
              id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'elementNode',
              position,
              data: {
                elementName: asset.name,
                elementType: 'image-block',
                type: 'image-block',
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
              },
            };
          } else if (asset.category === 'documents') {
            // Create document link node
            newNode = {
              id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'elementNode',
              position,
              data: {
                elementName: asset.name,
                elementType: 'element',
                type: 'element',
                content: `📄 ${asset.name}`,
                documentUrl: asset.s3Url,
                canvasAction: true,
                assetId: asset.assetId || asset.id,
                category: asset.category
              },
            };
          } else if (asset.category === 'fonts') {
            // Create font reference node
            newNode = {
              id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'textNode',
              position,
              data: {
                content: `Font: ${asset.name}`,
                type: 'font',
                fontUrl: asset.s3Url,
                canvasAction: true,
                assetId: asset.assetId || asset.id,
                category: asset.category
              },
            };
          }

          if (newNode) {
            console.log('✅ Creating asset node:', newNode);
            setNodes((nds) => [...nds, newNode]);
            return;
          }
        } catch (error) {
          console.error('❌ Error processing asset drop:', error);
          return;
        }
      }

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

        // Check for collisions and find non-colliding position
        position = findNonCollidingPosition(position, 300, 200);

        // Check if it's a table element
        if (isTableElement(element)) {
          console.log('📊 Table element detected in drop, showing configuration modal');
          setPendingTableElement(element);
          setPendingPosition(findNonCollidingPosition(position, 400, 300));
          setShowTableModal(true);
          return;
        }

        // Check if it's a chart element
        if (isChartElement(element)) {
          console.log('📈 Chart element detected in drop, showing configuration modal');
          setPendingChartElement(element);
          setPendingPosition(findNonCollidingPosition(position, 450, 350));
          setShowChartModal(true);
          return;
        }

        // Check if it's a list element
        if (isListElement(element)) {
          console.log('📝 List element detected in drop, showing configuration modal');
          setPendingListElement(element);
          setPendingPosition(findNonCollidingPosition(position, 350, 300));
          setShowListModal(true);
          return;
        }

        // Check if it's a layout element
        if (isLayoutElement(element)) {
          console.log('🏗️ Layout element detected in drop, showing configuration modal');
          setPendingLayoutElement(element);
          setPendingPosition(findNonCollidingPosition(position, 400, 300));
          setShowLayoutModal(true);
          return;
        }

        // Check if it's a flowchart element
        if (isFlowchartElement(element)) {
          console.log('🔄 Flowchart element detected in drop, creating template');
          createFlowchartTemplate(element, findNonCollidingPosition(position, 300, 200));
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
          setPendingPosition(findNonCollidingPosition(position, 350, 250));
          setShowTurnkeyModal(true);
          return;
        }
        // Check if it's a task card element
        if (element.type === 'image-block') {
          console.log('🖼️ Image block element detected in drop, creating default block');
          const imageBlockData = JSON.parse(JSON.stringify(element.imageBlockData || {}));
          const newNode = createElementNode(element, findNonCollidingPosition(position, 300, 200), { imageBlockData });
          setNodes((nds) => nds.concat(newNode));
          
          // Auto-connect to previous element
          autoConnectNewNode(newNode);
          
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
          setPendingPosition(findNonCollidingPosition(position, 300, 250));
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
        
        // Auto-connect to the previously added element
        // Get the previous node ID before adding the new one
        const previousNodeId = lastAddedNodeIdRef.current;
        console.log('📌 Previous node ID stored:', previousNodeId);
        
        // Add the new node and handle auto-connection in the same setState callback
        setNodes((currentNodes) => {
          console.log('📊 Current nodes before adding new:', currentNodes.length, 'nodes');
          
          // Check if we should create a connection
          if (previousNodeId && currentNodes.length > 0) {
            console.log('🔗 Attempting to connect new element to previously added element:', previousNodeId);
            
            // Find the previous node
            const previousNode = currentNodes.find(node => node.id === previousNodeId);
            
            if (previousNode) {
              console.log(`🎯 Found previous node: ${previousNodeId} at position (${previousNode.position.x}, ${previousNode.position.y})`);
              
              // Determine connection direction based on relative position
              const dx = newNode.position.x - previousNode.position.x;
              const dy = newNode.position.y - previousNode.position.y;
              
              let sourceId = previousNode.id;
              let targetId = newNode.id;
              let sourceHandle = 'right-out';
              let targetHandle = 'left-in';
              
              // Adjust handles based on direction if needed
              if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal layout - already set correctly
                if (dx < 0) {
                  // New node is to the left, reverse direction
                  sourceId = newNode.id;
                  targetId = previousNode.id;
                  sourceHandle = 'right-out';
                  targetHandle = 'left-in';
                }
              } else {
                // Vertical layout
                if (dy > 0) {
                  // New node is below - connect top to bottom
                  sourceId = previousNode.id;
                  targetId = newNode.id;
                  sourceHandle = 'bottom-out';
                  targetHandle = 'top-in';
                } else {
                  // New node is above - connect bottom to top
                  sourceId = newNode.id;
                  targetId = previousNode.id;
                  sourceHandle = 'bottom-out';
                  targetHandle = 'top-in';
                }
              }
              
              // Queue the edge creation for after nodes are updated
              setEdges((currentEdges) => {
                console.log('📐 Creating edge from', sourceId, 'to', targetId);
                
                // Check if connection already exists
                const connectionExists = currentEdges.some(
                  edge => (edge.source === sourceId && edge.target === targetId && 
                           edge.sourceHandle === sourceHandle && edge.targetHandle === targetHandle) ||
                          (edge.source === targetId && edge.target === sourceId)
                );
                
                if (!connectionExists) {
                  const edgeId = `edge_auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                  const newEdge = {
                    id: edgeId,
                    source: sourceId,
                    target: targetId,
                    sourceHandle: sourceHandle,
                    targetHandle: targetHandle,
                    type: 'custom',
                    animated: true,
                    style: { 
                      strokeWidth: 3, 
                      stroke: '#3b82f6',
                    },
                    data: { 
                      label: '',
                      isAutoConnected: true
                    }
                  };
                  
                  console.log(`✅ AUTO-CONNECTED: ${sourceId} → ${targetId}`);
                  return [...currentEdges, newEdge];
                } else {
                  console.log(`⏭️ Connection already exists between: ${sourceId} ↔ ${targetId}`);
                  return currentEdges;
                }
              });
            } else {
              console.log(`⚠️ Previous node (${previousNodeId}) not found in current nodes`);
            }
          } else {
            console.log('ℹ️ First element dropped - no previous element to connect to');
          }
          
          // Update the reference to track this new node as the last added
          lastAddedNodeIdRef.current = newNode.id;
          console.log('📌 Updated last added element to:', newNode.id);
          
          // Set flag to prevent workspace data refresh from overwriting this new node
          isUpdatingNodesLocallyRef.current = true;
          
          // Return updated nodes array
          return [...currentNodes, newNode];
        });
        
        // Reset the flag after a brief delay to allow UI to update
        setTimeout(() => {
          isUpdatingNodesLocallyRef.current = false;
          console.log('🔓 Unlocked canvas data updates after local node addition');
        }, 100);
        
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
        
        
        console.log('✅ Element dropped and auto-connected successfully!');
      } catch (error) {
        console.error('❌ Error parsing dropped element:', error);
      }
    },
    [reactFlowInstance, setNodes, trackActivity, nodes]
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
        data-tour="canvas"
        className="flex-1 relative overflow-hidden" 
        style={{ 
          width: '100%', 
          height: '100%',
          zIndex: 1,
          pointerEvents: 'auto'
        }}
        onDrop={canEdit ? onDrop : undefined}
        onDragOver={canEdit ? onDragOver : undefined}
        onDragEnter={canEdit ? onDragEnter : undefined}
        onDragLeave={onDragLeave}
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
                      className={`p-1.5 rounded-lg transition-colors border ${
                        isSelectionMode
                          ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                      }`}
                      title={isSelectionMode ? 'Exit selection mode' : 'Select multiple elements'}
                      aria-pressed={isSelectionMode}
                    >
                      {isSelectionMode ? (
                        <X className="w-3.5 h-3.5" />
                      ) : (
                        <Users className="w-3.5 h-3.5" />
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
                        className="inline-flex items-center gap-2 px-2.5 py-1 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
                      >
                         <Grid className="w-3.5 h-3.5" />
                         <span>Group ({manuallySelectedNodes.length})</span>
                      </button>
                    )}
                  </div>
                )}
                
                {/* Connection Tools */}
                {nodes.length > 1 && (
                  <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                    <button
                      onClick={() => setShowClearConfirmation(true)}
                      className="px-2.5 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                      title="Clear all elements and connections (Ctrl+Shift+C)"
                    >
                      Clear All
                    </button>
                    {/* <span className="text-xs text-gray-400">
                      Delete: Select & press Del
                    </span> */}
                  </div>
                )}

                {/* Undo/Redo Buttons */}
                {/* Removed - Undo/Redo buttons removed per user request */}
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
        
        {/* Read-only overlay when user doesn't have edit permissions - but NOT for clients */}
        {!canEdit && userRole !== 'client' && (
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
        
        {/* Subtle read-only indicator for clients - they can view but not edit */}
        {!canEdit && userRole === 'client' && (
          <div className="absolute top-4 right-4 z-10 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center space-x-2 text-xs text-gray-600">
            <Eye className="w-3 h-3" />
            <span>View only</span>
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">Edit Connection</h3>
              <button
                onClick={closeEdgeLabelModal}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Connection Name */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Connection Name</label>
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
                placeholder="e.g., Data Flow, Approval, Next Step..."
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Connection Style */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Line Style</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'default', label: 'Solid', icon: '━' },
                  { id: 'dashed', label: 'Dashed', icon: '┅' },
                  { id: 'dotted', label: 'Dotted', icon: '⋯' },
                  { id: 'animated', label: 'Animated', icon: '⟿' },
                ].map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setEdgeStyleInput(style.id)}
                    className={`px-2 py-1.5 rounded-lg border-2 text-xs font-medium transition-all ${
                      edgeStyleInput === style.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <span className="text-lg block mb-1">{style.icon}</span>
                    <span className="text-xs">{style.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Connection Color */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Line Color</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { color: '#3b82f6', name: 'Blue' },
                  { color: '#10b981', name: 'Green' },
                  { color: '#f59e0b', name: 'Orange' },
                  { color: '#ef4444', name: 'Red' },
                  { color: '#8b5cf6', name: 'Purple' },
                  { color: '#6b7280', name: 'Gray' },
                  { color: '#000000', name: 'Black' },
                ].map((c) => (
                  <button
                    key={c.color}
                    onClick={() => setEdgeColorInput(c.color)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      edgeColorInput === c.color
                        ? 'border-gray-900 ring-2 ring-offset-2 ring-blue-500'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: c.color }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-between items-center gap-2">
              {/* Delete Button */}
              <button
                type="button"
                onClick={handleDeleteEdge}
                className="px-2 py-1.5 text-xs rounded-lg border border-red-300 text-red-600 hover:bg-red-50 flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
              
              {/* Save/Cancel Buttons */}
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={closeEdgeLabelModal}
                  className="px-2 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleEdgeLabelSave}
                  className="px-2 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {showClearConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-red-50">
              <h3 className="text-lg font-semibold text-red-900">Clear All Elements?</h3>
              <button
                onClick={() => setShowClearConfirmation(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete everything?
              </p>
              <p className="text-sm text-gray-600">
                This will remove all elements and connections from the canvas. This action cannot be undone.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowClearConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setNodes([]);
                  setEdges([]);
                  elementSequenceRef.current = 0;
                  lastAddedNodeIdRef.current = null;
                  console.log('🧹 Canvas cleared - all elements and connections removed');
                  setShowClearConfirmation(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default CanvasWorkspace;
