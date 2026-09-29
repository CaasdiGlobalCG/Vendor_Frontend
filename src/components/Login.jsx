// ============================================================
// FILE: components/Login.jsx
// PURPOSE: The live vendor login screen — the login / forgot-password / reset-password
//          views, the passkey + TOTP MFA hand-off, and the post-login routing to the
//          vendor, client or sales platform. This page renders ONLY its own form content;
//          the approved "Split immersive" shell (the full-height black brand panel at
//          ~55% and the narrower right column with its padding and measure) is owned by
//          components/auth/AuthSplitLayout.jsx, which nests this page under /login. The
//          form rises in a stagger (`.auth-rise`, main.css) with inline `animationDelay`.
//          The panel's rotating carousel and its 5-second rotation timer were removed
//          from this page when the layout took over the panel (the slides now live in the
//          layout, listed statically); the brand-panel component is no longer imported here.
// CONNECTS TO: components/auth/AuthSplitLayout.jsx (owns the split shell + brand panel),
//              components/auth/AuthModeSwitch.jsx, components/auth/auth-primitives.jsx,
//              components/ui/Alert.jsx, components/PasskeyMFAVerification.jsx,
//              components/TOTPVerificationModal.jsx, context/VendorContext.jsx,
//              context/UserContext.jsx, utils/handoffToClient.js, utils/handoffToSales.js,
//              utils/vendorAuthRouting.js, utils/postLoginPlatformResolver.js,
//              config/env.js — main.css (.auth-rise/.brand-press),
//              tailwind.config.js (canvas/surface/ink/dim/line/cta + ease-signal/duration-*).
// ============================================================

