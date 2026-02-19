import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import "../styles/datepicker-custom.css";
import { useTheme } from '../context/ThemeContext';
import { Collapsible } from '../components/Collapsible';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const INITIAL_STATS = {
  totalBookings: 0,
  todayBookings: 0,
  pendingActions: 0,
  successRate: 0,
  deadlines: {
    critical: 0,
    warning: 0
  },
  confirmationRequests: {
    pending: 0,
    approved: 0,
    rejected: 0
  },
  okToPurchaseFull: {
    today: 0,
    thisWeek: 0,
    value: 0
  },
  okToPurchaseDeposit: {
    today: 0,
    thisWeek: 0,
    value: 0
  },
  doNotPurchase: {
    today: 0,
    thisWeek: 0,
    savedAmount: 0
  },
  confirmedBookings: {
    total: 0,
    fullPayment: {
      count: 0,
      value: 0,
      permits: {}
    },
    deposit: {
      count: 0,
      value: 0,
      permits: {}
    },
    rollingDeposit: {
      count: 0,
      value: 0,
      permits: {}
    },
    authorized: {
      count: 0,
      value: 0,
      permits: {}
    }
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
  }
};

// Create a color mapping object
const colorMap = {
  blue: {
    bg: 'bg-blue-50/50',
    border: 'border-blue-100',
    hoverBg: 'hover:bg-blue-50',
    iconBg: 'bg-blue-100/50',
    text: 'text-blue-700'
  },
  green: {
    bg: 'bg-green-50/50',
    border: 'border-green-100',
    hoverBg: 'hover:bg-green-50',
    iconBg: 'bg-green-100/50',
    text: 'text-green-700'
  },
  yellow: {
    bg: 'bg-yellow-50/50',
    border: 'border-yellow-100',
    hoverBg: 'hover:bg-yellow-50',
    iconBg: 'bg-yellow-100/50',
    text: 'text-yellow-700'
  },
  red: {
    bg: 'bg-red-50/50',
    border: 'border-red-100',
    hoverBg: 'hover:bg-red-50',
    iconBg: 'bg-red-100/50',
    text: 'text-red-700'
  },
  purple: {
    bg: 'bg-purple-50/50',
    border: 'border-purple-100',
    hoverBg: 'hover:bg-purple-50',
    iconBg: 'bg-purple-100/50',
    text: 'text-purple-700'
  },
  orange: {
    bg: 'bg-orange-50/50',
    border: 'border-orange-100',
    hoverBg: 'hover:bg-orange-50',
    iconBg: 'bg-orange-100/50',
    text: 'text-orange-700'
  }
};

// Utility Components
const CustomTooltip = ({ children, text }) => (
  <div className="group relative inline-block">
    {children}
    <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg whitespace-nowrap">
      {text}
    </div>
  </div>
);

