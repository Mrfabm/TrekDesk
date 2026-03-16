import React, { useState } from 'react';
import PassportUploader from '../components/PassportReader/PassportUploader';
import PassportForm from '../components/PassportReader/PassportForm';
import { usePassport } from '../context/PassportContext';

const PassportManagement = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { passportDataList, extractionStatus, clearPassportData, updatePassportData } = usePassport();

  const handleUploadComplete = (uploadedFiles) => {
    console.log('Upload complete:', uploadedFiles);
    setError('');
    setSuccess('Files uploaded successfully. Extracting data...');
  };

  const handleExtract = (extractedDataList) => {
    const processedPassports = extractedDataList.map(item => ({
      ...item.extractedData,
      status: item.status,
      missingFields: item.missingFields || [],
      error: item.error
    }));

    console.log('Processed passports:', processedPassports);
    updatePassportData(processedPassports, {
      status: 'complete',
      currentField: processedPassports.every(p => p.status === 'complete' && p.missingFields.length === 0)
        ? 'All passports extracted successfully!'
        : 'Some passports need attention',
      progress: processedPassports.reduce((acc, p, idx) => ({
        ...acc,
        [`passport_${idx}`]: p.status
      }), {})
    });

    // Show appropriate message
    const passportsWithIssues = processedPassports.filter(p => p.missingFields.length > 0 || p.error);
    if (passportsWithIssues.length > 0) {
      setError(`Some passports require attention. Please check the details and fill in any missing information.`);
    } else {
      setSuccess(`Successfully extracted data from ${processedPassports.length} passport(s)`);
    }
  };

  const handleFormSubmit = async (data, index) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/passport/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Failed to save passport data');
      }

      const result = await response.json();
      setSuccess('Passport data saved successfully');
      
      // Update the status of the saved passport in the list
      const updatedPassports = [...passportDataList];
      updatedPassports[index] = {
        ...updatedPassports[index],
        ...data,
        status: 'complete',
        missingFields: []
      };
      updatePassportData(updatedPassports, extractionStatus);
      
    } catch (error) {
      setError('Error saving passport data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto py-4 sm:px-4">
        <div className="px-2 py-3">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-lg font-medium text-gray-900 dark:text-white">
              Passport Management
            </h1>
            {passportDataList.length > 0 && (
              <button
                onClick={clearPassportData}
                className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 border border-gray-300 dark:border-gray-600 rounded hover:border-red-300 dark:hover:border-red-500 transition-colors"
              >
                Clear Data
              </button>
            )}
          </div>

          {error && (
            <div className="mb-2 bg-red-50 dark:bg-red-900/50 border-l-2 border-red-500 text-red-700 dark:text-red-200 p-2 text-xs">
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-2 bg-green-50 dark:bg-green-900/50 border-l-2 border-green-500 text-green-700 dark:text-green-200 p-2 text-xs">
              <p>{success}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Left side - Upload Section */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-md p-3">
              <h2 className="text-sm font-medium mb-2 dark:text-white">
                Upload Passport Documents
              </h2>
              <PassportUploader
                onUpload={handleUploadComplete}
                onExtract={handleExtract}
              />
            </div>

            {/* Right side - Passport Information */}
            <div className="bg-white dark:bg-gray-800 shadow-sm rounded-md p-3">
              <h2 className="text-sm font-medium mb-2 dark:text-white">
                Passport Information
              </h2>

              {/* Extraction Status */}
              {extractionStatus.status !== 'idle' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {extractionStatus.currentField}
                    </span>
                    {extractionStatus.status === 'extracting' && (
                      <div className="animate-pulse flex space-x-1">
                        <div className="h-1 w-1 bg-blue-500 rounded-full"></div>
                        <div className="h-1 w-1 bg-blue-500 rounded-full"></div>
                        <div className="h-1 w-1 bg-blue-500 rounded-full"></div>
                      </div>
                    )}
                  </div>

                  {/* Multiple Passports Display */}
                  {passportDataList.length > 0 && (
                    <div className="space-y-2">
                      {passportDataList.map((passport, index) => (
                        <div key={index} className="border border-gray-100 dark:border-gray-700 rounded p-2">
                          <div className="flex justify-between items-center mb-1">
                            <h3 className="text-xs font-medium dark:text-white">
                              Passport {index + 1}
                              {passport.status === 'complete' && (
                                <span className="ml-1 text-green-500">✓</span>
                              )}
                            </h3>
                            {passport.missingFields?.length > 0 && (
                              <span className="text-[10px] text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-1.5 py-0.5 rounded">
                                Needs attention
                              </span>
                            )}
                          </div>

                          {/* Passport Form with Initial Data */}
                          <PassportForm
                            key={`${passport.passport_number}_${index}`}
                            initialData={passport}
                            onSubmit={(data) => handleFormSubmit(data, index)}
                            isLoading={isLoading}
                          />

                          {/* Missing Fields Warning */}
                          {passport.missingFields?.length > 0 && (
                            <div className="mt-2 text-[10px] text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-1.5 rounded">
                              <p>Fields requiring attention:</p>
                              <ul className="list-disc list-inside mt-0.5">
                                {passport.missingFields.map(field => (
                                  <li key={field}>{field}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {passportDataList.length === 0 && extractionStatus.status === 'idle' && (
                <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-2">
                  No passport data available. Upload documents to get started.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PassportManagement; 