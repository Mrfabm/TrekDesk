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
          return 'bg-green-100 text-green-800';
        case 'ok_to_purchase_deposit':
          return 'bg-yellow-100 text-yellow-800';
        case 'do_not_purchase':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }

    // Otherwise use booking status colors
    switch (status) {
      case 'provisional':
        return 'bg-gray-100 text-gray-800';
      case 'requested':
        return 'bg-yellow-100 text-yellow-800';
      case 'validation_request':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status, validationStatus) => {
    if (role === 'admin' && status === 'confirmed') {
      return 'OK';  // Show just "OK" for admin when confirmed
    } else if (role === 'admin' && status === 'validation_request') {
      return 'PENDING';  // Show "PENDING" while waiting for finance
    }

    // For other roles or statuses, show the detailed status
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
    const bookingFilter = localStorage.getItem('bookingFilter');
    
    if (role === 'admin') {
      // If we're viewing filtered results, only show relevant actions
      switch(bookingFilter) {
        case 'confirmation_requests':
          return (
            <button
              onClick={() => handleSendToFinance(row.id)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Send to Finance
            </button>
          );
        case 'ok_to_purchase_full':
          return (
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
              Full Payment Approved
            </span>
          );
        case 'ok_to_purchase_deposit':
          return (
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
              Deposit Approved
            </span>
          );
        case 'do_not_purchase':
          return (
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
              Not Approved
            </span>
          );
        default:
          // If no filter, show normal action buttons based on status
          return getDefaultActionButton(row);
      }
    }
    return getDefaultActionButton(row);
  };

  // Move the original action button logic to a new function
  const getDefaultActionButton = (row) => {
    if (role === 'admin') {
      switch (row.status) {
        case 'requested':
          return (
            <button
              onClick={() => handleSendToFinance(row.id)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Send to Finance
            </button>
          );
        case 'validation_request':
          return (
            <span className="text-yellow-600 font-medium">
              Pending Finance Review
            </span>
          );
        case 'confirmed':
          if (row.validation_status === 'ok_to_purchase_full') {
            return (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                Full Payment Approved
              </span>
            );
          } else if (row.validation_status === 'ok_to_purchase_deposit') {
            return (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                Deposit Approved
              </span>
            );
          } else if (row.validation_status === 'do_not_purchase') {
            return (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                Not Approved
              </span>
            );
          }
          return null;
        case 'rejected':
          return (
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
              Rejected
            </span>
          );
        default:
          return (
            <div className="flex space-x-2">
              <button
                onClick={() => handleEditBooking(row)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteBooking(row.id)}
                className="text-red-600 hover:text-red-800 font-medium"
              >
                Delete
              </button>
            </div>
          );
      }
    } else if (role === 'user') {
      // Add actions for regular users
      switch (row.status) {
        case 'provisional':
          return (
            <button
              onClick={() => handleRequestConfirmation(row.id)}
              className="text-green-600 hover:text-green-800 font-medium"
            >
              Request Confirmation
            </button>
          );
        case 'requested':
          return (
            <span className="text-yellow-600 font-medium">
              Confirmation Requested
            </span>
          );
        case 'validation_request':
          return (
            <span className="text-blue-600 font-medium">
              Under Finance Review
            </span>
          );
        case 'confirmed':
          if (row.validation_status === 'ok_to_purchase_full') {
            return (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                Ready for Full Payment
              </span>
            );
          } else if (row.validation_status === 'ok_to_purchase_deposit') {
            return (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                Ready for Deposit
              </span>
            );
          }
          break;
        case 'rejected':
          return (
            <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm">
              Not Approved
            </span>
          );
        default:
          return null;
      }
    }
    return null;
  };

  // Different column configurations based on user role
  const getColumns = () => {
    if (role === 'finance_admin') {
      return [
        { 
          key: 'booking_name', 
          label: 'Booking Name',
          render: (value, row) => (
            <div>
              <div className="font-medium">{value}</div>
              <div className="text-sm text-gray-500">
                {row.product} × {row.number_of_people}
              </div>
            </div>
          )
        },
        { 
          key: 'unit_cost', 
          label: 'Unit Cost',
          render: (value) => formatCurrency(value)
        },
        { 
          key: 'total_amount', 
          label: 'Total Amount',
          render: (value) => formatCurrency(value)
        },
        { 
          key: 'amount_received', 
          label: 'Amount Received',
          render: (value) => formatCurrency(value || 0)
        },
        { 
          key: 'balance', 
          label: 'Balance',
          render: (value) => (
            <span className={`${value > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(value)}
            </span>
          )
        },
        {
          key: 'actions',
          label: 'Actions',
          render: (_, row) => (
            <button
              onClick={() => navigate(`/finance/validate/${row.id}`)}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Update Payment
            </button>
          )
        }
      ];
    }

    // Return columns for admin and regular users
    return [
      { 
        key: 'booking_name', 
        label: 'Name',
        render: (value, row) => `${value} × ${row.number_of_people}`
      },
      { 
        key: 'site', 
        label: 'Location',
      },
      { 
        key: 'date', 
        label: 'Date',
        render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
      },
      {
        key: 'available_slots',
        label: 'Slots',
        render: (value) => value || 'N/A'
      },
      { 
        key: 'status', 
        label: 'Status',
        render: (value, row) => (
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(value, row.validation_status)}`}>
            {getStatusText(value, row.validation_status)}
          </span>
        )
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (_, row) => {
          if (role === 'admin') {
            switch (row.status) {
              case 'requested':
                return (
                  <button
                    onClick={() => handleSendToFinance(row.id)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Send to Finance
                  </button>
                );
              case 'validation_request':
                return (
                  <span className="text-yellow-600 font-medium">
                    Pending Finance Review
                  </span>
                );
              case 'confirmed':
                if (row.validation_status === 'ok_to_purchase_full') {
                  return (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Full Payment Approved
                    </span>
                  );
                } else if (row.validation_status === 'ok_to_purchase_deposit') {
                  return (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                      Deposit Approved
                    </span>
                  );
                } else if (row.validation_status === 'do_not_purchase') {
                  return (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                      Not Approved
                    </span>
                  );
                }
                return null;
              case 'rejected':
                return (
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                    Rejected
                  </span>
                );
              default:
                return (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditBooking(row)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBooking(row.id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                );
            }
          } else {
            return getActionButton(row);  // Existing action button for regular users
          }
        }
      }
    ];
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
        fetchBookings(); // Refresh the bookings list
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bookings</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
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