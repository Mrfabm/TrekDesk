import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { MetricCard } from '../components/MetricCard';
import { DateRangeSelector } from '../components/DateRangeSelector';
import { Collapsible } from '../components/Collapsible';
import ErrorBoundary from '../components/ErrorBoundary';

// Move utility functions outside component
const formatCurrency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
}).format;

// Navigation component optimized
const QuickNav = React.memo(({ sections, activeSection, onSectionClick }) => (
  <nav className="bg-white border-b">
    <div className="container mx-auto">
        <div className="flex overflow-x-auto no-scrollbar">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionClick(section.id)}
              className={`px-4 py-3 flex items-center border-b-2 transition-colors ${
                activeSection === section.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="whitespace-nowrap font-medium">{section.label}</span>
              {section.alert && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-600">
                  {section.alert}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
  </nav>
));

// Mock data for development
const MOCK_DATA = {
  todayBookings: 25,
  pendingActions: 8,
  successRate: 85,
  totalBookings: 150,
  deadlines: {
    critical: 3,
    warning: 7
  },
  pendingBookings: {
    length: 12
  },
  confirmationRequests: {
    pending: 8,
    approved: 45,
    rejected: 12
  },
  okToPurchaseFull: {
    today: 15,
    thisWeek: 35,
    value: 22500
  },
  okToPurchaseDeposit: {
    today: 10,
    thisWeek: 25,
    value: 7500
  },
  doNotPurchase: {
    today: 5,
    thisWeek: 12,
    savedAmount: 7500
  },
  financeChecks: {
    pending: 12,
    completed: 45,
    lastUpdated: new Date().toISOString()
  },
  authorizations: {
    awaitingExecutive: 3
  },
  payments: {
    deposit: {
      dueAmount: 15000,
      count: 35,
      gorillaCount: 20,
      monkeyCount: 15,
      gorillaAmount: 15000,
      monkeyAmount: 750,
      gorillaDue: 15000,
      monkeyDue: 750,
      nextDueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      overdue: 2
    },
    full: {
      gorillaCount: 30,
      monkeyCount: 20,
      gorillaAmount: 45000,
      monkeyAmount: 2000
    }
  },
  permitDetails: {
    mountainGorillas: {
      purchased: 50,
      pending: 8,
      available: 12
    },
    goldenMonkeys: {
      purchased: 35,
      pending: 5,
      available: 25
    },
    alerts: {
      length: 3
    }
  },
  amendments: {
    under: 4,
    lastMinute: 1,
    completed: 15,
    declined: 2
  },
  confirmedBookings: {
    total: 85,
    fullPayment: {
      permits: {
        mountainGorillas: 30,
        goldenMonkeys: 20
      }
    },
    authorized: {
      count: 5,
      permits: {
        mountainGorillas: 3,
        goldenMonkeys: 2
      },
      value: 5000
    }
  },
  discrepancies: true,
  todayConfirmed: {
    fullyPaid: {
      permits: {
        mountainGorillas: 5,
        goldenMonkeys: 3
      }
    }
  }
};

const Home2 = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [stats, setStats] = useState({});
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoize sections configuration
  const sections = useMemo(() => [
    { id: 'overview', label: 'Overview' },
    { 
      id: 'bookings', 
      label: 'Booking Process', 
      alert: stats.pendingBookings?.length || null 
    },
    { 
      id: 'financial', 
      label: 'Financial Overview', 
      alert: stats.payments?.deposit?.dueAmount > 5000 ? 'Due Soon' : null 
    },
    { 
      id: 'permits', 
      label: 'Permit Details', 
      alert: stats.permitDetails?.alerts?.length || null 
    },
    { 
      id: 'audit', 
      label: 'Audit & Reconciliation', 
      alert: stats.discrepancies ? 'Review' : null 
    }
  ], [stats.pendingBookings?.length, stats.payments?.deposit?.dueAmount, stats.permitDetails?.alerts?.length, stats.discrepancies]);

  // Optimized data fetching
  useEffect(() => {
    let mounted = true;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Simulating API call with mock data
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!mounted) return;
        
        if (process.env.NODE_ENV === 'development') {
          setStats(MOCK_DATA);
          return;
        }

        const response = await fetch('/api/dashboard/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fromDate: dateRange.from, toDate: dateRange.to }),
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        if (mounted) setStats(data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        if (mounted) {
          setError(err.message || 'Failed to load dashboard data');
        toast.error('Error loading dashboard data');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, [dateRange]);

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Error Loading Dashboard</h2>
        <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Retry
          </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
        <QuickNav 
          sections={sections}
          activeSection={activeSection}
          onSectionClick={scrollToSection}
        />
      
      <div className="container mx-auto px-4 py-4">
            <DateRangeSelector
              fromDate={dateRange.from}
              toDate={dateRange.to}
              onDateChange={setDateRange}
            />

        <div className="space-y-4 mt-4">
          {/* Overview Section */}
          <section id="overview" className="bg-white rounded-lg shadow-sm">
            <div className="p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Dashboard Overview
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard
                  title="Today's Overview"
                  total={stats.todayBookings || 0}
                  items={[
                    { label: "Fully Paid", value: stats.todayConfirmed?.fullyPaid?.permits?.mountainGorillas || 0, status: "success" },
                    { label: "Deposit Paid", value: stats.todayConfirmed?.deposit?.permits?.mountainGorillas || 0, status: "warning" },
                    { label: "Authorized", value: stats.todayConfirmed?.authorized?.permits?.mountainGorillas || 0 }
                  ]}
                />
                <MetricCard
                  title="Success Rate"
                  total={`${stats.successRate || 0}%`}
                  priority={stats.successRate < 70 ? "warning" : "success"}
                  items={[
                    { label: "Total Bookings", value: stats.totalBookings || 0 },
                    { label: "Critical Deadlines", value: stats.deadlines?.critical || 0, status: "critical" },
                    { label: "Warning Deadlines", value: stats.deadlines?.warning || 0, status: "warning" }
                  ]}
                />
                <MetricCard
                  title="Pending Actions"
                  total={stats.pendingActions || 0}
                  priority={stats.pendingActions > 10 ? "critical" : stats.pendingActions > 5 ? "warning" : "normal"}
                  items={[
                    { label: "Finance Checks", value: stats.financeChecks?.pending || 0 },
                    { label: "Authorizations", value: stats.authorizations?.awaitingExecutive || 0 },
                    { label: "Amendments", value: stats.amendments?.under || 0 }
                  ]}
                />
              </div>
              </div>
            </section>

          {/* Booking Process Status */}
          <section id="bookings" className="bg-white rounded-lg shadow-sm">
            <Collapsible
              title={
                <h2 className="text-lg font-semibold text-gray-800 flex items-center justify-between">
                  <span>Booking Process</span>
                  {stats.pendingBookings?.length > 0 && (
                    <span className="px-2 py-1 text-sm rounded-full bg-yellow-100 text-yellow-800">
                      {stats.pendingBookings.length} Pending
                    </span>
                  )}
                </h2>
              }
              defaultOpen={true}
            >
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <MetricCard
                    title="Confirmation Requests"
                    total={stats.confirmationRequests?.pending || 0}
                    priority={stats.confirmationRequests?.pending > 10 ? "critical" : "warning"}
                    items={[
                      { label: "Approved", value: stats.confirmationRequests?.approved || 0, status: "success" },
                      { label: "Rejected", value: stats.confirmationRequests?.rejected || 0, status: "critical" },
                      { label: "Pending", value: stats.confirmationRequests?.pending || 0, status: "warning" }
                    ]}
                  />
                  <MetricCard
                    title="OK to Purchase (Full)"
                    total={stats.okToPurchaseFull?.today || 0}
                    items={[
                      { label: "This Week", value: stats.okToPurchaseFull?.thisWeek || 0 },
                      { label: "Value", value: formatCurrency(stats.okToPurchaseFull?.value || 0) },
                      { label: "Pending", value: stats.okToPurchaseFull?.pending || 0 }
                    ]}
                  />
                  <MetricCard
                    title="OK to Purchase (Deposit)"
                    total={stats.okToPurchaseDeposit?.today || 0}
                    items={[
                      { label: "This Week", value: stats.okToPurchaseDeposit?.thisWeek || 0 },
                      { label: "Value", value: formatCurrency(stats.okToPurchaseDeposit?.value || 0) },
                      { label: "Pending", value: stats.okToPurchaseDeposit?.pending || 0 }
                    ]}
                  />
                </div>
              </div>
            </Collapsible>
          </section>

          {/* Financial Overview */}
          <section id="financial" className="bg-white rounded-lg shadow-sm">
            <Collapsible
              title={
                <h2 className="text-lg font-semibold text-gray-800 flex items-center justify-between">
                  <span>Financial Overview</span>
                  {stats.payments?.deposit?.dueAmount > 5000 && (
                    <span className="px-2 py-1 text-sm rounded-full bg-red-100 text-red-800">
                      {formatCurrency(stats.payments?.deposit?.dueAmount)} Due
                    </span>
                  )}
                </h2>
              }
              defaultOpen={true}
            >
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <MetricCard
                    title="Full Payment Permits"
                    total={stats.payments?.full?.gorillaCount + stats.payments?.full?.monkeyCount || 0}
                    items={[
                      { label: "Mountain Gorillas", value: `${stats.payments?.full?.gorillaCount || 0} (${formatCurrency(stats.payments?.full?.gorillaAmount || 0)})` },
                      { label: "Golden Monkeys", value: `${stats.payments?.full?.monkeyCount || 0} (${formatCurrency(stats.payments?.full?.monkeyAmount || 0)})` }
                    ]}
                  />
                  <MetricCard
                    title="Deposit Payment Permits"
                    total={stats.payments?.deposit?.gorillaCount + stats.payments?.deposit?.monkeyCount || 0}
                    priority={stats.payments?.deposit?.overdue > 0 ? "critical" : "normal"}
                    items={[
                      { label: "Mountain Gorillas", value: `${stats.payments?.deposit?.gorillaCount || 0} (${formatCurrency(stats.payments?.deposit?.gorillaDue || 0)} due)` },
                      { label: "Golden Monkeys", value: `${stats.payments?.deposit?.monkeyCount || 0} (${formatCurrency(stats.payments?.deposit?.monkeyDue || 0)} due)` },
                      { label: "Next Due Date", value: new Date(stats.payments?.deposit?.nextDueDate).toLocaleDateString() }
                    ]}
                  />
                  <MetricCard
                    title="Authorized Permits"
                    total={stats.confirmedBookings?.authorized?.count || 0}
                    items={[
                      { label: "Mountain Gorillas", value: stats.confirmedBookings?.authorized?.permits?.mountainGorillas || 0 },
                      { label: "Golden Monkeys", value: stats.confirmedBookings?.authorized?.permits?.goldenMonkeys || 0 },
                      { label: "Total Value", value: formatCurrency(stats.confirmedBookings?.authorized?.value || 0) }
                    ]}
                  />
                </div>
              </div>
            </Collapsible>
          </section>

          {/* Permit Details */}
          <section id="permits" className="bg-white rounded-lg shadow-sm">
            <Collapsible
              title={
                <h2 className="text-lg font-semibold text-gray-800 flex items-center justify-between">
                  <span>Permit Details</span>
                  {stats.permitDetails?.alerts?.length > 0 && (
                    <span className="px-2 py-1 text-sm rounded-full bg-orange-100 text-orange-800">
                      {stats.permitDetails.alerts.length} Alerts
                    </span>
                  )}
                </h2>
              }
              defaultOpen={true}
            >
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <MetricCard
                    title="Mountain Gorilla Permits"
                    total={stats.permitDetails?.mountainGorillas?.purchased || 0}
                    items={[
                      { label: "Available", value: stats.permitDetails?.mountainGorillas?.available || 0 },
                      { label: "Pending", value: stats.permitDetails?.mountainGorillas?.pending || 0 }
                    ]}
                  />
                  <MetricCard
                    title="Golden Monkey Permits"
                    total={stats.permitDetails?.goldenMonkeys?.purchased || 0}
                    items={[
                      { label: "Available", value: stats.permitDetails?.goldenMonkeys?.available || 0 },
                      { label: "Pending", value: stats.permitDetails?.goldenMonkeys?.pending || 0 }
                    ]}
                  />
                </div>
              </div>
            </Collapsible>
          </section>
        </div>
      </div>
    </div>
  );
};

export default React.memo(Home2);