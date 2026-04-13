import { useState, useEffect, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";
import QRCode from "qrcode";
import { VendorContext } from "../../context/VendorContext";
import config from "../../config/env";
import authFetch from "../../utils/authFetch";
import {
  Settings, User, Lock, Bell, Mail, Shield, ChevronLeft, ChevronRight,
  Eye, EyeOff, Check, X, Building2, Phone, MapPin, Globe, Camera,
  Megaphone, Newspaper, Package, TrendingUp, AlertCircle, Loader2,
  LogOut, Trash2, KeyRound, Smartphone
} from "lucide-react";

/* ─── Toggle Switch ──────────────────────────────────── */
const Toggle = ({ enabled, onChange, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
      enabled ? "bg-emerald-600" : "bg-gray-300"
    } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
        enabled ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
);

/* ─── Password Input ─────────────────────────────────── */
const PasswordField = ({ label, value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

/* ─── Section Header ─────────────────────────────────── */
const SectionCard = ({ icon: Icon, title, description, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="px-6 py-5 border-b border-gray-100">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
          <Icon className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

/* ─── Notification Row ───────────────────────────────── */
const NotifRow = ({ icon: Icon, color, title, desc, enabled, onChange, disabled }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center mt-0.5`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
    </div>
    <Toggle enabled={enabled} onChange={onChange} disabled={disabled} />
  </div>
);

/* ════════════════════════════════════════════════════════
   MAIN SETTINGS PAGE
   ════════════════════════════════════════════════════════ */
export default function VendorSettings() {
  const navigate = useNavigate();
  const { currentUser, vendorData, setVendorData, hydrateCurrentUser, logout } = useContext(VendorContext);

  /* ── State ────────────────────────────────────── */
  const [activeSection, setActiveSection] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Profile
  const [profile, setProfile] = useState({
    name: "", email: "", phone: "", companyName: "", state: "", country: "", gstin: "",
  });
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);

  // Password
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");

  // Notifications / Email Preferences
  const [emailPrefs, setEmailPrefs] = useState({
    orderNotifications: true,
    promotions: true,
    newsletter: true,
    updates: true,
    leadAlerts: true,
    quotationAlerts: true,
    systemAlerts: true,
  });
  const [smsPrefs, setSmsPrefs] = useState({
    orderAlerts: false,
    leadAlerts: false,
    securityAlerts: true,
  });

  // Security
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [totpSecret, setTotpSecret] = useState(null);
  const [totpUri, setTotpUri] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [totpCode, setTotpCode] = useState("");
  const [totpVerified, setTotpVerified] = useState(false);
  const [backupCodes, setBackupCodes] = useState([]);
  const [mfaError, setMfaError] = useState("");
  const [mfaSuccess, setMfaSuccess] = useState("");
  const [showTestCode, setShowTestCode] = useState(false);
  const [testCodeData, setTestCodeData] = useState(null);
  const [testCodeLoading, setTestCodeLoading] = useState(false);

  /* ── Sidebar nav items ────────────────────────── */
  const navItems = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Login & Security", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy & Data", icon: Shield },
  ];

  /* ── Toast helper ─────────────────────────────── */
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Load data ────────────────────────────────── */
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch vendor record directly from /me for the freshest data
      let vd = vendorData?.vendorDetails || {};
      let cd = vendorData?.companyDetails || {};
      let imgUrl = vendorData?.profileImage?.url || null;

      try {
        const meRes = await authFetch(`${config.VENDOR_BACKEND_URL}/api/vendor/me`, { credentials: "include" });
        if (meRes.ok) {
          const meData = await meRes.json();
          const v = meData?.data || meData?.vendor || {};
          vd = v.vendorDetails || vd;
          cd = v.companyDetails || cd;
          imgUrl = v.profileImage?.url || imgUrl;
          
          // Load MFA status from vendor data
          setMfaEnabled(v.totpEnabled === true);
        }
      } catch { /* fall back to context data */ }

      setProfile({
        name: vd.primaryContactName || vd.firstName || currentUser?.name || "",
        email: vd.primaryContactEmail || currentUser?.email || "",
        phone: vd.phoneNumber || "",
        companyName: cd.companyName || vd.companyName || "",
        state: cd.state || "",
        country: cd.country || "",
        gstin: cd.gstNumber || "",
      });
      console.log('[VendorSettings] Loaded profile:', {
        primaryContactName: vd.primaryContactName,
        firstName: vd.firstName,
        email: vd.primaryContactEmail,
        phone: vd.phoneNumber,
      });
      setProfileImagePreview(imgUrl);

      // Load preferences from backend
      try {
        const res = await authFetch(`${config.VENDOR_BACKEND_URL}/api/vendor/preferences`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.emailPreferences) {
            setEmailPrefs(prev => ({ ...prev, ...data.emailPreferences }));
          }
          if (data.smsPreferences) {
            setSmsPrefs(prev => ({ ...prev, ...data.smsPreferences }));
          }
        }
      } catch { /* defaults are fine */ }
    } catch (err) {
      console.error("[Settings] Load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [vendorData, currentUser]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  /* ── Load MFA status from vendorData ────────── */
  useEffect(() => {
    if (vendorData?.totpEnabled === true) {
      setMfaEnabled(true);
    }
  }, [vendorData]);

  /* ── Save profile ─────────────────────────────── */
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("vendorDetails", JSON.stringify({
        primaryContactName: profile.name,
        primaryContactEmail: profile.email,
        phoneNumber: profile.phone,
        companyName: profile.companyName,
      }));
      formData.append("companyDetails", JSON.stringify({
        companyName: profile.companyName,
        state: profile.state,
        country: profile.country,
        gstNumber: profile.gstin,
      }));
      if (profileImage) formData.append("profileImage", profileImage);

      const res = await authFetch(`${config.VENDOR_BACKEND_URL}/api/vendor/update-profile`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Update failed");

      const resData = await res.json();

      // Update profileImage in vendorData context so Header reflects it immediately
      if (resData?.data?.profileImage) {
        setVendorData(prev => ({ ...prev, profileImage: resData.data.profileImage }));
        setProfileImagePreview(resData.data.profileImage.url);
      }

      // Update vendorData context with saved profile fields so Header stays in sync
      setVendorData(prev => ({
        ...prev,
        vendorDetails: { ...prev.vendorDetails, primaryContactName: profile.name, primaryContactEmail: profile.email, phoneNumber: profile.phone, companyName: profile.companyName },
        companyDetails: { ...prev.companyDetails, companyName: profile.companyName, state: profile.state, country: profile.country, gstNumber: profile.gstin },
      }));

      showToast("Profile updated successfully");
    } catch (err) {
      showToast(err.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Change password (AWS Cognito) ────────────– */
  const handleChangePassword = async () => {
    setPwdError("");
    setPwdSuccess("");
    
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      setPwdError("All fields are required");
      return;
    }
    
    if (passwords.new.length < 8) {
      setPwdError("New password must be at least 8 characters");
      return;
    }
    
    if (passwords.new !== passwords.confirm) {
      setPwdError("New passwords do not match");
      return;
    }
    
    if (!/[A-Z]/.test(passwords.new)) {
      setPwdError("Password must contain at least one uppercase letter");
      return;
    }
    
    if (!/[a-z]/.test(passwords.new)) {
      setPwdError("Password must contain at least one lowercase letter");
      return;
    }
    
    if (!/[0-9]/.test(passwords.new)) {
      setPwdError("Password must contain at least one number");
      return;
    }
    
    if (!/[^A-Za-z0-9]/.test(passwords.new)) {
      setPwdError("Password must contain at least one special character");
      return;
    }
    
    setSaving(true);
    try {
      const user = await Auth.currentAuthenticatedUser();
      
      // Use AWS Cognito to change password
      await Auth.changePassword(user, passwords.current, passwords.new);
      
      setPwdSuccess("Password changed successfully!");
      setPasswords({ current: "", new: "", confirm: "" });
      showToast("Password changed successfully!");
    } catch (err) {
      console.error("Error changing password:", err);
      
      // Map Cognito error messages to user-friendly messages
      if (err.code === "NotAuthorizedException") {
        setPwdError("Current password is incorrect");
      } else if (err.code === "InvalidPasswordException") {
        setPwdError("The password did not conform to policy. It must be at least 8 characters and contain uppercase, lowercase, number, and special character.");
      } else if (err.code === "UserNotFoundException") {
        setPwdError("User not found");
      } else if (err.code === "LimitExceededException") {
        setPwdError("Too many attempts. Please try again later.");
      } else {
        setPwdError(err.message || "Failed to change password");
      }
    } finally {
      setSaving(false);
    }
  };

  /* ── Save notification preferences ────────────── */
  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      const res = await authFetch(`${config.VENDOR_BACKEND_URL}/api/vendor/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailPreferences: emailPrefs, smsPreferences: smsPrefs }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Save failed");
      showToast("Notification preferences saved");
    } catch (err) {
      showToast(err.message || "Failed to save preferences", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Handle profile image ─────────────────────── */
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProfileImage(file);
    setProfileImagePreview(URL.createObjectURL(file));
  };

  /* ── Logout ───────────────────────────────────── */
  const handleLogout = async () => {
    const confirmed = window.confirm(
      'Sign out from all devices?\n\n' +
      'This will log you out from all active sessions. ' +
      'You will need to log in again on all devices.'
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      
      // Call the global sign out endpoint
      const res = await authFetch(`${config.VENDOR_BACKEND_URL}/api/auth/logout/all-devices`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!res.ok) {
        console.error('Global sign out failed:', res.status);
      }

      // Regardless of backend response, log out locally
      await logout();
      navigate("/login");
    } catch (err) {
      console.error('Error during logout:', err);
      // Still log out locally even if global sign out fails
      await logout();
      navigate("/login");
    } finally {
      setSaving(false);
    }
  };

  /* ── Setup TOTP - Call backend to generate secret ──────── */
  const handleSetupTOTP = async () => {
    setMfaError("");
    setMfaSuccess("");
    setSaving(true);
    try {
      const res = await authFetch(`${config.VENDOR_BACKEND_URL}/api/vendor/mfa/setup`, {
        method: "POST",
        credentials: "include"
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to setup TOTP");
      }

      const data = await res.json();
      const qrData = data.data;

      // Generate QR code image
      const qrDataUrl = await QRCode.toDataURL(qrData.qrCode);

      setTotpSecret(qrData.secret);
      setTotpUri(qrData.qrCode);
      setQrCodeUrl(qrDataUrl);
      setBackupCodes([]);  // Reset backup codes - will be set on verification
      setTotpCode("");
      setTotpVerified(false);  // Reset verification state
      setShowMfaSetup(true);
    } catch (err) {
      console.error("Error setting up TOTP:", err);
      setMfaError(err.message || "Failed to setup TOTP");
    } finally {
      setSaving(false);
    }
  };

  /* ── Test TOTP code - fetch expected code for current secret ────────────── */
  const handleTestCode = async () => {
    if (!totpSecret) {
      setMfaError("TOTP secret is not available");
      return;
    }

    setTestCodeLoading(true);
    try {
      const res = await authFetch(`${config.VENDOR_BACKEND_URL}/api/vendor/mfa/test-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totpSecret: totpSecret.trim() }),
        credentials: "include"
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to generate test code");
      }

      const data = await res.json();
      setTestCodeData(data.data);
      setShowTestCode(true);
    } catch (err) {
      console.error("Error fetching test code:", err);
      setMfaError("Failed to generate test code: " + (err.message || "Unknown error"));
    } finally {
      setTestCodeLoading(false);
    }
  };

  /* ── Verify TOTP code and enable MFA ────────────────── */
  const handleVerifyTOTP = async () => {
    setMfaError("");
    const trimmedCode = totpCode.trim();
    
    // More aggressive cleaning: remove ALL non-ASCII-digit characters
    // This handles Unicode digits, spaces, dashes, etc.
    let cleanedCode = "";
    for (let i = 0; i < trimmedCode.length; i++) {
      const char = trimmedCode[i];
      const code = char.charCodeAt(0);
      // Only keep ASCII digits 0-9 (codes 48-57)
      if (code >= 48 && code <= 57) {
        cleanedCode += char;
      }
    }
    
    if (!cleanedCode || cleanedCode.length !== 6) {
      setMfaError("Please enter exactly 6 digits from your authenticator app");
      return;
    }

    setSaving(true);
    
    // Log details for debugging
    console.log('=== TOTP Verification Debug ===');
    console.log('Secret (to be sent):', totpSecret);
    console.log('Secret length:', totpSecret?.length);
    console.log('Code (to be sent):', cleanedCode);
    console.log('Timestamp:', new Date().toISOString());
    
    try {
      const res = await authFetch(`${config.VENDOR_BACKEND_URL}/api/vendor/mfa/verify-setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          totpSecret: totpSecret?.trim?.() || totpSecret,
          verificationCode: cleanedCode
        }),
        credentials: "include"
      });

      if (!res.ok) {
        const err = await res.json();
        console.log('Backend response:', err);
        
        // Provide better error messages based on response
        let errorMessage = err.message || "Failed to verify TOTP code";
        
        if (errorMessage.includes("doesn't match") || errorMessage.includes("Expected") || errorMessage.includes("Invalid")) {
          errorMessage = "❌ Code mismatch detected!\n\n" +
            "Your authenticator generated: " + cleanedCode + "\n" +
            "Server expected something different.\n\n" +
            "This usually means the secret in your authenticator app doesn't match the QR code secret.\n\n" +
            "⚡ FIX:\n" +
            "1. Delete this entry from your authenticator app\n" +
            "2. Click 'Cancel' below\n" +
            "3. Click 'Enable Two-Factor Authentication' again\n" +
            "4. Scan the NEW QR code (or copy the secret code)\n" +
            "5. Try again with codes from the NEW setup\n\n" +
            (err.debug?.expectedCode ? `Server generated: ${err.debug.expectedCode}` : '');
        }
        
        if (err.debug?.codeLength === 0) {
          errorMessage = "Code cannot be empty";
        } else if (err.debug?.codeLength && err.debug.codeLength !== 6) {
          errorMessage = `Invalid length: ${err.debug.codeLength} digits entered, need 6`;
        } else if (err.debug && err.debug.isNumeric === false) {
          errorMessage = "Error: Code contains non-digit characters. Only 0-9 allowed.";
        }
        
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setMfaSuccess("Two-Factor Authentication enabled successfully!");
      setMfaEnabled(true);
      setTotpVerified(true);
      setBackupCodes(data.data?.backupCodes || []);
      showToast("Two-Factor Authentication enabled");
    } catch (err) {
      console.error("Error verifying TOTP:", err);
      setMfaError(err.message || "Failed to verify TOTP code");
    } finally {
      setSaving(false);
    }
  };

  /* ── Disable 2FA ────────────────────────────── */
  const handleDisableMFA = async () => {
    if (!window.confirm("Are you sure you want to disable Two-Factor Authentication? Your account will be less secure.")) {
      return;
    }

    setSaving(true);
    try {
      const res = await authFetch(`${config.VENDOR_BACKEND_URL}/api/vendor/mfa/disable`, {
        method: "POST",
        credentials: "include"
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to disable MFA");
      }

      setMfaEnabled(false);
      showToast("Two-Factor Authentication disabled");
    } catch (err) {
      console.error("Error disabling MFA:", err);
      showToast(err.message || "Failed to disable MFA", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-gray-500 text-sm">Loading settings...</p>
        </div>
      </div>
    );
  }

  /* ──────────────────────────────────────────────────
     RENDER SECTION CONTENT
     ────────────────────────────────────────────────── */
  const renderContent = () => {
    switch (activeSection) {
      /* ═══ PROFILE ═══════════════════════════════ */
      case "profile":
        return (
          <div className="space-y-6">
            <SectionCard icon={User} title="Personal Information" description="Manage your personal and company details">
              {/* Avatar */}
              <div className="flex items-center gap-5 mb-8">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center overflow-hidden">
                    {profileImagePreview ? (
                      <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-2xl font-bold">
                        {(profile.name || "V").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-emerald-700 transition-colors shadow-lg">
                    <Camera className="w-3.5 h-3.5 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{profile.name || "Vendor"}</p>
                  <p className="text-sm text-gray-500">{currentUser?.vendorId || ""}</p>
                </div>
              </div>

              {/* Form grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={profile.name}
                      onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={profile.email}
                      disabled
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={profile.phone}
                      onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={profile.companyName}
                      onChange={(e) => setProfile(p => ({ ...p, companyName: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={profile.country}
                      onChange={(e) => setProfile(p => ({ ...p, country: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={profile.state}
                      onChange={(e) => setProfile(p => ({ ...p, state: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input
                    value={profile.gstin}
                    onChange={(e) => setProfile(p => ({ ...p, gstin: e.target.value }))}
                    placeholder="e.g. 22AAACT1234A1Z5"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </SectionCard>
          </div>
        );

      /* ═══ SECURITY ══════════════════════════════ */
      case "security":
        return (
          <div className="space-y-6">
            {/* Change Password */}
            <SectionCard icon={Lock} title="Change Password" description="Update your password regularly for better security">
              <div className="space-y-4 max-w-md">
                <PasswordField
                  label="Current Password"
                  value={passwords.current}
                  onChange={(v) => setPasswords(p => ({ ...p, current: v }))}
                  placeholder="Enter current password"
                />
                <PasswordField
                  label="New Password"
                  value={passwords.new}
                  onChange={(v) => setPasswords(p => ({ ...p, new: v }))}
                  placeholder="Enter new password"
                />
                <PasswordField
                  label="Confirm New Password"
                  value={passwords.confirm}
                  onChange={(v) => setPasswords(p => ({ ...p, confirm: v }))}
                  placeholder="Confirm new password"
                />
                {/* Password requirements */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">Password requirements:</p>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { test: passwords.new.length >= 8, text: "At least 8 characters" },
                      { test: /[A-Z]/.test(passwords.new), text: "One uppercase letter" },
                      { test: /[a-z]/.test(passwords.new), text: "One lowercase letter" },
                      { test: /[0-9]/.test(passwords.new), text: "One number" },
                      { test: /[^A-Za-z0-9]/.test(passwords.new), text: "One special character" },
                      { test: passwords.new && passwords.new === passwords.confirm, text: "Passwords match" },
                    ].map(({ test, text }, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        {test ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <X className="w-3 h-3 text-gray-300" />
                        )}
                        <span className={`text-xs ${test ? "text-emerald-700" : "text-gray-400"}`}>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {pwdError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{pwdError}</span>
                  </div>
                )}
                {pwdSuccess && (
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{pwdSuccess}</span>
                  </div>
                )}

                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Update Password
                </button>
              </div>
            </SectionCard>

            {/* Two-Factor Authentication */}
            <SectionCard icon={Shield} title="Two-Factor Authentication" description="Add an extra layer of security with authenticator app">
              {!showMfaSetup ? (
                <div className="space-y-4">
                  {/* Status Row */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-100">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg ${mfaEnabled ? "bg-emerald-50" : "bg-blue-50"} flex items-center justify-center`}>
                        <Shield className={`w-5 h-5 ${mfaEnabled ? "text-emerald-600" : "text-blue-600"}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {mfaEnabled ? "Authenticator App Enabled" : "Authenticator App"}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {mfaEnabled 
                            ? "Use an authenticator app on your phone to generate verification codes" 
                            : "Get a verification code from an authenticator app on every login for added security"}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                      mfaEnabled 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {mfaEnabled ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Setup Button or Disable Button */}
                  <div className="flex gap-3 pt-3">
                    {mfaEnabled ? (
                      <button
                        onClick={handleDisableMFA}
                        disabled={saving}
                        className="px-4 py-2.5 text-sm font-medium rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        Disable 2FA
                      </button>
                    ) : (
                      <button
                        onClick={handleSetupTOTP}
                        disabled={saving}
                        className="px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                        Set Up Now
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                // TOTP Setup Form
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      📱 Scan the QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.)
                    </p>
                  </div>

                  {!totpVerified ? (
                    <>
                      {/* QR Code Display */}
                      {qrCodeUrl && (
                        <div className="flex flex-col items-center gap-4">
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <img src={qrCodeUrl} alt="TOTP QR Code" className="w-48 h-48" />
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-600 mb-2">Can't scan? Enter this code manually:</p>
                            <code className="block text-sm font-mono bg-gray-100 rounded px-3 py-2 text-gray-900 break-all">
                              {totpSecret}
                            </code>
                          </div>
                        </div>
                      )}

                      {mfaError && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">{mfaError}</span>
                        </div>
                      )}

                      {/* Verification Code Input */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Enter the 6-digit code from your authenticator app
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength="6"
                          value={totpCode}
                          onChange={(e) => {
                            // Only allow ASCII digits 0-9
                            let cleaned = "";
                            for (let i = 0; i < e.target.value.length; i++) {
                              const code = e.target.value.charCodeAt(i);
                              if (code >= 48 && code <= 57) { // 0-9
                                cleaned += e.target.value[i];
                              }
                            }
                            setTotpCode(cleaned);
                          }}
                          placeholder="000000"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-2xl tracking-widest font-mono"
                        />
                        <p className="text-xs text-gray-500 mt-1">The code refreshes every 30 seconds. Match it with the "Current" code shown below.</p>
                        
                        {/* Test Code Section */}
                        <button
                          type="button"
                          onClick={handleTestCode}
                          disabled={testCodeLoading || !totpSecret}
                          className="mt-3 px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {testCodeLoading ? "Generating..." : "🔍 Show Expected Code"}
                        </button>

                        {showTestCode && testCodeData && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-xs font-medium text-blue-900 mb-2">Expected Codes (for debugging):</p>
                            <div className="space-y-1 font-mono text-sm">
                              <p className="text-blue-600"><strong>Current:</strong> {testCodeData.currentCode}</p>
                              <p className="text-gray-600 text-xs">Previous: {testCodeData.previousCode}</p>
                              <p className="text-gray-600 text-xs">Next: {testCodeData.nextCode}</p>
                            </div>
                            <p className="text-xs text-blue-700 mt-2">Compare these with your authenticator app. If they don't match, check that your device's time is correct.</p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                        <button
                          onClick={() => {
                            setShowMfaSetup(false);
                            setTotpCode("");
                            setTotpSecret("");
                            setQrCodeUrl("");
                            setTotpVerified(false);
                            setMfaError("");
                            setMfaSuccess("");
                            setShowTestCode(false);
                            setTestCodeData(null);
                          }}
                          className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleVerifyTOTP}
                          disabled={saving || !totpCode || totpCode.length !== 6}
                          className="px-6 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Verify & Enable
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Success and Backup Codes */}
                      <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                        <Check className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">Two-Factor Authentication enabled successfully!</span>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm font-medium text-yellow-900 mb-2">
                          ⚠️ Save your backup codes in a safe place. You can use these to access your account if you lose your authenticator device.
                        </p>
                      </div>

                      {/* Backup Codes Display */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Backup Codes
                        </label>
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="grid grid-cols-2 gap-2">
                            {backupCodes.map((code, index) => (
                              <div key={index} className="font-mono text-sm bg-white p-2 rounded border border-gray-200 text-center">
                                {code}
                              </div>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Each code can only be used once. Keep them somewhere secure.</p>
                      </div>

                      {/* Done Button */}
                      <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                        <button
                          onClick={() => {
                            setShowMfaSetup(false);
                            setTotpCode("");
                            setTotpSecret("");
                            setQrCodeUrl("");
                            setTotpVerified(false);
                            setBackupCodes([]);
                            setMfaError("");
                            setMfaSuccess("");
                            setMfaEnabled(true);
                          }}
                          className="px-6 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          Done
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </SectionCard>

            {/* Active Sessions */}
            <SectionCard icon={Globe} title="Account Actions" description="Manage your account session">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Sign out of all devices</p>
                    <p className="text-xs text-gray-500 mt-0.5">This will log you out from all active sessions</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    Sign Out
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>
        );

      /* ═══ NOTIFICATIONS ══════════════════════════ */
      case "notifications":
        return (
          <div className="space-y-6">
            {/* Email Notifications */}
            <SectionCard icon={Mail} title="Email Notifications" description="Choose which emails you'd like to receive">
              <div className="space-y-1">
                <NotifRow
                  icon={Package}
                  color="bg-emerald-500"
                  title="Order & Quotation Updates"
                  desc="Get notified when you receive new orders, quotation requests, or order status changes"
                  enabled={emailPrefs.orderNotifications}
                  onChange={(v) => setEmailPrefs(p => ({ ...p, orderNotifications: v }))}
                />
                <NotifRow
                  icon={TrendingUp}
                  color="bg-blue-500"
                  title="Lead Alerts"
                  desc="Receive notifications when new leads match your products or services"
                  enabled={emailPrefs.leadAlerts}
                  onChange={(v) => setEmailPrefs(p => ({ ...p, leadAlerts: v }))}
                />
                <NotifRow
                  icon={Bell}
                  color="bg-orange-500"
                  title="Quotation Alerts"
                  desc="Get alerts when buyers respond to your quotations or request revisions"
                  enabled={emailPrefs.quotationAlerts}
                  onChange={(v) => setEmailPrefs(p => ({ ...p, quotationAlerts: v }))}
                />
                <NotifRow
                  icon={AlertCircle}
                  color="bg-red-500"
                  title="System Alerts"
                  desc="Important account alerts, security notices, and platform updates"
                  enabled={emailPrefs.systemAlerts}
                  onChange={(v) => setEmailPrefs(p => ({ ...p, systemAlerts: v }))}
                />
              </div>
            </SectionCard>

            {/* Marketing / Newsletters */}
            <SectionCard icon={Newspaper} title="Marketing & Newsletters" description="Stay updated with industry news and platform updates">
              <div className="space-y-1">
                <NotifRow
                  icon={Megaphone}
                  color="bg-purple-500"
                  title="Promotions & Deals"
                  desc="Daily product promotions, seasonal deals, and special offers"
                  enabled={emailPrefs.promotions}
                  onChange={(v) => setEmailPrefs(p => ({ ...p, promotions: v }))}
                />
                <NotifRow
                  icon={Newspaper}
                  color="bg-indigo-500"
                  title="Weekly Newsletter"
                  desc="Industry insights, sourcing tips, and a weekly roundup every Monday"
                  enabled={emailPrefs.newsletter}
                  onChange={(v) => setEmailPrefs(p => ({ ...p, newsletter: v }))}
                />
                <NotifRow
                  icon={Package}
                  color="bg-teal-500"
                  title="Product & Platform Updates"
                  desc="New features, platform improvements, and product announcements"
                  enabled={emailPrefs.updates}
                  onChange={(v) => setEmailPrefs(p => ({ ...p, updates: v }))}
                />
              </div>
            </SectionCard>

            {/* SMS Notifications */}
            <SectionCard icon={Smartphone} title="SMS Notifications" description="Text message alerts for critical updates">
              <div className="space-y-1">
                <NotifRow
                  icon={Package}
                  color="bg-emerald-500"
                  title="Order Alerts"
                  desc="Receive SMS for new orders and order status changes"
                  enabled={smsPrefs.orderAlerts}
                  onChange={(v) => setSmsPrefs(p => ({ ...p, orderAlerts: v }))}
                />
                <NotifRow
                  icon={TrendingUp}
                  color="bg-blue-500"
                  title="Lead Alerts"
                  desc="Get SMS when new leads match your products or services"
                  enabled={smsPrefs.leadAlerts}
                  onChange={(v) => setSmsPrefs(p => ({ ...p, leadAlerts: v }))}
                />
                <NotifRow
                  icon={Shield}
                  color="bg-red-500"
                  title="Security Alerts"
                  desc="Receive SMS for login attempts and security events"
                  enabled={smsPrefs.securityAlerts}
                  onChange={(v) => setSmsPrefs(p => ({ ...p, securityAlerts: v }))}
                />
              </div>
            </SectionCard>

            <div className="flex justify-end">
              <button
                onClick={handleSaveNotifications}
                disabled={saving}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Preferences
              </button>
            </div>
          </div>
        );

      /* ═══ PRIVACY & DATA ═════════════════════════ */
      case "privacy":
        return (
          <div className="space-y-6">
            <SectionCard icon={Shield} title="Data & Privacy" description="Control how your data is used and stored">
              {/* Profile Visibility */}
              <div className="space-y-5">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Profile Visibility</p>
                    <p className="text-xs text-gray-500 mt-0.5">Allow potential buyers to view your company profile and portfolio</p>
                  </div>
                  <Toggle enabled={true} onChange={() => {}} />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Show Contact Information</p>
                    <p className="text-xs text-gray-500 mt-0.5">Display your email and phone on your public profile</p>
                  </div>
                  <Toggle enabled={true} onChange={() => {}} />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Analytics & Usage Data</p>
                    <p className="text-xs text-gray-500 mt-0.5">Help us improve by sharing anonymous usage data</p>
                  </div>
                  <Toggle enabled={true} onChange={() => {}} />
                </div>
              </div>
            </SectionCard>

            {/* Download Data */}
            <SectionCard icon={Package} title="Your Data" description="Download or delete your account data">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Download Your Data</p>
                    <p className="text-xs text-gray-500 mt-0.5">Get a copy of all your data including profile, orders, and activity</p>
                  </div>
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-gray-100 text-gray-500">Coming Soon</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-red-600">Delete Account</p>
                    <p className="text-xs text-gray-500 mt-0.5">Permanently delete your account and all associated data. This action cannot be undone.</p>
                  </div>
                  <button className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>
        );

      default:
        return null;
    }
  };

  /* ──────────────────────────────────────────────────
     RENDER
     ────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300 ${
          toast.type === "error"
            ? "bg-red-600 text-white"
            : "bg-emerald-600 text-white"
        }`}>
          {toast.type === "error" ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-[#095B49] to-[#000000] py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-2xl font-bold text-white">Settings</h1>
          </div>
          <p className="text-emerald-200 text-sm ml-11">Manage your account, security, and preferences</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 -mt-4">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-6">
              {/* Profile summary */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center overflow-hidden">
                    {profileImagePreview ? (
                      <img src={profileImagePreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-sm font-bold">
                        {(profile.name || "V").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{profile.name || "Vendor"}</p>
                    <p className="text-xs text-gray-500 truncate">{profile.email}</p>
                  </div>
                </div>
              </div>

              {/* Nav items */}
              <nav className="p-2">
                {navItems.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveSection(id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                      activeSection === id
                        ? "bg-emerald-50 text-emerald-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${activeSection === id ? "text-emerald-600" : "text-gray-400"}`} />
                    {label}
                    {activeSection === id && <ChevronRight className="w-4 h-4 ml-auto text-emerald-400" />}
                  </button>
                ))}
              </nav>

              {/* Logout */}
              <div className="p-2 pt-0 border-t border-gray-100 mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 pb-12">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
