import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// Tailwind-based futuristic styling replaces legacy CSS
import { Auth } from "aws-amplify";
import config from '../../config/env';

function RoleSelection() {
  const [role, setRole] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  // Extract email and googleId from URL params or state
  const queryParams = new URLSearchParams(location.search);
  const email = queryParams.get("email") || location.state?.email;
  const googleId = queryParams.get("googleId") || location.state?.googleId;

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
        // Only navigate away if role was already selected previously
        if (data?.roleSelected === true) {
          localStorage.setItem('roleSelected', 'true');
          if ((data.role || '').toLowerCase() === "vendor") {
            navigate("/Form1", { replace: true });
          } else if ((data.role || '').toLowerCase() === "client") {
            const authToken = localStorage.getItem('authToken');
            const clientBase = CONFIG.CLIENT_URL;
            const qp = new URLSearchParams();
            if (authToken) qp.set('authToken', authToken);
            if (email) qp.set('email', email);
            qp.set('role', 'client');
            window.location.href = `${clientBase}/?${qp.toString()}`;
          }
        }
      } catch (error) {
        // If not authenticated, allow role selection page to render
        console.log("RoleSelection verifyAuth: proceed without redirect");
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
      if (response.ok) {
        // Persist roleSelected locally so guards unlock navigation
        localStorage.setItem('roleSelected', 'true');
        if (role === 'vendor') {
          navigate('/Form1', { replace: true });
        } else {
          const authToken = localStorage.getItem('authToken');
          const clientBase = config.CLIENT_URL;
          const qp = new URLSearchParams();
          if (authToken) qp.set('authToken', authToken);
          if (email) qp.set('email', email);
          qp.set('role', 'client');
          window.location.href = `${clientBase}/?${qp.toString()}`;
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-950 via-emerald-950 to-black flex items-center justify-center p-6">
      {/* Decorative background accents */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-[32rem] h-[32rem] rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="w-full md:max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6 mx-auto">
        {/* Left: Brand / Value prop */}
        <div className="backdrop-blur bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <span className="text-white text-xl font-semibold tracking-wide">CG</span>
            <span className="text-emerald-300 text-xs">what’s new?</span>
          </div>
          <h2 className="text-white text-2xl md:text-3xl font-semibold mb-3">Vendor and project management</h2>
          <p className="text-gray-200/80 leading-relaxed">
            Smart vendor matching, private tendering, CRM & task management, forecasting & analytics, end-to-end project
            support. Evolving toward an AI-driven platform to enhance efficiency and automation.
          </p>
          <ul className="mt-4 text-gray-300/80 text-sm space-y-2 list-disc pl-5">
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
              <span className="text-xs text-gray-300/70">Step 2 of 2</span>
            </div>
            <p className="text-gray-300/80 text-sm">Select one option below. You can change this later in Account Settings.</p>
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
              className={`relative overflow-hidden text-left rounded-xl p-5 border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-300/60 ${
                role === "vendor"
                  ? "bg-gradient-to-br from-emerald-500/25 via-emerald-400/10 to-transparent border-emerald-400/70 ring-2 ring-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.35)] scale-[1.02]"
                  : "bg-white/5 border-white/20 hover:bg-white/10 hover:border-emerald-300/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]"
              }`}
            >
              <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
              {role === "vendor" ? (
                <span className="absolute top-3 right-3 bg-emerald-500 text-black text-xs font-semibold px-2 py-0.5 rounded-full">Selected</span>
              ) : (
                <span className="absolute top-3 right-3 w-4 h-4 rounded-full border border-white/40" />
              )}
              <div className="flex items-center gap-3 mb-1">
                <span className="w-10 h-10 rounded-full bg-emerald-400/20 flex items-center justify-center border border-emerald-400/50">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                    <path d="M3 7h18M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2m-1 4H8m-3 6h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z" stroke="currentColor" strokeWidth="1.6" className="text-emerald-300" />
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
              className={`relative overflow-hidden text-left rounded-xl p-5 border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/60 ${
                role === "client"
                  ? "bg-gradient-to-br from-cyan-400/25 via-indigo-400/10 to-transparent border-cyan-300/70 ring-2 ring-cyan-300/60 shadow-[0_0_30px_rgba(34,211,238,0.35)] scale-[1.02]"
                  : "bg-white/5 border-white/20 hover:bg-white/10 hover:border-cyan-300/30 hover:shadow-[0_0_20px_rgba(34,211,238,0.25)]"
              }`}
            >
              <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
              {role === "client" ? (
                <span className="absolute top-3 right-3 bg-cyan-300 text-black text-xs font-semibold px-2 py-0.5 rounded-full">Selected</span>
              ) : (
                <span className="absolute top-3 right-3 w-4 h-4 rounded-full border border-white/40" />
              )}
              <div className="flex items-center gap-3 mb-1">
                <span className="w-10 h-10 rounded-full bg-cyan-300/20 flex items-center justify-center border border-cyan-300/50">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                    <path d="M8 11a4 4 0 1 1 8 0m-9 7h10a3 3 0 0 0 3-3v-1a2 2 0 0 0-2-2h-1m-12 6h1a3 3 0 0 0 3-3v-1a2 2 0 0 0-2-2H7" stroke="currentColor" strokeWidth="1.6" className="text-cyan-300" />
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
              <p className="text-gray-300/80 text-sm">Select a role above to see details and continue.</p>
            )}
            {role === 'vendor' && (
              <div className="backdrop-blur bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-white text-sm font-semibold mb-2">Vendor overview</h4>
                <ul className="text-gray-300/80 text-sm list-disc pl-5 space-y-1 mb-3">
                  <li>Vendor Dashboard, Leads, Notifications</li>
                  <li>Project portfolio and submissions</li>
                  <li>Manage services and company profile</li>
                </ul>
                <button
                  type="button"
                  onClick={handleRoleSelection}
                  className="px-4 py-2 rounded-md bg-emerald-500 text-black text-sm font-medium hover:bg-emerald-400 transition"
                  aria-label="Continue as Vendor"
                >
                  Continue as Vendor
                </button>
              </div>
            )}
            {role === 'client' && (
              <div className="backdrop-blur bg-white/5 border border-white/10 rounded-xl p-4">
                <h4 className="text-white text-sm font-semibold mb-2">Client overview</h4>
                <ul className="text-gray-300/80 text-sm list-disc pl-5 space-y-1 mb-3">
                  <li>Guided onboarding</li>
                  <li>Track enquiries and quotations</li>
                  <li>Compare vendors and manage requests</li>
                </ul>
                <button
                  type="button"
                  onClick={handleRoleSelection}
                  className="px-4 py-2 rounded-md bg-cyan-300 text-black text-sm font-medium hover:bg-cyan-200 transition"
                  aria-label="Continue as Client"
                >
                  Continue as Client
                </button>
              </div>
            )}
            <p className="mt-4 text-[11px] text-gray-400/80">By continuing, you agree to our Terms and Privacy Policy.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoleSelection;


