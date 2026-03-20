import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RowActionsDropdown from '../components/RowActionsDropdown';

const API = 'http://localhost:8000/api';

const badge = (text, color) => (
  <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${color}`}>{text}</span>
);

const statusBadge = (status) => {
  const colors = {
    pending:    'bg-yellow-100 text-yellow-800',
    authorized: 'bg-green-100 text-green-800',
    declined:   'bg-red-100 text-red-800',
    approved:   'bg-green-100 text-green-800',
    rejected:   'bg-red-100 text-red-800',
  };
  return badge(status || 'unknown', colors[status] || 'bg-gray-100 text-gray-700');
};

const AuthorizerDashboard = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending');

  // Modal state
  const [modal, setModal] = useState(null); // { type: 'authorize'|'decline'|'appeal', requestId }
  const [notes, setNotes] = useState('');
  const [appealDecision, setAppealDecision] = useState('approved');
  const [submitting, setSubmitting] = useState(false);

  // Document viewer state
  const [docModal, setDocModal] = useState(null); // { req, docs: string[] }
  const [activeDoc, setActiveDoc] = useState(null); // { filename, blobUrl, type } | { filename, error }
  const [docLoading, setDocLoading] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/authorization/`, { headers });
      if (res.ok) {
        setRequests(await res.json());
      } else {
        setError('Failed to load authorization requests');
      }
    } catch {
      setError('Failed to load authorization requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (!['authorizer', 'superuser'].includes(role)) {
      navigate('/dashboard');
      return;
    }
    fetchRequests();
  }, [navigate]);

  const filtered = requests.filter(r => {
    if (activeTab === 'pending')    return r.status === 'pending';
    if (activeTab === 'authorized') return r.status === 'authorized';
    if (activeTab === 'declined')   return r.status === 'declined';
    if (activeTab === 'appeals')    return r.appeal && r.appeal.status === 'pending';
    return true;
  });

  const counts = {
    pending:    requests.filter(r => r.status === 'pending').length,
    authorized: requests.filter(r => r.status === 'authorized').length,
    declined:   requests.filter(r => r.status === 'declined').length,
    appeals:    requests.filter(r => r.appeal && r.appeal.status === 'pending').length,
  };

  const handleAuthorize = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/authorization/${modal.requestId}/authorize`, {
        method: 'POST', headers,
        body: JSON.stringify({ authorizer_notes: notes }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.detail || 'Failed to authorize'); return; }
      setModal(null); setNotes('');
      fetchRequests();
    } finally { setSubmitting(false); }
  };

  const handleDecline = async () => {
    if (!notes.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/authorization/${modal.requestId}/decline`, {
        method: 'POST', headers,
        body: JSON.stringify({ authorizer_notes: notes }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.detail || 'Failed to decline'); return; }
      setModal(null); setNotes('');
      fetchRequests();
    } finally { setSubmitting(false); }
  };

  const handleReviewAppeal = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/authorization/appeals/${modal.appealId}/review`, {
        method: 'POST', headers,
        body: JSON.stringify({ decision: appealDecision, reviewed_notes: notes }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.detail || 'Failed to review appeal'); return; }
      setModal(null); setNotes('');
      fetchRequests();
    } finally { setSubmitting(false); }
  };

  const fetchDoc = async (filename) => {
    setDocLoading(true);
    setActiveDoc(null);
    try {
      const res = await fetch(`${API}/authorization/documents/${filename}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setActiveDoc({ filename, blobUrl, type: blob.type });
    } catch {
      setActiveDoc({ filename, error: true });
    } finally {
      setDocLoading(false);
    }
  };

  const openDocModal = (req) => {
    const docs = req.proof_documents
      ? req.proof_documents.split(',').map(d => d.trim()).filter(Boolean)
      : [];
    setDocModal({ req, docs });
    if (docs.length > 0) fetchDoc(docs[0]);
  };

  const closeDocModal = () => {
    if (activeDoc?.blobUrl) URL.revokeObjectURL(activeDoc.blobUrl);
    setDocModal(null);
    setActiveDoc(null);
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString() : '-';
  const isOverdue = (d) => d && new Date(d) < new Date();

  const tabs = [
    { key: 'all',        label: `All (${requests.length})` },
    { key: 'pending',    label: `Pending (${counts.pending})` },
    { key: 'appeals',    label: `Appeals (${counts.appeals})` },
    { key: 'authorized', label: `Authorized (${counts.authorized})` },
    { key: 'declined',   label: `Declined (${counts.declined})` },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Authorization Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Review and authorize booking requests</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-3 text-sm rounded">{error}</div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Pending', count: counts.pending, color: 'text-yellow-600' },
          { label: 'Pending Appeals', count: counts.appeals, color: 'text-orange-600' },
          { label: 'Authorized', count: counts.authorized, color: 'text-green-600' },
          { label: 'Declined', count: counts.declined, color: 'text-red-600' },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.count}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-4">
          <nav className="flex gap-1 -mb-px">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No requests in this category.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    {['Booking', 'Reason', 'Deadline', 'Status', 'Auto-flagged', 'Requester', 'Proof', 'Appeal', ''].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filtered.map(req => (
                    <tr
                      key={req.id}
                      onClick={() => { if (req.status === 'pending') { setModal({ type: 'authorize', requestId: req.id }); setNotes(''); } }}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${req.status === 'pending' ? 'cursor-pointer' : ''}`}
                    >
                      <td className="py-2 px-3">
                        <p className="font-medium text-gray-900 dark:text-white text-xs">{req.booking_name || `#${req.booking_id}`}</p>
                        <p className="text-xs text-gray-400">ID {req.booking_id}</p>
                      </td>
                      <td className="py-2 px-3 max-w-[200px]">
                        <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">{req.reason}</p>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-xs ${isOverdue(req.deadline) ? 'text-red-600 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                          {fmt(req.deadline)}
                          {isOverdue(req.deadline) && ' ⚠'}
                        </span>
                      </td>
                      <td className="py-2 px-3">{statusBadge(req.status)}</td>
                      <td className="py-2 px-3">
                        {req.auto_flagged
                          ? badge('auto', 'bg-orange-100 text-orange-700')
                          : badge('manual', 'bg-gray-100 text-gray-600')}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-600 dark:text-gray-400">{req.requester_email || '-'}</td>
                      <td className="py-2 px-3">
                        {req.proof_documents
                          ? <span className="text-xs text-gray-600 dark:text-gray-400">{req.proof_documents.split(',').filter(Boolean).length} doc(s)</span>
                          : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="py-2 px-3">
                        {req.appeal ? statusBadge(req.appeal.status) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <RowActionsDropdown actions={[
                          { label: `View Proof (${req.proof_documents ? req.proof_documents.split(',').filter(Boolean).length : 0})`, onClick: () => openDocModal(req), show: !!req.proof_documents },
                          { label: 'Authorize', onClick: () => { setModal({ type: 'authorize', requestId: req.id }); setNotes(''); }, show: req.status === 'pending', variant: 'primary' },
                          { label: 'Decline', onClick: () => { setModal({ type: 'decline', requestId: req.id }); setNotes(''); }, show: req.status === 'pending', variant: 'danger' },
                          { label: 'Review Appeal', onClick: () => { setModal({ type: 'appeal', requestId: req.id, appealId: req.appeal?.id }); setNotes(''); setAppealDecision('approved'); }, show: !!(req.appeal && req.appeal.status === 'pending') },
                        ]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Document Viewer Modal */}
      {docModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl mt-8 mb-8">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Proof Documents — {docModal.req.booking_name || `Booking #${docModal.req.booking_id}`}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {docModal.docs.length} file{docModal.docs.length !== 1 ? 's' : ''} attached
                </p>
              </div>
              <button onClick={closeDocModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl font-bold leading-none">×</button>
            </div>

            <div className="flex" style={{ minHeight: '520px' }}>
              {/* Sidebar — only shown if multiple files */}
              {docModal.docs.length > 1 && (
                <div className="w-52 border-r border-gray-200 dark:border-gray-700 p-3 flex-shrink-0">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 px-1">Files</p>
                  {docModal.docs.map((doc, i) => {
                    const label = doc.replace(/^\d+_/, '').replace(/_/g, ' ');
                    const isActive = activeDoc?.filename === doc;
                    return (
                      <button
                        key={i}
                        onClick={() => fetchDoc(doc)}
                        className={`w-full text-left text-xs px-2 py-2 rounded mb-1 truncate ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-400'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        title={doc}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Preview pane */}
              <div className="flex-1 p-4 flex flex-col items-center justify-center">
                {docLoading && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading document…</p>
                )}

                {!docLoading && activeDoc && !activeDoc.error && (() => {
                  const isImage = activeDoc.type?.startsWith('image/');
                  const isPdf   = activeDoc.type === 'application/pdf';
                  return (
                    <div className="w-full h-full flex flex-col items-center gap-3">
                      {isImage && (
                        <img
                          src={activeDoc.blobUrl}
                          alt={activeDoc.filename}
                          className="max-w-full max-h-[520px] object-contain rounded shadow"
                        />
                      )}
                      {isPdf && (
                        <iframe
                          src={activeDoc.blobUrl}
                          title={activeDoc.filename}
                          className="w-full rounded border border-gray-200 dark:border-gray-700"
                          style={{ height: '520px' }}
                        />
                      )}
                      {!isImage && !isPdf && (
                        <div className="text-center">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{activeDoc.filename}</p>
                          <a
                            href={activeDoc.blobUrl}
                            download={activeDoc.filename}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Download File
                          </a>
                        </div>
                      )}
                      {/* Filename + download link below preview */}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="truncate max-w-xs">{activeDoc.filename}</span>
                        <a
                          href={activeDoc.blobUrl}
                          download={activeDoc.filename}
                          className="text-blue-600 hover:underline flex-shrink-0"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  );
                })()}

                {!docLoading && activeDoc?.error && (
                  <p className="text-sm text-red-500">Failed to load document. It may have been removed.</p>
                )}

                {!docLoading && !activeDoc && docModal.docs.length === 0 && (
                  <p className="text-sm text-gray-400">No documents attached to this request.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            {modal.type === 'authorize' && (
              <>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Authorize Request</h2>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="Add authorization notes…"
                />
                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                  <button onClick={handleAuthorize} disabled={submitting} className="px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">
                    {submitting ? 'Saving…' : 'Confirm Authorization'}
                  </button>
                </div>
              </>
            )}

            {modal.type === 'decline' && (
              <>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Decline Request</h2>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for declining <span className="text-red-500">*</span></label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="Explain why this request is declined…"
                />
                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                  <button onClick={handleDecline} disabled={submitting || !notes.trim()} className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50">
                    {submitting ? 'Saving…' : 'Decline Request'}
                  </button>
                </div>
              </>
            )}

            {modal.type === 'appeal' && (
              <>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Review Appeal</h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Decision</label>
                  <div className="flex gap-4">
                    {['approved', 'rejected'].map(d => (
                      <label key={d} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value={d}
                          checked={appealDecision === d}
                          onChange={() => setAppealDecision(d)}
                        />
                        <span className="text-sm capitalize text-gray-700 dark:text-gray-300">{d}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="Add review notes…"
                />
                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
                  <button onClick={handleReviewAppeal} disabled={submitting} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                    {submitting ? 'Saving…' : 'Submit Review'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorizerDashboard;