import React, { useEffect, useMemo, useState, useContext, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";

import { VendorContext } from "../context/VendorContext";
import { UserContext } from "../context/UserContext";
import Alert from "./ui/Alert";
import AuthModeSwitch from "./auth/AuthModeSwitch";
import { BrandMark, MonoEyebrow, Field, PasswordField, PrimaryButton, TextLink } from "./auth/auth-primitives";
import config from "../config/env";
import PasskeyMFAVerification from "./PasskeyMFAVerification";
import TOTPVerificationModal from "./TOTPVerificationModal";
import { redirectToClientWithHandoff } from "../utils/handoffToClient";
import { redirectToSalesWithHandoff } from "../utils/handoffToSales";
import { getVendorDestination, isRejectedVendor } from "../utils/vendorAuthRouting";
import { resolvePostLoginPlatform, persistLastSelectedPlatform } from "../utils/postLoginPlatformResolver";

const AUTH_TRANSITION_KEY = 'vendorAuthTransitionInProgress';
const AUTH_TRANSITION_STARTED_AT_KEY = 'vendorAuthTransitionStartedAt';

function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const totpModeRef = useRef(false);

  const { hydrateCurrentUser } = useContext(VendorContext);
  const { setCurrentUser: setAppUser } = useContext(UserContext);

  const from = location.state?.from;
  const emailFromState = location.state?.email;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState("error");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("login");

  const [showMFAVerification, setShowMFAVerification] = useState(false);
  const [mfaUserId, setMfaUserId] = useState(null);
  const [mfaUserData, setMfaUserData] = useState(null);

  // TOTP verification state
  const [showTOTPVerification, setShowTOTPVerification] = useState(false);
  const [totpUserData, setTotpUserData] = useState(null);

  // Check if this is an explicit vendor login
  const explicitVendor = useMemo(() => {
    const qp = new URLSearchParams(location.search);
    return qp.get("fromClient") === "true" || qp.get("role") === "vendor" || Boolean(qp.get("handoff"));
  }, [location.search]);

  // ═══ DEBUG: Track TOTP modal state ═══
  useEffect(() => {
    console.log('[Login] showTOTPVerification state changed:', showTOTPVerification);
    if (showTOTPVerification) {
      console.log('[Login] TOTP Modal should be visible! totpUserData:', totpUserData);
    }
  }, [showTOTPVerification]);

  const togglePasswordVisibility = () => setShowPassword((v) => !v);
  const handleSignUpRedirect = () => navigate("/signup");

  const routeVendor = ({ status, hasFilledForm, isTeamMember, hasStartedForm }) => {
    if (isRejectedVendor(status)) {
      setAlertMessage("Your vendor application has been rejected. Please contact support.");
      setAlertType("error");
      setShowAlert(true);
    }

    navigate(
      getVendorDestination({ status, hasFilledForm, isTeamMember, hasStartedForm }),
      { replace: true }
    );
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setShowAlert(false);
    sessionStorage.setItem(AUTH_TRANSITION_KEY, 'true');
    sessionStorage.setItem(AUTH_TRANSITION_STARTED_AT_KEY, String(Date.now()));


    try {
      const cognitoUser = await Auth.signIn(email, password);
      const session = await Auth.currentSession();
      const idToken = session.getIdToken().getJwtToken();

      let verifyRoleSelected = null;
      let verifyLastSelectedRole = null;
      let verifyIsTeamMember = false;
      let verifyRole = null;
      let verifyOrgType = null;
      let verifyPlatformAccess = null;
      let resolvedPlatform = 'vendor';

      try {
        const verifyRes = await fetch(`${config.VENDOR_BACKEND_URL}/api/auth/verify`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (verifyRes.status === 403) {
          const deniedBody = await verifyRes.json().catch(() => ({}));
          const deniedCode = deniedBody?.code;
          const deniedMessage = deniedBody?.message || 'Your access to this organization has been restricted.';
          setAlertMessage(
            deniedCode === 'RBAC_002'
              ? deniedMessage
              : deniedMessage
          );
          setAlertType('error');
          setShowAlert(true);
          return;
        }
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          verifyRole = (verifyData?.role || '').toString().toLowerCase();
          verifyOrgType = (verifyData?.orgType || '').toString().toLowerCase();
          verifyRoleSelected = verifyData?.roleSelected === true;
          verifyLastSelectedRole = (verifyData?.lastSelectedRole || "").toString().toLowerCase();
          verifyPlatformAccess = Array.isArray(verifyData?.platformAccess)
            ? verifyData.platformAccess
            : null;

          // Debug logs for routing
          console.log("explicitVendor:", explicitVendor, "Query Params:", location.search);
          console.log("verifyLastSelectedRole:", verifyLastSelectedRole);
          console.log("verifyPlatformAccess:", verifyPlatformAccess);

          // Legacy hint only; guards should rely on /verify.
          try {
            localStorage.setItem("roleSelected", verifyRoleSelected ? "true" : "false");
          } catch {}

          // Team members always skip role-selection (their users record
          // should have roleSelected=true, but guard against stale data).
          verifyIsTeamMember = verifyData?.isTeamMember === true;
          console.log('[Login] verify result:', {
            roleSelected: verifyRoleSelected,
            lastSelectedRole: verifyLastSelectedRole,
            isTeamMember: verifyIsTeamMember,
            role: verifyRole,
            orgType: verifyOrgType,
            rawResponse: verifyData,
          });
          if (!verifyRoleSelected && !verifyIsTeamMember) {
            console.log('[Login] → redirecting to /role-selection because roleSelected=false');
            navigate("/role-selection", { replace: true });
            return;
          }

          const platformDecision = resolvePostLoginPlatform({
            explicitVendor,
            lastSelectedRole: verifyLastSelectedRole,
            role: verifyRole,
            orgType: verifyOrgType,
            platformAccess: verifyPlatformAccess,
          });
          resolvedPlatform = platformDecision.platform;

          if (resolvedPlatform === 'client') {
            await redirectToClientWithHandoff({ token: idToken });
            return;
          }
          if (resolvedPlatform === 'sales') {
            await redirectToSalesWithHandoff('/', { token: idToken });
            return;
          }
        }
      } catch (verifyErr) {
        console.warn("Verify failed, proceeding cautiously:", verifyErr);
      }

      // Establish vendor cookie session (sid).
      try {
        const sessionRes = await fetch(`${config.VENDOR_BACKEND_URL}/api/auth/session`, {
          method: "POST",
          credentials: "include",
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (sessionRes.status === 403) {
          const deniedBody = await sessionRes.json().catch(() => ({}));
          setAlertMessage(deniedBody?.message || 'Your access to this organization has been revoked.');
          setAlertType('error');
          setShowAlert(true);
          return;
        }
        if (!sessionRes.ok) {
          setAlertMessage('Unable to establish login session. Please try again.');
          setAlertType('error');
          setShowAlert(true);
          return;
        }
      } catch (sessionErr) {
        console.warn("Failed to establish vendor cookie session:", sessionErr);
        setAlertMessage('Unable to establish login session. Please try again.');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      // ═══ TOTP MFA Check BEFORE hydrating user ═══
      // Check MFA status FIRST - if TOTP required, don't hydrate context yet
      const vendorEmail = cognitoUser?.attributes?.email || email;
      let hasTOTP = false;
      try {
        const mfaStatusRes = await fetch(
          `${config.VENDOR_BACKEND_URL}/api/vendor/mfa/status`,
          { credentials: "include" }
        );
        if (mfaStatusRes.ok) {
          const mfaStatusData = await mfaStatusRes.json();
          hasTOTP = mfaStatusData.data?.totpEnabled === true;
          console.log('[Login] MFA Status Check (before hydration):', {
            totpEnabled: hasTOTP,
            mfaData: mfaStatusData.data
          });
        }
      } catch (mfaErr) {
        console.warn("[Login] MFA status check failed:", mfaErr);
      }

      // If TOTP required, show modal BEFORE hydrating user context
      if (hasTOTP) {
        console.log('[Login] TOTP enabled BEFORE hydration - showing modal without updating context');
        totpModeRef.current = true;
        
        // Store the email for TOTP verification
        setTotpUserData({
          email: vendorEmail,
          fromCognito: true // Flag that we haven't hydrated yet
        });
        setShowTOTPVerification(true);
        console.log('[Login] TOTP modal shown - throwing to skip hydration');
        throw new Error('TOTP_VERIFICATION_REQUIRED');
      }

      // ═══ Only hydrate user context if TOTP not required ═══
      // Single source of truth: hydrate user only through VendorContext (/api/vendor/me).
      const hydrated = await Promise.resolve(hydrateCurrentUser?.());

      if (hydrated?.accessDenied?.code === 'RBAC_001' || hydrated?.accessDenied?.code === 'RBAC_002') {
        setAlertMessage(hydrated?.accessDenied?.message || 'Your access to this organization has been restricted.');
        setAlertType('error');
        setShowAlert(true);
        return;
      }

      if (!hydrated?.ok || !hydrated?.user) {
        if (!explicitVendor && hydrated?.status === 404) {
          const fallbackDecision = resolvePostLoginPlatform({
            explicitVendor,
            lastSelectedRole: verifyLastSelectedRole,
            role: verifyRole,
            orgType: verifyOrgType,
            platformAccess: verifyPlatformAccess,
          });
          if (fallbackDecision.platform === 'client') {
            await redirectToClientWithHandoff({ token: idToken });
            return;
          }
          if (fallbackDecision.platform === 'sales') {
            await redirectToSalesWithHandoff('/', { token: idToken });
            return;
          }
        }

        setAlertMessage("Failed to retrieve vendor details. Please try again or contact support.");
        setAlertType("error");
        setShowAlert(true);
        return;
      }

      const vendorUser = hydrated.user;
      const vendorId = vendorUser.vendorId || null;
      const vendorName = vendorUser.name || cognitoUser?.attributes?.name || cognitoUser?.username || "";

      // ═══ DEBUG: Log vendor user data ═══
      console.log('[Login] Vendor User Data:', {
        totpEnabled: vendorUser.totpEnabled,
        vendorId,
        email: vendorEmail,
        status: vendorUser.status,
        allFields: vendorUser
      });

      // Now set app user (this triggers routing)
      setAppUser(vendorUser);

      // Passkey MFA (if enabled)
      try {
        const passkeyStatusRes = await fetch(
          `${config.VENDOR_BACKEND_URL}/api/auth/passkey/user-status?email=${encodeURIComponent(vendorEmail)}`,
          { credentials: "include" }
        );
        if (passkeyStatusRes.ok) {
          const passkeyStatusData = await passkeyStatusRes.json();
          const userHasPasskey = passkeyStatusData.data?.hasPasskey === true;
          const userIdForMFA = passkeyStatusData.data?.userId;
          if (userHasPasskey && userIdForMFA) {
            setMfaUserId(userIdForMFA);
            setMfaUserData({
              vendorId,
              email: vendorEmail,
              name: vendorName,
              userStatus: vendorUser.status,
              hasFilledForm: vendorUser.hasFilledForm,
            });
            setShowMFAVerification(true);
            return;
          }
        }
      } catch (passkeyErr) {
        console.warn("Error checking passkey status:", passkeyErr);
      }

      if (from) {
        navigate(from.pathname, { replace: true });
        return;
      }

      // Persist vendor as the user's active platform for subsequent logins.
      // Non-blocking: navigation should not fail if this update fails.
      await persistLastSelectedPlatform('vendor', idToken);

      // Final vendor routing based on vendors table status.
      if (verifyRoleSelected === false) {
        navigate("/role-selection", { replace: true });
        return;
      }

      routeVendor({ status: vendorUser.status, hasFilledForm: vendorUser.hasFilledForm, isTeamMember: vendorUser.isTeamMember === true || verifyIsTeamMember, hasStartedForm: vendorUser.hasStartedForm === true });
    } catch (error) {
      console.error("Error logging in:", error);

      // Handle TOTP verification requirement - not an error, just a flow control
      if (error?.message === 'TOTP_VERIFICATION_REQUIRED') {
        console.log('[Login] TOTP verification required - modal should be showing');
        return;
      }

      if (error?.code === "UserNotConfirmedException") {
        alert("Your account needs verification. We'll send you to the verification page.");
        navigate("/verification", { state: { email: email || emailFromState } });
        return;
      }

      if (error?.code === "UserNotFoundException") {
        setAlertMessage("We couldn't find an account with that email. Please check your email or sign up.");
      } else if (error?.code === "NotAuthorizedException") {
        setAlertMessage("Email and password don't match our records. Please check your credentials.");
      } else if (error?.code === "PasswordResetRequiredException") {
        setAlertMessage("You need to reset your password. Please use the 'Forgot Password' option.");
        setAlertType("warning");
      } else {
        setAlertMessage(error?.message || "An unexpected error occurred during login. Please try again.");
      }

      setAlertType((t) => (t === "warning" ? "warning" : "error"));
      setShowAlert(true);
      sessionStorage.removeItem(AUTH_TRANSITION_KEY);
      sessionStorage.removeItem(AUTH_TRANSITION_STARTED_AT_KEY);
    } finally {
      // Don't clear loading state if TOTP verification modal is showing
      // Check ref synchronously since state updates haven't processed yet
      if (!totpModeRef.current) {
        setLoading(false);
      } else {
        console.log('[Login] TOTP mode active - keeping loading=true to prevent premature routing');
      }
    }
  };

  const handleMFASuccess = async () => {
    try {
      sessionStorage.setItem(AUTH_TRANSITION_KEY, 'true');
      sessionStorage.setItem(AUTH_TRANSITION_STARTED_AT_KEY, String(Date.now()));
      setShowMFAVerification(false);
      // After passkey success, backend should have the cookie session; hydrate & route.
      const hydrated = await Promise.resolve(hydrateCurrentUser?.());
      if (hydrated?.ok && hydrated?.user) {
        routeVendor({
          status: hydrated.user.status,
          hasFilledForm: hydrated.user.hasFilledForm,
          isTeamMember: hydrated.user.isTeamMember === true,
          hasStartedForm: hydrated.user.hasStartedForm === true,
        });
      } else {
        navigate("/Form1", { replace: true });
      }
    } catch (e) {
      console.warn("MFA success handling failed:", e);
      navigate("/Form1", { replace: true });
      sessionStorage.removeItem(AUTH_TRANSITION_KEY);
      sessionStorage.removeItem(AUTH_TRANSITION_STARTED_AT_KEY);
    }
  };

  const handleMFACancel = () => {
    setShowMFAVerification(false);
    setMfaUserId(null);
    setMfaUserData(null);
  };

  const handleTOTPSuccess = async () => {
    try {
      // Reset TOTP mode flag
      totpModeRef.current = false;
      sessionStorage.setItem(AUTH_TRANSITION_KEY, 'true');
      sessionStorage.setItem(AUTH_TRANSITION_STARTED_AT_KEY, String(Date.now()));
      setShowTOTPVerification(false);
      
      // Now hydrate user context since TOTP is verified
      console.log('[Login] TOTP verified, now hydrating user context');
      setLoading(true);
      
      const hydrated = await Promise.resolve(hydrateCurrentUser?.());
      if (hydrated?.ok && hydrated?.user) {
        console.log('[Login] User hydrated after TOTP success');
        
        // Check if passkey is also required
        const vendorEmail = totpUserData?.email || email;
        try {
          const passkeyStatusRes = await fetch(
            `${config.VENDOR_BACKEND_URL}/api/auth/passkey/user-status?email=${encodeURIComponent(vendorEmail)}`,
            { credentials: "include" }
          );
          if (passkeyStatusRes.ok) {
            const passkeyStatusData = await passkeyStatusRes.json();
            const userHasPasskey = passkeyStatusData.data?.hasPasskey === true;
            const userIdForMFA = passkeyStatusData.data?.userId;
            if (userHasPasskey && userIdForMFA) {
              // Both TOTP and Passkey enabled - show passkey after TOTP
              console.log('[Login] Passkey also enabled, showing passkey modal');
              setMfaUserId(userIdForMFA);
              setMfaUserData({
                vendorId: hydrated.user.vendorId,
                email: vendorEmail,
                name: hydrated.user.name,
                userStatus: hydrated.user.status,
                hasFilledForm: hydrated.user.hasFilledForm,
              });
              setShowMFAVerification(true);
              setLoading(false);
              return;
            }
          }
        } catch (passkeyErr) {
          console.warn("Error checking passkey status after TOTP:", passkeyErr);
        }
        
        // Only TOTP was required, proceed to routing
        routeVendor({
          status: hydrated.user.status,
          hasFilledForm: hydrated.user.hasFilledForm,
          isTeamMember: hydrated.user.isTeamMember === true,
          hasStartedForm: hydrated.user.hasStartedForm === true,
        });
      } else {
        console.error('[Login] Failed to hydrate user after TOTP success');
        navigate("/Form1", { replace: true });
      }
    } catch (e) {
      console.warn("TOTP success handling failed:", e);
      navigate("/Form1", { replace: true });
      sessionStorage.removeItem(AUTH_TRANSITION_KEY);
      sessionStorage.removeItem(AUTH_TRANSITION_STARTED_AT_KEY);
    } finally {
      setLoading(false);
    }
  };

  const handleTOTPCancel = () => {
    totpModeRef.current = false;
    setShowTOTPVerification(false);
    setTotpUserData(null);
    // Log the user out by clearing session
    sessionStorage.removeItem(AUTH_TRANSITION_KEY);
    sessionStorage.removeItem(AUTH_TRANSITION_STARTED_AT_KEY);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setAlertMessage("Please enter your email address to reset your password.");
      setAlertType("error");
      setShowAlert(true);
      return;
    }
    setLoading(true);
    try {
      await Auth.forgotPassword(email);
      setView("resetPassword");
      setAlertMessage(`A password reset code has been sent to ${email}.`);
      setAlertType("success");
      setShowAlert(true);
    } catch (error) {
      console.error("Forgot password error:", error);
      setAlertMessage(error?.message || "Failed to initiate password reset.");
      setAlertType("error");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!verificationCode || !password) {
      setAlertMessage("Please enter the verification code and a new password.");
      setAlertType("error");
      setShowAlert(true);
      return;
    }
    setLoading(true);
    try {
      await Auth.forgotPasswordSubmit(email, verificationCode, password);
      setAlertMessage("Password has been reset successfully! Please log in with your new password.");
      setAlertType("success");
      setShowAlert(true);
      setView("login");
      setPassword("");
      setVerificationCode("");
    } catch (error) {
      console.error("Reset password error:", error);
      setAlertMessage(error?.message || "Failed to reset password. Please check the code.");
      setAlertType("error");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    // form content only — the split shell (the brand panel and the right column with its
    // padding and measure) is owned by AuthSplitLayout, which nests this page under /login.
    <>
            {/* card header: brand mark + current mode label — the intro block */}
            <div className="auth-rise flex items-center justify-between gap-4">
              <BrandMark className="h-6" />
              <MonoEyebrow>{view === "login" ? "Sign in" : "Account"}</MonoEyebrow>
            </div>

            {/* the segmented switch navigates to /signup via the existing handler.
                `.auth-rise` lives on this wrapper, never on a `.brand-press` element. */}
            {view === "login" && (
              <div className="auth-rise mt-7" style={{ animationDelay: '90ms' }}>
                <AuthModeSwitch
                  active="login"
                  onSelect={(m) => {
                    if (m === "signup") handleSignUpRedirect();
                  }}
                  className="w-full"
                />
              </div>
            )}

            {showAlert && (
              <div className="mt-4">
                <Alert message={alertMessage} type={alertType} onClose={() => setShowAlert(false)} />
              </div>
            )}

            {view === "login" && (
              <>
                <h2 className="auth-rise mt-3 text-2xl font-semibold tracking-tight text-ink">Hello User</h2>
                <p className="auth-rise mt-1.5 text-sm text-dim">Enter your email and password to log in</p>

                <form className="mt-7 grid gap-4" onSubmit={handleLogin}>
                  <div className="auth-rise" style={{ animationDelay: '150ms' }}>
                    <Field
                      id="login-email"
                      label="Email"
                      type="email"
                      autoComplete="email"
                      placeholder="Enter your mail id"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="auth-rise" style={{ animationDelay: '210ms' }}>
                    <div>
                      <PasswordField
                        id="login-password"
                        label="Password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        show={showPassword}
                        onToggle={togglePasswordVisibility}
                        autoComplete="current-password"
                        required
                      />
                      <div className="mt-1.5 text-right">
                        <TextLink className="text-xs" onClick={() => setView("forgotPassword")}>
                          Forgot Password?
                        </TextLink>
                      </div>
                    </div>
                  </div>

                  {/* `.brand-press` on the button, `.auth-rise` on the wrapper — the entrance's
                      `animation-fill-mode: both` final transform would otherwise kill the press. */}
                  <div className="auth-rise" style={{ animationDelay: '350ms' }}>
                    <PrimaryButton type="submit" loading={loading} className="brand-press w-full duration-180 ease-signal">
                      {loading ? "Logging in..." : "Login"}
                    </PrimaryButton>
                  </div>
                </form>

                <p className="auth-rise mt-4 text-center text-sm text-dim" style={{ animationDelay: '390ms' }}>
                  Don’t have an account?{" "}
                  <TextLink onClick={handleSignUpRedirect}>Signup</TextLink>
                </p>
              </>
            )}

            {view === "forgotPassword" && (
              <>
                <h2 className="auth-rise mt-3 text-2xl font-semibold tracking-tight text-ink">Forgot Password</h2>
                <p className="auth-rise mt-1.5 text-sm text-dim">Enter your email to receive a reset code</p>

                <form className="mt-7 grid gap-4" onSubmit={handleForgotPassword}>
                  <div className="auth-rise" style={{ animationDelay: '150ms' }}>
                    <Field
                      id="forgot-email"
                      label="Email"
                      type="email"
                      autoComplete="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="auth-rise" style={{ animationDelay: '350ms' }}>
                    <PrimaryButton type="submit" loading={loading} className="brand-press w-full duration-180 ease-signal">
                      {loading ? "Sending..." : "Send Reset Code"}
                    </PrimaryButton>
                  </div>
                </form>

                <p className="auth-rise mt-4 text-center text-sm text-dim" style={{ animationDelay: '390ms' }}>
                  <TextLink onClick={() => setView("login")}>Back to Login</TextLink>
                </p>
              </>
            )}

            {view === "resetPassword" && (
              <>
                <h2 className="auth-rise mt-3 text-2xl font-semibold tracking-tight text-ink">Reset Your Password</h2>
                <p className="auth-rise mt-1.5 text-sm text-dim">
                  Enter the code from your email and a new password.
                </p>

                <form className="mt-7 grid gap-4" onSubmit={handleResetPassword}>
                  <div className="auth-rise" style={{ animationDelay: '150ms' }}>
                    <Field
                      id="reset-code"
                      label="Verification Code"
                      placeholder="Verification Code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      required
                    />
                  </div>
                  <div className="auth-rise" style={{ animationDelay: '210ms' }}>
                    <PasswordField
                      id="reset-password"
                      label="New Password"
                      placeholder="New Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      show={showPassword}
                      onToggle={togglePasswordVisibility}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div className="auth-rise" style={{ animationDelay: '350ms' }}>
                    <PrimaryButton type="submit" loading={loading} className="brand-press w-full duration-180 ease-signal">
                      {loading ? "Resetting..." : "Reset Password"}
                    </PrimaryButton>
                  </div>
                </form>

                <p className="auth-rise mt-4 text-center text-sm text-dim" style={{ animationDelay: '390ms' }}>
                  <TextLink onClick={() => setView("forgotPassword")}>Resend Code</TextLink>
                </p>
              </>
            )}

      {showMFAVerification && (
        <PasskeyMFAVerification
          userId={mfaUserId}
          userEmail={mfaUserData?.email || email}
          onSuccess={handleMFASuccess}
          onCancel={handleMFACancel}
        />
      )}

      {showTOTPVerification && (
        <TOTPVerificationModal
          userEmail={totpUserData?.email || email}
          onSuccess={handleTOTPSuccess}
          onCancel={handleTOTPCancel}
        />
      )}
    </>
  );
}

export default Login;