import React, { useState, useEffect } from 'react';
import EnhancedTable from '../components/EnhancedTable';

const getRelativeTime = (date) => {
  if (!date) return 'N/A';
  const dbTime = new Date(date + 'Z');
  const now = new Date();
  const diffInMinutes = Math.floor((now - dbTime) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  return dbTime.toLocaleString();
};

const GoldenMonkeySlots = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchSlots = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/golden-monkey-slots', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSlots(data.slots || []);
      }
    } catch (error) {
      console.error('Failed to fetch slots:', error);
      setError('Failed to load Golden Monkey slots data');
    } finally {
      setLoading(false);
    }
  };

  const triggerScrape = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      
      const response = await fetch('http://localhost:8000/api/golden-monkey-slots/trigger-scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to trigger scrape');
      }
      
      // Poll for updates
      const interval = setInterval(fetchSlots, 5000);
      setTimeout(() => {
        clearInterval(interval);
        setIsUpdating(false);
      }, 30000);
      
    } catch (error) {
      setError('Failed to update slots data');
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchSlots();
    const interval = setInterval(fetchSlots, 30000);
    return () => clearInterval(interval);
  }, []);

  const columns = [
    {
      key: 'date',
      label: 'Date',
      render: (value) => {
        const [day, month, year] = value.split('/');
        return new Date(`${year}-${month}-${day}`).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
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
      render: (value) => getRelativeTime(value)
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Golden Monkey Slots
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Current availability for Golden Monkey permits
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total dates: {slots.length}
          </div>
          <button
            onClick={triggerScrape}
            disabled={isUpdating}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isUpdating ? 'Updating...' : 'Update Now'}
          </button>
        </div>
        <EnhancedTable 
          data={slots}
          columns={columns}
        />
      </div>
    </div>
  );
};

export default GoldenMonkeySlots; 