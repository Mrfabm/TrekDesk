import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const PaymentValidation = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [bookingDetails, setBookingDetails] = useState(null);
  const [formData, setFormData] = useState({
    amount_received: '',
    validation_status: 'pending',
    validation_notes: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`http://localhost:8000/api/finance/payment-status/${bookingId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setBookingDetails(data);
          // Pre-fill amount received if it exists
          if (data.amount_received) {
            setFormData(prev => ({
              ...prev,
              amount_received: data.amount_received
            }));
          }
        } else {
          const errorData = await response.json();
          setError(errorData.detail || 'Failed to fetch booking details');
        }
      } catch (error) {
        setError('Failed to fetch booking details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId]);

  const getValidationStatusOptions = () => [
    { value: 'ok_to_purchase_full', label: 'OK to Purchase (Full Payment)' },
    { value: 'ok_to_purchase_deposit', label: 'OK to Purchase (Deposit)' },
    { value: 'do_not_purchase', label: 'Do Not Purchase' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Debug log: Form submission
      console.log('=== Payment Validation Form Submission ===');
      console.log('Form data:', {
        booking_id: bookingId,
        amount_received: formData.amount_received,
        validation_status: formData.validation_status,
        validation_notes: formData.validation_notes
      });

      const response = await fetch('http://localhost:8000/api/finance/validate-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          booking_id: parseInt(bookingId),
          amount_received: parseFloat(formData.amount_received),
          validation_status: formData.validation_status,
          validation_notes: formData.validation_notes || ''
        })
      });

      if (response.ok) {
        const data = await response.json();
        // Debug log: Response data
        console.log('=== Validation Response ===');
        console.log('Response data:', data);
        setSuccess('Payment validated successfully');
        setTimeout(() => {
          navigate('/bookings');
        }, 2000);
      } else {
        const errorData = await response.json();
        console.error('Validation failed:', errorData);
        setError(errorData.detail || 'Failed to update payment');
      }
    } catch (error) {
      console.error('Error during validation:', error);
      setError('Failed to update payment');
    }
  };

  // Helper function to determine payment status based on amount received
  const determinePaymentStatus = (amountReceived) => {
    if (!bookingDetails) return 'pending';
    
    const totalAmount = bookingDetails.unit_cost * bookingDetails.number_of_people;
    const received = parseFloat(amountReceived);

    if (received >= totalAmount) return 'fully_paid';
    if (received > 0) return 'deposit_paid';
    return 'pending';
  };

  // Format currency helper
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-700 dark:text-red-200">{error}</p>
          <button
            onClick={() => navigate('/finance')}
            className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!bookingDetails) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded">
          <p className="text-yellow-700 dark:text-yellow-200">No booking details found</p>
          <button
            onClick={() => navigate('/finance')}
            className="mt-4 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const totalAmount = bookingDetails.unit_cost * bookingDetails.number_of_people;
  const balance = totalAmount - (parseFloat(formData.amount_received) || 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 dark:text-white">Payment Validation</h2>

        {/* Booking Details Summary */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4 dark:text-white">Booking Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Booking Name</p>
              <p className="font-medium dark:text-white">{bookingDetails.booking_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Product</p>
              <p className="font-medium dark:text-white">{bookingDetails.product}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Unit Cost</p>
              <p className="font-medium dark:text-white">{formatCurrency(bookingDetails.unit_cost)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Amount</p>
              <p className="font-medium dark:text-white">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount Received
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.amount_received}
              onChange={(e) => setFormData({...formData, amount_received: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Validation Status
            </label>
            <select
              value={formData.validation_status}
              onChange={(e) => setFormData({...formData, validation_status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            >
              {getValidationStatusOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Validation Notes
            </label>
            <textarea
              value={formData.validation_notes}
              onChange={(e) => setFormData({...formData, validation_notes: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="Add any notes about the payment validation..."
            />
          </div>

          {/* Balance Display */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Balance:</span>
              <span className={`text-lg font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(balance)}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4">
              <p className="text-red-700 dark:text-red-200">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4">
              <p className="text-green-700 dark:text-green-200">{success}</p>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/finance')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Validate Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentValidation; 