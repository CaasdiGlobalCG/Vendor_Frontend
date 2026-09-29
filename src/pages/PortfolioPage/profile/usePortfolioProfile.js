// ============================================================
// FILE: usePortfolioProfile.js
// PURPOSE: Derives the profile-card view model from VendorContext, so the card can be
//          rendered ONCE by the Portfolio shell instead of once per view.
// CONNECTS TO: context/VendorContext (vendorData, currentUser, isHydratingUser).
//
// WHY NO FETCH HERE: each view already calls GET /api/vendor/me and writes the result into
// the shared VendorContext via setVendorData (CompanyView.jsx:141-148,
// ProjectsView.jsx:135-142, CatalogueView.jsx:164-171). Re-fetching in the shell would
// duplicate that request. This hook only SHAPES what the context already holds, which is
// presentation-only — no data logic changes.
//
// The shape mirrors exactly what the three views passed to <UserProfileCard>:
//   profileData={profileData} loading={…} error={…} onEditProfileClick={…}
// ============================================================

import { useContext, useMemo } from 'react';
import { VendorContext } from '../../../context/VendorContext';

/** Vendor id shown as `#ABC123` — same derivation the views used. */
function shortVendorId(value) {
  if (!value) return null;
  return `#${String(value).substring(0, 6)}`;
}

export function usePortfolioProfile() {
  const { vendorData, currentUser, isHydratingUser } = useContext(VendorContext);

  const profile = useMemo(() => {
    const vendor = vendorData?.vendorDetails || {};
    const company = vendorData?.companyDetails || {};
    const state = company.state || '';
    const country = company.country || '';

    return {
      name: vendor.primaryContactName || currentUser?.name || null,
      companyName: company.companyName || vendor.companyName || null,
      vendorId: shortVendorId(vendorData?.vendorId || vendorData?.id || currentUser?.vendorId),
      image: vendorData?.profileImage?.url || null,
      phone: vendor.primaryContactPhone || null,
      location: [state, country].filter(Boolean).join(', ') || null,
      email: vendor.primaryContactEmail || currentUser?.email || null,
      gstNumber: company.gstNumber || null,
      panNumber: company.panNumber || null,
    };
  }, [vendorData, currentUser]);

  // "Loading" means the context has not been populated yet — not that this hook is
  // fetching. Once any view's /api/vendor/me resolves, the context fills and the card
  // renders real values.
  const hasAnyData = Boolean(
    profile.companyName || profile.name || profile.email || profile.vendorId
  );

  return {
    profile,
    loading: isHydratingUser || !hasAnyData,
    error: null,
  };
}
