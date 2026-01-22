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
    // Never trust identity from URL params; rely on authenticated /me.
    const fetchVendorInfo = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/me`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!response.ok) {
          // If not authenticated, go to login.
          if (response.status === 401) {
            navigate('/login', { replace: true });
          }
          return;
        }

        const payload = await response.json();
        const vendor = payload?.data;
        if (!payload?.success || !vendor) {
          return;
        }

        setVendorInfo(vendor);

        // Redirect only when state is definitive.
        const status = String(vendor?.status || '').toLowerCase();
        const hasFilledForm = vendor?.hasFilledForm;
        const email = vendor?.email || vendor?.vendorDetails?.primaryContactEmail || vendorContext?.currentUser?.email || currentUser?.email;

        // Once the vendor has submitted, they should be in pending review.
        // Don't bounce them back to Form1 on refresh.
        if (status === 'pending') {
          navigate('/Auditorapprove', { state: { role, email }, replace: true });
          return;
        }

        if (typeof hasFilledForm === 'boolean' && hasFilledForm === false) {
          navigate('/Form1', { state: { role, email }, replace: true });
          return;
        }
        if (status && status !== 'approved') {
          navigate('/Auditorapprove', { state: { role, email }, replace: true });
        }
      } catch (error) {
        console.error('Error fetching vendor info:', error);
      }
    };

    fetchVendorInfo();
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
