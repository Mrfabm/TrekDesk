import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SuperuserHome = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    Promise.all([
      fetch('http://localhost:8000/api/users/metrics', { headers }).then(r => r.json()),
      fetch('http://localhost:8000/api/users/activity-logs', { headers }).then(r => r.json())
    ])
      .then(([m, logs]) => {
        setMetrics(m);
        setActivityLogs(Array.isArray(logs) ? logs.slice(0, 10) : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const roleColors = {
    admin: 'bg-blue-100 text-blue-800',
    user: 'bg-green-100 text-green-800',
    finance_admin: 'bg-purple-100 text-purple-800',
    superuser: 'bg-red-100 text-red-800',
    authorizer: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-gray-900">IT Manager Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">System overview and user management</p>
        </div>

        {/* Metric Cards */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total Users</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{metrics.total_users ?? 0}</p>
            </div>
            {metrics.role_breakdown && Object.entries(metrics.role_breakdown).map(([role, count]) => (
              <div key={role} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-wider">{role.replace('_', ' ')}</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{count}</p>
                <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[role] || 'bg-gray-100 text-gray-700'}`}>
                  {role}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Quick Links */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/users')}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Manage Users
          </button>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Recent Activity</h2>
          </div>
          {activityLogs.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-400 text-center">No recent activity</div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {activityLogs.map((log, i) => (
                <li key={i} className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{log.action || log.message || JSON.stringify(log)}</p>
                    {log.username && (
                      <p className="text-xs text-gray-400 mt-0.5">{log.username}</p>
                    )}
                  </div>
                  {log.created_at && (
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuperuserHome;
