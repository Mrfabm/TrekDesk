import { Link, useLocation } from 'react-router-dom';

const BookingStatusNav = ({ isOpen, onClose }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity z-40"
          onClick={onClose}
        />
      )}
      
      {/* Navigation Panel - Enhanced contrast */}
      <div 
        className={`fixed right-0 top-0 h-full w-64 bg-gray-100 border-l border-gray-200 shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header with close button - Enhanced contrast */}
        <div className="flex justify-between items-center p-4 bg-white border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Booking Status</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Links - Enhanced contrast */}
        <nav className="flex flex-col p-4 space-y-2">
          <Link
            to="/bookings/no-slots"
            className={`px-4 py-3 text-sm font-medium border rounded-lg transition-all duration-200 ${
              currentPath === '/bookings/no-slots'
                ? 'bg-white border-orange-500 text-orange-600 shadow-sm'
                : 'border-gray-200 text-gray-700 hover:bg-white hover:text-orange-600 hover:border-orange-500'
            }`}
          >
            No Slots
          </Link>
          <Link
            to="/bookings/unpaid"
            className={`px-4 py-3 text-sm font-medium border-2 rounded-lg transition-all duration-200 ${
              currentPath === '/bookings/unpaid'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-500 hover:text-orange-400 hover:border-orange-500/50'
            }`}
          >
            Unpaid
          </Link>
          <Link
            to="/bookings/authorized"
            className={`px-4 py-3 text-sm font-medium border-2 rounded-lg transition-all duration-200 ${
              currentPath === '/bookings/authorized'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-500 hover:text-orange-400 hover:border-orange-500/50'
            }`}
          >
            Authorized
          </Link>
          <Link
            to="/bookings/cancelled"
            className={`px-4 py-3 text-sm font-medium border-2 rounded-lg transition-all duration-200 ${
              currentPath === '/bookings/cancelled'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-500 hover:text-orange-400 hover:border-orange-500/50'
            }`}
          >
            Cancelled
          </Link>
          <Link
            to="/bookings/amended"
            className={`px-4 py-3 text-sm font-medium border-2 rounded-lg transition-all duration-200 ${
              currentPath === '/bookings/amended'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-500 hover:text-orange-400 hover:border-orange-500/50'
            }`}
          >
            Amended
          </Link>
          <Link
            to="/bookings/top-up-due"
            className={`px-4 py-3 text-sm font-medium border-2 rounded-lg transition-all duration-200 ${
              currentPath === '/bookings/top-up-due'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-gray-500 hover:text-orange-400 hover:border-orange-500/50'
            }`}
          >
            Top Up
          </Link>
        </nav>
      </div>
    </>
  );
};

export default BookingStatusNav; 