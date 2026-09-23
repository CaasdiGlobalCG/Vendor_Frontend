// FILE: components/NewAuditorDashboard.jsx
// PURPOSE: Read-only vendor status overview (vendor portal side).
//          Auditor scheduling, results, and compliance actions are handled
//          in Employee_Main/auditor — NOT here.
// CONNECTS TO: /api/vendor/vendors

import React, { useEffect, useState } from 'react';
import config from '../config/env';

const STATUS_BADGE = {
  pending:                  'bg-warning/10 text-warning',
  in_review:                'bg-info/10 text-info',
  physical_kyc_scheduled:   'bg-surface-hover text-ink',
  physical_kyc_in_progress: 'bg-warning/10 text-warning',
  physical_kyc_review:      'bg-info/10 text-info',
  approved:                 'bg-success/10 text-success',
  rejected:                 'bg-danger/10 text-danger',
};

function statusLabel(s) {
  return (s || 'unknown').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function NewAuditorDashboard() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = () => {
    setLoading(true);
    fetch(`${config.VENDOR_BACKEND_URL}/api/vendor/vendors`)
      .then(r => r.json())
      .then(d => { setVendors(d.data || []); setError(null); })
      .catch(() => setError('Failed to load vendors.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-success border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-danger text-sm mb-3">{error}</p>
        <button onClick={load} className="px-4 py-2 bg-success text-white rounded-xl text-sm">Retry</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas font-[Poppins] p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-black px-6 py-5 rounded-2xl text-white mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Vendor Status Overview</h1>
            <p className="text-xs opacity-75 mt-1">
              Read-only — use the <strong>Employee Portal</strong> for auditor scheduling and compliance actions.
            </p>
          </div>
          <button onClick={load} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-medium transition">
            🔄 Refresh
          </button>
        </div>

        {vendors.length === 0 ? (
          <div className="text-center py-12 text-dim text-sm">No vendors found.</div>
        ) : (
          <div className="bg-surface rounded-2xl border border-line overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-canvas border-b border-line">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-dim uppercase tracking-wide">Vendor</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-dim uppercase tracking-wide">ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-dim uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-dim uppercase tracking-wide">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => {
                  const name = v.companyDetails?.companyName || v.vendorDetails?.companyName || v.name || 'Vendor';
                  const id   = v.vendorId || v._id || '—';
                  const date = v.createdAt ? new Date(v.createdAt).toLocaleDateString() : '—';
                  const badgeCls = STATUS_BADGE[v.status] || 'bg-surface-hover text-ink';
                  return (
                    <tr key={id} className="border-b border-line hover:bg-canvas">
                      <td className="px-5 py-3 text-sm font-medium text-ink">{name}</td>
                      <td className="px-5 py-3 text-xs text-dim font-mono">{id}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeCls}`}>
                          {statusLabel(v.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-dim">{date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}