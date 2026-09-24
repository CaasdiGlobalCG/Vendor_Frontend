import React, { useContext, useMemo, useState } from 'react';
import { Share2, Link2, Eye, PencilLine, Globe, X } from 'lucide-react';
import { VendorContext } from '../context/VendorContext';

const PERMISSION_OPTIONS = [
  {
    value: 'view',
    label: 'View only',
    description: 'Invited people can open and view the workspace',
    icon: Eye,
  },
  {
    value: 'edit',
    label: 'Can edit',
    description: 'Invited people can make changes on the canvas',
    icon: PencilLine,
  },
  {
    value: 'anyone_edit',
    label: 'Anyone with the link can edit',
    description: 'Anyone who opens the link gets edit access',
    icon: Globe,
  },
];

const ShareProgressModal = ({ open, isOpen, onClose, workspaceLink, workspace, userRole }) => {
  const { currentUser } = useContext(VendorContext);
  const [emails, setEmails] = useState('');
  const [permission, setPermission] = useState('view');
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const visible = open || isOpen;

  const senderName = currentUser?.name || currentUser?.email || 'A project manager';
  const workspaceName = workspace?.name || workspace?.projectName || 'Workspace';

  const shareLink = useMemo(() => {
    const base = workspaceLink || `${window.location.origin}${window.location.pathname}`;
    const params = new URLSearchParams({
      shared: '1',
      permission,
      sharedBy: senderName,
    });
    return `${base}?${params.toString()}`;
  }, [workspaceLink, permission, senderName]);

  if (!visible) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    setError('');
    setSuccess(false);
    const emailList = emails.split(',').map(e => e.trim()).filter(Boolean);
    if (emailList.length === 0) {
      setError('Please enter at least one email address.');
      return;
    }
    const invalid = emailList.filter(e => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (invalid.length > 0) {
      setError(`Invalid email: ${invalid[0]}`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/send-progress-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: emailList,
          workspaceLink: shareLink,
          note: note.trim(),
          permission,
          senderName,
          workspaceName,
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccess(true);
        setEmails('');
        setNote('');
      } else {
        setError(data.message || 'Failed to send email.');
      }
    } catch (err) {
      setError('Network error — could not send email.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-line">
        {/* Header */}
        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-info/10 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-info" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">Share Progress</h2>
              <p className="text-xs text-dim">{workspaceName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-hover rounded-full transition-colors">
            <X className="w-4 h-4 text-dim" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Email input */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Invite by email</label>
            <input
              type="text"
              value={emails}
              onChange={e => setEmails(e.target.value)}
              placeholder="name@company.com, another@company.com"
              className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-info"
            />
          </div>

          {/* Permission picker */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Access level</label>
            <div className="space-y-1.5">
              {PERMISSION_OPTIONS.map(({ value, label, description, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPermission(value)}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    permission === value
                      ? 'border-info bg-info/10'
                      : 'border-line hover:bg-canvas'
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${permission === value ? 'text-info' : 'text-dim'}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${permission === value ? 'text-info' : 'text-ink'}`}>{label}</p>
                    <p className="text-xs text-dim">{description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Note <span className="text-dim font-normal">(optional)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a message for the recipient..."
              rows={3}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm bg-surface text-ink resize-none focus:outline-none focus:ring-2 focus:ring-info"
            />
          </div>

          {/* Link preview */}
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Workspace link</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1.5 px-2.5 py-2 border border-line rounded-lg bg-canvas min-w-0">
                <Link2 className="w-3.5 h-3.5 text-dim flex-shrink-0" />
                <span className="text-xs text-dim truncate">{shareLink}</span>
              </div>
              <button
                onClick={handleCopy}
                className="px-3 py-2 text-xs font-medium bg-surface-hover text-ink rounded-lg hover:bg-line transition-colors flex-shrink-0"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {error && <p className="text-danger text-xs">{error}</p>}
          {success && <p className="text-success text-xs">Invite sent — the recipient will be emailed the workspace link.</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-canvas border-t border-line flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-ink bg-surface border border-line rounded-lg hover:bg-surface-hover transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            className="px-4 py-2 text-sm font-medium bg-info text-white rounded-lg hover:bg-info/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            disabled={loading}
          >
            <Share2 className="w-4 h-4" />
            {loading ? 'Sending...' : 'Send invite'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareProgressModal;
