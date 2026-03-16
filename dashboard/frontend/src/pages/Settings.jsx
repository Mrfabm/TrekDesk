import { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const Settings = () => {
  const { darkMode, toggleDarkMode } = useTheme();
  const [userRole, setUserRole] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false
  });

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role) {
      setUserRole(role);
    }
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:8000/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword
        })
      });

      if (response.ok) {
        setSuccess('Password updated successfully');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordSection(false);
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to update password');
      }
    } catch (error) {
      setError('Failed to update password');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            {/* Profile Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">Profile</h3>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center text-white text-2xl">
                  {userRole?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-gray-700 dark:text-gray-300 font-medium">Role: {userRole}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last login: Today at 10:00 AM</p>
                </div>
              </div>
            </div>

            {/* Appearance Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 dark:text-white">Appearance</h3>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Dark Mode</span>
                <button
                  onClick={toggleDarkMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                    darkMode ? 'bg-orange-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`${
                      darkMode ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </button>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            {/* Security Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold dark:text-white">Security Settings</h3>
                <button
                  onClick={() => setShowPasswordSection(!showPasswordSection)}
                  className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300"
                >
                  {showPasswordSection ? 'Cancel' : 'Change Password'}
                </button>
              </div>

              {showPasswordSection && (
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                        placeholder="Current Password"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                        className="absolute right-2 top-2.5 text-gray-500 dark:text-gray-400"
                      >
                        {showPasswords.current ? "Hide" : "Show"}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                        placeholder="New Password"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                        className="absolute right-2 top-2.5 text-gray-500 dark:text-gray-400"
                      >
                        {showPasswords.new ? "Hide" : "Show"}
                      </button>
                    </div>
                    <div className="md:col-span-2">
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                        placeholder="Confirm New Password"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                </form>
              )}

              {/* Two-Factor Authentication */}
              <div className="mt-6">
                <h4 className="text-md font-medium mb-2 dark:text-white">Two-Factor Authentication</h4>
                <button className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700">
                  Enable 2FA
                </button>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">Notification Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-gray-700 dark:text-gray-300 block font-medium">Push Notifications</span>
                  <span className="text-sm text-gray-500">Receive push notifications for booking updates</span>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                    notifications ? 'bg-orange-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`${
                      notifications ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-gray-700 dark:text-gray-300 block font-medium">Email Updates</span>
                  <span className="text-sm text-gray-500">Receive email notifications for important updates</span>
                </div>
                <button
                  onClick={() => setEmailUpdates(!emailUpdates)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                    emailUpdates ? 'bg-orange-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`${
                      emailUpdates ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </button>
              </div>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold mb-4 dark:text-white">System Integrations</h3>
            
            {/* Passport System Integration */}
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-700 dark:text-gray-300">Passport System</h4>
                  <p className="text-sm text-gray-500">Manage passport verification settings</p>
                </div>
                <button className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700">
                  Configure
                </button>
              </div>
            </div>

            {/* Payment Gateway */}
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-700 dark:text-gray-300">Payment Gateway</h4>
                  <p className="text-sm text-gray-500">Configure payment processing settings</p>
                </div>
                <button className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700">
                  Configure
                </button>
              </div>
            </div>

            {/* Booking System */}
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-700 dark:text-gray-300">Booking System</h4>
                  <p className="text-sm text-gray-500">Manage booking system preferences</p>
                </div>
                <button className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700">
                  Configure
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
        {/* Settings Header */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage your account settings and preferences
            </p>
          </div>
          {/* Navigation Tabs */}
          <div className="px-6">
            <nav className="flex space-x-4">
              <button
                onClick={() => setActiveTab('general')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'general'
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                General
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'security'
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Security
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'notifications'
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Notifications
              </button>
              <button
                onClick={() => setActiveTab('integrations')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'integrations'
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Integrations
              </button>
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="p-6">
          {success && (
            <div className="mb-4 bg-green-100 dark:bg-green-900 border-l-4 border-green-500 text-green-700 dark:text-green-200 p-4 rounded">
              <p>{success}</p>
            </div>
          )}
          {error && (
            <div className="mb-4 bg-red-100 dark:bg-red-900 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4 rounded">
              <p>{error}</p>
            </div>
          )}
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings; 