const ActionCard = ({ icon, color, count, label, onClick }) => {
  const colors = colorMap[color];
  return (
    <div 
      onClick={onClick}
      className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${colors.bg} ${colors.border} ${colors.hoverBg}`}
    >
      <div className="flex justify-between items-center mb-1.5">
        <div className={`p-1.5 rounded-lg ${colors.iconBg}`}>
          <svg className={`w-4 h-4 ${colors.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {icon === 'clock' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
            {icon === 'check' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
            {icon === 'dollar' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
            {icon === 'x' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />}
          </svg>
        </div>
        <span className={`text-lg font-bold ${colors.text}`}>{count}</span>
      </div>
      <p className={`text-xs font-medium ${colors.text} mt-1`}>{label}</p>
    </div>
  );
};

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
    <div className="space-y-1.5">
      {items.map(item => (
        <div 
          key={item.label} 
          onClick={() => onItemClick(item.label.toLowerCase().replace(/\s+/g, '_'))}
          className="flex justify-between items-center py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2 transition-colors"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
            {item.tooltip && (
              <CustomTooltip text={item.tooltip}>
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </CustomTooltip>
            )}
          </div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);

const Home1 = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(INITIAL_STATS);
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

  const [immediateAttentionOpen, setImmediateAttentionOpen] = useState(false);
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [showDatePresets, setShowDatePresets] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'e':
            e.preventDefault();
            handleExport();
            break;
          case 'b':
            e.preventDefault();
            handleBatchActions();
            break;
          case 'p':
            e.preventDefault();
            handlePrint();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleExport = () => {
    setIsLoading(true);
    try {
      // TODO: Implement export logic
      toast.success('Export started successfully');
    } catch (error) {
      toast.error('Failed to start export');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchActions = () => {
    if (selectedItems.length === 0) {
      toast.warning('Please select items to perform batch actions');
      return;
    }
    // TODO: Implement batch actions
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDatePreset = (preset) => {
    const today = new Date();
    let fromDate = new Date();

    switch (preset) {
      case '7days':
        fromDate.setDate(today.getDate() - 7);
        break;
      case '30days':
        fromDate.setDate(today.getDate() - 30);
        break;
      case 'thisMonth':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'lastMonth':
        fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        break;
      default:
        break;
    }

    handleDateChange([fromDate, today]);
    setShowDatePresets(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Mock data for development
        const mockData = {
          totalBookings: 156,
          todayBookings: 12,
          pendingActions: 8,
          successRate: 94,
          deadlines: {
            critical: 3,
            warning: 5
          },
          confirmationRequests: {
            pending: 4,
            approved: 15,
            rejected: 2
          },
          okToPurchaseFull: {
            today: 3,
            thisWeek: 12,
            value: 4500
          },
          okToPurchaseDeposit: {
            today: 2,
            thisWeek: 8,
            value: 1600
          },
          doNotPurchase: {
            today: 1,
            thisWeek: 3,
            savedAmount: 4500
          },
          confirmedBookings: {
            total: 142,
            fullPayment: {
              count: 98,
              value: 147000,
              permits: {
                "Mountain Gorillas": 85,
                "Golden Monkeys": 13
              }
            },
            deposit: {
              count: 32,
              value: 24000,
              permits: {
                "Mountain Gorillas": 28,
                "Golden Monkeys": 4
              }
            },
            rollingDeposit: {
              count: 8,
              value: 6000,
              permits: {
                "Mountain Gorillas": 7,
                "Golden Monkeys": 1
              }
            },
            authorized: {
              count: 4,
              value: 6000,
              permits: {
                "Mountain Gorillas": 4
              }
            }
          },
          amendments: {
            under: 3,
            completed: 12,
            declined: 1,
            lastMinute: 2
          },
          cancellations: {
            under: 2,
            completed: 8,
            lastMinute: 1
          },
          pending: {
            noPayment: 6,
            missingDetails: 4,
            depositDue: 3,
            authorizationDue: 2
          }
        };

        // Update state with mock data
        setStats(mockData);
        
        // Also update quick actions and today's confirmed bookings
        setQuickActions({
          confirmationRequests: mockData.confirmationRequests.pending,
          okToPurchaseFull: mockData.okToPurchaseFull.today,
          okToPurchaseDeposit: mockData.okToPurchaseDeposit.today,
          doNotPurchase: mockData.doNotPurchase.today,
          confirmationAuthorized: mockData.confirmedBookings.authorized.count
        });

        setTodayConfirmed({
          fullyPaid: {
            count: mockData.confirmedBookings.fullPayment.count,
            permits: mockData.confirmedBookings.fullPayment.permits
          },
          deposit: {
            count: mockData.confirmedBookings.deposit.count,
            permits: mockData.confirmedBookings.deposit.permits
          },
          authorized: {
            count: mockData.confirmedBookings.authorized.count,
            permits: mockData.confirmedBookings.authorized.permits
          }
        });

      } catch (err) {
        setError(err.message);
        console.error('Error fetching dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto text-red-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to load dashboard data
          </h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4 max-w-[1920px] mx-auto bg-gray-50/50 space-y-5">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-full mt-4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleDateChange = (dates) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        from: dates[0],
        to: dates[1]
      }
    }));
  };

  const handleBookingStatusChange = (status) => {
    setFilters(prev => ({
      ...prev,
      bookingStatus: {
        ...prev.bookingStatus,
        [status]: !prev.bookingStatus[status]
      }
    }));
  };

  const handlePaymentStatusChange = (status) => {
    setFilters(prev => ({
      ...prev,
      paymentStatus: {
        ...prev.paymentStatus,
        [status]: !prev.paymentStatus[status]
      }
    }));
  };

  const handleProductTypeChange = (type) => {
    setFilters(prev => ({
      ...prev,
      productType: {
        ...prev.productType,
        [type]: !prev.productType[type]
      }
    }));
  };

  const resetFilters = () => {
    setFilters({
      dateRange: {
        from: null,
        to: null
      },
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
  };

  const applyFilters = () => {
    // TODO: Implement filter logic and API call
    console.log('Applying filters:', filters);
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

  const handleMetricClick = (type, value) => {
    // Navigate to bookings page with filter
    navigate('/bookings', { 
      state: { 
        filterType: type,
        filterValue: value,
        timestamp: new Date().getTime() // Force filter update
      } 
    });
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
    <div className={`p-4 max-w-[1920px] mx-auto ${darkMode ? 'bg-gray-900' : 'bg-gray-50/50'} space-y-5`}>
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Welcome back, Admin
          </h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
            Last updated: {new Date().toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const today = new Date();
                handleDateChange([today, today]);
              }}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Today
            </button>
            <DatePicker
              selected={filters.dateRange.from}
              onChange={(date) => handleDateChange([date, filters.dateRange.to])}
              placeholderText="From"
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm w-32 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <DatePicker
              selected={filters.dateRange.to}
              onChange={(date) => handleDateChange([filters.dateRange.from, date])}
              placeholderText="To"
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm w-32 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="h-6 w-px bg-gray-200"></div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform ${
              showFilters
                ? `${darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-50 text-blue-600'}`
                : `${
                    darkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`
            }`}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${
                showFilters ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
          </button>
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {darkMode ? (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>
          <button className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors relative">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-1">
        <div className="flex items-center gap-1">
          <button className="px-4 py-2 rounded-lg bg-blue-50 text-blue-600 text-sm font-medium">
            Overview
          </button>
          <button className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors">
            Bookings
          </button>
          <button className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors">
            Amendments
          </button>
          <button className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors">
            Cancellations
          </button>
          <div className="flex-grow"></div>
          <button 
            className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-sm transition-colors"
            onClick={() => setShowFilters(prev => !prev)}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:bg-gray-50 rounded-lg text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            Save View
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            onClick={() => {/* TODO: Implement export functionality */}}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
            <span className="text-xs text-gray-400 ml-1">(⌘E)</span>
          </button>

          <button
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            onClick={() => {/* TODO: Implement batch actions */}}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Batch Actions
            <span className="text-xs text-gray-400 ml-1">(⌘B)</span>
          </button>

          <button
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            onClick={() => {/* TODO: Implement print view */}}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print View
            <span className="text-xs text-gray-400 ml-1">(⌘P)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              onClick={() => setShowSavedFilters(prev => !prev)}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Saved Filters
            </button>
          </div>

          <div className="relative">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              onClick={() => setShowDatePresets(prev => !prev)}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Date Range
            </button>
          </div>
        </div>
      </div>

      {/* Date Presets Dropdown */}
      {showDatePresets && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
          <button
            onClick={() => handleDatePreset('7days')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            Last 7 days
          </button>
          <button
            onClick={() => handleDatePreset('30days')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            Last 30 days
          </button>
          <button
            onClick={() => handleDatePreset('thisMonth')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            This Month
          </button>
          <button
            onClick={() => handleDatePreset('lastMonth')}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            Last Month
          </button>
        </div>
      )}

      {/* Saved Filters Menu */}
      {showSavedFilters && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
          <div className="px-4 py-2 border-b border-gray-100">
            <h4 className="text-sm font-medium text-gray-900">Saved Filters</h4>
            <p className="text-xs text-gray-500 mt-1">Select a saved filter or create a new one</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            <button
              onClick={() => {
                // TODO: Implement saved filter loading
                toast.info('Loading saved filter...');
                setShowSavedFilters(false);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">Today's Pending</div>
                  <div className="text-xs text-gray-500">Created 2 days ago</div>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
            {/* Add more saved filters here */}
          </div>
          <div className="px-4 py-2 border-t border-gray-100">
            <button
              onClick={() => {
                // TODO: Implement filter saving
                toast.success('Filter saved successfully');
                setShowSavedFilters(false);
              }}
              className="w-full px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              Save Current Filter
            </button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 flex items-center gap-3">
            <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm font-medium text-gray-900">Processing...</span>
          </div>
        </div>
      )}

      {/* Filter Panel */}
      <div
        className={`relative transform transition-all duration-200 ease-in-out ${
          showFilters ? 'opacity-100 mb-5' : 'opacity-0 h-0 overflow-hidden'
        }`}
      >
        <div className={`${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
        } rounded-lg shadow-sm border p-4`}>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <h4 className={`text-sm font-semibold ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              } mb-3`}>
                Booking Status
              </h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 group cursor-pointer">
                  <input
                    type="checkbox"
                    className={`rounded ${
                      darkMode
                        ? 'text-blue-400 focus:ring-blue-400 bg-gray-700 border-gray-600'
                        : 'text-blue-500 focus:ring-blue-500'
                    } cursor-pointer`}
                    checked={filters.bookingStatus.confirmed}
                    onChange={() => handleBookingStatusChange('confirmed')}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-600 group-hover:text-gray-900'
                  } transition-colors`}>
                    Confirmed
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className={`rounded ${
                      darkMode
                        ? 'text-blue-400 focus:ring-blue-400 bg-gray-700 border-gray-600'
                        : 'text-blue-500 focus:ring-blue-500'
                    }`}
                    checked={filters.bookingStatus.pending}
                    onChange={() => handleBookingStatusChange('pending')}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-600 group-hover:text-gray-900'
                  } transition-colors`}>
                    Pending
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className={`rounded ${
                      darkMode
                        ? 'text-blue-400 focus:ring-blue-400 bg-gray-700 border-gray-600'
                        : 'text-blue-500 focus:ring-blue-500'
                    }`}
                    checked={filters.bookingStatus.underAmendment}
                    onChange={() => handleBookingStatusChange('underAmendment')}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-600 group-hover:text-gray-900'
                  } transition-colors`}>
                    Under Amendment
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className={`rounded ${
                      darkMode
                        ? 'text-blue-400 focus:ring-blue-400 bg-gray-700 border-gray-600'
                        : 'text-blue-500 focus:ring-blue-500'
                    }`}
                    checked={filters.bookingStatus.underCancellation}
                    onChange={() => handleBookingStatusChange('underCancellation')}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-600 group-hover:text-gray-900'
                  } transition-colors`}>
                    Under Cancellation
                  </span>
                </label>
              </div>
            </div>

            <div>
              <h4 className={`text-sm font-semibold ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              } mb-3`}>
                Payment Status
              </h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className={`rounded ${
                      darkMode
                        ? 'text-blue-400 focus:ring-blue-400 bg-gray-700 border-gray-600'
                        : 'text-blue-500 focus:ring-blue-500'
                    }`}
                    checked={filters.paymentStatus.fullyPaid}
                    onChange={() => handlePaymentStatusChange('fullyPaid')}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-600 group-hover:text-gray-900'
                  } transition-colors`}>
                    Fully Paid
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className={`rounded ${
                      darkMode
                        ? 'text-blue-400 focus:ring-blue-400 bg-gray-700 border-gray-600'
                        : 'text-blue-500 focus:ring-blue-500'
                    }`}
                    checked={filters.paymentStatus.depositPaid}
                    onChange={() => handlePaymentStatusChange('depositPaid')}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-600 group-hover:text-gray-900'
                  } transition-colors`}>
                    Deposit Paid
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className={`rounded ${
                      darkMode
                        ? 'text-blue-400 focus:ring-blue-400 bg-gray-700 border-gray-600'
                        : 'text-blue-500 focus:ring-blue-500'
                    }`}
                    checked={filters.paymentStatus.paymentDue}
                    onChange={() => handlePaymentStatusChange('paymentDue')}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-600 group-hover:text-gray-900'
                  } transition-colors`}>
                    Payment Due
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className={`rounded ${
                      darkMode
                        ? 'text-blue-400 focus:ring-blue-400 bg-gray-700 border-gray-600'
                        : 'text-blue-500 focus:ring-blue-500'
                    }`}
                    checked={filters.paymentStatus.authorized}
                    onChange={() => handlePaymentStatusChange('authorized')}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-600 group-hover:text-gray-900'
                  } transition-colors`}>
                    Authorized (No Payment)
                  </span>
                </label>
              </div>
            </div>

            <div>
              <h4 className={`text-sm font-semibold ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              } mb-3`}>
                Product Type
              </h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className={`rounded ${
                      darkMode
                        ? 'text-blue-400 focus:ring-blue-400 bg-gray-700 border-gray-600'
                        : 'text-blue-500 focus:ring-blue-500'
                    }`}
                    checked={filters.productType.mountainGorillas}
                    onChange={() => handleProductTypeChange('mountainGorillas')}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-600 group-hover:text-gray-900'
                  } transition-colors`}>
                    Mountain Gorillas
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className={`rounded ${
                      darkMode
                        ? 'text-blue-400 focus:ring-blue-400 bg-gray-700 border-gray-600'
                        : 'text-blue-500 focus:ring-blue-500'
                    }`}
                    checked={filters.productType.goldenMonkeys}
                    onChange={() => handleProductTypeChange('goldenMonkeys')}
                  />
                  <span className={`text-sm ${
                    darkMode ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-600 group-hover:text-gray-900'
                  } transition-colors`}>
                    Golden Monkeys
                  </span>
                </label>
              </div>
            </div>

            <div>
              <h4 className={`text-sm font-semibold ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              } mb-3`}>
                Saved Filters
              </h4>
              <div className="space-y-2">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm transition-all duration-200 w-full group">
                  <span>Today's Pending</span>
                  <svg
                    className="w-4 h-4 ml-auto text-gray-400 group-hover:text-gray-600 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm transition-all duration-200 w-full group">
                  <span>Critical Deadlines</span>
                  <svg
                    className="w-4 h-4 ml-auto text-gray-400 group-hover:text-gray-600 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm transition-all duration-200 w-full group">
                  <span>This Week's Amendments</span>
                  <svg
                    className="w-4 h-4 ml-auto text-gray-400 group-hover:text-gray-600 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="flex justify-end items-center gap-3 mt-6 pt-4 border-t">
            <button
              onClick={resetFilters}
              className={`px-4 py-2 text-sm ${
                darkMode
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              } rounded-lg transition-all duration-200 transform hover:scale-105`}
            >
              Reset All
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 hover:shadow-md"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Immediate Attention Section */}
      <div className="relative h-full">
        <Collapsible
          title="Immediate Attention"
          expandUpward={true}
          className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-bold text-gray-800">Quick Actions</h3>
                <span className="text-xs text-gray-400">Real-time updates</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ActionCard
                  icon="clock"
                  color="orange"
                  count={quickActions.confirmationRequests}
                  label="Confirmation Requests"
                  onClick={() => handleMetricClick('confirmation_requests', 'pending')}
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-bold text-gray-800">Today's Bookings</h3>
                <button className="text-blue-600 text-xs font-medium hover:text-blue-700 transition-colors">View All</button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
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
                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
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
                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
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

            {/* Critical Deadlines */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-bold text-gray-800">Critical Deadlines</h3>
                <span className="text-xs text-gray-400">Next 48 hours</span>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-red-50/50 rounded-lg border border-red-100">
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
                <div className="p-3 bg-orange-50/50 rounded-lg border border-orange-100">
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
          className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700"
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
              onItemClick={(type) => handleMetricClick('confirmed_bookings', type)}
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
              onItemClick={(type) => handleMetricClick('amendments', type)}
            />

            {/* Cancellations */}
            <MetricCard
              title="Cancellations"
              total={stats.cancellations.under + stats.cancellations.completed}
              items={[
                { label: 'Under Cancellation', value: stats.cancellations.under },
                { label: 'Completed', value: stats.cancellations.completed }
              ]}
              onItemClick={(type) => handleMetricClick('cancellations', type)}
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
              onItemClick={(type) => handleMetricClick('pending', type)}
            />
          </div>
        </Collapsible>
      </div>
    </div>
  );
};

export default Home1;