import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const AvailableSlots = () => {
    // Set default start date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);  // Set to start of day
    
    const [startDate, setStartDate] = useState(tomorrow);
    const [endDate, setEndDate] = useState(() => {
        // Set initial end date to 30 days after start date
        const defaultEnd = new Date(tomorrow);
        defaultEnd.setDate(defaultEnd.getDate() + 30);
        return defaultEnd;
    });
    const [selectedProduct, setSelectedProduct] = useState('gorilla');
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(false);

    // Update end date whenever start date changes
    const handleStartDateChange = (date) => {
        setStartDate(date);
        // Set end date to 30 days after selected start date
        const newEndDate = new Date(date);
        newEndDate.setDate(newEndDate.getDate() + 30);
        setEndDate(newEndDate);
    };

    // Handle end date changes separately
    const handleEndDateChange = (date) => {
        // Only update if the selected end date is after start date
        if (date >= startDate) {
            setEndDate(date);
        }
    };

    const fetchSlots = async () => {
        try {
            setLoading(true);
            const formattedStartDate = startDate.toLocaleDateString('en-GB');
            const formattedEndDate = endDate.toLocaleDateString('en-GB');

            const response = await fetch(
                `http://localhost:8000/api/available-slots?start_date=${formattedStartDate}&end_date=${formattedEndDate}&slot_type=${selectedProduct}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                setSlots(data.slots);
            } else {
                console.error('Failed to fetch slots');
            }
        } catch (error) {
            console.error('Error fetching slots:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSlots();
    }, [startDate, endDate, selectedProduct]);

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header and Filters in a sticky container */}
            <div className="sticky top-0 bg-gray-100 pt-4 pb-2 z-10">
                <div className="bg-white rounded-lg shadow-sm mb-4">
                    <div className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:space-x-6">
                            <h1 className="text-2xl font-semibold text-gray-900 mb-4 md:mb-0 md:w-1/4">Slots Available</h1>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                    <DatePicker
                                        selected={startDate}
                                        onChange={handleStartDateChange}
                                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        dateFormat="dd/MM/yyyy"
                                        minDate={tomorrow}
                                        placeholderText="Select start date"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                    <DatePicker
                                        selected={endDate}
                                        onChange={handleEndDateChange}
                                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                        dateFormat="dd/MM/yyyy"
                                        minDate={startDate}
                                        placeholderText="Select end date"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                                    <select
                                        value={selectedProduct}
                                        onChange={e => setSelectedProduct(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="gorilla">Mountain Gorillas</option>
                                        <option value="golden-monkey">Golden Monkeys</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="mt-2">
                {/* Loading State */}
                {loading && (
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="text-center text-gray-500">Loading slots...</div>
                    </div>
                )}

                {/* Results */}
                {!loading && slots.length > 0 && (
                    <div className="bg-white rounded-lg shadow-sm">
                        <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                            <span className="text-sm text-gray-500">
                                Last updated: {slots[0].relative_time || 'Never'}
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available Slots</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {slots.map(slot => (
                                        <tr key={slot.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900">{slot.date}</td>
                                            <td className="px-6 py-3 whitespace-nowrap text-sm">
                                                {slot.slots === "Sold Out" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        Sold Out
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        {slot.slots}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">{slot.relative_time}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* No Results */}
                {!loading && slots.length === 0 && (
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="text-center text-gray-500">No slots found for the selected criteria</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AvailableSlots; 