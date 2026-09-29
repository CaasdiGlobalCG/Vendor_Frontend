import React, { useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// Tailwind-based futuristic styling replaces legacy CSS
import { Auth } from "aws-amplify";
import config from '../../config/env';
import { redirectToClientWithHandoff } from '../../utils/handoffToClient';
import { VendorContext } from '../../context/VendorContext';
import { getVendorDestination } from '../../utils/vendorAuthRouting';
import operonLogo from '../../assets/operon-symbol-white.png';
// Icons + role content for the split-panel design (presentation only)
import { Check, ShieldCheck, Sparkles } from 'lucide-react';
import { ROLES } from './roleSelectionRoles';

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

  // Chosen role's display content (mirrors the shared variant-1 data)
  const roleMeta = ROLES.find((r) => r.id === role);

  return (
    /* Design: split panel — literal black brand rail + light surface picker.
       Logic above is unchanged; this is presentation only. */
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[1fr_1.05fr]">
      {/* ── Left: brand panel (literal black in both themes) ── */}
      <aside className="flex flex-col justify-between bg-black px-8 py-10 sm:px-12 lg:px-16 lg:py-14">
        <div className="flex items-center gap-3">
          <img src={operonLogo} alt="Operon" className="h-8 w-auto" />
          <span className="text-sm font-medium tracking-tight text-white">Operon</span>
        </div>

        <div className="mt-12 max-w-md lg:mt-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/50">Vendor & project management</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            One platform for the whole procurement cycle.
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-white/60">
            Smart vendor matching, private tendering, CRM and task management, forecasting and analytics —
            with end-to-end project support.
          </p>

          <ul className="mt-8 space-y-3">
            {['Trusted B2B vendor network', 'Secure authentication (Google/Cognito)', 'Real-time notifications and tracking'].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-white/70">
                <Check className="h-4 w-4 shrink-0 text-white/50" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-12 text-xs text-white/40 lg:mt-0">© {new Date().getFullYear()} Operon. All rights reserved.</p>
      </aside>

      {/* ── Right: role picker ── */}
      <main className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight text-ink">Choose your role</h2>
            <span className="text-xs text-dim">Step 2 of 2</span>
          </div>
          <p className="mt-1.5 text-sm text-dim">
            Pick how you'll use Operon. You can change this later in settings.
          </p>

          <div className="mt-7 space-y-3" role="radiogroup" aria-label="Select your role">
            {ROLES.map(({ id, title, tagline, description, icon: Icon }) => {
              const selected = role === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setRole(id); } }}
                  onClick={() => setRole(id)}
                  className={`group flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ink ${
                    selected
                      ? 'border-ink bg-surface-hover'
                      : 'border-line bg-surface hover:border-dim hover:bg-surface-hover'
                  }`}
                >
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${
                    selected ? 'border-ink bg-ink text-canvas' : 'border-line bg-canvas text-ink'
                  }`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{title}</span>
                      <span className="text-xs text-dim">· {tagline}</span>
                    </span>
                    <span className="mt-0.5 block text-xs text-dim">{description}</span>
                  </span>
                  {/* radio indicator */}
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    selected ? 'border-ink bg-ink' : 'border-line'
                  }`}>
                    {selected && <Check className="h-3 w-3 text-canvas" aria-hidden="true" />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Contextual detail + action */}
          <div className="mt-6 rounded-xl border border-line bg-surface p-4">
            {roleMeta ? (
              <>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-ink" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-ink">{roleMeta.title} overview</h3>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {roleMeta.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-dim">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="flex items-center gap-2 text-xs text-dim">
                <ShieldCheck className="h-4 w-4 shrink-0 text-dim" aria-hidden="true" />
                Select a role above to see what's included.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleRoleSelection}
            disabled={!role}
            aria-label={role ? `Continue as ${roleMeta.title}` : 'Continue'}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-cta px-4 py-3 text-sm font-medium text-cta-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue{roleMeta ? ` as ${roleMeta.title}` : ''}
          </button>

          <p className="mt-4 text-center text-[11px] text-dim">
            By continuing, you agree to our Terms and Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
}

export default RoleSelection;


