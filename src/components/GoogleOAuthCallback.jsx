import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { VendorContext } from '../context/VendorContext';
import config from '../config/env';

/**
 * GoogleOAuthCallback
 *
 * Handles the post-Google OAuth redirect flow. It extracts user details from the
 * callback URL, ensures the user exists in our backend (idempotent create), queries
 * the consolidated user status endpoint, enriches the VendorContext, and then
 * routes the user according to resolved role and status.
 *
 * Routing rules:
 * - If role resolves to 'client': redirect to client dashboard with token/email.
 * - If role resolves to 'vendor':
 *   - approved → /VendorDashboard
 *   - pending & hasFilledForm → /Auditorapprove
 *   - otherwise → /Form1
 * - If role cannot be determined → navigate to /role-selection
 */
export default function GoogleOAuthCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);
  const { setUser: setContextUser } = useContext(VendorContext);

  useEffect(() => {
    // Parse query parameters from the OAuth callback URL
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const email = params.get('email');
    const status = params.get('status');
    const filledFormParam = params.get('filledForm');
    const filledForm = filledFormParam === 'true';
    const role = params.get('role');

    // Email is the minimum required identifier to proceed
    if (!email) {
      setError('No email found in URL');
      return;
    }

    // Seed context early with basic user data; enriched later from backend
    const userData = {
      id: email,
      email: email,
      name: email.split('@')[0]
    };
    setContextUser(userData);

    // Resolve user existence + status, then route accordingly
    const checkUserStatus = async () => {
      try {
        console.log("GoogleOAuthCallback - Processing with email:", email);

        // Ensure user exists (safe to repeat). This supports first-time logins.
        try {
          const createResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/create-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email,
              name: email.split('@')[0],
              status: 'pending',
              hasFilledForm: false,
              role: 'vendor'
            }),
          });
          const createData = await createResponse.json();
          console.log("GoogleOAuthCallback - Create/check user response:", createData);
        } catch (createError) {
          // Non-fatal; user may already exist
          console.error("GoogleOAuthCallback - Error creating/checking user:", createError);
        }

        // Query consolidated status endpoint to decide routing and context enrichment
        const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/user-status?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        console.log("User status data in GoogleOAuthCallback:", data);

        if (data.success) {
          const userData = data.data;
          const currentStatus = userData.status;
          const hasFilledForm = userData.hasFilledForm;

          // Enrich context with authoritative backend-sourced fields
          setContextUser({
            id: userData.id || email,
            email: email,
            name: userData.name || email.split('@')[0],
            status: currentStatus,
            hasFilledForm: hasFilledForm,
            role: userData.role || role
          });

          // Decide effective role: backend value takes precedence over URL param
          const effectiveRole = userData.role || role;
          if (!effectiveRole) {
            navigate(`/role-selection?email=${encodeURIComponent(email)}`, { replace: true });
            return;
          }

          // Client persona: hand off to client dashboard with query params
          if (effectiveRole === 'client') {
            const authToken = localStorage.getItem('authToken');
            const clientBase = (import.meta?.env?.VITE_CLIENT_DASH ||'https://client.caasdiglobal.in');
            const qp = new URLSearchParams();
            if (authToken) qp.set('authToken', authToken);
            qp.set('email', email);
            qp.set('role', 'client');
            window.location.href = `${clientBase}/?${qp.toString()}`;
            return;
          }

          // Vendor persona: route by approval status and onboarding progress
          if (currentStatus === 'approved') {
            navigate("/VendorDashboard", { state: { role: 'vendor', email }, replace: true });
          } else if (currentStatus === 'rejected') {
            alert("Your vendor application has been rejected. Please contact support.");
            navigate("/Form1", { state: { role: 'vendor', email }, replace: true });
          } else if (currentStatus === 'pending' && hasFilledForm) {
            navigate("/Auditorapprove", { state: { role: 'vendor', email }, replace: true });
          } else {
            navigate("/Form1", { state: { role: 'vendor', email }, replace: true });
          }
        } else {
          // Unknown user in backend: collect missing role via selection screen
          navigate(`/role-selection?email=${encodeURIComponent(email)}`, { replace: true });
        }
      } catch (err) {
        console.error("Error checking user status:", err);
        setError('Error checking user status');

        // Network/backend failure: fallback to role selection to unblock user
        navigate(`/role-selection?email=${encodeURIComponent(email)}`, { replace: true });
      }
    };

    checkUserStatus();
  }, [location.search, navigate, setContextUser]);

  if (error) {
    return (
      <div className="p-6 text-center text-red-600">
        <h2>Error during Google login</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-center">
      <h2>Verifying Google login...</h2>
    </div>
  );
}
