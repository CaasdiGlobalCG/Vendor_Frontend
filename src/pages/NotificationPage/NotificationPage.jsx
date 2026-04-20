import React from 'react';
import NotificationList from '../../components/NotificationList/NotificationList'; // Adjust path if needed

const NotificationsPage = () => {
  return (
    <div className="min-h-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 overflow-hidden rounded-[24px] border border-emerald-200/20 bg-gradient-to-r from-[#095B49] via-[#0D7A71] to-[#000000] px-6 py-7 text-white shadow-[0_16px_40px_rgba(6,95,70,0.22)] sm:px-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-emerald-100/80">
            Alert Center
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Notifications</h1>
          <p className="mt-2 max-w-2xl text-sm text-emerald-50/85">
            Review alerts, updates, and action items in one place with the same visual language as the main header.
          </p>
        </div>
      </div>
      <NotificationList />
    </div>
  );
};

export default NotificationsPage;
