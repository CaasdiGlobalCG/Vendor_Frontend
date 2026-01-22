import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { persistIsImportant, persistDeadline, formatTimeLeft, getTimeLeft } from '../../utils/nodePersistence';
import { Handle, Position, useReactFlow } from 'reactflow';
import { CheckCircle, Clock, AlertCircle, X, Plus, MoreVertical, Mail, User, Check, Trash2, ChevronRight } from 'lucide-react';

// Sample data structure
const initialColumns = {
  submitted: {
    id: 'submitted',
    title: 'Submitted',
    items: [
      { id: 'item-1', title: 'Design Draft', status: 'submitted', assignedTo: 'client@example.com', submittedDate: '2023-10-15' },
      { id: 'item-2', title: 'Budget Proposal', status: 'submitted', assignedTo: 'finance@example.com', submittedDate: '2023-10-16' },
    ],
  },
  underReview: {
    id: 'underReview',
    title: 'Under Review',
    items: [
      { id: 'item-3', title: 'Contract Draft', status: 'underReview', assignedTo: 'legal@example.com', submittedDate: '2023-10-14' },
    ],
  },
  approved: {
    id: 'approved',
    title: 'Approved',
    items: [
      { id: 'item-4', title: 'Project Kickoff', status: 'approved', assignedTo: 'pm@example.com', approvedDate: '2023-10-10' },
    ],
  },
};

const columnOrder = ['submitted', 'underReview', 'approved'];

