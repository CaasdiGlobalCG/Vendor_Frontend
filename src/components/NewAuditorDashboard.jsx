import React, { useEffect, useState } from 'react';
import { Tab } from '@headlessui/react';
import config from '../config/env';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function NewAuditorDashboard() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/vendors`);
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Fetched vendors data:", data);
      
      if (data.success) {
        const vendorsData = data.data || [];
        setVendors(vendorsData);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch vendors');
        setVendors([]);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setError('Error connecting to server. Please try again later.');
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [refreshTrigger]);

  const handleApprove = async (id) => {
    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/vendors/${id}/approve`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        // Refresh the vendor list
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert('Failed to approve vendor: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error approving vendor:', error);
      alert('Error approving vendor. Please try again.');
    }
  };

  const handleReject = async (id) => {
    try {
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/vendors/${id}/reject`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        // Refresh the vendor list
        setRefreshTrigger(prev => prev + 1);
      } else {
        alert('Failed to reject vendor: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error rejecting vendor:', error);
      alert('Error rejecting vendor. Please try again.');
    }
  };

  const renderVendorDetails = (vendor) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div>
          <p><strong>Contact:</strong> {vendor.vendorDetails?.primaryContactName || vendor.name || 'N/A'}</p>
          <p><strong>Email:</strong> {vendor.vendorDetails?.primaryContactEmail || vendor.email || 'N/A'}</p>
          <p><strong>Phone:</strong> {vendor.vendorDetails?.phoneNumber || 'N/A'}</p>
          <p><strong>Company:</strong> {vendor.companyDetails?.companyName || vendor.vendorDetails?.companyName || 'N/A'}</p>
        </div>
        <div>
          <p><strong>Address:</strong> {vendor.vendorDetails?.address || 'N/A'}</p>
          <p><strong>GST Number:</strong> {vendor.vendorDetails?.gstin || 'N/A'}</p>
          <p><strong>Form Status:</strong> {vendor.hasFilledForm ? 'Completed' : 'Incomplete'}</p>
          <p><strong>Submitted:</strong> {new Date(vendor.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    );
  };

  const renderVendorCard = (vendor, showActions = false) => {
    const statusColors = {
      pending: 'yellow',
      approved: 'green',
      rejected: 'red'
    };
    
    const color = statusColors[vendor.status] || 'gray';
    
    return (
      <div key={vendor._id} className={`border border-${color}-400 rounded-lg p-5 shadow-sm mb-4 bg-${color}-50`}>
        <div className="flex justify-between items-start">
          <h2 className="text-xl font-semibold text-gray-800">
            {vendor.companyDetails?.companyName || vendor.vendorDetails?.companyName || vendor.vendorDetails?.primaryContactName || vendor.name || 'Vendor Name Not Provided'}
          </h2>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-${color}-100 text-${color}-800`}>
            {vendor.status.charAt(0).toUpperCase() + vendor.status.slice(1)}
          </span>
        </div>
        
        {renderVendorDetails(vendor)}
        
        {showActions && (
          <div className="mt-4 flex space-x-4">
            <button
              onClick={() => handleApprove(vendor._id)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Approve
            </button>
            <button
              onClick={() => handleReject(vendor._id)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Reject
            </button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Loading vendors...</h2>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 animate-pulse rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button 
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Filter vendors by status
  const allVendors = vendors;
  const pendingVendors = vendors.filter(vendor => vendor.status === 'pending');
  const approvedVendors = vendors.filter(vendor => vendor.status === 'approved');

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Auditor Dashboard</h1>
          <button 
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Refresh
          </button>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
            <span className="text-sm font-medium">Pending: {pendingVendors.length}</span>
            <div className="w-2 h-2 rounded-full bg-green-500 mx-4 mr-2"></div>
            <span className="text-sm font-medium">Approved: {approvedVendors.length}</span>
            <div className="w-2 h-2 rounded-full bg-red-500 mx-4 mr-2"></div>
            <span className="text-sm font-medium">Rejected: {vendors.filter(v => v.status === 'rejected').length}</span>
            <div className="w-2 h-2 rounded-full bg-gray-500 mx-4 mr-2"></div>
            <span className="text-sm font-medium">Total: {vendors.length}</span>
          </div>
        </div>

        <Tab.Group>
          <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-6">
            <Tab
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                )
              }
            >
              All Vendors ({allVendors.length})
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                )
              }
            >
              Pending Approval ({pendingVendors.length})
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames(
                  'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                  'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                  selected
                    ? 'bg-white text-blue-700 shadow'
                    : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
                )
              }
            >
              Approved ({approvedVendors.length})
            </Tab>
          </Tab.List>
          <Tab.Panels className="mt-2">
            <Tab.Panel
              className={classNames(
                'rounded-xl bg-white p-3',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
              )}
            >
              <div className="space-y-4">
                {allVendors.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-700 text-lg">No vendors found.</p>
                  </div>
                ) : (
                  allVendors.map(vendor => renderVendorCard(vendor))
                )}
              </div>
            </Tab.Panel>
            <Tab.Panel
              className={classNames(
                'rounded-xl bg-white p-3',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
              )}
            >
              <div className="space-y-4">
                {pendingVendors.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-700 text-lg">No pending vendors found.</p>
                    <p className="text-gray-500 mt-2">All vendors have been reviewed.</p>
                  </div>
                ) : (
                  pendingVendors.map(vendor => renderVendorCard(vendor, true))
                )}
              </div>
            </Tab.Panel>
            <Tab.Panel
              className={classNames(
                'rounded-xl bg-white p-3',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2'
              )}
            >
              <div className="space-y-4">
                {approvedVendors.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-700 text-lg">No approved vendors found.</p>
                    <p className="text-gray-500 mt-2">Approve vendors to see them here.</p>
                  </div>
                ) : (
                  approvedVendors.map(vendor => renderVendorCard(vendor))
                )}
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
}