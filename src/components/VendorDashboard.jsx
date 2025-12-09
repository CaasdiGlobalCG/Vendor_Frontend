import React, { useContext, useEffect, useState } from 'react';
import { UserContext } from '../context/UserContext';
import { VendorContext } from '../context/VendorContext';
import { useLocation, useNavigate } from 'react-router-dom';
import config from '../config/env';

export default function VendorDashboard() {
  const userContext = useContext(UserContext);
  const vendorContext = useContext(VendorContext);
  const currentUser = userContext ? userContext.currentUser : null;
  const location = useLocation();
  const navigate = useNavigate();
  const [vendorInfo, setVendorInfo] = useState(null);
  const { role } = location.state || {};

  useEffect(() => {
    // Check if we have vendor email from URL params, location state, or context
    const urlParams = new URLSearchParams(location.search);
    const email = urlParams.get('email') || 
                 location.state?.email ||
                 (vendorContext?.currentUser?.email) || 
                 (currentUser?.email);
    
    console.log("VendorDashboard - checking email:", email);
    
    if (email) {
      // Fetch vendor information from backend
      const fetchVendorInfo = async () => {
        try {
          console.log("Fetching vendor info for email:", email);
          const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/vendors?email=${encodeURIComponent(email)}`);
          
          if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
          }
          
          const data = await response.json();
          console.log("Vendor data response:", data);
          
          if (data.success && data.data.length > 0) {
            const vendor = data.data[0];
            setVendorInfo(vendor);
            
            // If vendor is not approved or hasn't filled form, redirect to appropriate page
            if (vendor.status !== 'approved') {
              console.log("Redirecting - vendor status not approved or form not filled:", {
                status: vendor.status,
                hasFilledForm: vendor.hasFilledForm
              });
              
              if (vendor.status === 'pending') {
                navigate('/Auditorapprove', { state: { role, email }, replace: true });
              } else {
                navigate('/Form1', { state: { role, email }, replace: true });
              }
            } else {
              console.log("Vendor approved and form filled - staying on dashboard");
            }
          } else {
            console.error("Vendor not found or data format incorrect:", data);
            navigate('/Form1', { state: { role, email }, replace: true });
          }
        } catch (error) {
          console.error('Error fetching vendor info:', error);
          // Don't redirect on error - let user stay on dashboard
        }
      };
      
      fetchVendorInfo();
    } else {
      console.error("No email found for vendor lookup");
      navigate('/login', { replace: true });
    }
  }, [location, navigate, vendorContext, currentUser]);

  return (
    <div className="min-h-screen bg-gradient-to-r from-green-100 via-green-200 to-green-300 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-green-800">Vendor Dashboard</h1>
        <p className="text-lg text-green-700 mb-4">
          Welcome, {vendorInfo?.vendorDetails?.primaryContactName || currentUser?.name || 'Vendor'}!
        </p>
        <p className="text-green-700">
          Your vendor application has been approved. You now have access to the dashboard.
        </p>
        {/* Additional vendor-specific info and features can be added here */}
        {vendorInfo && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-3 text-green-800">Your Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><strong>Company:</strong> {vendorInfo.companyDetails?.companyName || 'N/A'}</p>
                <p><strong>Email:</strong> {vendorInfo.vendorDetails?.primaryContactEmail || 'N/A'}</p>
                <p><strong>Status:</strong> <span className="text-green-600 font-semibold">Approved</span></p>
              </div>
              <div>
                <p><strong>Phone:</strong> {vendorInfo.vendorDetails?.primaryContactPhone || 'N/A'}</p>
                <p><strong>Registration Date:</strong> {new Date(vendorInfo.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
