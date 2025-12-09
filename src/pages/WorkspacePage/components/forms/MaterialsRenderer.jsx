import React, { useState, useContext } from 'react';
import { Plus, Minus, Send, Package, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { VendorContext } from '../../../../context/VendorContext';
import config from '../../../../config/env';

const MaterialsRenderer = ({ data, materialType, workspaceId, currentUser }) => {
  // Use data.id as the primary materialType, fallback to materialType prop
  const actualMaterialType = data?.id || materialType;
  
  // Material categories with their properties
  const getMaterialCategory = (type) => {
    switch (type) {
      case 'raw-materials':
        return {
          name: 'Raw Materials',
          description: 'Basic materials and components',
          icon: Package,
          color: 'bg-amber-100 border-amber-300 text-amber-800',
          examples: ['Steel sheets', 'Plastic pellets', 'Chemical compounds', 'Fabric rolls']
        };
      case 'semi-finished':
        return {
          name: 'Semi-Finished Goods',
          description: 'Partially processed materials',
          icon: Package,
          color: 'bg-blue-100 border-blue-300 text-blue-800',
          examples: ['Machined parts', 'Cut fabric pieces', 'Molded components', 'Pre-assembled units']
        };
      case 'finished-goods':
        return {
          name: 'Finished Goods',
          description: 'Complete products ready for use',
          icon: Package,
          color: 'bg-green-100 border-green-300 text-green-800',
          examples: ['Final products', 'Assembled devices', 'Packaged items', 'Ready-to-ship goods']
        };
      case 'consumables':
        return {
          name: 'Consumables',
          description: 'Items used up during production',
          icon: Package,
          color: 'bg-purple-100 border-purple-300 text-purple-800',
          examples: ['Office supplies', 'Cleaning materials', 'Safety equipment', 'Maintenance items']
        };
      case 'packaging':
        return {
          name: 'Packaging Materials',
          description: 'Materials for product packaging',
          icon: Package,
          color: 'bg-pink-100 border-pink-300 text-pink-800',
          examples: ['Boxes', 'Bubble wrap', 'Labels', 'Tape', 'Protective foam']
        };
      case 'tools-equipment':
        return {
          name: 'Tools & Equipment',
          description: 'Tools and machinery for operations',
          icon: Package,
          color: 'bg-indigo-100 border-indigo-300 text-indigo-800',
          examples: ['Hand tools', 'Measuring devices', 'Safety gear', 'Maintenance equipment']
        };
      default:
        return {
          name: 'Materials',
          description: 'General material requests',
          icon: Package,
          color: 'bg-gray-100 border-gray-300 text-gray-800',
          examples: ['General items']
        };
    }
  };

  const category = getMaterialCategory(actualMaterialType);
  const CategoryIcon = category.icon;

  // State for material requests
  const [materialRequests, setMaterialRequests] = useState([
    { id: 1, name: '', quantity: '', unit: 'pcs', priority: 'medium', notes: '', status: 'draft' }
  ]);
  const [requestTitle, setRequestTitle] = useState(`${category.name} Request`);

  // Add new material request
  const addMaterialRequest = () => {
    const newRequest = {
      id: Date.now(),
      name: '',
      quantity: '',
      unit: 'pcs',
      priority: 'medium',
      notes: '',
      status: 'draft'
    };
    setMaterialRequests([...materialRequests, newRequest]);
  };

  // Remove material request
  const removeMaterialRequest = (id) => {
    if (materialRequests.length > 1) {
      setMaterialRequests(materialRequests.filter(req => req.id !== id));
    }
  };

  // Update material request
  const updateMaterialRequest = (id, field, value) => {
    setMaterialRequests(materialRequests.map(req => 
      req.id === id ? { ...req, [field]: value } : req
    ));
  };

  // Get current user from context if not passed as prop
  const vendorContext = useContext(VendorContext);
  const user = currentUser || vendorContext?.currentUser;
  const workspace = workspaceId || data?.workspaceId;

  // Generate request ID in format: REQ-{timestamp}-{random}
  const generateRequestId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `REQ-${timestamp}-${random}`;
  };

  // Send to procurement
  const sendToProcurement = async () => {
    // Validate that at least one request has a name
    const validRequests = materialRequests.filter(req => req.name.trim() !== '');
    
    if (validRequests.length === 0) {
      alert('Please add at least one material item before sending to procurement.');
      return;
    }

    if (!workspace) {
      alert('Error: Workspace ID is missing. Cannot submit procurement request.');
      return;
    }

    if (!user) {
      alert('Error: User information is missing. Cannot submit procurement request.');
      return;
    }

    try {
      // Submit each valid request to backend
      const submissionPromises = validRequests.map(async (request) => {
        const requestId = generateRequestId();
        const now = new Date();
        const sentOn = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
        
        // Format the payload according to the required structure
        const payload = {
          requestId: requestId,
          amount: 0, // Can be calculated if unit price is available
          category: category.name || 'General',
          createdAt: now.toISOString(),
          department: 'Workspace',
          item: request.name.trim(),
          itemDescription: `Material request from workspace: ${workspace}. ${request.notes || ''}`.trim(),
          priority: request.priority || 'medium',
          projectClientReference: null,
          quantity: Number(request.quantity) || 1,
          // Use vendorId as the requestor identifier so backend can track which vendor raised it
          requestor: user.vendorId || user.id || user.email || 'UNKNOWN_VENDOR',
          requiredByDate: null, // Can be added if due date field is added
          sentOn: sentOn,
          source: 'workspace', // Since it's coming from workspace
          status: 'Pending',
          workspaceId: workspace
        };

        console.log('📦 Submitting procurement request:', payload);

        const response = await fetch(`/api/procurement-requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-info': JSON.stringify({
              vendorId: user.vendorId || user.id,
              email: user.email,
              role: user.role || 'vendor',
              name: user.name
            })
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to submit procurement request (Status: ${response.status})`);
        }

        const result = await response.json();
        console.log('✅ Procurement request submitted successfully:', result);
        return result;
      });

      // Wait for all submissions to complete
      await Promise.all(submissionPromises);

      // Update status to submitted
      const submittedRequests = materialRequests.map(req => ({
        ...req,
        status: req.name.trim() !== '' ? 'submitted' : 'draft',
        submittedAt: req.name.trim() !== '' ? new Date().toISOString() : null
      }));
      
      setMaterialRequests(submittedRequests);

      // Show success message
      alert(`✅ Material request sent to procurement!\n\n${validRequests.length} item(s) submitted for ${category.name.toLowerCase()}.\n\nAll requests have been saved to the backend.`);
    } catch (error) {
      console.error('❌ Error submitting procurement request:', error);
      alert(`❌ Error submitting procurement request: ${error.message}\n\nPlease try again or contact support.`);
    }
  };

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'submitted': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'draft': return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className={`p-4 rounded-lg border-2 ${category.color}`}>
        <div className="flex items-center space-x-3 mb-2">
          <CategoryIcon className="w-6 h-6" />
          <div>
            <h3 className="font-semibold text-lg">{category.name}</h3>
            <p className="text-sm opacity-80">{category.description}</p>
          </div>
        </div>
        
        {/* Request Title */}
        <input
          type="text"
          value={requestTitle}
          onChange={(e) => setRequestTitle(e.target.value)}
          className="w-full mt-2 px-3 py-2 bg-white border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
          placeholder="Enter request title"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Material Requests */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Material Items ({materialRequests.length})</h4>
          <button
            onClick={(e) => {
              e.stopPropagation();
              addMaterialRequest();
            }}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors border border-blue-200"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>

        {materialRequests.map((request, index) => (
          <div key={request.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
            {/* Item Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-600">Item {index + 1}</span>
                {getStatusIcon(request.status)}
                <span className="text-xs text-gray-500 capitalize">{request.status}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeMaterialRequest(request.id);
                }}
                className="text-red-500 hover:text-red-700 transition-colors"
                disabled={materialRequests.length === 1}
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            {/* Item Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Material Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Material Name *</label>
                <input
                  type="text"
                  value={request.name}
                  onChange={(e) => updateMaterialRequest(request.id, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder={`e.g., ${category.examples[index % category.examples.length]}`}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              {/* Quantity & Unit */}
              <div className="flex space-x-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={request.quantity}
                    onChange={(e) => updateMaterialRequest(request.id, 'quantity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="0"
                    min="0"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={request.unit}
                    onChange={(e) => updateMaterialRequest(request.id, 'unit', e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                    <option value="m">m</option>
                    <option value="ft">ft</option>
                    <option value="L">L</option>
                    <option value="gal">gal</option>
                    <option value="box">box</option>
                    <option value="roll">roll</option>
                    <option value="sheet">sheet</option>
                  </select>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={request.priority}
                  onChange={(e) => updateMaterialRequest(request.id, 'priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>

              {/* Priority Badge */}
              <div className="flex items-end">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(request.priority)}`}>
                  {request.priority.charAt(0).toUpperCase() + request.priority.slice(1)} Priority
                </span>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <textarea
                value={request.notes}
                onChange={(e) => updateMaterialRequest(request.id, 'notes', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                rows="2"
                placeholder="Additional specifications, delivery requirements, etc."
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Send to Procurement Button */}
      <div className="flex justify-center pt-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            sendToProcurement();
          }}
          className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
        >
          <Send className="w-5 h-5" />
          <span>Send to Procurement</span>
        </button>
      </div>

      {/* Summary */}
      <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-200">
        {materialRequests.filter(req => req.status === 'submitted').length} submitted • {materialRequests.filter(req => req.status === 'draft').length} draft • {category.name}
      </div>
    </div>
  );
};

export default MaterialsRenderer;
