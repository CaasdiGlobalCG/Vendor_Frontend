// ============================================================
// FILE: useCrossAppNavigation.js
// PURPOSE: The header's cross-app actions — Graviyx / Sales / Tender redirects and the
//          Vendor↔Client platform switch.
// CONNECTS TO: config/env (B2B_MARKETPLACE_URL, SALES_URL, CLIENT_URL),
//              utils/handoffToSales, utils/handoffToClient, aws-amplify Auth.
//
// VERBATIM EXTRACTION from components/Header/Header.jsx:966-1054 (the three cross-app
// buttons) and :796-844 (the platform switch). The token acquisition, the URL guards,
// the alerts, the redirectingTo state and the error handling are reproduced exactly.
// ============================================================

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from 'aws-amplify';
import config from '../../config/env';
import { redirectToClientWithHandoff } from '../../utils/handoffToClient';
import { redirectToSalesWithHandoff } from '../../utils/handoffToSales';

/**
 * @returns {object} redirectingTo state plus the four cross-app handlers
 */
export function useCrossAppNavigation() {
  const navigate = useNavigate();
  // 'Graviyx' | 'Sales' | 'Tender' | null
  const [redirectingTo, setRedirectingTo] = useState(null);

  const openGraviyx = useCallback(async () => {
    let idToken = '';
    try {
      const session = await Auth.currentSession();
      idToken = session.getIdToken().getJwtToken();
    } catch {
      idToken = localStorage.getItem('authToken') || '';
    }

    if (!idToken) {
      alert('You need to be logged in to access Graviyx.');
      navigate('/login');
      return;
    }

    const b2bMarketplaceUrl = config.B2B_MARKETPLACE_URL;
    if (!b2bMarketplaceUrl) {
      alert('B2B marketplace URL is not configured. Please contact support.');
      return;
    }

    setRedirectingTo('Graviyx');
    window.location.href = `${b2bMarketplaceUrl}/?token=${encodeURIComponent(idToken)}`;
  }, [navigate]);

  const openSales = useCallback(async () => {
    if (!config.SALES_URL) {
      console.error('SALES_URL is not configured');
      alert('B2B Sales dashboard URL is not configured. Please contact support.');
      return;
    }

    setRedirectingTo('Sales');
    try {
      await redirectToSalesWithHandoff();
    } catch (e) {
      setRedirectingTo(null);
      console.error('B2B handoff redirect failed:', e);
      // Show specific error if 403 (access denied), otherwise generic
      const is403 = e?.message?.includes('403');
      alert(
        is403
          ? 'You do not have access to the B2B Sales module. Please contact your administrator.'
          : 'Unable to open B2B Sales dashboard right now. Please try again.'
      );
    }
  }, []);

  const openTender = useCallback(async () => {
    if (!config.SALES_URL) {
      console.error('SALES_URL is not configured');
      alert('Tender URL is not configured. Please contact support.');
      return;
    }

    setRedirectingTo('Tender');
    try {
      await redirectToSalesWithHandoff('/tender');
    } catch (e) {
      setRedirectingTo(null);
      console.error('Tender handoff redirect failed:', e);
      const is403 = e?.message?.includes('403');
      alert(
        is403
          ? 'You do not have access to the Tender module. Please contact your administrator.'
          : 'Unable to open Tender dashboard right now. Please try again.'
      );
    }
  }, []);

  /**
   * Platform switch. Mirrors Header.jsx:799-832 — including the localStorage/session
   * cleanup before the handoff, and reverting the toggle on failure.
   * @param {() => void} setIsVendor setter for the switch's visual state
   */
  const switchToClient = useCallback(
    async (setIsVendor) => {
      setIsVendor(false);

      const clientBase = config.CLIENT_URL;
      if (!clientBase) {
        console.error('CLIENT_URL is not configured');
        alert('Client dashboard URL is not configured. Please contact support.');
        setIsVendor(true); // Revert toggle
        return;
      }

      // Clear any stale client-specific data from localStorage
      // to ensure fresh client status check based on email only
      try {
        localStorage.removeItem('clientId');
        sessionStorage.removeItem('bootRouted');
      } catch (e) {
        console.warn('Header Toggle: Error clearing client localStorage:', e);
      }

      try {
        await redirectToClientWithHandoff();
      } catch (e) {
        console.error('Header Toggle: handoff redirect failed:', e);
        alert('Unable to switch to client right now. Please try again.');
        setIsVendor(true); // revert toggle, stay in vendor app
      }
    },
    []
  );

  return { redirectingTo, openGraviyx, openSales, openTender, switchToClient };
}
