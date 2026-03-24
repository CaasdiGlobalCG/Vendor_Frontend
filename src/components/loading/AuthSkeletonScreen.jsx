import React from 'react';

/**
 * AuthSkeletonScreen
 * Minimal full-page skeleton for auth/guard transitions to avoid spinner flashes.
 */
export default function AuthSkeletonScreen({ message = 'Loading your workspace...' }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_420px_at_8%_-10%,rgba(24,129,104,0.16),transparent_60%),radial-gradient(900px_300px_at_95%_0%,rgba(16,44,39,0.12),transparent_55%),#f4f7f6] px-4 py-5 md:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-[30px] border border-white/20 bg-[linear-gradient(100deg,rgba(11,103,83,0.88)_0%,rgba(24,41,37,0.86)_100%)] p-5 shadow-[0_24px_70px_rgba(7,25,20,0.24)] backdrop-blur-sm md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="h-8 w-14 rounded-2xl bg-white/28 animate-pulse" />
            <div className="hidden md:flex items-center gap-3">
              <div className="h-3 w-20 rounded-full bg-white/22 animate-pulse" />
              <div className="h-3 w-20 rounded-full bg-white/22 animate-pulse" />
              <div className="h-3 w-20 rounded-full bg-white/22 animate-pulse" />
              <div className="h-3 w-20 rounded-full bg-white/22 animate-pulse" />
            </div>
            <div className="h-9 w-36 rounded-2xl bg-white/18 animate-pulse" />
          </div>
          <div className="mt-10 flex items-end justify-between gap-4">
            <div className="space-y-3">
              <div className="h-4 w-44 rounded-full bg-white/24 animate-pulse" />
              <div className="h-3 w-56 rounded-full bg-white/18 animate-pulse" />
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="h-9 w-24 rounded-2xl bg-white/18 animate-pulse" />
              <div className="h-9 w-24 rounded-2xl bg-white/18 animate-pulse" />
              <div className="h-9 w-24 rounded-2xl bg-white/18 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-28 rounded-3xl border border-white/50 bg-white/72 shadow-[0_14px_32px_rgba(15,23,42,0.07)] backdrop-blur-md animate-pulse" />
          <div className="h-28 rounded-3xl border border-white/50 bg-white/72 shadow-[0_14px_32px_rgba(15,23,42,0.07)] backdrop-blur-md animate-pulse" />
          <div className="h-28 rounded-3xl border border-white/50 bg-white/72 shadow-[0_14px_32px_rgba(15,23,42,0.07)] backdrop-blur-md animate-pulse" />
        </div>

        <div className="mt-4 h-64 rounded-3xl border border-white/50 bg-white/72 shadow-[0_14px_32px_rgba(15,23,42,0.07)] backdrop-blur-md animate-pulse" />

        <p className="mt-6 text-center text-sm text-slate-600">{message}</p>
      </div>
    </div>
  );
}
