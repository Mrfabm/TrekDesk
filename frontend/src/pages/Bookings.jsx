import React, { useState, useEffect } from 'react';
import EnhancedTable from '../components/EnhancedTable';
import { useNavigate } from 'react-router-dom';

const Bookings = () => {
  const role = localStorage.getItem('role');
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();
  const [requestCount, setRequestCount] = useState(0);

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

  // Add this function to handle different validation statuses
  const getActionButton = (row) => {
    if (role === 'finance_admin') {
      const totalAmount = parseFloat(row.total_amount) || 0;
      const amountReceived = parseFloat(row.amount_received) || 0;

      if (row.payment_status === 'fully_paid') {
        return (
          <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs font-medium">
            Fully Paid
          </span>
        );
      } else if (row.payment_status === 'deposit_paid') {
        return (
          <span className="px-2 py-1 bg-yellow-50 text-yellow-600 rounded text-xs font-medium">
            Partially Paid
          </span>
        );
      }
      
      return (
        <button
          onClick={() => navigate(`/finance/validate/${row.id}`)}
          className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
        >
          {row.payment_status === 'pending' ? 'Validate Payment' : 'Update Payment'}
        </button>
      );
    }

    if (role === 'admin') {
      // For admin, show action buttons based on validation status
      if (row.validation_status) {
        switch (row.validation_status) {
          case 'ok_to_purchase_full':
            return (
              <div className="flex flex-col space-y-1">
                <button
                  onClick={() => navigate('/passport-management')}
                  className="px-3 py-1.5 bg-green-50 text-green-600 rounded text-xs font-medium hover:bg-green-100 transition-colors"
                >
                  Purchase Permits Full
                </button>
                {row.validation_notes && (
                  <span className="text-xs text-gray-500">
                    Note: {row.validation_notes}
                  </span>
                )}
              </div>
            );
          case 'ok_to_purchase_deposit':
            return (
              <div className="flex flex-col space-y-1">
                <button
                  onClick={() => navigate('/passport-management')}
                  className="px-3 py-1.5 bg-yellow-50 text-yellow-600 rounded text-xs font-medium hover:bg-yellow-100 transition-colors"
                >
                  Purchase Permits Deposit
                </button>
                {row.validation_notes && (
                  <span className="text-xs text-gray-500">
                    Note: {row.validation_notes}
                  </span>
                )}
              </div>
            );
          case 'do_not_purchase':
            return (
              <div className="flex flex-col space-y-1">
                <button
                  onClick={() => handleSendPaymentRequest(row.id)}
                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded text-xs font-medium hover:bg-red-100 transition-colors"
                >
                  Send Payment Request to User
                </button>
                {row.validation_notes && (
                  <span className="text-xs text-gray-500">
                    Note: {row.validation_notes}
                  </span>
                )}
              </div>
            );
          default:
            return null;
        }
      }
      return null;
    }

    // User view - Add this section
    if (role === 'user') {
      switch (row.status) {
        case 'provisional':
          return (
            <button
              onClick={() => handleRequestConfirmation(row.id)}
              className="px-3 py-1.5 bg-green-50 text-green-600 rounded text-xs font-medium hover:bg-green-100 transition-colors"
            >
              Request Confirmation
            </button>
          );
        case 'requested':
          return (
            <span className="px-2 py-1 bg-yellow-50 text-yellow-600 rounded text-xs font-medium">
              Confirmation Requested
            </span>
          );
        case 'validation_request':
          return (
            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium">
              Under Finance Review
            </span>
          );
        case 'confirmed':
          if (row.validation_status === 'ok_to_purchase_full') {
            return (
              <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs font-medium">
                Ready for Full Payment
              </span>
            );
          } else if (row.validation_status === 'ok_to_purchase_deposit') {
            return (
              <span className="px-2 py-1 bg-yellow-50 text-yellow-600 rounded text-xs font-medium">
                Ready for Deposit
              </span>
            );
          }
          break;
        case 'rejected':
          return (
            <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-medium">
              Not Approved
            </span>
          );
      }
    }
    
    return null;
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
  const getColumns = () => {
    const baseColumns = [
      {
        header: 'Booking ID',
        accessor: 'id',
        cell: (value) => (
          <span className="text-xs text-gray-900">{value}</span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3',
        cellClassName: 'whitespace-nowrap px-3 py-2'
      },
      {
        header: 'Product',
        accessor: 'product',
        cell: (value) => (
          <span className="text-xs text-gray-900">{value}</span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3',
        cellClassName: 'whitespace-nowrap px-3 py-2'
      },
      {
        header: 'Date',
        accessor: 'date',
        cell: (value) => (
          <span className="text-xs text-gray-900">
            {new Date(value).toLocaleDateString()}
          </span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3',
        cellClassName: 'whitespace-nowrap px-3 py-2'
      },
      {
        header: 'Status',
        accessor: 'status',
        cell: (value, row) => (
          <span className={`inline-flex px-2 py-1 rounded ${getStatusBadgeColor(value, row.validation_status)}`}>
            {getStatusText(value, row.validation_status)}
          </span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3',
        cellClassName: 'whitespace-nowrap px-3 py-2'
      },
      {
        header: 'Amount',
        accessor: 'total_amount',
        cell: (value) => (
          <span className="text-xs text-gray-900">
            {formatCurrency(value)}
          </span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3',
        cellClassName: 'whitespace-nowrap px-3 py-2'
      }
    ];

    // Add Actions column for all roles
    baseColumns.push({
      header: 'Actions',
      accessor: 'actions',
      cell: (_, row) => getActionButton(row),
      headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3',
      cellClassName: 'whitespace-nowrap px-3 py-2'
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
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3',
        cellClassName: 'whitespace-nowrap px-3 py-2'
      });
    }

    return baseColumns;
  };

  // Add handlers for status changes
  const handleRequestConfirmation = async (bookingId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/bookings/${bookingId}/request-confirmation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        // Immediately refresh the bookings list to show the updated status
        fetchBookings();
      } else {
        console.error('Failed to request confirmation:', await response.json());
      }
    } catch (error) {
      console.error('Failed to request confirmation:', error);
    }
  };

  const handleSendToFinance = async (bookingId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/bookings/${bookingId}/send-to-finance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        fetchBookings(); // Refresh the bookings list
      }
    } catch (error) {
      console.error('Failed to send to finance:', error);
    }
  };

  const handleEditBooking = (booking) => {
    localStorage.setItem('editingBooking', JSON.stringify(booking));
    navigate('/create-booking?mode=edit');
  };

  const handleDeleteBooking = async (bookingId) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
        const response = await fetch(`http://localhost:8000/api/bookings/${bookingId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          fetchBookings();  // Refresh the bookings list
        } else {
          console.error('Failed to delete booking');
        }
      } catch (error) {
        console.error('Error deleting booking:', error);
      }
    }
  };

  // Inside the Bookings component, update the getActionStatus function
  const getActionStatus = (booking) => {
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

  const handleSendPaymentRequest = async (bookingId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/bookings/${bookingId}/payment-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Show success message
        alert('Payment request sent successfully');
      } else {
        throw new Error('Failed to send payment request');
      }
    } catch (error) {
      console.error('Error sending payment request:', error);
      alert('Failed to send payment request');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="mb-4">
        <h1 className="text-lg font-medium text-gray-900 dark:text-white">Bookings</h1>
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          {role === 'finance_admin' ? 'Manage and validate payments' : 'View your bookings'}
        </p>
      </div>

      <EnhancedTable 
        data={bookings}
        columns={getColumns()}
      />
    </div>
  );
};

export default Bookings;