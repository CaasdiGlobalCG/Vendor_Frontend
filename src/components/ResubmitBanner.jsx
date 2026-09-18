// Banner shown at the top of each KYC form while the vendor record is in
// 'resubmit_requested' status. Tells the vendor which sections the auditor
// granted re-edit access to and whether the current section is editable.

import React, { useContext } from 'react';
import { VendorContext } from '../context/VendorContext';
import {
  isResubmitMode,
  isSectionEditable,
  getGrantedResubmitSections,
  RESUBMIT_SECTION_LABELS,
} from '../utils/resubmitPermissions';

export default function ResubmitBanner({ sectionKey }) {
  const { currentUser } = useContext(VendorContext);

  if (!isResubmitMode(currentUser)) return null;

  const granted = getGrantedResubmitSections(currentUser);
  const editableHere = isSectionEditable(currentUser, sectionKey);
  const remarks = currentUser?.resubmitRemarks;

  return (
    <div
      className={`mb-8 rounded-lg border p-4 ${
        editableHere
          ? 'bg-amber-50 border-amber-200'
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      <p className="text-sm font-semibold text-amber-800">
        The auditor has requested changes to your submission.
      </p>
      {remarks && (
        <p className="mt-1 text-xs text-gray-600">
          <span className="font-medium">Auditor note:</span> {remarks}
        </p>
      )}
      <p className="mt-2 text-xs text-gray-600">
        You can edit:{' '}
        <span className="font-semibold text-gray-800">
          {granted.map((key) => RESUBMIT_SECTION_LABELS[key] || key).join(', ') || '—'}
        </span>
        .{' '}
        {editableHere
          ? 'This section is editable — make the required changes and resubmit on the last step.'
          : 'This section is read-only.'}
      </p>
    </div>
  );
}
