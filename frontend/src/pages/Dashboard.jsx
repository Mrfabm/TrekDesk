import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import EnhancedTable from '../components/EnhancedTable';

// Add these style constants at the top level
const inputStyles = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm";
const dateInputStyles = "w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-sm";
const selectInputStyles = "w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-sm appearance-none bg-no-repeat bg-right pr-8";

// Add this helper function for date formatting
const formatDate = (date) => {
  return date ? new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit'
  }).format(new Date(date)) : '';
};

// Update the BookingSummary component to receive availableSlots
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
            {booking.location}
          </td>
          <td className="px-3 py-2 text-xs text-gray-900 dark:text-white whitespace-nowrap">
            {formatDate(booking.date)}
          </td>
          <td className="px-3 py-2 text-xs text-gray-900 dark:text-white whitespace-nowrap">
            {availableSlots}
          </td>
          <td className="px-3 py-2 whitespace-nowrap">
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              {booking.status}
            </span>
          </td>
          <td className="px-3 py-2 text-xs text-gray-900 dark:text-white whitespace-nowrap">
            {formatDate(new Date())}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

// Update the LowAvailabilityBookings component
const LowAvailabilityBookings = ({ bookings, onExpand }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const lowAvailabilityBookings = bookings.filter(b => b.available_slots < 40);

  const columns = [
    { key: 'booking_name', label: 'Name' },
    { key: 'location', label: 'Location' },
    { key: 'date', label: 'Date' },
    { 
      key: 'available_slots', 
      label: 'Available Slots',
      render: (value) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          {value} slots
        </span>
      )
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (value) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {value}
        </span>
      )
    }
  ];

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    onExpand(!isExpanded);
  };

  return (
    <div className={`transition-all duration-300 ${
      isExpanded 
        ? 'absolute left-64 right-0 bg-white dark:bg-gray-800 px-4 py-6 overflow-auto' 
        : 'mt-8'
    }`}
    style={{
      top: isExpanded ? '0' : 'auto',
      height: isExpanded ? 'calc(100vh - 120px)' : 'auto',
      zIndex: isExpanded ? '10' : 'auto',
      marginTop: isExpanded ? '120px' : '2rem'
    }}>
      <div className="max-w-7xl mx-auto">
        <button
          onClick={handleToggle}
          className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm px-6 py-4 flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200"
        >
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900">
              <svg 
                className="w-5 h-5 text-yellow-600 dark:text-yellow-300" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            <div className="flex items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Low Availability Bookings
              </h3>
              <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
                {lowAvailabilityBookings.length}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300">
              {isExpanded ? 'Click to collapse' : 'Click to expand'}
            </span>
            <svg 
              className={`h-5 w-5 text-gray-400 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {isExpanded && (
          <div className="mt-4">
            <EnhancedTable 
              data={lowAvailabilityBookings}
              columns={columns}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const AlertCard = ({ icon, title, count, type, isExpanded, onToggle, children }) => {
  return (
    <div className={`transition-all duration-300 ${
      isExpanded 
        ? 'absolute left-64 right-0 bg-white px-4 py-6 overflow-auto' 
        : ''
    }`}
    style={{
      top: isExpanded ? '0' : 'auto',
      height: isExpanded ? 'calc(100vh - 120px)' : 'auto',
      zIndex: isExpanded ? '10' : 'auto',
      marginTop: isExpanded ? '120px' : '0'
    }}>
      <button
        onClick={onToggle}
        className={`w-full bg-white rounded-lg shadow-md px-6 py-4 flex items-center justify-between group hover:bg-gray-50 transition-all duration-200 border border-gray-200 ${
          !isExpanded && 'transform hover:scale-[1.02] hover:shadow-lg'
        }`}
      >
        <div className="flex items-center space-x-4">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
            type === 'warning' ? 'bg-yellow-100 ring-1 ring-yellow-500/50' :
            type === 'danger' ? 'bg-red-100 ring-1 ring-red-500/50' :
            'bg-blue-100 ring-1 ring-blue-500/50'
          }`}>
            {icon}
          </div>
          <div className="flex items-center">
            <h3 className="text-lg font-bold text-gray-800">
              {title}
            </h3>
            {count > 0 && (
              <span className={`ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                type === 'warning' ? 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-500/50' :
                type === 'danger' ? 'bg-red-100 text-red-800 ring-1 ring-red-500/50' :
                'bg-blue-100 text-blue-800 ring-1 ring-blue-500/50'
              }`}>
                {count}
              </span>
            )}
          </div>
        </div>
        {count > 0 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">
              {isExpanded ? 'Click to collapse' : 'Click to view'}
            </span>
            <svg 
              className={`h-5 w-5 text-gray-500 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 bg-white rounded-lg shadow-md border border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
};

const AlertsSection = ({ bookings, onExpandChange }) => {
  const [expandedAlert, setExpandedAlert] = useState(null);

  // Filter logic for different types of bookings
  const lowAvailabilityBookings = bookings.filter(b => b.available_slots < 40);
  
  const topUpDeadlineBookings = bookings.filter(b => {
    if (!b.top_up_deadline) return false;
    const deadline = new Date(b.top_up_deadline);
    const today = new Date();
    const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
    return daysUntilDeadline <= 7 && daysUntilDeadline > 0;
  });
  
  const unpaidConfirmedBookings = bookings.filter(b => 
    b.status === 'confirmed' && (!b.payment_status || b.payment_status === 'unpaid')
  );

  const handleToggle = (alertType) => {
    const newExpandedAlert = expandedAlert === alertType ? null : alertType;
    setExpandedAlert(newExpandedAlert);
    onExpandChange(!!newExpandedAlert);
  };

  return (
    <div className="space-y-4">
      <AlertCard
        icon={
          <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        }
        title="Low Availability Bookings"
        count={lowAvailabilityBookings.length}
        type="warning"
        isExpanded={expandedAlert === 'lowAvailability'}
        onToggle={() => handleToggle('lowAvailability')}
      >
        {/* Low Availability Table */}
        <BookingsTable bookings={lowAvailabilityBookings} />
      </AlertCard>

      <AlertCard
        icon={
          <svg className="w-5 h-5 text-red-600 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        title="Top-up Payment Deadline"
        count={topUpDeadlineBookings.length}
        type="danger"
        isExpanded={expandedAlert === 'topUpDeadline'}
        onToggle={() => handleToggle('topUpDeadline')}
      >
        {/* Top-up Deadline Table */}
        <BookingsTable bookings={topUpDeadlineBookings} />
      </AlertCard>

      <AlertCard
        icon={
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
        }
        title="Unpaid Confirmed Bookings"
        count={unpaidConfirmedBookings.length}
        type="info"
        isExpanded={expandedAlert === 'unpaidConfirmed'}
        onToggle={() => handleToggle('unpaidConfirmed')}
      >
        {/* Unpaid Confirmed Table */}
        <BookingsTable bookings={unpaidConfirmedBookings} />
      </AlertCard>
    </div>
  );
};

// Helper component for displaying booking tables
const BookingsTable = ({ bookings }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-100 border-b border-gray-200">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
            Name
          </th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
            Location
          </th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
            Date
          </th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
            Status
          </th>
          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {bookings.map((booking, index) => (
          <tr key={index} className="hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3 text-sm font-medium text-gray-900">
              {booking.booking_name}
            </td>
            <td className="px-4 py-3 text-sm font-medium text-gray-900">
              {booking.location}
            </td>
            <td className="px-4 py-3 text-sm font-medium text-gray-900">
              {formatDate(booking.date)}
            </td>
            <td className="px-4 py-3">
              <span className="px-2 py-1 inline-flex text-xs font-semibold rounded-full bg-blue-100 text-blue-800 ring-1 ring-blue-500/50">
                {booking.status}
              </span>
            </td>
            <td className="px-4 py-3 text-sm">
              <button className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
                View Details
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// Move StepTwo outside Dashboard component
const StepTwo = ({ formData, handleInputChange, handleProvisionalHold, setBookingStep, selectedSlot, availableSlots, error, success }) => {
  return (
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
          onClick={handleProvisionalHold}
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
};

const Dashboard = () => {
  // All hooks and state declarations at the top level
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState('');
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [formData, setFormData] = useState({
    bookingName: '',
    numberOfPeople: '',
    date: null,
    site: '',
    product: ''
  });
  const [availableSlots, setAvailableSlots] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState('my-bookings');
  const [isHovering, setIsHovering] = useState(false);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [isLowAvailabilityExpanded, setIsLowAvailabilityExpanded] = useState(false);
  const [availableProducts, setAvailableProducts] = useState([]);

  // Constants
  const sites = [
    { id: 1, name: 'Volcanoes National Park' },
    { id: 2, name: 'Nyungwe Forest National Park' }
  ];

  const productOptions = {
    'Volcanoes National Park': [
      "Bisoke",
      "Buhanga Eco-park",
      "Buhanga Eco-park(1 day picnic including Camping)",
      "Dian Fossey Tomb",
      "Gahinga",
      "Golden Monkeys",
      "Mountain gorillas",
      "Muhabura",
      "Muhabura-Gahinga",
      "Nature walk",
      "Sabyinyo Volcano Climbing",
      "Hiking on a chain of volcanoes"
    ],
    'Nyungwe Forest National Park': [
      "Bird Walk - Nyungwe Forest",
      "Canopy Walk",
      "Canopy Walk Exclusive",
      "Chimps Trek",
      "Chimps Trek Exclusive",
      "Colubus / Mangabey Monkey",
      "Colubus / Mangabey Monkey Exclusive",
      "Entry fee 1st Night",
      "Entry fee Extra Night",
      "Nature Trails (Nyungwe National Park)",
      "Nature Walk 0-5km",
      "Waterfall- Kamiranzovu",
      "Waterfall- Ndambarare"
    ]
  };

  // Effect to update available products when site changes
  useEffect(() => {
    if (formData.site) {
      setAvailableProducts(productOptions[formData.site] || []);
    }
  }, [formData.site]);

  // Function to fetch bookings based on active tab
  const fetchBookings = async (tab) => {
    const token = localStorage.getItem('token');
    try {
      let endpoint = 'http://localhost:8000/api/bookings';
      
      switch(tab) {
        case 'my-bookings':
          endpoint += '/my-bookings';
          break;
        case 'all-bookings':
          endpoint += '/all';
          break;
        case 'recent-bookings':
          endpoint += '/recent-bookings';
          break;
        default:
          endpoint += '/my-bookings';
      }

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  // Effects
  useEffect(() => {
    const role = localStorage.getItem('role');
    if (!role) {
      navigate('/login');
      return;
    }
    setUserRole(role);
  }, [navigate]);

  useEffect(() => {
    fetchBookings(activeTab);
  }, [activeTab]);

  // Add effect to check for edit mode
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
          product: editingBookingData.product
        });
        setAvailableSlots(editingBookingData.available_slots);
      }
    }
  }, []);

  // Handlers
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if ((field === 'site' || field === 'product' || field === 'date') &&
        formData.site && formData.product && formData.date) {
      setAvailableSlots(Math.floor(Math.random() * 97));
    }
  };

  // Update handleProvisionalHold to handle both create and edit
  const handleProvisionalHold = async () => {
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
        status: 'provisional',
        available_slots: availableSlots
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

      const data = await response.json();
      setSuccess(isEditMode ? 'Booking updated successfully' : 'Booking confirmed successfully');

      // Clear edit mode data
      if (isEditMode) {
        localStorage.removeItem('editingBooking');
        // Navigate back to bookings page
        navigate('/bookings');
      } else {
        // Reset form for new booking
        setFormData({
          bookingName: '',
          numberOfPeople: '',
          date: null,
          site: '',
          product: ''
        });
        setBookingStep(1);
      }

    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to save booking');
    }
  };

  // If it's a superuser, don't render anything as they'll be redirected
  if (userRole === 'superuser') {
    return null;
  }

  // Step 1: Initial slot selection
  const StepOne = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 relative">
      {/* Header with conditional Confirm button */}
      <div 
        className="flex justify-between items-center mb-3 border-b pb-2 dark:border-gray-700"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Book Your Slot
        </h2>
        {isHovering && availableSlots > 0 && (
          <button
            className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 font-medium text-sm"
          >
            Confirm booking
          </button>
        )}
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
                <option key={product} value={product}>{product}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Column - Updated Slots Display with Clock Icon */}
        <div className="w-1/2">
          {formData.date && formData.site && formData.product ? (
            <div className="space-y-3">
              {/* Updated Slots Display with Clock Icon */}
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

              {/* Warning Message or Action Button */}
              {availableSlots <= 10 ? (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-100 dark:border-red-900/50">
                  <div className="flex items-center space-x-2">
                    <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                      Unfortunately the permits cannot be held
                    </p>
                  </div>
                </div>
              ) : (
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
                  Hold Provisionally
                </button>
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

  // BookingsTable component
  const BookingsTable = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('my-bookings')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'my-bookings'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Bookings
          </button>
          {userRole === 'admin' && (
            <button
              onClick={() => setActiveTab('all-bookings')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'all-bookings'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              All Bookings
            </button>
          )}
          <button
            onClick={() => setActiveTab('recent-bookings')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'recent-bookings'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Recent Bookings
          </button>
        </nav>
      </div>

      {/* Your existing table implementation */}
      <div className="overflow-x-auto">
        {/* Your existing table code */}
      </div>
    </div>
  );

  // Update the button text based on mode
  const buttonText = isEditMode ? "Confirm Changes" : "Confirm Hold";

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
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
      {!isLowAvailabilityExpanded && (
        <div className="flex gap-6">
          {/* Left Panel - Booking Form */}
          <div className="w-1/2">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              {bookingStep === 1 ? <StepOne /> : <StepTwo 
                formData={formData}
                handleInputChange={handleInputChange}
                handleProvisionalHold={handleProvisionalHold}
                setBookingStep={setBookingStep}
                selectedSlot={selectedSlot}
                availableSlots={availableSlots}
                error={error}
                success={success}
              />}
            </div>
          </div>

          {/* Right Panel - Summary */}
          <div className="w-1/2">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
              {formData.bookingName && (
                <BookingSummary 
                  booking={{
                    bookingName: formData.bookingName,
                    numberOfPeople: formData.numberOfPeople,
                    location: formData.product,
                    date: formData.date,
                    status: 'Provisional',
                  }}
                  availableSlots={availableSlots}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Low Availability Bookings section */}
      <LowAvailabilityBookings 
        bookings={bookings} 
        onExpand={setIsLowAvailabilityExpanded}
      />
    </div>
  );
};

export default Dashboard;