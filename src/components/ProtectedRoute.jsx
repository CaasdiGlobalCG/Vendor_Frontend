import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { VendorContext } from '../context/VendorContext';
import { UserContext } from '../context/UserContext';
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
  const { currentUser: vendorUser, isHydratingUser: vendorContextLoading } = useContext(VendorContext);
  const { currentUser: userContextUser } = useContext(UserContext);
  
  // Use either context for authentication
  const currentUser = vendorUser || userContextUser;
  const isAuthenticated = Boolean(vendorUser || userContextUser);
  const location = useLocation();

  const vendorStatus = vendorUser?.status ? String(vendorUser.status).toLowerCase() : null;
  const hasFilledFormKnown = typeof vendorUser?.hasFilledForm === 'boolean';
  const hasFilledForm = vendorUser?.hasFilledForm === true;

  // Show loading state while checking
  if (vendorContextLoading) {
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
  if (requireApproval && vendorStatus && vendorStatus !== 'approved') {
    // Don't redirect until we know whether the form is filled.
    if (!hasFilledFormKnown) {
      return <div>Loading...</div>;
    }
    if (vendorStatus === 'pending' && hasFilledForm) {
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