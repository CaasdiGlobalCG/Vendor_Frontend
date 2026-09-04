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
  serviceProductDetails: {
    vendorType: "",
    productDescription: "",
    paymentTerms: "",
    paymentMode: "",
    serviceProviderDetails: {
      credentialDeck: null,
      officeAddress: "",
      officePhotos: null,
      teamSize: "",
      orgChart: null,
      keyPersonnelCVs: null,
      professionalLicences: [],
      techStackDeclaration: "",
      dataSecurityPolicy: "",
      dataSecurityPolicyDoc: null,
      subcontractorDisclosure: "",
    },
    manufacturerDetails: {
      manufacturerSubType: "",
      factoryAddress: "",
      factoryPhotos: null,
      productionCapacity: "",
      rawMaterialStorage: "",
      wipStorage: "",
      finishedGoodsWarehouse: "",
      workforceHeadcount: "",
      utilityInfrastructure: "",
      machineryDetails: [
        {
          machineName: "",
          serialNumber: "",
          modelNumber: "",
          manufacturerName: "",
          contact: "",
          purchaseDate: "",
          warrantyStart: "",
          warrantyEnd: "",
          maintenanceDetails: "",
        },
      ],
      iso9001Certificate: null,
      productCertifications: [],
      testReports: null,
      inHouseQCLab: "",
      msdsDocument: null,
      rejectionReturnRate: "",
      logisticsInfrastructure: "",
      moqLeadTime: "",
      packagingStandards: "",
      batchTrackingSystem: "",
    },
  },
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

      // Restore any in-progress form draft saved in a previous session
      const savedDraft = localStorage.getItem(`vendorFormDraft_${email}`);
      if (savedDraft) {
        try { setVendorData(JSON.parse(savedDraft)); } catch {}
      }

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

  // Persist entire form draft to localStorage whenever vendorData changes and a user is known
  useEffect(() => {
    if (!currentUser?.email) return;
    try {
      localStorage.setItem(`vendorFormDraft_${currentUser.email}`, JSON.stringify(vendorData));
    } catch {}
  }, [vendorData, currentUser?.email]);

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

  // Logout — clears ALL auth layers then hard-redirects to /login.
  //
  // WHY async + await matters here:
  //   Auth.signOut() is async — it awaits currentAuthenticatedUser() internally
  //   before it clears tokens. If we detach it with .catch(() => {}) and immediately
  //   call window.location.replace, the Amplify tokens are STILL in localStorage
  //   when the /login page loads. authFetch's 401-retry then calls Auth.currentSession(),
  //   gets a fresh token, re-establishes the cookie, and logs the user back in.
  //
  //   Likewise, POST /api/auth/logout clears the httpOnly cookie. If we don't await it,
  //   the cookie is still set on page reload and authFetch('/api/vendor/me') succeeds
  //   on the FIRST try — no 401-retry needed, instant re-login.
  //
  // Order:
  //   1. Wipe Amplify keys from localStorage synchronously — faster and more reliable
  //      than awaiting Auth.signOut() which does async work before clearing.
  //   2. Await POST /api/auth/logout — cookie must be gone before page reloads.
  //   3. Clear sessionStorage transition flags and remaining localStorage keys.
  //   4. window.location.replace('/login') — full reload, all state destroyed.
  const logout = async () => {
    // 1. Synchronously wipe Amplify's Cognito token cache.
    //    Auth.signOut() awaits currentAuthenticatedUser() before clearing — that async
    //    gap is why the old code's fire-and-forget didn't work. Clearing the keys
    //    directly is synchronous and guaranteed to complete before step 2.
    try {
      const cognitoKeys = [];
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('CognitoIdentityServiceProvider') ||
          key === 'amplify-signin-with-hostedUI'
        )) {
          cognitoKeys.push(key);
        }
      }
      cognitoKeys.forEach(key => localStorage.removeItem(key));
    } catch {}

    // 2. Clear the httpOnly cookie — AWAITED so the cookie is gone before page reloads.
    //    Without await, the cookie survives to the next page load and authFetch succeeds
    //    on the first attempt, bypassing the 401-retry path entirely.
    try {
      await fetch(`${config.VENDOR_BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}

    // 3. Clear session flags, form draft, and any remaining app-level keys.
    sessionStorage.removeItem(AUTH_TRANSITION_KEY);
    sessionStorage.removeItem(AUTH_TRANSITION_STARTED_AT_KEY);
    if (currentUser?.email) {
      localStorage.removeItem(`vendorFormDraft_${currentUser.email}`);
    }
    [
      'currentUser', 'pmUser', 'user', 'vendorUser',
      'token', 'pmToken', 'authToken', 'vendorId', 'email',
      'roleSelected',
    ].forEach(key => localStorage.removeItem(key));

    // 4. Hard redirect — full page reload, all in-flight requests and React state gone.
    window.location.replace('/login');
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
