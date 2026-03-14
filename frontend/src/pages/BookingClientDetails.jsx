import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const PERMIT_PURCHASE_URL = 'https://www.gorilla-permit.com/';  // update to actual ORTPN URL if different

const BookingClientDetails = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [authRequests, setAuthRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const role = localStorage.getItem('role');
  const token = localStorage.getItem('token');
  const headers = { 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [detailsRes, authRes] = await Promise.all([
          fetch(`http://localhost:8000/api/bookings/${bookingId}/client-details`, { headers }),
          fetch(`http://localhost:8000/api/authorization/booking/${bookingId}`, { headers }),
        ]);
        if (!detailsRes.ok) {
          const err = await detailsRes.json();
          throw new Error(err.detail || 'Failed to load client details');
        }
        setDetails(await detailsRes.json());
        if (authRes.ok) setAuthRequests(await authRes.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [bookingId]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  const formatDate = (val) => val ? new Date(val).toLocaleDateString() : '-';

  const badge = (text, color) => (
    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${color}`}>
      {text}
    </span>
  );

  const validationBadge = (status) => {
    const map = {
      ok_to_purchase_full: ['OK TO PURCHASE (FULL)', 'bg-green-50 text-green-700'],
      ok_to_purchase_deposit: ['OK TO PURCHASE (DEPOSIT)', 'bg-yellow-50 text-yellow-700'],
      do_not_purchase: ['DO NOT PURCHASE', 'bg-red-50 text-red-700'],
    };
    const [label, color] = map[status] || [status?.replace(/_/g, ' ').toUpperCase() || '-', 'bg-gray-50 text-gray-600'];
    return badge(label, color);
  };

  const paymentBadge = (status) => {
    const map = {
      fully_paid: ['Fully Paid', 'bg-green-50 text-green-700'],
      deposit_paid: ['Deposit Paid', 'bg-yellow-50 text-yellow-700'],
      pending: ['Pending', 'bg-gray-50 text-gray-600'],
      overdue: ['Overdue', 'bg-red-50 text-red-700'],
    };
    const [label, color] = map[status] || [status?.replace(/_/g, ' ') || '-', 'bg-gray-50 text-gray-600'];
    return badge(label, color);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500 text-sm">Loading...</div>
  );

  if (error) return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <p className="text-red-600 text-sm">{error}</p>
      <button onClick={() => navigate('/bookings')} className="mt-4 text-blue-600 text-sm underline">
        Back to Bookings
      </button>
    </div>
  );

  // Passport completeness
  const passportCount = details?.passports?.length || 0;
  const peopleCount = details?.number_of_people || 0;
  const daysToTrek = details?.date ? Math.ceil((new Date(details.date) - new Date()) / 86400000) : null;
  const passportsComplete = passportCount >= peopleCount;
  const passportCritical = !passportsComplete && daysToTrek !== null && daysToTrek <= 60 && daysToTrek >= 0;

  const canPurchasePermits = details?.validation_status === 'ok_to_purchase_full' || details?.validation_status === 'ok_to_purchase_deposit';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/bookings')}
            className="text-sm text-blue-600 hover:underline mb-1 block"
          >
            &larr; Back to Bookings
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Client Details — {details.booking_name}
          </h1>
          {details.booking_ref && (
            <p className="text-xs text-gray-500 mt-0.5">Ref: {details.booking_ref}</p>
          )}
        </div>
        {/* Permit purchase button */}
        {(role === 'admin') && canPurchasePermits && (
          <a
            href={PERMIT_PURCHASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-4 py-2 text-sm font-medium text-white rounded-md ${passportCritical ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {passportCritical ? '⚠ Purchase Permits (Passports Incomplete)' : 'Purchase Permits'}
          </a>
        )}
      </div>

      {/* Passport completeness warning */}
      {passportCritical && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded text-sm text-red-700">
          <strong>Passport Warning:</strong> Only {passportCount} of {peopleCount} passports submitted.
          Trek is in {daysToTrek} day{daysToTrek !== 1 ? 's' : ''} — passports must be complete 60 days before trek.
        </div>
      )}

      {/* Booking Info */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Booking Information</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {[
            ['Product', details.product],
            ['Site', details.site],
            ['Trek Date', formatDate(details.date)],
            ['Request Date', formatDate(details.date_of_request)],
            ['People', details.number_of_people],
            ['Agent / Client', details.agent_client || '-'],
            ['Head of File', details.head_of_file || '-'],
            ['Status', details.status?.replace(/_/g, ' ').toUpperCase() || '-'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
              <p className="text-sm text-gray-900 dark:text-white mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Finance Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Finance Status</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Payment Status</p>
            <div className="mt-1">{paymentBadge(details.payment_status)}</div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Validation Status</p>
            <div className="mt-1">{validationBadge(details.validation_status)}</div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total Amount</p>
            <p className="text-sm text-gray-900 dark:text-white mt-0.5">{formatCurrency(details.total_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Amount Received</p>
            <p className="text-sm text-gray-900 dark:text-white mt-0.5">{formatCurrency(details.amount_received)}</p>
          </div>
          {details.validation_notes && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Validation Notes</p>
              <p className="text-sm text-gray-900 dark:text-white mt-0.5">{details.validation_notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Authorization requests */}
      {authRequests.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Authorization Requests ({authRequests.length})
          </h2>
          <div className="space-y-3">
            {authRequests.map(req => {
              const statusColors = { pending: 'bg-yellow-100 text-yellow-800', authorized: 'bg-green-100 text-green-800', declined: 'bg-red-100 text-red-800' };
              return (
                <div key={req.id} className="border border-gray-200 dark:border-gray-700 rounded-md p-3 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[req.status] || 'bg-gray-100 text-gray-600'}`}>{req.status}</span>
                    <span className="text-gray-400">{req.auto_flagged ? 'Auto-flagged' : 'Manual'} · {new Date(req.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">{req.reason}</p>
                  {req.authorizer_notes && (
                    <p className="text-gray-500 mt-1 italic">Authorizer: {req.authorizer_notes}</p>
                  )}
                  {req.appeal && (
                    <div className="mt-2 pl-2 border-l-2 border-gray-300">
                      <span className="font-medium text-gray-600">Appeal:</span> {req.appeal.status} — {req.appeal.appeal_notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Passports */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
          Passports ({details.passports.length})
        </h2>
        {details.passports.length === 0 ? (
          <p className="text-sm text-gray-500">No passport records found for this client.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {['Full Name', 'Passport No.', 'Date of Birth', 'Expiry', 'Nationality', 'Gender'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-gray-500 uppercase tracking-wider font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {details.passports.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="py-2 px-3 text-gray-900 dark:text-white">{p.full_name}</td>
                    <td className="py-2 px-3 text-gray-900 dark:text-white font-mono">{p.passport_number}</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{p.date_of_birth}</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{p.passport_expiry}</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{p.nationality || '-'}</td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">{p.gender || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingClientDetails;
