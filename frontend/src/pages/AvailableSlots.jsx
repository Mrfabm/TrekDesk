import React, { useState, useEffect } from 'react';
import EnhancedTable from '../components/EnhancedTable';

const AvailableSlots = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSlots();
    // Set up polling every 5 minutes
    const interval = setInterval(fetchSlots, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchSlots = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/available-slots', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch slots data');
      }
      
      const data = await response.json();
      console.log('Fetched slots data:', data); // Debug log
      
      const formattedData = data.map(slot => ({
        id: slot.id,
        date: slot.date,
        slots: slot.slots,
        updated_at: slot.updated_at
      }));

      setSlots(formattedData);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch slots:', error);
      setError(error.message || 'Failed to load available slots data');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'date',
      label: 'Date',
      render: (value) => {
        try {
          const [day, month, year] = value.split('/');
          return new Date(`${year}-${month}-${day}`).toLocaleDateString();
        } catch (e) {
          return value;
        }
      }
    },
    {
      key: 'slots',
      label: 'Available Slots',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'Sold Out' 
            ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200' 
            : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200'
        }`}>
          {value}
        </span>
      )
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      render: (value) => value ? new Date(value).toLocaleString() : 'N/A'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded">
          <p className="text-red-700 dark:text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Available Slots
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Current availability for Mountain Gorilla permits
        </p>
      </div>

      {slots.length === 0 ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded">
          <p className="text-yellow-700 dark:text-yellow-200">
            No slots data available. Please run the slot checker script.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <EnhancedTable 
            data={slots}
            columns={columns}
          />
        </div>
      )}
    </div>
  );
};

export default AvailableSlots; 