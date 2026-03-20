import React, { useState, useEffect, useMemo } from 'react';
import EnhancedTable from '../components/EnhancedTable';
import BookingTimeline from '../components/BookingTimeline';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBookingActions } from '../hooks/useBookingActions';
import DateRangeBar from '../components/DateRangeBar';

const Bookings = () => {
  const role = localStorage.getItem('role');
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();
  const location = useLocation();
  const urlFilter = new URLSearchParams(location.search).get('filter');
  const { getActionButton, modalsJSX, handlePurchasePermits } = useBookingActions(navigate, () => fetchBookings());
  const PERMIT_URL = 'https://www.gorilla-permit.com/';
  const [requestCount, setRequestCount] = useState(0);
  const [drawerBooking, setDrawerBooking] = useState(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState('timeline');
  const [drawerDetails, setDrawerDetails] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState(null);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [productFilter, setProductFilter] = useState('all');
  const [selectedBookings, setSelectedBookings] = useState([]);



  useEffect(() => {
    const bookingFilter = localStorage.getItem('bookingFilter');
    if (bookingFilter) {
      fetchFilteredBookings(bookingFilter);
    } else {
      fetchBookings();
    }
  }, []);

  useEffect(() => {
    if (role === 'admin') {
      const fetchRequestCount = async () => {
        try {
          const response = await fetch('http://localhost:8000/api/bookings/request-count', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setRequestCount(data.count);
          }
        } catch (error) {
          console.error('Failed to fetch request count:', error);
        }
      };
      fetchRequestCount();
    }
  }, [role]);

  const fetchBookings = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/bookings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Bookings data:', data); // Debug log to check validation_status
        setBookings(data);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const fetchFilteredBookings = async (filterType) => {
    try {
      const response = await fetch('http://localhost:8000/api/bookings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const filteredData = data.filter(booking => {
          switch(filterType) {
            case 'confirmation_requests':
              return booking.status === 'requested';
            case 'ok_to_purchase_full':
              return booking.validation_status === 'ok_to_purchase_full' && 
                     booking.status === 'confirmed';
            case 'ok_to_purchase_deposit':
              return booking.validation_status === 'ok_to_purchase_deposit' && 
                     booking.status === 'confirmed';
            case 'do_not_purchase':
              return booking.validation_status === 'do_not_purchase' && 
                     booking.status === 'confirmed';
            case 'unpaid':
              return (!booking.payment_status || booking.payment_status === 'pending') && 
                     booking.payment_status !== 'fully_paid';
            case 'top_up_due':
              const trekkingDate = new Date(booking.date);
              const today = new Date();
              const daysUntilTrek = Math.ceil((trekkingDate - today) / (1000 * 60 * 60 * 24));
              return (booking.payment_status !== 'fully_paid' &&
                     booking.validation_status !== 'ok_to_purchase_full' &&
                     daysUntilTrek <= 45 && daysUntilTrek > 0);
            case 'missing_passports':
              return booking.status !== 'provisional' &&
                     booking.payment_status !== 'cancelled' &&
                     (booking.passport_count || 0) < (booking.number_of_people || 0);
            default:
              return true;
          }
        });
        setBookings(filteredData);
        setActiveTab(filterType);
      }
    } catch (error) {
      console.error('Failed to fetch filtered bookings:', error);
    } finally {
      localStorage.removeItem('bookingFilter');
    }
  };

  // Format currency helper function
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadgeColor = (status, validationStatus) => {
    // If the booking is confirmed, use validation status colors
    if (status === 'confirmed') {
      switch (validationStatus) {
        case 'ok_to_purchase_full':
          return 'bg-green-50 text-green-600 text-xs';
        case 'ok_to_purchase_deposit':
          return 'bg-yellow-50 text-yellow-600 text-xs';
        case 'do_not_purchase':
          return 'bg-red-50 text-red-600 text-xs';
        default:
          return 'bg-gray-50 text-gray-600 text-xs';
      }
    }

    // Otherwise use booking status colors
    switch (status) {
      case 'provisional':
        return 'bg-gray-50 text-gray-600 text-xs';
      case 'requested':
        return 'bg-yellow-50 text-yellow-600 text-xs';
      case 'validation_request':
        return 'bg-blue-50 text-blue-600 text-xs';
      case 'confirmed':
        return 'bg-green-50 text-green-600 text-xs';
      case 'rejected':
        return 'bg-red-50 text-red-600 text-xs';
      default:
        return 'bg-gray-50 text-gray-600 text-xs';
    }
  };

  const getStatusText = (status, validationStatus) => {
    // For admin viewing confirmed bookings with validation status
    if (status === 'confirmed' && validationStatus) {
      switch (validationStatus) {
        case 'ok_to_purchase_full':
          return 'OK TO PURCHASE (FULL)';
        case 'ok_to_purchase_deposit':
          return 'OK TO PURCHASE (DEPOSIT)';
        case 'do_not_purchase':
          return 'NOT APPROVED';
        default:
          return status.toUpperCase();
      }
    }
    return status.replace(/_/g, ' ').toUpperCase();
  };


  // Add this to ensure immediate updates
  useEffect(() => {
    const handleBookingUpdate = () => {
      console.log('Booking updated, refreshing...');
      fetchBookings();
    };
    
    window.addEventListener('booking-updated', handleBookingUpdate);
    return () => window.removeEventListener('booking-updated', handleBookingUpdate);
  }, []);

  // Different column configurations based on user role
  const getColumns = useMemo(() => {
    const baseColumns = [
      {
        header: 'Booking ID',
        accessor: 'id',
        cell: (value) => (
          <span className="text-xs text-gray-900">{value}</span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2',
        cellClassName: 'whitespace-nowrap px-3 py-1.5 text-xs'
      },
      {
        header: 'Booking Name',
        accessor: 'booking_name',
        cell: (value) => (
          <span className="text-xs font-medium text-gray-900">{value || '-'}</span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2',
        cellClassName: 'max-w-[160px] truncate px-3 py-1.5 text-xs'
      },
      {
        header: 'Product',
        accessor: 'product',
        cell: (value) => (
          <span className="text-xs text-gray-900">{value}</span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2',
        cellClassName: 'max-w-[140px] truncate px-3 py-1.5 text-xs'
      },
      {
        header: 'Client',
        accessor: 'agent_client',
        cell: (value) => (
          <span className="text-xs text-gray-900">{value || '-'}</span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2',
        cellClassName: 'max-w-[120px] truncate px-3 py-1.5 text-xs'
      },
      {
        header: 'Head of File',
        accessor: 'head_of_file',
        cell: (value) => (
          <span className="text-xs text-gray-900">{value || '-'}</span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2',
        cellClassName: 'max-w-[120px] truncate px-3 py-1.5 text-xs'
      },
      {
        header: 'People',
        accessor: 'number_of_people',
        cell: (value) => (
          <span className="text-xs text-gray-900">{value || '-'}</span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2',
        cellClassName: 'whitespace-nowrap px-3 py-1.5 text-xs'
      },
      {
        header: 'Trek Date',
        accessor: 'date',
        cell: (value) => (
          <span className="text-xs text-gray-900">
            {value ? new Date(value).toLocaleDateString() : '-'}
          </span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2',
        cellClassName: 'whitespace-nowrap px-3 py-1.5 text-xs'
      },
      {
        header: 'Requested Date',
        accessor: 'date_of_request',
        cell: (value) => (
          <span className="text-xs text-gray-900">
            {value ? new Date(value).toLocaleDateString() : '-'}
          </span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2',
        cellClassName: 'whitespace-nowrap px-3 py-1.5 text-xs'
      },
      {
        header: 'Status',
        accessor: 'status',
        cell: (value, row) => (
          <span className={`inline-flex px-2 py-1 rounded ${getStatusBadgeColor(value, row.validation_status)}`}>
            {getStatusText(value, row.validation_status)}
          </span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2',
        cellClassName: 'whitespace-nowrap px-3 py-1.5 text-xs'
      },
      {
        header: 'Amount',
        accessor: 'total_amount',
        cell: (value) => (
          <span className="text-xs text-gray-900">
            {formatCurrency(value)}
          </span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2',
        cellClassName: 'whitespace-nowrap px-3 py-1.5 text-xs'
      },
      {
        header: 'Available Slots',
        accessor: 'available_slots',
        cell: (value) => (
          <span className={`text-xs font-medium ${value === 'Sold Out' ? 'text-red-600' : value ? 'text-green-700' : 'text-gray-400'}`}>
            {value || 'N/A'}
          </span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2',
        cellClassName: 'whitespace-nowrap px-3 py-1.5 text-xs'
      }
    ];

    // Add Actions column for all roles
    baseColumns.push({
      header: 'Actions',
      accessor: 'actions',
      render: (row) => getActionButton(row),
      headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2',
      cellClassName: 'whitespace-nowrap px-3 py-1.5 text-xs'
    });

    // Add Amount Received column for finance_admin
    if (role === 'finance_admin') {
      baseColumns.splice(5, 0, {
        header: 'Amount Received',
        accessor: 'amount_received',
        cell: (value) => (
          <span className="text-xs text-gray-900">
            {formatCurrency(value || 0)}
          </span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2',
        cellClassName: 'whitespace-nowrap px-3 py-1.5 text-xs'
      });
    }

    // Admin-only: Authorization status + Passport completeness columns
    if (role === 'admin') {
      baseColumns.push({
        header: 'Authorization',
        accessor: 'authorization_status',
        render: (row) => {
          const s = row.authorization_status;
          if (!s) return <span className="text-xs text-gray-400">—</span>;
          const colors = {
            pending:    'bg-yellow-100 text-yellow-800',
            authorized: 'bg-green-100 text-green-800',
            declined:   'bg-red-100 text-red-800',
          };
          return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors[s] || 'bg-gray-100 text-gray-600'}`}>
              {s}
            </span>
          );
        },
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2',
        cellClassName: 'whitespace-nowrap px-3 py-1.5 text-xs'
      });

      baseColumns.push({
        header: 'Passports',
        accessor: 'passport_count',
        render: (row) => {
          const count = row.passport_count || 0;
          const needed = row.number_of_people || 0;
          const days = row.days_to_trek;
          const incomplete = count < needed;
          const critical = incomplete && days !== null && days <= 60 && days >= 0;
          return (
            <span className={`text-xs font-medium ${critical ? 'text-red-600' : incomplete ? 'text-yellow-600' : 'text-green-700'}`}>
              {count}/{needed}
              {critical && ' ⚠'}
            </span>
          );
        },
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-2',
        cellClassName: 'whitespace-nowrap px-3 py-1.5 text-xs'
      });
    }

    return baseColumns;
  }, [role, getActionButton]);

  const handleBatchAction = async (action) => {
    const token = localStorage.getItem('token');
    const endpointMap = {
      confirm: 'confirm',
      reject: 'reject',
      send_to_finance: 'send-to-finance',
      payment_request: 'payment-request',
    };
    const endpoint = endpointMap[action];
    if (!endpoint) return;

    const eligible = selectedBookings.filter(b => {
      if (action === 'confirm' || action === 'reject') return b.status === 'requested';
      if (action === 'send_to_finance') return b.status === 'confirmed';
      return true;
    });

    if (eligible.length === 0) { alert('No eligible bookings for this action.'); return; }
    if (!window.confirm(`Apply "${action.replace(/_/g,' ')}" to ${eligible.length} booking(s)?`)) return;

    const results = await Promise.allSettled(
      eligible.map(b => fetch(`http://localhost:8000/api/bookings/${b.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      }))
    );

    const failed = results.filter(r => r.status === 'rejected' || !r.value?.ok).length;
    if (failed > 0) alert(`${eligible.length - failed} succeeded, ${failed} failed.`);
    setSelectedBookings([]);
    fetchBookings();
  };

  const handleRowClick = (row) => {
    setDrawerBooking(row);
    setActiveDrawerTab('timeline');
    setDrawerDetails(null);
    setDrawerError(null);
  };

  const fetchDrawerDetails = async (bookingId) => {
    setDrawerLoading(true);
    setDrawerError(null);
    try {
      const res = await fetch(`http://localhost:8000/api/bookings/${bookingId}/client-details`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setDrawerDetails(await res.json());
      } else {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        setDrawerError(err.detail || `Error ${res.status}`);
      }
    } catch (e) {
      setDrawerError(e.message);
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => { setDrawerBooking(null); setDrawerDetails(null); setDrawerError(null); setActiveDrawerTab('timeline'); };

  const applyFilter = (data, filter) => {
    if (!filter) return data;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    switch (filter) {
      case 'quick_actions':
        return data.filter(b => b.status === 'requested' || ['ok_to_purchase_full','ok_to_purchase_deposit','do_not_purchase'].includes(b.validation_status));
      case 'today':
      case 'today_treks':
        return data.filter(b => b.date?.split('T')[0] === today);
      case 'received_today':
        return data.filter(b => b.date_of_request?.split('T')[0] === today);
      case 'critical':
        return data.filter(b => {
          if (b.payment_status === 'overdue') return true;
          if (b.balance_due_date && b.payment_status !== 'fully_paid' && new Date(b.balance_due_date) < now) return true;
          if (b.payment_status === 'deposit_paid') { const d = Math.ceil((new Date(b.date) - now) / 86400000); if (d > 0 && d <= 45) return true; }
          if (b.payment_status === 'pending' && b.deposit_due_date && new Date(b.deposit_due_date) < now) return true;
          return false;
        });
      case 'amendments':
      case 'amendments_under_amendment':
        return data.filter(b => b.status === 'amendment_requested' || b.status === 'amended');
      case 'amendments_completed':
        return data.filter(b => b.status === 'amended');
      case 'amendments_declined':
        return data.filter(b => b.amendment_status === 'declined');
      case 'cancellations':
      case 'cancellations_under_cancellation':
        return data.filter(b => b.status === 'cancellation_requested' || b.payment_status === 'cancelled');
      case 'cancellations_completed':
        return data.filter(b => b.payment_status === 'cancelled');
      case 'pending_payments':
        return data.filter(b => b.status !== 'provisional' && b.payment_status !== 'fully_paid');
      case 'pending_no_payment':
        return data.filter(b => !b.payment_status || b.payment_status === 'pending');
      case 'pending_deposit_due':
        return data.filter(b => b.payment_status === 'deposit_paid' && b.date && Math.ceil((new Date(b.date) - now) / 86400000) <= 45);
      case 'pending_authorization_due':
        return data.filter(b => b.authorization_status === 'pending');
      case 'pending_missing_details':
      case 'missing_passports':
        return data.filter(b => b.status !== 'provisional' && b.payment_status !== 'cancelled' && (b.passport_count || 0) < (b.number_of_people || 0));
      case 'confirmation_requests':
        return data.filter(b => b.status === 'requested');
      case 'ok_to_purchase_full':
        return data.filter(b => b.validation_status === 'ok_to_purchase_full');
      case 'ok_to_purchase_deposit':
        return data.filter(b => b.validation_status === 'ok_to_purchase_deposit');
      case 'do_not_purchase':
        return data.filter(b => b.validation_status === 'do_not_purchase');
      case 'confirmed_bookings':
        return data.filter(b => b.status === 'confirmed');
      case 'confirmed_full_payment':
        return data.filter(b => b.status === 'confirmed' && b.payment_status === 'fully_paid');
      case 'confirmed_deposit_paid':
      case 'confirmed_deposit':
        return data.filter(b => b.status === 'confirmed' && b.payment_status === 'deposit_paid');
      case 'confirmed_partial':
        return data.filter(b => b.status === 'confirmed' && b.payment_status === 'partial');
      case 'confirmed_overdue':
        return data.filter(b => b.status === 'confirmed' && b.payment_status === 'overdue');
      default:
        return data;
    }
  };

  // Clear selection when filters change
  useEffect(() => { setSelectedBookings([]); }, [activeTab, urlFilter, dateFrom, dateTo, productFilter]);

  const displayedBookings = useMemo(() => {
    const tabFiltered = activeTab === 'confirmed'
      ? bookings.filter(b => b.status === 'confirmed')
      : activeTab === 'provisional'
        ? bookings.filter(b => b.status === 'provisional')
        : activeTab === 'requested'
          ? bookings.filter(b => b.status === 'requested')
          : bookings;
    let result = applyFilter(tabFiltered, urlFilter);

    // Date range (trek date)
    if (dateFrom || dateTo) {
      result = result.filter(b => {
        if (!b.date) return false;
        const d = new Date(b.date);
        if (dateFrom && d < dateFrom) return false;
        if (dateTo) { const to = new Date(dateTo); to.setHours(23,59,59,999); if (d > to) return false; }
        return true;
      });
    }

    // Product
    if (productFilter !== 'all') {
      result = result.filter(b => {
        const p = (b.product || '').toLowerCase();
        if (productFilter === 'gorilla') return p.includes('gorilla');
        if (productFilter === 'golden') return p.includes('golden') || p.includes('monkey');
        return true;
      });
    }

    return result;
  }, [bookings, activeTab, urlFilter, dateFrom, dateTo, productFilter]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-900 dark:text-white">Bookings</h1>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {role === 'finance_admin' ? 'Manage and validate payments' : 'View your bookings'}
          </p>
        </div>
        {role === 'admin' && (
          <button
            onClick={() => navigate('/dashboard')}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
          >
            + Create Booking
          </button>
        )}
      </div>

      {/* Tabs row + product filter */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 mb-3">
        <nav className="flex -mb-px space-x-4">
          {[
            { key: 'all', label: 'All Bookings' },
            { key: 'confirmed', label: 'Confirmed' },
            { key: 'provisional', label: 'Provisional' },
            { key: 'requested', label: 'Requested' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >{label}</button>
          ))}
        </nav>
        <div className="inline-flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 mb-1">
          {[
            { key: 'all', label: 'All Products' },
            { key: 'gorilla', label: 'Mountain Gorillas' },
            { key: 'golden', label: 'Golden Monkeys' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setProductFilter(key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                productFilter === key
                  ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm'
                  : 'text-gray-500 dark:text-gray-300 hover:text-gray-900'
              }`}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* Date range bar */}
      <div className="flex items-center gap-3 mb-4">
        <DateRangeBar
          from={dateFrom}
          to={dateTo}
          onFromChange={setDateFrom}
          onToChange={setDateTo}
          onClear={() => { setDateFrom(null); setDateTo(null); }}
        />
        {urlFilter && (
          <span className="ml-auto text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full whitespace-nowrap">
            {urlFilter.replace(/_/g, ' ')}
            <button onClick={() => navigate('/bookings')} className="ml-1 hover:text-blue-800">×</button>
          </span>
        )}
      </div>

      {/* Batch action bar */}
      {selectedBookings.length > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-xs font-medium text-blue-700">{selectedBookings.length} selected</span>
          <div className="flex items-center gap-2 ml-2">
            {role === 'admin' && selectedBookings.some(b => b.status === 'requested') && (
              <>
                <button
                  onClick={() => handleBatchAction('confirm')}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Confirm Selected
                </button>
                <button
                  onClick={() => handleBatchAction('reject')}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                  Reject Selected
                </button>
              </>
            )}
            {role === 'admin' && selectedBookings.some(b => b.status === 'confirmed') && (
              <button
                onClick={() => handleBatchAction('send_to_finance')}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Send to Finance
              </button>
            )}
            {role === 'admin' && (
              <button
                onClick={() => handleBatchAction('payment_request')}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Send Payment Request
              </button>
            )}
          </div>
          <button
            onClick={() => setSelectedBookings([])}
            className="ml-auto text-xs text-blue-500 hover:text-blue-700"
          >
            Clear selection
          </button>
        </div>
      )}

      <EnhancedTable
        data={displayedBookings}
        columns={getColumns}
        onSelectionChange={setSelectedBookings}
        defaultHiddenColumns={
          role === 'admin'
            ? ['agent_client', 'head_of_file', 'date_of_request', 'available_slots', 'authorization_status', 'passport_count']
            : role === 'finance_admin'
            ? ['agent_client', 'head_of_file', 'date_of_request', 'available_slots']
            : ['agent_client', 'head_of_file', 'date_of_request', 'available_slots']
        }
        onRowClick={handleRowClick}
      />

      {drawerBooking && (
        <div className="fixed inset-0 bg-black/20 z-30" onClick={closeDrawer} />
      )}

      {drawerBooking && (
        <div className="fixed inset-y-0 right-0 w-[460px] bg-white dark:bg-gray-800 shadow-xl z-40 flex flex-col"
             style={{ animation: 'slideInRight 0.2s ease-out' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {drawerBooking.booking_name || 'Booking Details'}
              </h2>
              {drawerBooking.booking_ref && (
                <p className="text-xs text-gray-400 mt-0.5">Ref: {drawerBooking.booking_ref}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeTab === 'confirmed' && (
                <button
                  onClick={() => navigate(`/bookings/${drawerBooking.id}/client`)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Full Details →
                </button>
              )}
              <button onClick={closeDrawer} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none ml-1">×</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0 px-5">
            <button
              onClick={() => setActiveDrawerTab('timeline')}
              className={`py-2.5 px-1 mr-5 text-xs font-medium border-b-2 transition-colors ${
                activeDrawerTab === 'timeline'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => {
                setActiveDrawerTab('details');
                if (!drawerDetails && !drawerLoading) fetchDrawerDetails(drawerBooking.id);
              }}
              className={`py-2.5 px-1 text-xs font-medium border-b-2 transition-colors ${
                activeDrawerTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Voucher & Passports
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeDrawerTab === 'timeline' && (
              <BookingTimeline bookingId={drawerBooking.id} />
            )}

            {activeDrawerTab === 'details' && (
              <>
                {drawerLoading && (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="ml-2 text-xs text-gray-500">Loading…</span>
                  </div>
                )}
                {drawerError && !drawerLoading && (
                  <p className="text-xs text-red-500 py-4">Error: {drawerError}</p>
                )}
                {drawerDetails && !drawerLoading && (
                  <div className="space-y-6">
                    <section>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Voucher Details
                      </h3>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        {[
                          ['Booking Ref', drawerDetails.booking_ref],
                          ['Product', drawerDetails.product],
                          ['Site', drawerDetails.site],
                          ['Trek Date', drawerDetails.date ? new Date(drawerDetails.date).toLocaleDateString() : '-'],
                          ['Request Date', drawerDetails.date_of_request ? new Date(drawerDetails.date_of_request).toLocaleDateString() : '-'],
                          ['Head of File', drawerDetails.head_of_file || '-'],
                          ['Agent / Client', drawerDetails.agent_client || '-'],
                          ['People', drawerDetails.number_of_people],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
                            <p className="text-sm text-gray-900 dark:text-white mt-0.5">{value || '-'}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      {(() => {
                        const passportCount = drawerDetails.passports.length;
                        const peopleCount = drawerDetails.number_of_people || 0;
                        const passportsComplete = passportCount >= peopleCount && peopleCount > 0;
                        const canPurchaseFull = drawerDetails.validation_status === 'ok_to_purchase_full';
                        const canPurchaseDeposit = drawerDetails.validation_status === 'ok_to_purchase_deposit';
                        const canPurchaseAuth = drawerDetails.validation_status === 'do_not_purchase' && drawerDetails.authorization_status === 'authorized';
                        return (
                          <>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Passports ({passportCount} / {peopleCount})
                              </h3>
                              {passportsComplete
                                ? <span className="text-xs text-green-600 font-medium">Complete ✓</span>
                                : <span className="text-xs text-red-600 font-medium">Incomplete ⚠</span>}
                            </div>
                            {passportCount === 0 ? (
                              <p className="text-xs text-gray-400">No passport records found.</p>
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
                                    {drawerDetails.passports.map((p, i) => (
                                      <tr key={i}>
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

                            {/* Passport & Voucher actions */}
                            <div className="mt-3 flex gap-2 flex-wrap">
                              {(!passportsComplete || role === 'admin') && (
                                <button
                                  onClick={() => { localStorage.setItem('activeBookingId', drawerBooking.id); navigate('/passport-management'); }}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700"
                                >
                                  {passportsComplete ? 'Manage Passports' : `Upload Passports (${passportCount}/${peopleCount})`}
                                </button>
                              )}
                              <button
                                onClick={() => { localStorage.setItem('activeBookingId', drawerBooking.id); navigate('/voucher-management'); }}
                                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-md hover:bg-gray-200"
                              >
                                {drawerDetails.voucher ? 'View Voucher ✓' : 'Manage Voucher'}
                              </button>
                            </div>

                            {/* Admin permit purchase */}
                            {role === 'admin' && (canPurchaseFull || canPurchaseDeposit || canPurchaseAuth) && (
                              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Permit Purchase</h3>
                                {canPurchaseFull && !passportsComplete && (
                                  <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-700 mb-3">
                                    Passports mandatory for full payment — {peopleCount - passportCount} missing.
                                  </div>
                                )}
                                <div className="flex gap-2 flex-wrap">
                                  <a href={PERMIT_URL} target="_blank" rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium rounded-md hover:bg-gray-200">
                                    Go to Permit Site →
                                  </a>
                                  {canPurchaseFull && (
                                    <button disabled={!passportsComplete}
                                      onClick={() => { handlePurchasePermits(drawerBooking.id, 'full'); closeDrawer(); }}
                                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed">
                                      Mark as Purchased (Full)
                                    </button>
                                  )}
                                  {canPurchaseDeposit && (
                                    <button onClick={() => { handlePurchasePermits(drawerBooking.id, 'deposit'); closeDrawer(); }}
                                      className="px-3 py-1.5 bg-yellow-500 text-white text-xs font-medium rounded-md hover:bg-yellow-600">
                                      Mark as Purchased (Deposit)
                                    </button>
                                  )}
                                  {canPurchaseAuth && (
                                    <button onClick={() => { handlePurchasePermits(drawerBooking.id, 'authorization'); closeDrawer(); }}
                                      className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700">
                                      Mark as Purchased (Auth)
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </section>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {modalsJSX}

    </div>
  );
};

export default Bookings;