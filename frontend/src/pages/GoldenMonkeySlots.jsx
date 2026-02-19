import React, { useState, useEffect, useRef } from 'react';
import EnhancedTable from '../components/EnhancedTable';
import axios from '../utils/axios';

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
  const [lastUpdate, setLastUpdate] = useState(null);
  const pollingRef = useRef(null);
  const pollingTimeoutRef = useRef(null);

  const stopPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
    pollingRef.current = null;
    pollingTimeoutRef.current = null;
  };

  const fetchSlots = async () => {
    try {
      const { data } = await axios.get('/golden-monkey-slots');
      setSlots(data.slots || []);
      setLastUpdate(data.last_update || null);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch slots:', err);
      setError('Failed to load Golden Monkey slots data');
    } finally {
      setLoading(false);
    }
  };

  const triggerScrape = async () => {
    try {
      setIsUpdating(true);
      setError(null);

      await axios.post('/golden-monkey-slots/trigger-scrape');

      // Poll every 5 seconds for up to 5 minutes
      pollingRef.current = setInterval(fetchSlots, 5000);
      pollingTimeoutRef.current = setTimeout(() => {
        stopPolling();
        setIsUpdating(false);
      }, 5 * 60 * 1000);

    } catch (err) {
      console.error('Failed to trigger scrape:', err);
      setError('Failed to start slot update. Please try again.');
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchSlots();
    const interval = setInterval(fetchSlots, 30000);
    return () => {
      clearInterval(interval);
      stopPolling();
    };
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

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span>Total dates: {slots.length}</span>
            {lastUpdate && (
              <span className="ml-4 text-gray-400">Last updated: {lastUpdate}</span>
            )}
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
