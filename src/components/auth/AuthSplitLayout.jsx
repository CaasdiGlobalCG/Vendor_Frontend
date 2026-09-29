// ============================================================
// FILE: components/auth/AuthSplitLayout.jsx
// PURPOSE: The shared split-immersive shell for the live login and signup screens.
//          Renders the black brand panel ONCE and never re-mounts it, so switching
//          between /login and /signup changes only the form — the panel stays put.
// CONNECTS TO: src/App.jsx (nests /login and /signup under this layout inside
//              PreAuthContent), react-router-dom <Outlet />, assets/Platform-white-crop.png,
//              main.css (.auth-rise-left / .auth-fade / .auth-draw).
//
// The panel follows the approved "Split immersive" design: a full-height black half at 55%
// carrying the wordmark and all five brand slides, the form in a narrower right column.
// The slides are listed statically — the rotating carousel and its `setInterval` were removed
// from the pages when this layout took over the panel, as agreed.
//
// SLIDE COPY is the app's own `carouselItems` array, moved here verbatim from
// Login.jsx:22-43 / SignUp.jsx:13-34 (it was duplicated in both). Do not edit the strings.
// ============================================================

import { Outlet } from 'react-router-dom';
import operonWordmark from '../../assets/Platform-white-crop.png';

/** The five brand slides, verbatim from the pages' former `carouselItems`. */
const CAROUSEL_ITEMS = [
  {
    title: 'Stay in Control',
    description: 'Track progress, monitor performance, and ensure quality with our smart dashboards.',
  },
  {
    title: 'Real-time Insights',
    description: 'Get instant visibility into your projects with live updates and detailed analytics.',
  },
  {
    title: 'Seamless Collaboration',
    description: 'Work together with your team effortlessly with integrated communication tools.',
  },
  {
    title: 'Powerful Analytics',
    description: 'Leverage data-driven insights to make better business decisions faster.',
  },
  {
    title: 'Complete Integration',
    description: 'Connect all your tools and workflows in one unified platform.',
  },
];

/** The eyebrow beside the wordmark. Same string AuthBrandPanel.jsx:31 shows. */
const PORTAL_LABEL = 'Vendor and Client Portal';

/**
 * The black brand half. Rendered by the layout, so navigating between /login and /signup
 * does not re-mount it and its entrance plays only once.
 */
function BrandPanel() {
  return (
    <div className="auth-rise-left hidden w-[55%] shrink-0 flex-col justify-between bg-black p-10 text-white lg:flex xl:p-14">
      <div className="flex items-center justify-between gap-4">
        <img src={operonWordmark} alt="Operon" className="h-6 w-auto" />
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/55">
          {PORTAL_LABEL}
        </p>
      </div>

      <div className="max-w-[36ch]">
        <div className="mt-6">
          {CAROUSEL_ITEMS.map((item, index) => (
            <div
              key={item.title}
              className="auth-fade border-t border-white/10 py-4"
              style={{ animationDelay: `${140 + index * 70}ms` }}
            >
              <p className="font-mono text-[10px] tracking-[0.18em] text-white/55">
                {String(index + 1).padStart(2, '0')}
              </p>
              <p className="mt-1.5 text-sm font-medium">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-white/70">{item.description}</p>
            </div>
          ))}
          <div className="auth-draw border-t border-white/10" style={{ animationDelay: '500ms' }} />
        </div>
      </div>
    </div>
  );
}

/**
 * The shared split page. The right column owns the padding and the narrow measure, so the
 * pages render only their own form content.
 */
export default function AuthSplitLayout() {
  return (
    <div className="flex min-h-[100dvh] bg-canvas text-ink">
      <BrandPanel />

      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 lg:px-14">
        <div className="w-full max-w-[24rem]">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
