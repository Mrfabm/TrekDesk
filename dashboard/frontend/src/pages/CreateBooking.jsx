import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

// Style constants
const inputStyles = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm";
const dateInputStyles = "w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-sm";
const selectInputStyles = "w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-sm appearance-none bg-no-repeat bg-right pr-8";

const CreateBooking = () => {
  const navigate = useNavigate();
  const [bookingStep, setBookingStep] = useState(1);
  const [formData, setFormData] = useState({
    date: null,
    site: '',
    product: '',
    bookingName: '',
    numberOfPeople: '',
  });
  const [availableSlots, setAvailableSlots] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isHovering, setIsHovering] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  const sites = [
    { id: 1, name: 'Volcanoes National Park' },
    { id: 2, name: 'Nyungwe Forest National Park' }
  ];

  const productOptions = {
    'Volcanoes National Park': [
      { name: 'Mountain gorillas', price: 1500 },
      { name: 'Golden Monkeys', price: 100 },
      { name: 'Bisoke', price: 75 },
      { name: 'Buhanga Eco-park', price: 50 },
      { name: 'Buhanga Eco-park(1 day picnic including Camping)', price: 100 },
      { name: 'Dian Fossey Tomb', price: 75 },
      { name: 'Gahinga', price: 75 },
      { name: 'Muhabura', price: 75 },
      { name: 'Muhabura-Gahinga', price: 100 },
      { name: 'Nature walk', price: 50 },
      { name: 'Sabyinyo Volcano Climbing', price: 75 },
      { name: 'Hiking on a chain of volcanoes', price: 100 }
    ],
    'Nyungwe Forest National Park': [
      { name: 'Bird Walk - Nyungwe Forest', price: 40 },
      { name: 'Canopy Walk', price: 40 },
      { name: 'Canopy Walk Exclusive', price: 1600 },
      { name: 'Chimps Trek', price: 150 },
      { name: 'Chimps Trek Exclusive', price: 2000 },
      { name: 'Colubus / Mangabey Monkey', price: 40 },
      { name: 'Colubus / Mangabey Monkey Exclusive', price: 1600 },
      { name: 'Entry fee 1st Night', price: 100 },
      { name: 'Entry fee Extra Night', price: 50 },
      { name: 'Nature Trails (Nyungwe National Park)', price: 40 },
      { name: 'Nature Walk 0-5km', price: 40 },
      { name: 'Porter', price: 15 },
      { name: 'Waterfall- Kamiranzovu', price: 40 },
      { name: 'Waterfall- Ndambarare', price: 40 }
    ]
  };

  // Add state for available products
  const [availableProducts, setAvailableProducts] = useState([]);

  // Effect to update available products when site changes
  useEffect(() => {
    if (formData.site) {
      setAvailableProducts(productOptions[formData.site] || []);
    }
  }, [formData.site]);

  // Check for edit mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    
    if (mode === 'edit') {
      const editingBookingData = JSON.parse(localStorage.getItem('editingBooking'));
      if (editingBookingData) {
        setIsEditMode(true);
        setEditingBooking(editingBookingData);
        // Pre-fill form data
        setFormData({
          bookingName: editingBookingData.booking_name,
          numberOfPeople: editingBookingData.number_of_people,
          date: new Date(editingBookingData.date),
          site: editingBookingData.site,
          product: editingBookingData.product,
          customerEmail: editingBookingData.customer_email || '',
          customerPhone: editingBookingData.customer_phone || '',
          passportNumbers: editingBookingData.passport_numbers || [''],
          specialRequirements: editingBookingData.special_requirements || ''
        });
        setAvailableSlots(editingBookingData.available_slots);
      }
    }
  }, []);

  const handleInputChange = async (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if ((field === 'date' || field === 'site' || field === 'product') &&
        formData.site && formData.product && formData.date) {
      try {
        const date = field === 'date' ? value : formData.date;
        const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

        // Determine slot type based on product
        const slotType = formData.product.toLowerCase().includes('monkey') ? 'monkey' : 'gorilla';
        
        const response = await fetch(`http://localhost:8000/api/available-slots?date=${formattedDate}&slot_type=${slotType}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const slotData = data.slots.find(slot => slot.date === formattedDate);
          if (slotData) {
            const slots = slotData.slots === 'Sold Out' ? 0 : parseInt(slotData.slots);
            setAvailableSlots(slots);
          }
        }
      } catch (error) {
        console.error('Error fetching slots:', error);
        setError('Failed to fetch available slots');
      }
    }
  };

  const handlePassportChange = (index, value) => {
    const newPassports = [...formData.passportNumbers];
    newPassports[index] = value;
    setFormData(prev => ({
      ...prev,
      passportNumbers: newPassports
    }));
  };

  const addPassportField = () => {
    setFormData(prev => ({
      ...prev,
      passportNumbers: [...prev.passportNumbers, '']
    }));
  };

  const removePassportField = (index) => {
    setFormData(prev => ({
      ...prev,
      passportNumbers: prev.passportNumbers.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated. Please log in again.');
        navigate('/login');
        return;
      }

      const bookingData = {
        date: formData.date.toISOString().split('T')[0],
        site: formData.site,
        product: formData.product,
        booking_name: formData.bookingName,
        number_of_people: parseInt(formData.numberOfPeople),
        status: 'provisional'
      };

      const url = isEditMode 
        ? `http://localhost:8000/api/bookings/${editingBooking.id}`
        : 'http://localhost:8000/api/bookings';

      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bookingData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save booking');
      }

      setSuccess(isEditMode ? 'Booking updated successfully!' : 'Provisional hold created successfully!');
      setTimeout(() => {
        navigate('/bookings');
      }, 2000);
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to save booking');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Initial slot selection
  const StepOne = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 relative">
      <div className="flex justify-between items-center mb-3 border-b pb-2 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Book Your Slot
        </h2>
      </div>
      
      <div className="flex gap-6">
        {/* Left Column - Form Fields */}
        <div className="w-1/2 space-y-3">
          {/* Date Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Date of Service
            </label>
            <DatePicker
              selected={formData.date}
              onChange={(date) => handleInputChange('date', date)}
              dateFormat="yyyy-MM-dd"
              minDate={new Date()}
              className={dateInputStyles}
              placeholderText="Select date"
            />
          </div>

          {/* Site Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Site
            </label>
            <select
              value={formData.site}
              onChange={(e) => handleInputChange('site', e.target.value)}
              className={selectInputStyles}
            >
              <option value="">Select site</option>
              {sites.map(site => (
                <option key={site.id} value={site.name}>{site.name}</option>
              ))}
            </select>
          </div>

          {/* Product Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Product
            </label>
            <select
              value={formData.product}
              onChange={(e) => handleInputChange('product', e.target.value)}
              disabled={!formData.site}
              className={selectInputStyles}
            >
              <option value="">Select product</option>
              {availableProducts.map(product => (
                <option key={product.name} value={product.name}>
                  {product.name} (${product.price})
                </option>
              ))}
            </select>
          </div>

          {/* Action Button */}
          {formData.date && formData.site && formData.product && availableSlots > 0 && (
            <div className="pt-4">
              <button
                onClick={() => {
                  setSelectedSlot({
                    date: formData.date,
                    site: formData.site,
                    product: formData.product,
                    availableSlots
                  });
                  setBookingStep(2);
                }}
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 font-medium text-sm"
              >
                Continue to Details
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Slots Display */}
        <div className="w-1/2">
          {formData.date && formData.site && formData.product ? (
            <div className="space-y-3">
              {/* Slots Display */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Available Slots
                    </p>
                    <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {availableSlots}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                    <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Warning Message */}
              {availableSlots <= 10 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-100 dark:border-red-900/50">
                  <div className="flex items-center space-x-2">
                    <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                      Limited slots available
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
              Fill in all fields to check availability
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Step 2: Booking Details
  const StepTwo = () => (
    <div className="space-y-4">
      {/* Selected Slot Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Selected Slot</p>
            <div className="mt-1 space-y-1">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">Date:</span> {selectedSlot?.date.toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">Site:</span> {selectedSlot?.site}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">Product:</span> {selectedSlot?.product}
              </p>
            </div>
          </div>
          <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
            <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>
      </div>

      {/* Booking Details Form - Fixed Input Fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Booking Name
        </label>
        <input
          type="text"
          value={formData.bookingName}
          onChange={(e) => handleInputChange('bookingName', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
          placeholder="Enter booking name"
          autoComplete="off"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Number of People
        </label>
        <input
          type="number"
          min="1"
          max={availableSlots}
          value={formData.numberOfPeople}
          onChange={(e) => handleInputChange('numberOfPeople', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
          placeholder="Enter number of people"
          autoComplete="off"
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Maximum available: {availableSlots} slots
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6">
        <button
          onClick={() => setBookingStep(1)}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={!formData.bookingName || !formData.numberOfPeople}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Confirm Hold
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}
    </div>
  );

  // Add BookingSummary component
  const BookingSummary = ({ booking, availableSlots }) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              Name
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              Location
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              Date
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              Slots
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              Status
            </th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              Booked on
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-gray-200 dark:border-gray-700">
            <td className="px-3 py-2 text-xs text-gray-900 dark:text-white whitespace-nowrap">
              {`${booking.bookingName} × ${booking.numberOfPeople}`}
            </td>
            <td className="px-3 py-2 text-xs text-gray-900 dark:text-white whitespace-nowrap">
              {booking.product}
            </td>
            <td className="px-3 py-2 text-xs text-gray-900 dark:text-white whitespace-nowrap">
              {booking.date?.toLocaleDateString()}
            </td>
            <td className="px-3 py-2 text-xs text-gray-900 dark:text-white whitespace-nowrap">
              {availableSlots}
            </td>
            <td className="px-3 py-2 whitespace-nowrap">
              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Provisional
              </span>
            </td>
            <td className="px-3 py-2 text-xs text-gray-900 dark:text-white whitespace-nowrap">
              {new Date().toLocaleDateString()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded-md">
          <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-4 rounded-md">
          <p className="text-sm text-green-700 dark:text-green-200">{success}</p>
        </div>
      )}

      {/* Booking Form and Summary Panels */}
      <div className="flex gap-6">
        {/* Left Panel - Booking Form */}
        <div className="w-1/2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            {bookingStep === 1 ? <StepOne /> : <StepTwo />}
          </div>
        </div>

        {/* Right Panel - Summary */}
        <div className="w-1/2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            {formData.bookingName && (
              <BookingSummary 
                booking={formData}
                availableSlots={availableSlots}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateBooking; 