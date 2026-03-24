import React from 'react';

/**
 * AuthSkeletonScreen
 * Minimal full-page skeleton for auth/guard transitions to avoid spinner flashes.
 */
export default function AuthSkeletonScreen({ message = 'Loading your workspace...' }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        <div className="mx-auto mb-8 h-10 w-40 rounded-md bg-slate-200/80 animate-pulse" />

        <div className="space-y-4">
          <div className="h-4 w-3/4 rounded bg-slate-200/80 animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-slate-200/70 animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-slate-200/60 animate-pulse" />
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 rounded-xl bg-slate-100 animate-pulse" />
          <div className="h-24 rounded-xl bg-slate-100 animate-pulse" />
          <div className="h-24 rounded-xl bg-slate-100 animate-pulse" />
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">{message}</p>
      </div>
    </div>
  );
}
