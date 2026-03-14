import { useState, useEffect } from 'react';

const API = 'http://localhost:8000/api';

const COLOR = {
  gray:   { dot: 'bg-gray-400',   ring: 'ring-gray-300',   badge: 'bg-gray-100 text-gray-700',    text: 'text-gray-600' },
  blue:   { dot: 'bg-blue-500',   ring: 'ring-blue-300',   badge: 'bg-blue-100 text-blue-800',    text: 'text-blue-700' },
  green:  { dot: 'bg-green-500',  ring: 'ring-green-300',  badge: 'bg-green-100 text-green-800',  text: 'text-green-700' },
  orange: { dot: 'bg-orange-500', ring: 'ring-orange-300', badge: 'bg-orange-100 text-orange-800',text: 'text-orange-700' },
  red:    { dot: 'bg-red-500',    ring: 'ring-red-300',    badge: 'bg-red-100 text-red-800',      text: 'text-red-700' },
  purple: { dot: 'bg-purple-500', ring: 'ring-purple-300', badge: 'bg-purple-100 text-purple-800',text: 'text-purple-700' },
  teal:   { dot: 'bg-teal-500',   ring: 'ring-teal-300',   badge: 'bg-teal-100 text-teal-800',    text: 'text-teal-700' },
};

const ICON = {
  created: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  auth_requested: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  auth_approved: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  auth_declined: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  appeal: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  ),
  payment_recorded: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  payment_validated: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  amendment: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  cancellation: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  chase: (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const STATUS_COLOR = {
  provisional: 'bg-gray-100 text-gray-700',
  requested: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-blue-100 text-blue-800',
  awaiting_authorization: 'bg-orange-100 text-orange-800',
  authorized: 'bg-green-100 text-green-800',
  chase: 'bg-red-100 text-red-800',
  released: 'bg-red-200 text-red-900',
  secured_full: 'bg-green-100 text-green-800',
  secured_deposit: 'bg-teal-100 text-teal-800',
  secured_authorization: 'bg-cyan-100 text-cyan-800',
  amendment_requested: 'bg-orange-100 text-orange-800',
  cancellation_requested: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-200 text-red-900',
  rejected: 'bg-red-100 text-red-800',
};

const PAYMENT_COLOR = {
  pending: 'bg-gray-100 text-gray-700',
  deposit_paid: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-orange-100 text-orange-800',
  fully_paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-red-200 text-red-900',
};

const VALIDATION_COLOR = {
  pending: null,
  ok_to_purchase_full: 'bg-green-100 text-green-800',
  ok_to_purchase_deposit: 'bg-yellow-100 text-yellow-800',
  do_not_purchase: 'bg-red-100 text-red-800',
};

const fmt = (ts) => {
  if (!ts) return null;
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  };
};

const BookingTimeline = ({ bookingId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    setData(null);
    const token = localStorage.getItem('token');
    fetch(`${API}/bookings/${bookingId}/timeline`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) return r.json().then((e) => { throw new Error(e.detail || `Error ${r.status}`); });
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <div className="py-10 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-2 text-xs text-gray-500">Loading timeline…</span>
      </div>
    );
  }

  if (error) {
    return <p className="py-4 text-xs text-red-500 text-center">Could not load timeline: {error}</p>;
  }

  if (!data) return null;

  const { booking, events } = data;

  return (
    <div className="space-y-4">
      {/* Status badges row */}
      <div className="flex flex-wrap gap-1.5">
        {booking.status && (
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${STATUS_COLOR[booking.status] || 'bg-gray-100 text-gray-700'}`}>
            {booking.status.replace(/_/g, ' ')}
          </span>
        )}
        {booking.payment_status && (
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${PAYMENT_COLOR[booking.payment_status] || 'bg-gray-100 text-gray-700'}`}>
            {booking.payment_status.replace(/_/g, ' ')}
          </span>
        )}
        {booking.validation_status && VALIDATION_COLOR[booking.validation_status] && (
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${VALIDATION_COLOR[booking.validation_status]}`}>
            {booking.validation_status.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Booking meta */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pb-3 border-b border-gray-100 dark:border-gray-700">
        {booking.product && (
          <><span className="text-gray-400">Product</span><span className="text-gray-700 dark:text-gray-200">{booking.product}</span></>
        )}
        {booking.date && (
          <><span className="text-gray-400">Trek Date</span><span className="text-gray-700 dark:text-gray-200">{new Date(booking.date).toLocaleDateString()}</span></>
        )}
        {booking.people && (
          <><span className="text-gray-400">People</span><span className="text-gray-700 dark:text-gray-200">{booking.people}</span></>
        )}
      </div>

      {/* Timeline */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">File Journey</p>

        {events.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No events recorded yet.</p>
        ) : (
          <div className="relative">
            {events.map((event, idx) => {
              const isLast = idx === events.length - 1;
              const c = COLOR[event.color] || COLOR.gray;
              const ts = fmt(event.timestamp);
              const icon = ICON[event.type];

              return (
                <div key={idx} className="flex gap-3">
                  {/* Node + vertical line */}
                  <div className="flex flex-col items-center" style={{ minWidth: '28px' }}>
                    {/* Dot with optional ping */}
                    <div className="relative flex items-center justify-center w-7 h-7 flex-shrink-0">
                      {event.is_current && (
                        <span
                          className={`absolute inset-0 rounded-full opacity-40 animate-ping ${c.dot}`}
                          style={{ animationDuration: '2s' }}
                        />
                      )}
                      <span
                        className={`
                          relative z-10 flex items-center justify-center
                          w-5 h-5 rounded-full text-white flex-shrink-0
                          ${c.dot}
                          ${event.is_current ? `ring-2 ring-offset-1 ${c.ring}` : ''}
                          transition-all duration-300
                        `}
                      >
                        {icon}
                      </span>
                    </div>

                    {/* Vertical connector line */}
                    {!isLast && (
                      <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700 my-0.5" style={{ minHeight: '16px' }} />
                    )}
                  </div>

                  {/* Event content */}
                  <div className={`flex-1 ${isLast ? 'pb-1' : 'pb-4'}`}>
                    <div className="flex items-start justify-between gap-2 min-h-[28px]">
                      <p className={`text-xs font-semibold leading-tight ${c.text}`}>
                        {event.title}
                        {event.is_current && (
                          <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs font-medium align-middle ${c.badge}`}>
                            now
                          </span>
                        )}
                      </p>
                      {ts && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-400">{ts.date}</p>
                          <p className="text-xs text-gray-300">{ts.time}</p>
                        </div>
                      )}
                    </div>
                    {event.detail && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                        {event.detail}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingTimeline;
