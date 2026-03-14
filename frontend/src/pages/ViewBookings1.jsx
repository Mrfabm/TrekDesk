import React, { useState, useEffect } from 'react';
import EnhancedTable from '../components/EnhancedTable';
import { useLocation } from 'react-router-dom';

const ViewBookings1 = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const filterParam = searchParams.get('filter');

  const [allData, setAllData] = useState([]);

  useEffect(() => {
    fetch('http://localhost:8000/api/bookings', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.json())
      .then(data => setAllData(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  const filterData = (data) => {
    if (!filterParam) return data;

    switch (filterParam) {
      // Immediate Attention Filters
      case 'quick_actions':
        return data.filter(item =>
          item.status === 'requested' ||
          item.validation_status === 'ok_to_purchase_full' ||
          item.validation_status === 'ok_to_purchase_deposit' ||
          item.validation_status === 'do_not_purchase'
        );
      case 'today': {
        const today = new Date().toISOString().split('T')[0];
        return data.filter(item => item.date?.split('T')[0] === today);
      }
      case 'critical':
        return data.filter(item => {
          if (item.payment_status === 'overdue') return true;
          if (item.balance_due_date && item.payment_status !== 'fully_paid' && new Date(item.balance_due_date) < new Date()) return true;
          if (item.payment_status === 'deposit_paid') {
            const days = Math.ceil((new Date(item.date) - new Date()) / 86400000);
            if (days > 0 && days <= 45) return true;
          }
          if (item.payment_status === 'pending' && item.deposit_due_date && new Date(item.deposit_due_date) < new Date()) return true;
          return false;
        });
      case 'amendments':
        return data.filter(item => item.status === 'amended');
      case 'cancellations':
        return data.filter(item => item.payment_status === 'cancelled');
      case 'pending_payments':
        return data.filter(item =>
          item.status !== 'provisional' && item.payment_status !== 'fully_paid'
        );

      // Confirmed Bookings Filters
      case 'confirmed_full_payment':
        return data.filter(item => item.status === 'confirmed' && item.payment_status === 'fully_paid');
      case 'confirmed_deposit':
        return data.filter(item => item.status === 'confirmed' && item.payment_status === 'deposit_paid');
      case 'confirmed_partial':
        return data.filter(item => item.status === 'confirmed' && item.payment_status === 'partial');
      case 'confirmed_overdue':
        return data.filter(item => item.status === 'confirmed' && item.payment_status === 'overdue');

      // Amendment Filters
      case 'amendments_under_amendment':
        return data.filter(item => item.status === 'amended' && item.payment_status !== 'fully_paid');
      case 'amendments_completed':
        return data.filter(item => item.status === 'amended' && item.payment_status === 'fully_paid');
      // Rejected + not yet cancelled = declined amendment (distinct from cancellations)
      case 'amendments_declined':
        return data.filter(item => item.status === 'rejected' && item.payment_status !== 'cancelled');

      // Cancellation Filters
      // Payment cancelled but booking not yet formally rejected = in-progress cancellation
      case 'cancellations_under_cancellation':
        return data.filter(item => item.payment_status === 'cancelled' && item.status !== 'rejected');
      // Both rejected and payment cancelled = fully completed cancellation
      case 'cancellations_completed':
        return data.filter(item => item.status === 'rejected' && item.payment_status === 'cancelled');

      // Pending Actions Filters
      case 'pending_no_payment':
        return data.filter(item => item.payment_status === 'pending' && item.status !== 'provisional');
      case 'pending_missing_details':
        return data.filter(item => item.status === 'requested' && item.validation_status === 'pending');
      case 'pending_deposit_due':
        return data.filter(item => item.validation_status === 'ok_to_purchase_deposit');
      // All provisional bookings need action: confirm or release
      case 'pending_authorization_due':
        return data.filter(item => item.status === 'provisional');

      // Quick Actions Filters
      case 'confirmation_requests':
        return data.filter(item => item.status === 'requested');
      case 'ok_to_purchase_full':
        return data.filter(item => item.validation_status === 'ok_to_purchase_full');
      case 'ok_to_purchase_deposit':
        return data.filter(item => item.validation_status === 'ok_to_purchase_deposit');
      case 'do_not_purchase':
        return data.filter(item => item.validation_status === 'do_not_purchase');

      // Additional Key Metrics Filters
      case 'confirmed_bookings':
        return data.filter(item => item.status === 'confirmed');

      // Amendments section filters
      case 'amendments_total':
        return data.filter(item => item.status === 'amended');
      case 'amendments_under':
        return data.filter(item => item.status === 'amended' && item.payment_status !== 'fully_paid');

      // Cancellations section filters
      case 'cancellations_total':
        return data.filter(item => item.payment_status === 'cancelled');
      case 'cancellations_under':
        return data.filter(item => item.payment_status === 'cancelled' && item.status !== 'rejected');

      // Pending Actions section filters
      case 'pending_total':
        return data.filter(item =>
          (item.payment_status === 'pending' && item.status !== 'provisional') ||
          (item.status === 'requested' && item.validation_status === 'pending') ||
          item.validation_status === 'ok_to_purchase_deposit' ||
          item.status === 'provisional'
        );

      // Today's Bookings section filters
      case 'today_fully_paid': {
        const todayDate = new Date().toISOString().split('T')[0];
        return data.filter(item =>
          item.date?.split('T')[0] === todayDate &&
          item.status === 'confirmed' &&
          item.payment_status === 'fully_paid'
        );
      }
      case 'today_deposit': {
        const todayForDeposit = new Date().toISOString().split('T')[0];
        return data.filter(item =>
          item.date?.split('T')[0] === todayForDeposit &&
          item.status === 'confirmed' &&
          item.payment_status === 'deposit_paid'
        );
      }
      case 'today_partial': {
        const todayForPartial = new Date().toISOString().split('T')[0];
        return data.filter(item =>
          item.date?.split('T')[0] === todayForPartial &&
          item.status === 'confirmed' &&
          item.payment_status === 'partial'
        );
      }

      // Critical Deadlines section filters
      case 'critical_deadlines':
        return data.filter(item => {
          if (item.payment_status === 'overdue') return true;
          if (item.balance_due_date && item.payment_status !== 'fully_paid' && new Date(item.balance_due_date) < new Date()) return true;
          return false;
        });
      case 'warning_deadlines':
        return data.filter(item => {
          if (item.payment_status === 'fully_paid') return false;
          if (item.payment_status === 'deposit_paid') {
            const days = Math.ceil((new Date(item.date) - new Date()) / 86400000);
            return days > 0 && days <= 45;
          }
          if (item.payment_status === 'pending' && item.deposit_due_date) return new Date(item.deposit_due_date) < new Date();
          return false;
        });

      // Low Availability — provisional bookings with fewer than 15 slots
      case 'low_availability':
        return data.filter(item => {
          const slots = parseInt(item.available_slots);
          return !isNaN(slots) && slots > 0 && slots < 40 && item.payment_status !== 'fully_paid';
        });

      default:
        return data;
    }
  };

  const filteredData = React.useMemo(() => filterData(allData), [allData, filterParam]);

  // Helper functions for status colors
  const getBookingStatusColor = (status) => {
    const colors = {
      confirmed: "bg-green-100 text-green-800",
      provisional: "bg-yellow-100 text-yellow-800",
      requested: "bg-blue-100 text-blue-800",
      rejected: "bg-red-100 text-red-800",
      amended: "bg-purple-100 text-purple-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      fully_paid: "bg-green-100 text-green-800",
      deposit_paid: "bg-yellow-100 text-yellow-800",
      pending: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800",
      partial: "bg-orange-100 text-orange-800",
      overdue: "bg-pink-100 text-pink-800",
      authorized: "bg-purple-100 text-purple-800",
      rolling_deposit: "bg-indigo-100 text-indigo-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getValidationStatusColor = (status) => {
    const colors = {
      ok_to_purchase_full: "bg-green-100 text-green-800",
      ok_to_purchase_deposit: "bg-yellow-100 text-yellow-800",
      pending: "bg-blue-100 text-blue-800",
      do_not_purchase: "bg-red-100 text-red-800"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const columns = [
    {
      header: "#",
      accessor: "id",
      cellClassName: "px-3 py-2 text-xs text-gray-600 text-center",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 text-center",
      width: "60px"
    },
    {
      header: "Booking Name",
      accessor: "booking_name",
      cellClassName: "px-3 py-2 text-xs font-medium text-gray-900 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "180px"
    },
    {
      header: "Product",
      accessor: "product",
      cellClassName: "px-3 py-2 text-xs text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "150px"
    },
    {
      header: "Site",
      accessor: "site",
      cellClassName: "px-3 py-2 text-xs text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "150px"
    },
    {
      header: "Date",
      accessor: "date",
      cell: (value) => value ? new Date(value).toLocaleDateString() : '-',
      cellClassName: "px-3 py-2 text-xs text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "120px"
    },
    {
      header: "People",
      accessor: "number_of_people",
      cellClassName: "px-3 py-2 text-xs text-gray-900 text-center truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "80px"
    },
    {
      header: "Total",
      accessor: "total_amount",
      cell: (value) => value != null ? `$${Number(value).toLocaleString()}` : '-',
      cellClassName: "px-3 py-2 text-xs text-gray-900 text-right truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "100px"
    },
    {
      header: "Paid",
      accessor: "amount_received",
      cell: (value) => value != null ? `$${Number(value).toLocaleString()}` : '-',
      cellClassName: "px-3 py-2 text-xs text-gray-900 text-right truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "100px"
    },
    {
      header: "Booking Status",
      accessor: "status",
      cell: (value) => value ? (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full truncate ${getBookingStatusColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ) : '-',
      cellClassName: "px-3 py-2 text-xs",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "130px"
    },
    {
      header: "Payment Status",
      accessor: "payment_status",
      cell: (value) => value ? (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full truncate ${getPaymentStatusColor(value)}`}>
          {value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
        </span>
      ) : '-',
      cellClassName: "px-3 py-2 text-xs",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "130px"
    },
    {
      header: "Validation Status",
      accessor: "validation_status",
      cell: (value) => value ? (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full truncate ${getValidationStatusColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ) : '-',
      cellClassName: "px-3 py-2 text-xs",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "130px"
    }
  ];

  return (
    <EnhancedTable
      columns={columns}
      data={filteredData}
      totalRows={allData.length}
      filteredRows={filteredData.length}
      defaultHiddenColumns={['amount_received', 'validation_status', 'site']}
    />
  );
};

export default ViewBookings1;