const ApprovalBoardNode = ({ id, data, isConnectable, selected }) => {
  const workspaceId = data.workspaceId;  // Get workspaceId from node data
  const { setNodes } = useReactFlow();
  const [saving, setSaving] = useState(false);
  const [isImportant, setIsImportant] = useState(data.isImportant || false);
  const [deadline, setDeadline] = useState(data.deadline || null);
  const [showDeadlineInput, setShowDeadlineInput] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const deadlineJustSetRef = useRef(false);
  const [columns, setColumns] = useState(initialColumns);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [newItem, setNewItem] = useState({ 
    title: '', 
    description: '',
    assignedTo: '',
    dueDate: ''
  });
  const [selectedItem, setSelectedItem] = useState(null);
  const [showMoveMenu, setShowMoveMenu] = useState({ show: false, itemId: null });
  const [showItemDetails, setShowItemDetails] = useState({ show: false, item: null });

  // Update time left display every second
  useEffect(() => {
    if (!deadline) return;
    
    const updateTimer = () => {
      const time = getTimeLeft(deadline);
      setTimeLeft(time);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  // Sync deadline and isImportant from node data
  useEffect(() => {
    if (deadlineJustSetRef.current) return;
    
    if (data.deadline && data.deadline !== deadline) {
      setDeadline(data.deadline);
    }
    if (data.isImportant !== undefined && data.isImportant !== isImportant) {
      setIsImportant(data.isImportant);
    }
  }, [data.deadline, data.isImportant]);

  const persistIsImportantLocal = async (important) => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      await persistIsImportant(id, important, setNodes, workspaceId);
    } catch (err) {
      console.error('Failed to persist isImportant:', err);
    } finally {
      setSaving(false);
    }
  };

  const persistDeadlineLocal = async (newDeadline) => {
    if (!workspaceId) return;
    setSaving(true);
    try {
      deadlineJustSetRef.current = true;
      await persistDeadline(id, newDeadline, setNodes, workspaceId);
      setDeadline(newDeadline instanceof Date ? newDeadline.toISOString() : newDeadline);
      setTimeout(() => {
        deadlineJustSetRef.current = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to persist deadline:', err);
    } finally {
      setSaving(false);
    }
  };

  const moveItem = (itemId, fromColumnId, toColumnId) => {
    if (fromColumnId === toColumnId) return;
    
    setColumns(prevColumns => {
      const fromColumn = { ...prevColumns[fromColumnId] };
      const toColumn = { ...prevColumns[toColumnId] };
      
      const itemIndex = fromColumn.items.findIndex(item => item.id === itemId);
      if (itemIndex === -1) return prevColumns;
      
      const [movedItem] = fromColumn.items.splice(itemIndex, 1);
      
      // Update item status based on the target column
      const updatedItem = {
        ...movedItem,
        status: toColumn.id,
        ...(toColumn.id === 'approved' && { approvedDate: new Date().toISOString().split('T')[0] })
      };
      
      return {
        ...prevColumns,
        [fromColumnId]: {
          ...fromColumn,
          items: [...fromColumn.items]
        },
        [toColumnId]: {
          ...toColumn,
          items: [...toColumn.items, updatedItem]
        }
      };
    });
    
    setShowMoveMenu({ show: false, itemId: null });
  };

  const handleAddItem = () => {
    if (!newItem.title) return;

    const newItemObj = {
      id: `item-${Date.now()}`,
      title: newItem.title,
      description: newItem.description || '',
      status: 'submitted',
      assignedTo: newItem.assignedTo || 'Unassigned',
      submittedDate: new Date().toISOString().split('T')[0],
      dueDate: newItem.dueDate || '',
      comments: []
    };

    setColumns(prevColumns => ({
      ...prevColumns,
      submitted: {
        ...prevColumns.submitted,
        items: [...prevColumns.submitted.items, newItemObj],
      },
    }));
    
    // Reset form and close modal
    setNewItem({ 
      title: '', 
      description: '',
      assignedTo: '',
      dueDate: ''
    });
    setShowAddModal(false);
  };

  const handleDeleteItem = (columnId, itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setColumns(prevColumns => {
        const column = { ...prevColumns[columnId] };
        const newItems = column.items.filter(item => item.id !== itemId);
        
        return {
          ...prevColumns,
          [columnId]: {
            ...column,
            items: newItems,
          },
        };
      });
    }
  };

  const handleSendNotification = (item) => {
    // Here you would integrate with your email notification system
    console.log(`Sending notification about ${item.title} to ${item.assignedTo}`);
    alert(`Notification sent to ${item.assignedTo} about: ${item.title}`);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'underReview':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  // Toggle move menu for an item
  const toggleMoveMenu = (e, itemId) => {
    e.stopPropagation();
    setShowMoveMenu(prev => ({
      show: prev.itemId === itemId ? !prev.show : true,
      itemId
    }));
  };

  // Show item details in a modal
  const showDetails = (item, columnId) => {
    setShowItemDetails({
      show: true,
      item: { ...item, currentColumn: columnId }
    });
  };

  // Close all modals
  const closeModals = () => {
    setShowAddModal(false);
    setShowItemDetails({ show: false, item: null });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden w-full max-w-4xl">
      {/* Sequence Number Badge - Top left corner */}
      {data.sequenceNumber && (
        <div className="absolute -top-4 -left-4 z-20 w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white hover:shadow-xl transition-shadow">
          {data.sequenceNumber}
        </div>
      )}
      <Handle type="target" position={Position.Top} />
      
      {/* Header */}
      <div className="bg-indigo-600 text-white p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Approval Board</span>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={async () => {
              setIsImportant(!isImportant);
              await persistIsImportantLocal(!isImportant);
            }}
            className={`px-2 py-1 rounded text-sm ${isImportant ? 'bg-yellow-400 text-white' : 'bg-white text-indigo-600 hover:bg-indigo-50'}`}
            title={isImportant ? 'Unmark as Important' : 'Mark as Important'}
          >
            {isImportant ? '★' : '☆'}
          </button>
          <button 
            onClick={() => setShowDeadlineInput(!showDeadlineInput)}
            className="p-2 rounded bg-white text-indigo-600 hover:bg-indigo-50"
            title="Set Deadline"
          >
            <Clock className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1 bg-white text-indigo-600 text-sm rounded hover:bg-indigo-50 flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={`p-2 rounded ${isEditing ? 'bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'}`}
            title={isEditing ? 'Editing Mode: On' : 'Click to edit'}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Deadline Input */}
      {showDeadlineInput && (
        <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100 flex gap-1">
          <input
            type="datetime-local"
            className="border rounded px-2 py-1 text-xs flex-1"
            value={deadline ? new Date(deadline).toISOString().slice(0,16) : ''}
            onChange={(e) => setDeadline(e.target.value)}
            disabled={saving}
          />
          <button
            className="px-2 py-1 text-xs bg-indigo-600 text-white rounded"
            onClick={async () => {
              setShowDeadlineInput(false);
              await persistDeadlineLocal(deadline);
            }}
            disabled={saving}
          >
            {saving ? '...' : '✓'}
          </button>
        </div>
      )}

      {/* Deadline Display */}
      {deadline && timeLeft && !timeLeft.isExpired && (
        <div className="px-3 py-1 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-600">
          ⏱ {formatTimeLeft(timeLeft)}
        </div>
      )}

      {/* Board */}
      <div className="flex p-4 space-x-4 overflow-x-auto">
        {columnOrder.map((columnId) => {
          const column = columns[columnId];
          const itemCount = column.items.length;
          
          return (
            <div key={column.id} className="flex-1 min-w-64">
              <div className="bg-gray-50 rounded-lg p-3 h-full">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{column.title}</span>
                    <span className="bg-white text-gray-600 text-xs px-2 py-0.5 rounded-full">
                      {itemCount}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2 min-h-20">
                  {column.items.map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-white p-3 rounded border shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group"
                      onClick={() => showDetails(item, columnId)}
                    >
                      {isEditing && (
                        <div className="absolute top-1 right-1 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="relative">
                            <button
                              onClick={(e) => toggleMoveMenu(e, item.id)}
                              className="p-1 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50"
                              title="Move to section"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            
                            {showMoveMenu.show && showMoveMenu.itemId === item.id && (
                              <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg z-10 border">
                                {columnOrder
                                  .filter(id => id !== columnId) // Don't show current column
                                  .map((targetColumnId) => {
                                    const targetColumn = columns[targetColumnId];
                                    return (
                                      <button
                                        key={targetColumnId}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          moveItem(item.id, columnId, targetColumnId);
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 flex items-center justify-between"
                                      >
                                        {targetColumn.title}
                                        {getStatusIcon(targetColumnId)}
                                      </button>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(columnId, item.id);
                            }}
                            className="p-1 text-red-400 hover:text-red-600 rounded-full hover:bg-red-50"
                            title="Delete item"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm pr-6">{item.title}</h4>
                        {getStatusIcon(item.status)}
                      </div>
                      
                      {item.description && (
                        <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-1 truncate">
                          <User className="w-3 h-3 flex-shrink-0 text-gray-400" />
                          <span className="truncate">{item.assignedTo}</span>
                        </div>
                        
                        {item.dueDate && (
                          <div className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            Due: {new Date(item.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      
                      {item.submittedDate && (
                        <div className="mt-1 text-xs text-gray-400">
                          Submitted: {new Date(item.submittedDate).toLocaleDateString()}
                        </div>
                      )}
                      
                      {item.approvedDate && (
                        <div className="mt-1 text-xs text-green-500 flex items-center">
                          <Check className="w-3 h-3 mr-1" />
                          Approved: {new Date(item.approvedDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {column.items.length === 0 && (
                    <div className="text-center text-gray-400 text-sm py-4">
                      No items in this section
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <Handle type="source" position={Position.Bottom} />
      
      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium">Add New Task</h3>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="Task title"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Task description"
                  rows={3}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                  <input
                    type="email"
                    value={newItem.assignedTo}
                    onChange={(e) => setNewItem({ ...newItem, assignedTo: e.target.value })}
                    placeholder="Email address"
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newItem.dueDate}
                    onChange={(e) => setNewItem({ ...newItem, dueDate: e.target.value })}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 flex justify-end space-x-2 rounded-b-lg">
              <button
                onClick={closeModals}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
                disabled={!newItem.title}
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Task Details Modal */}
      {showItemDetails.show && showItemDetails.item && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium">{showItemDetails.item.title}</h3>
              <button 
                onClick={closeModals}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">DESCRIPTION</h4>
                  <p className="text-gray-800">
                    {showItemDetails.item.description || 'No description provided.'}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">STATUS</h4>
                    <div className="flex items-center">
                      {getStatusIcon(showItemDetails.item.status)}
                      <span className="ml-2 capitalize">{showItemDetails.item.status}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">ASSIGNED TO</h4>
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <span>{showItemDetails.item.assignedTo}</span>
                    </div>
                  </div>
                  
                  {showItemDetails.item.submittedDate && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">SUBMITTED</h4>
                      <div>
                        {new Date(showItemDetails.item.submittedDate).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                  
                  {showItemDetails.item.dueDate && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">DUE DATE</h4>
                      <div className={new Date(showItemDetails.item.dueDate) < new Date() ? 'text-red-500' : ''}>
                        {new Date(showItemDetails.item.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
                
                {isEditing && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-3">ACTIONS</h4>
                    <div className="flex flex-wrap gap-2">
                      {columnOrder
                        .filter(id => id !== showItemDetails.item.status) // Don't show current status
                        .map((status) => (
                          <button
                            key={status}
                            onClick={() => {
                              moveItem(showItemDetails.item.id, showItemDetails.item.status, status);
                              closeModals();
                            }}
                            className="px-3 py-1.5 text-xs bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 flex items-center"
                          >
                            Move to {status.charAt(0).toUpperCase() + status.slice(1)}
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </button>
                        ))}
                        
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this item?')) {
                            handleDeleteItem(showItemDetails.item.status, showItemDetails.item.id);
                            closeModals();
                          }
                        }}
                        className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-md hover:bg-red-100 flex items-center"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 border-t flex justify-end">
              <button
                onClick={closeModals}
                className="px-4 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalBoardNode;
