import React, { useState, useContext, useEffect, useRef } from 'react';
import { Plus, Minus, Send, Package, AlertCircle, CheckCircle, Clock, Upload, FileSpreadsheet, Edit2, X } from 'lucide-react';
import { VendorContext } from '../../../../context/VendorContext';
import config from '../../../../config/env';
import { persistNodeDataPatch } from '../../utils/nodePersistence';
import * as XLSX from 'xlsx';

const MaterialsRenderer = ({ data, materialType, workspaceId, currentUser, nodeId }) => {
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

  // State for material requests - initialize from persisted data if available
  const [materialRequests, setMaterialRequests] = useState(() => {
    if (data?.procurementData?.materialRequests && data.procurementData.materialRequests.length > 0) {
      return data.procurementData.materialRequests;
    }
    return [{ id: 1, name: '', quantity: '', unit: 'pcs', priority: 'medium', notes: '', status: 'draft' }];
  });
  const [requestTitle, setRequestTitle] = useState(() => {
    return data?.procurementData?.requestTitle || `${category.name} Request`;
  });
  const [procurementStatus, setProcurementStatus] = useState(() => {
    return data?.procurementData?.status || null; // null, 'sent', 'processing', 'completed'
  });
  const [submittedAt, setSubmittedAt] = useState(() => {
    return data?.procurementData?.submittedAt || null;
  });

  // State for change request mode
  const [isChangeRequestMode, setIsChangeRequestMode] = useState(false);
  const [originalRequestIds, setOriginalRequestIds] = useState(() => {
    return data?.procurementData?.requestIds || []; // Store original request IDs for updates
  });

  // Persist procurement data to node
  const persistProcurementData = async (procurementData) => {
    if (!workspaceId || !nodeId) {
      console.warn('Cannot persist: missing workspaceId or nodeId');
      return;
    }
    try {
      await persistNodeDataPatch(
        nodeId,
        { procurementData },
        null,
        workspaceId
      );
      console.log('✅ Procurement data persisted successfully');
    } catch (err) {
      console.error('Failed to persist procurement data:', err);
    }
  };

  // File input ref for Excel upload
  const fileInputRef = useRef(null);

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

  // Handle Excel file upload
  const handleExcelUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('Please upload a valid Excel file (.xlsx, .xls) or CSV file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          alert('The Excel file appears to be empty or has no data rows.');
          return;
        }

        // Get headers (first row) and normalize them
        const headers = jsonData[0].map(h => String(h || '').toLowerCase().trim());
        
        // Map common column names to our fields
        const columnMapping = {
          name: ['name', 'material name', 'item', 'item name', 'material', 'product', 'product name', 'description'],
          quantity: ['quantity', 'qty', 'amount', 'count', 'no', 'number'],
          unit: ['unit', 'uom', 'unit of measure', 'measure'],
          priority: ['priority', 'urgency', 'importance'],
          notes: ['notes', 'note', 'remarks', 'remark', 'comment', 'comments', 'description', 'details']
        };

        // Find column indices
        const findColumnIndex = (fieldMappings) => {
          for (const mapping of fieldMappings) {
            const index = headers.findIndex(h => h.includes(mapping) || mapping.includes(h));
            if (index !== -1) return index;
          }
          return -1;
        };

        const nameIndex = findColumnIndex(columnMapping.name);
        const quantityIndex = findColumnIndex(columnMapping.quantity);
        const unitIndex = findColumnIndex(columnMapping.unit);
        const priorityIndex = findColumnIndex(columnMapping.priority);
        const notesIndex = findColumnIndex(columnMapping.notes);

        if (nameIndex === -1) {
          alert('Could not find a "Name" or "Material Name" column in the Excel file.\n\nPlease ensure your Excel has columns like: Name, Quantity, Unit, Priority, Notes');
          return;
        }

        // Parse data rows (skip header)
        const newRequests = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          
          const name = row[nameIndex] ? String(row[nameIndex]).trim() : '';
          if (!name) continue; // Skip rows without a name

          // Parse quantity
          let quantity = '';
          if (quantityIndex !== -1 && row[quantityIndex] !== undefined) {
            quantity = String(row[quantityIndex]).trim();
          }

          // Parse unit
          let unit = 'pcs';
          if (unitIndex !== -1 && row[unitIndex]) {
            const unitValue = String(row[unitIndex]).toLowerCase().trim();
            const validUnits = ['pcs', 'kg', 'lbs', 'm', 'ft', 'l', 'gal', 'box', 'roll', 'sheet'];
            if (validUnits.includes(unitValue)) {
              unit = unitValue === 'l' ? 'L' : unitValue;
            }
          }

          // Parse priority
          let priority = 'medium';
          if (priorityIndex !== -1 && row[priorityIndex]) {
            const priorityValue = String(row[priorityIndex]).toLowerCase().trim();
            if (['low', 'medium', 'high'].includes(priorityValue)) {
              priority = priorityValue;
            }
          }

          // Parse notes
          let notes = '';
          if (notesIndex !== -1 && row[notesIndex]) {
            notes = String(row[notesIndex]).trim();
          }

          newRequests.push({
            id: Date.now() + i,
            name,
            quantity,
            unit,
            priority,
            notes,
            status: 'draft'
          });
        }

        if (newRequests.length === 0) {
          alert('No valid material items found in the Excel file.');
          return;
        }

        // Replace or append to existing requests
        setMaterialRequests(newRequests);
        alert(`✅ Successfully imported ${newRequests.length} material item(s) from Excel!`);

      } catch (error) {
        console.error('Error parsing Excel file:', error);
        alert('Error parsing Excel file. Please ensure it is a valid Excel or CSV file.');
      }
    };

    reader.readAsArrayBuffer(file);
    
    // Reset file input so the same file can be uploaded again
    event.target.value = '';
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

  // Send to procurement (handles both new submissions and change requests/updates)
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
      const submissionPromises = validRequests.map(async (request, index) => {
        // Use original request ID if updating, generate new one if creating
        const requestId = isChangeRequestMode && originalRequestIds[index] 
          ? originalRequestIds[index]
          : generateRequestId();
        
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

        console.log(`📦 ${isChangeRequestMode ? 'Updating' : 'Submitting'} procurement request:`, payload);

        // Determine if this is a new request or an update
        const isUpdate = isChangeRequestMode && originalRequestIds[index];
        const method = isUpdate ? 'PUT' : 'POST';
        const endpoint = isUpdate ? `/api/procurement-requests/${requestId}` : `/api/procurement-requests`;

        const response = await fetch(endpoint, {
          method: method,
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
          throw new Error(errorData.message || `Failed to ${isUpdate ? 'update' : 'submit'} procurement request (Status: ${response.status})`);
        }

        const result = await response.json();
        console.log(`✅ Procurement request ${isUpdate ? 'updated' : 'submitted'} successfully:`, result);
        return { ...result, requestId: requestId };
      });

      // Wait for all submissions to complete
      const submissionResults = await Promise.all(submissionPromises);

      // Extract request IDs from successful submissions for future updates
      const newRequestIds = submissionResults.map(result => result.requestId);

      // Update status to submitted
      const submittedRequests = materialRequests.map(req => ({
        ...req,
        status: req.name.trim() !== '' ? 'submitted' : 'draft',
        submittedAt: req.name.trim() !== '' ? new Date().toISOString() : null
      }));
      
      setMaterialRequests(submittedRequests);
      
      // Update procurement status
      const now = new Date().toISOString();
      setProcurementStatus('sent');
      setSubmittedAt(now);
      
      // Reset change request mode
      setIsChangeRequestMode(false);
      
      // Store request IDs for future updates
      setOriginalRequestIds(newRequestIds);

      // Persist the procurement data to the node
      await persistProcurementData({
        status: 'sent',
        submittedAt: now,
        requestTitle: requestTitle,
        materialRequests: submittedRequests,
        itemCount: validRequests.length,
        requestIds: newRequestIds // Store request IDs for updates
      });

      // Show success message
      const actionMsg = isChangeRequestMode ? 'updated and sent' : 'sent';
      alert(`✅ Material request ${actionMsg} to procurement!\n\n${validRequests.length} item(s) ${actionMsg} for ${category.name.toLowerCase()}.\n\nAll requests have been saved to the backend.`);
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
      {/* Sent to Procurement Status Banner */}
      {procurementStatus === 'sent' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Sent to Procurement Team</p>
            <p className="text-xs text-green-600">
              {submittedAt && `Submitted on ${new Date(submittedAt).toLocaleDateString()} at ${new Date(submittedAt).toLocaleTimeString()}`}
            </p>
          </div>
        </div>
      )}

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
          disabled={procurementStatus === 'sent' && !isChangeRequestMode}
        />
      </div>

      {/* Material Requests */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Material Items ({materialRequests.length})</h4>
          <div className="flex items-center space-x-2">
            {/* Hidden file input for Excel upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleExcelUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onClick={(e) => e.stopPropagation()}
            />
            {/* Upload Excel Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors border ${
                procurementStatus === 'sent' && !isChangeRequestMode
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                  : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'
              }`}
              disabled={procurementStatus === 'sent' && !isChangeRequestMode}
              title="Upload Excel file with material items"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Upload Excel</span>
            </button>
            {/* Add Item Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                addMaterialRequest();
              }}
              className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors border ${
                procurementStatus === 'sent' && !isChangeRequestMode
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
              }`}
              disabled={procurementStatus === 'sent' && !isChangeRequestMode}
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>
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
              {procurementStatus !== 'sent' && (
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
              )}
              {procurementStatus === 'sent' && !isChangeRequestMode && (
                <span className="text-xs text-green-600 font-medium">✓ Submitted</span>
              )}
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
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${procurementStatus === 'sent' && !isChangeRequestMode ? 'bg-gray-100' : ''}`}
                  placeholder={`e.g., ${category.examples[index % category.examples.length]}`}
                  onClick={(e) => e.stopPropagation()}
                  disabled={procurementStatus === 'sent' && !isChangeRequestMode}
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
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${procurementStatus === 'sent' && !isChangeRequestMode ? 'bg-gray-100' : ''}`}
                    placeholder="0"
                    min="0"
                    onClick={(e) => e.stopPropagation()}
                    disabled={procurementStatus === 'sent' && !isChangeRequestMode}
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={request.unit}
                    onChange={(e) => updateMaterialRequest(request.id, 'unit', e.target.value)}
                    className={`w-full px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${procurementStatus === 'sent' && !isChangeRequestMode ? 'bg-gray-100' : ''}`}
                    onClick={(e) => e.stopPropagation()}
                    disabled={procurementStatus === 'sent' && !isChangeRequestMode}
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
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${procurementStatus === 'sent' && !isChangeRequestMode ? 'bg-gray-100' : ''}`}
                  onClick={(e) => e.stopPropagation()}
                  disabled={procurementStatus === 'sent' && !isChangeRequestMode}
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
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none ${procurementStatus === 'sent' && !isChangeRequestMode ? 'bg-gray-100' : ''}`}
                rows="2"
                placeholder="Additional specifications, delivery requirements, etc."
                onClick={(e) => e.stopPropagation()}
                disabled={procurementStatus === 'sent' && !isChangeRequestMode}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Send to Procurement Button */}
      <div className="flex justify-center gap-3 pt-4">
        {procurementStatus === 'sent' && !isChangeRequestMode ? (
          <>
            <div className="flex items-center space-x-3 px-6 py-3 bg-green-50 text-green-700 rounded-lg border border-green-300 flex-1">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="font-medium">Sent to Procurement</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsChangeRequestMode(true);
              }}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 rounded-lg transition-colors font-medium"
              title="Request for change - modify and resubmit"
            >
              <Edit2 className="w-5 h-5" />
              <span>Request for Change</span>
            </button>
          </>
        ) : procurementStatus === 'sent' && isChangeRequestMode ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsChangeRequestMode(false);
              }}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg transition-colors font-medium"
            >
              <X className="w-5 h-5" />
              <span>Cancel Change</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                sendToProcurement();
              }}
              className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
            >
              <Send className="w-5 h-5" />
              <span>Send Updated Request</span>
            </button>
          </>
        ) : (
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
        )}
      </div>

      {/* Summary */}
      <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-200">
        {procurementStatus === 'sent' 
          ? `✓ ${materialRequests.filter(req => req.status === 'submitted').length} item(s) sent to procurement • ${category.name}`
          : `${materialRequests.filter(req => req.status === 'submitted').length} submitted • ${materialRequests.filter(req => req.status === 'draft').length} draft • ${category.name}`
        }
      </div>
    </div>
  );
};

export default MaterialsRenderer;
