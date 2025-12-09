import React, { useState, useEffect, useContext } from 'react';
import { Search, Plus, Package, Eye, Edit, Trash2 } from 'lucide-react';
import { VendorContext } from "../../../../../context/VendorContext.jsx";
import AddItemModal from "../../../../../components/AddItemModal";
import ItemViewModal from "../../../../../components/ItemViewModal";
import ItemEditModal from '../../../../../components/ItemEditModal';
import config from '../../../../../config/env';

const ItemsPage = () => {
  const { currentUser } = useContext(VendorContext);
  const [itemsData, setItemsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Using relative paths - no API_BASE_URL needed

  // Fetch items from backend
  useEffect(() => {
    const fetchItems = async () => {
      if (!currentUser?.vendorId) {
        console.log('⏳ Waiting for user authentication...');
        return;
      }

      try {
        setLoading(true);
        console.log('📦 Fetching items from workspace backend...');
        
        const vendorId = currentUser.vendorId;
        const headers = {
          'Content-Type': 'application/json',
          'x-user-info': JSON.stringify({
            vendorId: vendorId,
            email: currentUser?.email,
            role: 'vendor',
            name: currentUser?.name
          })
        };
        
        const response = await fetch(`/api/workspace/items?vendorId=${vendorId}`, {
          headers: headers
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          // Transform backend data to match frontend format
          const transformedItems = result.data.map(item => ({
            id: item.itemId || item.id,
            name: item.name || item.itemName || 'Unnamed Item',
            description: item.description || '',
            type: item.type || 'Product',
            category: item.category || '-',
            unit: item.unit || '-',
            rate: item.rate ? `₹${item.rate}` : '-',
            gst: item.gst ? `${item.gst}%` : '%',
            status: item.status || 'Active',
            hsn: item.hsn ? `HSN: ${item.hsn}` : ''
          }));
          
          setItemsData(transformedItems);
          console.log(`✅ Successfully loaded ${transformedItems.length} items from workspace`);
        } else {
          throw new Error(result.message || 'Failed to fetch items');
        }
      } catch (error) {
        console.error('❌ Error fetching items:', error);
        setError(error.message);
        // Fallback to empty array if API fails
        setItemsData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [currentUser?.vendorId]);

  // Handle new item added
  const handleItemAdded = (newItem) => {
    // Transform the new item to match frontend format
    const transformedItem = {
      id: newItem.itemId || newItem.id,
      name: newItem.name || newItem.itemName || 'Unnamed Item',
      description: newItem.description || '',
      type: newItem.type || 'Product',
      category: newItem.category || '-',
      unit: newItem.unit || '-',
      rate: newItem.rate ? `₹${newItem.rate}` : '-',
      gst: newItem.gst ? `${newItem.gst}%` : '%',
      status: newItem.status || 'Active',
      hsn: newItem.hsn ? `HSN: ${newItem.hsn}` : (newItem.sac ? `SAC: ${newItem.sac}` : ''),
      vendorId: newItem.vendorId
    };
    
    // Add to the beginning of the items list
    setItemsData(prev => [transformedItem, ...prev]);
  };

  // Handle item updated
  const handleItemUpdated = (updatedItem) => {
    // Transform the updated item to match frontend format
    const transformedItem = {
      id: updatedItem.itemId || updatedItem.id,
      name: updatedItem.name || updatedItem.itemName || 'Unnamed Item',
      description: updatedItem.description || '',
      type: updatedItem.type || 'Product',
      category: updatedItem.category || '-',
      unit: updatedItem.unit || '-',
      rate: updatedItem.rate ? `₹${updatedItem.rate}` : '-',
      gst: updatedItem.gst ? `${updatedItem.gst}%` : '%',
      status: updatedItem.status || 'Active',
      hsn: updatedItem.hsn ? `HSN: ${updatedItem.hsn}` : (updatedItem.sac ? `SAC: ${updatedItem.sac}` : ''),
      vendorId: updatedItem.vendorId
    };
    
    // Update the item in the list
    setItemsData(prev => prev.map(item => 
      item.id === transformedItem.id ? transformedItem : item
    ));
  };

  // Action handlers
  const handleViewItem = (item) => {
    setSelectedItem(item);
    setShowViewModal(true);
  };

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setShowEditModal(true);
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const vendorId = currentUser?.vendorId;
      const headers = {
        'Content-Type': 'application/json',
        'x-user-info': JSON.stringify({
          vendorId: vendorId,
          email: currentUser?.email,
          role: 'vendor',
          name: currentUser?.name
        })
      };

      const response = await fetch(`/api/workspace/items/${item.id}`, {
        method: 'DELETE',
        headers: headers
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Remove item from the list
        setItemsData(prev => prev.filter(i => i.id !== item.id));
        alert('Item deleted successfully!');
      } else {
        throw new Error(result.message || 'Failed to delete item');
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert(`Error deleting item: ${error.message}`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-full">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading items...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-full">
      {/* Error Alert */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>Error loading items: {error}</span>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Items Management</h1>
            <p className="text-gray-600">Manage your inventory items</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center space-x-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export</span>
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-2 rounded-lg hover:from-teal-700 hover:to-teal-800 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-xl font-bold text-gray-900">{itemsData.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">Active Items</p>
                <p className="text-xl font-bold text-gray-900">{itemsData.filter(item => item.status === 'Active').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="bg-purple-100 p-3 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">Categories</p>
                <p className="text-xl font-bold text-gray-900">1</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-3 rounded-lg">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-600">Avg. Price</p>
                <p className="text-xl font-bold text-gray-900">₹2,462</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Items Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
        {/* Table Header */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">Inventory Items</h3>
              <span className="bg-teal-100 text-teal-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {itemsData.length} items
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search items..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>
              <button className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Item Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Unit
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Rate
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  GST
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itemsData.map((item, index) => (
                <tr key={item.id} className="hover:bg-gradient-to-r hover:from-teal-50 hover:to-blue-50 cursor-pointer transition-all duration-200 group">
                  <td className="px-6 py-5">
                    <div className="flex items-start">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-lg flex items-center justify-center text-white font-semibold text-sm mr-4 shadow-md">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900 group-hover:text-teal-700 transition-colors mb-1">
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="text-xs text-gray-500 mb-1">{item.description}</div>
                        )}
                        {item.hsn && (
                          <div className="text-xs text-gray-400">{item.hsn}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-900">
                    {item.category}
                  </td>
                  <td className="px-6 py-5 text-sm text-gray-900">
                    {item.unit}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {item.rate}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item.gst === '18%' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.gst}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></div>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button 
                        onClick={() => handleViewItem(item)}
                        className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-all duration-200" 
                        title="View Item"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEditItem(item)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200" 
                        title="Edit Item"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(item)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200" 
                        title="Delete Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-medium">1</span> to <span className="font-medium">{itemsData.length}</span> of{' '}
              <span className="font-medium">{itemsData.length}</span> items
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors">
                Previous
              </button>
              <button className="px-3 py-1 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors">
                1
              </button>
              <button className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-md transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onItemAdded={handleItemAdded}
      />

      {/* View Item Modal */}
      <ItemViewModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        item={selectedItem}
      />

      {/* Edit Item Modal */}
      <ItemEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        item={selectedItem}
        onItemUpdated={handleItemUpdated}
      />
    </div>
  );
};

export default ItemsPage;
