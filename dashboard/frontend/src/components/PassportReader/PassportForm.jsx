import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const PassportForm = ({ initialData, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: null,
    passport_number: '',
    passport_expiry: null,
    nationality: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submission - Current form data:', formData);
    
    // Validate required fields
    if (!formData.full_name || !formData.passport_number || !formData.date_of_birth || !formData.passport_expiry) {
      console.log('Form validation failed - Missing required fields');
      return; // Form's HTML5 validation will handle showing the error
    }
    
    // Format dates to YYYY-MM-DD before submitting
    const submissionData = {
      ...formData,
      date_of_birth: formData.date_of_birth ? formData.date_of_birth.toISOString().split('T')[0] : null,
      passport_expiry: formData.passport_expiry ? formData.passport_expiry.toISOString().split('T')[0] : null
    };

    // Additional validation
    const today = new Date();
    if (formData.date_of_birth && formData.date_of_birth > today) {
      console.log('Validation failed - Birth date in future');
      alert('Date of birth cannot be in the future');
      return;
    }
    if (formData.passport_expiry && formData.passport_expiry < today) {
      console.log('Validation failed - Expiry date in past');
      alert('Passport expiry date must be in the future');
      return;
    }
    
    console.log('Submitting data:', submissionData);
    onSubmit(submissionData);
  };

  // Helper function to parse dates safely
  const parseDate = (dateStr) => {
    console.log('Parsing date:', dateStr);
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      const isValid = !isNaN(date.getTime());
      console.log('Date parsing result:', { date, isValid });
      return isValid ? date : null;
    } catch (error) {
      console.error('Date parsing error:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('Received initialData:', initialData);
    if (initialData) {
      const newFormData = {
        full_name: initialData.full_name || '',
        date_of_birth: parseDate(initialData.date_of_birth),
        passport_number: initialData.passport_number || '',
        passport_expiry: parseDate(initialData.passport_expiry),
        nationality: initialData.nationality || ''
      };
      console.log('Setting form data:', newFormData);
      setFormData(newFormData);
    }
  }, [initialData]);

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Full Name
        </label>
        <input
          type="text"
          value={formData.full_name}
          onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
          className="mt-1 block w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          required
          minLength={2}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Nationality
        </label>
        <input
          type="text"
          value={formData.nationality}
          onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
          className="mt-1 block w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Date of Birth
        </label>
        <DatePicker
          selected={formData.date_of_birth}
          onChange={(date) => setFormData({ ...formData, date_of_birth: date })}
          className="mt-1 block w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          dateFormat="yyyy-MM-dd"
          placeholderText="Select date of birth"
          maxDate={new Date()}
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
          required
          isClearable={false}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Passport Number
        </label>
        <input
          type="text"
          value={formData.passport_number}
          onChange={(e) => setFormData({ ...formData, passport_number: e.target.value.toUpperCase() })}
          className="mt-1 block w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          pattern="[A-Z0-9]{6,12}"
          title="Passport number must be 6-12 characters long and contain only uppercase letters and numbers"
          required
          minLength={6}
          maxLength={12}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Passport Expiry Date
        </label>
        <DatePicker
          selected={formData.passport_expiry}
          onChange={(date) => setFormData({ ...formData, passport_expiry: date })}
          className="mt-1 block w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          dateFormat="yyyy-MM-dd"
          placeholderText="Select expiry date"
          minDate={new Date()}
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
          required
          isClearable={false}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !formData.full_name || !formData.passport_number || !formData.date_of_birth || !formData.passport_expiry}
        className="w-full flex justify-center py-1.5 px-3 border border-transparent rounded text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : 'Save Passport Data'}
      </button>
    </form>
  );
};

export default PassportForm; 