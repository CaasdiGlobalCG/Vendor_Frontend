import { updateWorkspace, getWorkspaceById } from './workspaceApi';

/**
 * Persist the isImportant flag to backend for a node
 * @param {string} nodeId - The node ID
 * @param {boolean} isImportant - Whether the node is marked as important
 * @param {object} setNodes - React Flow setNodes function
 * @param {string} workspaceId - The workspace ID
 */
export const persistIsImportant = async (nodeId, isImportant, setNodes, workspaceId) => {
  try {
    console.log('💾 Persisting isImportant:', { nodeId, isImportant });
    
    // Fetch the latest workspace data
    const workspace = await getWorkspaceById(workspaceId);
    
    // Update the specific node with isImportant flag
    const updatedNodes = (workspace.nodes || []).map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            isImportant: isImportant
          }
        };
      }
      return node;
    });
    
    // Call updateWorkspace API with safe fields only
    const saveData = {
      nodes: updatedNodes,
      edges: workspace.edges || [],
      zoomLevel: workspace.zoomLevel || 100
    };
    
    await updateWorkspace(workspaceId, saveData);
    
    // Update React Flow nodes to reflect the change
    setNodes((currentNodes) =>
      currentNodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              isImportant: isImportant
            }
          };
        }
        return node;
      })
    );
    
    console.log('✅ isImportant persisted successfully');
  } catch (error) {
    console.error('❌ Error persisting isImportant:', error);
    throw error;
  }
};

/**
 * Persist the deadline to backend for a node
 * @param {string} nodeId - The node ID
 * @param {string|Date} deadline - The deadline (will be converted to ISO string)
 * @param {object} setNodes - React Flow setNodes function
 * @param {string} workspaceId - The workspace ID
 */
export const persistDeadline = async (nodeId, deadline, setNodes, workspaceId) => {
  try {
    console.log('💾 Persisting deadline:', { nodeId, deadline });
    
    // Convert to ISO string if it's a date
    const isoDeadline = deadline instanceof Date ? deadline.toISOString() : 
                       (typeof deadline === 'string' && deadline.includes('T')) ? deadline :
                       (deadline ? new Date(deadline).toISOString() : null);
    
    console.log('📅 Converted deadline to ISO:', isoDeadline);
    
    // Fetch the latest workspace data
    const workspace = await getWorkspaceById(workspaceId);
    
    // Update the specific node with deadline
    const updatedNodes = (workspace.nodes || []).map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            deadline: isoDeadline
          }
        };
      }
      return node;
    });
    
    // Call updateWorkspace API with safe fields only
    const saveData = {
      nodes: updatedNodes,
      edges: workspace.edges || [],
      zoomLevel: workspace.zoomLevel || 100
    };
    
    await updateWorkspace(workspaceId, saveData);
    
    // Update React Flow nodes to reflect the change
    setNodes((currentNodes) =>
      currentNodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              deadline: isoDeadline
            }
          };
        }
        return node;
      })
    );
    
    console.log('✅ Deadline persisted successfully');
  } catch (error) {
    console.error('❌ Error persisting deadline:', error);
    throw error;
  }
};

/**
 * Calculate time remaining from now until deadline
 * @param {string} deadline - ISO format deadline string
 * @returns {object} Object with days, hours, minutes, seconds
 */
export const getTimeLeft = (deadline) => {
  if (!deadline) return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false };
  
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diff = deadlineDate - now;
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return { days, hours, minutes, seconds, isExpired: false };
};

/**
 * Format time remaining as human readable string
 * @param {object} timeLeft - Object from getTimeLeft()
 * @returns {string} Formatted time string
 */
export const formatTimeLeft = (timeLeft) => {
  if (!timeLeft || timeLeft.isExpired) return 'Expired';
  if (timeLeft.days > 0) return `${timeLeft.days}d ${timeLeft.hours}h`;
  if (timeLeft.hours > 0) return `${timeLeft.hours}h ${timeLeft.minutes}m`;
  if (timeLeft.minutes > 0) return `${timeLeft.minutes}m ${timeLeft.seconds}s`;
  return `${timeLeft.seconds}s`;
};
/**
 * Persist text content (textarea, textbox) to backend
 * @param {string} nodeId - The node ID
 * @param {string} content - The text content
 * @param {string} contentType - Type of content ('textareaValue' or 'inputValue')
 * @param {object} setNodes - React Flow setNodes function
 * @param {string} workspaceId - The workspace ID
 */
export const persistTextContent = async (nodeId, content, contentType, setNodes, workspaceId) => {
  try {
    console.log('💾 Persisting text content:', { nodeId, contentType, length: content.length });
    
    // Fetch the latest workspace data
    const workspace = await getWorkspaceById(workspaceId);
    
    // Update the specific node with text content
    const updatedNodes = (workspace.nodes || []).map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            [contentType]: content,
            lastModifiedAt: new Date().toISOString()
          }
        };
      }
      return node;
    });
    
    // Call updateWorkspace API with safe fields only
    const saveData = {
      nodes: updatedNodes,
      edges: workspace.edges || [],
      zoomLevel: workspace.zoomLevel || 100
    };
    
    await updateWorkspace(workspaceId, saveData);
    
    // Update React Flow nodes to reflect the change
    setNodes((currentNodes) =>
      currentNodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              [contentType]: content,
              lastModifiedAt: new Date().toISOString()
            }
          };
        }
        return node;
      })
    );
    
    console.log('✅ Text content persisted successfully');
  } catch (error) {
    console.error('❌ Error persisting text content:', error);
    throw error;
  }
};