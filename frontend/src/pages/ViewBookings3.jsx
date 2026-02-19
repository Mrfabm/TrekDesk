import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Disclosure } from '@headlessui/react';
import { ChevronUpIcon } from '@heroicons/react/24/solid';
import EnhancedTable from '../components/EnhancedTable';
import { allBookingsData } from './ViewBookings1';

// Helper functions for status colors
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

const getActionStatusColor = (status) => {
  const colors = {
    ok_to_purchase_full: "bg-green-100 text-green-800 cursor-pointer hover:bg-green-200",
    ok_to_purchase_deposit: "bg-yellow-100 text-yellow-800 cursor-pointer hover:bg-yellow-200",
    pending: "bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200",
    do_not_purchase: "bg-red-100 text-red-800 cursor-pointer hover:bg-red-200"
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

const BookingDetailModal = ({ booking, onClose }) => {
  if (!booking) return null;

  const renderDisclosureButton = (open, title, icon, bgColor, textColor) => (
    <Disclosure.Button className="flex w-full items-center justify-between text-left">
      <div className="flex items-center">
        <span className={`w-7 h-7 rounded-full ${bgColor} ${textColor} inline-flex items-center justify-center text-lg mr-2.5`}>
          {icon}
        </span>
        <span className="text-[15px] font-semibold text-gray-900">{title}</span>
      </div>
      <ChevronUpIcon
        className={`${
          open ? 'transform rotate-180' : ''
        } w-5 h-5 text-gray-500 transition-transform duration-200`}
      />
    </Disclosure.Button>
  );

  return (
    <div 
      className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-6 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] w-full max-w-3xl transform transition-all scale-100 opacity-100 overflow-hidden">
        {/* Header - Sticky */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-700 to-indigo-800 px-6 py-4 flex justify-between items-center z-10">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-semibold text-white tracking-tight">
                {booking.booking_name}
              </h2>
              <span className="px-2.5 py-0.5 bg-indigo-500/30 backdrop-blur-sm border border-indigo-400/30 rounded-full text-white text-[13px] font-medium shadow-sm">
                {booking.booking_ref}
              </span>
            </div>
            <div className="flex items-center space-x-5 text-indigo-100/90 mt-2">
              <div className="flex items-center space-x-2">
                <span className="text-base opacity-90">🎫</span>
                <span className="text-[13px]">{booking.product}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-base opacity-90">📅</span>
                <span className="text-[13px]">{new Date(booking.trekking_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-base opacity-90">👥</span>
                <span className="text-[13px]">{booking.number_of_permits} permits</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-full p-2 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Status Bar */}
        <div className="bg-white border-b px-6 py-3.5 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            <div>
              <span className="block text-[12px] font-medium text-gray-500 mb-1.5">Payment Status</span>
              <span className={`inline-flex px-2.5 py-1 text-[13px] font-medium rounded-full shadow-sm ${getPaymentStatusColor(booking.payment_status)}`}>
                {booking.payment_status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </span>
            </div>
            <div>
              <span className="block text-[12px] font-medium text-gray-500 mb-1.5">Booking Status</span>
              <span className={`inline-flex px-2.5 py-1 text-[13px] font-medium rounded-full shadow-sm ${getBookingStatusColor(booking.booking_status)}`}>
                {booking.booking_status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </span>
            </div>
            <div>
              <span className="block text-[12px] font-medium text-gray-500 mb-1.5">Validation Status</span>
              <span className={`inline-flex px-2.5 py-1 text-[13px] font-medium rounded-full shadow-sm ${getActionStatusColor(booking.validation_status)}`}>
                {booking.validation_status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <span className="block text-[12px] font-medium text-gray-500 mb-1.5">Total Amount</span>
              <span className="text-[15px] font-semibold text-gray-900">${booking.total_amount.toLocaleString()}</span>
            </div>
            <div className="text-right">
              <span className="block text-[12px] font-medium text-gray-500 mb-1.5">Paid Amount</span>
              <span className="text-[15px] font-semibold text-emerald-600">${booking.paid_amount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 bg-gray-50/50">
          <div className="grid grid-cols-3 gap-5">
            {/* Left Column */}
            <div className="bg-white rounded-xl border border-gray-200/75 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="p-4">
                <Disclosure defaultOpen>
                  {({ open }) => (
                    <>
                      {renderDisclosureButton(open, "Booking Details", "📋", "bg-blue-100", "text-blue-600")}
                      <Disclosure.Panel className="mt-3 space-y-3">
                        <div>
                          <label className="block text-[12px] font-medium text-gray-500 mb-1">Invoice Number</label>
                          <div className="text-[13px] font-medium text-gray-700">{booking.invoice_no || '-'}</div>
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-gray-500 mb-1">Head of File</label>
                          <div className="text-[13px] font-medium text-gray-700">{booking.head_of_file || '-'}</div>
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-gray-500 mb-1">Originating Agent</label>
                          <div className="text-[13px] font-medium text-gray-700">{booking.originating_agent || '-'}</div>
                        </div>
                      </Disclosure.Panel>
                    </>
                  )}
                </Disclosure>
              </div>
            </div>

            {/* Middle Column */}
            <div className="bg-white rounded-xl border border-gray-200/75 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="p-4">
                <Disclosure defaultOpen>
                  {({ open }) => (
                    <>
                      {renderDisclosureButton(open, "Product Information", "🎫", "bg-indigo-100", "text-indigo-600")}
                      <Disclosure.Panel className="mt-3 space-y-3">
                        <div>
                          <label className="block text-[12px] font-medium text-gray-500 mb-1">Voucher</label>
                          <div className="text-[13px] font-medium text-gray-700">{booking.voucher || '-'}</div>
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-gray-500 mb-1">People</label>
                          <div className="text-[13px] font-medium text-gray-700">{booking.people || '-'}</div>
                        </div>
                        <div>
                          <label className="block text-[12px] font-medium text-gray-500 mb-1">Request Date</label>
                          <div className="text-[13px] font-medium text-gray-700">
                            {new Date(booking.date_of_request).toLocaleDateString()}
                          </div>
                        </div>
                      </Disclosure.Panel>
                    </>
                  )}
                </Disclosure>
              </div>
            </div>

            {/* Right Column */}
            <div className="bg-white rounded-xl border border-gray-200/75 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="p-4">
                <Disclosure defaultOpen>
                  {({ open }) => (
                    <>
                      {renderDisclosureButton(open, "Additional Information", "📝", "bg-violet-100", "text-violet-600")}
                      <Disclosure.Panel className="mt-3">
                        <div>
                          <label className="block text-[12px] font-medium text-gray-500 mb-1">Notes</label>
                          <div className="text-[13px] font-medium text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100 min-h-[80px]">
                            {booking.notes || 'No notes available'}
                          </div>
                        </div>
                      </Disclosure.Panel>
                    </>
                  )}
                </Disclosure>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ViewBookings3 = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedBooking, setSelectedBooking] = useState(null);
  const searchParams = new URLSearchParams(location.search);
  const filterParam = searchParams.get('filter');
  const currentUser = localStorage.getItem('username'); // Get logged in user

  // Filter data based on head of file
  const allData = React.useMemo(() => {
    const data = allBookingsData;
    if (localStorage.getItem('role') === 'admin') {
      return data; // Admin sees all data
    }
    // Regular users only see their bookings
    return data.filter(booking => booking.head_of_file === currentUser);
  }, [currentUser]);

  // Handle row click to show details
  const handleRowClick = (booking) => {
    console.log('Row clicked:', booking);
    setSelectedBooking(booking);
  };

  // Handle action click based on validation status
  const handleActionClick = (e, status, bookingId) => {
    e.stopPropagation(); // Prevent row click when clicking action button
    switch (status) {
      case 'ok_to_purchase_full':
      case 'ok_to_purchase_deposit':
        navigate(`/passport-management?bookingId=${bookingId}`);
        break;
      case 'do_not_purchase':
        navigate(`/finance/validate/${bookingId}`);
        break;
      case 'pending':
        navigate(`/finance?bookingId=${bookingId}`);
        break;
      default:
        console.log('No action defined for this status');
    }
  };

  // Simplified columns for the main table
  const columns = [
    {
      header: "Booking Name",
      accessor: "booking_name",
      cellClassName: "px-4 py-2 text-sm font-medium text-gray-900",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "200px"
    },
    {
      header: "Ref",
      accessor: "booking_ref",
      cellClassName: "px-4 py-2 text-sm text-gray-600",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "120px"
    },
    {
      header: "Product",
      accessor: "product",
      cellClassName: "px-4 py-2 text-sm text-gray-600",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "150px"
    },
    {
      header: "Trek Date",
      accessor: "trekking_date",
      cell: (value) => new Date(value).toLocaleDateString(),
      cellClassName: "px-4 py-2 text-sm text-gray-600",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "120px"
    },
    {
      header: "Payment Status",
      accessor: "payment_status",
      cell: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(value)}`}>
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
          onClick={(e) => handleActionClick(e, value, row.id)}
          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionStatusColor(value)}`}
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
    },
    {
      header: "Done On",
      accessor: "date_of_request",
      cell: (value) => new Date(value).toLocaleDateString(),
      cellClassName: "px-4 py-2 text-sm text-gray-600",
      headerClassName: "px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50",
      width: "120px"
    }
  ];

  return (
    <div className="relative">
      <EnhancedTable
        columns={columns}
        data={allData}
        totalRows={allData.length}
        filteredRows={allData.length}
        onRowClick={handleRowClick}
        rowClassName="cursor-pointer hover:bg-gray-50"
      />
      
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
        />
      )}
    </div>
  );
};

export default ViewBookings3; 