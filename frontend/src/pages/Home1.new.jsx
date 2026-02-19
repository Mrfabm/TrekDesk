import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import "../styles/datepicker-custom.css";
import { useTheme } from '../context/ThemeContext';
import { Collapsible } from '../components/Collapsible';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const INITIAL_STATS = {
  // ... your existing INITIAL_STATS object ...
};

const colorMap = {
  // ... your existing colorMap object ...
};

// Utility Components
const CustomTooltip = ({ children, text }) => (
  <div className="group relative inline-block">
    {children}
    <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg whitespace-nowrap">
      {text}
    </div>
  </div>
);

const ActionCard = ({ icon, color, count, label, onClick }) => {
  // ... your existing ActionCard component ...
};

const MetricCard = ({ title, total = 0, items = [], onItemClick, tooltip }) => {
  // ... your existing MetricCard component ...
};

const Home1 = () => {
  const navigate = useNavigate();
  const { darkMode, toggleDarkMode } = useTheme();
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [quickActions, setQuickActions] = useState({
    confirmationRequests: 0,
    okToPurchaseFull: 0,
    okToPurchaseDeposit: 0,
    doNotPurchase: 0,
    confirmationAuthorized: 0
  });

  // ... rest of your component state and logic ...

  return (
    // ... your existing JSX ...
  );
};

export default Home1; 