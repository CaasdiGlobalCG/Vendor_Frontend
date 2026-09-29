// ============================================================
// FILE: NotificationPage.jsx
// PURPOSE: Route entry for /VendorDashboard/notifications.
// CONNECTS TO: components/NotificationList/NotificationList — which now owns the whole
//              page shell via components/console/ConsoleShell.
//
// The page previously rendered its own PageHero ("Alert Center") ABOVE the list, which
// stacked a second, oversized hero on top of the Console hero — two headers for one
// page. The Console shell supplies the hero now, so this file is just the mount point.
// ============================================================

import React from 'react';
import NotificationList from '../../components/NotificationList/NotificationList';

const NotificationsPage = () => {
  return <NotificationList />;
};

export default NotificationsPage;
