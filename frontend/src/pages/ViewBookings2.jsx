import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import EnhancedTable from '../components/EnhancedTable';
import { useBookingActions } from '../hooks/useBookingActions';

const PERMIT_URL = 'https://www.gorilla-permit.com/';

const statusChip = (text, cls) => (
  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{text}</span>
);

const BookingDetailPanel = ({ row, onClose, navigate, handlePurchasePermits, role }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setDetails(null);
    fetch(`http://localhost:8000/api/bookings/${row.id}/client-details`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled) { setDetails(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [row.id]);

  const passportCount = details?.passports?.length || 0;
  const peopleCount = details?.number_of_people || row.number_of_people || 0;
  const passportsComplete = passportCount >= peopleCount && peopleCount > 0;
  const canPurchaseFull = details?.validation_status === 'ok_to_purchase_full';
  const canPurchaseDeposit = details?.validation_status === 'ok_to_purchase_deposit';
  const canPurchaseAuth = details?.validation_status === 'do_not_purchase' && details?.authorization_status === 'authorized';
  const isAdmin = role === 'admin';

  const validationLabel = {
    ok_to_purchase_full: ['OK TO PURCHASE (FULL)', 'bg-green-50 text-green-700'],
    ok_to_purchase_deposit: ['OK TO PURCHASE (DEPOSIT)', 'bg-yellow-50 text-yellow-700'],
    do_not_purchase: ['DO NOT PURCHASE', 'bg-red-50 text-red-700'],
  };
  const paymentLabel = {
    fully_paid: ['Fully Paid', 'bg-green-50 text-green-700'],
    deposit_paid: ['Deposit Paid', 'bg-yellow-50 text-yellow-700'],
    pending: ['Pending', 'bg-gray-50 text-gray-600'],
    overdue: ['Overdue', 'bg-red-50 text-red-700'],
    partial: ['Partial', 'bg-orange-50 text-orange-700'],
  };

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      {/* backdrop */}
      <div className="flex-1 bg-black/20" />
      {/* panel */}
      <div
        className="w-[520px] bg-white dark:bg-gray-800 shadow-2xl flex flex-col overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{row.booking_name}</h2>
            {row.booking_ref && <p className="text-xs text-gray-500 mt-0.5">Ref: {row.booking_ref}</p>}
            <p className="text-xs text-gray-400 mt-0.5">{row.product} — {row.date ? new Date(row.date).toLocaleDateString() : '-'}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/bookings/${row.id}/client`)}
              className="text-xs text-blue-600 hover:underline"
            >Full Details →</button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">×</button>
          </div>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400 py-16">Loading...</div>
        )}

        {!loading && details && (
          <div className="p-5 space-y-6">

            {/* Status row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Booking</p>
                {statusChip(
                  (details.status || '-').replace(/_/g, ' '),
                  details.status === 'confirmed' ? 'bg-green-50 text-green-700' :
                  details.status === 'provisional' ? 'bg-yellow-50 text-yellow-700' :
                  details.status === 'requested' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'
                )}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Payment</p>
                {(() => { const [l, c] = paymentLabel[details.payment_status] || [details.payment_status || '-', 'bg-gray-50 text-gray-600']; return statusChip(l, c); })()}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Validation</p>
                {details.validation_status
                  ? (() => { const [l, c] = validationLabel[details.validation_status] || [details.validation_status, 'bg-gray-50 text-gray-600']; return statusChip(l, c); })()
                  : <span className="text-xs text-gray-400">—</span>}
              </div>
            </div>

            {/* Passport section */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Passports ({passportCount} / {peopleCount})
                </h3>
                {!passportsComplete && (
                  <span className="text-xs text-red-600 font-medium">Incomplete ⚠</span>
                )}
                {passportsComplete && (
                  <span className="text-xs text-green-600 font-medium">Complete ✓</span>
                )}
              </div>

              {passportCount === 0 ? (
                <p className="text-xs text-gray-400">No passport records uploaded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        {['Name', 'Passport No.', 'DOB', 'Expiry', 'Nationality'].map(h => (
                          <th key={h} className="text-left py-1.5 px-2 text-gray-400 uppercase tracking-wider font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {details.passports.map((p, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                          <td className="py-1.5 px-2 text-gray-900 dark:text-white">{p.full_name}</td>
                          <td className="py-1.5 px-2 font-mono text-gray-700 dark:text-gray-300">{p.passport_number}</td>
                          <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{p.date_of_birth}</td>
                          <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{p.passport_expiry}</td>
                          <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{p.nationality || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                {(!passportsComplete || role === 'admin') && (
                  <button
                    onClick={() => { localStorage.setItem('activeBookingId', row.id); navigate('/passport-management'); }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
                  >
                    {passportsComplete ? 'Manage Passports' : `Upload Passports (${passportCount}/${peopleCount})`}
                  </button>
                )}
                <button
                  onClick={() => { localStorage.setItem('activeBookingId', row.id); navigate('/voucher-management'); }}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-md hover:bg-gray-200"
                >
                  {details.voucher ? 'View Voucher ✓' : 'Manage Voucher'}
                </button>
              </div>
            </section>

            {/* Admin permit purchase section */}
            {isAdmin && (canPurchaseFull || canPurchaseDeposit || canPurchaseAuth) && (
              <section className="border-t border-gray-200 dark:border-gray-700 pt-5">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Permit Purchase</h3>

                {canPurchaseFull && !passportsComplete && (
                  <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-700 mb-3">
                    Passports mandatory for full payment purchase — {peopleCount - passportCount} missing. Cannot proceed.
                  </div>
                )}

                <div className="flex gap-2">
                  <a
                    href={PERMIT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-md hover:bg-gray-200"
                  >Go to Permit Site →</a>

                  {canPurchaseFull && (
                    <button
                      disabled={!passportsComplete}
                      onClick={() => { handlePurchasePermits(row.id, 'full'); onClose(); }}
                      className="px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >Mark as Purchased (Full)</button>
                  )}
                  {canPurchaseDeposit && (
                    <button
                      onClick={() => { handlePurchasePermits(row.id, 'deposit'); onClose(); }}
                      className="px-3 py-2 bg-yellow-500 text-white text-xs font-medium rounded-md hover:bg-yellow-600"
                    >Mark as Purchased (Deposit)</button>
                  )}
                  {canPurchaseAuth && (
                    <button
                      onClick={() => { handlePurchasePermits(row.id, 'authorization'); onClose(); }}
                      className="px-3 py-2 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700"
                    >Mark as Purchased (Auth)</button>
                  )}
                </div>
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

const ViewBookings2 = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const filterParam = searchParams.get('filter');

  const role = localStorage.getItem('role');
  const [allData, setAllData] = useState([]);
  const [detailPanel, setDetailPanel] = useState(null);

  const fetchData = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/bookings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setAllData(Array.isArray(data) ? data : []);
    } catch {}
  };

  const { getActionButton, modalsJSX, handlePurchasePermits } = useBookingActions(navigate, fetchData);

  useEffect(() => { fetchData(); }, []);

  const filterData = (data) => {
    if (!filterParam) return data;
    const today = new Date().toISOString().split('T')[0];
    switch (filterParam) {
      case 'quick_actions':
        return data.filter(b => b.status === 'requested' || ['ok_to_purchase_full','ok_to_purchase_deposit','do_not_purchase'].includes(b.validation_status));
      case 'today':
        return data.filter(b => b.date?.split('T')[0] === today);
      case 'critical':
        return data.filter(b => {
          if (b.payment_status === 'overdue') return true;
          if (b.balance_due_date && b.payment_status !== 'fully_paid' && new Date(b.balance_due_date) < new Date()) return true;
          if (b.payment_status === 'deposit_paid') { const d = Math.ceil((new Date(b.date) - new Date()) / 86400000); if (d > 0 && d <= 45) return true; }
          if (b.payment_status === 'pending' && b.deposit_due_date && new Date(b.deposit_due_date) < new Date()) return true;
          return false;
        });
      case 'amendments': return data.filter(b => b.status === 'amended' || b.status === 'amendment_requested');
      case 'cancellations': return data.filter(b => b.payment_status === 'cancelled' || b.status === 'cancellation_requested');
      case 'pending_payments': return data.filter(b => b.status !== 'provisional' && b.payment_status !== 'fully_paid');
      case 'confirmed_full_payment': return data.filter(b => b.status === 'confirmed' && b.payment_status === 'fully_paid');
      case 'confirmed_deposit': return data.filter(b => b.status === 'confirmed' && b.payment_status === 'deposit_paid');
      case 'confirmed_partial': return data.filter(b => b.status === 'confirmed' && b.payment_status === 'partial');
      case 'confirmed_overdue': return data.filter(b => b.status === 'confirmed' && b.payment_status === 'overdue');
      case 'confirmation_requests': return data.filter(b => b.status === 'requested');
      case 'ok_to_purchase_full': return data.filter(b => b.validation_status === 'ok_to_purchase_full');
      case 'ok_to_purchase_deposit': return data.filter(b => b.validation_status === 'ok_to_purchase_deposit');
      case 'do_not_purchase': return data.filter(b => b.validation_status === 'do_not_purchase');
      case 'confirmed_bookings': return data.filter(b => b.status === 'confirmed');
      case 'missing_passports': return data.filter(b =>
        b.status !== 'provisional' && b.payment_status !== 'cancelled' &&
        (b.passport_count || 0) < (b.number_of_people || 0)
      );
      default: return data;
    }
  };

  // Helper functions for status colors (same as ViewBookings1)
  const getBookingStatusColor = (status) => {
    const colors = {
      confirmed: "bg-green-100 text-green-800",
      provisional: "bg-yellow-100 text-yellow-800",
      requested: "bg-blue-100 text-blue-800",
      rejected: "bg-red-100 text-red-800",
      amended: "bg-purple-100 text-purple-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      fully_paid: "bg-green-100 text-green-800",
      deposit_paid: "bg-yellow-100 text-yellow-800",
      pending: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800",
      partial: "bg-orange-100 text-orange-800",
      overdue: "bg-pink-100 text-pink-800",
      authorized: "bg-purple-100 text-purple-800",
      rolling_deposit: "bg-indigo-100 text-indigo-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  // Get the filtered data from the complete dataset
  const filteredData = React.useMemo(() => filterData(allData), [allData, filterParam]);

  const columns = [
    { header: "#", accessor: "id" },
    { header: "Booking Name", accessor: "booking_name" },
    { header: "Booking Ref", accessor: "booking_ref" },
    { header: "Invoice No.", accessor: "invoice_no" },
    { header: "No. Permits", accessor: "number_of_permits" },
    { header: "Voucher", accessor: "voucher" },
    { header: "Request Date", accessor: "date_of_request", render: (row) => row.date_of_request ? new Date(row.date_of_request).toLocaleDateString() : '-' },
    { header: "Trek Date", accessor: "trekking_date", render: (row) => row.trekking_date ? new Date(row.trekking_date).toLocaleDateString() : '-' },
    { header: "Head of File", accessor: "head_of_file" },
    { header: "Agent/Client", accessor: "originating_agent" },
    { header: "Product", accessor: "product" },
    { header: "Date", accessor: "date", render: (row) => row.date ? new Date(row.date).toLocaleDateString() : '-' },
    { header: "People", accessor: "people" },
    { header: "Total", accessor: "total_amount", render: (row) => row.total_amount != null ? `$${Number(row.total_amount).toLocaleString()}` : '-' },
    { header: "Paid", accessor: "paid_amount", render: (row) => row.paid_amount != null ? `$${Number(row.paid_amount).toLocaleString()}` : '-' },
    {
      header: "Booking Status", accessor: "status",
      render: (row) => row.status ? (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getBookingStatusColor(row.status)}`}>
          {row.status.replace(/_/g, ' ')}
        </span>
      ) : '-',
    },
    {
      header: "Payment Status", accessor: "payment_status",
      render: (row) => row.payment_status ? (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getPaymentStatusColor(row.payment_status)}`}>
          {row.payment_status.replace(/_/g, ' ')}
        </span>
      ) : '-',
    },
    { header: "Actions", accessor: "actions", render: (row) => getActionButton(row) },
  ];

  return (
    <div>
      <EnhancedTable
        columns={columns}
        data={filteredData}
        totalRows={allData.length}
        filteredRows={filteredData.length}
        onRowClick={(row) => setDetailPanel(row)}
      />
      {modalsJSX}
      {detailPanel && (
        <BookingDetailPanel
          row={detailPanel}
          onClose={() => setDetailPanel(null)}
          navigate={navigate}
          handlePurchasePermits={handlePurchasePermits}
          role={role}
        />
      )}
    </div>
  );
};

export default ViewBookings2; 