import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios';
import { toast } from 'react-toastify';

const PassportManagement1 = () => {
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [extractedData, setExtractedData] = useState(null);
    const [missingFields, setMissingFields] = useState([]);

    // Define required fields and their display labels
    const fieldConfig = {
        booking_name: { label: 'Booking Name' },
        booking_ref: { label: 'Booking Reference' },
        trek_date: { label: 'Trekking Date' },
        head_of_file: { 
            label: 'Head of File',
            note: 'From "Booking made by" field'
        },
        request_date: { label: 'Request Date' },
        agent_client: { 
            label: 'Agent/Client',
            note: 'First 3 letters of Booking Reference'
        },
        product: { label: 'Product' },
        number_of_people: { 
            label: 'Number of People',
            note: 'Same as number of permits'
        }
    };

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!validTypes.includes(file.type)) {
            setError('Please upload a valid file (JPEG, PNG, or PDF)');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('File size should not exceed 10MB');
            return;
        }

        setIsProcessing(true);
        setError('');
        setSuccess('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('/voucher/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                setSuccess('Voucher processed successfully');
                setExtractedData(response.data.extracted_data);
                setMissingFields(response.data.missing_fields || []);
                
                if (response.data.booking_id) {
                    navigate(`/bookings/${response.data.booking_id}`);
                }
            } else {
                setError('Failed to process voucher');
                if (response.data.missing_fields) {
                    setMissingFields(response.data.missing_fields);
                    setExtractedData(response.data.extracted_data);
                }
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Error processing voucher');
            console.error('Error:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFormSubmit = async (event) => {
        event.preventDefault();
        // The form submission is handled by handleFileChange
        // This is just to prevent default form behavior
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">Voucher Management</h1>
                
                <form onSubmit={handleFormSubmit} className="mb-8">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Voucher
                        </label>
                        <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-md file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                            Supported formats: JPEG, PNG, PDF (max 10MB)
                        </p>
                    </div>
                </form>

                {isProcessing && (
                    <div className="mb-4 text-blue-600">
                        Processing voucher...
                    </div>
                )}

                {error && (
                    <div className="mb-4 text-red-600">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 text-green-600">
                        {success}
                    </div>
                )}

                {extractedData && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-4">Extracted Data</h2>
                        {missingFields.length > 0 && (
                            <div className="mb-4 p-4 bg-yellow-50 rounded-md">
                                <h3 className="text-sm font-medium text-yellow-800">Missing Fields:</h3>
                                <ul className="mt-2 text-sm text-yellow-700">
                                    {missingFields.map((field, index) => (
                                        <li key={index}>
                                            {fieldConfig[field]?.label || field}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            {Object.entries(extractedData)
                                .filter(([key]) => key in fieldConfig)
                                .map(([key, value]) => (
                                    <div key={key} className="border-b pb-2">
                                        <div className="text-sm font-medium text-gray-500">
                                            {fieldConfig[key].label}
                                            {fieldConfig[key].note && (
                                                <span className="block text-xs text-gray-400 mt-0.5">
                                                    {fieldConfig[key].note}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1">{value || 'N/A'}</div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PassportManagement1; 