// ============================================================
// FILE: public-routes/PublicInviteRoutes.jsx
// PURPOSE: Minimal route tree for invite acceptance without global auth providers.
// CONNECTS TO: App.jsx, rbac/pages/InviteAcceptPage.jsx
// ============================================================

import React from 'react';
import { Route, Routes } from 'react-router-dom';
import InviteAcceptPage from '../rbac/pages/InviteAcceptPage';

export default function PublicInviteRoutes() {
  return (
    <Routes>
      <Route path="/invite/accept" element={<InviteAcceptPage />} />
      <Route path="*" element={<InviteAcceptPage />} />
    </Routes>
  );
}
