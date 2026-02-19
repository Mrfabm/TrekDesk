import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaUpload } from 'react-icons/fa';

const PassportManagement2 = () => {
  const [uploadStatus, setUploadStatus] = useState('');
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback(async (acceptedFiles) => {
    setIsProcessing(true);
    setError('');
    setExtractedData(null);
    setUploadStatus('Preparing file upload...');

    try {
      // Get auth token
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Upload file
      const formData = new FormData();
      acceptedFiles.forEach(file => {
        formData.append('files', file);
      });

      setUploadStatus('Uploading file...');
      const uploadResponse = await fetch('http://localhost:8000/api/voucher/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`);
      }

      const uploadData = await uploadResponse.json();
      console.log('Upload response:', uploadData);

      // Check if any files were uploaded successfully
      const successfulUploads = uploadData.filter(file => file.status === 'success');
      if (successfulUploads.length === 0) {
        throw new Error('No files were uploaded successfully');
      }

      // Extract data from the first successful upload
      setUploadStatus('Extracting data from voucher...');
      const extractResponse = await fetch('http://localhost:8000/api/voucher/extract', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          file_paths: successfulUploads.map(file => file.path)
        })
      });

      if (!extractResponse.ok) {
        throw new Error(`Data extraction failed: ${extractResponse.statusText}`);
      }

      const extractData = await extractResponse.json();
      console.log('Extracted data:', extractData);

      // Get the first successful extraction result
      const firstFilePath = successfulUploads[0].path;
      const extractResult = extractData[firstFilePath];

      if (extractResult.status === 'success') {
        setExtractedData(extractResult.data);
        setUploadStatus('Data extracted successfully');
      } else if (extractResult.status === 'incomplete') {
        const missingFields = extractResult.missing_fields.join(', ');
        throw new Error(`Incomplete data extraction. Missing fields: ${missingFields}`);
      } else {
        throw new Error(extractResult.error || 'Failed to extract data from voucher');
      }

    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
      setUploadStatus('');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    multiple: false
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Voucher Upload</h1>
      
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-500'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} disabled={isProcessing} />
        <FaUpload className="mx-auto text-4xl mb-4 text-gray-400" />
        {isProcessing ? (
          <div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600">{uploadStatus}</p>
            <p className="text-sm text-gray-500 mt-2">Please wait...</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-600">Drag and drop a voucher file here, or click to select</p>
            <p className="text-sm text-gray-500 mt-2">Supports PDF, JPG, and PNG files</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {extractedData && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Extracted Data</h2>
          <div className="grid grid-cols-2 gap-4 bg-white p-6 rounded-lg shadow">
            <div>
              <p className="font-medium text-gray-600">Booking Name</p>
              <p className="text-gray-800">{extractedData.booking_name}</p>
            </div>
            <div>
              <p className="font-medium text-gray-600">Booking Reference</p>
              <p className="text-gray-800">{extractedData.booking_reference}</p>
            </div>
            <div>
              <p className="font-medium text-gray-600">Trek Date</p>
              <p className="text-gray-800">{extractedData.trek_date}</p>
            </div>
            <div>
              <p className="font-medium text-gray-600">Head of File</p>
              <p className="text-gray-800">{extractedData.head_of_file}</p>
            </div>
            <div>
              <p className="font-medium text-gray-600">Request Date</p>
              <p className="text-gray-800">{extractedData.request_date}</p>
            </div>
            <div>
              <p className="font-medium text-gray-600">Agent/Client</p>
              <p className="text-gray-800">{extractedData.agent_client}</p>
            </div>
            <div>
              <p className="font-medium text-gray-600">Product Type</p>
              <p className="text-gray-800">{extractedData.product_type}</p>
            </div>
            <div>
              <p className="font-medium text-gray-600">Number of People</p>
              <p className="text-gray-800">{extractedData.number_of_people}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PassportManagement2; 