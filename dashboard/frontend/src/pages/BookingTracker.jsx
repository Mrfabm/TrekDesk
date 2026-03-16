import React, { useState, useEffect } from 'react';
import EnhancedTable from '../components/EnhancedTable';

const BookingTracker = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/bookings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const data = await response.json();
      setBookings(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      console.error('Error fetching bookings:', err);
    }
  };

  const columns = [
    {
      header: 'Booking ID',
      accessor: 'id',
      width: 'w-24'
    },
    {
      header: 'Customer Name',
      accessor: 'booking_name',
      width: 'w-48'
    },
    {
      header: 'Product',
      accessor: 'product',
      width: 'w-48'
    },
    {
      header: 'Date',
      accessor: 'date',
      width: 'w-32'
    },
    {
      header: 'Status',
      accessor: 'status',
      width: 'w-32',
      cell: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'confirmed' ? 'bg-green-100 text-green-800' :
          value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          value === 'cancelled' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value?.charAt(0).toUpperCase() + value?.slice(1)}
        </span>
      )
    },
    {
      header: 'Payment',
      accessor: 'payment_status',
      width: 'w-32',
      cell: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'paid' ? 'bg-green-100 text-green-800' :
          value === 'partial' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {value?.charAt(0).toUpperCase() + value?.slice(1)}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: 'actions',
      width: 'w-48',
      cell: (_, row) => (
        <div className="flex space-x-2">
          <button 
            onClick={() => handleView(row.id)}
            className="px-2 py-1 text-xs font-medium text-blue-700 hover:text-blue-900"
          >
            View
          </button>
          <button 
            onClick={() => handleEdit(row.id)}
            className="px-2 py-1 text-xs font-medium text-green-700 hover:text-green-900"
          >
            Edit
          </button>
          <button 
            onClick={() => handleCancel(row.id)}
            className="px-2 py-1 text-xs font-medium text-red-700 hover:text-red-900"
          >
            Cancel
          </button>
        </div>
      )
    }
  ];

  const handleView = (id) => {
    // Implement view functionality
    console.log('View booking:', id);
  };

  const handleEdit = (id) => {
    // Implement edit functionality
    console.log('Edit booking:', id);
  };

  const handleCancel = (id) => {
    // Implement cancel functionality
    console.log('Cancel booking:', id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Booking Tracker</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Track and manage all bookings in one place
        </p>
      </div>

      <EnhancedTable 
        data={bookings} 
        columns={columns}
      />
    </div>
  );
};

export default BookingTracker; 