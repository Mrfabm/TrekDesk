import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import EnhancedTable from '../components/EnhancedTable';

const API = 'http://localhost:8000/api';

const FinanceDashboard = () => {
  const [bookings, setBookings] = useState([]);
  const [chaseRecords, setChaseRecords] = useState([]);
  const [amendmentsPending, setAmendmentsPending] = useState([]);
  const [activeTab, setActiveTab] = useState('pending_validation');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'finance_admin') {
      navigate('/dashboard');
      return;
    }
    loadAll();
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [bookRes, chaseRes, amendRes] = await Promise.all([
        fetch(`${API}/bookings/all`, { headers }),
        fetch(`${API}/chase`, { headers }),
        fetch(`${API}/amendments/pending`, { headers }),
      ]);
      if (bookRes.ok) setBookings(await bookRes.json());
      if (chaseRes.ok) setChaseRecords(await chaseRes.json());
      if (amendRes.ok) setAmendmentsPending(await amendRes.json());
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = (amount) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

  const today = new Date().toDateString();

  // --- Derived tab datasets ---
  const pendingValidation = bookings.filter(
    (b) => b.status === 'confirmed' && b.validation_status === 'pending'
  );
  const chaseBookings = bookings.filter((b) => b.status === 'chase');
  const awaitingAuth = bookings.filter((b) => b.status === 'awaiting_authorization');
  const todayBookings = bookings.filter(
    (b) => b.date && new Date(b.date).toDateString() === today
  );
  const overdueBookings = bookings.filter((b) => {
    if (!b.payment_status) return false;
    const balanceOverdue =
      b.balance_due_date &&
      b.payment_status !== 'fully_paid' &&
      new Date(b.balance_due_date) < new Date();
    const depositOverdue =
      b.payment_status === 'pending' &&
      b.deposit_due_date &&
      new Date(b.deposit_due_date) < new Date();
    return b.payment_status === 'overdue' || balanceOverdue || depositOverdue;
  });

  const tabs = [
    { key: 'pending_validation', label: 'Pending Validation', count: pendingValidation.length, color: 'yellow' },
    { key: 'chase', label: 'Chase', count: chaseBookings.length, color: 'red' },
    { key: 'awaiting_auth', label: 'Awaiting Auth', count: awaitingAuth.length, color: 'purple' },
    { key: 'amendment_fees', label: 'Amendment Fees', count: amendmentsPending.length, color: 'orange' },
    { key: 'overdue', label: 'Overdue', count: overdueBookings.length, color: 'red' },
    { key: 'today', label: "Today's Bookings", count: todayBookings.length, color: 'blue' },
    { key: 'all', label: 'All Bookings', count: bookings.length, color: 'gray' },
  ];

  const tabData = {
    pending_validation: pendingValidation,
    chase: chaseBookings,
    awaiting_auth: awaitingAuth,
    overdue: overdueBookings,
    today: todayBookings,
    all: bookings,
  };

  // --- Badges ---
  const bookingStatusBadge = (status) => {
    const map = {
      confirmed: 'bg-blue-100 text-blue-800',
      provisional: 'bg-gray-100 text-gray-700',
      chase: 'bg-red-100 text-red-800',
      awaiting_authorization: 'bg-purple-100 text-purple-800',
      secured_full: 'bg-green-100 text-green-800',
      secured_deposit: 'bg-teal-100 text-teal-800',
      secured_authorization: 'bg-cyan-100 text-cyan-800',
      released: 'bg-red-200 text-red-900',
      cancelled: 'bg-gray-300 text-gray-800',
      amendment_requested: 'bg-orange-100 text-orange-800',
    };
    const label = status ? status.replace(/_/g, ' ') : '-';
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
        {label}
      </span>
    );
  };

  const paymentBadge = (status) => {
    const map = {
      pending: 'bg-gray-100 text-gray-700',
      deposit_paid: 'bg-yellow-100 text-yellow-800',
      partial: 'bg-orange-100 text-orange-800',
      fully_paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-red-200 text-red-900',
    };
    const label = status ? status.replace(/_/g, ' ') : 'none';
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
        {label}
      </span>
    );
  };

  // --- Standard booking columns ---
  const bookingColumns = [
    {
      header: 'Ref / Name',
      accessor: 'booking_name',
      render: (row) => (
        <div>
          <p className="text-xs font-medium text-gray-900 dark:text-white">{row.booking_name}</p>
          <p className="text-xs text-gray-400">{row.booking_ref || '-'}</p>
        </div>
      ),
    },
    {
      header: 'Product',
      accessor: 'product',
      render: (row) => <span className="text-xs text-gray-700 dark:text-gray-300">{row.product || '-'}</span>,
    },
    {
      header: 'Trek Date',
      accessor: 'date',
      render: (row) => (
        <span className="text-xs text-gray-700 dark:text-gray-300">
          {row.date ? new Date(row.date).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      header: 'Pax',
      accessor: 'number_of_people',
      render: (row) => <span className="text-xs text-gray-700 dark:text-gray-300">{row.number_of_people}</span>,
    },
    {
      header: 'Booking Status',
      accessor: 'status',
      render: (row) => bookingStatusBadge(row.status),
    },
    {
      header: 'Payment',
      accessor: 'payment_status',
      render: (row) => paymentBadge(row.payment_status),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); navigate(`/finance/validate/${row.id}`); }}
          className="px-3 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
        >
          Validate
        </button>
      ),
    },
  ];

  // --- Chase-specific columns ---
  const chaseColumns = [
    {
      header: 'Ref / Name',
      accessor: 'booking_name',
      render: (row) => (
        <div>
          <p className="text-xs font-medium text-gray-900 dark:text-white">{row.booking_name}</p>
          <p className="text-xs text-gray-400">{row.booking_ref || '-'}</p>
        </div>
      ),
    },
    {
      header: 'Agent',
      accessor: 'agent',
      render: (row) => <span className="text-xs text-gray-700 dark:text-gray-300">{row.agent || '-'}</span>,
    },
    {
      header: 'Trek Date',
      accessor: 'date',
      render: (row) => <span className="text-xs text-gray-700 dark:text-gray-300">{row.date ? new Date(row.date).toLocaleDateString() : '-'}</span>,
    },
    {
      header: 'Chase #',
      accessor: 'chase_count',
      render: (row) => (
        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${row.chase_count >= 4 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
          {row.chase_count} / 5
        </span>
      ),
    },
    {
      header: 'Last Chase',
      accessor: 'last_chase_at',
      render: (row) => <span className="text-xs text-gray-500">{row.last_chase_at ? new Date(row.last_chase_at).toLocaleDateString() : '-'}</span>,
    },
    {
      header: 'Next Chase',
      accessor: 'next_chase_at',
      render: (row) => <span className="text-xs text-gray-500">{row.next_chase_at ? new Date(row.next_chase_at).toLocaleDateString() : '-'}</span>,
    },
  ];

  // --- Amendment fee columns ---
  const amendmentColumns = [
    {
      header: 'Booking',
      accessor: 'booking_name',
      render: (row) => <span className="text-xs font-medium text-gray-900 dark:text-white">{row.booking?.booking_name || row.booking_name || '-'}</span>,
    },
    {
      header: 'Original Date',
      accessor: 'original_date',
      render: (row) => <span className="text-xs text-gray-700 dark:text-gray-300">{row.original_date ? new Date(row.original_date).toLocaleDateString() : '-'}</span>,
    },
    {
      header: 'New Date',
      accessor: 'requested_date',
      render: (row) => <span className="text-xs text-gray-700 dark:text-gray-300">{row.requested_date ? new Date(row.requested_date).toLocaleDateString() : '-'}</span>,
    },
    {
      header: 'Fee Type',
      accessor: 'fee_type',
      render: (row) => (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${row.fee_type === 'next_year_full' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
          {row.fee_type === 'next_year_full' ? '100% (Next Year)' : '20% (Same Year)'}
        </span>
      ),
    },
    {
      header: 'Fee Amount',
      accessor: 'fee_amount',
      render: (row) => <span className="text-xs font-semibold text-gray-900 dark:text-white">{fmt(row.fee_amount)}</span>,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
          row.status === 'fee_paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {row.status?.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (row) => row.status === 'pending' ? (
        <button
          onClick={(e) => { e.stopPropagation(); confirmFeePaid(row.id); }}
          className="px-3 py-1 bg-green-50 text-green-700 rounded text-xs font-medium hover:bg-green-100 transition-colors whitespace-nowrap"
        >
          Confirm Fee Paid
        </button>
      ) : null,
    },
  ];

  const confirmFeePaid = async (amendmentId) => {
    try {
      const res = await fetch(`${API}/amendments/${amendmentId}/confirm-fee-paid`, {
        method: 'POST',
        headers,
      });
      if (res.ok) {
        loadAll();
      } else {
        const err = await res.json();
        setError(err.detail || 'Failed to confirm fee');
      }
    } catch {
      setError('Failed to confirm amendment fee');
    }
  };

  // --- Summary card counts ---
  const summaryCards = [
    { label: 'Pending Validation', value: pendingValidation.length, color: 'text-yellow-600', border: 'border-l-yellow-500', tab: 'pending_validation' },
    { label: 'In Chase',           value: chaseBookings.length,     color: 'text-red-600',    border: 'border-l-red-500',    tab: 'chase' },
    { label: 'Awaiting Auth',      value: awaitingAuth.length,      color: 'text-purple-600', border: 'border-l-purple-500', tab: 'awaiting_auth' },
    { label: 'Overdue',            value: overdueBookings.length,   color: 'text-red-700',    border: 'border-l-red-600',    tab: 'overdue' },
  ];

  const tabColor = (tab) => {
    const colors = {
      yellow: 'border-yellow-500 text-yellow-600',
      red: 'border-red-500 text-red-600',
      purple: 'border-purple-500 text-purple-600',
      orange: 'border-orange-500 text-orange-600',
      blue: 'border-blue-500 text-blue-600',
      gray: 'border-gray-400 text-gray-600',
    };
    return colors[tab.color] || 'border-blue-500 text-blue-600';
  };

  const renderTable = () => {
    if (activeTab === 'chase') {
      return <EnhancedTable data={chaseRecords} columns={chaseColumns} />;
    }
    if (activeTab === 'amendment_fees') {
      return <EnhancedTable data={amendmentsPending} columns={amendmentColumns} />;
    }
    return <EnhancedTable data={tabData[activeTab] || []} columns={bookingColumns} />;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Finance Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage payments, chase, authorizations and amendment fees</p>
        </div>
        <button
          onClick={loadAll}
          className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-3 text-sm rounded">
          {error}
        </div>
      )}

      {/* Summary Cards — clickable to jump to tab */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {summaryCards.map((c) => (
          <button
            key={c.label}
            onClick={() => setActiveTab(c.tab)}
            className={`text-left bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-l-4 p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${c.border} ${
              activeTab === c.tab
                ? 'border-gray-200 dark:border-gray-700 ring-2 ring-blue-200 dark:ring-blue-800'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider leading-none">{c.label}</p>
            <p className={`text-3xl font-bold mt-2 leading-none ${c.color}`}>{c.value}</p>
          </button>
        ))}
      </div>

      {/* Tabs + Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 overflow-x-auto">
          <nav className="flex gap-1 -mb-px min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? tabColor(tab)
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full font-medium ${
                    activeTab === tab.key ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4">
          {loading ? (
            <p className="text-sm text-center text-gray-500 py-8">Loading...</p>
          ) : (
            renderTable()
          )}
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard;
