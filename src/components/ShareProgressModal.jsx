import React, { useState } from 'react';



const ShareProgressModal = ({ open, onClose, workspaceLink }) => {
  const [emails, setEmails] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(workspaceLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);
    const emailList = emails.split(',').map(e => e.trim()).filter(Boolean);
    if (emailList.length === 0) {
      setError('Please enter at least one email address.');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/send-progress-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: emailList, workspaceLink })
      });
      if (res.ok) {
        setSuccess(true);
        setEmails('');
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to send email.');
      }
    } catch (err) {
      setError('Network error.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Share Progress</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Workspace Link</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={workspaceLink}
                readOnly
                className="border rounded px-2 py-1 w-full text-xs"
              />
              <button
                onClick={handleCopy}
                className="bg-emerald-500 text-white px-3 py-1 rounded"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Add Email Addresses</label>
            <input
              type="text"
              value={emails}
              onChange={e => setEmails(e.target.value)}
              placeholder="Enter emails, separated by commas"
              className="border rounded px-2 py-1 w-full text-xs bg-yellow-50"
            />
          </div>
          {error && <div className="text-red-500 text-xs mb-2">{error}</div>}
          {success && <div className="text-green-600 text-xs mb-2">Email sent successfully!</div>}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="bg-gray-300 px-3 py-1 rounded"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              className="bg-emerald-500 text-white px-3 py-1 rounded"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareProgressModal;
