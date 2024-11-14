import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EnhancedTable from '../components/EnhancedTable';

const FinanceDashboard = () => {
  const [pendingValidations, setPendingValidations] = useState([]);
  const [overduePayments, setOverduePayments] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role !== 'finance_admin') {
      navigate('/dashboard');
    }
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [pendingRes, overdueRes] = await Promise.all([
        fetch('http://localhost:8000/api/finance/pending-validations', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:8000/api/finance/overdue-payments', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (pendingRes.ok && overdueRes.ok) {
        const pendingData = await pendingRes.json();
        const overdueData = await overdueRes.json();
        setPendingValidations(pendingData);
        setOverduePayments(overdueData);
      }
    } catch (error) {
      setError('Failed to fetch finance data');
    }
  };

  const pendingColumns = [
    { key: 'booking_name', label: 'Booking Name' },
    { key: 'product', label: 'Product' },
    { key: 'number_of_people', label: 'Pax' },
    { 
      key: 'deposit_amount', 
      label: 'Deposit Required',
      render: (value) => `$${value.toFixed(2)}`
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          onClick={() => navigate(`/finance/validate/${row.booking_id}`)}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Validate Payment
        </button>
      )
    }
  ];

  const overdueColumns = [
    { key: 'booking_name', label: 'Booking Name' },
    { key: 'product', label: 'Product' },
    { 
      key: 'amount_due', 
      label: 'Amount Due',
      render: (value) => `$${value.toFixed(2)}`
    },
    {
      key: 'payment_status',
      label: 'Status',
      render: (value) => (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
          {value}
        </span>
      )
    },
    {
      key: 'due_date',
      label: 'Due Date',
      render: (value) => new Date(value).toLocaleDateString()
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finance Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage payments and validations
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Pending Validations</h3>
          <p className="text-3xl font-bold text-blue-600">{pendingValidations.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Overdue Payments</h3>
          <p className="text-3xl font-bold text-red-600">{overduePayments.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Total Amount Due</h3>
          <p className="text-3xl font-bold text-green-600">
            ${overduePayments.reduce((sum, payment) => sum + payment.amount_due, 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending Validations
            </button>
            <button
              onClick={() => setActiveTab('overdue')}
              className={`px-4 py-2 font-medium text-sm ${
                activeTab === 'overdue'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overdue Payments
            </button>
          </nav>
        </div>

        <div className="p-4">
          <EnhancedTable
            data={activeTab === 'pending' ? pendingValidations : overduePayments}
            columns={activeTab === 'pending' ? pendingColumns : overdueColumns}
          />
        </div>
      </div>
    </div>
  );
};

export default FinanceDashboard; 