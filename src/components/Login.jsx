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
  const navigate = useNavigate();
  const location = useLocation();
  const { role, email: emailFromState, from } = location.state || {};
  const { setUser: setVendorContextUser, logout } = useContext(VendorContext);
  const { setCurrentUser } = useContext(UserContext);

  // New useEffect to handle URL parameters after Google redirect
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const authTokenParam = queryParams.get('authToken');
    const vendorIdParam = queryParams.get('vendorId');
    const emailParam = queryParams.get('email');
    const statusParam = queryParams.get('status');
    const roleParam = queryParams.get('role');
    const filledFormParam = queryParams.get('filledForm');

    console.log('Login.jsx (VendorDashboard): URL Params - authTokenParam:', authTokenParam ? 'Exists' : 'Does NOT exist', 'vendorIdParam:', vendorIdParam ? 'Exists' : 'Does NOT exist', 'emailParam:', emailParam ? 'Exists' : 'Does NOT exist');

    if (authTokenParam) {
      localStorage.setItem('authToken', authTokenParam);
      console.log('Login.jsx (VendorDashboard): Stored authToken from URL in localStorage.');
    }
    if (vendorIdParam) {
      localStorage.setItem('vendorId', vendorIdParam);
      console.log('Login.jsx (VendorDashboard): Stored vendorId from URL in localStorage.');
    }
    if (emailParam) {
      localStorage.setItem('email', emailParam);
      console.log('Login.jsx (VendorDashboard): Stored email from URL in localStorage.');
    }

    if (authTokenParam || vendorIdParam || emailParam || statusParam || roleParam || filledFormParam) {
      // Optionally, remove params from URL after processing to keep it clean
      queryParams.delete('authToken');
      queryParams.delete('vendorId');
      queryParams.delete('email');
      queryParams.delete('status');
      queryParams.delete('role');
      queryParams.delete('filledForm');
      navigate(location.pathname, { replace: true });
    }

    // If a redirect was intended for the dashboard, ensure the user data is set and redirect
    if (emailParam && statusParam) {
      const userData = {
        vendorId: vendorIdParam, // Use vendorId from param
        email: emailParam,
        status: statusParam,
        role: roleParam,
        hasFilledForm: filledFormParam === 'true'
      };
      // Removed call to undefined function setUserDataAndContexts and handleUserNavigation
      // as per user request to remove temporary generation and streamline context updates.
      // The logic for navigating based on status is handled in the second useEffect (Google redirect).
    }

  }, [location.search, navigate, setVendorContextUser, setCurrentUser]);

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
            navigate(`/role-selection?email=${encodeURIComponent(user.attributes.email)}`, { replace: true });
            return;
          }
        }
      } catch (verifyErr) {
        console.warn('Verify failed, proceeding cautiously:', verifyErr);
      }

      // Fetch the vendor data to get the vendorId
      try {
        const vendorResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/vendor-by-email?email=${encodeURIComponent(user.attributes.email)}`);
        const vendorData = await vendorResponse.json();
        
        console.log("Login.jsx (VendorDashboard): Response from vendor-by-email endpoint (Cognito login):", vendorData);
        
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
          vendorId: vendorId, // Add vendorId explicitly
          email: user.attributes.email, // Email is our primary identifier
          name: user.attributes.name || user.username
        };
        
        // Store user data in localStorage for persistence
        localStorage.setItem('currentUser', JSON.stringify(userData));
        
        // Update both contexts with the user data
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
      const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/user-status?email=${encodeURIComponent(userEmail)}`);
      const data = await response.json();
      
      console.log("User status data from login:", data);
      
      // If we have a 'from' location in state, redirect there after login
      if (from) {
        navigate(from.pathname, { replace: true });
        return;
      }
      
      // Otherwise, redirect based on user status
      if (data.success) {
        const userInfo = data.data;
        // If role not selected, force role-selection
        try {
          const rs = localStorage.getItem('roleSelected');
          if (rs !== 'true') {
            navigate(`/role-selection?email=${encodeURIComponent(userEmail)}`, { replace: true });
            return;
          }
        } catch {}
        if (userInfo.status === 'approved') {
          // If approved, go directly to dashboard regardless of form completion
          // Use URL parameters instead of state
          const userEmail = user.attributes.email;
          navigate(`/VendorDashboard?email=${encodeURIComponent(userEmail)}&role=${encodeURIComponent(userInfo.role || 'vendor')}`, { replace: true });
        } else if (userInfo.status === 'rejected') {
          alert("Your vendor application has been rejected. Please contact support.");
          const userEmail = user.attributes.email;
          navigate(`/Form1?email=${encodeURIComponent(userEmail)}&role=${encodeURIComponent(userInfo.role || 'vendor')}`, { replace: true });
        } else if (userInfo.status === 'pending' && userInfo.hasFilledForm) {
          const userEmail = user.attributes.email;
          navigate(`/Auditorapprove?email=${encodeURIComponent(userEmail)}&role=${encodeURIComponent(userInfo.role || 'vendor')}`, { replace: true });
        } else {
          const userEmail = user.attributes.email;
          // If role is client, start client onboarding; else Form1
        if ((userInfo.role || '').toLowerCase() === 'client') {
          const authToken = localStorage.getItem('authToken');
          const clientBase = (import.meta?.env?.VITE_CLIENT_DASH || 'https://client.caasdiglobal.in');
            const qp = new URLSearchParams();
            if (authToken) qp.set('authToken', authToken);
            qp.set('email', userEmail);
            qp.set('role', 'client');
            window.location.href = `${clientBase}/?${qp.toString()}`;
          } else {
            navigate(`/Form1?email=${encodeURIComponent(userEmail)}&role=vendor`, { replace: true });
          }
        }
      } else {
        const userEmail = user.attributes.email;
        navigate(`/Form1?email=${encodeURIComponent(userEmail)}&role=vendor`, { replace: true });
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
            const vendorResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/vendor-by-email?email=${encodeURIComponent(email)}`);
            const vendorData = await vendorResponse.json();
            
            console.log("Login.jsx (VendorDashboard): Response from vendor-by-email endpoint (Google redirect):", vendorData);
            
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
                navigate(`/role-selection?email=${encodeURIComponent(email)}`, { replace: true });
                return;
              }
            } catch {}

            // Create a more complete user object with vendorId
            const userData = {
              vendorId: vendorId, // Add vendorId explicitly
              email: email, // Email is our primary identifier
              name: name,
            };
            
            // Store user data in localStorage for persistence
            localStorage.setItem('currentUser', JSON.stringify(userData));
    
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
          const response = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/user-status?email=${encodeURIComponent(email)}`);
          const data = await response.json();
          console.log("Login - User status response:", data);
  
          // If we have a 'from' location in state, redirect there after login
          if (from) {
            navigate(from.pathname, { replace: true });
            return;
          }
  
          if (data.success) {
            const userData = data.data;
            const currentStatus = userData.status;
            const hasFilledForm = userData.hasFilledForm;
            // If role not selected, force role-selection
            try {
              const verifyRes = await fetch(`${config.VENDOR_BACKEND_URL}/api/auth/verify`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
              });
              if (verifyRes.ok) {
                const verifyData = await verifyRes.json();
                if (verifyData && verifyData.roleSelected === false) {
                  navigate(`/role-selection?email=${encodeURIComponent(email)}`, { replace: true });
                  return;
                }
              }
            } catch {}
  
            if (currentStatus === 'approved') {
              // Use URL parameters instead of state
              navigate(`/VendorDashboard?email=${encodeURIComponent(email)}&role=${encodeURIComponent(userData.role || 'vendor')}`, { replace: true });
            } else if (currentStatus === 'rejected') {
              setAlertMessage("Your vendor application has been rejected. Please contact support.");
              setAlertType("error");
              setShowAlert(true);
              setTimeout(() => {
                navigate(`/Form1?email=${encodeURIComponent(email)}&role=${encodeURIComponent(userData.role || 'vendor')}`, { replace: true });
              }, 2000);
            } else if (currentStatus === 'pending' && hasFilledForm) {
              navigate(`/Auditorapprove?email=${encodeURIComponent(email)}&role=${encodeURIComponent(userData.role || 'vendor')}`, { replace: true });
            } else {
              if ((userData.role || '').toLowerCase() === 'client') {
                const authToken = localStorage.getItem('authToken');
                const clientBase = (import.meta?.env?.VITE_CLIENT_DASH ||'https://client.caasdiglobal.in');
                const qp = new URLSearchParams();
                if (authToken) qp.set('authToken', authToken);
                qp.set('email', email);
                qp.set('role', 'client');
                window.location.href = `${clientBase}/?${qp.toString()}`;
              } else {
                navigate(`/Form1?email=${encodeURIComponent(email)}&role=vendor`, { replace: true });
              }
            }
          } else {
            // fallback using URL param `status`
            if (status === 'approved') {
              // Use URL parameters instead of state
              navigate(`/VendorDashboard?email=${encodeURIComponent(email)}&role=vendor`, { replace: true });
            } else if (status === 'rejected') {
              alert("Your vendor application has been rejected. Please contact support.");
              navigate(`/Form1?email=${encodeURIComponent(email)}&role=vendor`, { replace: true });
            } else if (status === 'pending' && filledFormParam) { // Use filledFormParam here
              navigate(`/Auditorapprove?email=${encodeURIComponent(email)}&role=vendor`, { replace: true });
            } else {
              navigate(`/Form1?email=${encodeURIComponent(email)}&role=vendor`, { replace: true });
            }
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
          <h2 className="text-gray-900 text-2xl font-semibold mb-2">Hello User</h2>
          <p className="text-sm text-gray-600 mb-6">Enter your email and password to log in</p>

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
              <h2 className="text-gray-900 text-xl font-semibold mb-2">Forgot Password</h2>
              <p className="text-sm text-gray-600 mb-6">Enter your email to receive a reset code</p>
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

        {/* Right: Brand panel */}
        <div className="hidden md:flex flex-col items-center justify-center text-center text-white p-6">
          <div className="text-4xl font-extrabold mb-6">CG</div>
          <h3 className="text-xl font-semibold mb-2">Stay in Control</h3>
          <p className="text-gray-300/85 max-w-sm">
            Track progress, monitor performance, and ensure quality with our smart dashboards.
          </p>
          <div className="mt-6 h-1 w-24 bg-emerald-500/70 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default Login;