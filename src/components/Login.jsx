import React, { useState, useEffect, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";
import "slick-carousel/slick/slick-theme.css";
import "slick-carousel/slick/slick.css";
import image1 from "../assets/bg.png";
import image2 from "../assets/image1.jpg";
import image3 from "../assets/image3.jpg";
import Slider from "react-slick";
import { VendorContext } from "../context/VendorContext";
import { UserContext } from "../context/UserContext";
import Alert from "./ui/Alert";
import background from "../assets/loginbackground.png";
import { Eye, EyeOff } from "lucide-react";
import config from '../config/env';
import PasskeyMFAVerification from './PasskeyMFAVerification';
import { redirectToClientWithHandoff } from '../utils/handoffToClient';
const carouselItems = [
  {
    title: "Stay in Control",
    description: "Track progress, monitor performance, and ensure quality with our smart dashboards.",
    icon: "📊"
  },
  {
    title: "Real-time Insights",
    description: "Get instant visibility into your projects with live updates and detailed analytics.",
    icon: "⚡"
  },
  {
    title: "Seamless Collaboration",
    description: "Work together with your team effortlessly with integrated communication tools.",
    icon: "🤝"
  },
  {
    title: "Powerful Analytics",
    description: "Leverage data-driven insights to make better business decisions faster.",
    icon: "📈"
  },
  {
    title: "Complete Integration",
    description: "Connect all your tools and workflows in one unified platform.",
    icon: "🔗"
  }
];

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState("error");
  const [loading, setLoading] = useState(false); // New loading state
  const [view, setView] = useState('login'); // 'login', 'forgotPassword', 'resetPassword'
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const [showMFAVerification, setShowMFAVerification] = useState(false);
  const [mfaUserId, setMfaUserId] = useState(null);
  const [mfaUserData, setMfaUserData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { role, email: emailFromState, from } = location.state || {};
  const { setUser: setVendorContextUser, hydrateCurrentUser, logout } = useContext(VendorContext);
  const { setCurrentUser } = useContext(UserContext);

  // Carousel auto-rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentCarouselIndex((prevIndex) => (prevIndex + 1) % carouselItems.length);
    }, 5000); // Change every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  // New useEffect to handle URL parameters after Google redirect
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const authTokenParam = queryParams.get('authToken');
    const statusParam = queryParams.get('status');
    const roleParam = queryParams.get('role');
    const filledFormParam = queryParams.get('filledForm');

    console.log('Login.jsx (VendorDashboard): URL Params - authTokenParam:', authTokenParam ? 'Exists' : 'Does NOT exist');

    if (authTokenParam) {
      localStorage.setItem('authToken', authTokenParam);
      console.log('Login.jsx (VendorDashboard): Stored authToken from URL in localStorage.');
      // Hydrate vendor identity from backend (do not trust vendorId/email from URL)
      Promise.resolve(hydrateCurrentUser?.()).catch(() => {});
    }

    if (authTokenParam || statusParam || roleParam || filledFormParam) {
      // Optionally, remove params from URL after processing to keep it clean
      queryParams.delete('authToken');
      queryParams.delete('status');
      queryParams.delete('role');
      queryParams.delete('filledForm');
      navigate(location.pathname, { replace: true });
    }

    // If a redirect was intended for the dashboard, ensure the user data is set and redirect
  }, [location.search, navigate, hydrateCurrentUser, setVendorContextUser, setCurrentUser]);

  const handleLogin = async (e) => {
    // e.preventDefault();
    // setError(""); // Clear any previous errors
    
    // // Clear any existing user data
    // logout();
    // localStorage.removeItem('currentUser');
    // sessionStorage.clear();
    
    // console.log("Login: Cleared existing user data");
    
    // if (!email && !emailFromState) {
    //   setError("Email is required");
    //   return;
    // }
    
    // if (!password) {
    //   setError("Password is required");
    //   return;
    // }
     e.preventDefault();
    setError(""); // Clear any previous errors
    setShowAlert(false); // Clear any previous alerts
    setLoading(true); // Set loading to true when login attempt starts
    
    // Check if both email and password are empty
    if ((!email && !emailFromState) && !password) {
      setAlertMessage("Please enter your email and password to log in.");
      setAlertType("error");
      setShowAlert(true);
      return;
    }
    
    // Check if email is empty
    if (!email && !emailFromState) {
      setAlertMessage("Email is required. Please enter your email address.");
      setAlertType("error");
      setShowAlert(true);
      return;
    }
    
    // Check if password is empty
    if (!password) {
      setAlertMessage("Password is required. Please enter your password.");
      setAlertType("error");
      setShowAlert(true);
      return;
    }
    
    // Validate email format
    const emailToValidate = email || emailFromState;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToValidate)) {
      setAlertMessage("Invalid email format. Please enter a valid email address.");
      setAlertType("error");
      setShowAlert(true);
      return;
    }

    try {
      console.log("Attempting login with:", email || emailFromState);
      const user = await Auth.signIn(email || emailFromState, password);
      console.log("Login successful", user);

      // Store the Cognito ID Token in localStorage as 'authToken'
      const idToken = user.signInUserSession.idToken.jwtToken;
      localStorage.setItem('authToken', idToken);
      console.log("Stored Cognito authToken in localStorage:", idToken);

      // Gate by roleSelected BEFORE fetching vendor or setting contexts
      try {
        const verifyRes = await fetch(`${config.VENDOR_BACKEND_URL}/api/auth/verify`, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          const roleSelected = verifyData?.roleSelected === true;
          localStorage.setItem('roleSelected', roleSelected ? 'true' : 'false');
          if (!roleSelected) {
            // Ensure we do not set any contexts before redirect
            try { localStorage.removeItem('currentUser'); } catch {}
            navigate(`/role-selection`, { replace: true });
            return;
          }
        }
      } catch (verifyErr) {
        console.warn('Verify failed, proceeding cautiously:', verifyErr);
      }

      // Fetch the vendor data (secure /me) to get the vendorId
      try {
        const vendorResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/me`, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        const vendorData = await vendorResponse.json();
        
        console.log("Login.jsx (VendorDashboard): Response from /api/vendor/me (Cognito login):", vendorData);
        
        let vendorId;
        if (vendorData.success && vendorData.data) { // Check if vendorData.data exists directly
          // Use the vendorId from the database
          vendorId = vendorData.data.vendorId || vendorData.data.id; // Access properties directly
          console.log("Found existing vendorId:", vendorId);
        } else {
          // If no vendor data found, it's an error.
          console.error("Login.jsx (VendorDashboard): No vendor data found for email after login.");
          setAlertMessage("Failed to retrieve vendor details. Please try again or contact support.");
          setAlertType("error");
          setShowAlert(true);
          return; // Stop the login process
        }
        
        const userData = {
          vendorId: vendorId,
          email: user.attributes.email,
          name: user.attributes.name || user.username
        };

        // Do NOT store identity/profile in localStorage (prevents stale/cross-user leakage)
        setVendorContextUser(userData);
        setCurrentUser(userData);
      } catch (error) {
        console.error("Error fetching vendor data:", error);
        setAlertMessage("Failed to retrieve vendor details due to a network error. Please try again.");
        setAlertType("error");
        setShowAlert(true);
        return; // Stop the login process
      }

      // Use the new endpoint that checks both collections
      const userEmail = user.attributes.email;
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/user-status`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${idToken}` }
      });
      const data = await response.json();
      
      console.log("User status data from login:", data);

      // Check if user has passkey registered
      let userHasPasskey = false;
      let userIdForMFA = null;
      try {
        const passkeyStatusRes = await fetch(`${config.VENDOR_BACKEND_URL}/api/auth/passkey/user-status?email=${encodeURIComponent(userEmail)}`);
        if (passkeyStatusRes.ok) {
          const passkeyStatusData = await passkeyStatusRes.json();
          userHasPasskey = passkeyStatusData.data?.hasPasskey || false;
          userIdForMFA = passkeyStatusData.data?.userId;
          console.log("[DEBUG] Full passkeyStatusData:", passkeyStatusData);
          console.log("[DEBUG] userHasPasskey:", userHasPasskey, "userIdForMFA:", userIdForMFA);
        } else {
          console.warn("[DEBUG] passkeyStatusRes not ok:", passkeyStatusRes.status);
        }
      } catch (passkeyError) {
        console.warn("[DEBUG] Error checking passkey status:", passkeyError);
      }

      // If user has passkey, show MFA verification
      if (userHasPasskey && userIdForMFA) {
        console.log("[DEBUG] Showing MFA verification screen");
        setMfaUserId(userIdForMFA);
        setMfaUserData({
          vendorId: data.data?.vendorId,
          email: userEmail,
          name: user.attributes.name || user.username,
          idToken,
          userStatus: data.data?.status,
          hasFilledForm: data.data?.hasFilledForm,
          role: data.data?.role
        });
        setShowMFAVerification(true);
        setLoading(false);
        return;
      } else {
        console.log("[DEBUG] MFA modal not shown. userHasPasskey:", userHasPasskey, "userIdForMFA:", userIdForMFA);
      }
      
      // If we have a 'from' location in state, redirect there after login
      if (from) {
        navigate(from.pathname, { replace: true });
        return;
      }
      
      // Otherwise, redirect based on user status
      if (data.success) {
        const userInfo = data.data;
        const resolvedStatus = String(userInfo?.status || '').toLowerCase();
        const resolvedHasFilledForm = userInfo?.hasFilledForm === true;
        // If role not selected, force role-selection
        try {
          const rs = localStorage.getItem('roleSelected');
          if (rs !== 'true') {
            navigate(`/role-selection`, { replace: true });
            return;
          }
        } catch {}
        if (resolvedStatus === 'approved') {
          // If approved, go directly to dashboard regardless of form completion
          navigate(`/VendorDashboard`, { replace: true });
        } else if (resolvedStatus === 'rejected') {
          alert("Your vendor application has been rejected. Please contact support.");
          navigate(`/Form1`, { replace: true });
        } else if (resolvedStatus === 'pending' && resolvedHasFilledForm) {
          navigate(`/Auditorapprove`, { replace: true });
        } else {
          // If role is client, start client onboarding; else Form1
        if ((userInfo.role || '').toLowerCase() === 'client') {
          const clientBase = config.CLIENT_URL || '';
          
          if (!clientBase) {
            console.error('CLIENT_URL is not configured');
            setAlertMessage('Client dashboard URL is not configured. Please contact support.');
            setAlertType('error');
            setShowAlert(true);
            return;
          }

          try { localStorage.removeItem('clientId'); } catch {}
          redirectToClientWithHandoff().catch((e) => {
            console.error('Login: handoff redirect failed:', e);
            alert('Unable to switch to client right now. Please try again.');
          });
          } else {
            navigate(`/Form1`, { replace: true });
          }
        }
      } else {
        navigate(`/Form1`, { replace: true });
      }
    } catch (error) {
      console.error("Error logging in:", error);
      
      if (error.code === 'UserNotConfirmedException') {
        // User exists but is not confirmed
        alert("Your account needs verification. We'll send you to the verification page.");
        navigate("/verification", { state: { email: email || emailFromState } });
        return;
      }
      
      // Handle other common errors with user-friendly messages
      let errorMessage;
      switch (error.code) {
        case 'UserNotFoundException':
           setAlertMessage("We couldn't find an account with that email. Please check your email or sign up.");
          setAlertType("error");
          setShowAlert(true);
          break;
        case 'NotAuthorizedException':
          // Check if the user is a Google-first user
          try {
            const res = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/auth-details/${email || emailFromState}`);
            if (res.ok) {
              const authDetails = await res.json();
              if (authDetails.success && authDetails.isGoogleUser) {
                setAlertMessage("This account was created using Google. Please use the 'Sign in with Google' button or click 'Forgot Password' to set a password.");
              } else {
                setAlertMessage("Email and password don't match our records. Please check your credentials.");
              }
            } else {
               setAlertMessage("Email and password don't match our records. Please check your credentials.");
            }
          } catch (apiError) {
             setAlertMessage("Email and password don't match our records. Please check your credentials.");
          }
          setAlertType("error");
          setShowAlert(true);
          break;
        case 'PasswordResetRequiredException':
          setAlertMessage("You need to reset your password. Please use the 'Forgot Password' option.");
          setAlertType("warning");
          setShowAlert(true);
          break;
        case 'CodeMismatchException':
          setAlertMessage("Invalid verification code. Please check the code and try again.");
          setAlertType("error");
          setShowAlert(true);
          break;
        default:
          setAlertMessage(error.message || "An unexpected error occurred during login. Please try again.");
          setAlertType("error");
          setShowAlert(true);
          break;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false); // Set loading to false after login attempt (success or failure)
    }
  };

  const handleMFASuccess = async (mfaResult) => {
    // MFA verification successful, complete the login flow
    console.log("MFA verification successful");
    
    const userData = {
      vendorId: mfaUserData.vendorId,
      email: mfaUserData.email,
      name: mfaUserData.name
    };
    
    // Do NOT store identity/profile in localStorage (prevents stale/cross-user leakage)
    localStorage.setItem('authToken', mfaUserData.idToken);
    
    // Update contexts
    setVendorContextUser(userData);
    setCurrentUser(userData);
    
    // Redirect based on user status
    const mfaStatus = String(mfaUserData.userStatus || '').toLowerCase();
    if (mfaStatus === 'approved') {
      navigate(`/VendorDashboard`, { replace: true });
    } else if (mfaStatus === 'rejected') {
      alert("Your vendor application has been rejected. Please contact support.");
      navigate(`/Form1`, { replace: true });
    } else if (mfaStatus === 'pending' && mfaUserData.hasFilledForm) {
      navigate(`/Auditorapprove`, { replace: true });
    } else {
      if ((mfaUserData.role || '').toLowerCase() === 'client') {
        const clientBase = config.CLIENT_URL || '';
        if (!clientBase) {
          console.error('CLIENT_URL is not configured');
          setAlertMessage('Client dashboard URL is not configured. Please contact support.');
          setAlertType('error');
          setShowAlert(true);
          return;
        }
        try { localStorage.removeItem('clientId'); } catch {}
        redirectToClientWithHandoff().catch((e) => {
          console.error('Login(MFA): handoff redirect failed:', e);
          alert('Unable to switch to client right now. Please try again.');
        });
      } else {
        navigate(`/Form1`, { replace: true });
      }
    }
  };

  const handleMFACancel = () => {
    setShowMFAVerification(false);
    setMfaUserId(null);
    setMfaUserData(null);
    setLoading(false);
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
      setView('resetPassword');
      setAlertMessage(`A password reset code has been sent to ${email}.`);
      setAlertType('success');
      setShowAlert(true);
    } catch (error) {
      console.error("Forgot password error:", error);
      setAlertMessage(error.message || "Failed to initiate password reset.");
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
      setAlertMessage('Password has been reset successfully! Please log in with your new password.');
      setAlertType('success');
      setShowAlert(true);
      setView('login');
      setPassword('');
      setVerificationCode('');
    } catch (error) {
      console.error("Reset password error:", error);
      setAlertMessage(error.message || "Failed to reset password. Please check the code.");
      setAlertType("error");
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Clear any existing user data
    logout();
    localStorage.removeItem('currentUser');
    sessionStorage.clear();
    
    console.log("Login: Cleared existing user data for Google login");
    
    // Redirect to Google OAuth endpoint
    window.open(`${config.VENDOR_BACKEND_URL}/api/auth/google`, "_self");
  };

  // Handle Google redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');
    const status = urlParams.get('status');
    const filledFormParam = urlParams.get('filledForm');
    const role = urlParams.get('role') || 'vendor';
    const name = urlParams.get('name') || email?.split('@')[0] || '';
  
    if (email && location.pathname !== '/VendorDashboard') {
      const checkUserStatus = async () => {
        try {
          console.log("Login - Google redirect with email:", email);
          
          // Fetch the vendor data to get the vendorId
          try {
            // Prefer secure /me (uses session cookie or JWT)
            const vendorResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/me`, {
              credentials: 'include'
            });
            const vendorData = await vendorResponse.json();
            
            console.log("Login.jsx (VendorDashboard): Response from /api/vendor/me (Google redirect):", vendorData);
            
            let vendorId;
            if (vendorData.success && vendorData.data) { // Check if vendorData.data exists directly
              // Use the vendorId from the database
              vendorId = vendorData.data.vendorId || vendorData.data.id; // Access properties directly
              console.log("Google login - Found existing vendorId:", vendorId);
            } else {
              console.error("Login.jsx (VendorDashboard): No vendor data found for email after Google login.");
              setAlertMessage("Failed to retrieve vendor details after Google login. Please try again or contact support.");
              setAlertType("error");
              setShowAlert(true);
              return; // Stop processing Google redirect
            }
            
            // If role not selected, do not set contexts or open sockets
            try {
              const rs = localStorage.getItem('roleSelected');
              if (rs !== 'true') {
                // Do not set contexts here; redirect to role selection
                navigate(`/role-selection`, { replace: true });
                return;
              }
            } catch {}

            // Create a more complete user object with vendorId
            const userData = {
              vendorId: vendorId, // Add vendorId explicitly
              email: email, // Email is our primary identifier
              name: name,
            };
    
            // Set user in both contexts
            setVendorContextUser(userData);
            setCurrentUser(userData);
          } catch (error) {
            console.error("Error fetching vendor data for Google login:", error);
            setAlertMessage("Failed to retrieve vendor details after Google login due to a network error. Please try again.");
            setAlertType("error");
            setShowAlert(true);
            return; // Stop processing Google redirect
          }
          
          // Log the user data that was set (using the current context values)
          console.log("Login - Set user data in contexts:", { 
            vendorContext: currentUser || "Not available yet", 
            userContext: currentUser || "Not available yet" 
          });
  
          // First, ensure the user exists in our system by creating a vendor record if needed
          try {
          } catch (createError) {
            console.error("Login - Error creating/checking user:", createError);
          }
          
          // Now check the user status
          const token = localStorage.getItem('authToken');
          const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/user-status`, {
            credentials: 'include',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          const data = await response.json();
          console.log("Login - User status response:", data);
  
          // If we have a 'from' location in state, redirect there after login
          if (from) {
            navigate(from.pathname, { replace: true });
            return;
          }
  
          if (data.success) {
            const userData = data.data;
            const currentStatus = String(userData.status || '').toLowerCase();
            const hasFilledForm = userData.hasFilledForm === true;
            // If role not selected, force role-selection
            try {
              const verifyRes = await fetch(`${config.VENDOR_BACKEND_URL}/api/auth/verify`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
              });
              if (verifyRes.ok) {
                const verifyData = await verifyRes.json();
                if (verifyData && verifyData.roleSelected === false) {
                  navigate(`/role-selection`, { replace: true });
                  return;
                }
              }
            } catch {}
  
            if (currentStatus === 'approved') {
              navigate(`/VendorDashboard`, { replace: true });
            } else if (currentStatus === 'rejected') {
              setAlertMessage("Your vendor application has been rejected. Please contact support.");
              setAlertType("error");
              setShowAlert(true);
              setTimeout(() => {
                navigate(`/Form1`, { replace: true });
              }, 2000);
            } else if (currentStatus === 'pending' && hasFilledForm) {
              navigate(`/Auditorapprove`, { replace: true });
            } else {
              if ((userData.role || '').toLowerCase() === 'client') {
                const clientBase = config.CLIENT_URL || '';
                
                if (!clientBase) {
                  console.error('CLIENT_URL is not configured');
                  setAlertMessage('Client dashboard URL is not configured. Please contact support.');
                  setAlertType('error');
                  setShowAlert(true);
                  return;
                }
                
                try { localStorage.removeItem('clientId'); } catch {}
                redirectToClientWithHandoff().catch((e) => {
                  console.error('Login: handoff redirect failed:', e);
                  alert('Unable to switch to client right now. Please try again.');
                });
              } else {
                navigate(`/Form1`, { replace: true });
              }
            }
          } else {
            // If backend status isn't available, route to onboarding.
            navigate(`/Form1`, { replace: true });
          }
        } catch (error) {
          console.error("Login - Error checking user status:", error);
          
          // Fallback navigation if everything fails
          navigate("/Form1", { state: { role, email }, replace: true });
        }
      };
  
      checkUserStatus();
    }
  }, [location.search, setVendorContextUser, setCurrentUser, navigate, from]);
  
  const handleSignUpRedirect = () => {
    navigate("/signup", { replace: true });
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };


  const slides = [
    { image: image1, title: "Slide 1 Title", subtitle: "This is the first slide description." },
    { image: image2, title: "Slide 2 Title", subtitle: "This is the second slide description." },
    { image:  image3, title: "Slide 3 Title", subtitle: "This is the third slide description." },
  ];

    const sliderSettings = {
      dots: true,
      infinite: true,
      speed: 500,
      slidesToShow: 1,
      slidesToScroll: 1,
      autoplay: true,
      autoplaySpeed: 2000,
      responsive: [
        {
          breakpoint: 768,
          settings: {
            slidesToShow: 2,
            slidesToScroll: 1,
          },
        },
        {
          breakpoint: 480,
          settings: {
            slidesToShow: 1,
            slidesToScroll: 1,
          },
        },
      ],
      appendDots: (dots) => (
        <ul style={{ bottom: '60px' }}>{dots}</ul>
      ),
      customPaging: (i) => (
        <div className="w-3 h-3 mx-1 rounded-full bg-white opacity-50 hover:opacity-100 transition-opacity cursor-pointer [.slick-active_&]:opacity-100" />
      ),
    };
  

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-center bg-cover bg-no-repeat" style={{ backgroundImage: `url(${background})` }}>
      <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left: Login Card */}
        <div className="rounded-2xl w-full max-w-md mx-auto shadow-2xl bg-white">
          <div className="rounded-2xl p-8 bg-white">
          {showAlert && (
            <div className="mb-4">
              <Alert
                message={alertMessage}
                type={alertType}
                onClose={() => setShowAlert(false)}
              />
            </div>
          )}
          {view === 'login' && (
            <>
              <h2 className="text-gray-900 text-2xl font-semibold mb-2">Hello User</h2>
              <p className="text-sm text-gray-600 mb-6">Enter your email and password to log in</p>
            </>
          )}
          {view === 'forgotPassword' && (
            <>
              <h2 className="text-gray-900 text-2xl font-semibold mb-2">Forgot Password</h2>
              <p className="text-sm text-gray-600 mb-6">Enter your email to receive a reset code</p>
            </>
          )}

          {view === 'login' && (
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
                    onClick={() => setView('forgotPassword')}
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

              {/* <div className="flex items-center w-full my-6">
                <hr className="flex-grow border-t border-gray-200" />
                <span className="mx-4 text-sm text-gray-500">or</span>
                <hr className="flex-grow border-t border-gray-200" />
              </div>

              <button
                onClick={handleGoogleSignIn}
                className={`w-full border border-gray-200 text-gray-700 rounded-lg px-6 py-2 flex items-center justify-center gap-2 hover:bg-gray-50 transition ${
                  loading ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={loading}
              >
                <img
                  src="https://static.codia.ai/image/2025-03-27/fdbd1c0e-18aa-467a-b69c-d9b0d4d35d40.svg"
                  alt="Google"
                  className="w-5 h-5"
                />
                <span className="text-sm">Sign in with Google</span>
              </button> */}

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

          {view === 'forgotPassword' && (
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
                  className={`w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-6 py-2 transition ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Reset Code"}
                </button>
              </form>
              <p className="text-sm text-gray-600 mt-4">
                <span className="text-emerald-600 underline cursor-pointer font-semibold" onClick={() => setView('login')}>
                  Back to Login
                </span>
              </p>
            </>
          )}

          {view === 'resetPassword' && (
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
                  className={`w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-6 py-2 transition ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={loading}
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
              <p className="text-sm text-gray-600 mt-4">
                <span className="text-emerald-600 underline cursor-pointer font-semibold" onClick={() => setView('forgotPassword')}>
                  Resend Code
                </span>
              </p>
            </>
          )}
          </div>
        </div>

        {/* Right: Brand carousel panel */}
        <div className="hidden md:flex flex-col items-center justify-center text-center text-white p-6 relative h-96">
          {/* CG Logo - Always visible */}
          <div className="text-4xl font-extrabold mb-0">CG</div>

          {/* Carousel Container */}
          <div className="relative w-full max-w-sm flex-1 flex flex-col items-center justify-center overflow-hidden">
            {/* Animated carousel content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {carouselItems.map((item, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
                    index === currentCarouselIndex
                      ? 'opacity-100 scale-100'
                      : 'opacity-0 scale-95'
                  }`}
                >
                  <h3 className="text-2xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-gray-300/85 max-w-sm text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Dot Indicators */}
          <div className="absolute bottom-6 flex gap-2 z-20">
            {carouselItems.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentCarouselIndex(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentCarouselIndex
                    ? 'w-8 bg-emerald-500'
                    : 'w-2 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Passkey MFA Verification Modal */}
      {showMFAVerification && (
        <PasskeyMFAVerification
          userId={mfaUserId}
          userEmail={email}
          onSuccess={handleMFASuccess}
          onCancel={handleMFACancel}
        />
      )}
    </div>
  );
}

export default Login;