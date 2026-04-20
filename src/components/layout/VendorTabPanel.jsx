import React from 'react';

export default function VendorTabPanel({
  title,
  description,
  actions,
  children,
  className = '',
  bodyClassName = ''
}) {
  const sectionClassName = [
    'w-full flex-grow min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] lg:w-2/3 lg:rounded-[28px]',
    className,
  ].filter(Boolean).join(' ');

  const bodyClasses = [bodyClassName].filter(Boolean).join(' ');

  return (
    <section className={sectionClassName}>
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 py-4 sm:px-6 sm:py-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">{actions}</div> : null}
      </div>
      <div className={bodyClasses}>{children}</div>
    </section>
  );
}