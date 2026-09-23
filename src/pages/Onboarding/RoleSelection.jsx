import React, { useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// Tailwind-based futuristic styling replaces legacy CSS
import { Auth } from "aws-amplify";
import config from '../../config/env';
import { redirectToClientWithHandoff } from '../../utils/handoffToClient';
import { VendorContext } from '../../context/VendorContext';
import { getVendorDestination } from '../../utils/vendorAuthRouting';
import operonLogo from '../../assets/operon-symbol-white.png';

function RoleSelection() {
  const [role, setRole] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { hydrateCurrentUser } = useContext(VendorContext);

  // Extract email from URL params or state (googleId no longer required)
  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get("email") || location.state?.email;

  // Check authentication status on page load
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        await Auth.currentAuthenticatedUser();
        const session = await Auth.currentSession();
        const idToken = session.getIdToken().getJwtToken();

        const response = await fetch(`/api/auth/verify`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        if (!response.ok) return; // Stay on this page if unauth
        const data = await response.json();
        // Email is derived from the verified token; do not persist identity in localStorage.
        // Only navigate away if role was already selected previously.
        // suppressAutoRedirect=1 means the client app bounced this user back
        // here — show the picker instead of handing off again (avoids a loop).
        // vendorSwitchIntent means the user just clicked "Switch to Vendor" on
        // the client app — don't hand them back to client either.
        const suppressAutoRedirect = queryParams.get('suppressAutoRedirect') === '1';
        let vendorSwitchIntent = false;
        try {
          vendorSwitchIntent = sessionStorage.getItem('vendorSwitchIntent') === '1';
          if (vendorSwitchIntent) sessionStorage.removeItem('vendorSwitchIntent');
        } catch {}
        if (data?.roleSelected === true && !suppressAutoRedirect && !vendorSwitchIntent) {
          localStorage.setItem('roleSelected', 'true');
          const selectedRole = (data?.lastSelectedRole || data?.role || '').toLowerCase();
          if (selectedRole === "vendor") {
            // Ensure vendor cookie session exists, then hydrate context so RoleGuard doesn't bounce.
            try {
              await fetch(`${config.VENDOR_BACKEND_URL}/api/auth/session`, {
                method: 'POST',
                credentials: 'include',
                headers: { Authorization: `Bearer ${idToken}` },
              });
            } catch {}
            let hydrated = null;
            try {
              hydrated = await hydrateCurrentUser?.();
            } catch {}
            // Stay on role selection when the vendor hasn't started the KYC
            // forms — they may want to switch to client instead of resuming.
            const destination = hydrated?.user
              ? getVendorDestination({
                  status: hydrated.user.status,
                  hasFilledForm: hydrated.user.hasFilledForm,
                  isTeamMember: hydrated.user.isTeamMember === true,
                  hasStartedForm: hydrated.user.hasStartedForm === true,
                })
              : null;
            if (destination && destination !== '/role-selection') {
              navigate(destination, { replace: true });
            }
          } else if (selectedRole === "client") {
            // Auto-handoff for a previously selected client role — NOT an
            // explicit pick, so no fromRoleSelection flag. The client app
            // still bounces to role-selection when onboarding wasn't started.
            try {
              await redirectToClientWithHandoff({ token: idToken });
            } catch (e) {
              console.error('RoleSelection: handoff redirect failed:', e);
              alert('Unable to switch to client right now. Please try again.');
            }
          }
        }
      } catch (error) {
        // Not authenticated or email not yet verified — send to login.
        // AuthVerifiedGuard in App.jsx already blocks this route for unauthenticated
        // users, but this catch handles edge cases (session expired, etc.).
        navigate('/login', { replace: true });
      }
    };
    verifyAuth();
  }, [navigate]);

  const handleRoleSelection = async () => {
    if (!role) {
      alert("Please select a role.");
      return;
    }

    try {
      let session;
      try {
        session = await Auth.currentSession();
      } catch (sessionError) {
        console.error("No active session, attempting to refresh:", sessionError);
        const user = await Auth.currentAuthenticatedUser(); // Try to refresh session
        session = await Auth.currentSession();
      }
      const idToken = session.getIdToken().getJwtToken();

      const response = await fetch(`/api/auth/set-role`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();
      console.log('[RoleSelection] set-role response:', { ok: response.ok, status: response.status, data });
      if (response.ok) {
        // Persist roleSelected locally so guards unlock navigation
        localStorage.setItem('roleSelected', 'true');
        if (role === 'vendor') {
          // Establish cookie session + hydrate context before moving into onboarding.
          try {
            const sessionRes = await fetch(`${config.VENDOR_BACKEND_URL}/api/auth/session`, {
              method: 'POST',
              credentials: 'include',
              headers: { Authorization: `Bearer ${idToken}` },
            });
            console.log('[RoleSelection] session established:', sessionRes.ok, sessionRes.status);
          } catch (sessErr) {
            console.error('[RoleSelection] session establishment failed:', sessErr);
          }
          try {
            const hydrated = await hydrateCurrentUser?.();
            console.log('[RoleSelection] hydrateCurrentUser result:', hydrated);
          } catch (hydErr) {
            console.error('[RoleSelection] hydrate failed:', hydErr);
          }
          console.log('[RoleSelection] navigating to /Form1');
          navigate('/Form1', { replace: true });
        } else {
          try {
            await redirectToClientWithHandoff({ token: idToken, fromRoleSelection: true });
          } catch (e) {
            console.error('RoleSelection: handoff redirect failed:', e);
            alert('Unable to switch to client right now. Please try again.');
          }
        }
      } else {
        throw new Error(data.error || "Failed to save role");
      }
    } catch (error) {
      console.error("Error saving role:", error);
      if (error.message === "No current user") {
        alert("Session expired. Please log in again.");
        navigate("/login");
      } else {
        alert("Failed to save role. Please try again.");
      }
    }
  };

  // Information details and submission happen outside the cards for clarity

  return (
    <div className="min-h-screen relative overflow-hidden bg-surface flex items-center justify-center p-6">
      {/* Decorative background accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-[32rem] h-[32rem] rounded-full bg-cta blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-info blur-3xl" />

      <div className="w-full md:max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 mx-auto">
        {/* Left: Brand / Value prop */}
        <div className="backdrop-blur bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <img src={operonLogo} alt="Operon" className="h-10 w-auto" />
            <span className="text-ink text-xs">what’s new?</span>
          </div>
          <h2 className="text-white text-2xl md:text-3xl font-semibold mb-3">Vendor and project management</h2>
          <p className="text-dim leading-relaxed">
            Smart vendor matching, private tendering, CRM & task management, forecasting & analytics, end-to-end project
            support. Evolving toward an AI-driven platform to enhance efficiency and automation.
          </p>
          <ul className="mt-4 text-dim text-sm space-y-2 list-disc pl-5">
            <li>Trusted B2B vendor network</li>
            <li>Secure authentication (Google/Cognito)</li>
            <li>Real-time notifications and tracking</li>
          </ul>
        </div>

        {/* Right: Role selection */}
        <div className="backdrop-blur bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-white text-2xl font-semibold">Choose your role</h3>
              <span className="text-xs text-dim">Step 2 of 2</span>
            </div>
            <p className="text-dim text-sm">Select one option below. You can change this later in Account Settings.</p>
            <div className="h-px bg-white/10 mt-4" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="radiogroup" aria-label="Select your role">
            {/* Vendor card */}
            <button
              type="button"
              role="radio"
              aria-checked={role === "vendor"}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setRole("vendor"); } }}
              onClick={() => setRole("vendor")}
              className={`relative overflow-hidden text-left rounded-xl p-5 border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ink ${
                role === "vendor"
                  ? "bg-black to-transparent border-line ring-2 ring-ink scale-[1.02]"
                  : "bg-white/5 border-white/20 hover:bg-white/10 hover:border-line hover:"
              }`}
            >
              <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-black to-transparent" />
              {role === "vendor" ? (
                <span className="absolute top-3 right-3 bg-cta text-ink text-xs font-semibold px-2 py-0.5 rounded-full">Selected</span>
              ) : (
                <span className="absolute top-3 right-3 w-4 h-4 rounded-full border border-white/40" />
              )}
              <div className="flex items-center gap-3 mb-1">
                <span className="w-10 h-10 rounded-full bg-cta flex items-center justify-center border border-line">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                    <path d="M3 7h18M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2m-1 4H8m-3 6h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z" stroke="currentColor" strokeWidth="1.6" className="text-ink" />
                  </svg>
                </span>
                <div>
                  <div className="text-white text-lg font-medium">Vendor</div>
                </div>
              </div>
              <span className="sr-only">Select Vendor</span>
            </button>

            {/* Client card */}
            <button
              type="button"
              role="radio"
              aria-checked={role === "client"}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setRole("client"); } }}
              onClick={() => setRole("client")}
              className={`relative overflow-hidden text-left rounded-xl p-5 border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-info ${
                role === "client"
                  ? "bg-black to-transparent border-info ring-2 ring-info scale-[1.02]"
                  : "bg-white/5 border-white/20 hover:bg-white/10 hover:border-info hover:"
              }`}
            >
              <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-black to-transparent" />
              {role === "client" ? (
                <span className="absolute top-3 right-3 bg-info/30 text-ink text-xs font-semibold px-2 py-0.5 rounded-full">Selected</span>
              ) : (
                <span className="absolute top-3 right-3 w-4 h-4 rounded-full border border-white/40" />
              )}
              <div className="flex items-center gap-3 mb-1">
                <span className="w-10 h-10 rounded-full bg-info flex items-center justify-center border border-info">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                    <path d="M8 11a4 4 0 1 1 8 0m-9 7h10a3 3 0 0 0 3-3v-1a2 2 0 0 0-2-2h-1m-12 6h1a3 3 0 0 0 3-3v-1a2 2 0 0 0-2-2H7" stroke="currentColor" strokeWidth="1.6" className="text-info" />
                  </svg>
                </span>
                <div>
                  <div className="text-white text-lg font-medium">Client</div>
                </div>
              </div>
              <span className="sr-only">Select Client</span>
            </button>
          </div>

          {/* Role description and action outside the cards */}
          <div className="mt-6">
            {!role && (
              <p className="text-dim text-sm">Select a role above to see details and continue.</p>
            )}
            {role === 'vendor' && (
              <div className="backdrop-blur bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-white text-sm font-semibold mb-2">Vendor overview</h4>
                <ul className="text-dim text-sm list-disc pl-5 space-y-1 mb-3">
                  <li>Vendor Dashboard, Leads, Notifications</li>
                  <li>Project portfolio and submissions</li>
                  <li>Manage services and company profile</li>
                </ul>
                <button
                  type="button"
                  onClick={handleRoleSelection}
                  className="px-4 py-2 rounded-md bg-cta text-ink text-sm font-medium hover:bg-cta transition"
                  aria-label="Continue as Vendor"
                >
                  Continue as Vendor
                </button>
              </div>
            )}
            {role === 'client' && (
              <div className="backdrop-blur bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-white text-sm font-semibold mb-2">Client overview</h4>
                <ul className="text-dim text-sm list-disc pl-5 space-y-1 mb-3">
                  <li>Guided onboarding</li>
                  <li>Track enquiries and quotations</li>
                  <li>Compare vendors and manage requests</li>
                </ul>
                <button
                  type="button"
                  onClick={handleRoleSelection}
                  className="px-4 py-2 rounded-md bg-info/30 text-ink text-sm font-medium hover:bg-info/20 transition"
                  aria-label="Continue as Client"
                >
                  Continue as Client
                </button>
              </div>
            )}
            <p className="mt-4 text-[11px] text-dim">By continuing, you agree to our Terms and Privacy Policy.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoleSelection;


