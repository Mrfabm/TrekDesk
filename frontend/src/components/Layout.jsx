import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Switch } from '@headlessui/react';
import BookingStatusNav from './BookingStatusNav';
import NotificationCenter from './NotificationCenter';

const Layout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isStatusNavOpen, setIsStatusNavOpen] = useState(false);
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();
  const userRole = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const renderNavItems = () => {
    const role = localStorage.getItem('role');

    if (role === 'finance_admin') {
      return (
        <>
          <a 
            href="/finance" 
            className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span>Finance Dashboard</span>
          </a>
          <a 
            href="/bookings" 
            className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>View Bookings</span>
          </a>
          <a 
            href="/finance/pending" 
            className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Pending Payments</span>
          </a>
          <a 
            href="/finance/overdue" 
            className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Overdue Payments</span>
          </a>
        </>
      );
    }

    // Return navigation items for admin and regular users
    return (
      <>
        <a 
          href="/bookings" 
          className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>View Bookings</span>
        </a>
        <a 
          href="/available-slots" 
          className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span>Available Slots</span>
        </a>
      </>
    );
  };

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar - Increased z-index and removed top offset */}
      <div className={`bg-gray-900 dark:bg-gray-800 text-white w-64 flex flex-col fixed h-screen ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-200 ease-in-out z-50`}>
        {/* Logo Section */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-gray-700">
          <span className="text-2xl font-extrabold">Booking App</span>
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="md:hidden">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {/* Home Link */}
          <a 
            href="/home" 
            className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="group-hover:translate-x-1 transition-transform duration-200">Home</span>
          </a>

          {/* Only show Create Booking for non-finance admin users */}
          {userRole !== 'finance_admin' && (
            <a 
              href="/create-booking" 
              className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span className="group-hover:translate-x-1 transition-transform duration-200">Create Booking</span>
            </a>
          )}

          {renderNavItems()}

          <a 
            href="/settings" 
            className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200 ease-in-out transform hover:scale-105"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="group-hover:translate-x-1 transition-transform duration-200">Settings</span>
          </a>

          {userRole === 'superuser' && (
            <a 
              href="/users" 
              className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition-all duration-200 ease-in-out transform hover:scale-105"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="group-hover:translate-x-1 transition-transform duration-200">User Management</span>
            </a>
          )}
        </nav>

        {/* Profile Section - Moved up and styled with orange */}
        <div className="px-4 py-4 border-t border-gray-700">
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors duration-200 bg-orange-500/10"
            >
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                {userRole?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-orange-400">{userRole}</div>
                <div className="text-xs text-orange-300/80">View profile</div>
              </div>
              <svg
                className={`h-5 w-5 text-orange-400 transform transition-transform duration-200 ${
                  isProfileOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isProfileOpen && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <a
                  href="/settings"
                  className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                >
                  Settings
                </a>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-orange-400 hover:bg-gray-700"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Navigation Bar - Updated */}
      <div className="fixed top-0 right-0 h-16 bg-gray-100 border-b border-gray-200 shadow-sm z-40" style={{ left: '256px' }}>
        <div className="h-full w-full flex items-center justify-between px-6">
          {/* Left side - Theme Toggle */}
          <div className="flex items-center">
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                darkMode 
                  ? 'bg-gray-800 text-gray-200' 
                  : 'bg-white text-gray-700'
              } border border-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
            >
              {darkMode ? (
                <>
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                  <span className="text-sm font-medium">Dark</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Light</span>
                </>
              )}
            </button>
          </div>

          {/* Right side - Notifications */}
          <div className="flex items-center space-x-4">
            <NotificationCenter />
            {/* Right side - BookingStatus Toggle */}
            {(userRole === 'admin' || userRole === 'user') && (
              <button
                onClick={() => setIsStatusNavOpen(true)}
                className="p-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* BookingStatusNav */}
        <BookingStatusNav 
          isOpen={isStatusNavOpen} 
          onClose={() => setIsStatusNavOpen(false)} 
        />

        {/* Main Content */}
        <main className="py-6 px-4 mt-16">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout; 