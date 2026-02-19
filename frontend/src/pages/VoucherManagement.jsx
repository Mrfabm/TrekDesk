import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { DocumentArrowUpIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const VoucherManagement = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid file (JPG, PNG, or PDF)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setSuccess(null);
      setExtractedData(null);
      setMissingFields([]);

      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        'http://localhost:8000/api/voucher/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        setSuccess('Voucher processed successfully');
        setExtractedData(response.data.extracted_data);
        // Navigate to the booking details if a booking ID is returned
        if (response.data.booking_id) {
          setTimeout(() => {
            navigate(`/bookings/${response.data.booking_id}`);
          }, 2000);
        }
      } else {
        setError('Some required fields could not be extracted');
        setMissingFields(response.data.missing_fields || []);
        setExtractedData(response.data.extracted_data);
      }
    } catch (err) {
      console.error('Error processing voucher:', err);
      setError(err.response?.data?.detail || 'Error processing voucher');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const renderField = (label, value) => (
    <div className="mb-2">
      <span className="font-medium text-gray-700">{label}: </span>
      <span className="text-gray-900">{value || 'Not found'}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Voucher Management
            </h2>
            <p className="text-gray-600">
              Upload a voucher to extract booking information
            </p>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="voucher-upload"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <DocumentArrowUpIcon className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, PNG, or JPG (max. 10MB)
                  </p>
                </div>
                <input
                  id="voucher-upload"
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  disabled={isProcessing}
                />
              </label>
            </div>
          </div>

          {isProcessing && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-indigo-500">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing voucher...
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-6">
              <div className="flex">
                <XCircleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error processing voucher
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                    {missingFields.length > 0 && (
                      <ul className="list-disc pl-5 mt-2">
                        <li>Missing fields: {missingFields.join(', ')}</li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4 mb-6">
              <div className="flex">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    {success}
                  </p>
                </div>
              </div>
            </div>
          )}

          {extractedData && (
            <div className="mt-6 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Extracted Data
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {renderField('Booking Name', extractedData.booking_name)}
                {renderField('Booking Reference', extractedData.booking_ref)}
                {renderField('Invoice Number', extractedData.invoice_no)}
                {renderField('Number of Permits', extractedData.number_of_permits)}
                {renderField('Voucher Number', extractedData.voucher_number)}
                {renderField('Request Date', extractedData.request_date)}
                {renderField('Trek Date', extractedData.trek_date)}
                {renderField('Head of File', extractedData.head_of_file)}
                {renderField('Agent/Client', extractedData.agent_client)}
                {renderField('Product', extractedData.product)}
                {renderField('Number of People', extractedData.people)}
                {renderField('Total Amount', extractedData.total_amount)}
                {renderField('Paid Amount', extractedData.paid_amount)}
                {renderField('Booking Status', extractedData.booking_status)}
                {renderField('Payment Status', extractedData.payment_status)}
                {renderField('Validation Status', extractedData.validation_status)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoucherManagement; 