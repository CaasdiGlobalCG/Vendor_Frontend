import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { VendorContext } from '../context/VendorContext';
import config from '../config/env';
import { redirectToClientWithHandoff } from '../utils/handoffToClient';

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

    // Resolve identity securely from backend (JWT/session); do not trust URL email/status.
    const seedFromBackend = async () => {
      try {
        const res = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/me`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!res.ok) {
          throw new Error(`Failed to resolve current vendor: ${res.status}`);
        }

        const me = await res.json();
        const v = me?.data;
        const email = v?.email || v?.vendorDetails?.primaryContactEmail;
        const name = v?.name || v?.vendorDetails?.primaryContactName || (email ? email.split('@')[0] : null);
        const status = v?.status;
        const hasFilledForm = v?.hasFilledForm === true;
        const role = (v?.role || 'vendor').toLowerCase();

        setContextUser({
          id: v?.id || v?._id || email,
          email,
          name,
          status,
          hasFilledForm,
          role,
        });

        if (role === 'client') {
          const clientBase = config.CLIENT_URL;
          if (!clientBase) {
            setError('Client dashboard URL is not configured. Please contact support.');
            return;
          }

          redirectToClientWithHandoff().catch((e) => {
            console.error('GoogleOAuthCallback: handoff redirect failed:', e);
            window.location.assign(`${clientBase}/`);
          });
          return;
        }

        if (String(status).toLowerCase() === 'approved') {
          navigate('/VendorDashboard', { replace: true });
        } else if (String(status).toLowerCase() === 'rejected') {
          alert('Your vendor application has been rejected. Please contact support.');
          navigate('/Form1', { replace: true });
        } else if (String(status).toLowerCase() === 'pending' && hasFilledForm) {
          navigate('/Auditorapprove', { replace: true });
        } else {
          navigate('/Form1', { replace: true });
        }
      } catch (err) {
        console.error('GoogleOAuthCallback error:', err);
        setError('Error verifying Google login');
        navigate('/role-selection', { replace: true });
      }
    };

    seedFromBackend();

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
