// FILE: services/additionalDocsApi.js
// PURPOSE: Vendor-facing API helpers for auditor-requested additional documents.
//          The auditor lists which extra documents are needed during KYC review;
//          the vendor uploads each item and the auditor resumes verification.
// CONNECTS TO: /api/vendor/additional-docs* (Vendor Backend), utils/authFetch.js

import authFetch from '../utils/authFetch';

const BASE = '/api/vendor/additional-docs';

/**
 * Fetches the current additional-document request for the logged-in vendor.
 * @returns {Promise<Object|null>} additionalDocRequest or null when none exists
 */
export async function getAdditionalDocRequest() {
  const res = await authFetch(BASE, { credentials: 'include' });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || 'Failed to fetch document request');
  return json?.data?.additionalDocRequest || null;
}

/**
 * Uploads the file for one requested document item.
 * @param {string} docId - the requested item's id (docreq_...)
 * @param {File} file
 * @returns {Promise<{item: Object, allSubmitted: boolean, additionalDocRequest: Object}>}
 */
export async function uploadAdditionalDocument(docId, file) {
  const formData = new FormData();
  formData.append('file', file);

  const token = localStorage.getItem('authToken');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}/${encodeURIComponent(docId)}`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || 'Upload failed');
  return json.data;
}
