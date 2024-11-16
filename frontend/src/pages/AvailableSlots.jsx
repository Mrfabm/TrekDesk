import React, { useState, useEffect } from 'react';
import EnhancedTable from '../components/EnhancedTable';

const getRelativeTime = (date) => {
  if (!date) return 'N/A';
  
  const now = new Date();
  const then = new Date(date);
  const diffInSeconds = Math.floor((now - then) / 1000);
  
  if (diffInSeconds < 60) {
    return 'just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }
  
  // If older than a week, show actual date
  return new Date(date).toLocaleString('en-GB');
};

const AvailableSlots = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scrapeStatus, setScrapeStatus] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const checkScrapeStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/available-slots/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const status = await response.json();
        setScrapeStatus(status);
      }
    } catch (error) {
      console.error('Failed to check scrape status:', error);
    }
  };

  const triggerScrape = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      
      console.log('Starting scrape...');
      const response = await fetch('http://localhost:8000/api/available-slots/test-scrape', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to trigger scrape');
      }
      
      // Start polling for updates
      const pollInterval = setInterval(async () => {
        const statusResponse = await fetch('http://localhost:8000/api/available-slots/status', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (statusResponse.ok) {
          const status = await statusResponse.json();
          if (status.status === 'success') {
            clearInterval(pollInterval);
            await fetchSlots();
            setIsUpdating(false);
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            setError(`Scraping failed: ${status.message}`);
            setIsUpdating(false);
          }
        }
      }, 5000); // Poll every 5 seconds
      
      // Stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isUpdating) {
          setError('Scraping timed out');
          setIsUpdating(false);
        }
      }, 300000);
      
    } catch (error) {
      console.error('Error in triggerScrape:', error);
      setError(`Failed to update slots data: ${error.message}`);
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    fetchSlots();
    checkScrapeStatus();
    const interval = setInterval(() => {
      fetchSlots();
      checkScrapeStatus();
    }, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchSlots = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/available-slots', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSlots(data.slots || []);
        setScrapeStatus({
          lastUpdate: data.last_update,
          status: data.status
        });
      }
    } catch (error) {
      console.error('Failed to fetch slots:', error);
      setError('Failed to load available slots data');
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
          return new Date(`${year}-${month}-${day}`).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
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

      {slots.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded">
          <div className="flex justify-between items-center">
            <p className="text-yellow-700 dark:text-yellow-200">
              No slots data available.
              {scrapeStatus && (
                <span className="ml-2 text-sm">
                  Last update: {new Date(scrapeStatus.last_run).toLocaleString()}
                </span>
              )}
            </p>
            <button
              onClick={triggerScrape}
              disabled={isUpdating}
              className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2`}
            >
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating...</span>
                </>
              ) : (
                'Update Now'
              )}
            </button>
          </div>
        </div>
      )}

      {slots.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <EnhancedTable 
            data={slots}
            columns={columns}
          />
        </div>
      )}

      {isUpdating && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Scraping in Progress</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This may take a few minutes...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableSlots; 