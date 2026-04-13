import React from 'react';

/**
 * AuthSkeletonScreen
 * Sleek full-page loading screen with animated gradient and smooth spinner.
 */
export default function AuthSkeletonScreen({ message = 'Loading your workspace...' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0a2e26] via-[#0d3f33] to-[#061a15] relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#14b8a6]/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#0f766e]/10 blur-[100px] pointer-events-none" />

      {/* Logo / Brand mark */}
      <div className="relative mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#14b8a6] to-[#0f766e] flex items-center justify-center shadow-lg shadow-teal-900/40">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>

      {/* Spinner ring */}
      <div className="relative mb-8">
        <div
          className="w-12 h-12 rounded-full border-[3px] border-white/10"
          style={{ borderTopColor: '#14b8a6', animation: 'authSpin 0.9s linear infinite' }}
        />
        <div
          className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent"
          style={{ borderBottomColor: '#0f766e', animation: 'authSpin 1.4s linear infinite reverse' }}
        />
      </div>

      {/* Message */}
      <p
        className="text-white/70 text-sm font-medium tracking-wide"
        style={{ animation: 'authFadeIn 0.6s ease-out' }}
      >
        {message}
      </p>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5 mt-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-teal-400/60"
            style={{
              animation: 'authDotPulse 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes authSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes authFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes authDotPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
