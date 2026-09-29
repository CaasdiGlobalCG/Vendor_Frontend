// ============================================================
// FILE: useVendorHeaderData.js
// PURPOSE: The vendor-header's vendor-record fetch and display-name derivation.
// CONNECTS TO: context/VendorContext (currentUser, vendorData, setUser, setVendorData),
//              GET /api/vendor/me.
//
// VERBATIM EXTRACTION from components/Header/Header.jsx:130-203. The fetch, its headers,
// its guards, its setVendorData payload and its setUser call are reproduced exactly.
// `isOnDashboard` is kept as an effect dependency even though the fetch is ref-guarded,
// because the original had it and removing it would change when the effect re-runs.
// ============================================================

import { useContext, useEffect, useMemo, useRef } from 'react';
import config from '../../config/env';
import { VendorContext } from '../../context/VendorContext';

/**
 * @param {boolean} isOnDashboard mirrors the original effect dependency
 * @returns {{ currentUser: object|null, vendorData: object, displayName: string|null }}
 */
export function useVendorHeaderData(isOnDashboard) {
  const { currentUser, vendorData, setUser, setVendorData } = useContext(VendorContext);
  const vendorFetchOnceRef = useRef(false);

  useEffect(() => {
    const fetchVendorInfo = async () => {
      // Avoid duplicate fetch loops
      if (vendorFetchOnceRef.current) {
        return;
      }
      try {
        const token = localStorage.getItem('authToken');
        const headers = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        const meResponse = await fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/me`, {
          credentials: 'include',
          headers,
        });
        if (!meResponse.ok) {
          throw new Error(`Server responded with status: ${meResponse.status}`);
        }
        const meData = await meResponse.json();
        if (meData.success && meData.data) {
          const vendorDetail = meData.data;
          const vendorId = vendorDetail.vendorId || vendorDetail.id;
          if (vendorDetail) {
            const vd = vendorDetail.vendorDetails || {};

            setVendorData({
              vendorId: vendorId,
              vendorDetails: vd,
              companyDetails: vendorDetail.companyDetails || {},
              serviceProductDetails: vendorDetail.serviceProductDetails || {},
              bankDetails: vendorDetail.bankDetails || {},
              complianceCertifications: vendorDetail.complianceCertifications || {},
              additionalDetails: vendorDetail.additionalDetails || {},
              profileImage: vendorDetail.profileImage || null,
            });

            // Derive a human-friendly display name from vendorDetails instead of using primaryContactName ID
            const fullName = [vd.firstName, vd.lastName].filter(Boolean).join(' ').trim();
            const displayName =
              fullName ||
              vd.vendorName ||
              vd.companyName ||
              currentUser?.name ||
              currentUser?.email;

            if (currentUser && (!currentUser.name || currentUser.name === vd.primaryContactName)) {
              setUser({
                ...currentUser,
                vendorId: vendorId,
                name: displayName,
              });
            }
            vendorFetchOnceRef.current = true;
          }
        }
      } catch (error) {
        console.error('Header: Error fetching vendor info:', error);
      }
    };
    if (currentUser && currentUser.email) {
      fetchVendorInfo();
    }
  }, [currentUser, isOnDashboard, setVendorData, setUser]);

  // Same derivation the fetch uses, so the header never shows a raw vendorId as a name
  // (the original greeting did — components/Header/Header.jsx:946-949).
  const displayName = useMemo(() => {
    const vd = vendorData?.vendorDetails || {};
    const fullName = [vd.firstName, vd.lastName].filter(Boolean).join(' ').trim();
    return (
      fullName ||
      vd.vendorName ||
      vendorData?.companyDetails?.companyName ||
      currentUser?.name ||
      (currentUser?.email ? String(currentUser.email).split('@')[0] : null) ||
      null
    );
  }, [vendorData, currentUser?.name, currentUser?.email]);

  return { currentUser, vendorData, displayName };
}
