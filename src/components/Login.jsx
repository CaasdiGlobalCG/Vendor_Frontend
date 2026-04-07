import React, { useEffect, useMemo, useState, useContext, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";

import { VendorContext } from "../context/VendorContext";
import { UserContext } from "../context/UserContext";
import Alert from "./ui/Alert";
import background from "../assets/loginbackground.png";
import { Eye, EyeOff } from "lucide-react";
import config from "../config/env";
import PasskeyMFAVerification from "./PasskeyMFAVerification";
import TOTPVerificationModal from "./TOTPVerificationModal";
import { redirectToClientWithHandoff } from "../utils/handoffToClient";
import { redirectToSalesWithHandoff } from "../utils/handoffToSales";
import { getVendorDestination, isRejectedVendor } from "../utils/vendorAuthRouting";
import { resolvePostLoginPlatform, persistLastSelectedPlatform } from "../utils/postLoginPlatformResolver";

const AUTH_TRANSITION_KEY = 'vendorAuthTransitionInProgress';
const AUTH_TRANSITION_STARTED_AT_KEY = 'vendorAuthTransitionStartedAt';

const carouselItems = [
  {
    title: "Stay in Control",
    description: "Track progress, monitor performance, and ensure quality with our smart dashboards.",
  },
  {
    title: "Real-time Insights",
    description: "Get instant visibility into your projects with live updates and detailed analytics.",
  },
  {
    title: "Seamless Collaboration",
    description: "Work together with your team effortlessly with integrated communication tools.",
  },
  {
    title: "Powerful Analytics",
    description: "Leverage data-driven insights to make better business decisions faster.",
  },
  {
    title: "Complete Integration",
    description: "Connect all your tools and workflows in one unified platform.",
  },
];

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
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);

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

  // Carousel rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCarouselIndex((prevIndex) => (prevIndex + 1) % carouselItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ═══ DEBUG: Track TOTP modal state ═══
  useEffect(() => {
    console.log('[Login] showTOTPVerification state changed:', showTOTPVerification);
    if (showTOTPVerification) {
      console.log('[Login] TOTP Modal should be visible! totpUserData:', totpUserData);
    }
  }, [showTOTPVerification]);

  const togglePasswordVisibility = () => setShowPassword((v) => !v);
  const handleSignUpRedirect = () => navigate("/signup");

  const routeVendor = ({ status, hasFilledForm, isTeamMember }) => {
    if (isRejectedVendor(status)) {
      setAlertMessage("Your vendor application has been rejected. Please contact support.");
      setAlertType("error");
      setShowAlert(true);
    }

    navigate(
      getVendorDestination({ status, hasFilledForm, isTeamMember }),
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
          if (!verifyRoleSelected && !verifyIsTeamMember) {
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

      routeVendor({ status: vendorUser.status, hasFilledForm: vendorUser.hasFilledForm, isTeamMember: vendorUser.isTeamMember === true || verifyIsTeamMember });
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
    <div
      className="min-h-screen relative flex items-center justify-center p-6 bg-center bg-cover bg-no-repeat"
      style={{ backgroundImage: `url(${background})` }}
    >
      <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="rounded-2xl w-full max-w-md mx-auto shadow-2xl bg-white">
          <div className="rounded-2xl p-8 bg-white">
            {showAlert && (
              <div className="mb-4">
                <Alert message={alertMessage} type={alertType} onClose={() => setShowAlert(false)} />
              </div>
            )}

            {view === "login" && (
              <>
                <h2 className="text-gray-900 text-2xl font-semibold mb-2">Hello User</h2>
                <p className="text-sm text-gray-600 mb-6">Enter your email and password to log in</p>
              </>
            )}

            {view === "forgotPassword" && (
              <>
                <h2 className="text-gray-900 text-2xl font-semibold mb-2">Forgot Password</h2>
                <p className="text-sm text-gray-600 mb-6">Enter your email to receive a reset code</p>
              </>
            )}

            {view === "login" && (
              <>
                <form className="w-full" onSubmit={handleLogin}>
                  <input
                    type="email"
                    placeholder="Enter your mail id"
                    className="w-full bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-200 rounded-md px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <div className="relative mb-4">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="w-full bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-200 rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-emerald-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <div className="text-right mb-4">
                    <span
                      className="text-sm text-emerald-600 cursor-pointer hover:underline"
                      onClick={() => setView("forgotPassword")}
                    >
                      Forgot Password?
                    </span>
                  </div>
                  <button
                    type="submit"
                    className={`w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-6 py-2 transition duration-200 ${
                      loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    disabled={loading}
                  >
                    {loading ? "Logging in..." : "Login"}
                  </button>
                </form>

                <p className="text-sm text-gray-600 mt-6 text-center">
                  Don’t have an account?{" "}
                  <span
                    className="text-emerald-600 underline cursor-pointer font-semibold"
                    onClick={handleSignUpRedirect}
                  >
                    Signup
                  </span>
                </p>
              </>
            )}

            {view === "forgotPassword" && (
              <>
                <form className="w-full" onSubmit={handleForgotPassword}>
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-200 rounded-md px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    className={`w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-6 py-2 transition ${
                      loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Send Reset Code"}
                  </button>
                </form>
                <p className="text-sm text-gray-600 mt-4">
                  <span
                    className="text-emerald-600 underline cursor-pointer font-semibold"
                    onClick={() => setView("login")}
                  >
                    Back to Login
                  </span>
                </p>
              </>
            )}

            {view === "resetPassword" && (
              <>
                <h2 className="text-gray-900 text-xl font-semibold mb-2">Reset Your Password</h2>
                <p className="text-sm text-gray-600 mb-6">Enter the code from your email and a new password.</p>
                <form className="w-full" onSubmit={handleResetPassword}>
                  <input
                    type="text"
                    placeholder="Verification Code"
                    className="w-full bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-200 rounded-md px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    className="w-full bg-gray-50 text-gray-900 placeholder-gray-500 border border-gray-200 rounded-md px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    className={`w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-6 py-2 transition ${
                      loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    disabled={loading}
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>
                </form>
                <p className="text-sm text-gray-600 mt-4">
                  <span
                    className="text-emerald-600 underline cursor-pointer font-semibold"
                    onClick={() => setView("forgotPassword")}
                  >
                    Resend Code
                  </span>
                </p>
              </>
            )}
          </div>
        </div>

        <div className="hidden md:flex flex-col items-center justify-center text-center text-white p-6 relative h-96">
          <div className="text-4xl font-extrabold mb-0">CG</div>

          <div className="relative w-full max-w-sm flex-1 flex flex-col items-center justify-center overflow-hidden">
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {carouselItems.map((item, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
                    index === currentCarouselIndex ? "opacity-100 scale-100" : "opacity-0 scale-95"
                  }`}
                >
                  <h3 className="text-2xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-gray-300/85 max-w-sm text-sm leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-6 flex gap-2 z-20">
            {carouselItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentCarouselIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentCarouselIndex ? "w-8 bg-emerald-500" : "w-2 bg-white/40 hover:bg-white/70"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

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
    </div>
  );
}

export default Login;