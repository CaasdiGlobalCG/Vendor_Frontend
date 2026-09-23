import React from 'react';
import NotificationList from '../../components/NotificationList/NotificationList'; // Adjust path if needed
import { PageHero } from '../../components/ui';

const NotificationsPage = () => {
  return (
    <div className="min-h-full bg-canvas px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <PageHero
          eyebrow="Alert Center"
          title="Notifications"
          description="Review alerts, updates, and action items in one place with the same visual language as the main header."
          className="mb-6"
        />
      </div>
      <NotificationList />
    </div>
  );
};

export default NotificationsPage;
