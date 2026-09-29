// ============================================================
// FILE: components/SignUp.jsx
// PURPOSE: The live vendor sign-up screen — AWS Cognito registration, inline
//          email / password / confirm-password validation, the terms-acceptance
//          modal, and the hand-off to the verification step. This file now renders
//          ONLY the form content: the shared split shell and the black brand panel
//          are owned by components/auth/AuthSplitLayout.jsx, which nests /signup
//          under it and renders <Outlet />. The rotating carousel (and its
//          `setInterval`) was removed from this page when the layout took over the
//          panel. The form still rises in a stagger (`.auth-rise`, main.css:81)
//          with inline `animationDelay`.
// CONNECTS TO: components/auth/AuthSplitLayout.jsx (owns the split shell + brand panel),
//              components/auth/AuthModeSwitch.jsx, components/auth/auth-primitives.jsx,
//              components/ui/Alert.jsx, context/VendorContext.jsx, config/env.js,
//              main.css (.auth-rise/.auth-fade/.brand-press),
//              tailwind.config.js (canvas/surface/ink/dim/line/cta + ease-signal/duration-*).
// ============================================================

import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";

import { Auth } from "aws-amplify";
import { VendorContext } from "../context/VendorContext";
import Alert from "./ui/Alert";
import config from '../config/env';
import AuthModeSwitch from "./auth/AuthModeSwitch";
import { BrandMark, MonoEyebrow, Field, PasswordField, PrimaryButton, TextLink, CheckboxRow } from "./auth/auth-primitives";

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
      
      // Update the context with the user data
      setContextUser(userData);
      
      // Store password temporarily for auto-login after verification
      // This will be removed after successful verification
      // Use a simple encryption to avoid storing plain text password
      const encryptedPassword = btoa(password); // Base64 encoding (not secure, but better than plaintext)
      sessionStorage.setItem(`temp_password_${email}`, encryptedPassword);
      
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
    // // const url = "https://ap-south-1r522gnfpq.auth.ap-south-1.amazoncognito.com/login?response_type=code&client_id=4k2rtnhvl9v22eakb5p6l8uj6k&redirect_uri=http://localhost:3000/callback";
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
    <>
      {/* card header: brand mark + current mode label — the intro block */}
      <div className="auth-rise flex items-center justify-between gap-4">
        <BrandMark className="h-6" />
        <MonoEyebrow>Create account</MonoEyebrow>
      </div>

      {/* the segmented switch navigates to /login via the existing handler.
          `.auth-rise` lives on this wrapper, never on a `.brand-press` element. */}
      <div className="auth-rise mt-7" style={{ animationDelay: '90ms' }}>
        <AuthModeSwitch
          active="signup"
          onSelect={(m) => {
            if (m === "login") handleLoginRedirect();
          }}
          className="w-full"
        />
      </div>

      {showAlert && (
        <div className="mt-4">
          <Alert message={alertMessage} type={alertType} onClose={() => setShowAlert(false)} />
        </div>
      )}

      <h1 className="auth-rise mt-3 text-2xl font-semibold tracking-tight text-ink">Hello User</h1>
      <p className="auth-rise mt-1.5 text-sm text-dim">Are you ready to take next step towards success?</p>

      <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
        <div className="auth-rise" style={{ animationDelay: '150ms' }}>
          <Field
            id="signup-email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="Enter your mail id"
            value={email}
            onChange={handleEmailChange}
            error={emailError}
            required
          />
        </div>

        <div className="auth-rise" style={{ animationDelay: '210ms' }}>
          <PasswordField
            id="signup-password"
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            show={showPassword}
            onToggle={togglePasswordVisibility}
            autoComplete="new-password"
            error={passwordError}
            required
          />
        </div>

        {/* Password rules (shown only when user starts typing) */}
        {password && (
          <ul className="auth-rise flex flex-wrap gap-x-4 gap-y-1">
            {(() => {
              const rules = validatePasswordRules(password);
              const RuleItem = ({ ok, label }) => (
                <li className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full transition-colors ${ok ? 'bg-success' : 'bg-line'}`} />
                  <span className={`text-xs font-medium ${ok ? 'text-ink' : 'text-dim'}`}>{label}</span>
                </li>
              );
              return (
                <>
                  <RuleItem ok={rules.hasUppercase} label="One capital letter" />
                  <RuleItem ok={rules.hasNumberAndSpecial} label="One number and one special character" />
                  <RuleItem ok={rules.minLength} label="Minimum 8 characters" />
                </>
              );
            })()}
          </ul>
        )}

        <div className="auth-rise" style={{ animationDelay: '270ms' }}>
          <PasswordField
            id="signup-confirm"
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            show={showPassword}
            onToggle={togglePasswordVisibility}
            autoComplete="new-password"
            error={confirmPasswordError}
            required
          />
        </div>

        {/* checkbox stays readOnly + opens the modal, exactly as before —
            users must accept via the Terms dialog */}
        <div className="auth-rise" style={{ animationDelay: '310ms' }}>
          <CheckboxRow
            checked={termsAccepted}
            onToggle={() => {
              if (!termsAccepted) {
                handleOpenTerms();
              }
            }}
          >
            I understand and agree to Caasdi Global{' '}
            <TextLink className="text-xs" onClick={handleOpenTerms}>
              Terms and Condition
            </TextLink>
          </CheckboxRow>
        </div>

        {/* `.brand-press` on the button, `.auth-rise` on the wrapper — the entrance's
            `animation-fill-mode: both` final transform would otherwise kill the press. */}
        <div className="auth-rise" style={{ animationDelay: '350ms' }}>
          <PrimaryButton type="submit" loading={loading} className="brand-press w-full duration-180 ease-signal">
            {loading ? "Creating Account..." : "Create Account"}
          </PrimaryButton>
        </div>
      </form>

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

      <p className="auth-rise mt-4 text-center text-sm text-dim" style={{ animationDelay: '390ms' }}>
        Already have an account?{' '}
        <TextLink onClick={handleLoginRedirect}>Login</TextLink>
      </p>

      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-surface px-6 py-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-ink">Terms &amp; Conditions – Caasdi Global</h2>
            <p className="mt-0.5 text-xs text-dim">Last Updated: 1 December 2025</p>
            <div className="mt-3 flex-1 overflow-y-auto pr-2">
              <p className="mt-2 text-sm leading-6 text-dim">
                Welcome to Caasdi Global. These Terms &amp; Conditions (&quot;Terms&quot;) govern your
                access to and use of our platforms, including our Vendor Management Portal,
                CRM system, AI-powered business services, and all related software, websites,
                and mobile applications (&quot;Services&quot;). By accessing or using our Services, you
                agree to be bound by these Terms. If you do not agree, do not use our Services.
              </p>

              <h3 className="mt-4 text-sm font-semibold text-ink">1. Definitions</h3>
              <p className="mt-2 text-sm leading-6 text-dim">
                &quot;Company&quot;, &quot;We&quot;, &quot;Us&quot;, &quot;Caasdi Global&quot; refers to Caasdi Global Technologies
                and its authorized subsidiaries. &quot;User&quot;, &quot;You&quot; refers to any individual, vendor,
                client, auditor, or business entity using our Services. &quot;Platform&quot; refers to all
                digital products owned and operated by Caasdi Global, including the CRM,
                Vendor Portal, AI systems, and mobile/web apps. &quot;Content&quot; means any data,
                document, message, form, invoice, quotation, file, or media uploaded or
                generated through the Platform.
              </p>

              <h3 className="mt-4 text-sm font-semibold text-ink">2. Eligibility</h3>
              <p className="mt-2 text-sm leading-6 text-dim">
                You must be at least 18 years old, legally capable of entering into contracts,
                and using the Services for lawful business purposes. If you create an account
                on behalf of a company, you represent that you have authority to bind that
                company to these Terms.
              </p>

              <h3 className="mt-4 text-sm font-semibold text-ink">3. Account Registration &amp; Security</h3>
              <p className="mt-2 text-sm leading-6 text-dim">
                When creating an account, you must provide accurate, truthful information.
                You are responsible for maintaining the confidentiality of your credentials and
                agree to immediately notify us of any unauthorized access. Caasdi Global is
                not liable for any loss caused due to the misuse of your account.
              </p>

              <h3 className="mt-4 text-sm font-semibold text-ink">4. Use of Services</h3>
              <p className="mt-2 text-sm leading-6 text-dim">
                You agree not to misuse or attempt to hack, reverse engineer, or disrupt the
                Platform; upload malicious files, harmful code, or illegal content; impersonate
                any person or organization; use the AI systems for generating harmful,
                unethical, or misleading content; or violate any applicable law or regulation.
                We reserve the right to suspend or terminate accounts engaged in prohibited
                activities.
              </p>

              <h3 className="mt-4 text-sm font-semibold text-ink">5. Vendor &amp; Client Responsibilities</h3>
              <p className="mt-2 text-sm leading-6 text-dim">
                <strong>Vendors:</strong> Must provide accurate business, pricing, qualification, and
                compliance details; agree that all information submitted may be verified by
                Caasdi Global or clients; and are responsible for delivery, quality, pricing, and
                contractual agreements with clients.
              </p>
              <p className="mt-2 text-sm leading-6 text-dim">
                <strong>Clients:</strong> Must review vendor information independently before entering
                into contracts and are solely responsible for the decisions made using the
                Platform&apos;s recommendations. Caasdi Global does not guarantee vendor
                performance, pricing, quality, or delivery timelines.
              </p>

              <h3 className="mt-4 text-sm font-semibold text-ink">6. AI-Generated Recommendations</h3>
              <p className="mt-2 text-sm leading-6 text-dim">
                Our platform uses AI to analyze business needs, suggest vendors, generate setup
                plans, assist with document understanding, and process invoices, drawings, and
                layouts. You acknowledge that AI outputs may not always be accurate and that all
                decisions based on AI recommendations must be independently verified. Caasdi
                Global is not responsible for business losses arising from reliance on AI outputs.
              </p>

              <h3 className="mt-4 text-sm font-semibold text-ink">
                7. Document Processing &amp; OCR-Free Extraction
              </h3>
              <p className="mt-2 text-sm leading-6 text-dim">
                By uploading any invoice, drawing, layout, or document, you confirm that you own
                the rights to use and process it and allow Caasdi Global to analyze the document
                using AI for extraction, vendor detection, and layout processing. You retain
                ownership of your documents; we only process them to deliver services.
              </p>

              <h3 className="mt-4 text-sm font-semibold text-ink">8. Data Privacy &amp; Security</h3>
              <p className="mt-2 text-sm leading-6 text-dim">
                Caasdi Global follows industry best practices, including encryption, role-based
                access, and secure infrastructure. We may collect and use data in accordance
                with our Privacy Policy. We will never sell your data to third parties or use your
                personal data for advertising without your consent.
              </p>

              <h3 className="mt-4 text-sm font-semibold text-ink">9. Payments &amp; Subscription</h3>
              <p className="mt-2 text-sm leading-6 text-dim">
                Some Services may require paid subscriptions. Fees once paid are
                non-refundable unless otherwise stated. Caasdi Global may suspend services for
                non-payment. Pricing may change; users will be notified in advance.
              </p>

              <h3 className="mt-4 text-sm font-semibold text-ink">10. Intellectual Property</h3>
              <p className="mt-2 text-sm leading-6 text-dim">
                All software, AI models, UI/UX designs, documentation, features, modules, and
                content provided by Caasdi Global are protected intellectual property. You may
                not copy, resell, modify, or redistribute any part of the Platform without written
                permission.
              </p>

              <h3 className="mt-4 text-sm font-semibold text-ink">11. Limitation of Liability</h3>
              <p className="mt-2 text-sm leading-6 text-dim">
                To the maximum extent permitted by law, Caasdi Global is not liable for business
                losses, missed opportunities, delays, errors in vendor data or AI recommendations,
                downtime, maintenance, system issues, loss of documents caused by incorrect
                user uploads, or actions of vendors or clients using the Platform. Our total
                liability will not exceed the amount paid by you (if any) in the last 12 months.
              </p>

              <h3 className="mt-4 text-sm font-semibold text-ink">12. Termination</h3>
              <p className="mt-2 text-sm leading-6 text-dim">
                We may suspend or terminate access if you violate these Terms, fraudulent or
                unauthorized activity is detected, or if required by law or regulatory authority.
                You may also deactivate your account at any time by contacting support.
              </p>

              <h3 className="mt-4 text-sm font-semibold text-ink">13. Updates to Terms</h3>
              <p className="mt-2 text-sm leading-6 text-dim">
                We may update these Terms periodically. Continued use of the Platform after
                updates constitutes acceptance of the modified Terms.
              </p>

              <h3 className="mt-4 text-sm font-semibold text-ink">14. Governing Law</h3>
              <p className="mt-2 text-sm leading-6 text-dim">
                These Terms are governed by the laws of India, and disputes will be subject to
                the exclusive jurisdiction of courts in Karnataka, India.
              </p>

              <h3 className="mt-4 text-sm font-semibold text-ink">15. Contact Information</h3>
              <p className="mt-2 text-sm leading-6 text-dim">
                For support or legal queries, contact: Caasdi Global Technologies, Email:
                support@caasdiglobal.in, Website: www.caasdiglobal.in
              </p>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                className="h-10 rounded-xl border border-line px-5 text-sm font-medium text-ink transition-colors hover:bg-surface-hover"
                onClick={handleCloseTerms}
              >
                Close
              </button>
              <button
                type="button"
                className="h-10 rounded-xl bg-cta px-5 text-sm font-medium text-cta-foreground transition-opacity hover:opacity-90"
                onClick={handleAcceptTerms}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default SignUp;
