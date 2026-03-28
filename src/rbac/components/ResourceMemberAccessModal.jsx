import React, { useEffect, useMemo, useState } from 'react';

export default function ResourceMemberAccessModal({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceLabel,
  loadAccess,
  saveAccess,
  onSaved,
}) {
  const [members, setMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [initialSelectedIds, setInitialSelectedIds] = useState(new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const title = resourceType === 'workspace' ? 'Workspace Access' : 'Project Access';

  useEffect(() => {
    if (!isOpen || !resourceId) return;

    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await loadAccess(resourceId);
        if (cancelled) return;

        const loadedMembers = Array.isArray(data?.members) ? data.members : [];
        const selected = new Set(
          loadedMembers.filter((member) => member?.hasAccess).map((member) => member.userId)
        );

        setMembers(loadedMembers);
        setSelectedIds(selected);
        setInitialSelectedIds(new Set(selected));
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || `Failed to load ${resourceType} access`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isOpen, resourceId, resourceType, loadAccess]);

  const filteredMembers = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return members;
    return members.filter((member) => {
      const email = String(member?.email || '').toLowerCase();
      const role = String(member?.roleName || '').toLowerCase();
      return email.includes(text) || role.includes(text);
    });
  }, [members, query]);

  const selectedCount = selectedIds.size;

  const toggleMember = (userId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      const addUserIds = [...selectedIds].filter((userId) => !initialSelectedIds.has(userId));
      const removeUserIds = [...initialSelectedIds].filter((userId) => !selectedIds.has(userId));

      if (addUserIds.length === 0 && removeUserIds.length === 0) {
        onClose();
        return;
      }

      await saveAccess(resourceId, {
        addUserIds,
        removeUserIds,
      });

      if (onSaved) onSaved({ addUserIds, removeUserIds });
      onClose();
    } catch (err) {
      setError(err?.message || `Failed to update ${resourceType} access`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {resourceLabel || resourceId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[65vh] overflow-y-auto">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email or role"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            <span className="text-xs text-gray-600 whitespace-nowrap">
              Selected: {selectedCount}
            </span>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500 py-8 text-center">Loading members...</div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-sm text-gray-500 py-8 text-center">No members found.</div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Access</th>
                    <th className="px-4 py-2 text-left font-medium">Email</th>
                    <th className="px-4 py-2 text-left font-medium">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredMembers.map((member) => {
                    const checked = selectedIds.has(member.userId);
                    const disabled = member.roleId === 'super_admin' || member.roleId === 'admin';
                    return (
                      <tr key={member.userId} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleMember(member.userId)}
                            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                        </td>
                        <td className="px-4 py-2 text-gray-800">{member.email || '—'}</td>
                        <td className="px-4 py-2 text-gray-600">
                          {member.roleName || member.roleId || '—'}
                          {disabled ? (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Auto full access
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 text-sm disabled:opacity-60"
            disabled={saving || loading}
          >
            {saving ? 'Saving...' : 'Save Access'}
          </button>
        </div>
      </div>
    </div>
  );
}