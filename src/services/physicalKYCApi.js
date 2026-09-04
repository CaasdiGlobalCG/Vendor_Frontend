// FILE: services/physicalKYCApi.js
// PURPOSE: Vendor-facing API helpers for Physical KYC workflow (status, reschedule, checklist, evidence).
//          Auditor portal functions (OTP, portal data) moved to Employee_Main/auditor apiService.js.
// CONNECTS TO: /api/physical-kyc/* (Vendor Backend), utils/authFetch.js

import authFetch from '../utils/authFetch';

const BASE = '/api/physical-kyc';

function authHeaders() {
  const token = localStorage.getItem('authToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Gets vendor's physical KYC status, schedule, checklist and result.
 * @param {string} vendorId
 * @returns {Promise<{schedule, checklist, result}|null>}
 */
export async function getPhysicalKYCStatus(vendorId) {
  const res = await authFetch(
    `${BASE}/vendor/status${vendorId ? `?vendorId=${vendorId}` : ''}`,
    { credentials: 'include' }
  );
  if (!res.ok) throw new Error('Failed to fetch Physical KYC status');
  const json = await res.json();
  return json.data;
}

/**
 * Vendor requests a reschedule (max 2 allowed).
 * @param {string} vendorId
 * @param {string} scheduleId
 * @param {string} reason
 * @returns {Promise<{success: boolean}>}
 */
export async function requestReschedule(vendorId, scheduleId, reason) {
  const res = await authFetch(`${BASE}/vendor/reschedule`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify({ vendorId, scheduleId, reason }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Reschedule request failed');
  return json;
}

/**
 * Gets a specific checklist by ID (vendor reads their assigned checklist).
 * @param {string} checklistId
 * @returns {Promise<Object>}
 */
export async function getChecklist(checklistId) {
  const res = await authFetch(`${BASE}/checklist/${checklistId}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch checklist');
  const json = await res.json();
  return json.data;
}

/**
 * Uploads pre-visit evidence files from vendor side.
 * @param {string} vendorId
 * @param {string} scheduleId
 * @param {FileList|File[]} files
 * @param {function} onProgress - optional progress callback
 * @returns {Promise<Object[]>} uploaded file records
 */
export async function uploadEvidence(vendorId, scheduleId, files, onProgress) {
  const formData = new FormData();
  formData.append('vendorId', vendorId);
  formData.append('scheduleId', scheduleId);
  Array.from(files).forEach((file) => formData.append('files', file));

  const token = localStorage.getItem('authToken');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/evidence`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Upload failed');
  return json.data;
}

