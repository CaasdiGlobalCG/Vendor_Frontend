import React from 'react';
import NotificationList from '../../components/NotificationList/NotificationList'; // Adjust path if needed

const NotificationsPage = () => {
  return (
    <div className="p-5"> {/* Add padding similar to other pages */}
      <h1 className="text-2xl font-semibold mb-4">Notifications</h1>
      <NotificationList />
    </div>
  );
};

export default NotificationsPage;
