import React, { useState, useEffect } from 'react';
import EnhancedTable from '../components/EnhancedTable';
import BookingTimeline from '../components/BookingTimeline';
import { useNavigate } from 'react-router-dom';

const Bookings = () => {
  const role = localStorage.getItem('role');
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();
  const [requestCount, setRequestCount] = useState(0);
  const [drawerBooking, setDrawerBooking] = useState(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState('timeline');
  const [drawerDetails, setDrawerDetails] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState(null);

  // Authorization request modal
  const [authModal, setAuthModal] = useState(null); // { bookingId, bookingName }
  const [authReason, setAuthReason] = useState('');
  const [authFiles, setAuthFiles] = useState([]);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  // Appeal modal (for users on declined auth requests)
  const [appealModal, setAppealModal] = useState(null); // { requestId, bookingName }
  const [appealNotes, setAppealNotes] = useState('');
  const [appealFiles, setAppealFiles] = useState([]);
  const [appealSubmitting, setAppealSubmitting] = useState(false);

  // Proof upload modal
  const [uploadModal, setUploadModal] = useState(null); // { requestId, bookingName }
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  const handleSubmitAppeal = async () => {
    if (!appealNotes.trim()) return;
    setAppealSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/authorization/${appealModal.requestId}/appeal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ appeal_notes: appealNotes }),
      });
      const data = await res.json();
      if (res.ok) {
        // Upload any attached files
        if (appealFiles.length > 0) {
          const fd = new FormData();
          for (const f of appealFiles) fd.append('files', f);
          await fetch(`http://localhost:8000/api/authorization/${appealModal.requestId}/upload-appeal-proof`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: fd,
          });
        }
        setAppealModal(null);
        setAppealNotes('');
        setAppealFiles([]);
        setAuthMessage(`Appeal submitted for "${appealModal.bookingName}".`);
        fetchBookings();
      } else {
        setAuthMessage(data.detail || 'Failed to submit appeal.');
      }
    } finally {
      setAppealSubmitting(false);
    }
  };

  const handleUploadProof = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    setUploadMessage('');
    try {
      const formData = new FormData();
      for (const file of uploadFiles) formData.append('files', file);
      const res = await fetch(`http://localhost:8000/api/authorization/${uploadModal.requestId}/upload-proof`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setUploadMessage(`${data.uploaded?.length || uploadFiles.length} file(s) uploaded successfully.`);
        setUploadFiles([]);
        setTimeout(() => { setUploadModal(null); setUploadMessage(''); }, 1800);
      } else {
        setUploadMessage(data.detail || 'Upload failed');
      }
    } catch {
      setUploadMessage('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Amendment request modal
  const [amendModal, setAmendModal] = useState(null); // { bookingId, bookingName, bookingDate }
  const [amendDate, setAmendDate] = useState('');
  const [amendReason, setAmendReason] = useState('');
  const [amendSubmitting, setAmendSubmitting] = useState(false);
  const [amendFeePreview, setAmendFeePreview] = useState(null); // { fee_type, fee_amount }

  // Cancellation request modal
  const [cancelModal, setCancelModal] = useState(null); // { bookingId, bookingName }
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  // Request details modal
  const [detailsModal, setDetailsModal] = useState(null); // { bookingId, bookingName }
  const [detailsMessage, setDetailsMessage] = useState('');
  const [detailsSubmitting, setDetailsSubmitting] = useState(false);

  const handleRequestDetails = async () => {
    if (!detailsMessage.trim()) return;
    setDetailsSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/bookings/${detailsModal.bookingId}/request-details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ message: detailsMessage }),
      });
      if (res.ok) {
        setDetailsModal(null);
        setDetailsMessage('');
        setAuthMessage(`Details requested for "${detailsModal.bookingName}".`);
      }
    } finally {
      setDetailsSubmitting(false);
    }
  };

  const handleRequestAuthorization = async () => {
    if (!authReason.trim()) return;
    setAuthSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/authorization/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ booking_id: authModal.bookingId, reason: authReason, deadline_days: 7 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthMessage(data.detail || 'Failed to submit request');
        return;
      }
      // Upload any attached proof files
      if (authFiles.length > 0) {
        const fd = new FormData();
        authFiles.forEach(f => fd.append('files', f));
        await fetch(`http://localhost:8000/api/authorization/${data.id}/upload-proof`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd,
        });
      }
      setAuthModal(null);
      setAuthReason('');
      setAuthFiles([]);
      setAuthMessage(`Authorization request submitted for "${authModal.bookingName}".`);
      fetchBookings();
    } finally {
      setAuthSubmitting(false);
    }
  };

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
      if (row.payment_status === 'fully_paid') {
        return (
          <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs font-medium">
            Fully Paid
          </span>
        );
      }
      const label = row.payment_status === 'pending' ? 'Validate Payment' : 'Update Payment';
      return (
        <button
          onClick={() => navigate(`/finance/validate/${row.id}`)}
          className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
        >
          {label}
        </button>
      );
    }

    if (role === 'admin') {
      // Reject only for provisional bookings
      if (row.status === 'provisional') {
        return (
          <button
            onClick={() => handleRejectBooking(row.id)}
            className="px-3 py-1.5 bg-red-50 text-red-700 rounded text-xs font-medium hover:bg-red-100 transition-colors"
          >
            Reject
          </button>
        );
      }
      // Send to Finance / Reject for requested bookings
      if (row.status === 'requested') {
        return (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleSendToFinance(row.id)}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
            >
              Send to Finance
            </button>
            <button
              onClick={() => handleRejectBooking(row.id)}
              className="px-3 py-1.5 bg-red-50 text-red-700 rounded text-xs font-medium hover:bg-red-100 transition-colors"
            >
              Reject
            </button>
          </div>
        );
      }
      // For confirmed bookings, show action buttons based on validation status
      if (row.validation_status) {
        // Helper: passport completeness warning
        const passportWarning = row.passport_count < row.number_of_people && row.days_to_trek <= 60 && row.days_to_trek >= 0;
        // Helper: request auth button (only if no pending request)
        const authBtn = row.authorization_status !== 'pending' ? (
          <button
            onClick={() => { setAuthModal({ bookingId: row.id, bookingName: row.booking_name }); setAuthReason(''); setAuthFiles([]); }}
            className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs font-medium hover:bg-orange-100 transition-colors"
          >
            Request Auth
          </button>
        ) : (
          <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded text-xs">Auth Pending</span>
        );

        const detailsBtn = (
          <button
            onClick={() => { setDetailsModal({ bookingId: row.id, bookingName: row.booking_name }); setDetailsMessage(''); }}
            className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
          >
            Request Details
          </button>
        );

        switch (row.validation_status) {
          case 'ok_to_purchase_full':
            return (
              <div className="flex flex-col space-y-1">
                {passportWarning && (
                  <span className="text-xs text-red-600 font-medium">⚠ Passports incomplete</span>
                )}
                <button
                  onClick={() => handlePurchasePermits(row.id, 'full')}
                  className="px-3 py-1.5 bg-green-50 text-green-600 rounded text-xs font-medium hover:bg-green-100 transition-colors"
                >
                  Purchase Permits Full
                </button>
                {authBtn}
                {detailsBtn}
                {row.validation_notes && (
                  <span className="text-xs text-gray-500">Note: {row.validation_notes}</span>
                )}
              </div>
            );
          case 'ok_to_purchase_deposit':
            return (
              <div className="flex flex-col space-y-1">
                {passportWarning && (
                  <span className="text-xs text-red-600 font-medium">⚠ Passports incomplete</span>
                )}
                <button
                  onClick={() => handlePurchasePermits(row.id, 'deposit')}
                  className="px-3 py-1.5 bg-yellow-50 text-yellow-600 rounded text-xs font-medium hover:bg-yellow-100 transition-colors"
                >
                  Purchase Permits Deposit
                </button>
                {authBtn}
                {row.validation_notes && (
                  <span className="text-xs text-gray-500">Note: {row.validation_notes}</span>
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
                {authBtn}
                {detailsBtn}
                {row.validation_notes && (
                  <span className="text-xs text-gray-500">Note: {row.validation_notes}</span>
                )}
              </div>
            );
          default:
            return <div className="flex flex-col space-y-1">{authBtn}{detailsBtn}</div>;
        }
      }
      // Non-provisional booking without validation status yet
      const amendableStatuses = ['confirmed', 'secured_full', 'secured_deposit', 'secured_authorization', 'awaiting_authorization'];
      if (row.status !== 'provisional') {
        const noAuthBtn = (
          <button
            onClick={() => { setAuthModal({ bookingId: row.id, bookingName: row.booking_name }); setAuthReason(''); setAuthFiles([]); }}
            className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs font-medium hover:bg-orange-100 transition-colors"
          >
            Request Auth
          </button>
        );
        return (
          <div className="flex flex-col space-y-1">
            {noAuthBtn}
            <button
              onClick={() => { setDetailsModal({ bookingId: row.id, bookingName: row.booking_name }); setDetailsMessage(''); }}
              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
            >
              Request Details
            </button>
            {amendableStatuses.includes(row.status) && (
              <button
                onClick={() => { setAmendModal({ bookingId: row.id, bookingName: row.booking_name, bookingDate: row.date }); setAmendDate(''); setAmendReason(''); }}
                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
              >
                Request Amendment
              </button>
            )}
            {amendableStatuses.includes(row.status) && (
              <button
                onClick={() => { setCancelModal({ bookingId: row.id, bookingName: row.booking_name }); setCancelReason(''); }}
                className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium hover:bg-red-100 transition-colors"
              >
                Cancel Booking
              </button>
            )}
          </div>
        );
      }
      return null;
    }

    // User view - Add this section
    if (role === 'user') {
      // Authorization status always wins — check it first regardless of booking status
      if (row.authorization_status === 'declined') {
        if (row.appeal_status === 'pending') {
          return (
            <div className="flex flex-col space-y-1">
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">Authorization Declined</span>
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">Appeal Under Review</span>
            </div>
          );
        }
        if (row.appeal_status === 'rejected') {
          return (
            <div className="flex flex-col space-y-1">
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">Authorization Declined</span>
              <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-xs">Appeal Rejected</span>
            </div>
          );
        }
        // No appeal yet — show Submit Appeal button
        return (
          <div className="flex flex-col space-y-1">
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">Authorization Declined</span>
            <button
              onClick={() => { setAppealModal({ requestId: row.authorization_request_id, bookingName: row.booking_name }); setAppealNotes(''); setAppealFiles([]); }}
              className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100"
            >
              Submit Appeal
            </button>
          </div>
        );
      }

      if (row.authorization_status === 'pending') {
        return (
          <div className="flex flex-col space-y-1">
            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">Authorization Pending</span>
            <button
              onClick={() => { setUploadModal({ requestId: row.authorization_request_id, bookingName: row.booking_name }); setUploadFiles([]); setUploadMessage(''); }}
              className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100"
            >
              Upload Proof
            </button>
          </div>
        );
      }

      if (row.authorization_status === 'authorized') {
        return (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">Authorized</span>
        );
      }

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
            <div className="flex flex-col space-y-1">
              <span className="px-2 py-1 bg-yellow-50 text-yellow-600 rounded text-xs font-medium">
                Confirmation Requested
              </span>
              <button
                onClick={() => { setAuthModal({ bookingId: row.id, bookingName: row.booking_name }); setAuthReason(''); setAuthFiles([]); }}
                className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs font-medium hover:bg-orange-100"
              >
                Request Authorization
              </button>
            </div>
          );
        case 'validation_request':
          return (
            <div className="flex flex-col space-y-1">
              <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                Under Finance Review
              </span>
              <button
                onClick={() => { setAuthModal({ bookingId: row.id, bookingName: row.booking_name }); setAuthReason(''); setAuthFiles([]); }}
                className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs font-medium hover:bg-orange-100"
              >
                Request Authorization
              </button>
            </div>
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

      // Trusted agent: booking awaiting authorization with no pending request yet
      if (row.status === 'awaiting_authorization' && !row.authorization_status) {
        return (
          <div className="flex flex-col space-y-1">
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">Awaiting Authorization</span>
            <button
              onClick={() => { setAuthModal({ bookingId: row.id, bookingName: row.booking_name }); setAuthReason(''); setAuthFiles([]); }}
              className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs font-medium hover:bg-orange-100 transition-colors"
            >
              Request Authorization
            </button>
          </div>
        );
      }

      // User can request amendment or cancellation on active bookings
      const userAmendable = ['confirmed', 'secured_full', 'secured_deposit', 'secured_authorization'];
      if (userAmendable.includes(row.status)) {
        return (
          <div className="flex flex-col space-y-1">
            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium capitalize">{row.status?.replace(/_/g, ' ')}</span>
            <button
              onClick={() => { setAmendModal({ bookingId: row.id, bookingName: row.booking_name, bookingDate: row.date }); setAmendDate(''); setAmendReason(''); }}
              className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
            >
              Request Amendment
            </button>
            <button
              onClick={() => { setCancelModal({ bookingId: row.id, bookingName: row.booking_name }); setCancelReason(''); }}
              className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-medium hover:bg-red-100 transition-colors"
            >
              Cancel Booking
            </button>
          </div>
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
        header: 'Booking Name',
        accessor: 'booking_name',
        cell: (value) => (
          <span className="text-xs font-medium text-gray-900">{value || '-'}</span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3',
        cellClassName: 'max-w-[160px] truncate px-3 py-2'
      },
      {
        header: 'Product',
        accessor: 'product',
        cell: (value) => (
          <span className="text-xs text-gray-900">{value}</span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3',
        cellClassName: 'max-w-[140px] truncate px-3 py-2'
      },
      {
        header: 'Client',
        accessor: 'agent_client',
        cell: (value) => (
          <span className="text-xs text-gray-900">{value || '-'}</span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3',
        cellClassName: 'max-w-[120px] truncate px-3 py-2'
      },
      {
        header: 'Head of File',
        accessor: 'head_of_file',
        cell: (value) => (
          <span className="text-xs text-gray-900">{value || '-'}</span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3',
        cellClassName: 'max-w-[120px] truncate px-3 py-2'
      },
      {
        header: 'People',
        accessor: 'number_of_people',
        cell: (value) => (
          <span className="text-xs text-gray-900">{value || '-'}</span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3',
        cellClassName: 'whitespace-nowrap px-3 py-2'
      },
      {
        header: 'Trek Date',
        accessor: 'date',
        cell: (value) => (
          <span className="text-xs text-gray-900">
            {value ? new Date(value).toLocaleDateString() : '-'}
          </span>
        ),
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3',
        cellClassName: 'whitespace-nowrap px-3 py-2'
      },
      {
        header: 'Requested Date',
        accessor: 'date_of_request',
        cell: (value) => (
          <span className="text-xs text-gray-900">
            {value ? new Date(value).toLocaleDateString() : '-'}
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
      },
      {
        header: 'Available Slots',
        accessor: 'available_slots',
        cell: (value) => (
          <span className={`text-xs font-medium ${value === 'Sold Out' ? 'text-red-600' : value ? 'text-green-700' : 'text-gray-400'}`}>
            {value || 'N/A'}
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
      render: (row) => getActionButton(row),
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

    // Admin-only: Authorization status + Passport completeness columns
    if (role === 'admin') {
      baseColumns.push({
        header: 'Authorization',
        accessor: 'authorization_status',
        render: (row) => {
          const s = row.authorization_status;
          if (!s) return <span className="text-xs text-gray-400">—</span>;
          const colors = {
            pending:    'bg-yellow-100 text-yellow-800',
            authorized: 'bg-green-100 text-green-800',
            declined:   'bg-red-100 text-red-800',
          };
          return (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors[s] || 'bg-gray-100 text-gray-600'}`}>
              {s}
            </span>
          );
        },
        headerClassName: 'text-xs font-medium text-gray-500 uppercase tracking-wider px-3 py-3',
        cellClassName: 'whitespace-nowrap px-3 py-2'
      });

      baseColumns.push({
        header: 'Passports',
        accessor: 'passport_count',
        render: (row) => {
          const count = row.passport_count || 0;
          const needed = row.number_of_people || 0;
          const days = row.days_to_trek;
          const incomplete = count < needed;
          const critical = incomplete && days !== null && days <= 60 && days >= 0;
          return (
            <span className={`text-xs font-medium ${critical ? 'text-red-600' : incomplete ? 'text-yellow-600' : 'text-green-700'}`}>
              {count}/{needed}
              {critical && ' ⚠'}
            </span>
          );
        },
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
        fetchBookings();
      } else {
        const err = await response.json();
        alert(`Error: ${err.detail || 'Failed to send to finance'}`);
      }
    } catch (error) {
      console.error('Failed to send to finance:', error);
      alert('Failed to send to finance. Please try again.');
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

  const handleRejectBooking = async (bookingId) => {
    if (!window.confirm('Reject this booking?')) return;
    try {
      const response = await fetch(`http://localhost:8000/api/bookings/${bookingId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        fetchBookings();
      } else {
        const err = await response.json();
        alert(`Error: ${err.detail || 'Failed to reject booking'}`);
      }
    } catch (error) {
      console.error('Error rejecting booking:', error);
      alert('Failed to reject booking. Please try again.');
    }
  };

  const handleRowClick = (row) => {
    setDrawerBooking(row);
    setActiveDrawerTab('timeline');
    setDrawerDetails(null);
    setDrawerError(null);
  };

  const fetchDrawerDetails = async (bookingId) => {
    setDrawerLoading(true);
    setDrawerError(null);
    try {
      const res = await fetch(`http://localhost:8000/api/bookings/${bookingId}/client-details`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setDrawerDetails(await res.json());
      } else {
        const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        setDrawerError(err.detail || `Error ${res.status}`);
      }
    } catch (e) {
      setDrawerError(e.message);
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => { setDrawerBooking(null); setDrawerDetails(null); setDrawerError(null); setActiveDrawerTab('timeline'); };

  const handleAmendmentRequest = async () => {
    if (!amendDate || !amendReason.trim()) return;
    setAmendSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/amendments/request/${amendModal.bookingId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requested_date: amendDate, reason: amendReason }),
      });
      if (res.ok) {
        const data = await res.json();
        setAmendFeePreview({ fee_type: data.fee_type, fee_amount: data.fee_amount });
        setAuthMessage(`Amendment requested for "${amendModal.bookingName}". Fee: $${data.fee_amount?.toFixed(2)} (${data.fee_type?.replace(/_/g, ' ')})`);
        setAmendModal(null);
        fetchBookings();
      } else {
        const err = await res.json();
        setAuthMessage(err.detail || 'Failed to submit amendment');
      }
    } catch {
      setAuthMessage('Failed to submit amendment request');
    } finally {
      setAmendSubmitting(false);
    }
  };

  const handleCancellationRequest = async () => {
    if (!cancelReason.trim()) return;
    setCancelSubmitting(true);
    try {
      const res = await fetch(`http://localhost:8000/api/cancellations/request/${cancelModal.bookingId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: cancelReason }),
      });
      if (res.ok) {
        setAuthMessage(`Cancellation request submitted for "${cancelModal.bookingName}". Note: bookings are non-refundable.`);
        setCancelModal(null);
        fetchBookings();
      } else {
        const err = await res.json();
        setAuthMessage(err.detail || 'Failed to submit cancellation');
      }
    } catch {
      setAuthMessage('Failed to submit cancellation request');
    } finally {
      setCancelSubmitting(false);
    }
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

  const handlePurchasePermits = async (bookingId, purchaseType) => {
    try {
      const response = await fetch(`http://localhost:8000/api/bookings/${bookingId}/purchase-permits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ purchase_type: purchaseType }),
      });
      if (response.ok) {
        alert(`Permits purchased (${purchaseType.replace(/_/g, ' ')})`);
        fetchBookings();
      } else {
        const err = await response.json();
        alert(err.detail || 'Failed to purchase permits');
      }
    } catch {
      alert('Failed to purchase permits');
    }
  };

  const displayedBookings = activeTab === 'confirmed'
    ? bookings.filter(b => b.status === 'confirmed')
    : activeTab === 'provisional'
      ? bookings.filter(b => b.status === 'provisional')
      : activeTab === 'requested'
        ? bookings.filter(b => b.status === 'requested')
        : bookings;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium text-gray-900 dark:text-white">Bookings</h1>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {role === 'finance_admin' ? 'Manage and validate payments' : 'View your bookings'}
          </p>
        </div>
        {role === 'admin' && (
          <button
            onClick={() => navigate('/dashboard')}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
          >
            + Create Booking
          </button>
        )}
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
        <nav className="flex -mb-px space-x-4">
          {[
            { key: 'all', label: 'All Bookings' },
            { key: 'confirmed', label: 'Confirmed' },
            { key: 'provisional', label: 'Provisional' },
            { key: 'requested', label: 'Requested' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <EnhancedTable
        data={displayedBookings}
        columns={getColumns()}
        defaultHiddenColumns={
          role === 'admin'
            ? ['agent_client', 'head_of_file', 'date_of_request', 'available_slots', 'authorization_status', 'passport_count']
            : role === 'finance_admin'
            ? ['agent_client', 'head_of_file', 'date_of_request', 'available_slots']
            : ['agent_client', 'head_of_file', 'date_of_request', 'available_slots']
        }
        onRowClick={handleRowClick}
      />

      {drawerBooking && (
        <div className="fixed inset-0 bg-black/20 z-30" onClick={closeDrawer} />
      )}

      {drawerBooking && (
        <div className="fixed inset-y-0 right-0 w-[460px] bg-white dark:bg-gray-800 shadow-xl z-40 flex flex-col"
             style={{ animation: 'slideInRight 0.2s ease-out' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                {drawerBooking.booking_name || 'Booking Details'}
              </h2>
              {drawerBooking.booking_ref && (
                <p className="text-xs text-gray-400 mt-0.5">Ref: {drawerBooking.booking_ref}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activeTab === 'confirmed' && (
                <button
                  onClick={() => navigate(`/bookings/${drawerBooking.id}/client`)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Full Details →
                </button>
              )}
              <button onClick={closeDrawer} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none ml-1">×</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 flex-shrink-0 px-5">
            <button
              onClick={() => setActiveDrawerTab('timeline')}
              className={`py-2.5 px-1 mr-5 text-xs font-medium border-b-2 transition-colors ${
                activeDrawerTab === 'timeline'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => {
                setActiveDrawerTab('details');
                if (!drawerDetails && !drawerLoading) fetchDrawerDetails(drawerBooking.id);
              }}
              className={`py-2.5 px-1 text-xs font-medium border-b-2 transition-colors ${
                activeDrawerTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Voucher & Passports
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeDrawerTab === 'timeline' && (
              <BookingTimeline bookingId={drawerBooking.id} />
            )}

            {activeDrawerTab === 'details' && (
              <>
                {drawerLoading && (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="ml-2 text-xs text-gray-500">Loading…</span>
                  </div>
                )}
                {drawerError && !drawerLoading && (
                  <p className="text-xs text-red-500 py-4">Error: {drawerError}</p>
                )}
                {drawerDetails && !drawerLoading && (
                  <div className="space-y-6">
                    <section>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Voucher Details
                      </h3>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        {[
                          ['Booking Ref', drawerDetails.booking_ref],
                          ['Product', drawerDetails.product],
                          ['Site', drawerDetails.site],
                          ['Trek Date', drawerDetails.date ? new Date(drawerDetails.date).toLocaleDateString() : '-'],
                          ['Request Date', drawerDetails.date_of_request ? new Date(drawerDetails.date_of_request).toLocaleDateString() : '-'],
                          ['Head of File', drawerDetails.head_of_file || '-'],
                          ['Agent / Client', drawerDetails.agent_client || '-'],
                          ['People', drawerDetails.number_of_people],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
                            <p className="text-sm text-gray-900 dark:text-white mt-0.5">{value || '-'}</p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Passports ({drawerDetails.passports.length})
                      </h3>
                      {drawerDetails.passports.length === 0 ? (
                        <p className="text-xs text-gray-400">No passport records found.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                {['Name', 'Passport No.', 'DOB', 'Expiry', 'Nationality'].map(h => (
                                  <th key={h} className="text-left py-1.5 px-2 text-gray-400 uppercase tracking-wider font-medium">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {drawerDetails.passports.map((p, i) => (
                                <tr key={i}>
                                  <td className="py-1.5 px-2 text-gray-900 dark:text-white">{p.full_name}</td>
                                  <td className="py-1.5 px-2 font-mono text-gray-700 dark:text-gray-300">{p.passport_number}</td>
                                  <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{p.date_of_birth}</td>
                                  <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{p.passport_expiry}</td>
                                  <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{p.nationality || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Authorization request message */}
      {authMessage && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 shadow-lg rounded-lg px-4 py-3 text-sm text-gray-800 z-50 max-w-sm">
          {authMessage}
          <button onClick={() => setAuthMessage('')} className="ml-3 text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {/* Proof upload modal */}
      {uploadModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Upload Proof Documents</h2>
            <p className="text-xs text-gray-500 mb-4">Booking: <strong>{uploadModal.bookingName}</strong></p>

            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => document.getElementById('proof-upload-input').click()}
            >
              <svg className="mx-auto h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400">Click to select files</p>
              <p className="text-xs text-gray-400 mt-1">PDF, JPEG, PNG, TIFF, EML — multiple files allowed</p>
              <input
                id="proof-upload-input"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.eml"
                className="hidden"
                onChange={e => setUploadFiles(Array.from(e.target.files))}
              />
            </div>

            {uploadFiles.length > 0 && (
              <ul className="mt-3 space-y-1">
                {uploadFiles.map((f, i) => (
                  <li key={i} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded">
                    <span className="truncate">{f.name}</span>
                    <span className="text-gray-400 ml-2 flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                  </li>
                ))}
              </ul>
            )}

            {uploadMessage && (
              <p className={`mt-3 text-xs font-medium ${uploadMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {uploadMessage}
              </p>
            )}

            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setUploadModal(null)} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200">
                Cancel
              </button>
              <button
                onClick={handleUploadProof}
                disabled={uploading || uploadFiles.length === 0}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : `Upload ${uploadFiles.length > 0 ? `(${uploadFiles.length})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appeal modal (user) */}
      {appealModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Submit Appeal</h2>
            <p className="text-xs text-gray-500 mb-4">Booking: <strong>{appealModal.bookingName}</strong></p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Appeal reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={appealNotes}
              onChange={e => setAppealNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
              placeholder="Explain why the authorization should be reconsidered…"
            />
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Supporting documents <span className="text-xs text-gray-400">(optional — PDF, JPEG, PNG)</span>
              </label>
              <div
                className="border border-dashed border-gray-300 dark:border-gray-600 rounded-md px-4 py-3 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => document.getElementById('appeal-upload-input').click()}
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">Click to select files</p>
                <input
                  id="appeal-upload-input"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.eml"
                  className="hidden"
                  onChange={e => setAppealFiles(Array.from(e.target.files))}
                />
              </div>
              {appealFiles.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {appealFiles.map((f, i) => (
                    <li key={i} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded">
                      <span className="truncate">{f.name}</span>
                      <button onClick={() => setAppealFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 ml-2 hover:text-red-600">×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setAppealModal(null); setAppealNotes(''); setAppealFiles([]); }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAppeal}
                disabled={appealSubmitting || !appealNotes.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {appealSubmitting ? 'Submitting…' : `Submit Appeal${appealFiles.length > 0 ? ` (+${appealFiles.length} file${appealFiles.length > 1 ? 's' : ''})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request details modal */}
      {detailsModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Request Details</h2>
            <p className="text-xs text-gray-500 mb-4">Booking: <strong>{detailsModal.bookingName}</strong></p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message to user / finance <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={detailsMessage}
              onChange={e => setDetailsMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
              placeholder="Describe what additional information or documents are needed…"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setDetailsModal(null); setDetailsMessage(''); }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestDetails}
                disabled={detailsSubmitting || !detailsMessage.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {detailsSubmitting ? 'Sending…' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Amendment request modal */}
      {amendModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Request Amendment</h2>
            <p className="text-xs text-gray-500 mb-4">Booking: <strong>{amendModal.bookingName}</strong></p>
            <p className="text-xs text-orange-600 bg-orange-50 rounded p-2 mb-4">
              Same-year amendments: 20% fee. Next-year amendments: 100% fee. Fees must be paid before amendment is confirmed.
            </p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Trek Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={amendDate}
              onChange={e => setAmendDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white mb-3"
            />
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={amendReason}
              onChange={e => setAmendReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
              placeholder="Reason for date change…"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setAmendModal(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAmendmentRequest}
                disabled={amendSubmitting || !amendDate || !amendReason.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {amendSubmitting ? 'Submitting…' : 'Submit Amendment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation request modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Cancel Booking</h2>
            <p className="text-xs text-gray-500 mb-4">Booking: <strong>{cancelModal.bookingName}</strong></p>
            <p className="text-xs text-red-600 bg-red-50 rounded p-2 mb-4">
              Cancellations are non-refundable. This action cannot be undone once confirmed by an admin.
            </p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason for cancellation <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
              placeholder="Explain why this booking needs to be cancelled…"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setCancelModal(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancellationRequest}
                disabled={cancelSubmitting || !cancelReason.trim()}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {cancelSubmitting ? 'Submitting…' : 'Request Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Authorization request modal */}
      {authModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Request Authorization</h2>
            <p className="text-xs text-gray-500 mb-4">Booking: <strong>{authModal.bookingName}</strong></p>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              value={authReason}
              onChange={e => setAuthReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
              placeholder="e.g. Passport incomplete 45 days before trek, payment overdue…"
            />
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Supporting Documents <span className="text-xs text-gray-400">(optional)</span>
              </label>
              <div
                className="border border-dashed border-gray-300 dark:border-gray-600 rounded-md px-4 py-3 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => document.getElementById('auth-upload-input').click()}
              >
                <p className="text-sm text-gray-500 dark:text-gray-400">Click to add files</p>
                <p className="text-xs text-gray-400 mt-0.5">PDF, JPEG, PNG, TIFF, EML — select multiple at once or click again to add more</p>
                <input
                  id="auth-upload-input"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.eml"
                  className="hidden"
                  onChange={e => setAuthFiles(prev => [...prev, ...Array.from(e.target.files)])}
                />
              </div>
              {authFiles.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {authFiles.map((f, i) => (
                    <li key={i} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded">
                      <span className="truncate">{f.name}</span>
                      <span className="text-gray-400 ml-2 flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                      <button
                        onClick={e => { e.stopPropagation(); setAuthFiles(prev => prev.filter((_, idx) => idx !== i)); }}
                        className="text-red-400 ml-2 hover:text-red-600 flex-shrink-0"
                      >×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setAuthModal(null); setAuthReason(''); setAuthFiles([]); }}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestAuthorization}
                disabled={authSubmitting || !authReason.trim()}
                className="px-4 py-2 text-sm text-white bg-orange-600 rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                {authSubmitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;