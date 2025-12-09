import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";

import { Amplify, Auth } from "aws-amplify";
import awsExports from "../aws-exports";
import { VendorContext } from "../context/VendorContext";
import Alert from "./ui/Alert";
import config from '../config/env';
import "../styles/SignUp.css";

Amplify.configure(awsExports);

/**
 * SignUp
 *
 * Handles vendor sign-up via AWS Cognito. Validates inputs, creates a Cognito user,
 * stages a temporary vendor-shaped profile (with generated vendorId) in localStorage
 * and context, then navigates to the verification screen. Also supports Google
 * sign-in by delegating to the backend OAuth endpoint.
 */
function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [existingUser, setExistingUser] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState("error");
  const [loading, setLoading] = useState(false); // New loading state
  const navigate = useNavigate();
  const { setUser: setContextUser } = useContext(VendorContext);

  // Basic email format validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password rules
  const validatePasswordRules = (password) => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasNumberAndSpecial: /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password),
    };
  };

  // Overall password validity (must satisfy all rules)
  const validatePassword = (password) => {
    const rules = validatePasswordRules(password);
    return rules.minLength && rules.hasUppercase && rules.hasNumberAndSpecial;
  };

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);

    if (existingUser) {
      setExistingUser(false);
    }
    
    // Clear alert when user starts typing
    if (showAlert) {
      setShowAlert(false);
    }
    
    if (!newEmail) {
      setEmailError("Email is required.");
    } else if (!validateEmail(newEmail)) {
      setEmailError("Please enter a valid email address.");
    } else {
      setEmailError("");
    }
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    // When main password changes, revalidate confirm password as well
    if (confirmPassword) {
      setConfirmPasswordError(
        newPassword === confirmPassword ? "" : "Passwords do not match."
      );
    }
    
    // Clear alert when user starts typing
    if (showAlert) {
      setShowAlert(false);
    }
    
    if (!newPassword) {
      setPasswordError("Password is required.");
    } else if (!validatePassword(newPassword)) {
      setPasswordError("Password does not meet the required criteria.");
    } else {
      setPasswordError("");
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);

    // Clear alert when user starts typing
    if (showAlert) {
      setShowAlert(false);
    }

    if (!value) {
      setConfirmPasswordError("Please re-enter your password.");
    } else if (value !== password) {
      setConfirmPasswordError("Passwords do not match.");
    } else {
      setConfirmPasswordError("");
    }
  };

  // Create Cognito user and stage minimal vendor profile for verification step
  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");
    setShowAlert(false);
    setLoading(true); // Set loading to true when signup attempt starts

    if (!email) {
      // Only set the alert message, not the inline error
      setAlertMessage("Email is required. Please enter a valid email address.");
      setAlertType("error");
      setShowAlert(true);
      return;
    }
    if (!validateEmail(email)) {
      // Only set the alert message, not the inline error
      setAlertMessage("Invalid email format. Please enter a valid email address with format: example@domain.com");
      setAlertType("error");
      setShowAlert(true);
      return;
    }
    if (!password) {
      // Only set the alert message, not the inline error
      setAlertMessage("Password is required. Please enter a password.");
      setAlertType("error");
      setShowAlert(true);
      return;
    }
    if (!validatePassword(password)) {
      // Only set the alert message, not the inline error
      setAlertMessage("Password must be at least 8 characters long for security reasons.");
      setAlertType("error");
      setShowAlert(true);
      return;
    }
    if (!confirmPassword || confirmPassword !== password) {
      setAlertMessage("Passwords do not match. Please re-enter the same password in both fields.");
      setAlertType("error");
      setShowAlert(true);
      setConfirmPasswordError("Passwords do not match.");
      return;
    }
    if (!termsAccepted) {
      setAlertMessage("Please accept the terms and conditions to continue.");
      setAlertType("warning");
      setShowAlert(true);
      return;
    }

    try {
      const signUpResponse = await Auth.signUp({
        username: email,
        password,
        attributes: { email },
      });
      console.log("Sign-up successful:", signUpResponse);
      
      //Create a temporary user object for context
      // Note: This user is not fully authenticated yet, but we store basic info
      // Use vendorId format instead of email as the ID
      const namePrefix = (email.split('@')[0].substring(0, 3) + 'XXX').substring(0, 3).toUpperCase();
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const dateStr = `${year}${month}${day}`;
      const randomSuffix = Math.floor(Math.random() * 900) + 100; // Random 3-digit number
      
      // Generate a vendorId in the same format as the backend
      const vendorId = `${namePrefix}-${dateStr}-${randomSuffix}`;
      
      const userData = {
        id: vendorId, // Use vendorId instead of email
        vendorId: vendorId, // Add vendorId explicitly
        email: email,
        name: email.split('@')[0], // Use part before @ as name
        pendingVerification: true
      };
      
      // Store user data in localStorage for persistence
      localStorage.setItem('currentUser', JSON.stringify(userData));
      
      // Update the context with the user data
      setContextUser(userData);
      
      // Store password temporarily for auto-login after verification
      // This will be removed after successful verification
      // Use a simple encryption to avoid storing plain text password
      const encryptedPassword = btoa(password); // Base64 encoding (not secure, but better than plaintext)
      localStorage.setItem(`temp_password_${email}`, encryptedPassword);
      
      // Navigate to verification page
      navigate("/verification", { state: { email } });

    } catch (error) {
      console.error("Error during sign-up:", error);
      if (error.code === "UsernameExistsException") {
        // Show an alert for existing user
        setAlertMessage("This email is already registered. Please login instead.");
        setAlertType("warning");
        setShowAlert(true);
        
        // Only set the flag that this is an existing user, don't show inline error
        setExistingUser(true);
        
        // We'll handle the redirect in the UI rather than with a timeout
      } else {
        // Only show the alert, not the inline error
        setAlertMessage(error.message || "An error occurred during sign-up. Please try again.");
        setAlertType("error");
        setShowAlert(true);
      }
    } finally {
      setLoading(false); // Set loading to false after signup attempt (success or failure)
    }
  };

  const handleGoogleSignIn = () => {
    // // const url = "https://us-east-1r522gnfpq.auth.us-east-1.amazoncognito.com/login?response_type=code&client_id=4k2rtnhvl9v22eakb5p6l8uj6k&redirect_uri=http://localhost:3000/callback";
    // // console.log("Redirecting to:", url);
    // // window.location.href = url;
    window.open(`${config.VENDOR_BACKEND_URL}/api/auth/google`, "_self");
  };

  const togglePasswordVisibility = () =>{
    setShowPassword(!showPassword);
  };

  const handleLoginRedirect = () => {
    console.log("Navigating to /login");
    navigate("/login", { replace: true });
  };

  const handleOpenTerms = () => {
    setShowTermsModal(true);
  };

  const handleCloseTerms = () => {
    setShowTermsModal(false);
  };

  const handleAcceptTerms = () => {
    setTermsAccepted(true);
    setShowTermsModal(false);
    if (showAlert) {
      setShowAlert(false);
    }
  };

  return (
    <div className="signup-page">
      {showAlert && (
        <div className="signup-alert">
          <Alert
            message={alertMessage}
            type={alertType}
            onClose={() => setShowAlert(false)}
          />
        </div>
      )}

      <div className="signup-content">
        <div className="signup-card">
          <div className="signup-card-header">
            <span className="signup-dot" aria-hidden="true" />
            <h1 className="signup-title">Hello User</h1>
            <p className="signup-subtitle">Are you ready to take next step towards success?</p>
          </div>

          <form className="signup-form" onSubmit={handleSubmit}>
            <label className="signup-field">
              <span className="signup-field-label">Email</span>
              <div className="signup-field-control">
                <input
                  type="email"
                  placeholder="Enter your mail id"
                  value={email}
                  onChange={handleEmailChange}
                  required
                  className={emailError ? 'has-error' : ''}
                />
                {emailError && <span className="signup-field-error" role="alert">{emailError}</span>}
              </div>
            </label>

            <label className="signup-field">
              <span className="signup-field-label">Password</span>
              <div className="signup-field-control">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={passwordError ? 'has-error' : ''}
                />
                <button
                  type="button"
                  className="signup-toggle-password"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
                {passwordError && <span className="signup-field-error" role="alert">{passwordError}</span>}
              </div>
            </label>

            {/* Password rules (shown only when user starts typing) */}
            {password && (
              <div className="signup-password-rules">
                {(() => {
                  const rules = validatePasswordRules(password);
                  const RuleItem = ({ ok, label }) => (
                    <div className="signup-password-rule">
                      <span className={ok ? "rule-icon ok" : "rule-icon"}>
                        {ok ? "✔" : "•"}
                      </span>
                      <span className={ok ? "rule-text ok" : "rule-text"}>{label}</span>
                    </div>
                  );
                  return (
                    <>
                      <RuleItem ok={rules.hasUppercase} label="One capital letter" />
                      <RuleItem ok={rules.hasNumberAndSpecial} label="One number and one special character" />
                      <RuleItem ok={rules.minLength} label="Minimum 8 characters" />
                    </>
                  );
                })()}
              </div>
            )}

            <label className="signup-field">
              <span className="signup-field-label">Confirm Password</span>
              <div className="signup-field-control">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  required
                  className={confirmPasswordError ? 'has-error' : ''}
                />
                <button
                  type="button"
                  className="signup-toggle-password"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
                {confirmPasswordError && (
                  <span className="signup-field-error" role="alert">
                    {confirmPasswordError}
                  </span>
                )}
              </div>
            </label>

            <label className="signup-terms">
              <input
                type="checkbox"
                checked={termsAccepted}
                readOnly
                onClick={() => {
                  // Force users to read and accept via the modal
                  if (!termsAccepted) {
                    handleOpenTerms();
                  }
                }}
              />
              <span>
                I understand and agree to Caasdi Global{' '}
                <button
                  type="button"
                  className="signup-link"
                  onClick={handleOpenTerms}
                >
                  Terms and Condition
                </button>
              </span>
            </label>

            <button
              type="submit"
              className="signup-primary-button"
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          {showTermsModal && (
            <div className="signup-modal-backdrop" role="dialog" aria-modal="true">
              <div className="signup-modal">
                <h2 className="signup-modal-title">Terms &amp; Conditions – Caasdi Global</h2>
                <p className="signup-modal-meta">Last Updated: 1 December 2025</p>
                <div className="signup-modal-body">
                  <p className="signup-modal-text">
                    Welcome to Caasdi Global. These Terms &amp; Conditions (&quot;Terms&quot;) govern your
                    access to and use of our platforms, including our Vendor Management Portal,
                    CRM system, AI-powered business services, and all related software, websites,
                    and mobile applications (&quot;Services&quot;). By accessing or using our Services, you
                    agree to be bound by these Terms. If you do not agree, do not use our Services.
                  </p>

                  <h3 className="signup-modal-section-title">1. Definitions</h3>
                  <p className="signup-modal-text">
                    &quot;Company&quot;, &quot;We&quot;, &quot;Us&quot;, &quot;Caasdi Global&quot; refers to Caasdi Global Technologies
                    and its authorized subsidiaries. &quot;User&quot;, &quot;You&quot; refers to any individual, vendor,
                    client, auditor, or business entity using our Services. &quot;Platform&quot; refers to all
                    digital products owned and operated by Caasdi Global, including the CRM,
                    Vendor Portal, AI systems, and mobile/web apps. &quot;Content&quot; means any data,
                    document, message, form, invoice, quotation, file, or media uploaded or
                    generated through the Platform.
                  </p>

                  <h3 className="signup-modal-section-title">2. Eligibility</h3>
                  <p className="signup-modal-text">
                    You must be at least 18 years old, legally capable of entering into contracts,
                    and using the Services for lawful business purposes. If you create an account
                    on behalf of a company, you represent that you have authority to bind that
                    company to these Terms.
                  </p>

                  <h3 className="signup-modal-section-title">3. Account Registration &amp; Security</h3>
                  <p className="signup-modal-text">
                    When creating an account, you must provide accurate, truthful information.
                    You are responsible for maintaining the confidentiality of your credentials and
                    agree to immediately notify us of any unauthorized access. Caasdi Global is
                    not liable for any loss caused due to the misuse of your account.
                  </p>

                  <h3 className="signup-modal-section-title">4. Use of Services</h3>
                  <p className="signup-modal-text">
                    You agree not to misuse or attempt to hack, reverse engineer, or disrupt the
                    Platform; upload malicious files, harmful code, or illegal content; impersonate
                    any person or organization; use the AI systems for generating harmful,
                    unethical, or misleading content; or violate any applicable law or regulation.
                    We reserve the right to suspend or terminate accounts engaged in prohibited
                    activities.
                  </p>

                  <h3 className="signup-modal-section-title">5. Vendor &amp; Client Responsibilities</h3>
                  <p className="signup-modal-text">
                    <strong>Vendors:</strong> Must provide accurate business, pricing, qualification, and
                    compliance details; agree that all information submitted may be verified by
                    Caasdi Global or clients; and are responsible for delivery, quality, pricing, and
                    contractual agreements with clients.
                  </p>
                  <p className="signup-modal-text">
                    <strong>Clients:</strong> Must review vendor information independently before entering
                    into contracts and are solely responsible for the decisions made using the
                    Platform&apos;s recommendations. Caasdi Global does not guarantee vendor
                    performance, pricing, quality, or delivery timelines.
                  </p>

                  <h3 className="signup-modal-section-title">6. AI-Generated Recommendations</h3>
                  <p className="signup-modal-text">
                    Our platform uses AI to analyze business needs, suggest vendors, generate setup
                    plans, assist with document understanding, and process invoices, drawings, and
                    layouts. You acknowledge that AI outputs may not always be accurate and that all
                    decisions based on AI recommendations must be independently verified. Caasdi
                    Global is not responsible for business losses arising from reliance on AI outputs.
                  </p>

                  <h3 className="signup-modal-section-title">
                    7. Document Processing &amp; OCR-Free Extraction
                  </h3>
                  <p className="signup-modal-text">
                    By uploading any invoice, drawing, layout, or document, you confirm that you own
                    the rights to use and process it and allow Caasdi Global to analyze the document
                    using AI for extraction, vendor detection, and layout processing. You retain
                    ownership of your documents; we only process them to deliver services.
                  </p>

                  <h3 className="signup-modal-section-title">8. Data Privacy &amp; Security</h3>
                  <p className="signup-modal-text">
                    Caasdi Global follows industry best practices, including encryption, role-based
                    access, and secure infrastructure. We may collect and use data in accordance
                    with our Privacy Policy. We will never sell your data to third parties or use your
                    personal data for advertising without your consent.
                  </p>

                  <h3 className="signup-modal-section-title">9. Payments &amp; Subscription</h3>
                  <p className="signup-modal-text">
                    Some Services may require paid subscriptions. Fees once paid are
                    non-refundable unless otherwise stated. Caasdi Global may suspend services for
                    non-payment. Pricing may change; users will be notified in advance.
                  </p>

                  <h3 className="signup-modal-section-title">10. Intellectual Property</h3>
                  <p className="signup-modal-text">
                    All software, AI models, UI/UX designs, documentation, features, modules, and
                    content provided by Caasdi Global are protected intellectual property. You may
                    not copy, resell, modify, or redistribute any part of the Platform without written
                    permission.
                  </p>

                  <h3 className="signup-modal-section-title">11. Limitation of Liability</h3>
                  <p className="signup-modal-text">
                    To the maximum extent permitted by law, Caasdi Global is not liable for business
                    losses, missed opportunities, delays, errors in vendor data or AI recommendations,
                    downtime, maintenance, system issues, loss of documents caused by incorrect
                    user uploads, or actions of vendors or clients using the Platform. Our total
                    liability will not exceed the amount paid by you (if any) in the last 12 months.
                  </p>

                  <h3 className="signup-modal-section-title">12. Termination</h3>
                  <p className="signup-modal-text">
                    We may suspend or terminate access if you violate these Terms, fraudulent or
                    unauthorized activity is detected, or if required by law or regulatory authority.
                    You may also deactivate your account at any time by contacting support.
                  </p>

                  <h3 className="signup-modal-section-title">13. Updates to Terms</h3>
                  <p className="signup-modal-text">
                    We may update these Terms periodically. Continued use of the Platform after
                    updates constitutes acceptance of the modified Terms.
                  </p>

                  <h3 className="signup-modal-section-title">14. Governing Law</h3>
                  <p className="signup-modal-text">
                    These Terms are governed by the laws of India, and disputes will be subject to
                    the exclusive jurisdiction of courts in Karnataka, India.
                  </p>

                  <h3 className="signup-modal-section-title">15. Contact Information</h3>
                  <p className="signup-modal-text">
                    For support or legal queries, contact: Caasdi Global Technologies, Email:
                    support@caasdiglobal.in, Website: www.caasdiglobal.in
                  </p>
                </div>

                <div className="signup-modal-actions">
                  <button
                    type="button"
                    className="signup-modal-button-secondary"
                    onClick={handleCloseTerms}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="signup-modal-button-primary"
                    onClick={handleAcceptTerms}
                  >
                    Accept
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* <div className="signup-divider">
            <span />
            <span>or</span>
            <span />
          </div>

          <button
            type="button"
            className="signup-google-button"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <img
              src="https://static.codia.ai/image/2025-03-27/fdbd1c0e-18aa-467a-b69c-d9b0d4d35d40.svg"
              alt="Google"
            />
            <span>Sign in with Google</span>
          </button> */}

          <p className="signup-login-text">
            Already have an account?{' '}
            <button type="button" className="signup-link" onClick={handleLoginRedirect}>
              Login
            </button>
          </p>
        </div>

        <div className="signup-info">
          <span className="signup-brand">CG</span>
          <h2 className="signup-info-title">Stay in Control</h2>
          <p className="signup-info-text">
            Track progress, monitor performance, and ensure quality with our smart dashboards.
          </p>
          <div className="signup-progress" aria-hidden="true">
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUp;