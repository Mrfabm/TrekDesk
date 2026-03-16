import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/DashboardHeader';
import EnhancedStatsCard from '../components/EnhancedStatsCard';
import EnhancedFilters from '../components/EnhancedFilters';
import QuickActions from '../components/QuickActions';

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
    unpaid: 0,
    // New stats for enhanced features
    totalBookings: 0,
    todayBookings: 0,
    pendingActions: 0
  });
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [savedPresets, setSavedPresets] = useState([]);
  const [trendData, setTrendData] = useState({
    confirmationRequests: [],
    okToPurchaseFull: [],
    okToPurchaseDeposit: [],
    doNotPurchase: []
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
        console.log('Raw bookings data:', data);
        console.log('Current filters:', selectedFilters);
        
        // Apply all filters sequentially
        let filteredBookings = [...data];  // Create a new array to avoid mutations

        // Filter by product if selected
        if (selectedFilters.product) {
          console.log('Filtering by product:', selectedFilters.product);
          filteredBookings = filteredBookings.filter(booking => {
            const matches = booking.product?.toLowerCase() === selectedFilters.product.toLowerCase();
            console.log(`Booking ${booking.id} product: ${booking.product}, matches: ${matches}`);
            return matches;
          });
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

        console.log('Filtered bookings:', filteredBookings);

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
          ).length,
          totalBookings: filteredBookings.length
        };

        setStats(newStats);
        setBookings(filteredBookings);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
    setLastRefresh(new Date());
  };

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 30000);
    return () => clearInterval(interval);
  }, [userRole]);

  useEffect(() => {
    fetchBookings();
  }, [selectedFilters]);

  // New function to handle filter presets
  const handleSavePreset = (currentFilters) => {
    const presetName = prompt('Enter a name for this preset:');
    if (presetName) {
      const newPreset = {
        name: presetName,
        filters: { ...currentFilters }
      };
      setSavedPresets(prev => [...prev, newPreset]);
    }
  };

  // New function to handle filter changes
  const handleFilterChange = (filterType, value) => {
    if (filterType === 'preset') {
      setSelectedFilters(value.filters);
    } else {
      setSelectedFilters(prev => ({
        ...prev,
        [filterType]: value
      }));
    }
  };

  // Add back the handleCardClick function
  const handleCardClick = (filterType) => {
    // Store the filter type in localStorage to be used in Bookings page
    localStorage.setItem('bookingFilter', filterType);
    navigate('/bookings');
  };

  // Admin Dashboard Component
  const AdminDashboard = () => {
    return (
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header Section */}
        <DashboardHeader 
          stats={stats}
          onRefresh={fetchBookings}
          lastRefresh={lastRefresh}
        />

        <div className="flex flex-col lg:flex-row gap-6 mt-6">
          {/* Left Column - Stats */}
          <div className="lg:w-5/12">
            <div className="grid grid-cols-2 gap-4">
              <EnhancedStatsCard
                title="Confirmation Requests"
                value={stats.confirmationRequests}
                trend={5}
                color="from-amber-500 to-orange-500"
                onClick={() => handleCardClick('confirmation_requests')}
                tooltipContent="Bookings awaiting confirmation"
                icon={
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />

              <EnhancedStatsCard
                title="OK to Purchase (Full)"
                value={stats.okToPurchaseFull}
                trend={2}
                color="from-emerald-500 to-green-500"
                onClick={() => handleCardClick('ok_to_purchase_full')}
                tooltipContent="Bookings ready for full purchase"
                icon={
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />

              <EnhancedStatsCard
                title="OK to Purchase (Deposit)"
                value={stats.okToPurchaseDeposit}
                trend={-1}
                color="from-blue-500 to-cyan-500"
                onClick={() => handleCardClick('ok_to_purchase_deposit')}
                tooltipContent="Bookings ready for deposit payment"
                icon={
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                }
              />

              <EnhancedStatsCard
                title="Do Not Purchase"
                value={stats.doNotPurchase}
                trend={0}
                color="from-rose-500 to-red-500"
                onClick={() => handleCardClick('do_not_purchase')}
                tooltipContent="Bookings marked as do not purchase"
                icon={
                  <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Right Column - Filters */}
          <div className="lg:w-7/12">
            <EnhancedFilters
              selectedFilters={selectedFilters}
              onFilterChange={handleFilterChange}
              stats={stats}
              savedPresets={savedPresets}
              onSavePreset={handleSavePreset}
              onClearFilters={() => setSelectedFilters({
                product: '',
                noSlots: false,
                unpaid: false,
                topUpDue: false,
                cancelled: false,
                amended: false
              })}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <QuickActions />
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
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Welcome to Booking Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here are your important notifications
        </p>
      </div>
    </div>
  );
};

export default Home; 