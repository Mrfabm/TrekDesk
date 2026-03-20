import { useState } from 'react';
import RowActionsDropdown from '../components/RowActionsDropdown';

/**
 * Shared booking actions hook.
 * Contains all modal state, API handlers, and getActionButton logic.
 * Used by Bookings.jsx, ViewBookings2.jsx, ViewBookings3.jsx.
 *
 * @param {function} navigate - from useNavigate()
 * @param {function} refreshData - callback to re-fetch bookings after an action
 */
export function useBookingActions(navigate, refreshData) {
  const role = localStorage.getItem('role');

  // Auth request modal
  const [authModal, setAuthModal] = useState(null);
  const [authReason, setAuthReason] = useState('');
  const [authFiles, setAuthFiles] = useState([]);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  // Appeal modal
  const [appealModal, setAppealModal] = useState(null);
  const [appealNotes, setAppealNotes] = useState('');
  const [appealFiles, setAppealFiles] = useState([]);
  const [appealSubmitting, setAppealSubmitting] = useState(false);

  // Proof upload modal
  const [uploadModal, setUploadModal] = useState(null);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  // Amendment modal
  const [amendModal, setAmendModal] = useState(null);
  const [amendDate, setAmendDate] = useState('');
  const [amendReason, setAmendReason] = useState('');
  const [amendSubmitting, setAmendSubmitting] = useState(false);

  // Cancellation modal
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Request details modal
  const [detailsModal, setDetailsModal] = useState(null);
  const [detailsMessage, setDetailsMessage] = useState('');
  const [detailsSubmitting, setDetailsSubmitting] = useState(false);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleRequestAuthorization = async () => {
    if (!authReason.trim()) return;
    setAuthSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/authorization/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ booking_id: authModal.bookingId, reason: authReason, deadline_days: 7 }),
      });
      const data = await res.json();
      if (!res.ok) { setAuthMessage(data.detail || 'Failed to submit request'); return; }
      if (authFiles.length > 0) {
        const fd = new FormData();
        authFiles.forEach(f => fd.append('files', f));
        await fetch(`http://localhost:8000/api/authorization/${data.id}/upload-proof`, {
          method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd,
        });
      }
      setAuthModal(null); setAuthReason(''); setAuthFiles([]);
      setAuthMessage(`Authorization request submitted for "${authModal.bookingName}".`);
      refreshData();
    } finally { setAuthSubmitting(false); }
  };

  const handleSubmitAppeal = async () => {
    if (!appealNotes.trim()) return;
    setAppealSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/authorization/${appealModal.requestId}/appeal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ appeal_notes: appealNotes }),
      });
      const data = await res.json();
      if (res.ok) {
        if (appealFiles.length > 0) {
          const fd = new FormData();
          for (const f of appealFiles) fd.append('files', f);
          await fetch(`http://localhost:8000/api/authorization/${appealModal.requestId}/upload-appeal-proof`, {
            method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd,
          });
        }
        setAppealModal(null); setAppealNotes(''); setAppealFiles([]);
        setAuthMessage(`Appeal submitted for "${appealModal.bookingName}".`);
        refreshData();
      } else {
        setAuthMessage(data.detail || 'Failed to submit appeal.');
      }
    } finally { setAppealSubmitting(false); }
  };

  const handleUploadProof = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true); setUploadMessage('');
    try {
      const formData = new FormData();
      for (const file of uploadFiles) formData.append('files', file);
      const res = await fetch(`http://localhost:8000/api/authorization/${uploadModal.requestId}/upload-proof`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadMessage(`${data.uploaded?.length || uploadFiles.length} file(s) uploaded successfully.`);
        setUploadFiles([]);
        setTimeout(() => { setUploadModal(null); setUploadMessage(''); }, 1800);
      } else {
        setUploadMessage(data.detail || 'Upload failed');
      }
    } catch { setUploadMessage('Upload failed. Please try again.'); }
    finally { setUploading(false); }
  };

  const handleRequestDetails = async () => {
    if (!detailsMessage.trim()) return;
    setDetailsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/bookings/${detailsModal.bookingId}/request-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ message: detailsMessage }),
      });
      if (res.ok) {
        setDetailsModal(null); setDetailsMessage('');
        setAuthMessage(`Details requested for "${detailsModal.bookingName}".`);
      }
    } finally { setDetailsSubmitting(false); }
  };

  const handleAmendmentRequest = async () => {
    if (!amendDate || !amendReason.trim()) return;
    setAmendSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/amendments/request/${amendModal.bookingId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested_date: amendDate, reason: amendReason }),
      });
      if (res.ok) {
        const data = await res.json();
        setAuthMessage(`Amendment requested for "${amendModal.bookingName}". Fee: $${data.fee_amount?.toFixed(2)} (${data.fee_type?.replace(/_/g, ' ')})`);
        setAmendModal(null); refreshData();
      } else {
        const err = await res.json();
        setAuthMessage(err.detail || 'Failed to submit amendment');
      }
    } catch { setAuthMessage('Failed to submit amendment request'); }
    finally { setAmendSubmitting(false); }
  };

  const handleCancellationRequest = async () => {
    if (!cancelReason.trim()) return;
    setCancelSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/cancellations/request/${cancelModal.bookingId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      if (res.ok) {
        setAuthMessage(`Cancellation request submitted for "${cancelModal.bookingName}". Note: bookings are non-refundable.`);
        setCancelModal(null); refreshData();
      } else {
        const err = await res.json();
        setAuthMessage(err.detail || 'Failed to submit cancellation');
      }
    } catch { setAuthMessage('Failed to submit cancellation request'); }
    finally { setCancelSubmitting(false); }
  };

  const handleSendPaymentRequest = async (bookingId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/bookings/${bookingId}/payment-request`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      });
      if (response.ok) { alert('Payment request sent successfully'); }
      else { throw new Error('Failed to send payment request'); }
    } catch { alert('Failed to send payment request'); }
  };

  const handlePurchasePermits = async (bookingId, purchaseType) => {
    try {
      const response = await fetch(`http://localhost:8000/api/bookings/${bookingId}/purchase-permits`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchase_type: purchaseType }),
      });
      if (response.ok) { alert(`Permits purchased (${purchaseType.replace(/_/g, ' ')})`); refreshData(); }
      else { const err = await response.json(); alert(err.detail || 'Failed to purchase permits'); }
    } catch { alert('Failed to purchase permits'); }
  };

  const handleSendToFinance = async (bookingId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/bookings/${bookingId}/send-to-finance`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) { refreshData(); }
      else { const err = await response.json(); alert(`Error: ${err.detail || 'Failed to send to finance'}`); }
    } catch { alert('Failed to send to finance. Please try again.'); }
  };

  const handleRejectBooking = async (bookingId) => {
    if (!window.confirm('Reject this booking?')) return;
    try {
      const response = await fetch(`http://localhost:8000/api/bookings/${bookingId}/reject`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) { refreshData(); }
      else { const err = await response.json(); alert(`Error: ${err.detail || 'Failed to reject booking'}`); }
    } catch { alert('Failed to reject booking. Please try again.'); }
  };

  const handleRequestConfirmation = async (bookingId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/bookings/${bookingId}/request-confirmation`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) { refreshData(); }
      else { console.error('Failed to request confirmation:', await response.json()); }
    } catch (error) { console.error('Failed to request confirmation:', error); }
  };

  const handleConfirmBooking = async (bookingId) => {
    if (!window.confirm('Confirm this booking?')) return;
    try {
      const response = await fetch(`http://localhost:8000/api/bookings/${bookingId}/confirm`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (response.ok) { refreshData(); }
      else { const err = await response.json(); alert(err.detail || 'Failed to confirm booking'); }
    } catch { alert('Failed to confirm booking. Please try again.'); }
  };

  // ── Action Button Builder ────────────────────────────────────────────────────

  const PERMIT_URL = 'https://www.gorilla-permit.com/';

  const passportsIncomplete = (row) =>
    row.status !== 'provisional' &&
    row.payment_status !== 'cancelled' &&
    (row.passport_count || 0) < (row.number_of_people || 0);

  const managePassportsAction = (row) => ({
    label: `Manage Passports (${row.passport_count || 0}/${row.number_of_people || 0})`,
    onClick: () => { localStorage.setItem('activeBookingId', row.id); navigate('/passport-management'); }
  });

  const statusChip = (text, cls) => (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{text}</span>
  );

  const getActionButton = (row) => {
    if (role === 'finance_admin') {
      if (row.payment_status === 'fully_paid') return statusChip('Fully Paid ✓', 'bg-green-50 text-green-700');
      const finLabel = row.payment_status === 'pending' ? 'Validate Payment' : 'Update Payment';
      return (
        <RowActionsDropdown label={finLabel} actions={[
          { label: finLabel, onClick: () => navigate(`/finance/validate/${row.id}`), variant: 'primary' }
        ]} />
      );
    }

    if (role === 'admin') {
      if (row.status === 'provisional') {
        return <RowActionsDropdown label="Review Booking" actions={[
          { label: 'Reject', onClick: () => handleRejectBooking(row.id), variant: 'danger' }
        ]} />;
      }
      if (row.status === 'requested') {
        return <RowActionsDropdown label="Confirm or Reject" actions={[
          { label: 'Confirm Booking', onClick: () => handleConfirmBooking(row.id), variant: 'primary' },
          { label: 'Send to Finance', onClick: () => handleSendToFinance(row.id) },
          { label: 'Reject', onClick: () => handleRejectBooking(row.id), variant: 'danger' }
        ]} />;
      }
      if (row.validation_status) {
        const authPending = row.authorization_status === 'pending';
        const authAuthorized = row.authorization_status === 'authorized';
        const actions = [];
        let primaryLabel;

        if (row.validation_status === 'ok_to_purchase_full') {
          primaryLabel = 'Purchase Permits (Full)';
          actions.push({ label: 'Go to Permit Site →', onClick: () => window.open(PERMIT_URL, '_blank') });
          actions.push({ label: 'Mark as Purchased (Full)', onClick: () => handlePurchasePermits(row.id, 'full'), variant: 'primary' });
        } else if (row.validation_status === 'ok_to_purchase_deposit') {
          primaryLabel = 'Purchase Permits (Deposit)';
          actions.push({ label: 'Go to Permit Site →', onClick: () => window.open(PERMIT_URL, '_blank') });
          actions.push({ label: 'Mark as Purchased (Deposit)', onClick: () => handlePurchasePermits(row.id, 'deposit'), variant: 'primary' });
        } else if (row.validation_status === 'do_not_purchase') {
          if (authAuthorized) {
            primaryLabel = 'Purchase Permits (Auth)';
            actions.push({ label: 'Go to Permit Site →', onClick: () => window.open(PERMIT_URL, '_blank') });
            actions.push({ label: 'Mark as Purchased (Auth)', onClick: () => handlePurchasePermits(row.id, 'authorization'), variant: 'primary' });
          } else {
            primaryLabel = authPending ? 'Auth Pending' : 'Send Payment Request';
            if (!authPending) {
              actions.push({ label: 'Send Payment Request', onClick: () => handleSendPaymentRequest(row.id) });
            }
          }
        } else {
          primaryLabel = authPending ? 'Auth Pending' : 'Manage Booking';
        }

        if (!authPending && !authAuthorized) {
          actions.push({ label: 'Request Authorization', onClick: () => { setAuthModal({ bookingId: row.id, bookingName: row.booking_name }); setAuthReason(''); setAuthFiles([]); } });
        }
        actions.push({ label: 'Request Details', onClick: () => { setDetailsModal({ bookingId: row.id, bookingName: row.booking_name }); setDetailsMessage(''); } });
        if (passportsIncomplete(row)) actions.push(managePassportsAction(row));
        return <RowActionsDropdown label={primaryLabel} actions={actions} />;
      }
      const amendableStatuses = ['confirmed', 'secured_full', 'secured_deposit', 'secured_authorization', 'awaiting_authorization'];
      if (row.status !== 'provisional') {
        const actions = [
          { label: 'Request Authorization', onClick: () => { setAuthModal({ bookingId: row.id, bookingName: row.booking_name }); setAuthReason(''); setAuthFiles([]); } },
          { label: 'Request Details', onClick: () => { setDetailsModal({ bookingId: row.id, bookingName: row.booking_name }); setDetailsMessage(''); } },
        ];
        if (amendableStatuses.includes(row.status)) {
          actions.push({ label: 'Request Amendment', onClick: () => { setAmendModal({ bookingId: row.id, bookingName: row.booking_name, bookingDate: row.date }); setAmendDate(''); setAmendReason(''); } });
          actions.push({ label: 'Cancel Booking', onClick: () => { setCancelModal({ bookingId: row.id, bookingName: row.booking_name }); setCancelReason(''); }, variant: 'danger' });
        }
        if (passportsIncomplete(row)) actions.push(managePassportsAction(row));
        return <RowActionsDropdown label="Manage Booking" actions={actions} />;
      }
      return null;
    }

    if (role === 'user') {
      if (row.authorization_status === 'declined') {
        if (row.appeal_status === 'pending') return statusChip('Appeal Pending', 'bg-yellow-50 text-yellow-700');
        if (row.appeal_status === 'rejected') return statusChip('Appeal Rejected', 'bg-red-50 text-red-700');
        return <RowActionsDropdown label="Submit Appeal" actions={[
          { label: 'Submit Appeal', onClick: () => { setAppealModal({ requestId: row.authorization_request_id, bookingName: row.booking_name }); setAppealNotes(''); setAppealFiles([]); }, variant: 'primary' }
        ]} />;
      }
      if (row.authorization_status === 'pending') {
        return <RowActionsDropdown label="Upload Proof" actions={[
          { label: 'Upload Proof', onClick: () => { setUploadModal({ requestId: row.authorization_request_id, bookingName: row.booking_name }); setUploadFiles([]); setUploadMessage(''); }, variant: 'primary' }
        ]} />;
      }
      if (row.authorization_status === 'authorized') return statusChip('Authorized ✓', 'bg-green-50 text-green-700');

      switch (row.status) {
        case 'provisional':
          return <RowActionsDropdown label="Request Confirmation" actions={[
            { label: 'Request Confirmation', onClick: () => handleRequestConfirmation(row.id), variant: 'primary' }
          ]} />;
        case 'requested':
          return <RowActionsDropdown label="Request Authorization" actions={[
            { label: 'Request Authorization', onClick: () => { setAuthModal({ bookingId: row.id, bookingName: row.booking_name }); setAuthReason(''); setAuthFiles([]); } }
          ]} />;
        case 'validation_request':
          return <RowActionsDropdown label="Request Authorization" actions={[
            { label: 'Request Authorization', onClick: () => { setAuthModal({ bookingId: row.id, bookingName: row.booking_name }); setAuthReason(''); setAuthFiles([]); } }
          ]} />;
        case 'confirmed':
          if (row.validation_status === 'ok_to_purchase_full' || row.validation_status === 'ok_to_purchase_deposit') return statusChip('Awaiting Purchase', 'bg-blue-50 text-blue-700');
          break;
        case 'rejected':
          return statusChip('Booking Rejected', 'bg-red-50 text-red-700');
      }

      if (row.status === 'awaiting_authorization' && !row.authorization_status) {
        return <RowActionsDropdown label="Request Authorization" actions={[
          { label: 'Request Authorization', onClick: () => { setAuthModal({ bookingId: row.id, bookingName: row.booking_name }); setAuthReason(''); setAuthFiles([]); } }
        ]} />;
      }

      const userAmendable = ['confirmed', 'secured_full', 'secured_deposit', 'secured_authorization'];
      if (userAmendable.includes(row.status)) {
        const actions = [
          { label: 'Request Amendment', onClick: () => { setAmendModal({ bookingId: row.id, bookingName: row.booking_name, bookingDate: row.date }); setAmendDate(''); setAmendReason(''); } },
          { label: 'Cancel Booking', onClick: () => { setCancelModal({ bookingId: row.id, bookingName: row.booking_name }); setCancelReason(''); }, variant: 'danger' }
        ];
        if (passportsIncomplete(row)) actions.push(managePassportsAction(row));
        return <RowActionsDropdown label="Manage Booking" actions={actions} />;
      }

      if (row.status === 'amendment_requested') return statusChip('Amendment Pending', 'bg-yellow-50 text-yellow-700');
      if (row.status === 'amended')             return statusChip('Amendment Confirmed', 'bg-purple-50 text-purple-700');
      if (row.status === 'cancellation_requested') return statusChip('Cancellation Pending', 'bg-orange-50 text-orange-700');
    }

    return statusChip('No Actions', 'bg-gray-50 text-gray-400');
  };

  // ── Modals JSX ───────────────────────────────────────────────────────────────

  const modalsJSX = (
    <>
      {authMessage && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 shadow-lg rounded-lg px-4 py-3 text-sm text-gray-800 z-50 max-w-sm">
          {authMessage}
          <button onClick={() => setAuthMessage('')} className="ml-3 text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {uploadModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Upload Proof Documents</h2>
            <p className="text-xs text-gray-500 mb-4">Booking: <strong>{uploadModal.bookingName}</strong></p>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => document.getElementById('proof-upload-input').click()}>
              <svg className="mx-auto h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400">Click to select files</p>
              <p className="text-xs text-gray-400 mt-1">PDF, JPEG, PNG, TIFF, EML — multiple files allowed</p>
              <input id="proof-upload-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.eml" className="hidden"
                onChange={e => setUploadFiles(Array.from(e.target.files))} />
            </div>
            {uploadFiles.length > 0 && (
              <ul className="mt-3 space-y-1">
                {uploadFiles.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded">
                    <span className="truncate">{f.name}</span>
                    <span className="text-gray-400 ml-2 flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                  </li>
                ))}
              </ul>
            )}
            {uploadMessage && (
              <p className={`mt-3 text-xs font-medium ${uploadMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>{uploadMessage}</p>
            )}
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setUploadModal(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
              <button onClick={handleUploadProof} disabled={uploading || uploadFiles.length === 0}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                {uploading ? 'Uploading…' : `Upload ${uploadFiles.length > 0 ? `(${uploadFiles.length})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {appealModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Submit Appeal</h2>
            <p className="text-xs text-gray-500 mb-4">Booking: <strong>{appealModal.bookingName}</strong></p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Appeal reason <span className="text-red-500">*</span></label>
            <textarea rows={4} value={appealNotes} onChange={e => setAppealNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
              placeholder="Explain why the authorization should be reconsidered…" />
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supporting documents <span className="text-xs text-gray-400">(optional)</span></label>
              <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-md px-4 py-3 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => document.getElementById('appeal-upload-input').click()}>
                <p className="text-sm text-gray-500 dark:text-gray-400">Click to select files</p>
                <input id="appeal-upload-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.eml" className="hidden"
                  onChange={e => setAppealFiles(Array.from(e.target.files))} />
              </div>
              {appealFiles.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {appealFiles.map((f, i) => (
                    <li key={i} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded">
                      <span className="truncate">{f.name}</span>
                      <button onClick={() => setAppealFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 ml-2 hover:text-red-600">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setAppealModal(null); setAppealNotes(''); setAppealFiles([]); }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
              <button onClick={handleSubmitAppeal} disabled={appealSubmitting || !appealNotes.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                {appealSubmitting ? 'Submitting…' : `Submit Appeal${appealFiles.length > 0 ? ` (+${appealFiles.length} file${appealFiles.length > 1 ? 's' : ''})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailsModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Request Details</h2>
            <p className="text-xs text-gray-500 mb-4">Booking: <strong>{detailsModal.bookingName}</strong></p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message to user / finance <span className="text-red-500">*</span></label>
            <textarea rows={4} value={detailsMessage} onChange={e => setDetailsMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
              placeholder="Describe what additional information or documents are needed…" />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setDetailsModal(null); setDetailsMessage(''); }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
              <button onClick={handleRequestDetails} disabled={detailsSubmitting || !detailsMessage.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                {detailsSubmitting ? 'Sending…' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {amendModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Request Amendment</h2>
            <p className="text-xs text-gray-500 mb-4">Booking: <strong>{amendModal.bookingName}</strong></p>
            <p className="text-xs text-orange-600 bg-orange-50 rounded p-2 mb-4">
              Same-year amendments: 20% fee. Next-year amendments: 100% fee. Fees must be paid before amendment is confirmed.
            </p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Trek Date <span className="text-red-500">*</span></label>
            <input type="date" value={amendDate} onChange={e => setAmendDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white mb-3" />
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea rows={3} value={amendReason} onChange={e => setAmendReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
              placeholder="Reason for date change…" />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setAmendModal(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
              <button onClick={handleAmendmentRequest} disabled={amendSubmitting || !amendDate || !amendReason.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                {amendSubmitting ? 'Submitting…' : 'Submit Amendment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Cancel Booking</h2>
            <p className="text-xs text-gray-500 mb-4">Booking: <strong>{cancelModal.bookingName}</strong></p>
            <p className="text-xs text-red-600 bg-red-50 rounded p-2 mb-4">
              Cancellations are non-refundable. This action cannot be undone once confirmed by an admin.
            </p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for cancellation <span className="text-red-500">*</span></label>
            <textarea rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
              placeholder="Explain why this booking needs to be cancelled…" />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setCancelModal(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Keep Booking</button>
              <button onClick={handleCancellationRequest} disabled={cancelSubmitting || !cancelReason.trim()}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50">
                {cancelSubmitting ? 'Submitting…' : 'Request Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {authModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Request Authorization</h2>
            <p className="text-xs text-gray-500 mb-4">Booking: <strong>{authModal.bookingName}</strong></p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea rows={4} value={authReason} onChange={e => setAuthReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
              placeholder="e.g. Passport incomplete 45 days before trek, payment overdue…" />
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supporting Documents <span className="text-xs text-gray-400">(optional)</span></label>
              <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-md px-4 py-3 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => document.getElementById('auth-upload-input').click()}>
                <p className="text-sm text-gray-500 dark:text-gray-400">Click to add files</p>
                <p className="text-xs text-gray-400 mt-0.5">PDF, JPEG, PNG, TIFF, EML — select multiple at once or click again to add more</p>
                <input id="auth-upload-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.eml" className="hidden"
                  onChange={e => setAuthFiles(prev => [...prev, ...Array.from(e.target.files)])} />
              </div>
              {authFiles.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {authFiles.map((f, i) => (
                    <li key={i} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded">
                      <span className="truncate">{f.name}</span>
                      <span className="text-gray-400 ml-2 flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                      <button onClick={e => { e.stopPropagation(); setAuthFiles(prev => prev.filter((_, idx) => idx !== i)); }}
                        className="text-red-400 ml-2 hover:text-red-600 flex-shrink-0">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setAuthModal(null); setAuthReason(''); setAuthFiles([]); }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
              <button onClick={handleRequestAuthorization} disabled={authSubmitting || !authReason.trim()}
                className="px-4 py-2 text-sm text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50">
                {authSubmitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return { getActionButton, modalsJSX, authMessage, setAuthMessage, handlePurchasePermits };
}
