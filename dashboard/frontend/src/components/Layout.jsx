import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Menu } from '@headlessui/react';
import BookingStatusNav from './BookingStatusNav';
import NotificationCenter from './NotificationCenter';
import { PassportProvider } from '../context/PassportContext';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

const Layout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isStatusNavOpen, setIsStatusNavOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });
  const [showStatusFilters, setShowStatusFilters] = useState({
    confirmed: false,
    declined: false,
    pending: false
  });
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();
  const userRole = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    sessionStorage.removeItem('passportData');
    navigate('/login');
  };

  const renderNavItems = () => {
    const role = localStorage.getItem('role');

    if (role === 'superuser') {
      return (
        <>
          <a 
            href="/users" 
            className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="group-hover:translate-x-1 transition-transform duration-200">User Management</span>
          </a>
          <a 
            href="/settings" 
            className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            <span className="group-hover:translate-x-1 transition-transform duration-200">Settings</span>
          </a>
        </>
      );
    }

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
            <span className="group-hover:translate-x-1 transition-transform duration-200">Finance Dashboard</span>
          </a>
          <a 
            href="/bookings" 
            className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="group-hover:translate-x-1 transition-transform duration-200">View Bookings</span>
          </a>
          <a 
            href="/finance/pending" 
            className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="group-hover:translate-x-1 transition-transform duration-200">Pending Payments</span>
          </a>
          <a 
            href="/settings" 
            className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            </svg>
            <span className="group-hover:translate-x-1 transition-transform duration-200">Settings</span>
          </a>
        </>
      );
    }

    return (
      <>
        <a 
          href="/create-booking" 
          className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span className="group-hover:translate-x-1 transition-transform duration-200">Create Booking</span>
        </a>
        <a 
          href="/bookings" 
          className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="group-hover:translate-x-1 transition-transform duration-200">View Bookings</span>
        </a>
        <a 
          href="/available-slots" 
          className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="group-hover:translate-x-1 transition-transform duration-200">Available Slots</span>
        </a>
        <a 
          href="/settings" 
          className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
          <span className="group-hover:translate-x-1 transition-transform duration-200">Settings</span>
        </a>
        {role === 'admin' && (
          <a
            href="/passport-management"
            className="group py-3 px-4 flex items-center space-x-3 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md"
          >
            <svg 
              className="h-6 w-6" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" 
              />
            </svg>
            <span className="group-hover:translate-x-1 transition-transform duration-200">
              Passport Management
            </span>
          </a>
        )}
      </>
    );
  };

  return (
    <div className={`min-h-screen flex ${darkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
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

          {renderNavItems()}
        </nav>

        {/* Profile Section */}
        <div className="px-4 py-4 border-t border-gray-700">
          <Menu as="div" className="relative">
            <Menu.Button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors duration-200 bg-orange-500/10">
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                {userRole?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-orange-400">{userRole}</div>
                <div className="text-xs text-orange-300/80">View profile</div>
              </div>
              <svg
                className="h-5 w-5 text-orange-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Menu.Button>

            <Menu.Items className="absolute bottom-full left-0 w-full mb-2 bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <Menu.Item>
                {({ active }) => (
                  <a
                    href="/settings"
                    className={`block px-4 py-2 text-sm ${
                      active ? 'bg-gray-700 text-white' : 'text-gray-300'
                    }`}
                  >
                    Settings
                  </a>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleLogout}
                    className={`w-full text-left px-4 py-2 text-sm ${
                      active ? 'bg-gray-700 text-orange-400' : 'text-orange-400'
                    }`}
                  >
                    Logout
                  </button>
                )}
              </Menu.Item>
            </Menu.Items>
          </Menu>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <PassportProvider>
                {children}
              </PassportProvider>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout; 