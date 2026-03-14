import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Collapsible } from '../components/Collapsible';

// Style constants
const dateInputStyles = "w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-sm";
const selectInputStyles = "w-full h-9 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white shadow-sm appearance-none bg-no-repeat bg-right pr-8";
const inputStyles = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm";

const SITES = [
  { id: 1, name: 'Volcanoes National Park' },
  { id: 2, name: 'Nyungwe Forest National Park' }
];

const PRODUCT_OPTIONS = {
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

const SLOT_PRODUCTS = {
  gorilla: ['Mountain gorillas'],
  monkey: ['Golden Monkeys'],
};

const getSlotType = (product) => {
  if (SLOT_PRODUCTS.gorilla.includes(product)) return 'gorilla';
  if (SLOT_PRODUCTS.monkey.includes(product)) return 'monkey';
  return null;
};

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
  const [bookingType, setBookingType] = useState('provisional');
  const [allBookings, setAllBookings] = useState([]);
  const [agentClientId, setAgentClientId] = useState('');
  const [agentClients, setAgentClients] = useState([]);

  const availableProducts = PRODUCT_OPTIONS[formData.site] || [];

  // Fetch bookings for low availability section + agent/client list
  useEffect(() => {
    const hdrs = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
    fetch('http://localhost:8000/api/bookings', { headers: hdrs })
      .then(r => r.json())
      .then(data => setAllBookings(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch('http://localhost:8000/api/agents', { headers: hdrs })
      .then(r => r.json())
      .then(data => setAgentClients(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const lowAvailabilityBookings = useMemo(() =>
    allBookings.filter(b => {
      const slots = parseInt(b.available_slots);
      return !isNaN(slots) && slots > 0 && slots < 40 && b.payment_status !== 'fully_paid';
    }), [allBookings]);

  // Check for edit mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'edit') {
      const editingBookingData = JSON.parse(localStorage.getItem('editingBooking'));
      if (editingBookingData) {
        setIsEditMode(true);
        setEditingBooking(editingBookingData);
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
    setFormData(prev => ({ ...prev, [field]: value }));

    const currentDate = field === 'date' ? value : formData.date;
    const currentSite = field === 'site' ? value : formData.site;
    const currentProduct = field === 'product' ? value : formData.product;

    if ((field === 'date' || field === 'site' || field === 'product') &&
        currentDate && currentSite && currentProduct) {
      const slotType = getSlotType(currentProduct);
      if (!slotType) { setAvailableSlots(null); return; }

      try {
        const formattedDate = `${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;
        const response = await fetch(
          `http://localhost:8000/api/available-slots?date=${formattedDate}&slot_type=${slotType}`,
          { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
        );
        if (response.ok) {
          const data = await response.json();
          const slotData = data.slots.find(s => s.date === formattedDate);
          setAvailableSlots(slotData ? (slotData.slots === 'Sold Out' ? 0 : parseInt(slotData.slots)) : 0);
        }
      } catch (e) {
        console.error('Error fetching slots:', e);
      }
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) { setError('Not authenticated.'); navigate('/login'); return; }

      const bookingData = {
        date: formData.date.toISOString().split('T')[0],
        site: formData.site,
        product: formData.product,
        booking_name: formData.bookingName,
        number_of_people: parseInt(formData.numberOfPeople),
        status: bookingType,
        available_slots: 0,
        agent_client_id: agentClientId ? parseInt(agentClientId) : null,
      };

      const url = isEditMode
        ? `http://localhost:8000/api/bookings/${editingBooking.id}`
        : 'http://localhost:8000/api/bookings';

      const response = await fetch(url, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(bookingData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save booking');
      }

      setSuccess(
        isEditMode ? 'Booking updated successfully!' :
        bookingType === 'requested' ? 'Booking confirmation request submitted!' :
        'Provisional hold created successfully!'
      );
      setTimeout(() => navigate('/bookings'), 2000);
    } catch (e) {
      setError(e.message || 'Failed to save booking');
    } finally {
      setLoading(false);
    }
  };

  const proceedToStep2 = (type = 'provisional') => {
    setBookingType(type);
    setSelectedSlot({ date: formData.date, site: formData.site, product: formData.product, availableSlots });
    setBookingStep(2);
  };

  const canHold = availableSlots === null || availableSlots >= 10;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Booking Form and Summary Panels */}
      <div className="flex gap-6">

        {/* Left Panel */}
        <div className="w-1/2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">

            {bookingStep === 1 ? (
              /* ── STEP 1 ── */
              <div
                className="bg-white dark:bg-gray-800 rounded-xl relative"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                {/* Header */}
                <div className="flex justify-between items-center mb-3 border-b pb-2 dark:border-gray-700">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Book Your Slot</h2>
                  {isHovering && formData.date && formData.site && formData.product && (
                    <button
                      onClick={() => proceedToStep2('requested')}
                      className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg shadow transition-colors"
                    >
                      Confirm Booking
                    </button>
                  )}
                </div>

                <div className="flex gap-6">
                  {/* Left Column */}
                  <div className="w-1/2 space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Date of Service</label>
                      <DatePicker
                        selected={formData.date}
                        onChange={(date) => handleInputChange('date', date)}
                        dateFormat="yyyy-MM-dd"
                        minDate={new Date()}
                        className={dateInputStyles}
                        placeholderText="Select date"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Site</label>
                      <select value={formData.site} onChange={(e) => handleInputChange('site', e.target.value)} className={selectInputStyles}>
                        <option value="">Select site</option>
                        {SITES.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Product</label>
                      <select
                        value={formData.product}
                        onChange={(e) => handleInputChange('product', e.target.value)}
                        disabled={!formData.site}
                        className={selectInputStyles}
                      >
                        <option value="">Select product</option>
                        {availableProducts.map(p => (
                          <option key={p.name} value={p.name}>{p.name} (${p.price})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Right Column — Slots */}
                  <div className="w-1/2">
                    {formData.date && formData.site && formData.product ? (
                      <div className="space-y-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 text-center">
                              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Available Slots</p>
                              {availableSlots === null ? (
                                <p className="text-lg font-semibold text-gray-400 dark:text-gray-500 mt-1">N/A</p>
                              ) : (
                                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mt-1">{availableSlots}</p>
                              )}
                            </div>
                            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        {canHold ? (
                          <button
                            onClick={() => proceedToStep2('provisional')}
                            className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 font-medium text-sm"
                          >
                            Hold Provisionally
                          </button>
                        ) : (
                          <div className="w-full px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg text-center text-xs text-red-600 dark:text-red-400 font-medium">
                            Cannot hold provisionally — less than 10 slots available
                          </div>
                        )}

                        {availableSlots !== null && availableSlots <= 10 && (
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-100 dark:border-red-900/50">
                            <div className="flex items-center space-x-2">
                              <svg className="h-4 w-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                                {availableSlots === 0 ? 'Sold out for this date' : 'Limited slots available'}
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
            ) : (
              /* ── STEP 2 ── */
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Selected Slot</p>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Date:</span> {selectedSlot?.date.toLocaleDateString()}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Site:</span> {selectedSlot?.site}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-medium">Product:</span> {selectedSlot?.product}</p>
                      </div>
                    </div>
                    <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                      <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Booking Name</label>
                  <input
                    type="text"
                    value={formData.bookingName}
                    onChange={(e) => setFormData(prev => ({ ...prev, bookingName: e.target.value }))}
                    className={inputStyles}
                    placeholder="Enter booking name"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agent / Client</label>
                  <select
                    value={agentClientId}
                    onChange={e => setAgentClientId(e.target.value)}
                    className={inputStyles}
                  >
                    <option value="">— select agent / client (optional) —</option>
                    {agentClients.map(ac => (
                      <option key={ac.id} value={ac.id}>
                        {ac.name} ({ac.type}){ac.is_trusted ? ' ✓ Trusted' : ''}
                      </option>
                    ))}
                  </select>
                  {agentClientId && (() => {
                    const ac = agentClients.find(a => a.id === parseInt(agentClientId));
                    return ac ? (
                      <p className={`mt-1 text-xs font-medium ${ac.is_trusted ? 'text-green-600' : 'text-yellow-600'}`}>
                        {ac.is_trusted ? '✓ Trusted agent/client — authorization bypass eligible' : '⚠ Untrusted — chase system will apply if no payment'}
                      </p>
                    ) : null;
                  })()}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Number of People</label>
                  <input
                    type="number"
                    min="1"
                    max={availableSlots ?? undefined}
                    value={formData.numberOfPeople}
                    onChange={(e) => setFormData(prev => ({ ...prev, numberOfPeople: e.target.value }))}
                    className={inputStyles}
                    placeholder="Enter number of people"
                    autoComplete="off"
                  />
                  {availableSlots !== null && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Maximum available: {availableSlots} slots</p>
                  )}
                </div>

                <div className="flex justify-between pt-6">
                  <button
                    onClick={() => setBookingStep(1)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!formData.bookingName || !formData.numberOfPeople || loading}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                      bookingType === 'requested' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {loading ? 'Submitting…' : bookingType === 'requested' ? 'Confirm Booking' : 'Hold Provisionally'}
                  </button>
                </div>

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
            )}

          </div>
        </div>

        {/* Right Panel — Summary */}
        <div className="w-1/2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            {formData.bookingName && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {['Name', 'Location', 'Date', 'Slots', 'Status', 'Booked on'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-3 py-2 text-xs text-gray-900 dark:text-white whitespace-nowrap">{`${formData.bookingName} × ${formData.numberOfPeople}`}</td>
                      <td className="px-3 py-2 text-xs text-gray-900 dark:text-white whitespace-nowrap">{formData.product}</td>
                      <td className="px-3 py-2 text-xs text-gray-900 dark:text-white whitespace-nowrap">{formData.date?.toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-xs text-gray-900 dark:text-white whitespace-nowrap">{availableSlots ?? 'N/A'}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Provisional
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-900 dark:text-white whitespace-nowrap">{new Date().toLocaleDateString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Low Availability Section */}
      {lowAvailabilityBookings.length > 0 && (
        <div className="mt-6">
          <Collapsible
            title={`Low Availability (${lowAvailabilityBookings.length})`}
            expandUpward={true}
            className="bg-white dark:bg-gray-800 shadow-md border border-red-200 dark:border-red-700 hover:border-red-300 dark:hover:border-red-600 transition-all"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    {['Booking', 'Product', 'Trek Date', 'Status', 'Payment', 'Slots Left'].map(h => (
                      <th key={h} className="text-left py-1.5 px-2 text-gray-400 uppercase tracking-wider font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {lowAvailabilityBookings.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-1.5 px-2 text-gray-900 dark:text-white font-medium">{b.booking_name}</td>
                      <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{b.product}</td>
                      <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400">{b.date ? new Date(b.date).toLocaleDateString() : '-'}</td>
                      <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400 capitalize">{b.status || '-'}</td>
                      <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400 capitalize">{b.payment_status || 'none'}</td>
                      <td className="py-1.5 px-2 font-bold text-red-600">{b.available_slots}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Collapsible>
        </div>
      )}
    </div>
  );
};

export default CreateBooking;
