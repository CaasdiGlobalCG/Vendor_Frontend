import React, { createContext, useState, useEffect, useCallback } from "react";
import config from "../config/env";
import authFetch from "../utils/authFetch";
import { isInviteAcceptRoute } from "../public-routes/inviteRoute";

export const VendorContext = createContext();
const AUTH_TRANSITION_KEY = 'vendorAuthTransitionInProgress';
const AUTH_TRANSITION_STARTED_AT_KEY = 'vendorAuthTransitionStartedAt';

// Define initial data with proper structure to avoid undefined properties
const initialData = {
  vendorDetails: {},
  companyDetails: {},
  serviceProductDetails: {},
  bankDetails: {},
  complianceCertifications: {},
  additionalDetails: {},
};

export const VendorProvider = ({ children }) => {
  // Do NOT hydrate currentUser from localStorage (prevents stale/cross-user leakage)
  const [currentUser, setCurrentUser] = useState(null);
  const [isHydratingUser, setIsHydratingUser] = useState(true);
  const [vendorData, setVendorData] = useState(initialData);

  const isPublicInviteRoute = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return isInviteAcceptRoute(window.location);
  }, []);

  const hydrateCurrentUser = useCallback(async () => {
    try {
      setIsHydratingUser(true);

      // Fetch vendor record securely from cookie-authenticated /me endpoint (no email query param)
      let vendorId = null;
      let name = null;
      let status = null;
      let hasFilledForm = null;
      let email = null;
      let isTeamMember = false;

      const tryMe = async () => {
        const res = await authFetch(`${config.VENDOR_BACKEND_URL}/api/vendor/me`, {
          credentials: 'include',
        });
        if (!res.ok) {
          let body = null;
          try {
            body = await res.json();
          } catch {
            body = null;
          }
          return { ok: false, status: res.status, body };
        }
        const me = await res.json();
        return { ok: true, me };
      };

      let meAttempt = await tryMe();

      // Migration bridge: if the user is logged in via legacy localStorage token, establish
      // the vendor httpOnly cookie session once, then rely on cookies thereafter.
      if (!meAttempt.ok) {
        const legacyToken = localStorage.getItem('authToken');
        if (legacyToken) {
          const sessionRes = await fetch(`${config.VENDOR_BACKEND_URL}/api/auth/session`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              Authorization: `Bearer ${legacyToken}`,
            },
          });

          if (sessionRes.ok) {
            meAttempt = await tryMe();
          }
        }
      }

      if (meAttempt.ok) {
        const v = meAttempt.me?.data;
        vendorId = v?.vendorId || v?.id || null;
        name = v?.name || v?.vendorDetails?.firstName || v?.vendorDetails?.primaryContactName || null;
        status = v?.status != null ? String(v.status).trim() : null;
        hasFilledForm = typeof v?.hasFilledForm === 'boolean' ? v.hasFilledForm : null;
        email = email || v?.email || v?.vendorDetails?.primaryContactEmail || null;
        isTeamMember = v?.isTeamMember === true;
      }

      if (
        meAttempt?.status === 403 &&
        (meAttempt?.body?.code === 'RBAC_001' || meAttempt?.body?.code === 'RBAC_002')
      ) {
        setCurrentUser(null);
        return {
          ok: false,
          status: 403,
          accessDenied: {
            code: meAttempt.body.code,
            message: meAttempt.body.message || 'Your access to this organization has been restricted.',
          },
        };
      }

      // If neither token nor session resolves a user, clear state.
      if (!email && !vendorId) {
        setCurrentUser(null);
        return { ok: false, status: meAttempt?.status || 401 };
      }

      const hydratedUser = {
        email,
        role: 'vendor',
        lastSelectedRole: null,
        roleSelected: true,
        vendorId,
        name,
        status,
        hasFilledForm,
        isTeamMember,
      };

      setCurrentUser(hydratedUser);
      return { ok: true, user: hydratedUser };
    } catch (error) {
      console.error('VendorContext - Failed to hydrate current user:', error);
      setCurrentUser(null);
      return { ok: false, error };
    } finally {
      setIsHydratingUser(false);
      try {
        sessionStorage.removeItem(AUTH_TRANSITION_KEY);
        sessionStorage.removeItem(AUTH_TRANSITION_STARTED_AT_KEY);
      } catch {}
    }
  }, []);

  // Debug effect to log when currentUser changes
  useEffect(() => {
    console.log("VendorContext - Current user updated:", currentUser);
  }, [currentUser]);

  // Hydrate on first mount
  useEffect(() => {
    if (isPublicInviteRoute()) {
      setCurrentUser(null);
      setIsHydratingUser(false);
      return;
    }
    hydrateCurrentUser();
  }, [hydrateCurrentUser, isPublicInviteRoute]);

  // Set current user and reset vendor data if needed
  const setUser = (user) => {
    console.log("VendorContext: Setting new user:", user);
    
    // Clear previous user data if changing users (check by email since that's our primary identifier)
    if (currentUser && (!user || currentUser.email !== user.email)) {
      console.log("VendorContext: Resetting vendor data for new user");
      setVendorData(initialData);
    }
    
    // Set the new user
    setCurrentUser(user);
  };

  // Logout function to clear all user data
  const logout = () => {
    console.log("VendorContext: Logging out user");

    // Best-effort: clear server-issued httpOnly auth cookie
    try {
      fetch(`${config.VENDOR_BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      }).catch(() => {});
    } catch {}
    
    // Reset state
    setCurrentUser(null);
    setVendorData(initialData);
    
    // Clear ALL authentication-related localStorage keys
    const keysToRemove = [
      'currentUser',
      'pmUser', 
      'user',
      'vendorUser',
      'token',
      'pmToken',
      'authToken',
      'vendorId',
      'email'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`VendorContext: Removed ${key} from localStorage`);
    });
    
    console.log("VendorContext: User logged out, all data cleared");
  };

  return (
    <VendorContext.Provider value={{ 
      vendorData, 
      setVendorData,
      currentUser,
      isHydratingUser,
      hydrateCurrentUser,
      setUser,
      logout
    }}>
      {children}
    </VendorContext.Provider>
  );
};
