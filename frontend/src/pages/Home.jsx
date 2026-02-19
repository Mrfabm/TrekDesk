import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('role');
  const [bookings, setBookings] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({
    product: '',
    noSlots: false,
    unpaid: false,
    topUpDue: false,
    cancelled: false,
    amended: false
  });
  const [stats, setStats] = useState({
    confirmationRequests: 0,
    okToPurchaseFull: 0,
    okToPurchaseDeposit: 0,
    doNotPurchase: 0,
    noSlots: 0,
    topUpDue: 0,
    cancelled: 0,
    amended: 0,
    unpaid: 0
  });

  const fetchBookings = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/bookings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        
        // Apply all filters sequentially
        let filteredBookings = data;

        // Filter by product if selected
        if (selectedFilters.product) {
          filteredBookings = filteredBookings.filter(booking => 
            booking.product === selectedFilters.product
          );
        }

        // Apply advanced filters
        if (selectedFilters.noSlots) {
          filteredBookings = filteredBookings.filter(b => 
            b.available_slots < 40
          );
        }

        if (selectedFilters.unpaid) {
          filteredBookings = filteredBookings.filter(b => 
            (!b.payment_status || b.payment_status === 'pending') && b.payment_status !== 'fully_paid'
          );
        }

        if (selectedFilters.topUpDue) {
          filteredBookings = filteredBookings.filter(b => {
            // Check if booking is not fully paid
            if (b.payment_status === 'fully_paid' || b.validation_status === 'ok_to_purchase_full') return false;
            
            // Check if trekking date is within 45 days
            const trekkingDate = new Date(b.date);
            const today = new Date();
            const daysUntilTrek = Math.ceil((trekkingDate - today) / (1000 * 60 * 60 * 24));
            return daysUntilTrek <= 45 && daysUntilTrek > 0;
          });
        }

        if (selectedFilters.cancelled) {
          filteredBookings = filteredBookings.filter(b => 
            b.status === 'cancelled'
          );
        }

        if (selectedFilters.amended) {
          filteredBookings = filteredBookings.filter(b => 
            b.status === 'amended'
          );
        }

        // Calculate stats based on filtered bookings
        const newStats = {
          confirmationRequests: filteredBookings.filter(b => b.status === 'requested').length,
          okToPurchaseFull: filteredBookings.filter(b => b.validation_status === 'ok_to_purchase_full').length,
          okToPurchaseDeposit: filteredBookings.filter(b => b.validation_status === 'ok_to_purchase_deposit').length,
          doNotPurchase: filteredBookings.filter(b => b.validation_status === 'do_not_purchase').length,
          noSlots: filteredBookings.filter(b => b.available_slots < 40).length,
          topUpDue: filteredBookings.filter(b => {
            if (b.payment_status === 'fully_paid' || b.validation_status === 'ok_to_purchase_full') return false;
            const trekkingDate = new Date(b.date);
            const today = new Date();
            const daysUntilTrek = Math.ceil((trekkingDate - today) / (1000 * 60 * 60 * 24));
            return daysUntilTrek <= 45 && daysUntilTrek > 0;
          }).length,
          cancelled: filteredBookings.filter(b => b.status === 'cancelled').length,
          amended: filteredBookings.filter(b => b.status === 'amended').length,
          unpaid: filteredBookings.filter(b => 
            (!b.payment_status || b.payment_status === 'pending') && b.payment_status !== 'fully_paid'
          ).length
        };

        setStats(newStats);
        setBookings(filteredBookings);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 30000);
    return () => clearInterval(interval);
  }, [userRole]);

  // Update bookings when any filter changes
  useEffect(() => {
    fetchBookings();
  }, [selectedFilters]);

  // Add navigation handler for cards
  const handleCardClick = (filterType) => {
    // Store the filter type in localStorage to be used in Bookings page
    localStorage.setItem('bookingFilter', filterType);
    navigate('/bookings');
  };

  // Admin Dashboard Component
  const AdminDashboard = () => {
    const getActionStatus = (booking) => {
      if (!booking.validation_status) return "Pending";
      return booking.validation_status.replace('_', ' ').title();
    };

    const getActionStatusDisplay = (booking) => {
      const status = booking.validation_status;
      if (!status) return (
        <span className="text-gray-600 dark:text-gray-400">
          Pending
        </span>
      );

      const statusColors = {
        'ok_to_purchase_full': 'text-green-600 dark:text-green-400',
        'ok_to_purchase_deposit': 'text-yellow-600 dark:text-yellow-400',
        'do_not_purchase': 'text-red-600 dark:text-red-400'
      };

      const statusText = {
        'ok_to_purchase_full': 'OK to Purchase (Full)',
        'ok_to_purchase_deposit': 'OK to Purchase (Deposit)',
        'do_not_purchase': 'Do Not Purchase'
      };

      return (
        <span className={`font-medium ${statusColors[status]}`}>
          {statusText[status]}
        </span>
      );
    };

    return (
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* More compact header */}
        <div className="relative mb-6 p-6 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
          <div className="relative z-10">
            <h1 className="text-3xl font-extrabold text-white">
              Welcome Back, Admin
            </h1>
            <p className="text-sm text-white/80">
              Here's your booking management overview
            </p>
          </div>
          <div className="absolute inset-0 bg-white/5 rounded-xl backdrop-blur-sm"></div>
          <div className="absolute -bottom-2 right-8 w-20 h-20 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        {/* More compact stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Confirmation Requests - More Compact Card */}
          <button
            onClick={() => handleCardClick('confirmation_requests')}
            className="group relative transform transition-all duration-300 hover:scale-102 hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100/20 dark:border-gray-700/30">
              <div className="flex items-center justify-between mb-3">
                <div className="bg-amber-100 dark:bg-amber-900/50 rounded-lg p-2 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                  View →
                </span>
              </div>
              <div>
                <p className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  {stats.confirmationRequests}
                </p>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                  Confirmation Requests
                </p>
              </div>
            </div>
          </button>

          {/* OK to Purchase (Full) - More Compact Card */}
          <button
            onClick={() => handleCardClick('ok_to_purchase_full')}
            className="group relative transform transition-all duration-300 hover:scale-102 hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100/20 dark:border-gray-700/30">
              <div className="flex items-center justify-between mb-3">
                <div className="bg-emerald-100 dark:bg-emerald-900/50 rounded-lg p-2 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                  View →
                </span>
              </div>
              <div>
                <p className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {stats.okToPurchaseFull}
                </p>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                  OK to Purchase (Full)
                </p>
              </div>
            </div>
          </button>

          {/* OK to Purchase (Deposit) - More Compact Card */}
          <button
            onClick={() => handleCardClick('ok_to_purchase_deposit')}
            className="group relative transform transition-all duration-300 hover:scale-102 hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100/20 dark:border-gray-700/30">
              <div className="flex items-center justify-between mb-3">
                <div className="bg-blue-100 dark:bg-blue-900/50 rounded-lg p-2 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <span className="text-sm text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                  View →
                </span>
              </div>
              <div>
                <p className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {stats.okToPurchaseDeposit}
                </p>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                  OK to Purchase (Deposit)
                </p>
              </div>
            </div>
          </button>

          {/* Do Not Purchase - More Compact Card */}
          <button
            onClick={() => handleCardClick('do_not_purchase')}
            className="group relative transform transition-all duration-300 hover:scale-102 hover:-translate-y-0.5"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500 to-red-500 rounded-xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100/20 dark:border-gray-700/30">
              <div className="flex items-center justify-between mb-3">
                <div className="bg-rose-100 dark:bg-rose-900/50 rounded-lg p-2 group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span className="text-sm text-rose-600 dark:text-rose-400 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                  View →
                </span>
              </div>
              <div>
                <p className="text-4xl font-bold text-gray-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  {stats.doNotPurchase}
                </p>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                  Do Not Purchase
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Advanced Filters */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Advanced Filters
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Refine your booking search
                </p>
              </div>
              <select
                value={selectedFilters.product}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setSelectedFilters(prev => ({ ...prev, product: newValue }));
                }}
                className="w-72 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:text-gray-300"
              >
                <option value="">Choose All</option>
                <option value="Mountain Gorillas">Mountain Gorillas</option>
                <option value="Golden Monkeys">Golden Monkeys</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* No Slots Filter */}
            <button
              onClick={() => handleCardClick('confirmation_requests')}
              className={`relative group flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                selectedFilters.noSlots
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-red-500 hover:bg-red-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  selectedFilters.noSlots
                    ? 'bg-red-100 dark:bg-red-900/50'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <svg className={`w-5 h-5 ${
                    selectedFilters.noSlots
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </div>
                <span className={`text-sm font-medium ${
                  selectedFilters.noSlots
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>No Slots ({stats.noSlots})</span>
              </div>
            </button>

            {/* Unpaid Filter */}
            <button
              onClick={() => handleCardClick('unpaid')}
              className={`relative group flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                selectedFilters.unpaid
                  ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-yellow-500 hover:bg-yellow-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  selectedFilters.unpaid
                    ? 'bg-yellow-100 dark:bg-yellow-900/50'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <svg className={`w-5 h-5 ${
                    selectedFilters.unpaid
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <span className={`text-sm font-medium ${
                  selectedFilters.unpaid
                    ? 'text-yellow-700 dark:text-yellow-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>Unpaid ({stats.unpaid || 0})</span>
              </div>
            </button>

            {/* Existing Top Up Due Filter */}
            <button
              onClick={() => handleCardClick('top_up_due_bookings')}
              className={`relative group flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                selectedFilters.topUpDue
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  selectedFilters.topUpDue
                    ? 'bg-blue-100 dark:bg-blue-900/50'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <svg className={`w-5 h-5 ${
                    selectedFilters.topUpDue
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className={`text-sm font-medium ${
                  selectedFilters.topUpDue
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>Top Up Due ({stats.topUpDue})</span>
              </div>
            </button>

            {/* Cancelled Filter - Existing */}
            <button
              onClick={() => handleCardClick('cancelled_bookings')}
              className={`relative group flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                selectedFilters.cancelled
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/10'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  selectedFilters.cancelled
                    ? 'bg-purple-100 dark:bg-purple-900/50'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <svg className={`w-5 h-5 ${
                    selectedFilters.cancelled
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <span className={`text-sm font-medium ${
                  selectedFilters.cancelled
                    ? 'text-purple-700 dark:text-purple-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>Cancelled ({stats.cancelled})</span>
              </div>
            </button>

            {/* Amended Filter - Existing */}
            <button
              onClick={() => handleCardClick('amended_bookings')}
              className={`relative group flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                selectedFilters.amended
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/10'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  selectedFilters.amended
                    ? 'bg-indigo-100 dark:bg-indigo-900/50'
                    : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                  <svg className={`w-5 h-5 ${
                    selectedFilters.amended
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <span className={`text-sm font-medium ${
                  selectedFilters.amended
                    ? 'text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>Amended ({stats.amended})</span>
              </div>
            </button>
          </div>
        </div>

        {/* Space for additional content */}
        <div className="mt-8">
          {/* Add your additional content here */}
        </div>
      </div>
    );
  };

  // Render different content based on user role
  if (userRole === 'admin') {
    return <AdminDashboard />;
  }

  // Original Home component for other users
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Existing content for other users */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Welcome to Booking Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here are your important notifications
        </p>
      </div>
      {/* Rest of the existing home page content */}
    </div>
  );
};

export default Home; 