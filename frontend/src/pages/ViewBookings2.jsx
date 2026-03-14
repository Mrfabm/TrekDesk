import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import EnhancedTable from '../components/EnhancedTable';

const ViewBookings2 = () => {
  const location = useLocation();
  const navigate = useNavigate();
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

  // Updated handleActionClick to use existing routes
  const handleActionClick = (status, bookingId) => {
    switch (status) {
            case 'ok_to_purchase_full':
            case 'ok_to_purchase_deposit':
        // Navigate to passport management with bookingId
        navigate(`/passport-management?bookingId=${bookingId}`);
              break;
            case 'do_not_purchase':
        // Navigate to finance validation with bookingId
        navigate(`/finance/validate/${bookingId}`);
              break;
      case 'pending':
        // Send to finance dashboard with bookingId parameter
        navigate(`/finance?bookingId=${bookingId}`);
              break;
            default:
        console.log('No action defined for this status');
    }
  };

  const filterData = (data) => {
    if (!filterParam) return data;
    const today = new Date().toISOString().split('T')[0];
    switch (filterParam) {
      case 'quick_actions':
        return data.filter(b => b.status === 'requested' || ['ok_to_purchase_full','ok_to_purchase_deposit','do_not_purchase'].includes(b.validation_status));
      case 'today':
        return data.filter(b => b.date?.split('T')[0] === today);
      case 'critical':
        return data.filter(b => {
          if (b.payment_status === 'overdue') return true;
          if (b.balance_due_date && b.payment_status !== 'fully_paid' && new Date(b.balance_due_date) < new Date()) return true;
          if (b.payment_status === 'deposit_paid') { const d = Math.ceil((new Date(b.date) - new Date()) / 86400000); if (d > 0 && d <= 45) return true; }
          if (b.payment_status === 'pending' && b.deposit_due_date && new Date(b.deposit_due_date) < new Date()) return true;
          return false;
        });
      case 'amendments': return data.filter(b => b.status === 'amended' || b.status === 'amendment_requested');
      case 'cancellations': return data.filter(b => b.payment_status === 'cancelled' || b.status === 'cancellation_requested');
      case 'pending_payments': return data.filter(b => b.status !== 'provisional' && b.payment_status !== 'fully_paid');
      case 'confirmed_full_payment': return data.filter(b => b.status === 'confirmed' && b.payment_status === 'fully_paid');
      case 'confirmed_deposit': return data.filter(b => b.status === 'confirmed' && b.payment_status === 'deposit_paid');
      case 'confirmed_partial': return data.filter(b => b.status === 'confirmed' && b.payment_status === 'partial');
      case 'confirmed_overdue': return data.filter(b => b.status === 'confirmed' && b.payment_status === 'overdue');
      case 'confirmation_requests': return data.filter(b => b.status === 'requested');
      case 'ok_to_purchase_full': return data.filter(b => b.validation_status === 'ok_to_purchase_full');
      case 'ok_to_purchase_deposit': return data.filter(b => b.validation_status === 'ok_to_purchase_deposit');
      case 'do_not_purchase': return data.filter(b => b.validation_status === 'do_not_purchase');
      case 'confirmed_bookings': return data.filter(b => b.status === 'confirmed');
      default: return data;
    }
  };

  // Helper functions for status colors (same as ViewBookings1)
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

  const getActionStatusColor = (status) => {
    const colors = {
      ok_to_purchase_full: "bg-green-100 text-green-800 cursor-pointer hover:bg-green-200",
      ok_to_purchase_deposit: "bg-yellow-100 text-yellow-800 cursor-pointer hover:bg-yellow-200",
      pending: "bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200",
      do_not_purchase: "bg-red-100 text-red-800 cursor-pointer hover:bg-red-200"
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  // Get the filtered data from the complete dataset
  const filteredData = React.useMemo(() => filterData(allData), [allData, filterParam]);

  // Updated columns configuration
  const columns = [
    {
      header: "#",
      accessor: "id",
      cellClassName: "px-4 py-2 text-sm text-gray-600 text-center",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 text-center",
      width: "60px"
    },
    {
      header: "Booking Name",
      accessor: "booking_name",
      cellClassName: "px-4 py-2 text-sm font-medium text-gray-900 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "180px"
    },
    {
      header: "Booking Ref",
      accessor: "booking_ref",
      cellClassName: "px-4 py-2 text-sm text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "120px"
    },
    {
      header: "Invoice No.",
      accessor: "invoice_no",
      cellClassName: "px-4 py-2 text-sm text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "120px"
    },
    {
      header: "No. Permits",
      accessor: "number_of_permits",
      cellClassName: "px-4 py-2 text-sm text-gray-900 text-center truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "100px"
    },
    {
      header: "Voucher",
      accessor: "voucher",
      cellClassName: "px-4 py-2 text-sm text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "100px"
    },
    {
      header: "Request Date",
      accessor: "date_of_request",
      cell: (value) => new Date(value).toLocaleDateString(),
      cellClassName: "px-4 py-2 text-sm text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "120px"
    },
    {
      header: "Trek Date",
      accessor: "trekking_date",
      cell: (value) => new Date(value).toLocaleDateString(),
      cellClassName: "px-4 py-2 text-sm text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "120px"
    },
    {
      header: "Head of File",
      accessor: "head_of_file",
      cellClassName: "px-4 py-2 text-sm text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "150px"
    },
    {
      header: "Agent/Client",
      accessor: "originating_agent",
      cellClassName: "px-4 py-2 text-sm text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "150px"
    },
    {
      header: "Product",
      accessor: "product",
      cellClassName: "px-4 py-2 text-sm text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "150px"
    },
    {
      header: "Date",
      accessor: "date",
      cell: (value) => new Date(value).toLocaleDateString(),
      cellClassName: "px-4 py-2 text-sm text-gray-600 truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "120px"
    },
    {
      header: "People",
      accessor: "people",
      cellClassName: "px-4 py-2 text-sm text-gray-900 text-center truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "80px"
    },
    {
      header: "Total",
      accessor: "total_amount",
      cell: (value) => `$${value.toLocaleString()}`,
      cellClassName: "px-4 py-2 text-sm text-gray-900 text-right truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "100px"
    },
    {
      header: "Paid",
      accessor: "paid_amount",
      cell: (value) => `$${value.toLocaleString()}`,
      cellClassName: "px-4 py-2 text-sm text-gray-900 text-right truncate",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "100px"
    },
    {
      header: "Booking Status",
      accessor: "status",
      cell: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full truncate ${getBookingStatusColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
      cellClassName: "px-4 py-2 text-sm",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "130px"
    },
    {
      header: "Payment Status",
      accessor: "payment_status",
      cell: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full truncate ${getPaymentStatusColor(value)}`}>
            {value.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
        </span>
      ),
      cellClassName: "px-4 py-2 text-sm",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "130px"
    },
    {
      header: "Actions",
      accessor: "validation_status",
      cell: (value, row) => (
        <button
          onClick={() => handleActionClick(value, row.id)}
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full truncate ${getActionStatusColor(value)}`}
        >
          {value === 'ok_to_purchase_full' && "Confirm Permit (Full)"}
          {value === 'ok_to_purchase_deposit' && "Confirm Permit (Deposit)"}
          {value === 'do_not_purchase' && "Request Authorization"}
          {value === 'pending' && "Payment Approval"}
        </button>
      ),
      cellClassName: "px-4 py-2 text-sm",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "160px"
    }
  ];

  return (
    <EnhancedTable
      columns={columns}
      data={filteredData}
      totalRows={allData.length}
      filteredRows={filteredData.length}
    />
  );
};

export default ViewBookings2; 