import React, { useContext, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { VendorContext } from "../context/VendorContext";
import { UserContext } from "../context/UserContext";
import { resolveUserEmail } from "../utils/resolveUserIdentity";

const STEP_KEY = "kycStep"; // global marker — works even when email isn't resolved yet
const EMAIL_STEP_KEY = (email) => `kycStep_${email}`;

const clamp = (n) => Math.min(Math.max(n, 1), 6);

/**
 * The KYC step the user is CURRENTLY on — not the max ever reached.
 * Written by Next AND Previous handlers (and set to 1 wherever the flow
 * is entered fresh), so typing any other /FormN URL bounces back here.
 */
export function getKycStep(email) {
  const raw = localStorage.getItem(email ? EMAIL_STEP_KEY(email) : STEP_KEY)
    ?? localStorage.getItem(STEP_KEY);
  const n = parseInt(raw || "", 10);
  return Number.isNaN(n) ? 1 : clamp(n);
}

/** Set the current position. Called by Next/Previous and form entry points. */
export function setKycStep(step, email) {
  const v = String(clamp(step));
  localStorage.setItem(STEP_KEY, v);
  if (email) localStorage.setItem(EMAIL_STEP_KEY(email), v);
}

/** Called after final submission (Form6 -> /Auditorapprove) — resets the flow. */
export function clearKycStep(email) {
  localStorage.removeItem(STEP_KEY);
  if (email) localStorage.removeItem(EMAIL_STEP_KEY(email));
}

/**
 * Route guard for /Form1../Form6. Any URL that isn't the current position —
 * forward OR backward — is bounced back. Never fails open: when the email
 * can't be resolved the global marker still applies.
 */
export default function KycFormGuard({ step, children }) {
  const { currentUser: vendorContextUser } = useContext(VendorContext) || {};
  const { currentUser } = useContext(UserContext) || {};
  const [redirectTo, setRedirectTo] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let email = vendorContextUser?.email || currentUser?.email || null;
      if (!email) {
        try { email = await resolveUserEmail(); } catch {}
      }
      if (cancelled) return;
      const allowed = getKycStep(email);
      if (step !== allowed) {
        setRedirectTo(`/Form${allowed}`);
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [step, vendorContextUser, currentUser]);

  if (redirectTo) return <Navigate to={redirectTo} replace />;
  if (!ready) return null; // brief — forms resolve identity anyway
  return children;
}
