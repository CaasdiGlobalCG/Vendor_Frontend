import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { VendorContext } from '../../../../../context/VendorContext.jsx';
import config from '../../../../../config/env';
import { 
  Plus, 
  X, 
  Calendar as CalendarIcon, 
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowLeft,
  IndianRupee
} from 'lucide-react';

const NewPurchaseRequisitionForm = ({ onBack, workspaceId }) => {
  const { currentUser } = useContext(VendorContext);
  const navigate = useNavigate();
  
  // Form state - updated to match the required structure
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    requiredBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default to 7 days from now
    items: [{
      name: '',
      description: '',
      quantity: 1,
      estimatedCost: 0,
      unit: 'pcs',
      category: '',
      vendor: ''
    }],
    notes: '',
    deliveryAddress: '',
    purpose: '',
    status: 'draft',
    vendorId: currentUser?.vendorId || '',
    workspaceId: workspaceId || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [categories, setCategories] = useState([
    'Office Supplies',
    'IT Equipment',
    'Furniture',
    'Software',
    'Services',
    'Other'
  ]);

  // Set vendor ID when component mounts
  useEffect(() => {
    if (currentUser?.vendorId) {
      setFormData(prev => ({
        ...prev,
        vendorId: currentUser.vendorId
      }));
    }
  }, [currentUser]);

  // Calculate total cost
  useEffect(() => {
    const total = formData.items.reduce((sum, item) => {
      return sum + (parseFloat(item.estimatedCost) || 0) * (parseInt(item.quantity) || 0);
    }, 0);

    setFormData(prev => ({
      ...prev,
      totalCost: total
    }));
  }, [formData.items]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    const updatedItems = [...formData.items];
    
    // If quantity or estimated cost changes, update the total
    if (name === 'quantity' || name === 'estimatedCost') {
      updatedItems[index] = {
        ...updatedItems[index],
        [name]: value,
        totalCost: (name === 'quantity' 
          ? (parseFloat(updatedItems[index].estimatedCost) || 0) * (parseInt(value) || 0)
          : (parseFloat(value) || 0) * (parseInt(updatedItems[index].quantity) || 0)
        )
      };
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [name]: value
      };
    }

    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          name: '',
          description: '',
          quantity: 1,
          estimatedCost: 0,
          totalCost: 0,
          vendor: '',
          category: '',
        }
      ]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length <= 1) return; // Keep at least one item
    
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!formData.title) {
        throw new Error('Please provide a title for the purchase requisition');
      }
      if (!workspaceId) {
        throw new Error('Workspace ID is missing');
      }
      if (!currentUser?.vendorId) {
        throw new Error('Vendor information is missing');
      }
      if (!formData.deliveryAddress) {
        throw new Error('Delivery address is required');
      }
      if (!formData.purpose) {
        throw new Error('Purpose of purchase is required');
      }

      // Prepare the request payload to match the required structure
      const payload = {
        // Top-level required fields
        title: formData.title,
        vendorId: currentUser?.vendorId,
        workspaceId: workspaceId,
        
        // Additional fields
        description: formData.description || '',
        priority: formData.priority,
        requiredBy: formData.requiredBy,
        
        // Items array
        items: formData.items.map(item => ({
          item_name: item.name,
          item_description: item.description,
          quantity: Number(item.quantity) || 1,
          estimated_unit_price: Number(item.estimatedCost) || 0,
          category: item.category,
          preferred_supplier_id: item.vendor || '',
          unit: item.unit || 'pcs'
        })),
        
        // Contact and delivery info
        contact_person: currentUser?.name || 'Not specified',
        contact_phone: currentUser?.phone || 'Not specified',
        delivery_address: formData.deliveryAddress,
        
        // Purpose and notes
        purpose_of_purchase: formData.purpose,
        notes_for_pm: formData.notes || 'No additional notes',
        
        // Status and dates
        status: 'pending',
        request_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: formData.requiredBy,
        
        // Additional required fields
        from_crm: false,
        urgency_level: formData.priority === 'high' ? 'High' : 
                     (formData.priority === 'medium' ? 'Medium' : 'Low'),
        
        // Ensure these are included for compatibility
        vendor_id: currentUser?.vendorId,
        project_id: workspaceId
      };

      console.log('Submitting purchase requisition with payload:', payload);
      const response = await fetch(`/api/workspace/purchase-requisitions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-info': JSON.stringify({
            vendorId: currentUser.vendorId,
            email: currentUser.email,
            role: 'vendor',
            name: currentUser.name
          })
        },
        body: JSON.stringify(payload)
      });

      // Check if the response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error('Server returned an invalid response. Please try again later.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to create purchase requisition (Status: ${response.status})`);
      }

      setSuccess('Purchase requisition created successfully!');
      
      // Redirect to requisitions list after a short delay
      setTimeout(() => {
        navigate(`/workspace/${workspaceId}/purchase-requisitions`);
      }, 1500);

    } catch (err) {
      console.error('Error creating purchase requisition:', err);
      console.error('Error details:', {
        message: err.message,
        name: err.name,
        stack: err.stack
      });
      
      // Provide more user-friendly error messages
      let errorMessage = 'Failed to create purchase requisition. ';
      
      if (err.message.includes('Failed to fetch')) {
        errorMessage += 'Unable to connect to the server. Please check your internet connection.';
      } else if (err.message.includes('invalid response')) {
        errorMessage += 'The server returned an unexpected response.';
      } else {
        errorMessage += err.message || 'Please try again later.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    
    const text = {
      high: 'High',
      medium: 'Medium',
      low: 'Low'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[priority]}`}>
        {text[priority]}
      </span>
    );
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <h2 className="text-2xl font-semibold text-gray-900">New Purchase Requisition</h2>
        </div>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                status: 'draft'
              }));
              // Save as draft logic here
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Requisition'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 text-sm text-green-700 bg-green-100 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            {success}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Basic Information</h3>
            <p className="mt-1 text-sm text-gray-500">Enter the basic details of your purchase requisition.</p>
            
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="title"
                    id="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="E.g., Office Chairs for New Employees"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <div className="mt-1">
                  <textarea
                    id="description"
                    name="description"
                    rows={2}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Provide details about the purchase requisition..."
                  />
                </div>
              </div>

              {/* Delivery Address */}
              <div className="sm:col-span-6">
                <label htmlFor="deliveryAddress" className="block text-sm font-medium text-gray-700">
                  Delivery Address <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <textarea
                    id="deliveryAddress"
                    name="deliveryAddress"
                    rows={2}
                    required
                    value={formData.deliveryAddress}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Enter the delivery address..."
                  />
                </div>
              </div>

              {/* Purpose of Purchase */}
              <div className="sm:col-span-6">
                <label htmlFor="purpose" className="block text-sm font-medium text-gray-700">
                  Purpose of Purchase <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="purpose"
                    name="purpose"
                    required
                    value={formData.purpose}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="E.g., Office equipment for new employees"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="requiredBy" className="block text-sm font-medium text-gray-700">
                  Required By
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CalendarIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="date"
                    name="requiredBy"
                    id="requiredBy"
                    value={formData.requiredBy}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="block w-full pl-10 rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="-ml-0.5 mr-1.5 h-4 w-4" />
                Add Item
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {formData.items.map((item, index) => (
                <div key={index} className="relative border border-gray-200 rounded-lg p-4">
                  {formData.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                      title="Remove item"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                  
                  <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Item Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={item.name}
                        onChange={(e) => handleItemChange(index, e)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="E.g., Ergonomic Chair"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Category
                      </label>
                      <select
                        name="category"
                        value={item.category}
                        onChange={(e) => handleItemChange(index, e)}
                        className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="">Select a category</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Vendor/Supplier
                      </label>
                      <input
                        type="text"
                        name="vendor"
                        value={item.vendor}
                        onChange={(e) => handleItemChange(index, e)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="Vendor name"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <input
                        type="text"
                        name="description"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, e)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="Item description or specifications"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Quantity
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, e)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Est. Unit Cost
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <IndianRupee className="h-4 w-4 text-gray-500" />
                        </div>
                        <input
                          type="number"
                          name="estimatedCost"
                          min="0"
                          step="0.01"
                          value={item.estimatedCost}
                          onChange={(e) => handleItemChange(index, e)}
                          className="block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Total
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <IndianRupee className="h-4 w-4 text-gray-500" />
                        </div>
                        <input
                          type="text"
                          readOnly
                          value={(item.estimatedCost * item.quantity).toFixed(2)}
                          className="block w-full pl-7 pr-12 sm:text-sm border-gray-300 bg-gray-50 rounded-md"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <div className="text-right">
                <div className="text-sm text-gray-500">Total Estimated Cost:</div>
                <div className="text-2xl font-semibold">
                  ₹{(formData.totalCost || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Additional Information</h3>
            
            <div className="mt-6">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <div className="mt-1">
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Any additional information or special instructions..."
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Provide any additional details that might be helpful for the approver.
              </p>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                status: 'draft'
              }));
              // Save as draft logic here
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save as Draft
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Clock className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Submitting...
              </>
            ) : (
              'Submit Requisition'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewPurchaseRequisitionForm;
