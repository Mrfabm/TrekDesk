import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    confirmationRequests: 0,
    okToPurchaseFull: 0,
    okToPurchaseDeposit: 0,
    doNotPurchase: 0
  });
  const navigate = useNavigate();
  const userRole = localStorage.getItem('role');

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/bookings', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setBookings(data);
          
          // Calculate stats for admin
          if (userRole === 'admin') {
            const stats = {
              confirmationRequests: data.filter(b => b.status === 'requested').length,
              okToPurchaseFull: data.filter(b => b.validation_status === 'ok_to_purchase_full').length,
              okToPurchaseDeposit: data.filter(b => b.validation_status === 'ok_to_purchase_deposit').length,
              doNotPurchase: data.filter(b => b.validation_status === 'do_not_purchase').length
            };
            setStats(stats);
          }
        }
      } catch (error) {
        console.error('Error fetching bookings:', error);
      }
    };

    fetchBookings();
    // Set up polling every 30 seconds
    const interval = setInterval(fetchBookings, 30000);
    return () => clearInterval(interval);
  }, [userRole]);

  // Add navigation handler for cards
  const handleCardClick = (filterType) => {
    // Store the filter type in localStorage to be used in Bookings page
    localStorage.setItem('bookingFilter', filterType);
    navigate('/bookings');
  };

  // Admin Dashboard Component
  const AdminDashboard = () => (
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

      {/* Space for additional content */}
      <div className="mt-8">
        {/* Add your additional content here */}
      </div>
    </div>
  );

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