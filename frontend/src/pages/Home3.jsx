import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import "../styles/datepicker-custom.css";
import { useTheme } from '../context/ThemeContext';
import { Collapsible } from '../components/Collapsible';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { allBookingsData } from './ViewBookings1';

const colorMap = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    hoverBg: 'hover:bg-blue-100/80',
    iconBg: 'bg-blue-100',
    text: 'text-blue-700'
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    hoverBg: 'hover:bg-green-100/80',
    iconBg: 'bg-green-100',
    text: 'text-green-700'
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    hoverBg: 'hover:bg-yellow-100/80',
    iconBg: 'bg-yellow-100',
    text: 'text-yellow-700'
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    hoverBg: 'hover:bg-red-100/80',
    iconBg: 'bg-red-100',
    text: 'text-red-700'
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    hoverBg: 'hover:bg-purple-100/80',
    iconBg: 'bg-purple-100',
    text: 'text-purple-700'
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    hoverBg: 'hover:bg-orange-100/80',
    iconBg: 'bg-orange-100',
    text: 'text-orange-700'
  }
};

const ActionCard = ({ icon, color, count, label, onClick }) => {
  const colors = colorMap[color];
  return (
    <div 
      onClick={onClick}
      className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${colors.bg} ${colors.border} ${colors.hoverBg}`}
    >
      <div className="flex justify-between items-center mb-1.5">
        <div className={`p-1.5 rounded-lg ${colors.iconBg}`}>
          {typeof icon === 'string' ? (
          <svg className={`w-4 h-4 ${colors.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {icon === 'clock' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
            {icon === 'check' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
            {icon === 'dollar' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
            {icon === 'x' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />}
          </svg>
          ) : (
            icon
          )}
        </div>
        <span className={`text-lg font-bold ${colors.text}`}>{count}</span>
      </div>
      <p className={`text-xs font-medium ${colors.text} mt-1`}>{label}</p>
    </div>
  );
};

const CustomTooltip = ({ children, text }) => (
  <div className="group relative inline-block">
    {children}
    <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg whitespace-nowrap">
      {text}
    </div>
  </div>
);

const MetricCard = ({ title, total = 0, items = [], onItemClick, tooltip }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 transition-colors duration-200">
    <div className="border-b border-gray-100 dark:border-gray-700 pb-3 mb-3">
      <div className="flex justify-between items-baseline">
        <div className="flex items-center gap-2">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">{title}</h3>
          {tooltip && (
            <CustomTooltip text={tooltip}>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </CustomTooltip>
          )}
        </div>
        <span className="text-2xl font-bold text-gray-800 dark:text-white">{total}</span>
      </div>
    </div>
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={index}
          onClick={() => onItemClick && onItemClick(item.label)}
          className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">{item.label}</span>
            {item.tooltip && (
              <CustomTooltip text={item.tooltip}>
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </CustomTooltip>
            )}
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);

const Home3 = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [showFilters, setShowFilters] = useState(false);
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [showDatePresets, setShowDatePresets] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentUser = localStorage.getItem('username');
  const isAdmin = localStorage.getItem('role') === 'admin';
  const [immediateAttentionOpen, setImmediateAttentionOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  const [stats, setStats] = useState({
    deadlines: { critical: 0, warning: 0 },
    quickActions: 0,
    todayBookings: 0,
    criticalDeadlines: 0,
    amendments: { under: 0, completed: 0, declined: 0 },
    cancellations: { under: 0, completed: 0 },
    pendingPayments: 0,
    confirmedBookings: {
      total: 0,
      fullPayment: { count: 0 },
      deposit: { count: 0 },
      rollingDeposit: { count: 0 },
      authorized: { count: 0 }
    },
    pending: {
      noPayment: 0,
      missingDetails: 0,
      depositDue: 0,
      authorizationDue: 0
    }
  });

  const [quickActions, setQuickActions] = useState({
    confirmationRequests: 0,
    okToPurchaseFull: 0,
    okToPurchaseDeposit: 0,
    doNotPurchase: 0,
    total: 0
  });

  const [todayConfirmed, setTodayConfirmed] = useState({
    fullyPaid: { count: 0, permits: {} },
    deposit: { count: 0, permits: {} },
    authorized: { count: 0, permits: {} }
  });

  const [filters, setFilters] = useState({
    dateRange: { from: null, to: null },
    bookingStatus: {
      confirmed: false,
      pending: false,
      underAmendment: false,
      underCancellation: false
    },
    paymentStatus: {
      fullyPaid: false,
      depositPaid: false,
      paymentDue: false,
      authorized: false
    },
    productType: {
      mountainGorillas: false,
      goldenMonkeys: false
    }
  });

  // Filter data based on head of file
  const filteredBookingsData = React.useMemo(() => {
    if (isAdmin) {
      return allBookingsData; // Admin sees all data
    }
    // Regular users only see their bookings
    const userBookings = allBookingsData.filter(booking => booking.head_of_file === currentUser);
    return userBookings;
  }, [currentUser, isAdmin]);

  // Calculate stats based on filtered data
  const calculateStats = (data) => {
    if (!data || data.length === 0) {
      return {
        deadlines: { critical: 0, warning: 0 },
        quickActions: 0,
        todayBookings: 0,
        criticalDeadlines: 0,
        amendments: { under: 0, completed: 0, declined: 0 },
        cancellations: { under: 0, completed: 0 },
        pendingPayments: 0,
        confirmedBookings: {
          total: 0,
          fullPayment: { count: 0 },
          deposit: { count: 0 },
          rollingDeposit: { count: 0 },
          authorized: { count: 0 }
        },
        pending: {
          noPayment: 0,
          missingDetails: 0,
          depositDue: 0,
          authorizationDue: 0
        }
      };
    }
    return {
      deadlines: {
        critical: data.filter(b => b.validation_status === 'do_not_purchase').length,
        warning: data.filter(b => b.validation_status === 'pending').length
      },
      quickActions: data.filter(b => 
        b.booking_status === 'requested' || 
        b.validation_status === 'ok_to_purchase_full' || 
        b.validation_status === 'ok_to_purchase_deposit' || 
        b.validation_status === 'do_not_purchase'
      ).length,
      todayBookings: data.filter(b => {
        const today = new Date().toISOString().split('T')[0];
        return b.date_of_request?.split('T')[0] === today;
      }).length,
      criticalDeadlines: data.filter(b => b.validation_status === 'do_not_purchase').length,
      amendments: {
        under: data.filter(b => b.booking_status === 'amended' && b.payment_status !== 'fully_paid').length,
        completed: data.filter(b => b.booking_status === 'amended' && b.payment_status === 'fully_paid').length,
        declined: data.filter(b => b.booking_status === 'rejected').length
      },
      cancellations: {
        under: data.filter(b => b.booking_status === 'rejected' && b.payment_status !== 'cancelled').length,
        completed: data.filter(b => b.booking_status === 'rejected' && b.payment_status === 'cancelled').length
      },
      pendingPayments: data.filter(b => ['pending', 'partial', 'overdue'].includes(b.payment_status)).length,
      confirmedBookings: {
        total: data.filter(b => b.booking_status === 'confirmed').length,
        fullPayment: { 
          count: data.filter(b => b.booking_status === 'confirmed' && b.payment_status === 'fully_paid').length 
        },
        deposit: { 
          count: data.filter(b => b.booking_status === 'confirmed' && b.payment_status === 'deposit_paid').length 
        },
        rollingDeposit: { 
          count: data.filter(b => b.booking_status === 'confirmed' && b.payment_status === 'rolling_deposit').length 
        },
        authorized: { 
          count: data.filter(b => b.booking_status === 'confirmed' && b.payment_status === 'authorized').length 
        }
      },
      pending: {
        noPayment: data.filter(b => b.payment_status === 'pending').length,
        missingDetails: data.filter(b => b.booking_status === 'requested' && b.validation_status === 'pending').length,
        depositDue: data.filter(b => b.validation_status === 'ok_to_purchase_deposit').length,
        authorizationDue: data.filter(b => b.booking_status === 'provisional' && b.validation_status === 'pending').length
      }
    };
  };

  // Calculate quick actions based on filtered data
  const calculateQuickActions = (data) => {
    return {
      confirmationRequests: data.filter(b => b.booking_status === 'requested').length,
      okToPurchaseFull: data.filter(b => b.validation_status === 'ok_to_purchase_full').length,
      okToPurchaseDeposit: data.filter(b => b.validation_status === 'ok_to_purchase_deposit').length,
      doNotPurchase: data.filter(b => b.validation_status === 'do_not_purchase').length,
      total: data.filter(b => 
        b.booking_status === 'requested' || 
        b.validation_status === 'ok_to_purchase_full' || 
        b.validation_status === 'ok_to_purchase_deposit' || 
        b.validation_status === 'do_not_purchase'
      ).length
    };
  };

  // Calculate today's confirmed bookings based on filtered data
  const calculateTodayConfirmed = (data) => {
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = data.filter(b => b.date_of_request?.split('T')[0] === today);

    return {
      fullyPaid: {
        count: todayBookings.filter(b => b.booking_status === 'confirmed' && b.payment_status === 'fully_paid').length,
        permits: calculatePermits(todayBookings.filter(b => b.booking_status === 'confirmed' && b.payment_status === 'fully_paid'))
      },
      deposit: {
        count: todayBookings.filter(b => b.booking_status === 'confirmed' && b.payment_status === 'deposit_paid').length,
        permits: calculatePermits(todayBookings.filter(b => b.booking_status === 'confirmed' && b.payment_status === 'deposit_paid'))
      },
      authorized: {
        count: todayBookings.filter(b => b.booking_status === 'confirmed' && b.payment_status === 'authorized').length,
        permits: calculatePermits(todayBookings.filter(b => b.booking_status === 'confirmed' && b.payment_status === 'authorized'))
      }
    };
  };

  // Update stats when filtered data changes
  useEffect(() => {
    if (!isAdmin && (!filteredBookingsData || filteredBookingsData.length === 0)) {
      setStats(calculateStats([]));
      setQuickActions({
        confirmationRequests: 0,
        okToPurchaseFull: 0,
        okToPurchaseDeposit: 0,
        doNotPurchase: 0,
        total: 0
      });
      setTodayConfirmed({
        fullyPaid: { count: 0, permits: {} },
        deposit: { count: 0, permits: {} },
        authorized: { count: 0, permits: {} }
      });
      setIsLoading(false);
      return;
    }
    setStats(calculateStats(filteredBookingsData));
    setQuickActions(calculateQuickActions(filteredBookingsData));
    setTodayConfirmed(calculateTodayConfirmed(filteredBookingsData));
    setIsLoading(false);
  }, [filteredBookingsData, isAdmin]);

  // Helper function to calculate permits
  const calculatePermits = (bookings) => {
    return bookings.reduce((acc, booking) => {
      const product = booking.product || 'Unknown';
      acc[product] = (acc[product] || 0) + (booking.number_of_permits || 1);
      return acc;
    }, {});
  };

  const handleMetricClick = (type, status = 'all') => {
    // Special handling for passport management related actions
    if (type === 'confirmed_full_payment' || type === 'confirmed_deposit') {
      navigate('/passport-management');
      return;
    }

    // For other metrics, navigate to view-bookings1 with filter
    const filterParam = status === 'all' ? type : `${type}_${status}`;
    navigate(`/view-bookings1?filter=${filterParam}`);
  };

  // Add filter panel component
  const FilterPanel = () => (
    <div className={`absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 ${showFilters ? 'block' : 'hidden'}`}>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
          <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-2">Booking Status</h4>
            <div className="space-y-2">
              {Object.entries(filters.bookingStatus).map(([key, value]) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => setFilters(prev => ({
                      ...prev,
                      bookingStatus: {
                        ...prev.bookingStatus,
                        [key]: !value
                      }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-2">Payment Status</h4>
            <div className="space-y-2">
              {Object.entries(filters.paymentStatus).map(([key, value]) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => setFilters(prev => ({
                      ...prev,
                      paymentStatus: {
                        ...prev.paymentStatus,
                        [key]: !value
                      }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-gray-500 mb-2">Product Type</h4>
            <div className="space-y-2">
              {Object.entries(filters.productType).map(([key, value]) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => setFilters(prev => ({
                      ...prev,
                      productType: {
                        ...prev.productType,
                        [key]: !value
                      }
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => {
              setFilters({
                dateRange: { from: null, to: null },
                bookingStatus: Object.keys(filters.bookingStatus).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
                paymentStatus: Object.keys(filters.paymentStatus).reduce((acc, key) => ({ ...acc, [key]: false }), {}),
                productType: Object.keys(filters.productType).reduce((acc, key) => ({ ...acc, [key]: false }), {})
              });
              setShowFilters(false);
            }}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-700"
          >
            Clear All
          </button>
          <button
            onClick={() => setShowFilters(false)}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );

  // Add date presets panel
  const DatePresetsPanel = () => (
    <div className={`absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 ${showDatePresets ? 'block' : 'hidden'}`}>
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-gray-900">Date Presets</h3>
          <button onClick={() => setShowDatePresets(false)} className="text-gray-400 hover:text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Today', days: 0 },
            { label: 'Last 7 Days', days: 7 },
            { label: 'Last 30 Days', days: 30 },
            { label: 'Last 90 Days', days: 90 }
          ].map(preset => (
            <button
              key={preset.label}
              onClick={() => {
                const to = new Date();
                const from = new Date();
                from.setDate(from.getDate() - preset.days);
                setFilters(prev => ({
                  ...prev,
                  dateRange: { from, to }
                }));
                setShowDatePresets(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Add a message for when there are no bookings
  const NoBookingsMessage = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No Bookings Found</h3>
      <p className="text-sm text-gray-500">You haven't opened any bookings yet. When you do, they will appear here.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Top Navigation */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-md">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col py-5 space-y-4">
            {/* Navigation Tabs */}
            <div className="flex items-center justify-between">
              <div className="inline-flex bg-gray-100 rounded-lg p-1">
                {['Overview', 'Bookings', 'Amendments', 'Cancellations'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab.toLowerCase())}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.toLowerCase()
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    Show Filters
                    {Object.values(filters).flat().some(value => value === true) && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium flex items-center justify-center rounded-full">
                        {Object.values(filters).flat().filter(value => value === true).length}
                      </span>
                    )}
                  </button>
                  <FilterPanel />
                </div>
                <button
                  onClick={() => setShowSavedFilters(!showSavedFilters)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50"
                >
                  Saved Filters
                </button>
                <button
                  onClick={toggleDarkMode}
                  className="p-2 text-gray-700 hover:text-gray-900 bg-white rounded-md border border-gray-200"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {darkMode ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Date Selection Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    const today = new Date();
                    setFilters(prev => ({
                      ...prev,
                      dateRange: { from: today, to: today }
                    }));
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  Today
                </button>
                <div className="flex items-center gap-3">
                  <DatePicker
                    selected={filters.dateRange.from}
                    onChange={date => setFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, from: date }
                    }))}
                    className="w-36 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholderText="From"
                    dateFormat="MMM d, yyyy"
                  />
                  <DatePicker
                    selected={filters.dateRange.to}
                    onChange={date => setFilters(prev => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, to: date }
                    }))}
                    className="w-36 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholderText="To"
                    dateFormat="MMM d, yyyy"
                    minDate={filters.dateRange.from}
                  />
                  <button
                    onClick={() => setFilters(prev => ({
                      ...prev,
                      dateRange: { from: null, to: null }
                    }))}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 whitespace-nowrap"
                  >
                    <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowDatePresets(!showDatePresets)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 whitespace-nowrap"
                    >
                      <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Date Range
                    </button>
                    <DatePresetsPanel />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {!isAdmin && (!filteredBookingsData || filteredBookingsData.length === 0) ? (
          <NoBookingsMessage />
        ) : (
          <>
            {/* Quick Stats Row */}
            <div className="grid grid-cols-7 gap-4 mb-8">
              <ActionCard
                icon={
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
                color="blue"
                count={Number(quickActions.confirmationRequests + quickActions.okToPurchaseFull + quickActions.okToPurchaseDeposit + quickActions.doNotPurchase || 0)}
                label="Quick Actions"
                onClick={() => navigate('/view-bookings1?filter=quick_actions')}
              />
              <ActionCard
                icon={
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                color="green"
                count={Number(stats.todayBookings || 0)}
                label="Today's Bookings"
                onClick={() => navigate('/view-bookings1?filter=today')}
              />
              <ActionCard
                icon={
                  <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                color="red"
                count={Number(stats.criticalDeadlines || 0)}
                label="Critical Deadlines"
                onClick={() => navigate('/view-bookings1?filter=critical')}
              />
              <ActionCard
                icon={
                  <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                }
                color="yellow"
                count={Number((stats.amendments?.under || 0) + (stats.amendments?.completed || 0) + (stats.amendments?.declined || 0))}
                label="Amendments"
                onClick={() => navigate('/view-bookings1?filter=amendments')}
              />
              <ActionCard
                icon={
                  <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                }
                color="purple"
                count={Number((stats.cancellations?.under || 0) + (stats.cancellations?.completed || 0))}
                label="Cancellations"
                onClick={() => navigate('/view-bookings1?filter=cancellations')}
              />
              <ActionCard
                icon={
                  <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                color="orange"
                count={Number(stats.pendingPayments || 0)}
                label="Pending Payments"
                onClick={() => navigate('/view-bookings1?filter=pending_payments')}
              />
            </div>

            {/* Product Filter Row */}
            <div className="flex items-center justify-between mb-8">
              <div className="inline-flex bg-gray-100 rounded-lg p-1">
                {['All Products', 'Mountain Gorillas', 'Golden Monkeys'].map((product) => (
                  <button
                    key={product}
                    onClick={() => {
                      setFilters(prev => ({
                        ...prev,
                        productType: {
                          mountainGorillas: product === 'Mountain Gorillas',
                          goldenMonkeys: product === 'Golden Monkeys'
                        }
                      }));
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      (product === 'All Products' && !filters.productType.mountainGorillas && !filters.productType.goldenMonkeys) ||
                      (product === 'Mountain Gorillas' && filters.productType.mountainGorillas) ||
                      (product === 'Golden Monkeys' && filters.productType.goldenMonkeys)
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {product}
                  </button>
                ))}
              </div>
            </div>

            {/* Immediate Attention Section */}
            <div className="relative h-full mb-6">
              <Collapsible
                title="Immediate Attention"
                expandUpward={true}
                className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Quick Actions Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">Quick Actions</h3>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Real-time updates</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <ActionCard
                        icon="clock"
                        color="orange"
                        count={quickActions.confirmationRequests}
                        label="Confirmation Requests"
                        onClick={() => navigate('/view-bookings1?filter=confirmation_requests')}
                      />
                      <ActionCard
                        icon="check"
                        color="green"
                        count={quickActions.okToPurchaseFull}
                        label="OK to Purchase (Full)"
                        onClick={() => navigate('/view-bookings1?filter=ok_to_purchase_full')}
                      />
                      <ActionCard
                        icon="dollar"
                        color="blue"
                        count={quickActions.okToPurchaseDeposit}
                        label="OK to Purchase (Deposit)"
                        onClick={() => navigate('/view-bookings1?filter=ok_to_purchase_deposit')}
                      />
                      <ActionCard
                        icon="x"
                        color="red"
                        count={quickActions.doNotPurchase}
                        label="Do Not Purchase"
                        onClick={() => navigate('/view-bookings1?filter=do_not_purchase')}
                      />
                    </div>
                  </div>

                  {/* Today's Bookings Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">Today's Bookings</h3>
                      <button className="text-blue-600 text-xs font-medium hover:text-blue-700 transition-colors">View All</button>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-2.5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all cursor-pointer">
                        <div>
                          <span className="text-sm font-semibold text-gray-700">Fully Paid</span>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {Object.entries(todayConfirmed.fullyPaid.permits)
                              .map(([type, count]) => `${count} ${type}`)
                              .join(', ')}
                          </div>
                        </div>
                        <span className="text-lg font-bold text-gray-800">{todayConfirmed.fullyPaid.count}</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all cursor-pointer">
                        <div>
                          <span className="text-sm font-semibold text-gray-700">Deposit</span>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {Object.entries(todayConfirmed.deposit.permits)
                              .map(([type, count]) => `${count} ${type}`)
                              .join(', ')}
                          </div>
                        </div>
                        <span className="text-lg font-bold text-gray-800">{todayConfirmed.deposit.count}</span>
                      </div>
                      <div className="flex justify-between items-center p-2.5 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all cursor-pointer">
                        <div>
                          <span className="text-sm font-semibold text-gray-700">Authorized</span>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {Object.entries(todayConfirmed.authorized.permits)
                              .map(([type, count]) => `${count} ${type}`)
                              .join(', ')}
                          </div>
                        </div>
                        <span className="text-lg font-bold text-gray-800">{todayConfirmed.authorized.count}</span>
                      </div>
                    </div>
                  </div>

                  {/* Critical Deadlines Card */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">Critical Deadlines</h3>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Next 48 hours</span>
                    </div>
                    <div className="space-y-3">
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 cursor-pointer hover:bg-red-100/80 dark:hover:bg-red-900/30 transition-all">
                        <div className="flex justify-between items-center">
                          <div>
                            <CustomTooltip text="Actions required within 24 hours">
                              <span className="text-sm font-semibold text-red-700">Critical</span>
                            </CustomTooltip>
                            <p className="text-xs text-red-500 mt-0.5">Requires immediate attention</p>
                          </div>
                          <span className="text-lg font-bold text-red-700">{stats.deadlines.critical}</span>
                        </div>
                      </div>
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 cursor-pointer hover:bg-orange-100/80 dark:hover:bg-orange-900/30 transition-all">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-sm font-semibold text-orange-700">Warning</span>
                            <p className="text-xs text-orange-500 mt-0.5">Action needed soon</p>
                          </div>
                          <span className="text-lg font-bold text-orange-700">{stats.deadlines.warning}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Collapsible>
            </div>

            {/* Key Metrics Section */}
            <div className="relative h-full">
              <Collapsible
                title="Key Metrics"
                expandUpward={true}
                className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Confirmed Bookings */}
                  <MetricCard
                    title="Confirmed Bookings"
                    total={stats.confirmedBookings.total}
                    tooltip="Total number of confirmed bookings across all payment types"
                    items={[
                      { 
                        label: 'Full Payment', 
                        value: stats.confirmedBookings.fullPayment.count,
                        tooltip: 'Bookings with complete payment received'
                      },
                      { 
                        label: 'Deposit', 
                        value: stats.confirmedBookings.deposit.count,
                        tooltip: 'Bookings with initial deposit payment'
                      },
                      { 
                        label: 'Rolling Deposit', 
                        value: stats.confirmedBookings.rollingDeposit.count,
                        tooltip: 'Bookings with rolling deposit arrangement'
                      },
                      { 
                        label: 'Authorized', 
                        value: stats.confirmedBookings.authorized.count,
                        tooltip: 'Bookings authorized without payment'
                      }
                    ]}
                    onItemClick={(type) => navigate(`/view-bookings1?filter=confirmed_${type.toLowerCase().replace(/\s+/g, '_')}`)}
                  />

                  {/* Amendments */}
                  <MetricCard
                    title="Amendments"
                    total={stats.amendments.under + stats.amendments.completed + stats.amendments.declined}
                    tooltip="Overview of booking amendments and their current status"
                    items={[
                      { 
                        label: 'Under Amendment', 
                        value: stats.amendments.under,
                        tooltip: 'Bookings currently being amended'
                      },
                      { 
                        label: 'Completed', 
                        value: stats.amendments.completed,
                        tooltip: 'Successfully amended bookings'
                      },
                      { 
                        label: 'Declined', 
                        value: stats.amendments.declined,
                        tooltip: 'Amendment requests that were declined'
                      }
                    ]}
                    onItemClick={(type) => navigate(`/view-bookings1?filter=amendments_${type.toLowerCase().replace(/\s+/g, '_')}`)}
                  />

                  {/* Cancellations */}
                  <MetricCard
                    title="Cancellations"
                    total={stats.cancellations.under + stats.cancellations.completed}
                    items={[
                      { label: 'Under Cancellation', value: stats.cancellations.under },
                      { label: 'Completed', value: stats.cancellations.completed }
                    ]}
                    onItemClick={(type) => navigate(`/view-bookings1?filter=cancellations_${type.toLowerCase().replace(/\s+/g, '_')}`)}
                  />

                  {/* Pending Actions */}
                  <MetricCard
                    title="Pending Actions"
                    total={stats.pending.noPayment + stats.pending.missingDetails + stats.pending.depositDue + stats.pending.authorizationDue}
                    items={[
                      { label: 'No Payment', value: stats.pending.noPayment },
                      { label: 'Missing Details', value: stats.pending.missingDetails },
                      { label: 'Deposit Due', value: stats.pending.depositDue },
                      { label: 'Authorization Due', value: stats.pending.authorizationDue }
                    ]}
                    onItemClick={(type) => navigate(`/view-bookings1?filter=pending_${type.toLowerCase().replace(/\s+/g, '_')}`)}
                  />
                </div>
              </Collapsible>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Home3; 