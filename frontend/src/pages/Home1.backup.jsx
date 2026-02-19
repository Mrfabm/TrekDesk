import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useTheme } from '../context/ThemeContext';

const ActionCard = ({ icon, color, count, label }) => (
  <div className={`p-3 bg-${color}-50 rounded-lg`}>
    <div className="flex justify-between items-center mb-2">
      <div className={`p-1.5 rounded-lg bg-${color}-100`}>
        <svg className={`w-4 h-4 text-${color}-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {icon === 'clock' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
          {icon === 'check' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
          {icon === 'dollar' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
          {icon === 'x' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />}
        </svg>
      </div>
      <span className="text-lg font-semibold">{count}</span>
    </div>
    <p className="text-xs">{label}</p>
  </div>
);

const MetricCard = ({ title, total, items }) => (
  <div className="bg-white rounded-lg p-4 shadow-sm">
    <h3 className="text-gray-600 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-semibold mt-1">{total}</p>
    <div className="mt-2 space-y-1">
      {items.map(item => (
        <div key={item.label} className="flex justify-between text-xs">
          <span className="text-gray-500">{item.label}</span>
          <span className="font-medium">{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);

const Home1 = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();
  
  // Updated state structure to handle all tracking requirements
  const [stats, setStats] = useState({
    confirmedBookings: {
      total: 0,
      fullPayment: { count: 0, amount: 0, permits: {} },
      deposit: { count: 0, amount: 0, due: 0, permits: {} },
      rollingDeposit: { count: 0, used: 0, due: 0, permits: {} },
      authorized: { count: 0, due: 0, permits: {} }
    },
    amendments: {
      under: 0,
      completed: 0,
      declined: 0,
      lastMinute: 0
    },
    cancellations: {
      under: 0,
      completed: 0,
      lastMinute: 0
    },
    pending: {
      noPayment: 0,
      missingDetails: 0,
      depositDue: 0,
      authorizationDue: 0
    },
    deadlines: {
      critical: 0,
      warning: 0
    }
  });

  const [quickActions, setQuickActions] = useState({
    confirmationRequests: 0,
    okToPurchaseFull: 0,
    okToPurchaseDeposit: 0,
    doNotPurchase: 0,
    confirmationAuthorized: 0
  });

  const [todayConfirmed, setTodayConfirmed] = useState({
    fullyPaid: { count: 0, permits: {} },
    deposit: { count: 0, permits: {} },
    authorized: { count: 0, permits: {} }
  });

  const [filters, setFilters] = useState({
    dateRange: {
      from: null,
      to: null
    },
    status: {
      confirmed: false,
      declined: false,
      pending: false
    },
    product: 'all',
    advanced: {
      noSlots: { checked: false, count: 1 },
      unpaid: { checked: false, count: 1 },
      topUpDue: { checked: false, count: 2 },
      cancelled: { checked: false, count: 0 },
      amended: { checked: false, count: 0 }
    }
  });

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/bookings', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          // Process data and update all stats
          // This will be implemented based on API response structure
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleDateChange = (dates) => {
    const [start, end] = dates;
    setFilters(prev => ({
      ...prev,
      dateRange: { from: start, to: end }
    }));
  };

  const handleStatusChange = (status) => {
    setFilters(prev => ({
      ...prev,
      status: {
        ...prev.status,
        [status]: !prev.status[status]
      }
    }));
  };

  const handleProductChange = (product) => {
    setFilters(prev => ({
      ...prev,
      product
    }));
  };

  const handleAdvancedFilterChange = (filter) => {
    setFilters(prev => ({
      ...prev,
      advanced: {
        ...prev.advanced,
        [filter]: {
          ...prev.advanced[filter],
          checked: !prev.advanced[filter].checked
        }
      }
    }));
  };

  const StatusCard = ({ title, count, percentage, icon, color }) => (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
        <span className="text-sm text-gray-500">{percentage}%</span>
      </div>
      <div className="mt-2">
        <span className="text-2xl font-bold">{count}</span>
        <p className="text-sm text-gray-600 mt-1">{title}</p>
      </div>
    </div>
  );

  return (
    <div className="p-4 max-w-[1920px] mx-auto">
      {/* Header with Date Filters */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold">Welcome Back, Admin</h1>
          <p className="text-xs text-gray-500">Last updated: 13:15:26</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm">Today</button>
          <DatePicker
            selected={filters.dateRange.from}
            onChange={(date) => handleDateChange([date, filters.dateRange.to])}
            placeholderText="From"
            className="px-3 py-1.5 border rounded-lg text-sm w-32"
          />
          <DatePicker
            selected={filters.dateRange.to}
            onChange={(date) => handleDateChange([filters.dateRange.from, date])}
            placeholderText="To"
            className="px-3 py-1.5 border rounded-lg text-sm w-32"
          />
        </div>
      </div>

      {/* Immediate Attention Section */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Quick Actions</h3>
            <span className="text-xs text-gray-500">Real-time updates</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <ActionCard
              icon="clock"
              color="orange"
              count={quickActions.confirmationRequests}
              label="Confirmation Requests"
            />
            <ActionCard
              icon="check"
              color="green"
              count={quickActions.okToPurchaseFull}
              label="OK to Purchase (Full)"
            />
            <ActionCard
              icon="dollar"
              color="blue"
              count={quickActions.okToPurchaseDeposit}
              label="OK to Purchase (Deposit)"
            />
            <ActionCard
              icon="x"
              color="red"
              count={quickActions.doNotPurchase}
              label="Do Not Purchase"
            />
          </div>
        </div>

        {/* Today's Bookings Summary */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Today's Bookings</h3>
            <button className="text-blue-600 text-xs">View All</button>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <div>
                <span className="text-sm font-medium">Fully Paid</span>
                <div className="text-xs text-gray-500 mt-1">
                  {Object.entries(todayConfirmed.fullyPaid.permits)
                    .map(([type, count]) => `${count} ${type}`)
                    .join(', ')}
                </div>
              </div>
              <span className="text-lg font-semibold">{todayConfirmed.fullyPaid.count}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <div>
                <span className="text-sm font-medium">Deposit</span>
                <div className="text-xs text-gray-500 mt-1">
                  {Object.entries(todayConfirmed.deposit.permits)
                    .map(([type, count]) => `${count} ${type}`)
                    .join(', ')}
                </div>
              </div>
              <span className="text-lg font-semibold">{todayConfirmed.deposit.count}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <div>
                <span className="text-sm font-medium">Authorized</span>
                <div className="text-xs text-gray-500 mt-1">
                  {Object.entries(todayConfirmed.authorized.permits)
                    .map(([type, count]) => `${count} ${type}`)
                    .join(', ')}
                </div>
              </div>
              <span className="text-lg font-semibold">{todayConfirmed.authorized.count}</span>
            </div>
          </div>
        </div>

        {/* Critical Deadlines */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold">Critical Deadlines</h3>
            <span className="text-xs text-gray-500">Next 48 hours</span>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-red-700">Critical</span>
                <span className="text-lg font-semibold text-red-700">{stats.deadlines.critical}</span>
              </div>
              <p className="text-xs text-red-600 mt-1">Requires immediate attention</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-orange-700">Warning</span>
                <span className="text-lg font-semibold text-orange-700">{stats.deadlines.warning}</span>
              </div>
              <p className="text-xs text-orange-600 mt-1">Action needed soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Section */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Confirmed Bookings"
          total={stats.confirmedBookings.total}
          items={[
            { label: 'Full Payment', value: stats.confirmedBookings.fullPayment.count },
            { label: 'Deposit', value: stats.confirmedBookings.deposit.count },
            { label: 'Rolling Deposit', value: stats.confirmedBookings.rollingDeposit.count },
            { label: 'Authorized', value: stats.confirmedBookings.authorized.count }
          ]}
        />
        <MetricCard
          title="Amendments"
          total={stats.amendments.under + stats.amendments.completed + stats.amendments.declined + stats.amendments.lastMinute}
          items={[
            { label: 'Under Amendment', value: stats.amendments.under },
            { label: 'Amended', value: stats.amendments.completed },
            { label: 'Declined', value: stats.amendments.declined },
            { label: 'Last Minute', value: stats.amendments.lastMinute }
          ]}
        />
        <MetricCard
          title="Cancellations"
          total={stats.cancellations.under + stats.cancellations.completed + stats.cancellations.lastMinute}
          items={[
            { label: 'Under Cancellation', value: stats.cancellations.under },
            { label: 'Cancelled', value: stats.cancellations.completed },
            { label: 'Last Minute', value: stats.cancellations.lastMinute }
          ]}
        />
        <MetricCard
          title="Pending Actions"
          total={stats.pending.noPayment + stats.pending.missingDetails + stats.pending.depositDue + stats.pending.authorizationDue}
          items={[
            { label: 'No Payment', value: stats.pending.noPayment },
            { label: 'Missing Details', value: stats.pending.missingDetails },
            { label: 'Deposit Due', value: stats.pending.depositDue },
            { label: 'Authorization Due', value: stats.pending.authorizationDue }
          ]}
        />
      </div>
    </div>
  );
};

export default Home1; 