import React, { createContext, useContext, useState, useEffect } from 'react';

const PassportContext = createContext(null);

const initialState = {
  status: 'idle',
  currentField: '',
  progress: {}
};

export const PassportProvider = ({ children }) => {
  const [passportDataList, setPassportDataList] = useState([]);
  const [extractionStatus, setExtractionStatus] = useState(initialState);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load data from sessionStorage on mount
  useEffect(() => {
    try {
      const storedData = sessionStorage.getItem('passportData');
      if (storedData) {
        const { dataList, status } = JSON.parse(storedData);
        setPassportDataList(dataList || []);
        setExtractionStatus(status || initialState);
      }
    } catch (error) {
      console.error('Error loading passport data:', error);
      // Reset to initial state if there's an error
      setPassportDataList([]);
      setExtractionStatus(initialState);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save to sessionStorage when data changes
  useEffect(() => {
    if (!isInitialized) return;

    try {
      if (passportDataList.length > 0 || extractionStatus.status !== 'idle') {
        sessionStorage.setItem('passportData', JSON.stringify({
          dataList: passportDataList,
          status: extractionStatus
        }));
      } else {
        sessionStorage.removeItem('passportData');
      }
    } catch (error) {
      console.error('Error saving passport data:', error);
    }
  }, [passportDataList, extractionStatus, isInitialized]);

  const clearPassportData = () => {
    try {
      setPassportDataList([]);
      setExtractionStatus(initialState);
      sessionStorage.removeItem('passportData');
    } catch (error) {
      console.error('Error clearing passport data:', error);
    }
  };

  const updatePassportData = (newDataList, newStatus) => {
    try {
      setPassportDataList(Array.isArray(newDataList) ? newDataList : []);
      setExtractionStatus(newStatus || initialState);
    } catch (error) {
      console.error('Error updating passport data:', error);
      // Keep the current state if there's an error
    }
  };

  // Don't render children until we've initialized
  if (!isInitialized) {
    return null; // Or a loading spinner if you prefer
  }

  const value = {
    passportDataList,
    extractionStatus,
    clearPassportData,
    updatePassportData
  };

  return (
    <PassportContext.Provider value={value}>
      {children}
    </PassportContext.Provider>
  );
};

export const usePassport = () => {
  const context = useContext(PassportContext);
  if (context === null) {
    throw new Error('usePassport must be used within a PassportProvider');
  }
  return context;
}; 