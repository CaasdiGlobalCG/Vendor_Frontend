import React, { useState, useEffect, useContext } from 'react';
import { Search, Plus, Package, Eye, Edit, Trash2 } from 'lucide-react';
import { VendorContext } from "../../../../../context/VendorContext.jsx";
import AddItemModal from "../../../../../components/AddItemModal";
import ItemViewModal from "../../../../../components/ItemViewModal";
import ItemEditModal from '../../../../../components/ItemEditModal';
import config from '../../../../../config/env';
import invoiceFetch from '../utils/invoiceFetch';

const ItemsPage = () => {
  const { currentUser } = useContext(VendorContext);
  const [itemsData, setItemsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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
        
        const response = await invoiceFetch(`/api/workspace/items?vendorId=${vendorId}`, {
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

      const response = await invoiceFetch(`/api/workspace/items/${item.id}`, {
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
      <div className="p-8 bg-gradient-to-br from-surface-hover to-surface-hover min-h-full">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-line mx-auto mb-4"></div>
            <p className="text-dim">Loading items...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gradient-to-br from-surface-hover to-surface-hover min-h-full">
      {/* Error Alert */}
      {error && (
        <div className="mb-4 bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg">
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
            <h1 className="text-3xl font-bold text-ink mb-2">Items Management</h1>
            <p className="text-dim">Manage your inventory items</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-black text-white px-6 py-2 rounded-lg hover:from-black hover:to-black transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform "
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface p-4 rounded-xl  border border-line  transition-shadow">
            <div className="flex items-center">
              <div className="bg-info/10 p-3 rounded-lg">
                <Package className="w-5 h-5 text-info" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-dim">Total Items</p>
                <p className="text-xl font-bold text-ink">{itemsData.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-surface p-4 rounded-xl  border border-line  transition-shadow">
            <div className="flex items-center">
              <div className="bg-success/10 p-3 rounded-lg">
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-dim">Active Items</p>
                <p className="text-xl font-bold text-ink">{itemsData.filter(item => item.status === 'Active').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-surface p-4 rounded-xl  border border-line  transition-shadow">
            <div className="flex items-center">
              <div className="bg-surface-hover p-3 rounded-lg">
                <svg className="w-5 h-5 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-dim">Categories</p>
                <p className="text-xl font-bold text-ink">1</p>
              </div>
            </div>
          </div>
          <div className="bg-surface p-4 rounded-xl  border border-line  transition-shadow">
            <div className="flex items-center">
              <div className="bg-warning/10 p-3 rounded-lg">
                <svg className="w-5 h-5 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-dim">Avg. Price</p>
                <p className="text-xl font-bold text-ink">₹2,462</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Items Table */}
      <div className="bg-surface rounded-2xl shadow-lg overflow-hidden border border-line">
        {/* Table Header */}
        <div className="bg-gradient-to-r from-surface-hover to-surface-hover px-6 py-4 border-b border-line">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-ink">Inventory Items</h3>
              <span className="bg-surface-hover text-ink text-xs font-medium px-2.5 py-0.5 rounded-full">
                {itemsData.filter(item => 
                  item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.type.toLowerCase().includes(searchQuery.toLowerCase())
                ).length} items
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 transform  text-dim w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search items by name, category, or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-line rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent text-sm"
                />
              </div>
              <button className="text-dim hover:text-ink p-2 hover:bg-surface-hover rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-canvas">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-dim uppercase tracking-wider border-b border-line">
                  Item Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-dim uppercase tracking-wider border-b border-line">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-dim uppercase tracking-wider border-b border-line">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-dim uppercase tracking-wider border-b border-line">
                  Unit
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-dim uppercase tracking-wider border-b border-line">
                  Rate
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-dim uppercase tracking-wider border-b border-line">
                  GST
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-dim uppercase tracking-wider border-b border-line">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-dim uppercase tracking-wider border-b border-line">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {itemsData
                .filter(item => 
                  item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.type.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((item, index) => (
                <tr key={item.id} className="hover:bg-gradient-to-r hover:from-black hover:to-black cursor-pointer transition-all duration-200 group">
                  <td className="px-6 py-5">
                    <div className="flex items-start">
                      <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white font-semibold text-sm mr-4 ">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-ink group-hover:text-ink transition-colors mb-1">
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="text-xs text-dim mb-1">{item.description}</div>
                        )}
                        {item.hsn && (
                          <div className="text-xs text-dim">{item.hsn}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-ink">
                    {item.category}
                  </td>
                  <td className="px-6 py-5 text-sm text-ink">
                    {item.unit}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="text-sm font-semibold text-ink">
                      {item.rate}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      item.gst === '18%' ? 'bg-success/10 text-success' : 'bg-surface-hover text-ink'
                    }`}>
                      {item.gst}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                      <div className="w-1.5 h-1.5 bg-success rounded-full mr-1.5"></div>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button 
                        onClick={() => handleViewItem(item)}
                        className="p-2 text-dim hover:text-ink hover:bg-surface-hover rounded-lg transition-all duration-200" 
                        title="View Item"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEditItem(item)}
                        className="p-2 text-dim hover:text-info hover:bg-info/10 rounded-lg transition-all duration-200" 
                        title="Edit Item"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteItem(item)}
                        className="p-2 text-dim hover:text-danger hover:bg-danger/10 rounded-lg transition-all duration-200" 
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
        <div className="bg-canvas px-6 py-4 border-t border-line">
          <div className="flex items-center justify-between">
            <div className="text-sm text-dim">
              Showing <span className="font-medium">1</span> to <span className="font-medium">
                {itemsData.filter(item => 
                  item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.type.toLowerCase().includes(searchQuery.toLowerCase())
                ).length}
              </span> of{' '}
              <span className="font-medium">{itemsData.length}</span> items
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 text-sm text-dim hover:text-ink hover:bg-surface-hover rounded-md transition-colors">
                Previous
              </button>
              <button className="px-3 py-1 text-sm bg-cta text-cta-foreground rounded-md hover:bg-cta transition-colors">
                1
              </button>
              <button className="px-3 py-1 text-sm text-dim hover:text-ink hover:bg-surface-hover rounded-md transition-colors">
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
