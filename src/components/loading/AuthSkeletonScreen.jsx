import React from 'react';

/**
 * AuthSkeletonScreen
 * Minimal full-page skeleton for auth/guard transitions to avoid spinner flashes.
 */
export default function AuthSkeletonScreen({ message = 'Loading your workspace...' }) {
  return (
    <div className="min-h-screen bg-[#f4f7f6] px-4 py-5 md:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-[28px] bg-[linear-gradient(95deg,rgba(9,91,73,0.95)_0%,rgba(18,28,26,0.92)_100%)] p-5 shadow-[0_20px_60px_rgba(7,25,20,0.24)] md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="h-8 w-14 rounded-2xl bg-white/25 animate-pulse" />
            <div className="hidden md:flex items-center gap-3">
              <div className="h-3 w-20 rounded-full bg-white/20 animate-pulse" />
              <div className="h-3 w-20 rounded-full bg-white/20 animate-pulse" />
              <div className="h-3 w-20 rounded-full bg-white/20 animate-pulse" />
              <div className="h-3 w-20 rounded-full bg-white/20 animate-pulse" />
            </div>
            <div className="h-9 w-36 rounded-2xl bg-white/15 animate-pulse" />
          </div>
          <div className="mt-10 flex items-end justify-between gap-4">
            <div className="space-y-3">
              <div className="h-4 w-44 rounded-full bg-white/20 animate-pulse" />
              <div className="h-3 w-56 rounded-full bg-white/15 animate-pulse" />
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="h-9 w-24 rounded-2xl bg-white/15 animate-pulse" />
              <div className="h-9 w-24 rounded-2xl bg-white/15 animate-pulse" />
              <div className="h-9 w-24 rounded-2xl bg-white/15 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-28 rounded-3xl bg-white/95 shadow-[0_12px_34px_rgba(15,23,42,0.08)] animate-pulse" />
          <div className="h-28 rounded-3xl bg-white/95 shadow-[0_12px_34px_rgba(15,23,42,0.08)] animate-pulse" />
          <div className="h-28 rounded-3xl bg-white/95 shadow-[0_12px_34px_rgba(15,23,42,0.08)] animate-pulse" />
        </div>

        <div className="mt-4 h-64 rounded-3xl bg-white/95 shadow-[0_12px_34px_rgba(15,23,42,0.08)] animate-pulse" />

        <p className="mt-6 text-center text-sm text-slate-600">{message}</p>
      </div>
    </div>
  );
}
