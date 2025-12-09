import React, { useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { VendorContext } from '../context/VendorContext';
import { UserContext } from '../context/UserContext';
import config from '../config/env';
/**
 * ProtectedRoute component that handles route protection based on authentication and approval status
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if conditions are met
 * @param {boolean} props.requireAuth - Whether authentication is required
 * @param {boolean} props.requireApproval - Whether vendor approval is required
 * @returns {React.ReactNode} - The protected component or a redirect
 */
const ProtectedRoute = ({ children, requireAuth = true, requireApproval = false }) => {
  const { currentUser: vendorUser, isAuthenticated: vendorIsAuthenticated, isLoading: vendorContextLoading } = useContext(VendorContext);
  const { currentUser: userContextUser } = useContext(UserContext);
  
  // Use either context for authentication
  const currentUser = vendorUser || userContextUser;
  const isAuthenticated = vendorIsAuthenticated || !!userContextUser;
  const contextLoading = vendorContextLoading;
  const [isLoading, setIsLoading] = useState(true);
  const [vendorStatus, setVendorStatus] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const checkVendorStatus = async () => {
      // If we don't require authentication or there's no current user, skip the check
      if (!requireAuth || !isAuthenticated) {
        setIsLoading(false);
        return;
      }

      try {
        // Get the email from the current user or URL params
        const urlParams = new URLSearchParams(location.search);
        const email = currentUser?.email || urlParams.get('email');

        if (!email) {
          setIsLoading(false);
          return;
        }

        // Check vendor status from the backend
        const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/user-status?email=${encodeURIComponent(email)}`);
        const data = await response.json();

        if (data.success) {
          setVendorStatus(data.data);
        }
      } catch (error) {
        console.error('Error checking vendor status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Only run the check if the context has finished loading
    if (!contextLoading) {
      checkVendorStatus();
    }
  }, [currentUser, location.search, requireAuth, isAuthenticated, contextLoading]);

  // Show loading state while checking
  if (contextLoading || isLoading) {
    return <div>Loading...</div>;
  }

  // Debug information
  console.log("ProtectedRoute Debug:", {
    requireAuth,
    isAuthenticated,
    vendorUser,
    userContextUser,
    currentUser,
    path: location.pathname
  });

  // If authentication is required but user is not logged in
  if (requireAuth && !isAuthenticated) {
    console.log("User not authenticated, redirecting to login");
    // Redirect to login page with the current location for redirect after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If approval is required but vendor is not approved
  if (requireApproval && vendorStatus && vendorStatus.status !== 'approved') {
    if (vendorStatus.status === 'pending' && vendorStatus.hasFilledForm) {
      // If vendor has filled the form but is pending approval
      return <Navigate to="/Auditorapprove" state={{ email: currentUser?.email }} replace />;
    } else {
      // If vendor hasn't filled the form or is rejected
      return <Navigate to="/Form1" state={{ email: currentUser?.email }} replace />;
    }
  }

  // If all conditions are met, render the children
  return children;
};

export default ProtectedRoute;