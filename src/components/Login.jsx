import React, { useEffect, useMemo, useState, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";

import { VendorContext } from "../context/VendorContext";
import { UserContext } from "../context/UserContext";
import Alert from "./ui/Alert";
import background from "../assets/loginbackground.png";
import { Eye, EyeOff } from "lucide-react";
import config from "../config/env";
import PasskeyMFAVerification from "./PasskeyMFAVerification";
import { redirectToClientWithHandoff } from "../utils/handoffToClient";

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

  const { setUser: setVendorUser, hydrateCurrentUser } = useContext(VendorContext);
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

  const explicitVendor = useMemo(() => {
    const qp = new URLSearchParams(location.search);
    return qp.get("fromClient") === "true" || qp.get("role") === "vendor" || Boolean(qp.get("handoff"));
  }, [location.search]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCarouselIndex((prevIndex) => (prevIndex + 1) % carouselItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const togglePasswordVisibility = () => setShowPassword((v) => !v);
  const handleSignUpRedirect = () => navigate("/signup");

  const fetchVendorMe = async (idToken) => {
    const tryMeCookie = async () => {
      const res = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/me`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    };

    const tryMeBearer = async () => {
      const res = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) return null;
      return res.json();
    };

    return (await tryMeCookie()) || (await tryMeBearer());
  };

  const routeVendor = ({ status, hasFilledForm }) => {
    const resolvedStatus = String(status || "").toLowerCase();
    const resolvedHasFilledForm = hasFilledForm === true;

    if (resolvedStatus === "approved") {
      navigate("/VendorDashboard", { replace: true });
      return;
    }
    if (resolvedStatus === "rejected") {
      setAlertMessage("Your vendor application has been rejected. Please contact support.");
      setAlertType("error");
      setShowAlert(true);
      navigate("/Form1", { replace: true });
      return;
    }
    if (resolvedStatus === "pending" && resolvedHasFilledForm) {
      navigate("/Auditorapprove", { replace: true });
      return;
    }

    navigate("/Form1", { replace: true });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setShowAlert(false);

    try {
      const cognitoUser = await Auth.signIn(email, password);
      const session = await Auth.currentSession();
      const idToken = session.getIdToken().getJwtToken();

      let verifyRoleSelected = null;
      let verifyLastSelectedRole = null;

      try {
        const verifyRes = await fetch(`${config.VENDOR_BACKEND_URL}/api/auth/verify`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          verifyRoleSelected = verifyData?.roleSelected === true;
          verifyLastSelectedRole = (verifyData?.lastSelectedRole || "").toString().toLowerCase();

          // Legacy hint only; guards should rely on /verify.
          try {
            localStorage.setItem("roleSelected", verifyRoleSelected ? "true" : "false");
          } catch {}

          if (!verifyRoleSelected) {
            navigate("/role-selection", { replace: true });
            return;
          }

          if (!explicitVendor && verifyLastSelectedRole === "client") {
            await redirectToClientWithHandoff({ token: idToken });
            return;
          }
        }
      } catch (verifyErr) {
        console.warn("Verify failed, proceeding cautiously:", verifyErr);
      }

      // Establish vendor cookie session (sid).
      try {
        await fetch(`${config.VENDOR_BACKEND_URL}/api/auth/session`, {
          method: "POST",
          credentials: "include",
          headers: { Authorization: `Bearer ${idToken}` },
        });
      } catch (sessionErr) {
        console.warn("Failed to establish vendor cookie session:", sessionErr);
      }

      const vendorMe = await fetchVendorMe(idToken);

      if (!vendorMe?.success || !vendorMe?.data) {
        setAlertMessage("Failed to retrieve vendor details. Please try again or contact support.");
        setAlertType("error");
        setShowAlert(true);
        return;
      }

      const vendorId = vendorMe.data.vendorId || vendorMe.data.id || null;
      const vendorEmail = vendorMe.data.email || cognitoUser?.attributes?.email || email;
      const vendorName = vendorMe.data.name || cognitoUser?.attributes?.name || cognitoUser?.username || "";

      const vendorUser = {
        vendorId,
        email: vendorEmail,
        name: vendorName,
        role: "vendor",
        status: vendorMe.data.status,
        hasFilledForm: vendorMe.data.hasFilledForm,
      };

      setVendorUser(vendorUser);
      setAppUser(vendorUser);

      // Ensure VendorContext is hydrated from cookies for subsequent guards.
      try {
        await Promise.resolve(hydrateCurrentUser?.());
      } catch {}

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
              userStatus: vendorMe.data.status,
              hasFilledForm: vendorMe.data.hasFilledForm,
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

      // Final vendor routing based on vendors table status.
      if (verifyRoleSelected === false) {
        navigate("/role-selection", { replace: true });
        return;
      }

      routeVendor({ status: vendorMe.data.status, hasFilledForm: vendorMe.data.hasFilledForm });
    } catch (error) {
      console.error("Error logging in:", error);

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
    } finally {
      setLoading(false);
    }
  };

  const handleMFASuccess = async () => {
    try {
      setShowMFAVerification(false);
      // After passkey success, backend should have the cookie session; hydrate & route.
      await Promise.resolve(hydrateCurrentUser?.());
      const vendorMe = await fetchVendorMe(null);
      if (vendorMe?.success && vendorMe?.data) {
        routeVendor({ status: vendorMe.data.status, hasFilledForm: vendorMe.data.hasFilledForm });
      } else {
        navigate("/Form1", { replace: true });
      }
    } catch (e) {
      console.warn("MFA success handling failed:", e);
      navigate("/Form1", { replace: true });
    }
  };

  const handleMFACancel = () => {
    setShowMFAVerification(false);
    setMfaUserId(null);
    setMfaUserData(null);
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
    </div>
  );
}

export default Login;